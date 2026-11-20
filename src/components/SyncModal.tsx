import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Cloud,
  Copy,
  Check,
  Download,
  RefreshCw,
  RotateCcw,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Unlink,
  Link2,
} from 'lucide-react';
import { DashboardData } from '../types/dashboard';
import { TOKEN_STORAGE_KEY, normalizeDashboardData } from '../data/defaultData';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  gistId: string;
  lastSyncedAt: string | null;
  syncError: string | null;
  isBusy: boolean;
  data: DashboardData;
  onSaveToken: (token: string) => void;
  onSaveConfigAndSync: (token: string, gistId: string) => Promise<void>;
  onPullFromGist: (token: string, gistId: string) => Promise<void>;
  onDisconnectGist: () => void;
  onImportJson: (imported: DashboardData) => void;
  onResetDefault: () => void;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  token,
  gistId,
  lastSyncedAt,
  syncError,
  isBusy,
  data,
  onSaveToken,
  onSaveConfigAndSync,
  onPullFromGist,
  onDisconnectGist,
  onImportJson,
  onResetDefault,
}) => {
  const [tokenInput, setTokenInput] = useState(token);
  const [gistIdInput, setGistIdInput] = useState(gistId);
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTokenInput(token);
      setGistIdInput(gistId);
      setLocalErr(null);
      setLocalMsg(null);
      setConfirmReset(false);
    }
  }, [isOpen, token, gistId]);

  const clientShareUrl = useMemo(() => {
    const url = new URL(window.location.href);
    url.search = '';
    const activeGist = gistIdInput.trim() || gistId.trim();
    if (activeGist) {
      url.searchParams.set('gist', activeGist);
    }
    url.searchParams.set('mode', 'client');
    return url.toString();
  }, [gistIdInput, gistId]);

  if (!isOpen) return null;

  const handleSaveTokenOnly = () => {
    setLocalErr(null);
    try {
      const cleaned = tokenInput.trim();
      localStorage.setItem(TOKEN_STORAGE_KEY, cleaned);
      onSaveToken(cleaned);
      setLocalMsg('GitHub токен сохранён в браузере.');
    } catch {
      setLocalErr('Не удалось сохранить токен в localStorage.');
    }
  };

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(clientShareUrl);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = clientShareUrl;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedUrl(true);
    window.setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr(null);
    setLocalMsg(null);
    try {
      await onSaveConfigAndSync(tokenInput.trim(), gistIdInput.trim());
      setLocalMsg('Данные успешно синхронизированы с GitHub Gist.');
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : 'Ошибка синхронизации');
    }
  };

  const handlePull = async () => {
    setLocalErr(null);
    setLocalMsg(null);
    try {
      await onPullFromGist(tokenInput.trim(), gistIdInput.trim());
      setLocalMsg('Актуальная версия загружена из Gist.');
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : 'Ошибка загрузки Gist');
    }
  };

  const handleDownloadBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `limur-project-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setLocalMsg('Резервная копия JSON скачана.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalErr(null);
    setLocalMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const normalized = normalizeDashboardData(parsed);
        onImportJson(normalized);
        setLocalMsg('Данные успешно восстановлены из файла JSON.');
      } catch {
        setLocalErr('Некорректный JSON-файл.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDisconnect = () => {
    setGistIdInput('');
    onDisconnectGist();
    setLocalMsg('Подключение к Gist отключено. Включён локальный режим.');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1D1A]/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-modal-title"
    >
      <div className="bg-white border border-[#E6DFD5] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E6DFD5] flex items-center justify-between gap-4 bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-[#B8956A]" />
            <h2
              id="sync-modal-title"
              className="font-serif-display text-2xl font-bold text-[#1F1D1A]"
            >
              Синхронизация и резервная копия
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно синхронизации"
            className="p-1.5 rounded-lg text-[#7A736A] hover:text-[#1F1D1A] hover:bg-[#E6DFD5]/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="gh-token-input"
                  className="block text-xs font-semibold text-[#1F1D1A]"
                >
                  GitHub Personal Access Token (право <code className="text-[#B8956A]">gist</code>)
                </label>
                <button
                  type="button"
                  onClick={handleSaveTokenOnly}
                  className="text-[11px] font-medium text-[#B8956A] hover:text-[#9D7A4F] transition-colors cursor-pointer"
                >
                  Сохранить токен
                </button>
              </div>
              <input
                id="gh-token-input"
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full text-sm text-[#1F1D1A] bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-lg px-3.5 py-2.5"
              />
              <p className="text-[11px] text-[#7A736A]">
                Хранится только в вашем браузере (<code className="text-[#4A453E]">localStorage</code>).
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="gist-id-input"
                className="block text-xs font-semibold text-[#1F1D1A]"
              >
                Gist ID (необязательно)
              </label>
              <input
                id="gist-id-input"
                type="text"
                value={gistIdInput}
                onChange={(e) => setGistIdInput(e.target.value)}
                placeholder="Оставьте пустым для создания нового приватного Gist"
                className="w-full text-sm text-[#1F1D1A] bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-lg px-3.5 py-2.5"
              />
              <p className="text-[11px] text-[#7A736A]">
                Если поле пустое, при сохранении автоматически создастся приватный Gist{' '}
                <code className="text-[#4A453E]">limur-project-dashboard.json</code>.
              </p>
            </div>

            {(localErr || syncError) && (
              <div className="flex items-start gap-2 text-xs text-[#C46D5E] bg-[#FAF0EE] border border-[#C46D5E]/30 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{localErr || syncError}</span>
              </div>
            )}

            {localMsg && (
              <div className="flex items-start gap-2 text-xs text-[#4E735D] bg-[#EEF3F0] border border-[#4E735D]/30 rounded-lg p-3">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{localMsg}</span>
              </div>
            )}

            {lastSyncedAt && (
              <p className="text-xs text-[#7A736A] tabular-nums">
                Последняя синхронизация: {lastSyncedAt}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="submit"
                disabled={isBusy}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#1F1D1A] text-[#FAF8F5] hover:bg-[#332F2A] disabled:opacity-60 transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-[#B8956A] ${isBusy ? 'animate-spin' : ''}`}
                />
                <span>
                  {gistIdInput.trim()
                    ? 'Сохранить и синхронизировать'
                    : 'Создать Gist и подключить'}
                </span>
              </button>

              {gistIdInput.trim() && (
                <>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handlePull}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium rounded-lg border border-[#E6DFD5] bg-white text-[#1F1D1A] hover:border-[#B8956A] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#4E735D]" />
                    <span>Загрузить из Gist</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium rounded-lg text-[#C46D5E] hover:bg-[#FAF0EE] transition-colors cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Отключить</span>
                  </button>
                </>
              )}
            </div>
          </form>

          {/* Shareable Client URL */}
          <div className="pt-5 border-t border-[#E6DFD5] space-y-2.5">
            <div className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-[#B8956A]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A736A]">
                Ссылка для клиента (Вид для Лили)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={clientShareUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                aria-label="Ссылка для клиента"
                className="flex-1 min-w-0 text-xs text-[#4A453E] bg-[#FAF8F5] border border-[#E6DFD5] rounded-lg px-3 py-2 select-all"
              />
              <button
                type="button"
                onClick={handleCopyShareUrl}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E6DFD5] bg-white text-[#1F1D1A] hover:border-[#B8956A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4E735D]" />
                    <span className="text-[#4E735D]">Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#B8956A]" />
                    <span>Копировать</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-[#7A736A]">
              {gistIdInput.trim() || gistId.trim()
                ? 'Клиент откроет актуальную версию дашборда с автообновлением в режиме чтения.'
                : 'Подключите Gist выше, чтобы ссылка содержала параметр ?gist=ID&mode=client.'}
            </p>
          </div>

          {/* Local JSON Backup/Restore */}
          <div className="pt-5 border-t border-[#E6DFD5] space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#7A736A]">
              Локальный файл JSON
            </h3>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E6DFD5] bg-[#FAF8F5] text-[#1F1D1A] hover:border-[#B8956A] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#B8956A]" />
                <span>Скачать бэкап JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E6DFD5] bg-[#FAF8F5] text-[#1F1D1A] hover:border-[#B8956A] transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#B8956A]" />
                <span>Загрузить JSON</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileChange}
                className="hidden"
              />

              {!confirmReset ? (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-[#7A736A] hover:text-[#C46D5E] hover:bg-[#FAF0EE] transition-colors ml-auto cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Сбросить</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      onResetDefault();
                      setConfirmReset(false);
                      setLocalMsg('Восстановлены исходные данные проекта.');
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#C46D5E] text-white hover:opacity-90 cursor-pointer"
                  >
                    Подтвердить сброс
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-2.5 py-1.5 text-xs text-[#7A736A] hover:text-[#1F1D1A] cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
