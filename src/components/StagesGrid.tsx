import React, { useState } from 'react';
import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Plus,
  Receipt,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import {
  ProjectStage,
  StageExpense,
  TeamExpense,
  ViewMode,
  WorkStage,
} from '../types/dashboard';
import {
  formatNumber,
  formatShortDate,
  getStageCompletionPercent,
  getStageDateBounds,
  getStageExpensesBreakdown,
} from '../data/defaultData';

interface StagesGridProps {
  stages: ProjectStage[];
  team: TeamExpense[];
  currency: string;
  mode: ViewMode;
  onAddStage: () => void;
  onUpdateStage: (id: string, patch: Partial<ProjectStage>) => void;
  onDeleteStage: (id: string) => void;
  onAddWorkStage: (stageId: string) => void;
  onUpdateWorkStage: (
    stageId: string,
    workId: string,
    patch: Partial<WorkStage>
  ) => void;
  onDeleteWorkStage: (stageId: string, workId: string) => void;
  onAddStageExpense: (stageId: string) => void;
  onUpdateStageExpense: (
    stageId: string,
    expenseId: string,
    patch: Partial<StageExpense>
  ) => void;
  onDeleteStageExpense: (stageId: string, expenseId: string) => void;
}

export const StagesGrid: React.FC<StagesGridProps> = ({
  stages,
  team,
  currency,
  mode,
  onAddStage,
  onUpdateStage,
  onDeleteStage,
  onAddWorkStage,
  onUpdateWorkStage,
  onDeleteWorkStage,
  onAddStageExpense,
  onUpdateStageExpense,
  onDeleteStageExpense,
}) => {
  const isEditor = mode === 'editor';
  const [expandedStageIds, setExpandedStageIds] = useState<
    Record<string, boolean>
  >({});
  const [expandedExpenseIds, setExpandedExpenseIds] = useState<
    Record<string, boolean>
  >({});

  const toggleExpanded = (id: string) => {
    setExpandedStageIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpenses = (id: string) => {
    setExpandedExpenseIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif-display text-2xl font-bold text-[#1F1D1A]">
            Этапы оплаты и работ
          </h2>
          <p className="text-xs text-[#7A736A] mt-0.5">
            Поступления, расходы по каждому этапу и вложенные рабочие задачи с авторасчётом готовности
          </p>
        </div>

        {isEditor && (
          <button
            type="button"
            onClick={onAddStage}
            className="no-print inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#1F1D1A] text-[#FAF8F5] hover:bg-[#332F2A] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8956A]"
          >
            <Plus className="w-3.5 h-3.5 text-[#B8956A]" />
            <span>Добавить этап оплаты</span>
          </button>
        )}
      </div>

      {stages.length === 0 ? (
        <div className="bg-white border border-[#E6DFD5] rounded-xl p-8 text-center text-sm text-[#7A736A]">
          Этапы оплаты пока не добавлены.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {stages.map((stage) => {
            const completionPct = getStageCompletionPercent(stage);
            const bounds = getStageDateBounds(stage);
            const workCount = stage.workStages?.length || 0;
            const isExpanded = Boolean(expandedStageIds[stage.id]);
            const isExpExpanded = Boolean(expandedExpenseIds[stage.id]);
            const hasApprovalTask = stage.workStages?.some(
              (w) => w.clientApproval
            );

            const expBreakdown = getStageExpensesBreakdown(stage, team);
            const stageBalance = stage.amount - expBreakdown.totalExpenses;
            const linkedTeam = team.filter((t) => t.stageId === stage.id);
            const directExpenses = stage.expenses || [];

            return (
              <div
                key={stage.id}
                className="bg-white border border-[#E6DFD5] rounded-xl p-5 flex flex-col gap-4 print-break-avoid"
              >
                {/* Payment Stage Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    {isEditor ? (
                      <input
                        type="text"
                        value={stage.name}
                        onChange={(e) =>
                          onUpdateStage(stage.id, { name: e.target.value })
                        }
                        aria-label="Название этапа оплаты"
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

                  {/* Payment Status + Income Amount */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
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

                    {isEditor ? (
                      <div className="flex items-center gap-1.5">
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
                          className="w-20 text-right text-base font-bold text-[#1F1D1A] tabular-nums bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-md px-2 py-1"
                        />
                        <span className="text-xs font-medium text-[#7A736A]">
                          {currency}
                        </span>
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-[#1F1D1A] tabular-nums">
                        {formatNumber(stage.amount)}{' '}
                        <span className="text-xs font-medium text-[#7A736A]">
                          {currency}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Per-Stage Expenses & Balance Summary (Editor Only) */}
                  {isEditor && (
                    <div className="no-print flex items-center justify-between gap-2 text-[11px] bg-[#FAF8F5] border border-[#E6DFD5]/80 rounded-lg px-3 py-2 tabular-nums">
                      <span className="text-[#6B655D]">
                        Расходы:{' '}
                        <strong className="text-[#1F1D1A] font-semibold">
                          {formatNumber(expBreakdown.totalExpenses)} {currency}
                        </strong>
                      </span>
                      <span
                        className={`font-semibold ${
                          stageBalance > 0
                            ? 'text-[#4E735D]'
                            : stageBalance < 0
                              ? 'text-[#C46D5E]'
                              : 'text-[#6B655D]'
                        }`}
                      >
                        Баланс: {stageBalance > 0 ? '+' : ''}
                        {formatNumber(stageBalance)} {currency}
                      </span>
                    </div>
                  )}
                </div>

                {/* Auto-calculated completion % + Date bounds */}
                <div className="pt-3 border-t border-[#E6DFD5]/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-[#6B655D]">Готовность работ</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        completionPct === 100
                          ? 'text-[#4E735D]'
                          : 'text-[#1F1D1A]'
                      }`}
                    >
                      {completionPct}%
                    </span>
                  </div>

                  <div className="h-2 w-full bg-[#F3EFE9] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${completionPct}%`,
                        backgroundColor:
                          completionPct === 100 ? '#4E735D' : '#B8956A',
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 text-[11px] text-[#7A736A] tabular-nums">
                    <span>
                      {formatShortDate(bounds.startDate)} –{' '}
                      {formatShortDate(bounds.endDate)}
                    </span>
                    {hasApprovalTask && (
                      <span className="inline-flex items-center gap-1 text-[#8C6D46] font-medium">
                        <UserCheck className="w-3 h-3" />
                        <span>С согласованием</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Expandable Work Stages Section */}
                <div className="pt-2 border-t border-[#E6DFD5]/80">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(stage.id)}
                    aria-expanded={isExpanded}
                    className="w-full flex items-center justify-between gap-2 py-1.5 text-xs font-medium text-[#1F1D1A] hover:text-[#B8956A] transition-colors cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-[#B8956A]" />
                      <span>Этапы работ · {workCount}</span>
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#7A736A]" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#7A736A]" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2.5">
                      {workCount === 0 ? (
                        <p className="text-xs text-[#7A736A] py-1">
                          Внутри этого этапа оплаты пока нет рабочих задач.
                        </p>
                      ) : (
                        stage.workStages.map((ws) => (
                          <div
                            key={ws.id}
                            className="bg-[#FAF8F5] border border-[#E6DFD5] rounded-lg p-3 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              {isEditor ? (
                                <input
                                  type="text"
                                  value={ws.title}
                                  onChange={(e) =>
                                    onUpdateWorkStage(stage.id, ws.id, {
                                      title: e.target.value,
                                    })
                                  }
                                  aria-label="Название этапа работ"
                                  className="w-full text-xs font-semibold text-[#1F1D1A] bg-white border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded px-2 py-1"
                                />
                              ) : (
                                <span className="text-xs font-semibold text-[#1F1D1A] leading-snug">
                                  {ws.title}
                                </span>
                              )}

                              {isEditor && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onDeleteWorkStage(stage.id, ws.id)
                                  }
                                  aria-label={`Удалить работу ${ws.title}`}
                                  className="no-print p-1 text-[#7A736A] hover:text-[#C46D5E] rounded cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                              {isEditor ? (
                                <input
                                  type="text"
                                  value={ws.assignee}
                                  onChange={(e) =>
                                    onUpdateWorkStage(stage.id, ws.id, {
                                      assignee: e.target.value,
                                    })
                                  }
                                  placeholder="Исполнитель"
                                  aria-label="Исполнитель / роль"
                                  className="w-28 text-[11px] text-[#4A453E] bg-white border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded px-2 py-0.5"
                                />
                              ) : (
                                <span className="text-[#6B655D]">
                                  Исполнитель:{' '}
                                  <strong className="font-medium text-[#1F1D1A]">
                                    {ws.assignee}
                                  </strong>
                                </span>
                              )}

                              {isEditor ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateWorkStage(stage.id, ws.id, {
                                      clientApproval: !ws.clientApproval,
                                    })
                                  }
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                                    ws.clientApproval
                                      ? 'bg-[#B8956A]/15 border-[#B8956A] text-[#1F1D1A]'
                                      : 'bg-white border-[#E6DFD5] text-[#7A736A]'
                                  }`}
                                >
                                  <UserCheck className="w-3 h-3 text-[#B8956A]" />
                                  <span>Согласование с заказчиком</span>
                                </button>
                              ) : (
                                ws.clientApproval && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#8C6D46]">
                                    <UserCheck className="w-3 h-3" />
                                    <span>Согласование с заказчиком</span>
                                  </span>
                                )
                              )}
                            </div>

                            {isEditor ? (
                              <div className="space-y-1.5 pt-1">
                                <div className="grid grid-cols-2 gap-1.5">
                                  <label className="text-[10px] text-[#7A736A]">
                                    План с:
                                    <input
                                      type="date"
                                      value={ws.plannedStart}
                                      onChange={(e) =>
                                        onUpdateWorkStage(stage.id, ws.id, {
                                          plannedStart: e.target.value,
                                        })
                                      }
                                      className="mt-0.5 w-full text-[11px] text-[#1F1D1A] tabular-nums bg-white border border-[#E6DFD5] rounded px-1.5 py-0.5"
                                    />
                                  </label>
                                  <label className="text-[10px] text-[#7A736A]">
                                    План по:
                                    <input
                                      type="date"
                                      value={ws.plannedEnd}
                                      onChange={(e) =>
                                        onUpdateWorkStage(stage.id, ws.id, {
                                          plannedEnd: e.target.value,
                                        })
                                      }
                                      className="mt-0.5 w-full text-[11px] text-[#1F1D1A] tabular-nums bg-white border border-[#E6DFD5] rounded px-1.5 py-0.5"
                                    />
                                  </label>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <label className="text-[10px] text-[#7A736A]">
                                    Факт с:
                                    <input
                                      type="date"
                                      value={ws.actualStart || ''}
                                      onChange={(e) =>
                                        onUpdateWorkStage(stage.id, ws.id, {
                                          actualStart:
                                            e.target.value || undefined,
                                        })
                                      }
                                      className="mt-0.5 w-full text-[11px] text-[#1F1D1A] tabular-nums bg-white border border-[#E6DFD5] rounded px-1.5 py-0.5"
                                    />
                                  </label>
                                  <label className="text-[10px] text-[#7A736A]">
                                    Факт по:
                                    <input
                                      type="date"
                                      value={ws.actualEnd || ''}
                                      onChange={(e) =>
                                        onUpdateWorkStage(stage.id, ws.id, {
                                          actualEnd:
                                            e.target.value || undefined,
                                        })
                                      }
                                      className="mt-0.5 w-full text-[11px] text-[#1F1D1A] tabular-nums bg-white border border-[#E6DFD5] rounded px-1.5 py-0.5"
                                    />
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7A736A] tabular-nums">
                                <span>
                                  План: {formatShortDate(ws.plannedStart)} –{' '}
                                  {formatShortDate(ws.plannedEnd)}
                                </span>
                                {(ws.actualStart || ws.actualEnd) && (
                                  <span className="text-[#4E735D]">
                                    Факт:{' '}
                                    {ws.actualStart
                                      ? formatShortDate(ws.actualStart)
                                      : '…'}{' '}
                                    –{' '}
                                    {ws.actualEnd
                                      ? formatShortDate(ws.actualEnd)
                                      : 'в работе'}
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="pt-1 space-y-1">
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-[#7A736A]">Прогресс</span>
                                {isEditor ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="range"
                                      min={0}
                                      max={100}
                                      step={5}
                                      value={ws.progress}
                                      onChange={(e) =>
                                        onUpdateWorkStage(stage.id, ws.id, {
                                          progress: Number(e.target.value),
                                        })
                                      }
                                      aria-label={`Прогресс ${ws.title}`}
                                      className="w-20 accent-[#B8956A] cursor-pointer"
                                    />
                                    <span className="font-semibold text-[#1F1D1A] tabular-nums w-9 text-right">
                                      {ws.progress}%
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-semibold text-[#1F1D1A] tabular-nums">
                                    {ws.progress}%
                                  </span>
                                )}
                              </div>
                              <div className="h-1.5 w-full bg-[#E6DFD5]/70 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${ws.progress}%`,
                                    backgroundColor:
                                      ws.progress === 100
                                        ? '#4E735D'
                                        : '#B8956A',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}

                      {isEditor && (
                        <button
                          type="button"
                          onClick={() => onAddWorkStage(stage.id)}
                          className="no-print w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg border border-dashed border-[#D4CBC0] text-[#4A453E] hover:border-[#B8956A] hover:text-[#1F1D1A] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#B8956A]" />
                          <span>Добавить этап работ</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Expandable Stage-Linked Expenses Section (Editor Only) */}
                {isEditor && (
                  <div className="no-print pt-2 border-t border-[#E6DFD5]/80">
                    <button
                      type="button"
                      onClick={() => toggleExpenses(stage.id)}
                      aria-expanded={isExpExpanded}
                      className="w-full flex items-center justify-between gap-2 py-1.5 text-xs font-medium text-[#1F1D1A] hover:text-[#B8956A] transition-colors cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-[#B8956A]" />
                        <span>
                          Расходы этапа ·{' '}
                          {formatNumber(expBreakdown.totalExpenses)} {currency}
                        </span>
                      </span>
                      {isExpExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#7A736A]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#7A736A]" />
                      )}
                    </button>

                    {isExpExpanded && (
                      <div className="mt-2.5 space-y-2">
                        {linkedTeam.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A736A]">
                              Из таблицы команды:
                            </span>
                            {linkedTeam.map((t) => (
                              <div
                                key={t.id}
                                className="flex items-center justify-between text-xs bg-[#FAF8F5] border border-[#E6DFD5]/80 rounded px-2.5 py-1.5 tabular-nums"
                              >
                                <span className="text-[#1F1D1A] truncate">
                                  {t.role}{' '}
                                  <span className="text-[10px] text-[#7A736A]">
                                    (
                                    {t.payoutType === 'salary'
                                      ? 'ЗП'
                                      : 'По объекту'}
                                    )
                                  </span>
                                </span>
                                <span className="font-semibold text-[#1F1D1A] shrink-0">
                                  {formatNumber(t.totalCost)} {currency}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {directExpenses.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A736A]">
                              Прямые расходы этапа:
                            </span>
                            {directExpenses.map((ex) => (
                              <div
                                key={ex.id}
                                className="bg-[#FAF8F5] border border-[#E6DFD5] rounded p-2 space-y-1.5"
                              >
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={ex.title}
                                    onChange={(e) =>
                                      onUpdateStageExpense(stage.id, ex.id, {
                                        title: e.target.value,
                                      })
                                    }
                                    aria-label="Название расхода этапа"
                                    className="flex-1 min-w-0 text-xs text-[#1F1D1A] bg-white border border-[#E6DFD5] rounded px-2 py-1"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onDeleteStageExpense(stage.id, ex.id)
                                    }
                                    aria-label={`Удалить расход ${ex.title}`}
                                    className="p-1 text-[#7A736A] hover:text-[#C46D5E] cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateStageExpense(stage.id, ex.id, {
                                        paid: !ex.paid,
                                      })
                                    }
                                    className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                                      ex.paid
                                        ? 'bg-[#EEF3F0] text-[#4E735D]'
                                        : 'bg-[#FAF0EE] text-[#C46D5E]'
                                    }`}
                                  >
                                    {ex.paid ? 'Оплачено' : 'К оплате'}
                                  </button>
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.5"
                                      value={ex.amount}
                                      onChange={(e) =>
                                        onUpdateStageExpense(stage.id, ex.id, {
                                          amount: Math.max(
                                            0,
                                            Number(e.target.value) || 0
                                          ),
                                        })
                                      }
                                      className="w-16 text-right text-xs font-semibold tabular-nums bg-white border border-[#E6DFD5] rounded px-1.5 py-0.5"
                                    />
                                    <span className="text-[11px] text-[#7A736A]">
                                      {currency}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => onAddStageExpense(stage.id)}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-medium rounded-lg border border-dashed border-[#D4CBC0] text-[#4A453E] hover:border-[#B8956A] hover:text-[#1F1D1A] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-[#B8956A]" />
                          <span>Добавить расход этапа</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
