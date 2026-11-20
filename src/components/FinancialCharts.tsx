import React, { useMemo, useState } from 'react';
import { TeamExpense } from '../types/dashboard';
import { formatNumber } from '../data/defaultData';

interface FinancialChartsProps {
  currency: string;
  totalBudget: number;
  paidBudget: number;
  totalTeamCost: number;
  paidTeamAmount: number;
  team: TeamExpense[];
}

const DONUT_PALETTE = [
  '#1F1D1A', // Deep Graphite
  '#B8956A', // Brushed Brass
  '#4E735D', // Muted Sage
  '#C46D5E', // Soft Terracotta
  '#8C847A', // Warm Taupe
  '#D4B48C', // Champagne Gold
  '#6E8C7A', // Light Sage
];

export const FinancialCharts: React.FC<FinancialChartsProps> = ({
  currency,
  totalBudget,
  paidBudget,
  totalTeamCost,
  paidTeamAmount,
  team,
}) => {
  const [hoveredRoleIdx, setHoveredRoleIdx] = useState<number | null>(null);
  const [hoveredBar, setHoveredBar] = useState<'income' | 'expense' | null>(null);
  const [hoveredCompId, setHoveredCompId] = useState<string | null>(null);

  const incomePercent = totalBudget > 0 ? Math.min(100, (paidBudget / totalBudget) * 100) : 0;
  const expensePercent = totalTeamCost > 0 ? Math.min(100, (paidTeamAmount / totalTeamCost) * 100) : 0;
  const projectMargin = totalBudget - totalTeamCost;
  const unpaidBudget = Math.max(0, totalBudget - paidBudget);
  const remainingTeamPay = Math.max(0, totalTeamCost - paidTeamAmount);

  // SVG Donut segments
  const donutSegments = useMemo(() => {
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    let cumulativeFraction = 0;

    return team.map((item, idx) => {
      const share = totalTeamCost > 0 ? item.totalCost / totalTeamCost : 0;
      const pct = share * 100;
      const dashLength = share * circumference;
      const dashOffset = -cumulativeFraction * circumference;
      cumulativeFraction += share;

      return {
        ...item,
        sharePct: pct,
        color: DONUT_PALETTE[idx % DONUT_PALETTE.length],
        dashArray: `${dashLength} ${circumference}`,
        dashOffset,
        radius,
      };
    });
  }, [team, totalTeamCost]);

  // Grouped comparison bars (Total Share % vs Remaining Unpaid Share % relative to totalTeamCost)
  const comparisonRows = useMemo(() => {
    const rows = team.map((item) => {
      const remaining = Math.max(0, item.totalCost - item.paidAmount);
      const totalSharePct = totalTeamCost > 0 ? (item.totalCost / totalTeamCost) * 100 : 0;
      const remainingSharePct = totalTeamCost > 0 ? (remaining / totalTeamCost) * 100 : 0;
      return {
        id: item.id,
        role: item.role,
        totalCost: item.totalCost,
        paidAmount: item.paidAmount,
        totalSharePct,
        remainingSharePct,
        remaining,
      };
    });

    const maxPct = Math.max(
      35,
      ...rows.map((r) => Math.max(r.totalSharePct, r.remainingSharePct))
    );

    return { rows, maxPct };
  }, [team, totalTeamCost]);

  const activeDonutItem =
    hoveredRoleIdx !== null ? donutSegments[hoveredRoleIdx] : null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-serif-display text-2xl font-bold text-[#1F1D1A]">
          Финансовая аналитика
        </h2>
        <p className="text-xs text-[#7A736A] mt-0.5">
          Баланс поступлений, структура расходов команды и доля остатков
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: Доходы и расходы */}
        <div className="bg-white border border-[#E6DFD5] rounded-xl p-6 flex flex-col justify-between gap-6">
          <div>
            <h3 className="text-base font-semibold text-[#1F1D1A]">
              Доходы и расходы
            </h3>
            <p className="text-xs text-[#7A736A] mt-0.5">
              Фактические оплаты к плановому бюджету
            </p>
          </div>

          <div className="space-y-6">
            {/* Income Bar */}
            <div
              className="relative space-y-2"
              onMouseEnter={() => setHoveredBar('income')}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {hoveredBar === 'income' && (
                <div className="absolute -top-10 right-0 z-20 bg-[#1F1D1A] text-[#FAF8F5] text-[11px] px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap pointer-events-none tabular-nums">
                  Оплачено: {formatNumber(paidBudget)} {currency} · Остаток:{' '}
                  {formatNumber(unpaidBudget)} {currency} ({incomePercent.toFixed(1)}%)
                </div>
              )}
              <div className="flex items-baseline justify-between text-xs gap-2">
                <span className="font-medium text-[#1F1D1A]">
                  Поступления по этапам
                </span>
                <span className="font-semibold text-[#4E735D] tabular-nums whitespace-nowrap">
                  {formatNumber(paidBudget)} / {formatNumber(totalBudget)} {currency}
                </span>
              </div>
              <div className="h-3.5 w-full bg-[#F3EFE9] rounded-md overflow-hidden cursor-default">
                <div
                  className="h-full bg-[#4E735D] rounded-md transition-all duration-300"
                  style={{ width: `${incomePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#7A736A] tabular-nums">
                <span>Исполнение бюджета</span>
                <span>{incomePercent.toFixed(1)}%</span>
              </div>
            </div>

            {/* Expense Bar */}
            <div
              className="relative space-y-2"
              onMouseEnter={() => setHoveredBar('expense')}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {hoveredBar === 'expense' && (
                <div className="absolute -top-10 right-0 z-20 bg-[#1F1D1A] text-[#FAF8F5] text-[11px] px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap pointer-events-none tabular-nums">
                  Выплачено: {formatNumber(paidTeamAmount)} {currency} · Осталось:{' '}
                  {formatNumber(remainingTeamPay)} {currency} ({expensePercent.toFixed(1)}%)
                </div>
              )}
              <div className="flex items-baseline justify-between text-xs gap-2">
                <span className="font-medium text-[#1F1D1A]">
                  Выплаты команде
                </span>
                <span className="font-semibold text-[#B8956A] tabular-nums whitespace-nowrap">
                  {formatNumber(paidTeamAmount)} / {formatNumber(totalTeamCost)} {currency}
                </span>
              </div>
              <div className="h-3.5 w-full bg-[#F3EFE9] rounded-md overflow-hidden cursor-default">
                <div
                  className="h-full bg-[#B8956A] rounded-md transition-all duration-300"
                  style={{ width: `${expensePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#7A736A] tabular-nums">
                <span>Оплачено подрядчикам</span>
                <span>{expensePercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Margin Summary */}
          <div className="pt-4 border-t border-[#E6DFD5] flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#6B655D]">
              Расчётная маржа проекта:
            </span>
            <span
              className={`text-sm font-bold tabular-nums whitespace-nowrap ${
                projectMargin >= 0 ? 'text-[#4E735D]' : 'text-[#C46D5E]'
              }`}
            >
              {projectMargin > 0 ? '+' : ''}
              {formatNumber(projectMargin)} {currency}
            </span>
          </div>
        </div>

        {/* Chart 2: Общие затраты (Custom SVG Donut) */}
        <div className="bg-white border border-[#E6DFD5] rounded-xl p-6 flex flex-col justify-between gap-5">
          <div>
            <h3 className="text-base font-semibold text-[#1F1D1A]">
              Общие затраты
            </h3>
            <p className="text-xs text-[#7A736A] mt-0.5">
              Доля каждой статьи в расходах команды
            </p>
          </div>

          <div className="relative flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-5">
            {activeDonutItem && (
              <div className="absolute -top-10 left-0 right-0 sm:right-auto z-20 bg-[#1F1D1A] text-[#FAF8F5] text-[11px] px-3 py-1.5 rounded-lg shadow-md sm:whitespace-nowrap pointer-events-none tabular-nums">
                <span className="font-semibold">{activeDonutItem.role}:</span>{' '}
                {formatNumber(activeDonutItem.totalCost)} {currency} (
                {activeDonutItem.sharePct.toFixed(2)}%) · Оплачено:{' '}
                {formatNumber(activeDonutItem.paidAmount)} {currency}
              </div>
            )}

            <div className="relative w-[156px] h-[156px] shrink-0">
              <svg
                viewBox="0 0 150 150"
                className="w-full h-full -rotate-90"
                role="img"
                aria-label="Диаграмма распределения общих затрат"
              >
                <circle
                  cx="75"
                  cy="75"
                  r="56"
                  fill="none"
                  stroke="#F3EFE9"
                  strokeWidth="22"
                />
                {donutSegments.map((seg, idx) => (
                  <circle
                    key={seg.id}
                    cx="75"
                    cy="75"
                    r={seg.radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={hoveredRoleIdx === idx ? '25' : '22'}
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredRoleIdx(idx)}
                    onMouseLeave={() => setHoveredRoleIdx(null)}
                  />
                ))}
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                {activeDonutItem ? (
                  <>
                    <span className="text-[11px] font-medium text-[#7A736A] truncate max-w-[90px]">
                      {activeDonutItem.role}
                    </span>
                    <span className="text-base font-bold text-[#1F1D1A] tabular-nums">
                      {formatNumber(activeDonutItem.totalCost)} {currency}
                    </span>
                    <span className="text-[10px] font-semibold text-[#B8956A] tabular-nums">
                      {activeDonutItem.sharePct.toFixed(2)}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] text-[#7A736A]">Всего</span>
                    <span className="text-base font-bold text-[#1F1D1A] tabular-nums">
                      {formatNumber(totalTeamCost)}
                    </span>
                    <span className="text-[10px] text-[#7A736A]">{currency}</span>
                  </>
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="w-full space-y-2 min-w-0">
              {donutSegments.map((seg, idx) => (
                <div
                  key={seg.id}
                  onMouseEnter={() => setHoveredRoleIdx(idx)}
                  onMouseLeave={() => setHoveredRoleIdx(null)}
                  className={`flex items-center justify-between gap-2 text-xs px-2 py-1 rounded transition-colors cursor-default ${
                    hoveredRoleIdx === idx ? 'bg-[#FAF8F5]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-[#1F1D1A] truncate">{seg.role}</span>
                  </div>
                  <span className="font-semibold text-[#4A453E] tabular-nums shrink-0">
                    {formatNumber(seg.totalCost)} {currency} · {seg.sharePct.toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 3: Затраты vs Осталось */}
        <div className="bg-white border border-[#E6DFD5] rounded-xl p-6 flex flex-col justify-between gap-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[#1F1D1A]">
                Затраты vs Осталось
              </h3>
              <p className="text-xs text-[#7A736A] mt-0.5">
                Доля статьи и остаток от общего бюджета команды
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {comparisonRows.rows.map((row) => {
              const totalWidth = Math.min(
                100,
                (row.totalSharePct / comparisonRows.maxPct) * 100
              );
              const remainWidth = Math.min(
                100,
                (row.remainingSharePct / comparisonRows.maxPct) * 100
              );
              const isRowHovered = hoveredCompId === row.id;

              return (
                <div
                  key={row.id}
                  onMouseEnter={() => setHoveredCompId(row.id)}
                  onMouseLeave={() => setHoveredCompId(null)}
                  className="relative space-y-1 rounded-md transition-colors"
                >
                  {isRowHovered && (
                    <div className="absolute -top-10 left-0 sm:left-auto right-0 z-20 bg-[#1F1D1A] text-[#FAF8F5] text-[11px] px-3 py-1.5 rounded-lg shadow-md sm:whitespace-nowrap pointer-events-none tabular-nums">
                      Затраты: {formatNumber(row.totalCost)} {currency} · Оплачено:{' '}
                      {formatNumber(row.paidAmount)} {currency} · Остаток:{' '}
                      {formatNumber(row.remaining)} {currency}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[#1F1D1A] truncate">
                      {row.role}
                    </span>
                    <div className="flex items-center gap-2 tabular-nums shrink-0 text-[11px]">
                      <span className="text-[#8C6D46] font-medium">
                        {row.totalSharePct.toFixed(2)}%
                      </span>
                      <span className="text-[#D4CBC0]">/</span>
                      <span
                        className={`font-semibold ${
                          row.remainingSharePct > 0
                            ? 'text-[#C46D5E]'
                            : 'text-[#4E735D]'
                        }`}
                      >
                        {row.remainingSharePct.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Two grouped bars */}
                  <div className="space-y-1 cursor-default">
                    <div className="h-2 w-full bg-[#F3EFE9] rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-[#B8956A] rounded-sm transition-all duration-300"
                        style={{ width: `${totalWidth}%` }}
                      />
                    </div>
                    <div className="h-2 w-full bg-[#F3EFE9] rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-[#C46D5E] rounded-sm transition-all duration-300"
                        style={{ width: `${remainWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#E6DFD5] flex items-center gap-5 text-[11px] text-[#6B655D]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#B8956A]" />
              <span>Доля затрат (%)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#C46D5E]" />
              <span>Осталось (%)</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
