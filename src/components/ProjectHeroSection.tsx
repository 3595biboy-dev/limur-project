import React, { useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  FileText,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import { ProjectDocument, ViewMode } from '../types/dashboard';
import {
  formatFullDate,
  formatNumber,
  openDocumentResource,
} from '../data/defaultData';

interface ProjectHeroSectionProps {
  projectId: string;
  projectTitle: string;
  projectDate: string;
  currency: string;
  kp: ProjectDocument;
  plan: ProjectDocument;
  gistId: string;
  mode: ViewMode;
  totalBudget: number;
  paidBudget: number;
  unpaidBudget: number;
  closedPercent: number;
  totalTeamCost: number;
  remainingTeamPay: number;
  onUpdateTitle: (title: string) => void;
  onUpdateProjectDate: (date: string) => void;
  onUpdateDocument: (key: 'kp' | 'plan', patch: Partial<ProjectDocument>) => void;
}

export const ProjectHeroSection: React.FC<ProjectHeroSectionProps> = ({
  projectId,
  projectTitle,
  projectDate,
  currency,
  kp,
  plan,
  gistId,
  mode,
  totalBudget,
  paidBudget,
  unpaidBudget,
  closedPercent,
  totalTeamCost,
  remainingTeamPay,
  onUpdateTitle,
  onUpdateProjectDate,
  onUpdateDocument,
}) => {
  const isEditor = mode === 'editor';
  const [copiedDocKey, setCopiedDocKey] = useState<'kp' | 'plan' | null>(null);
  const kpFileInputRef = useRef<HTMLInputElement | null>(null);
  const planFileInputRef = useRef<HTMLInputElement | null>(null);

  const docItems: Array<{
    key: 'kp' | 'plan';
    title: string;
    doc: ProjectDocument;
    icon: typeof FileText;
    inputRef: React.RefObject<HTMLInputElement | null>;
  }> = [
    {
      key: 'kp',
      title: 'Коммерческое предложение',
      doc: kp,
      icon: FileText,
      inputRef: kpFileInputRef,
    },
    {
      key: 'plan',
      title: 'Обмерный план',
      doc: plan,
      icon: Compass,
      inputRef: planFileInputRef,
    },
  ];

  const handleFileUpload = (
    key: 'kp' | 'plan',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      onUpdateDocument(key, {
        fileName: file.name,
        fileDataUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCopyDocLink = async (key: 'kp' | 'plan', doc: ProjectDocument) => {
    let linkToCopy = doc.url?.trim() || '';
    if (!linkToCopy && doc.fileDataUrl) {
      const shareUrl = new URL(window.location.href);
      shareUrl.search = '';
      shareUrl.searchParams.set('mode', 'view');
      shareUrl.searchParams.set('project', projectId);
      if (gistId.trim()) {
        shareUrl.searchParams.set('gist', gistId.trim());
      }
      linkToCopy = shareUrl.toString();
    }
    if (!linkToCopy) {
      linkToCopy = 'https://limurproject.ru/';
    }

    try {
      await navigator.clipboard.writeText(linkToCopy);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = linkToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopiedDocKey(key);
    window.setTimeout(() => setCopiedDocKey(null), 2000);
  };

  return (
    <section className="space-y-6">
      {/* Project Header + Document Links */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="space-y-2.5 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#B8956A]">
              Карта проекта
            </p>
            <span className="text-[#D4CBC0]" aria-hidden="true">
              ·
            </span>
            {isEditor ? (
              <label className="inline-flex items-center gap-1.5 text-xs text-[#6B655D]">
                <span>Дата проекта:</span>
                <input
                  type="date"
                  value={projectDate}
                  onChange={(e) => onUpdateProjectDate(e.target.value)}
                  className="text-xs font-medium text-[#1F1D1A] tabular-nums bg-white border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-md px-2 py-1"
                />
              </label>
            ) : (
              <span className="text-xs text-[#7A736A] tabular-nums">
                от {formatFullDate(projectDate)}
              </span>
            )}
          </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full xl:w-[660px] shrink-0">
          {docItems.map(({ key, title, doc, icon: Icon, inputRef }) => {
            const hasUploadedFile = Boolean(doc.fileDataUrl && doc.fileName);
            const hasExternalUrl = Boolean(doc.url?.trim());
            let subtitleLabel = 'limurproject.ru';
            if (hasUploadedFile && !hasExternalUrl) {
              subtitleLabel = doc.fileName || 'Загруженный файл';
            } else if (hasExternalUrl) {
              try {
                subtitleLabel = new URL(doc.url.trim()).hostname.replace(/^www\./, '');
              } catch {
                subtitleLabel = doc.url.trim();
              }
            }

            return (
              <div
                key={key}
                className="bg-white border border-[#E6DFD5] rounded-xl p-4 flex flex-col justify-between gap-3.5 min-w-0 print-break-avoid"
              >
                {/* Row 1: Icon + Title */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#FAF8F5] border border-[#E6DFD5] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#B8956A]" />
                  </div>
                  <span className="text-sm font-semibold text-[#1F1D1A] leading-snug break-words min-w-0">
                    {title}
                  </span>
                </div>

                {/* Row 2 (Editor): URL input + Upload File */}
                {isEditor && (
                  <div className="no-print space-y-2 min-w-0">
                    <input
                      type="url"
                      value={doc.url}
                      onChange={(e) =>
                        onUpdateDocument(key, { url: e.target.value })
                      }
                      placeholder="https://... или загрузите файл ниже"
                      aria-label={`Ссылка на ${title}`}
                      className="w-full min-w-0 text-xs text-[#6B655D] bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-lg px-3 py-2"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-[#E6DFD5] bg-[#FAF8F5] text-[#1F1D1A] hover:border-[#B8956A] transition-colors cursor-pointer"
                      >
                        <Upload className="w-3 h-3 text-[#B8956A]" />
                        <span>{hasUploadedFile ? 'Заменить файл' : 'Загрузить файл'}</span>
                      </button>
                      <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                        onChange={(e) => handleFileUpload(key, e)}
                        className="hidden"
                      />

                      <button
                        type="button"
                        onClick={() => handleCopyDocLink(key, doc)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-[#E6DFD5] bg-white text-[#4A453E] hover:border-[#B8956A] transition-colors cursor-pointer"
                        title="Копировать ссылку на файл/документ"
                      >
                        {copiedDocKey === key ? (
                          <>
                            <Check className="w-3 h-3 text-[#4E735D]" />
                            <span className="text-[#4E735D]">Скопировано</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-[#B8956A]" />
                            <span>Копировать ссылку</span>
                          </>
                        )}
                      </button>
                    </div>

                    {hasUploadedFile && (
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#4E735D] bg-[#EEF3F0] px-2.5 py-1 rounded-md">
                        <span className="truncate">Файл: {doc.fileName}</span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateDocument(key, {
                              fileName: undefined,
                              fileDataUrl: undefined,
                            })
                          }
                          aria-label="Удалить загруженный файл"
                          className="text-[#6B655D] hover:text-[#C46D5E] shrink-0 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Row 3: Subtitle / Filename + Открыть buttons */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[#E6DFD5]/70 min-w-0">
                  <span
                    className="text-[11px] text-[#7A736A] truncate min-w-0"
                    title={subtitleLabel}
                  >
                    {subtitleLabel}
                  </span>

                  <div className="no-print flex items-center gap-2 shrink-0">
                    {hasUploadedFile && hasExternalUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          openDocumentResource({
                            url: '',
                            fileName: doc.fileName,
                            fileDataUrl: doc.fileDataUrl,
                          })
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#E6DFD5] bg-[#FAF8F5] text-[#1F1D1A] hover:border-[#B8956A] transition-colors whitespace-nowrap cursor-pointer"
                        title={`Открыть файл ${doc.fileName}`}
                      >
                        <span>Файл</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openDocumentResource(doc)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-[#1F1D1A] text-[#FAF8F5] hover:bg-[#332F2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8956A]"
                    >
                      <span>Открыть</span>
                      <ExternalLink className="w-3 h-3 text-[#B8956A]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3 Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print-break-avoid">
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
