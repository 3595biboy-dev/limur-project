import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock } from 'lucide-react';
import { ProjectStage } from '../types/dashboard';
import { formatNumber, formatShortDate } from '../data/defaultData';

interface GanttChartProps {
  stages: ProjectStage[];
  currency: string;
}

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
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const timeline = useMemo(() => {
    const valid = stages
      .map((s) => ({
        stage: s,
        start: parseDateUTC(s.startDate),
        end: parseDateUTC(s.endDate),
      }))
      .filter((item) => !Number.isNaN(item.start) && !Number.isNaN(item.end));

    if (valid.length === 0) {
      return null;
    }

    const minStart = Math.min(...valid.map((v) => v.start));
    const maxEndRaw = Math.max(...valid.map((v) => Math.max(v.start, v.end)));
    // Add 1 day inclusive span so end dates occupy full day column
    const maxEnd = maxEndRaw + DAY_MS;
    const totalSpan = Math.max(DAY_MS, maxEnd - minStart);

    const today = getTodayUTC();
    const todayInRange = today >= minStart && today <= maxEnd;
    const todayPercent = todayInRange
      ? ((today - minStart) / totalSpan) * 100
      : null;

    // Generate 5 evenly spaced axis tick dates
    const ticks = Array.from({ length: 5 }, (_, idx) => {
      const ratio = idx / 4;
      const ms = minStart + totalSpan * ratio;
      const dt = new Date(ms);
      const dd = String(dt.getUTCDate()).padStart(2, '0');
      const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
      return {
        label: `${dd}.${mm}`,
        percent: ratio * 100,
      };
    });

    const rows = valid.map(({ stage, start, end }) => {
      const clampedEnd = Math.max(start, end) + DAY_MS;
      const leftPct = ((start - minStart) / totalSpan) * 100;
      const widthPct = Math.max(4, ((clampedEnd - start) / totalSpan) * 100);
      const durationDays = Math.max(1, Math.round((clampedEnd - start) / DAY_MS));
      return {
        stage,
        leftPct,
        widthPct,
        durationDays,
      };
    });

    return {
      minStart,
      maxEnd: maxEndRaw,
      todayPercent,
      ticks,
      rows,
    };
  }, [stages]);

  return (
    <section className="bg-white border border-[#E6DFD5] rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-serif-display text-2xl font-bold text-[#1F1D1A]">
            График проектирования — Диаграмма Ганта
          </h2>
          <p className="text-xs text-[#7A736A] mt-0.5">
            Календарное распределение этапов с контролем текущей даты
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#6B655D] shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#4E735D] inline-block" />
            <span>Оплачено</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#B8956A] inline-block" />
            <span>В ожидании</span>
          </span>
          {timeline?.todayPercent !== null && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-0.5 h-3.5 bg-[#C46D5E] inline-block" />
              <span className="text-[#C46D5E] font-medium">Сегодня</span>
            </span>
          )}
        </div>
      </div>

      {!timeline ? (
        <div className="py-10 text-center text-sm text-[#7A736A] border border-dashed border-[#E6DFD5] rounded-lg">
          <Calendar className="w-6 h-6 mx-auto mb-2 text-[#B8956A]" />
          Добавьте этапы с корректными датами для отображения диаграммы Ганта.
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[680px]">
            {/* Timeline Axis Header */}
            <div className="grid grid-cols-[220px_1fr] gap-4 pb-3 border-b border-[#E6DFD5]">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#7A736A]">
                Этап
              </div>
              <div className="relative h-5">
                {timeline.ticks.map((tick, idx) => (
                  <span
                    key={idx}
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

            {/* Gantt Rows */}
            <div className="relative divide-y divide-[#E6DFD5]/60">
              {timeline.rows.map(({ stage, leftPct, widthPct, durationDays }) => {
                const isHovered = hoveredId === stage.id;
                const barColor = stage.paid ? '#4E735D' : '#B8956A';
                const dateLabel = `${formatShortDate(stage.startDate)} – ${formatShortDate(stage.endDate)}`;
                const showInside = widthPct >= 18;

                return (
                  <div
                    key={stage.id}
                    onMouseEnter={() => setHoveredId(stage.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="grid grid-cols-[220px_1fr] gap-4 items-center py-3.5 hover:bg-[#FAF8F5]/70 transition-colors"
                  >
                    {/* Stage Label */}
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {stage.paid ? (
                        <CheckCircle2 className="w-4 h-4 text-[#4E735D] shrink-0" />
                      ) : (
                        <Clock className="w-4 h-4 text-[#B8956A] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#1F1D1A] truncate">
                          {stage.name}
                        </div>
                        <div className="text-[11px] text-[#7A736A] tabular-nums">
                          {formatNumber(stage.amount)} {currency} · {durationDays} дн.
                        </div>
                      </div>
                    </div>

                    {/* Timeline Track */}
                    <div className="relative h-9 bg-[#FAF8F5] border border-[#E6DFD5]/70 rounded-lg">
                      {/* Vertical grid ticks */}
                      {[25, 50, 75].map((pct) => (
                        <div
                          key={pct}
                          style={{ left: `${pct}%` }}
                          className="absolute top-0 bottom-0 w-px bg-[#E6DFD5]/60 pointer-events-none"
                        />
                      ))}

                      {/* Today marker */}
                      {timeline.todayPercent !== null && (
                        <div
                          style={{ left: `${timeline.todayPercent}%` }}
                          className="absolute -top-1 -bottom-1 w-[2px] bg-[#C46D5E] z-10 pointer-events-none"
                        />
                      )}

                      {/* Stage Bar */}
                      <div
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          backgroundColor: barColor,
                        }}
                        className="absolute top-1.5 bottom-1.5 rounded-md flex items-center px-2.5 transition-opacity shadow-xs"
                      >
                        {showInside && (
                          <span className="text-[11px] font-semibold text-white tabular-nums whitespace-nowrap truncate">
                            {dateLabel}
                          </span>
                        )}
                      </div>

                      {!showInside && (
                        <span
                          style={{
                            left: leftPct > 75 ? undefined : `${Math.min(96, leftPct + widthPct + 1)}%`,
                            right: leftPct > 75 ? `${Math.max(2, 100 - leftPct + 1)}%` : undefined,
                          }}
                          className="absolute top-1/2 -translate-y-1/2 text-[11px] font-medium text-[#4A453E] tabular-nums whitespace-nowrap"
                        >
                          {dateLabel}
                        </span>
                      )}

                      {/* Hover Tooltip */}
                      {isHovered && (
                        <div
                          style={{
                            left: `${Math.min(72, Math.max(8, leftPct + widthPct / 2))}%`,
                          }}
                          className="absolute -top-11 -translate-x-1/2 z-20 bg-[#1F1D1A] text-[#FAF8F5] text-[11px] px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap pointer-events-none"
                        >
                          <span className="font-semibold">{stage.name}</span>
                          <span className="mx-1.5 text-[#B8956A]">·</span>
                          <span className="tabular-nums">{dateLabel}</span>
                          <span className="mx-1.5 text-[#B8956A]">·</span>
                          <span>{stage.paid ? 'Оплачено' : 'Ожидается'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Today Label Row */}
            {timeline.todayPercent !== null && (
              <div className="grid grid-cols-[220px_1fr] gap-4 pt-2">
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
