/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderKanban, LayoutDashboard } from 'lucide-react';
import {
  DEFAULT_STORE,
  GIST_ID_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  createNewProjectTemplate,
  getProjectFinancialSummary,
  loadStoreFromStorage,
  saveStoreToStorage,
} from './data/defaultData';
import {
  createPrivateGist,
  fetchGistWithEtag,
  updateGist,
} from './services/gistSync';
import {
  MultiProjectStore,
  ProjectDocument,
  ProjectRecord,
  ProjectStage,
  StageExpense,
  SyncState,
  TeamExpense,
  ViewMode,
  WorkStage,
  WorkspaceTab,
} from './types/dashboard';
import { Header } from './components/Header';
import { ProjectWorkspaceBar } from './components/ProjectWorkspaceBar';
import { ProjectHeroSection } from './components/ProjectHeroSection';
import { GanttChart } from './components/GanttChart';
import { StagesGrid } from './components/StagesGrid';
import { FinancialCharts } from './components/FinancialCharts';
import { TeamTable } from './components/TeamTable';
import { ArchiveSection } from './components/ArchiveSection';
import { SyncModal } from './components/SyncModal';
import { GlobalDashboard, getOverdueItems } from './components/GlobalDashboard';

function getInitialUrlParams(): {
  mode: ViewMode;
  isLockedView: boolean;
  urlGistId: string;
  urlProjectId: string;
} {
  const params = new URLSearchParams(window.location.search);
  const modeParam = params.get('mode');
  const isViewMode = modeParam === 'view' || modeParam === 'client';
  const gistParam = params.get('gist')?.trim() || '';
  const projectParam = params.get('project')?.trim() || '';
  return {
    mode: isViewMode ? 'view' : 'editor',
    isLockedView: isViewMode,
    urlGistId: gistParam,
    urlProjectId: projectParam,
  };
}

function formatNowTime(): string {
  return new Date().toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function sortProjectsByDate(
  list: ProjectRecord[],
  order: 'newest' | 'oldest'
): ProjectRecord[] {
  return [...list].sort((a, b) => {
    const cmp = a.projectDate.localeCompare(b.projectDate);
    if (cmp !== 0) {
      return order === 'newest' ? -cmp : cmp;
    }
    const createdCmp = a.createdAt.localeCompare(b.createdAt);
    return order === 'newest' ? -createdCmp : createdCmp;
  });
}

export default function App() {
  const initialParams = useMemo(() => getInitialUrlParams(), []);

  const [mode, setMode] = useState<ViewMode>(initialParams.mode);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('project');
  const isLockedView = initialParams.isLockedView;

  const [store, setStore] = useState<MultiProjectStore>(() => {
    const loaded = loadStoreFromStorage();
    if (
      initialParams.urlProjectId &&
      loaded.projects.some((p) => p.id === initialParams.urlProjectId)
    ) {
      return { ...loaded, activeProjectId: initialParams.urlProjectId };
    }
    return loaded;
  });

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
  const storeRef = useRef<MultiProjectStore>(store);
  storeRef.current = store;

  // Persist store to localStorage on every change
  useEffect(() => {
    saveStoreToStorage(store);
  }, [store]);

  // Persist URL gistId if provided
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
    if (mode !== 'editor' || isLockedView) return;
    if (!hasPendingLocalPushRef.current) return;
    if (!gistId.trim() || !token.trim()) return;

    const timer = window.setTimeout(async () => {
      try {
        setSyncState('syncing');
        setSyncError(null);
        const res = await updateGist(gistId, storeRef.current, token);
        etagRef.current = res.etag;
        hasPendingLocalPushRef.current = false;
        setSyncState('online');
        setLastSyncedAt(formatNowTime());
      } catch (err) {
        hasPendingLocalPushRef.current = false;
        setSyncState('error');
        setSyncError(
          err instanceof Error ? err.message : 'Ошибка отправки в Gist'
        );
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [store, gistId, token, mode, isLockedView]);

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
          hasPendingLocalPushRef.current = false;
          setStore((prev) => {
            const remote = result.data!;
            // Keep locked URL project if present in remote, otherwise keep user's current selection if valid
            const preferredId = initialParams.urlProjectId || prev.activeProjectId;
            const hasPreferred = remote.projects.some(
              (p) => p.id === preferredId
            );
            return {
              ...remote,
              activeProjectId: hasPreferred
                ? preferredId
                : remote.activeProjectId,
            };
          });
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

    pollOnce();
    const intervalId = window.setInterval(pollOnce, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [gistId, token, initialParams.urlProjectId]);

  // Helper to mutate store locally
  const updateLocalStore = useCallback(
    (updater: (prev: MultiProjectStore) => MultiProjectStore) => {
      hasPendingLocalPushRef.current = Boolean(gistId.trim() && token.trim());
      setStore((prev) => updater(prev));
    },
    [gistId, token]
  );

  // Selected Project & Sorted Lists
  const selectedProject = useMemo(() => {
    if (
      initialParams.urlProjectId &&
      isLockedView
    ) {
      const target = store.projects.find(
        (p) => p.id === initialParams.urlProjectId
      );
      if (target) return target;
    }
    return (
      store.projects.find((p) => p.id === store.activeProjectId) ||
      store.projects.find((p) => p.status === 'active') ||
      store.projects[0]
    );
  }, [store.projects, store.activeProjectId, initialParams.urlProjectId, isLockedView]);

  const activeProjects = useMemo(
    () =>
      sortProjectsByDate(
        store.projects.filter((p) => p.status === 'active'),
        store.sortOrder
      ),
    [store.projects, store.sortOrder]
  );

  const archivedProjects = useMemo(
    () =>
      sortProjectsByDate(
        store.projects.filter((p) => p.status === 'archived'),
        store.sortOrder
      ),
    [store.projects, store.sortOrder]
  );

  // Update helper for selected project
  const updateSelectedProject = useCallback(
    (updater: (proj: ProjectRecord) => ProjectRecord) => {
      updateLocalStore((prev) => ({
        ...prev,
        projects: prev.projects.map((proj) =>
          proj.id === selectedProject.id ? updater(proj) : proj
        ),
      }));
    },
    [updateLocalStore, selectedProject.id]
  );

  // Derived Financial KPIs for selected project
  const metrics = useMemo(() => {
    const fin = getProjectFinancialSummary(selectedProject);
    const closedPercent =
      fin.totalIncome > 0
        ? Math.round((fin.paidIncome / fin.totalIncome) * 100)
        : 0;

    const totalTeamCost = selectedProject.team.reduce(
      (sum, m) => sum + m.totalCost,
      0
    );
    const paidTeamAmount = selectedProject.team.reduce(
      (sum, m) => sum + m.paidAmount,
      0
    );
    const remainingTeamPay = Math.max(0, totalTeamCost - paidTeamAmount);

    return {
      totalBudget: fin.totalIncome,
      paidBudget: fin.paidIncome,
      unpaidBudget: fin.unpaidIncome,
      closedPercent,
      projectExpensesTotal: fin.projectExpensesTotal,
      projectExpensesPaid: fin.projectExpensesPaid,
      salaryExpensesTotal: fin.salaryExpensesTotal,
      salaryExpensesPaid: fin.salaryExpensesPaid,
      totalTeamCost,
      paidTeamAmount,
      remainingTeamPay,
    };
  }, [selectedProject]);

  const overdueCount = useMemo(
    () => getOverdueItems(store.projects).length,
    [store.projects]
  );

  // Mode toggle handler
  const handleToggleMode = () => {
    if (isLockedView) return;
    setMode((prev) => {
      const next = prev === 'view' ? 'editor' : 'view';
      if (next === 'view') {
        setActiveTab('project');
      }
      return next;
    });
  };

  // Copy shareable link (?mode=view&project=<ID>&gist=<GIST_ID>)
  const handleCopyViewLink = async () => {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('mode', 'view');
    url.searchParams.set('project', selectedProject.id);
    if (gistId.trim()) {
      url.searchParams.set('gist', gistId.trim());
    }

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

  const handleExportPdf = () => {
    window.print();
  };

  // Multi-project handlers
  const handleSelectProject = (id: string) => {
    updateLocalStore((prev) => ({ ...prev, activeProjectId: id }));
  };

  const handleCreateProject = () => {
    const newProject = createNewProjectTemplate(store.projects.length + 1);
    updateLocalStore((prev) => ({
      ...prev,
      activeProjectId: newProject.id,
      projects: [newProject, ...prev.projects],
    }));
  };

  const handleToggleSortOrder = () => {
    updateLocalStore((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === 'newest' ? 'oldest' : 'newest',
    }));
  };

  const handleArchiveProject = (id: string) => {
    updateLocalStore((prev) => {
      const updatedProjects = prev.projects.map((p) =>
        p.id === id ? { ...p, status: 'archived' as const } : p
      );
      const remainingActive = sortProjectsByDate(
        updatedProjects.filter((p) => p.status === 'active'),
        prev.sortOrder
      );

      if (remainingActive.length > 0) {
        return {
          ...prev,
          activeProjectId: remainingActive[0].id,
          projects: updatedProjects,
        };
      }

      // Ensure there is always an active workspace project available
      const freshActive = createNewProjectTemplate(updatedProjects.length + 1);
      return {
        ...prev,
        activeProjectId: freshActive.id,
        projects: [freshActive, ...updatedProjects],
      };
    });
  };

  const handleRestoreProject = (id: string) => {
    updateLocalStore((prev) => ({
      ...prev,
      activeProjectId: id,
      projects: prev.projects.map((p) =>
        p.id === id ? { ...p, status: 'active' } : p
      ),
    }));
  };

  const handleDeleteProject = (id: string) => {
    updateLocalStore((prev) => {
      const remaining = prev.projects.filter((p) => p.id !== id);
      if (remaining.length === 0) {
        const fresh = createNewProjectTemplate(1);
        return {
          ...prev,
          activeProjectId: fresh.id,
          projects: [fresh],
        };
      }
      const nextActive =
        prev.activeProjectId === id
          ? (remaining.find((p) => p.status === 'active') || remaining[0]).id
          : prev.activeProjectId;

      return {
        ...prev,
        activeProjectId: nextActive,
        projects: remaining,
      };
    });
  };

  // Selected project editor handlers
  const handleUpdateTitle = (title: string) => {
    updateSelectedProject((proj) => ({ ...proj, title }));
  };

  const handleUpdateProjectDate = (projectDate: string) => {
    updateSelectedProject((proj) => ({ ...proj, projectDate }));
  };

  const handleUpdateDocument = (
    key: 'kp' | 'plan',
    patch: Partial<ProjectDocument>
  ) => {
    updateSelectedProject((proj) => ({
      ...proj,
      [key]: { ...proj[key], ...patch },
    }));
  };

  const handleAddStage = () => {
    const nextIdx = selectedProject.stages.length + 1;
    const newStage: ProjectStage = {
      id: `stage-${Date.now()}`,
      name: `${nextIdx} этап оплаты`,
      amount: 15,
      paid: false,
      startDate: '2026-12-21',
      endDate: '2026-12-30',
      expenses: [],
      workStages: [
        {
          id: `ws-${Date.now()}-1`,
          title: 'Новая рабочая задача',
          assignee: 'Дизайнер',
          plannedStart: '2026-12-21',
          plannedEnd: '2026-12-30',
          progress: 0,
          clientApproval: false,
        },
      ],
    };
    updateSelectedProject((proj) => ({
      ...proj,
      stages: [...proj.stages, newStage],
    }));
  };

  const handleUpdateStage = (id: string, patch: Partial<ProjectStage>) => {
    updateSelectedProject((proj) => ({
      ...proj,
      stages: proj.stages.map((st) =>
        st.id === id ? { ...st, ...patch } : st
      ),
    }));
  };

  const handleDeleteStage = (id: string) => {
    updateSelectedProject((proj) => ({
      ...proj,
      stages: proj.stages.filter((st) => st.id !== id),
    }));
  };

  const handleAddWorkStage = (stageId: string) => {
    updateSelectedProject((proj) => ({
      ...proj,
      stages: proj.stages.map((st) => {
        if (st.id !== stageId) return st;
        const newWork: WorkStage = {
          id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          title: `Задача ${st.workStages.length + 1}`,
          assignee: 'Дизайнер',
          plannedStart: st.startDate || '2026-11-01',
          plannedEnd: st.endDate || '2026-11-10',
          progress: 0,
          clientApproval: false,
        };
        return {
          ...st,
          workStages: [...st.workStages, newWork],
        };
      }),
    }));
  };

  const handleUpdateWorkStage = (
    stageId: string,
    workId: string,
    patch: Partial<WorkStage>
  ) => {
    updateSelectedProject((proj) => ({
      ...proj,
      stages: proj.stages.map((st) => {
        if (st.id !== stageId) return st;
        return {
          ...st,
          workStages: st.workStages.map((ws) =>
            ws.id === workId ? { ...ws, ...patch } : ws
          ),
        };
      }),
    }));
  };

  const handleDeleteWorkStage = (stageId: string, workId: string) => {
    updateSelectedProject((proj) => ({
      ...proj,
      stages: proj.stages.map((st) => {
        if (st.id !== stageId) return st;
        return {
          ...st,
          workStages: st.workStages.filter((ws) => ws.id !== workId),
        };
      }),
    }));
  };

  const handleAddStageExpense = (stageId: string) => {
    updateSelectedProject((proj) => ({
      ...proj,
      stages: proj.stages.map((st) => {
        if (st.id !== stageId) return st;
        const currentExpenses = st.expenses || [];
        const newExpense: StageExpense = {
          id: `se-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          title: `Расход ${currentExpenses.length + 1}`,
          amount: 5,
          paid: false,
        };
        return {
          ...st,
          expenses: [...currentExpenses, newExpense],
        };
      }),
    }));
  };

  const handleUpdateStageExpense = (
    stageId: string,
    expenseId: string,
    patch: Partial<StageExpense>
  ) => {
    updateSelectedProject((proj) => ({
      ...proj,
      stages: proj.stages.map((st) => {
        if (st.id !== stageId) return st;
        return {
          ...st,
          expenses: (st.expenses || []).map((ex) =>
            ex.id === expenseId ? { ...ex, ...patch } : ex
          ),
        };
      }),
    }));
  };

  const handleDeleteStageExpense = (stageId: string, expenseId: string) => {
    updateSelectedProject((proj) => ({
      ...proj,
      stages: proj.stages.map((st) => {
        if (st.id !== stageId) return st;
        return {
          ...st,
          expenses: (st.expenses || []).filter((ex) => ex.id !== expenseId),
        };
      }),
    }));
  };

  const handleUpdateAreaM2 = (areaM2: number) => {
    updateSelectedProject((proj) => ({ ...proj, areaM2 }));
  };

  const handleAddTeamItem = () => {
    const newItem: TeamExpense = {
      id: `team-${Date.now()}`,
      role: 'Новая статья',
      payoutType: 'project',
      totalCost: 10,
      paidAmount: 0,
    };
    updateSelectedProject((proj) => ({
      ...proj,
      team: [...proj.team, newItem],
    }));
  };

  const handleUpdateTeamItem = (id: string, patch: Partial<TeamExpense>) => {
    updateSelectedProject((proj) => ({
      ...proj,
      team: proj.team.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    }));
  };

  const handleDeleteTeamItem = (id: string) => {
    updateSelectedProject((proj) => ({
      ...proj,
      team: proj.team.filter((item) => item.id !== id),
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
        const created = await createPrivateGist(storeRef.current, nextToken);
        localStorage.setItem(GIST_ID_STORAGE_KEY, created.gistId);
        etagRef.current = created.etag;
        setGistId(created.gistId);
        setSyncState('online');
        setLastSyncedAt(formatNowTime());
      } else {
        localStorage.setItem(GIST_ID_STORAGE_KEY, nextGistId);
        const updated = await updateGist(
          nextGistId,
          storeRef.current,
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
        setStore(result.data);
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

  const handleImportJson = (imported: MultiProjectStore) => {
    hasPendingLocalPushRef.current = Boolean(gistId.trim() && token.trim());
    setStore(imported);
  };

  const handleResetDefault = () => {
    hasPendingLocalPushRef.current = Boolean(gistId.trim() && token.trim());
    setStore(structuredClone(DEFAULT_STORE));
  };

  const showEditorControls = mode === 'editor' && !isLockedView;
  const effectiveTab: WorkspaceTab = showEditorControls ? activeTab : 'project';

  const handleJumpToProjectFromDashboard = (projectId: string) => {
    handleSelectProject(projectId);
    setActiveTab('project');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1F1D1A]">
      <Header
        mode={mode}
        isLockedView={isLockedView}
        onToggleMode={handleToggleMode}
        syncState={syncState}
        hasGist={Boolean(gistId.trim())}
        syncError={syncError}
        copiedLink={copiedLink}
        onCopyViewLink={handleCopyViewLink}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onExportPdf={handleExportPdf}
      />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {showEditorControls && (
          <div className="no-print flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Разделы студии"
              className="inline-flex items-center p-1 rounded-xl border border-[#E6DFD5] bg-white"
            >
              <button
                type="button"
                role="tab"
                aria-selected={effectiveTab === 'project'}
                onClick={() => setActiveTab('project')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  effectiveTab === 'project'
                    ? 'bg-[#1F1D1A] text-[#FAF8F5]'
                    : 'text-[#6B655D] hover:text-[#1F1D1A]'
                }`}
              >
                <FolderKanban
                  className={`w-3.5 h-3.5 ${
                    effectiveTab === 'project' ? 'text-[#B8956A]' : 'text-[#7A736A]'
                  }`}
                />
                <span>Проект</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={effectiveTab === 'dashboard'}
                onClick={() => setActiveTab('dashboard')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  effectiveTab === 'dashboard'
                    ? 'bg-[#1F1D1A] text-[#FAF8F5]'
                    : 'text-[#6B655D] hover:text-[#1F1D1A]'
                }`}
              >
                <LayoutDashboard
                  className={`w-3.5 h-3.5 ${
                    effectiveTab === 'dashboard' ? 'text-[#B8956A]' : 'text-[#7A736A]'
                  }`}
                />
                <span>Дашборд</span>
                {overdueCount > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[18px] h-4.5 px-1 rounded-full text-[10px] font-bold tabular-nums ${
                      effectiveTab === 'dashboard'
                        ? 'bg-[#C46D5E] text-white'
                        : 'bg-[#FAF0EE] text-[#C46D5E]'
                    }`}
                  >
                    {overdueCount}
                  </span>
                )}
              </button>
            </div>

            <span className="text-xs text-[#7A736A] tabular-nums">
              Всего проектов: {store.projects.length}
            </span>
          </div>
        )}

        {effectiveTab === 'dashboard' ? (
          <GlobalDashboard
            projects={store.projects}
            onJumpToProject={handleJumpToProjectFromDashboard}
          />
        ) : (
          <>
            {showEditorControls && (
              <ProjectWorkspaceBar
                activeProjects={activeProjects}
                selectedProject={selectedProject}
                sortOrder={store.sortOrder}
                onSelectProject={handleSelectProject}
                onCreateProject={handleCreateProject}
                onToggleSortOrder={handleToggleSortOrder}
                onArchiveProject={handleArchiveProject}
                onRestoreProject={handleRestoreProject}
              />
            )}

            <ProjectHeroSection
              projectId={selectedProject.id}
              projectTitle={selectedProject.title}
              projectDate={selectedProject.projectDate}
              currency={selectedProject.currency}
              kp={selectedProject.kp}
              plan={selectedProject.plan}
              gistId={gistId}
              mode={mode}
              totalBudget={metrics.totalBudget}
              paidBudget={metrics.paidBudget}
              unpaidBudget={metrics.unpaidBudget}
              closedPercent={metrics.closedPercent}
              totalTeamCost={metrics.totalTeamCost}
              remainingTeamPay={metrics.remainingTeamPay}
              onUpdateTitle={handleUpdateTitle}
              onUpdateProjectDate={handleUpdateProjectDate}
              onUpdateDocument={handleUpdateDocument}
            />

            <GanttChart
              stages={selectedProject.stages}
              currency={selectedProject.currency}
            />

            <StagesGrid
              stages={selectedProject.stages}
              team={selectedProject.team}
              currency={selectedProject.currency}
              mode={mode}
              onAddStage={handleAddStage}
              onUpdateStage={handleUpdateStage}
              onDeleteStage={handleDeleteStage}
              onAddWorkStage={handleAddWorkStage}
              onUpdateWorkStage={handleUpdateWorkStage}
              onDeleteWorkStage={handleDeleteWorkStage}
              onAddStageExpense={handleAddStageExpense}
              onUpdateStageExpense={handleUpdateStageExpense}
              onDeleteStageExpense={handleDeleteStageExpense}
            />

            <FinancialCharts
              currency={selectedProject.currency}
              totalBudget={metrics.totalBudget}
              paidBudget={metrics.paidBudget}
              projectExpensesTotal={metrics.projectExpensesTotal}
              projectExpensesPaid={metrics.projectExpensesPaid}
              salaryExpensesTotal={metrics.salaryExpensesTotal}
              salaryExpensesPaid={metrics.salaryExpensesPaid}
              stages={selectedProject.stages}
              team={selectedProject.team}
            />

            <TeamTable
              team={selectedProject.team}
              stages={selectedProject.stages}
              currency={selectedProject.currency}
              areaM2={selectedProject.areaM2 ?? 85}
              mode={mode}
              totalTeamCost={metrics.totalTeamCost}
              paidTeamAmount={metrics.paidTeamAmount}
              remainingTeamPay={metrics.remainingTeamPay}
              onUpdateAreaM2={handleUpdateAreaM2}
              onAddTeamItem={handleAddTeamItem}
              onUpdateTeamItem={handleUpdateTeamItem}
              onDeleteTeamItem={handleDeleteTeamItem}
            />

            {showEditorControls && (
              <ArchiveSection
                archivedProjects={archivedProjects}
                selectedProjectId={selectedProject.id}
                onOpenProject={handleSelectProject}
                onRestoreProject={handleRestoreProject}
                onDeleteProject={handleDeleteProject}
              />
            )}
          </>
        )}
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
        activeProjectId={selectedProject.id}
        lastSyncedAt={lastSyncedAt}
        syncError={syncError}
        isBusy={isModalBusy}
        store={store}
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
