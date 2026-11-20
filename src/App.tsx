/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_DASHBOARD_DATA,
  GIST_ID_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  loadDashboardFromStorage,
  saveDashboardToStorage,
} from './data/defaultData';
import {
  createPrivateGist,
  fetchGistWithEtag,
  updateGist,
} from './services/gistSync';
import {
  DashboardData,
  ProjectStage,
  SyncState,
  TeamExpense,
  ViewMode,
} from './types/dashboard';
import { Header } from './components/Header';
import { ProjectHeroSection } from './components/ProjectHeroSection';
import { GanttChart } from './components/GanttChart';
import { StagesGrid } from './components/StagesGrid';
import { FinancialCharts } from './components/FinancialCharts';
import { TeamTable } from './components/TeamTable';
import { SyncModal } from './components/SyncModal';

function getInitialUrlParams(): { mode: ViewMode; urlGistId: string } {
  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get('mode');
  const gistParam = params.get('gist')?.trim() || '';
  return {
    mode: modeParam === 'client' ? 'client' : 'editor',
    urlGistId: gistParam,
  };
}

function formatNowTime(): string {
  return new Date().toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function App() {
  const initialParams = useMemo(() => getInitialUrlParams(), []);

  const [mode, setMode] = useState<ViewMode>(initialParams.mode);
  const [data, setData] = useState<DashboardData>(() => loadDashboardFromStorage());

  const [token, setToken] = useState<string>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [gistId, setGistId] = useState<string>(() => {
    if (initialParams.urlGistId) return initialParams.urlGistId;
    try {
      return localStorage.getItem(GIST_ID_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [syncState, setSyncState] = useState<SyncState>(() =>
    initialParams.urlGistId || localStorage.getItem(GIST_ID_STORAGE_KEY)
      ? 'online'
      : 'local'
  );
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isModalBusy, setIsModalBusy] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const etagRef = useRef<string | null>(null);
  const hasPendingLocalPushRef = useRef<boolean>(false);
  const dataRef = useRef<DashboardData>(data);
  dataRef.current = data;

  // Persist data to localStorage on every change
  useEffect(() => {
    saveDashboardToStorage(data);
  }, [data]);

  // Persist URL gistId if provided and not yet stored
  useEffect(() => {
    if (initialParams.urlGistId) {
      try {
        localStorage.setItem(GIST_ID_STORAGE_KEY, initialParams.urlGistId);
      } catch {
        // ignore
      }
    }
  }, [initialParams.urlGistId]);

  // Debounced PATCH to Gist in Editor Mode (1.2s)
  useEffect(() => {
    if (mode !== 'editor') return;
    if (!hasPendingLocalPushRef.current) return;
    if (!gistId.trim() || !token.trim()) return;

    const timer = window.setTimeout(async () => {
      try {
        setSyncState('syncing');
        setSyncError(null);
        const res = await updateGist(gistId, dataRef.current, token);
        etagRef.current = res.etag;
        hasPendingLocalPushRef.current = false;
        setSyncState('online');
        setLastSyncedAt(formatNowTime());
      } catch (err) {
        hasPendingLocalPushRef.current = false;
        setSyncState('error');
        setSyncError(err instanceof Error ? err.message : 'Ошибка отправки в Gist');
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [data, gistId, token, mode]);

  // Real-time ETag polling every 5 seconds whenever gistId is present
  useEffect(() => {
    const cleanGistId = gistId.trim();
    if (!cleanGistId) {
      setSyncState('local');
      setSyncError(null);
      return;
    }

    let cancelled = false;
    etagRef.current = null;

    const pollOnce = async () => {
      if (cancelled || hasPendingLocalPushRef.current) return;
      try {
        const result = await fetchGistWithEtag(
          cleanGistId,
          token,
          etagRef.current
        );
        if (cancelled) return;

        if (result.status === 'updated' && result.data) {
          etagRef.current = result.etag;
          // Apply remote state without marking as local dirty push
          hasPendingLocalPushRef.current = false;
          setData(result.data);
          setLastSyncedAt(formatNowTime());
        }
        setSyncState('online');
        setSyncError(null);
      } catch (err) {
        if (cancelled) return;
        setSyncState('error');
        setSyncError(
          err instanceof Error ? err.message : 'Ошибка чтения GitHub Gist'
        );
      }
    };

    // Initial fetch immediately
    pollOnce();

    const intervalId = window.setInterval(pollOnce, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [gistId, token]);

  // Helper to apply local user edits
  const updateLocalData = useCallback(
    (updater: (prev: DashboardData) => DashboardData) => {
      hasPendingLocalPushRef.current = Boolean(gistId.trim() && token.trim());
      setData((prev) => updater(prev));
    },
    [gistId, token]
  );

  // Derived Financial KPIs
  const metrics = useMemo(() => {
    const totalBudget = data.stages.reduce((sum, s) => sum + s.amount, 0);
    const paidBudget = data.stages
      .filter((s) => s.paid)
      .reduce((sum, s) => sum + s.amount, 0);
    const unpaidBudget = Math.max(0, totalBudget - paidBudget);
    const closedPercent =
      totalBudget > 0 ? Math.round((paidBudget / totalBudget) * 100) : 0;

    const totalTeamCost = data.team.reduce((sum, m) => sum + m.totalCost, 0);
    const paidTeamAmount = data.team.reduce((sum, m) => sum + m.paidAmount, 0);
    const remainingTeamPay = Math.max(0, totalTeamCost - paidTeamAmount);

    return {
      totalBudget,
      paidBudget,
      unpaidBudget,
      closedPercent,
      totalTeamCost,
      paidTeamAmount,
      remainingTeamPay,
    };
  }, [data.stages, data.team]);

  // Mode toggle handler
  const handleToggleMode = () => {
    setMode((prev) => (prev === 'client' ? 'editor' : 'client'));
  };

  // Copy shareable link for Lily (?gist=...&mode=client)
  const handleCopyClientLink = async () => {
    const url = new URL(window.location.href);
    url.search = '';
    if (gistId.trim()) {
      url.searchParams.set('gist', gistId.trim());
    }
    url.searchParams.set('mode', 'client');

    const shareUrl = url.toString();
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2200);
  };

  // Editor handlers
  const handleUpdateTitle = (projectTitle: string) => {
    updateLocalData((prev) => ({ ...prev, projectTitle }));
  };

  const handleUpdateDocument = (
    id: string,
    field: 'title' | 'url',
    value: string
  ) => {
    updateLocalData((prev) => ({
      ...prev,
      documents: prev.documents.map((doc) =>
        doc.id === id ? { ...doc, [field]: value } : doc
      ),
    }));
  };

  const handleAddStage = () => {
    const nextIdx = data.stages.length + 1;
    const newStage: ProjectStage = {
      id: `stage-${Date.now()}`,
      name: `${nextIdx} этап (Новый этап)`,
      amount: 15,
      paid: false,
      startDate: '2026-12-21',
      endDate: '2026-12-30',
    };
    updateLocalData((prev) => ({
      ...prev,
      stages: [...prev.stages, newStage],
    }));
  };

  const handleUpdateStage = (id: string, patch: Partial<ProjectStage>) => {
    updateLocalData((prev) => ({
      ...prev,
      stages: prev.stages.map((st) =>
        st.id === id ? { ...st, ...patch } : st
      ),
    }));
  };

  const handleDeleteStage = (id: string) => {
    updateLocalData((prev) => ({
      ...prev,
      stages: prev.stages.filter((st) => st.id !== id),
    }));
  };

  const handleAddTeamItem = () => {
    const newItem: TeamExpense = {
      id: `team-${Date.now()}`,
      role: 'Новая статья',
      totalCost: 10,
      paidAmount: 0,
    };
    updateLocalData((prev) => ({
      ...prev,
      team: [...prev.team, newItem],
    }));
  };

  const handleUpdateTeamItem = (id: string, patch: Partial<TeamExpense>) => {
    updateLocalData((prev) => ({
      ...prev,
      team: prev.team.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  };

  const handleDeleteTeamItem = (id: string) => {
    updateLocalData((prev) => ({
      ...prev,
      team: prev.team.filter((item) => item.id !== id),
    }));
  };

  // Gist modal handlers
  const handleSaveConfigAndSync = async (
    nextToken: string,
    nextGistId: string
  ) => {
    setIsModalBusy(true);
    setSyncError(null);
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
      setToken(nextToken);

      if (!nextGistId) {
        const created = await createPrivateGist(dataRef.current, nextToken);
        localStorage.setItem(GIST_ID_STORAGE_KEY, created.gistId);
        etagRef.current = created.etag;
        setGistId(created.gistId);
        setSyncState('online');
        setLastSyncedAt(formatNowTime());
      } else {
        localStorage.setItem(GIST_ID_STORAGE_KEY, nextGistId);
        const updated = await updateGist(
          nextGistId,
          dataRef.current,
          nextToken
        );
        etagRef.current = updated.etag;
        setGistId(nextGistId);
        setSyncState('online');
        setLastSyncedAt(formatNowTime());
      }
    } finally {
      setIsModalBusy(false);
    }
  };

  const handlePullFromGist = async (nextToken: string, nextGistId: string) => {
    setIsModalBusy(true);
    setSyncError(null);
    try {
      if (nextToken) {
        localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
        setToken(nextToken);
      }
      if (!nextGistId) {
        throw new Error('Введите Gist ID для загрузки данных.');
      }
      localStorage.setItem(GIST_ID_STORAGE_KEY, nextGistId);
      etagRef.current = null;
      const result = await fetchGistWithEtag(nextGistId, nextToken, null);
      if (result.data) {
        hasPendingLocalPushRef.current = false;
        setData(result.data);
      }
      etagRef.current = result.etag;
      setGistId(nextGistId);
      setSyncState('online');
      setLastSyncedAt(formatNowTime());
    } finally {
      setIsModalBusy(false);
    }
  };

  const handleDisconnectGist = () => {
    localStorage.removeItem(GIST_ID_STORAGE_KEY);
    etagRef.current = null;
    hasPendingLocalPushRef.current = false;
    setGistId('');
    setSyncState('local');
    setSyncError(null);
  };

  const handleImportJson = (imported: DashboardData) => {
    hasPendingLocalPushRef.current = Boolean(gistId.trim() && token.trim());
    setData(imported);
  };

  const handleResetDefault = () => {
    hasPendingLocalPushRef.current = Boolean(gistId.trim() && token.trim());
    setData(structuredClone(DEFAULT_DASHBOARD_DATA));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1F1D1A]">
      <Header
        mode={mode}
        onToggleMode={handleToggleMode}
        syncState={syncState}
        hasGist={Boolean(gistId.trim())}
        syncError={syncError}
        copiedLink={copiedLink}
        onCopyClientLink={handleCopyClientLink}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-10">
        <ProjectHeroSection
          projectTitle={data.projectTitle}
          currency={data.currency}
          documents={data.documents}
          mode={mode}
          totalBudget={metrics.totalBudget}
          paidBudget={metrics.paidBudget}
          unpaidBudget={metrics.unpaidBudget}
          closedPercent={metrics.closedPercent}
          totalTeamCost={metrics.totalTeamCost}
          remainingTeamPay={metrics.remainingTeamPay}
          onUpdateTitle={handleUpdateTitle}
          onUpdateDocument={handleUpdateDocument}
        />

        <GanttChart stages={data.stages} currency={data.currency} />

        <StagesGrid
          stages={data.stages}
          currency={data.currency}
          mode={mode}
          onAddStage={handleAddStage}
          onUpdateStage={handleUpdateStage}
          onDeleteStage={handleDeleteStage}
        />

        <FinancialCharts
          currency={data.currency}
          totalBudget={metrics.totalBudget}
          paidBudget={metrics.paidBudget}
          totalTeamCost={metrics.totalTeamCost}
          paidTeamAmount={metrics.paidTeamAmount}
          team={data.team}
        />

        <TeamTable
          team={data.team}
          currency={data.currency}
          mode={mode}
          totalTeamCost={metrics.totalTeamCost}
          paidTeamAmount={metrics.paidTeamAmount}
          remainingTeamPay={metrics.remainingTeamPay}
          onAddTeamItem={handleAddTeamItem}
          onUpdateTeamItem={handleUpdateTeamItem}
          onDeleteTeamItem={handleDeleteTeamItem}
        />
      </main>

      <footer className="border-t border-[#E6DFD5] bg-[#FAF8F5] py-6">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7A736A]">
          <span>
            © {new Date().getFullYear()} LimurProject — студия дизайна интерьеров
          </span>
          <a
            href="https://limurproject.ru/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#1F1D1A] hover:text-[#B8956A] transition-colors font-medium"
          >
            limurproject.ru
          </a>
        </div>
      </footer>

      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        token={token}
        gistId={gistId}
        lastSyncedAt={lastSyncedAt}
        syncError={syncError}
        isBusy={isModalBusy}
        data={data}
        onSaveToken={setToken}
        onSaveConfigAndSync={handleSaveConfigAndSync}
        onPullFromGist={handlePullFromGist}
        onDisconnectGist={handleDisconnectGist}
        onImportJson={handleImportJson}
        onResetDefault={handleResetDefault}
      />
    </div>
  );
}
