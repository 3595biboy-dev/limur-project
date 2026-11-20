import React from 'react';
import { Check, Cloud, Eye, HardDrive, Link2, PenLine, RefreshCw, AlertCircle } from 'lucide-react';
import { SyncState, ViewMode } from '../types/dashboard';
import { LimurLogo } from './LimurLogo';

interface HeaderProps {
  mode: ViewMode;
  onToggleMode: () => void;
  syncState: SyncState;
  hasGist: boolean;
  syncError: string | null;
  copiedLink: boolean;
  onCopyClientLink: () => void;
  onOpenSyncModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  onToggleMode,
  syncState,
  hasGist,
  syncError,
  copiedLink,
  onCopyClientLink,
  onOpenSyncModal,
}) => {
  const isClient = mode === 'client';

  const renderStatus = () => {
    if (syncState === 'error' && syncError) {
      return (
        <span
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#C46D5E] whitespace-nowrap shrink-0"
          title={syncError}
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Ошибка синхронизации</span>
        </span>
      );
    }

    if (syncState === 'syncing') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B8956A] whitespace-nowrap shrink-0">
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Синхронизация...</span>
        </span>
      );
    }

    if (hasGist) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4E735D] whitespace-nowrap shrink-0">
          <Cloud className="w-3.5 h-3.5 shrink-0" />
          <span>Онлайн • автообновление 5 сек</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7A736A] whitespace-nowrap shrink-0">
        <HardDrive className="w-3.5 h-3.5 shrink-0" />
        <span>Локальный режим</span>
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#E6DFD5]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
        <LimurLogo />

        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="hidden md:flex items-center pr-2 border-r border-[#E6DFD5]">
            {renderStatus()}
          </div>

          {!isClient && (
            <>
              <button
                type="button"
                onClick={onCopyClientLink}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E6DFD5] bg-white text-[#1F1D1A] hover:border-[#B8956A] hover:bg-[#FAF8F5] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8956A]"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4E735D]" />
                    <span className="text-[#4E735D]">Ссылка скопирована</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5 text-[#B8956A]" />
                    <span className="hidden sm:inline">Ссылка для Лили</span>
                    <span className="sm:hidden">Ссылка</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenSyncModal}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#1F1D1A] text-[#FAF8F5] hover:bg-[#332F2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8956A]"
              >
                <Cloud className="w-3.5 h-3.5 text-[#B8956A]" />
                <span>Синхронизация</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onToggleMode}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8956A] ${
              isClient
                ? 'border-[#E6DFD5] bg-white text-[#6B655D] hover:text-[#1F1D1A] hover:border-[#B8956A]'
                : 'border-[#B8956A]/50 bg-[#B8956A]/10 text-[#1F1D1A] hover:bg-[#B8956A]/20'
            }`}
            title={isClient ? 'Переключиться в режим автора' : 'Посмотреть глазами клиента'}
          >
            {isClient ? (
              <>
                <PenLine className="w-3.5 h-3.5 text-[#B8956A]" />
                <span>Режим автора</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-[#B8956A]" />
                <span>Вид для Лили</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile connection status row */}
      <div className="md:hidden border-t border-[#E6DFD5]/70 px-4 py-1.5 flex items-center justify-between bg-[#FAF8F5]">
        {renderStatus()}
      </div>
    </header>
  );
};
