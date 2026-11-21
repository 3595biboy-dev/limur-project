import React from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { ProjectStage, ViewMode } from '../types/dashboard';
import { formatNumber, formatShortDate } from '../data/defaultData';

interface StagesGridProps {
  stages: ProjectStage[];
  currency: string;
  mode: ViewMode;
  onAddStage: () => void;
  onUpdateStage: (id: string, patch: Partial<ProjectStage>) => void;
  onDeleteStage: (id: string) => void;
}

export const StagesGrid: React.FC<StagesGridProps> = ({
  stages,
  currency,
  mode,
  onAddStage,
  onUpdateStage,
  onDeleteStage,
}) => {
  const isEditor = mode === 'editor';

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif-display text-2xl font-bold text-[#1F1D1A]">
            Этапы проекта и остаток
          </h2>
          <p className="text-xs text-[#7A736A] mt-0.5">
            Статус оплаты и календарные рамки каждого этапа работ
          </p>
        </div>

        {isEditor && (
          <button
            type="button"
            onClick={onAddStage}
            className="no-print inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#1F1D1A] text-[#FAF8F5] hover:bg-[#332F2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8956A]"
          >
            <Plus className="w-3.5 h-3.5 text-[#B8956A]" />
            <span>Добавить этап</span>
          </button>
        )}
      </div>

      {stages.length === 0 ? (
        <div className="bg-white border border-[#E6DFD5] rounded-xl p-8 text-center text-sm text-[#7A736A]">
          Этапы пока не добавлены.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className="bg-white border border-[#E6DFD5] rounded-xl p-5 flex flex-col justify-between gap-4 print-break-avoid"
            >
              {/* Top row: Stage name + delete in editor */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  {isEditor ? (
                    <input
                      type="text"
                      value={stage.name}
                      onChange={(e) =>
                        onUpdateStage(stage.id, { name: e.target.value })
                      }
                      aria-label="Название этапа"
                      className="w-full text-sm font-semibold text-[#1F1D1A] bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-md px-2.5 py-1.5"
                    />
                  ) : (
                    <h3 className="text-sm font-semibold text-[#1F1D1A] leading-snug">
                      {stage.name}
                    </h3>
                  )}

                  {isEditor && (
                    <button
                      type="button"
                      onClick={() => onDeleteStage(stage.id)}
                      aria-label={`Удалить этап ${stage.name}`}
                      className="no-print p-1.5 text-[#7A736A] hover:text-[#C46D5E] hover:bg-[#FAF0EE] rounded-md transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Badge / Toggle */}
                <div>
                  {isEditor ? (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateStage(stage.id, { paid: !stage.paid })
                      }
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        stage.paid
                          ? 'bg-[#EEF3F0] text-[#4E735D] hover:bg-[#E1ECE5]'
                          : 'bg-[#FAF0EE] text-[#C46D5E] hover:bg-[#F5E3DF]'
                      }`}
                    >
                      {stage.paid ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Оплачено</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3 h-3" />
                          <span>Ожидается</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                        stage.paid
                          ? 'bg-[#EEF3F0] text-[#4E735D]'
                          : 'bg-[#FAF0EE] text-[#C46D5E]'
                      }`}
                    >
                      {stage.paid ? '✓ Оплачено' : '✕ Ожидается'}
                    </span>
                  )}
                </div>
              </div>

              {/* Bottom row: Amount + Dates */}
              <div className="pt-3 border-t border-[#E6DFD5]/80 space-y-2.5">
                {isEditor ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={stage.amount}
                      onChange={(e) =>
                        onUpdateStage(stage.id, {
                          amount: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      aria-label={`Сумма этапа ${stage.name}`}
                      className="w-24 text-lg font-bold text-[#1F1D1A] tabular-nums bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-md px-2.5 py-1"
                    />
                    <span className="text-xs font-medium text-[#7A736A]">
                      {currency}
                    </span>
                  </div>
                ) : (
                  <div className="text-xl font-bold text-[#1F1D1A] tabular-nums">
                    {formatNumber(stage.amount)}{' '}
                    <span className="text-xs font-medium text-[#7A736A]">
                      {currency}
                    </span>
                  </div>
                )}

                {isEditor ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={stage.startDate}
                      onChange={(e) =>
                        onUpdateStage(stage.id, { startDate: e.target.value })
                      }
                      aria-label="Дата начала"
                      className="w-full text-[11px] text-[#4A453E] tabular-nums bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-md px-2 py-1"
                    />
                    <input
                      type="date"
                      value={stage.endDate}
                      onChange={(e) =>
                        onUpdateStage(stage.id, { endDate: e.target.value })
                      }
                      aria-label="Дата окончания"
                      className="w-full text-[11px] text-[#4A453E] tabular-nums bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-md px-2 py-1"
                    />
                  </div>
                ) : (
                  <div className="text-xs text-[#7A736A] tabular-nums">
                    {formatShortDate(stage.startDate)} –{' '}
                    {formatShortDate(stage.endDate)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
