import React, { useState } from 'react';
import { Archive, ExternalLink, RotateCcw, Trash2 } from 'lucide-react';
import { ProjectRecord } from '../types/dashboard';
import { formatFullDate, formatNumber } from '../data/defaultData';

interface ArchiveSectionProps {
  archivedProjects: ProjectRecord[];
  selectedProjectId: string;
  onOpenProject: (id: string) => void;
  onRestoreProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export const ArchiveSection: React.FC<ArchiveSectionProps> = ({
  archivedProjects,
  selectedProjectId,
  onOpenProject,
  onRestoreProject,
  onDeleteProject,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <section className="no-print bg-white border border-[#E6DFD5] rounded-xl overflow-hidden">
      <div className="px-6 py-4 flex items-center justify-between gap-4 border-b border-[#E6DFD5] bg-[#FAF8F5]">
        <div className="flex items-center gap-2.5">
          <Archive className="w-4 h-4 text-[#B8956A]" />
          <h2 className="font-serif-display text-xl font-bold text-[#1F1D1A]">
            Архив проектов
          </h2>
          <span className="text-xs text-[#7A736A] tabular-nums">
            · {archivedProjects.length}
          </span>
        </div>
      </div>

      {archivedProjects.length === 0 ? (
        <div className="px-6 py-5 text-xs text-[#7A736A]">
          Завершённых проектов пока нет. Нажмите «Завершить проект» вверху, чтобы перенести текущий проект в архив.
        </div>
      ) : (
        <div className="divide-y divide-[#E6DFD5]/70">
          {archivedProjects.map((proj) => {
            const totalBudget = proj.stages.reduce((sum, s) => sum + s.amount, 0);
            const paidBudget = proj.stages
              .filter((s) => s.paid)
              .reduce((sum, s) => sum + s.amount, 0);
            const isSelected = proj.id === selectedProjectId;

            return (
              <div
                key={proj.id}
                className={`px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
                  isSelected ? 'bg-[#FAF8F5]' : 'hover:bg-[#FAF8F5]/60'
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                  <span className="font-semibold text-sm text-[#1F1D1A] truncate max-w-[260px]">
                    {proj.title}
                  </span>
                  <span className="text-[#D4CBC0]" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[#7A736A] tabular-nums whitespace-nowrap">
                    {formatFullDate(proj.projectDate)}
                  </span>
                  <span className="text-[#D4CBC0]" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-[#4A453E] tabular-nums whitespace-nowrap">
                    Бюджет: {formatNumber(totalBudget)} {proj.currency} (оплачено{' '}
                    <span className="text-[#4E735D] font-semibold">
                      {formatNumber(paidBudget)}
                    </span>
                    )
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenProject(proj.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'border-[#1F1D1A] bg-[#1F1D1A] text-[#FAF8F5]'
                        : 'border-[#E6DFD5] bg-white text-[#1F1D1A] hover:border-[#B8956A]'
                    }`}
                  >
                    <ExternalLink className="w-3 h-3 text-[#B8956A]" />
                    <span>Открыть</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRestoreProject(proj.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E6DFD5] bg-white text-[#4E735D] hover:border-[#4E735D] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Вернуть в работу</span>
                  </button>

                  {confirmDeleteId === proj.id ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteProject(proj.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2.5 py-1.5 rounded-md bg-[#C46D5E] text-white font-semibold hover:opacity-90 cursor-pointer"
                      >
                        Удалить
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1.5 text-[#7A736A] hover:text-[#1F1D1A] cursor-pointer"
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(proj.id)}
                      aria-label={`Удалить проект ${proj.title}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[#7A736A] hover:text-[#C46D5E] hover:bg-[#FAF0EE] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
