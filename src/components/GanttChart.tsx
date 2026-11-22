import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, UserCheck } from 'lucide-react';
import { ProjectStage } from '../types/dashboard';
import {
  formatNumber,
  formatShortDate,
  getStageCompletionPercent,
  getStageDateBounds,
} from '../data/defaultData';

interface GanttChartProps {
  stages: ProjectStage[];
  currency: string;
}

type GanttScale = 'day' | 'week';

function parseDateUTC(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return NaN;
  return Date.UTC(y, m - 1, d);
}

function getTodayUTC(): number {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const GanttChart: React.FC<GanttChartProps> = ({ stages, currency }) => {
  const [scale, setScale] = useState<GanttScale>('week');
  const [hoveredWorkId, setHoveredWorkId] = useState<string | null>(null);

  const timeline = useMemo(() => {
    // Collect all dates from workStages (or fallback to payment stage dates)
    const allStarts: number[] = [];
    const allEnds: number[] = [];

    stages.forEach((stage) => {
      if (stage.workStages && stage.workStages.length > 0) {
        stage.workStages.forEach((ws) => {
          const ps = parseDateUTC(ws.plannedStart);
          const pe = parseDateUTC(ws.plannedEnd);
          if (!Number.isNaN(ps)) allStarts.push(ps);
          if (!Number.isNaN(pe)) allEnds.push(pe);
          if (ws.actualStart) {
            const as = parseDateUTC(ws.actualStart);
            if (!Number.isNaN(as)) allStarts.push(as);
          }
          if (ws.actualEnd) {
            const ae = parseDateUTC(ws.actualEnd);
            if (!Number.isNaN(ae)) allEnds.push(ae);
          }
        });
      } else {
        const bounds = getStageDateBounds(stage);
        const ps = parseDateUTC(bounds.startDate);
        const pe = parseDateUTC(bounds.endDate);
        if (!Number.isNaN(ps)) allStarts.push(ps);
        if (!Number.isNaN(pe)) allEnds.push(pe);
      }
    });

    if (allStarts.length === 0 || allEnds.length === 0) {
      return null;
    }

    const minStart = Math.min(...allStarts);
    const maxEndRaw = Math.max(...allEnds, minStart);
    const maxEnd = maxEndRaw + DAY_MS;
    const totalSpan = Math.max(DAY_MS, maxEnd - minStart);
    const totalDays = Math.max(1, Math.round(totalSpan / DAY_MS));

    const today = getTodayUTC();
    const todayInRange = today >= minStart && today <= maxEnd;
    const todayPercent = todayInRange
      ? ((today - minStart) / totalSpan) * 100
      : null;

    // Generate scale ticks for 'day' or 'week'
    const stepDays =
      scale === 'day'
        ? totalDays > 45
          ? 2
          : 1
        : Math.max(5, Math.round(totalDays / 6));

    const ticks: Array<{ label: string; percent: number }> = [];
    for (let d = 0; d <= totalDays; d += stepDays) {
      const ms = minStart + d * DAY_MS;
      const pct = Math.min(100, (d / totalDays) * 100);
      const dt = new Date(ms);
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      ticks.push({
        label: scale === 'day' && stepDays === 1 ? dd : `${dd}.${mm}`,
        percent: pct,
      });
    }
    // Always ensure final end tick in week mode if distant
    if (scale === 'week' && ticks[ticks.length - 1]?.percent < 92) {
      const dt = new Date(maxEndRaw);
      ticks.push({
        label: `${String(dt.getUTCDate()).padStart(2, '0')}.${String(
          dt.getUTCMonth() + 1
        ).padStart(2, '0')}`,
        percent: 100,
      });
    }

    const groups = stages.map((stage) => {
      const completionPct = getStageCompletionPercent(stage);
      const bounds = getStageDateBounds(stage);
      const paymentEndMs = parseDateUTC(bounds.endDate);
      const milestonePct = !Number.isNaN(paymentEndMs)
        ? Math.min(100, Math.max(0, ((paymentEndMs + DAY_MS - minStart) / totalSpan) * 100))
        : null;

      const workItems =
        stage.workStages && stage.workStages.length > 0
          ? stage.workStages
          : [
              {
                id: `${stage.id}-fallback`,
                title: stage.name,
                assignee: 'Команда',
                plannedStart: bounds.startDate,
                plannedEnd: bounds.endDate,
                progress: completionPct,
                clientApproval: stage.clientApproval,
              },
            ];

      const rows = workItems
        .map((ws) => {
          const ps = parseDateUTC(ws.plannedStart);
          const pe = parseDateUTC(ws.plannedEnd);
          if (Number.isNaN(ps) || Number.isNaN(pe)) return null;

          const clampedPlannedEnd = Math.max(ps, pe) + DAY_MS;
          const leftPct = ((ps - minStart) / totalSpan) * 100;
          const widthPct = Math.max(
            3,
            ((clampedPlannedEnd - ps) / totalSpan) * 100
          );
          const durationDays = Math.max(
            1,
            Math.round((clampedPlannedEnd - ps) / DAY_MS)
          );

          // Actual dates overlay if specified
          let actualLeftPct: number | null = null;
          let actualWidthPct: number | null = null;
          if (ws.actualStart) {
            const as = parseDateUTC(ws.actualStart);
            const ae = ws.actualEnd
              ? parseDateUTC(ws.actualEnd)
              : ws.progress === 100
                ? pe
                : Math.min(pe, Math.max(as, today));
            if (!Number.isNaN(as) && !Number.isNaN(ae)) {
              const clampedActualEnd = Math.max(as, ae) + DAY_MS;
              actualLeftPct = Math.max(0, ((as - minStart) / totalSpan) * 100);
              actualWidthPct = Math.max(
                2,
                ((clampedActualEnd - as) / totalSpan) * 100
              );
            }
          }

          return {
            ws,
            leftPct,
            widthPct,
            actualLeftPct,
            actualWidthPct,
            durationDays,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      return {
        stage,
        completionPct,
        milestonePct,
        rows,
      };
    });

    return {
      totalDays,
      todayPercent,
      ticks,
      groups,
    };
  }, [stages, scale]);

  return (
    <section className="bg-white border border-[#E6DFD5] rounded-xl p-6 print-break-avoid">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-serif-display text-2xl font-bold text-[#1F1D1A]">
            График проектирования — Диаграмма Ганта
          </h2>
          <p className="text-xs text-[#7A736A] mt-0.5">
            Выполнение этапов работ с плановыми сроками, фактическим прогрессом и этапами оплаты
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 shrink-0">
          {/* Scale Toggle: День / Неделя */}
          <div
            className="no-print inline-flex items-center p-1 bg-[#FAF8F5] border border-[#E6DFD5] rounded-lg"
            role="group"
            aria-label="Масштаб диаграммы Ганта"
          >
            <button
              type="button"
              onClick={() => setScale('day')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                scale === 'day'
                  ? 'bg-[#1F1D1A] text-[#FAF8F5]'
                  : 'text-[#6B655D] hover:text-[#1F1D1A]'
              }`}
            >
              День
            </button>
            <button
              type="button"
              onClick={() => setScale('week')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                scale === 'week'
                  ? 'bg-[#1F1D1A] text-[#FAF8F5]'
                  : 'text-[#6B655D] hover:text-[#1F1D1A]'
              }`}
            >
              Неделя
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 text-xs text-[#6B655D]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#EFEAE2] border border-[#D4CBC0] inline-block" />
              <span>План</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#B8956A] inline-block" />
              <span>В работе</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-[#4E735D] inline-block" />
              <span>100%</span>
            </span>
            {timeline?.todayPercent !== null && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-0.5 h-3.5 bg-[#C46D5E] inline-block" />
                <span className="text-[#C46D5E] font-medium">Сегодня</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {!timeline ? (
        <div className="py-10 text-center text-sm text-[#7A736A] border border-dashed border-[#E6DFD5] rounded-lg">
          <Calendar className="w-6 h-6 mx-auto mb-2 text-[#B8956A]" />
          Добавьте этапы с корректными датами для отображения диаграммы Ганта.
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className={scale === 'day' ? 'min-w-[1040px]' : 'min-w-[720px]'}>
            {/* Timeline Axis Header */}
            <div className="grid grid-cols-[260px_1fr] gap-4 pb-3 border-b border-[#E6DFD5]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#7A736A]">
                Этап оплаты / Задача
              </div>
              <div className="relative h-5">
                {timeline.ticks.map((tick, idx) => (
                  <span
                    key={`${tick.label}-${idx}`}
                    style={{
                      left: `${tick.percent}%`,
                      transform:
                        idx === 0
                          ? 'translateX(0%)'
                          : idx === timeline.ticks.length - 1
                            ? 'translateX(-100%)'
                            : 'translateX(-50%)',
                    }}
                    className="absolute top-0 text-[11px] font-medium text-[#7A736A] tabular-nums"
                  >
                    {tick.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Grouped Payment Stages -> Child Work Stages */}
            <div className="divide-y divide-[#E6DFD5]">
              {timeline.groups.map(({ stage, completionPct, milestonePct, rows }) => (
                <div key={stage.id} className="divide-y divide-[#E6DFD5]/50">
                  {/* Payment Stage Group Header */}
                  <div className="grid grid-cols-[260px_1fr] gap-4 items-center py-2.5 px-2 bg-[#FAF8F5]">
                    <div className="flex items-center gap-2 min-w-0">
                      {stage.paid ? (
                        <CheckCircle2 className="w-4 h-4 text-[#4E735D] shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-[#C46D5E] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#1F1D1A] truncate">
                          {stage.name}
                        </div>
                        <div className="text-[11px] text-[#7A736A] tabular-nums">
                          {formatNumber(stage.amount)} {currency} ·{' '}
                          <span
                            className={
                              stage.paid
                                ? 'text-[#4E735D] font-medium'
                                : 'text-[#C46D5E] font-medium'
                            }
                          >
                            {stage.paid ? 'Оплачено' : 'Ожидается'}
                          </span>{' '}
                          · {completionPct}%
                        </div>
                      </div>
                    </div>

                    <div className="relative h-5 flex items-center">
                      <div className="w-full h-px bg-[#E6DFD5]" />
                      {timeline.todayPercent !== null && (
                        <div
                          style={{ left: `${timeline.todayPercent}%` }}
                          className="absolute -top-2 -bottom-2 w-[2px] bg-[#C46D5E] z-10 pointer-events-none"
                        />
                      )}
                      {milestonePct !== null && (
                        <div
                          style={{ left: `${milestonePct}%` }}
                          className={`absolute -translate-x-1/2 w-2.5 h-2.5 rotate-45 border ${
                            stage.paid
                              ? 'bg-[#4E735D] border-[#4E735D]'
                              : 'bg-white border-[#C46D5E]'
                          }`}
                          title={`Рубеж оплаты: ${stage.name}`}
                        />
                      )}
                    </div>
                  </div>

                  {/* Work Stages Execution Rows */}
                  {rows.map(
                    ({
                      ws,
                      leftPct,
                      widthPct,
                      actualLeftPct,
                      actualWidthPct,
                      durationDays,
                    }) => {
                      const isHovered = hoveredWorkId === ws.id;
                      const progressClamped = Math.min(
                        100,
                        Math.max(0, ws.progress)
                      );
                      const fillColor =
                        progressClamped === 100 ? '#4E735D' : '#B8956A';
                      const dateLabel = `${formatShortDate(ws.plannedStart)} – ${formatShortDate(ws.plannedEnd)}`;
                      const showInside = widthPct >= 16;

                      return (
                        <div
                          key={ws.id}
                          onMouseEnter={() => setHoveredWorkId(ws.id)}
                          onMouseLeave={() => setHoveredWorkId(null)}
                          className="grid grid-cols-[260px_1fr] gap-4 items-center py-3 pl-4 pr-2 hover:bg-[#FAF8F5]/60 transition-colors"
                        >
                          {/* Work Stage Label */}
                          <div className="min-w-0 pr-2 space-y-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-medium text-[#1F1D1A] truncate">
                                {ws.title}
                              </span>
                              {ws.clientApproval && (
                                <span
                                  title="Согласование с заказчиком"
                                  className="inline-flex shrink-0"
                                >
                                  <UserCheck className="w-3.5 h-3.5 text-[#B8956A]" />
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#7A736A] tabular-nums truncate">
                              {ws.assignee} · {progressClamped}% · {durationDays} дн.
                            </div>
                          </div>

                          {/* Timeline Track */}
                          <div className="relative h-8 bg-[#FAF8F5] border border-[#E6DFD5]/70 rounded-lg">
                            {/* Grid ticks */}
                            {timeline.ticks.map((t, i) =>
                              i > 0 && i < timeline.ticks.length - 1 ? (
                                <div
                                  key={i}
                                  style={{ left: `${t.percent}%` }}
                                  className="absolute top-0 bottom-0 w-px bg-[#E6DFD5]/60 pointer-events-none"
                                />
                              ) : null
                            )}

                            {/* Today marker */}
                            {timeline.todayPercent !== null && (
                              <div
                                style={{ left: `${timeline.todayPercent}%` }}
                                className="absolute -top-1 -bottom-1 w-[2px] bg-[#C46D5E] z-10 pointer-events-none"
                              />
                            )}

                            {/* Planned Span Container + Progress Fill */}
                            <div
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                              }}
                              className="absolute top-1.5 bottom-1.5 rounded-md bg-[#EFEAE2] border border-[#D4CBC0] overflow-hidden flex items-center"
                            >
                              <div
                                style={{
                                  width: `${progressClamped}%`,
                                  backgroundColor: fillColor,
                                }}
                                className="h-full transition-all duration-300"
                              />
                              {showInside && (
                                <span
                                  className={`absolute inset-x-2 text-[11px] font-semibold tabular-nums whitespace-nowrap truncate ${
                                    progressClamped >= 55
                                      ? 'text-white'
                                      : 'text-[#1F1D1A]'
                                  }`}
                                >
                                  {dateLabel} · {progressClamped}%
                                </span>
                              )}
                            </div>

                            {/* Optional Actual Dates Thin Indicator Line */}
                            {actualLeftPct !== null &&
                              actualWidthPct !== null && (
                                <div
                                  style={{
                                    left: `${actualLeftPct}%`,
                                    width: `${actualWidthPct}%`,
                                  }}
                                  className="absolute bottom-0.5 h-[2px] bg-[#1F1D1A]/60 rounded-full pointer-events-none"
                                  title="Фактический период выполнения"
                                />
                              )}

                            {!showInside && (
                              <span
                                style={{
                                  left:
                                    leftPct > 72
                                      ? undefined
                                      : `${Math.min(96, leftPct + widthPct + 1)}%`,
                                  right:
                                    leftPct > 72
                                      ? `${Math.max(2, 100 - leftPct + 1)}%`
                                      : undefined,
                                }}
                                className="absolute top-1/2 -translate-y-1/2 text-[11px] font-medium text-[#4A453E] tabular-nums whitespace-nowrap"
                              >
                                {dateLabel} ({progressClamped}%)
                              </span>
                            )}

                            {/* Hover Tooltip */}
                            {isHovered && (
                              <div
                                style={{
                                  left: `${Math.min(
                                    70,
                                    Math.max(12, leftPct + widthPct / 2)
                                  )}%`,
                                }}
                                className="absolute -top-11 -translate-x-1/2 z-20 bg-[#1F1D1A] text-[#FAF8F5] text-[11px] px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap pointer-events-none tabular-nums"
                              >
                                <span className="font-semibold">{ws.title}</span>
                                <span className="mx-1.5 text-[#B8956A]">·</span>
                                <span>{ws.assignee}</span>
                                <span className="mx-1.5 text-[#B8956A]">·</span>
                                <span>План: {dateLabel}</span>
                                {(ws.actualStart || ws.actualEnd) && (
                                  <>
                                    <span className="mx-1.5 text-[#B8956A]">
                                      ·
                                    </span>
                                    <span>
                                      Факт:{' '}
                                      {ws.actualStart
                                        ? formatShortDate(ws.actualStart)
                                        : '…'}{' '}
                                      –{' '}
                                      {ws.actualEnd
                                        ? formatShortDate(ws.actualEnd)
                                        : 'в работе'}
                                    </span>
                                  </>
                                )}
                                <span className="mx-1.5 text-[#B8956A]">·</span>
                                <span>{progressClamped}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Today Label Row */}
            {timeline.todayPercent !== null && (
              <div className="grid grid-cols-[260px_1fr] gap-4 pt-2">
                <div />
                <div className="relative h-5">
                  <span
                    style={{ left: `${timeline.todayPercent}%` }}
                    className="absolute top-0 -translate-x-1/2 text-[11px] font-semibold text-[#C46D5E] bg-[#FAF0EE] border border-[#C46D5E]/30 px-2 py-0.5 rounded whitespace-nowrap"
                  >
                    Сегодня
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
