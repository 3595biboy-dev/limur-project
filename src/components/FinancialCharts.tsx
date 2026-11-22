import React, { useMemo, useState } from 'react';
import { ProjectStage, TeamExpense } from '../types/dashboard';
import { formatNumber, getStageExpensesBreakdown } from '../data/defaultData';

interface FinancialChartsProps {
  currency: string;
  totalBudget: number;
  paidBudget: number;
  projectExpensesTotal: number;
  projectExpensesPaid: number;
  salaryExpensesTotal: number;
  salaryExpensesPaid: number;
  stages: ProjectStage[];
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
  projectExpensesTotal,
  projectExpensesPaid,
  salaryExpensesTotal,
  salaryExpensesPaid,
  stages,
  team,
}) => {
  const [hoveredOverallIdx, setHoveredOverallIdx] = useState<number | null>(null);
  const [hoveredStageIdx, setHoveredStageIdx] = useState<number | null>(null);
  const [hoveredRoleIdx, setHoveredRoleIdx] = useState<number | null>(null);

  const totalAllExpenses = projectExpensesTotal + salaryExpensesTotal;
  const totalTeamCost = team.reduce((sum, m) => sum + m.totalCost, 0);
  const netMargin = totalBudget - totalAllExpenses;
  const isNegativeMargin = netMargin < 0;

  // 1. Single Overall Project Chart Data
  const overallMetrics = useMemo(() => {
    const maxVal = Math.max(
      1,
      totalBudget,
      projectExpensesTotal,
      salaryExpensesTotal,
      Math.abs(netMargin)
    );

    return {
      maxVal,
      rows: [
        {
          id: 'income',
          label: 'Доход проекта',
          total: totalBudget,
          paid: paidBudget,
          subLabel: `Получено: ${formatNumber(paidBudget)} ${currency}`,
          color: '#4E735D',
          trackColor: '#EEF3F0',
        },
        {
          id: 'project-exp',
          label: 'Расходы (этапы и подряд)',
          total: projectExpensesTotal,
          paid: projectExpensesPaid,
          subLabel: `Оплачено: ${formatNumber(projectExpensesPaid)} ${currency}`,
          color: '#B8956A',
          trackColor: '#F3EFE9',
        },
        {
          id: 'salary-exp',
          label: 'Выплаты на ЗП (Оклад)',
          total: salaryExpensesTotal,
          paid: salaryExpensesPaid,
          subLabel: `Выплачено: ${formatNumber(salaryExpensesPaid)} ${currency}`,
          color: '#1F1D1A',
          trackColor: '#ECE9E4',
        },
        {
          id: 'margin',
          label: 'Чистая маржа проекта',
          total: Math.abs(netMargin),
          rawMargin: netMargin,
          paid: Math.abs(netMargin),
          subLabel:
            netMargin >= 0
              ? `Рентабельность: ${
                  totalBudget > 0
                    ? ((netMargin / totalBudget) * 100).toFixed(1)
                    : '0.0'
                }%`
              : 'Дефицит бюджета',
          color: isNegativeMargin ? '#C46D5E' : '#4E735D',
          trackColor: isNegativeMargin ? '#FAF0EE' : '#EEF3F0',
        },
      ],
    };
  }, [
    totalBudget,
    paidBudget,
    projectExpensesTotal,
    projectExpensesPaid,
    salaryExpensesTotal,
    salaryExpensesPaid,
    netMargin,
    isNegativeMargin,
    currency,
  ]);

  // 2. Per-Stage Income vs Expense Chart Data
  const stageBars = useMemo(() => {
    const items = stages.map((st) => {
      const exp = getStageExpensesBreakdown(st, team);
      const surplus = st.amount - exp.totalExpenses;
      return {
        id: st.id,
        name: st.name,
        income: st.amount,
        paidIncome: st.paid ? st.amount : 0,
        expenses: exp.totalExpenses,
        paidExpenses: exp.paidExpenses,
        surplus,
        paid: st.paid,
      };
    });

    const maxStageVal = Math.max(
      1,
      ...items.map((i) => Math.max(i.income, i.expenses))
    );

    return { items, maxStageVal };
  }, [stages, team]);

  // 3. Team Donut Data
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

  const activeDonutItem =
    hoveredRoleIdx !== null ? donutSegments[hoveredRoleIdx] : null;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="font-serif-display text-2xl font-bold text-[#1F1D1A]">
          Финансовая аналитика
        </h2>
        <p className="text-xs text-[#7A736A] mt-0.5">
          Общая экономика проекта, баланс доходов и расходов по этапам и структура команды
        </p>
      </div>

      {/* Top Row: Single Overall Project Chart + Per-Stage Income vs Expense Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Single Overall Project Chart */}
        <div className="bg-white border border-[#E6DFD5] rounded-xl p-6 flex flex-col justify-between gap-5 print-break-avoid">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[#1F1D1A]">
                Общая экономика проекта
              </h3>
              <p className="text-xs text-[#7A736A] mt-0.5">
                Доход, проектные расходы, выплаты на ЗП и чистая маржа
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isNegativeMargin && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF0EE] text-[#C46D5E] border border-[#C46D5E]/30">
                  МИНУС
                </span>
              )}
              <span
                className={`text-sm font-bold tabular-nums whitespace-nowrap ${
                  isNegativeMargin ? 'text-[#C46D5E]' : 'text-[#4E735D]'
                }`}
              >
                {netMargin > 0 ? '+' : ''}
                {formatNumber(netMargin)} {currency}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {overallMetrics.rows.map((row, idx) => {
              const totalPct = Math.min(
                100,
                (row.total / overallMetrics.maxVal) * 100
              );
              const paidPct = Math.min(
                100,
                (row.paid / overallMetrics.maxVal) * 100
              );
              const isMarginRow = row.id === 'margin';
              const displayValue = isMarginRow
                ? `${netMargin > 0 ? '+' : ''}${formatNumber(netMargin)}`
                : formatNumber(row.total);

              return (
                <div
                  key={row.id}
                  onMouseEnter={() => setHoveredOverallIdx(idx)}
                  onMouseLeave={() => setHoveredOverallIdx(null)}
                  className="relative space-y-1.5"
                >
                  {hoveredOverallIdx === idx && (
                    <div className="absolute -top-9 right-0 z-20 bg-[#1F1D1A] text-[#FAF8F5] text-[11px] px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap pointer-events-none tabular-nums">
                      {row.label}: {displayValue} {currency} · {row.subLabel}
                    </div>
                  )}

                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium text-[#1F1D1A]">
                      {row.label}
                    </span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="text-[11px] text-[#7A736A] hidden sm:inline">
                        {row.subLabel}
                      </span>
                      <span
                        className="font-bold"
                        style={{ color: row.color }}
                      >
                        {displayValue} {currency}
                      </span>
                    </div>
                  </div>

                  {/* Custom CSS/SVG Dual-Layer Bar */}
                  <div
                    className="relative h-3.5 w-full rounded-md overflow-hidden cursor-default"
                    style={{ backgroundColor: row.trackColor }}
                  >
                    {/* Planned / Total span */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-md opacity-30 transition-all duration-300"
                      style={{
                        width: `${totalPct}%`,
                        backgroundColor: row.color,
                      }}
                    />
                    {/* Paid / Realized span */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-md transition-all duration-300"
                      style={{
                        width: `${isMarginRow ? totalPct : paidPct}%`,
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#E6DFD5] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#6B655D] tabular-nums">
            <span>
              Всего расходов: {formatNumber(totalAllExpenses)} {currency}
            </span>
            <span>
              Проектные: {formatNumber(projectExpensesTotal)} {currency} · ЗП:{' '}
              {formatNumber(salaryExpensesTotal)} {currency}
            </span>
          </div>
        </div>

        {/* 2. Per-Stage Income vs Expense Chart */}
        <div className="bg-white border border-[#E6DFD5] rounded-xl p-6 flex flex-col justify-between gap-5 print-break-avoid">
          <div>
            <h3 className="text-base font-semibold text-[#1F1D1A]">
              Доходы и расходы по этапам
            </h3>
            <p className="text-xs text-[#7A736A] mt-0.5">
              Сопоставление бюджета этапа, связанных расходов и сальдо (профицит / дефицит)
            </p>
          </div>

          {stageBars.items.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#7A736A]">
              Добавьте этапы для отображения разбивки доходов и расходов.
            </div>
          ) : (
            <div className="space-y-4">
              {stageBars.items.map((item, idx) => {
                const incomeW = Math.min(
                  100,
                  (item.income / stageBars.maxStageVal) * 100
                );
                const expenseW = Math.min(
                  100,
                  (item.expenses / stageBars.maxStageVal) * 100
                );
                const isSurplus = item.surplus >= 0;

                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredStageIdx(idx)}
                    onMouseLeave={() => setHoveredStageIdx(null)}
                    className="relative space-y-1.5"
                  >
                    {hoveredStageIdx === idx && (
                      <div className="absolute -top-9 right-0 z-20 bg-[#1F1D1A] text-[#FAF8F5] text-[11px] px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap pointer-events-none tabular-nums">
                        Доход: {formatNumber(item.income)} {currency} · Расходы:{' '}
                        {formatNumber(item.expenses)} {currency} · Сальдо:{' '}
                        {item.surplus > 0 ? '+' : ''}
                        {formatNumber(item.surplus)} {currency}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-[#1F1D1A] truncate">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 tabular-nums shrink-0 text-[11px]">
                        <span className="text-[#4E735D] font-semibold">
                          +{formatNumber(item.income)}
                        </span>
                        <span className="text-[#D4CBC0]">/</span>
                        <span className="text-[#8C6D46] font-semibold">
                          −{formatNumber(item.expenses)}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            item.surplus > 0
                              ? 'bg-[#EEF3F0] text-[#4E735D]'
                              : item.surplus < 0
                                ? 'bg-[#FAF0EE] text-[#C46D5E]'
                                : 'bg-[#F3EFE9] text-[#6B655D]'
                          }`}
                        >
                          {isSurplus && item.surplus > 0 ? '+' : ''}
                          {formatNumber(item.surplus)} {currency}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 cursor-default">
                      <div className="h-2 w-full bg-[#F3EFE9] rounded-sm overflow-hidden">
                        <div
                          className="h-full bg-[#4E735D] rounded-sm transition-all duration-300"
                          style={{ width: `${incomeW}%` }}
                        />
                      </div>
                      <div className="h-2 w-full bg-[#F3EFE9] rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm transition-all duration-300"
                          style={{
                            width: `${expenseW}%`,
                            backgroundColor:
                              item.surplus < 0 ? '#C46D5E' : '#B8956A',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-[#E6DFD5] flex flex-wrap items-center gap-5 text-[11px] text-[#6B655D]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#4E735D]" />
              <span>Доход этапа</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#B8956A]" />
              <span>Расходы этапа</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#C46D5E]" />
              <span>Дефицит по этапу</span>
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Team Cost Distribution SVG Donut */}
      <div className="bg-white border border-[#E6DFD5] rounded-xl p-6 print-break-avoid">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h3 className="text-base font-semibold text-[#1F1D1A]">
              Структура затрат команды
            </h3>
            <p className="text-xs text-[#7A736A] mt-0.5">
              Доля каждой роли и статьи в расходах команды ({currency})
            </p>
          </div>
        </div>

        <div className="relative flex flex-col md:flex-row items-center gap-8">
          {activeDonutItem && (
            <div className="absolute -top-9 left-0 z-20 bg-[#1F1D1A] text-[#FAF8F5] text-[11px] px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap pointer-events-none tabular-nums">
              <span className="font-semibold">{activeDonutItem.role}:</span>{' '}
              {formatNumber(activeDonutItem.totalCost)} {currency} (
              {activeDonutItem.sharePct.toFixed(2)}%) · Оплачено:{' '}
              {formatNumber(activeDonutItem.paidAmount)} {currency}
            </div>
          )}

          <div className="relative w-[164px] h-[164px] shrink-0">
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

          <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 min-w-0">
            {donutSegments.map((seg, idx) => (
              <div
                key={seg.id}
                onMouseEnter={() => setHoveredRoleIdx(idx)}
                onMouseLeave={() => setHoveredRoleIdx(null)}
                className={`flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg border border-[#E6DFD5]/70 transition-colors cursor-default ${
                  hoveredRoleIdx === idx ? 'bg-[#FAF8F5] border-[#B8956A]' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-[#1F1D1A] truncate font-medium">
                    {seg.role}
                  </span>
                </div>
                <span className="font-semibold text-[#4A453E] tabular-nums shrink-0">
                  {formatNumber(seg.totalCost)} {currency} · {seg.sharePct.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
