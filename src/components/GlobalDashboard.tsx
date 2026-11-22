import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  Banknote,
  Briefcase,
  CheckCircle2,
  Clock,
  Receipt,
  Users,
} from 'lucide-react';
import { ProjectRecord } from '../types/dashboard';
import {
  formatFullDate,
  formatNumber,
  getProjectFinancialSummary,
  getStageCompletionPercent,
  getStageDateBounds,
} from '../data/defaultData';

export interface OverdueItem {
  id: string;
  projectId: string;
  projectTitle: string;
  stageName: string;
  itemTitle: string;
  kind: 'work' | 'payment';
  assignee?: string;
  deadline: string;
  daysOverdue: number;
  statusLabel: string;
}

function diffDaysIso(laterIso: string, earlierIso: string): number {
  const a = new Date(`${laterIso}T00:00:00Z`).getTime();
  const b = new Date(`${earlierIso}T00:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((a - b) / 86400000));
}

export function getOverdueItems(
  projects: ProjectRecord[],
  referenceIso = new Date().toISOString().slice(0, 10)
): OverdueItem[] {
  const items: OverdueItem[] = [];

  for (const project of projects) {
    if (project.status !== 'active') continue;

    for (const stage of project.stages) {
      const bounds = getStageDateBounds(stage);

      if (stage.workStages && stage.workStages.length > 0) {
        for (const ws of stage.workStages) {
          if (ws.progress < 100 && ws.plannedEnd && ws.plannedEnd < referenceIso) {
            items.push({
              id: `${project.id}-${stage.id}-${ws.id}`,
              projectId: project.id,
              projectTitle: project.title,
              stageName: stage.name,
              itemTitle: ws.title,
              kind: 'work',
              assignee: ws.assignee,
              deadline: ws.plannedEnd,
              daysOverdue: diffDaysIso(referenceIso, ws.plannedEnd),
              statusLabel: `Готовность ${ws.progress}%`,
            });
          }
        }
      }

      if (!stage.paid && bounds.endDate && bounds.endDate < referenceIso) {
        const pct = getStageCompletionPercent(stage);
        items.push({
          id: `${project.id}-${stage.id}-payment`,
          projectId: project.id,
          projectTitle: project.title,
          stageName: stage.name,
          itemTitle: stage.name,
          kind: 'payment',
          deadline: bounds.endDate,
          daysOverdue: diffDaysIso(referenceIso, bounds.endDate),
          statusLabel: `Ожидается оплата (${formatNumber(stage.amount)} ${project.currency}) · работы ${pct}%`,
        });
      }
    }
  }

  return items.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

interface GlobalDashboardProps {
  projects: ProjectRecord[];
  onJumpToProject: (projectId: string) => void;
}

type PortfolioFilter = 'all' | 'active' | 'archived';

export const GlobalDashboard: React.FC<GlobalDashboardProps> = ({
  projects,
  onJumpToProject,
}) => {
  const [scope, setScope] = useState<PortfolioFilter>('all');
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const filteredProjects = useMemo(() => {
    if (scope === 'active') return projects.filter((p) => p.status === 'active');
    if (scope === 'archived') {
      return projects.filter((p) => p.status === 'archived');
    }
    return projects;
  }, [projects, scope]);

  const portfolioMetrics = useMemo(() => {
    let receivedFromClients = 0;
    let totalPlannedIncome = 0;
    let spentOnSalaries = 0;
    let plannedSalaries = 0;
    let spentOnExpenses = 0;
    let plannedExpenses = 0;

    const projectRows = filteredProjects.map((project) => {
      const fin = getProjectFinancialSummary(project);
      receivedFromClients += fin.paidIncome;
      totalPlannedIncome += fin.totalIncome;
      spentOnSalaries += fin.salaryExpensesPaid;
      plannedSalaries += fin.salaryExpensesTotal;
      spentOnExpenses += fin.projectExpensesPaid;
      plannedExpenses += fin.projectExpensesTotal;

      const projectOverdue = getOverdueItems([project], todayIso);

      return {
        project,
        fin,
        overdueCount: projectOverdue.length,
      };
    });

    const overdueItems = getOverdueItems(filteredProjects, todayIso);
    const totalSpent = spentOnSalaries + spentOnExpenses;
    const netCashflow = receivedFromClients - totalSpent;

    return {
      receivedFromClients,
      totalPlannedIncome,
      spentOnSalaries,
      plannedSalaries,
      spentOnExpenses,
      plannedExpenses,
      totalSpent,
      netCashflow,
      overdueItems,
      projectRows,
    };
  }, [filteredProjects, todayIso]);

  const activeCount = projects.filter((p) => p.status === 'active').length;
  const archivedCount = projects.filter((p) => p.status === 'archived').length;
  const primaryCurrency = projects[0]?.currency || 'тыс. ₽';

  const cashflowMax = Math.max(
    1,
    portfolioMetrics.receivedFromClients,
    portfolioMetrics.spentOnSalaries,
    portfolioMetrics.spentOnExpenses
  );

  return (
    <div className="space-y-8">
      {/* Top Header + Filter */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#B8956A]">
            Сводка студии
          </p>
          <h1 className="font-serif-display text-3xl sm:text-4xl font-bold tracking-tight text-[#1F1D1A]">
            Общий дашборд по проектам
          </h1>
          <p className="text-xs text-[#7A736A]">
            Совокупные поступления от заказчиков, выплаты на ЗП, проектные расходы и контроль просрочек
          </p>
        </div>

        <div className="inline-flex items-center p-1 rounded-xl border border-[#E6DFD5] bg-white shrink-0 self-start md:self-auto">
          {(
            [
              { key: 'all', label: `Все (${projects.length})` },
              { key: 'active', label: `Активные (${activeCount})` },
              { key: 'archived', label: `Архив (${archivedCount})` },
            ] as const
          ).map((tab) => {
            const active = scope === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setScope(tab.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#1F1D1A] text-[#FAF8F5]'
                    : 'text-[#6B655D] hover:text-[#1F1D1A]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* 4 Portfolio KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 print-break-avoid">
        {/* 1. Получено от заказчиков */}
        <div className="bg-white border border-[#E6DFD5] rounded-xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-[#6B655D]">
              Получено от заказчиков
            </span>
            <Banknote className="w-4 h-4 text-[#4E735D] shrink-0" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-[#4E735D] tabular-nums">
              {formatNumber(portfolioMetrics.receivedFromClients)}{' '}
              <span className="text-sm font-medium text-[#7A736A]">
                {primaryCurrency}
              </span>
            </div>
            <p className="text-[11px] text-[#7A736A] tabular-nums">
              Из общего плана: {formatNumber(portfolioMetrics.totalPlannedIncome)}{' '}
              {primaryCurrency}
            </p>
          </div>
        </div>

        {/* 2. Потрачено на ЗП */}
        <div className="bg-white border border-[#E6DFD5] rounded-xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-[#6B655D]">
              Потрачено на ЗП
            </span>
            <Users className="w-4 h-4 text-[#1F1D1A] shrink-0" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-[#1F1D1A] tabular-nums">
              {formatNumber(portfolioMetrics.spentOnSalaries)}{' '}
              <span className="text-sm font-medium text-[#7A736A]">
                {primaryCurrency}
              </span>
            </div>
            <p className="text-[11px] text-[#7A736A] tabular-nums">
              План по ЗП: {formatNumber(portfolioMetrics.plannedSalaries)}{' '}
              {primaryCurrency}
            </p>
          </div>
        </div>

        {/* 3. Потрачено на расходы */}
        <div className="bg-white border border-[#E6DFD5] rounded-xl p-5 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-[#6B655D]">
              Потрачено на расходы
            </span>
            <Receipt className="w-4 h-4 text-[#B8956A] shrink-0" />
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-[#1F1D1A] tabular-nums">
              {formatNumber(portfolioMetrics.spentOnExpenses)}{' '}
              <span className="text-sm font-medium text-[#7A736A]">
                {primaryCurrency}
              </span>
            </div>
            <p className="text-[11px] text-[#7A736A] tabular-nums">
              План по расходам: {formatNumber(portfolioMetrics.plannedExpenses)}{' '}
              {primaryCurrency}
            </p>
          </div>
        </div>

        {/* 4. Просрочки */}
        <div
          className={`border rounded-xl p-5 flex flex-col justify-between gap-3 ${
            portfolioMetrics.overdueItems.length > 0
              ? 'bg-[#FAF0EE]/50 border-[#C46D5E]/40'
              : 'bg-white border-[#E6DFD5]'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium text-[#6B655D]">
              Просрочки
            </span>
            {portfolioMetrics.overdueItems.length > 0 ? (
              <AlertTriangle className="w-4 h-4 text-[#C46D5E] shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#4E735D] shrink-0" />
            )}
          </div>
          <div className="space-y-1">
            <div
              className={`text-2xl font-bold tabular-nums ${
                portfolioMetrics.overdueItems.length > 0
                  ? 'text-[#C46D5E]'
                  : 'text-[#4E735D]'
              }`}
            >
              {portfolioMetrics.overdueItems.length}
            </div>
            <p className="text-[11px] text-[#7A736A]">
              {portfolioMetrics.overdueItems.length > 0
                ? 'Требуют внимания в активных проектах'
                : 'Все активные этапы в графике'}
            </p>
          </div>
        </div>
      </section>

      {/* Portfolio Cashflow Balance Bar + Overdue List */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Cashflow Breakdown Chart (Custom CSS) */}
        <section className="lg:col-span-2 bg-white border border-[#E6DFD5] rounded-xl p-6 flex flex-col justify-between gap-5 print-break-avoid">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[#1F1D1A]">
                Движение средств студии
              </h2>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded tabular-nums ${
                  portfolioMetrics.netCashflow < 0
                    ? 'bg-[#FAF0EE] text-[#C46D5E]'
                    : 'bg-[#EEF3F0] text-[#4E735D]'
                }`}
              >
                {portfolioMetrics.netCashflow > 0 ? '+' : ''}
                {formatNumber(portfolioMetrics.netCashflow)} {primaryCurrency}
              </span>
            </div>
            <p className="text-xs text-[#7A736A] mt-0.5">
              Фактические поступления и выплаты по выбранным проектам
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                label: 'Получено от заказчиков',
                value: portfolioMetrics.receivedFromClients,
                plan: portfolioMetrics.totalPlannedIncome,
                color: '#4E735D',
                track: '#EEF3F0',
              },
              {
                label: 'Выплачено на ЗП',
                value: portfolioMetrics.spentOnSalaries,
                plan: portfolioMetrics.plannedSalaries,
                color: '#1F1D1A',
                track: '#ECE9E4',
              },
              {
                label: 'Оплачено на расходы',
                value: portfolioMetrics.spentOnExpenses,
                plan: portfolioMetrics.plannedExpenses,
                color: '#B8956A',
                track: '#F3EFE9',
              },
            ].map((row) => {
              const pct = Math.min(100, (row.value / cashflowMax) * 100);
              return (
                <div key={row.label} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium text-[#1F1D1A]">
                      {row.label}
                    </span>
                    <span className="font-bold text-[#1F1D1A] tabular-nums">
                      {formatNumber(row.value)} {primaryCurrency}
                    </span>
                  </div>
                  <div
                    className="h-3 w-full rounded-md overflow-hidden"
                    style={{ backgroundColor: row.track }}
                  >
                    <div
                      className="h-full rounded-md transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                  <div className="text-[11px] text-[#7A736A] text-right tabular-nums">
                    План: {formatNumber(row.plan)} {primaryCurrency}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#E6DFD5] flex items-center justify-between text-xs text-[#6B655D] tabular-nums">
            <span>Фактический баланс (получено − выплачено):</span>
            <strong
              className={
                portfolioMetrics.netCashflow < 0
                  ? 'text-[#C46D5E]'
                  : 'text-[#4E735D]'
              }
            >
              {portfolioMetrics.netCashflow > 0 ? '+' : ''}
              {formatNumber(portfolioMetrics.netCashflow)} {primaryCurrency}
            </strong>
          </div>
        </section>

        {/* Overdue Items Section */}
        <section className="lg:col-span-3 bg-white border border-[#E6DFD5] rounded-xl p-6 flex flex-col gap-4 print-break-avoid">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-[#1F1D1A] flex items-center gap-2">
                <span>Просрочки по проектам</span>
                <span
                  className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums ${
                    portfolioMetrics.overdueItems.length > 0
                      ? 'bg-[#FAF0EE] text-[#C46D5E]'
                      : 'bg-[#EEF3F0] text-[#4E735D]'
                  }`}
                >
                  {portfolioMetrics.overdueItems.length}
                </span>
              </h2>
              <p className="text-xs text-[#7A736A] mt-0.5">
                Незавершённые этапы работ и неоплаченные этапы с истёкшим плановым сроком на{' '}
                {formatFullDate(todayIso)}
              </p>
            </div>
          </div>

          {portfolioMetrics.overdueItems.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8 px-4 rounded-xl bg-[#FAF8F5] border border-[#E6DFD5]/80">
              <CheckCircle2 className="w-8 h-8 text-[#4E735D] mb-2" />
              <p className="text-sm font-semibold text-[#1F1D1A]">
                Просроченных этапов и задач нет
              </p>
              <p className="text-xs text-[#7A736A] mt-1 max-w-sm">
                Все активные проекты идут в пределах плановых дат и согласованного графика оплат.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {portfolioMetrics.overdueItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#FAF8F5] border border-[#E6DFD5] rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#1F1D1A]">
                        {item.projectTitle}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          item.kind === 'payment'
                            ? 'bg-[#FAF0EE] text-[#C46D5E]'
                            : 'bg-[#F3EFE9] text-[#8C6D46]'
                        }`}
                      >
                        {item.kind === 'payment'
                          ? 'Этап оплаты'
                          : `Работа · ${item.assignee || 'Команда'}`}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C46D5E] tabular-nums">
                        <Clock className="w-3 h-3" />
                        Просрочено на {item.daysOverdue} дн.
                      </span>
                    </div>

                    <div className="text-xs font-medium text-[#1F1D1A] truncate">
                      {item.itemTitle}
                      {item.kind === 'work' && (
                        <span className="text-[#7A736A] font-normal">
                          {' '}
                          ({item.stageName})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#7A736A] tabular-nums">
                      <span>Срок: {formatFullDate(item.deadline)}</span>
                      <span>·</span>
                      <span>{item.statusLabel}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onJumpToProject(item.projectId)}
                    className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1F1D1A] text-[#FAF8F5] hover:bg-[#332F2A] transition-colors shrink-0 self-start sm:self-center cursor-pointer"
                  >
                    <span>Перейти к проекту</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#B8956A]" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* All Projects Summary Table */}
      <section className="bg-white border border-[#E6DFD5] rounded-xl overflow-hidden print-break-avoid">
        <div className="p-6 border-b border-[#E6DFD5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-serif-display text-2xl font-bold text-[#1F1D1A]">
              Сводка по проектам
            </h2>
            <p className="text-xs text-[#7A736A] mt-0.5">
              Сравнение доходов, расходов на ЗП, прочих затрат, маржи и просрочек по каждому объекту
            </p>
          </div>
        </div>

        {portfolioMetrics.projectRows.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#7A736A]">
            В выбранной категории пока нет проектов.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-[#FAF8F5] border-b border-[#E6DFD5] text-[11px] font-semibold uppercase tracking-wider text-[#7A736A]">
                  <th className="py-3 px-6">Проект</th>
                  <th className="py-3 px-4">Статус</th>
                  <th className="py-3 px-4 text-right">Получено / Бюджет</th>
                  <th className="py-3 px-4 text-right">ЗП (оплач. / план)</th>
                  <th className="py-3 px-4 text-right">Расходы (оплач. / план)</th>
                  <th className="py-3 px-4 text-right">Маржа</th>
                  <th className="py-3 px-4 text-center">Просрочки</th>
                  <th className="no-print py-3 px-6 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6DFD5]/70 text-sm">
                {portfolioMetrics.projectRows.map(({ project, fin, overdueCount }) => {
                  const isNegative = fin.netMargin < 0;
                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-[#FAF8F5]/70 transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-[#1F1D1A]">
                          {project.title}
                        </div>
                        <div className="text-[11px] text-[#7A736A] tabular-nums">
                          от {formatFullDate(project.projectDate)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {project.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EEF3F0] text-[#4E735D]">
                            <Briefcase className="w-3 h-3" />
                            <span>В работе</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#F3EFE9] text-[#6B655D]">
                            <Archive className="w-3 h-3" />
                            <span>Архив</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        <span className="font-semibold text-[#4E735D]">
                          {formatNumber(fin.paidIncome)}
                        </span>
                        <span className="text-[#7A736A]">
                          {' '}
                          / {formatNumber(fin.totalIncome)} {project.currency}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums text-xs">
                        <span className="font-semibold text-[#1F1D1A]">
                          {formatNumber(fin.salaryExpensesPaid)}
                        </span>
                        <span className="text-[#7A736A]">
                          {' '}
                          / {formatNumber(fin.salaryExpensesTotal)} {project.currency}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums text-xs">
                        <span className="font-semibold text-[#1F1D1A]">
                          {formatNumber(fin.projectExpensesPaid)}
                        </span>
                        <span className="text-[#7A736A]">
                          {' '}
                          / {formatNumber(fin.projectExpensesTotal)} {project.currency}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        <div className="inline-flex items-center gap-1.5">
                          {isNegative && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FAF0EE] text-[#C46D5E]">
                              МИНУС
                            </span>
                          )}
                          <span
                            className={`font-bold ${
                              isNegative ? 'text-[#C46D5E]' : 'text-[#4E735D]'
                            }`}
                          >
                            {fin.netMargin > 0 ? '+' : ''}
                            {formatNumber(fin.netMargin)} {project.currency}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center tabular-nums">
                        {overdueCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-[#FAF0EE] text-[#C46D5E]">
                            {overdueCount}
                          </span>
                        ) : (
                          <span className="text-xs text-[#4E735D] font-medium">
                            0
                          </span>
                        )}
                      </td>
                      <td className="no-print py-3.5 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => onJumpToProject(project.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E6DFD5] bg-white text-[#1F1D1A] hover:border-[#B8956A] transition-colors cursor-pointer"
                        >
                          <span>Открыть</span>
                          <ArrowRight className="w-3 h-3 text-[#B8956A]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
