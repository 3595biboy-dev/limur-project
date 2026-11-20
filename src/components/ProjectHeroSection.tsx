import React from 'react';
import { ExternalLink, FileText, Compass, CheckCircle2, Clock, Wallet } from 'lucide-react';
import { DocumentLink, ViewMode } from '../types/dashboard';
import { formatNumber } from '../data/defaultData';

interface ProjectHeroSectionProps {
  projectTitle: string;
  currency: string;
  documents: DocumentLink[];
  mode: ViewMode;
  totalBudget: number;
  paidBudget: number;
  unpaidBudget: number;
  closedPercent: number;
  totalTeamCost: number;
  remainingTeamPay: number;
  onUpdateTitle: (title: string) => void;
  onUpdateDocument: (id: string, field: 'title' | 'url', value: string) => void;
}

export const ProjectHeroSection: React.FC<ProjectHeroSectionProps> = ({
  projectTitle,
  currency,
  documents,
  mode,
  totalBudget,
  paidBudget,
  unpaidBudget,
  closedPercent,
  totalTeamCost,
  remainingTeamPay,
  onUpdateTitle,
  onUpdateDocument,
}) => {
  const isEditor = mode === 'editor';

  return (
    <section className="space-y-6">
      {/* Project Header + Document Links */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#B8956A]">
            Карта проекта
          </p>
          {isEditor ? (
            <div className="max-w-xl">
              <label htmlFor="project-title-input" className="sr-only">
                Название проекта
              </label>
              <input
                id="project-title-input"
                type="text"
                value={projectTitle}
                onChange={(e) => onUpdateTitle(e.target.value)}
                placeholder="Название проекта"
                className="w-full font-serif-display text-3xl sm:text-4xl font-bold text-[#1F1D1A] bg-white border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none focus:ring-2 focus:ring-[#B8956A]/20 rounded-xl px-4 py-2 transition-colors"
              />
            </div>
          ) : (
            <h1 className="font-serif-display text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-[#1F1D1A] leading-tight text-balance">
              {projectTitle}
            </h1>
          )}
        </div>

        {/* Document Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full xl:w-[640px] shrink-0">
          {documents.map((doc, index) => {
            const Icon = index === 0 ? FileText : Compass;
            const safeUrl = doc.url?.trim() || 'https://limurproject.ru/';
            let displayHost = 'limurproject.ru';
            try {
              displayHost = new URL(safeUrl).hostname.replace(/^www\./, '');
            } catch {
              displayHost = safeUrl;
            }

            return (
              <div
                key={doc.id}
                className="bg-white border border-[#E6DFD5] rounded-xl p-4 flex flex-col justify-between gap-3.5 min-w-0"
              >
                {/* Row 1: Icon + Full-width Title */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#FAF8F5] border border-[#E6DFD5] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#B8956A]" />
                  </div>
                  {isEditor ? (
                    <input
                      type="text"
                      value={doc.title}
                      onChange={(e) => onUpdateDocument(doc.id, 'title', e.target.value)}
                      aria-label="Название документа"
                      className="w-full min-w-0 text-sm font-semibold text-[#1F1D1A] bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-lg px-3 py-1.5"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-[#1F1D1A] leading-snug break-words min-w-0">
                      {doc.title}
                    </span>
                  )}
                </div>

                {/* Row 2 (Editor): Full-width URL input */}
                {isEditor && (
                  <div className="min-w-0">
                    <input
                      type="url"
                      value={doc.url}
                      onChange={(e) => onUpdateDocument(doc.id, 'url', e.target.value)}
                      placeholder="https://..."
                      aria-label={`Ссылка на ${doc.title}`}
                      className="w-full min-w-0 text-xs text-[#6B655D] bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-lg px-3 py-2"
                    />
                  </div>
                )}

                {/* Row 3: Host label + Открыть button */}
                <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-[#E6DFD5]/70 min-w-0">
                  <span className="text-[11px] text-[#7A736A] truncate min-w-0">
                    {displayHost}
                  </span>
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#1F1D1A] text-[#FAF8F5] hover:bg-[#332F2A] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8956A]"
                  >
                    <span>Открыть</span>
                    <ExternalLink className="w-3 h-3 text-[#B8956A]" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3 Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* KPI 1 */}
        <div className="bg-white border border-[#E6DFD5] rounded-xl p-6 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium text-[#6B655D]">
              Общий бюджет (Этапы)
            </span>
            <CheckCircle2 className="w-4 h-4 text-[#4E735D] shrink-0 mt-0.5" />
          </div>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div className="text-3xl font-bold text-[#1F1D1A] tabular-nums tracking-tight">
              {formatNumber(totalBudget)}{' '}
              <span className="text-base font-medium text-[#7A736A]">{currency}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4E735D] bg-[#EEF3F0] px-2.5 py-1 rounded-md tabular-nums whitespace-nowrap">
              Оплачено: {formatNumber(paidBudget)}
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white border border-[#E6DFD5] rounded-xl p-6 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium text-[#6B655D]">
              Остаток на сегодня (к оплате)
            </span>
            <Clock
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                unpaidBudget > 0 ? 'text-[#C46D5E]' : 'text-[#4E735D]'
              }`}
            />
          </div>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div
              className={`text-3xl font-bold tabular-nums tracking-tight ${
                unpaidBudget > 0 ? 'text-[#C46D5E]' : 'text-[#4E735D]'
              }`}
            >
              {formatNumber(unpaidBudget)}{' '}
              <span className="text-base font-medium text-[#7A736A]">{currency}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1F1D1A] bg-[#F3EFE9] px-2.5 py-1 rounded-md tabular-nums whitespace-nowrap">
              {formatNumber(closedPercent)}% закрыто
            </span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white border border-[#E6DFD5] rounded-xl p-6 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium text-[#6B655D]">
              Расходы команды / Остаток выплат
            </span>
            <Wallet className="w-4 h-4 text-[#B8956A] shrink-0 mt-0.5" />
          </div>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div className="text-3xl font-bold text-[#1F1D1A] tabular-nums tracking-tight">
              {formatNumber(totalTeamCost)}{' '}
              <span className="text-base font-medium text-[#7A736A]">{currency}</span>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md tabular-nums whitespace-nowrap ${
                remainingTeamPay > 0
                  ? 'text-[#C46D5E] bg-[#FAF0EE]'
                  : 'text-[#4E735D] bg-[#EEF3F0]'
              }`}
            >
              Осталось: {formatNumber(remainingTeamPay)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
