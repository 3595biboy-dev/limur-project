import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { TeamExpense, ViewMode } from '../types/dashboard';
import { formatNumber } from '../data/defaultData';

interface TeamTableProps {
  team: TeamExpense[];
  currency: string;
  mode: ViewMode;
  totalTeamCost: number;
  paidTeamAmount: number;
  remainingTeamPay: number;
  onAddTeamItem: () => void;
  onUpdateTeamItem: (id: string, patch: Partial<TeamExpense>) => void;
  onDeleteTeamItem: (id: string) => void;
}

export const TeamTable: React.FC<TeamTableProps> = ({
  team,
  currency,
  mode,
  totalTeamCost,
  paidTeamAmount,
  remainingTeamPay,
  onAddTeamItem,
  onUpdateTeamItem,
  onDeleteTeamItem,
}) => {
  const isEditor = mode === 'editor';
  const [clientExpanded, setClientExpanded] = useState(false);

  // Reset accordion to closed whenever switching to Client View
  useEffect(() => {
    if (!isEditor) {
      setClientExpanded(false);
    }
  }, [isEditor]);

  const showTable = isEditor || clientExpanded;

  return (
    <section className="bg-white border border-[#E6DFD5] rounded-xl overflow-hidden print-break-avoid">
      <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-display text-2xl font-bold text-[#1F1D1A]">
            Команда проекта: оплаты и остаток
          </h2>
          <p className="text-xs text-[#7A736A] mt-0.5">
            Детализация бюджета по ролям и подрядчикам ({currency})
          </p>
        </div>

        <div className="no-print flex items-center gap-3 shrink-0">
          {!isEditor ? (
            <button
              type="button"
              onClick={() => setClientExpanded((prev) => !prev)}
              aria-expanded={clientExpanded}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-[#E6DFD5] bg-[#FAF8F5] text-[#1F1D1A] hover:border-[#B8956A] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8956A]"
            >
              <span>
                {clientExpanded ? 'Скрыть детализацию' : 'Показать детализацию'}
              </span>
              {clientExpanded ? (
                <ChevronUp className="w-4 h-4 text-[#B8956A]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#B8956A]" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onAddTeamItem}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#1F1D1A] text-[#FAF8F5] hover:bg-[#332F2A] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8956A]"
            >
              <Plus className="w-3.5 h-3.5 text-[#B8956A]" />
              <span>Добавить статью</span>
            </button>
          )}
        </div>
      </div>

      {showTable && (
        <div className="border-t border-[#E6DFD5] overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E6DFD5] text-[11px] font-semibold uppercase tracking-wider text-[#7A736A]">
                <th className="py-3 px-6">Команда / Статья</th>
                <th className="py-3 px-4 text-right">Общие затраты</th>
                <th className="py-3 px-4 text-right">Оплачено</th>
                <th className="py-3 px-4 text-right">Осталось оплатить</th>
                <th className="py-3 px-6 text-right">Доля (%)</th>
                {isEditor && <th className="no-print py-3 px-4 w-12" />}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E6DFD5]/70 text-sm">
              {team.length === 0 ? (
                <tr>
                  <td
                    colSpan={isEditor ? 6 : 5}
                    className="py-8 text-center text-sm text-[#7A736A]"
                  >
                    Статьи расходов не добавлены.
                  </td>
                </tr>
              ) : (
                team.map((item) => {
                  const remaining = Math.max(0, item.totalCost - item.paidAmount);
                  const sharePct =
                    totalTeamCost > 0
                      ? (item.totalCost / totalTeamCost) * 100
                      : 0;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#FAF8F5]/70 transition-colors"
                    >
                      <td className="py-3 px-6 font-medium text-[#1F1D1A]">
                        {isEditor ? (
                          <input
                            type="text"
                            value={item.role}
                            onChange={(e) =>
                              onUpdateTeamItem(item.id, { role: e.target.value })
                            }
                            aria-label="Название роли или статьи"
                            className="w-full max-w-[240px] text-sm font-medium text-[#1F1D1A] bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-md px-2.5 py-1.5"
                          />
                        ) : (
                          item.role
                        )}
                      </td>

                      <td className="py-3 px-4 text-right tabular-nums text-[#1F1D1A]">
                        {isEditor ? (
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={item.totalCost}
                            onChange={(e) =>
                              onUpdateTeamItem(item.id, {
                                totalCost: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            aria-label={`Общие затраты: ${item.role}`}
                            className="w-24 text-right text-sm font-medium text-[#1F1D1A] tabular-nums bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-md px-2.5 py-1.5"
                          />
                        ) : (
                          <span>
                            {formatNumber(item.totalCost)}{' '}
                            <span className="text-xs text-[#7A736A]">{currency}</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right tabular-nums text-[#4E735D] font-medium">
                        {isEditor ? (
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={item.paidAmount}
                            onChange={(e) =>
                              onUpdateTeamItem(item.id, {
                                paidAmount: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            aria-label={`Оплачено: ${item.role}`}
                            className="w-24 text-right text-sm font-medium text-[#4E735D] tabular-nums bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-md px-2.5 py-1.5"
                          />
                        ) : (
                          <span>
                            {formatNumber(item.paidAmount)}{' '}
                            <span className="text-xs text-[#7A736A]">{currency}</span>
                          </span>
                        )}
                      </td>

                      <td
                        className={`py-3 px-4 text-right tabular-nums font-semibold ${
                          remaining > 0 ? 'text-[#C46D5E]' : 'text-[#4E735D]'
                        }`}
                      >
                        {formatNumber(remaining)}{' '}
                        <span className="text-xs font-normal text-[#7A736A]">
                          {currency}
                        </span>
                      </td>

                      <td className="py-3 px-6 text-right tabular-nums text-[#6B655D]">
                        {sharePct.toFixed(2)}%
                      </td>

                      {isEditor && (
                        <td className="no-print py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onDeleteTeamItem(item.id)}
                            aria-label={`Удалить статью ${item.role}`}
                            className="p-1.5 text-[#7A736A] hover:text-[#C46D5E] hover:bg-[#FAF0EE] rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>

            {team.length > 0 && (
              <tfoot>
                <tr className="bg-[#FAF8F5] border-t border-[#E6DFD5] text-sm font-bold text-[#1F1D1A]">
                  <td className="py-3.5 px-6">Итого по команде</td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    {formatNumber(totalTeamCost)}{' '}
                    <span className="text-xs font-normal text-[#7A736A]">
                      {currency}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums text-[#4E735D]">
                    {formatNumber(paidTeamAmount)}{' '}
                    <span className="text-xs font-normal text-[#7A736A]">
                      {currency}
                    </span>
                  </td>
                  <td
                    className={`py-3.5 px-4 text-right tabular-nums ${
                      remainingTeamPay > 0 ? 'text-[#C46D5E]' : 'text-[#4E735D]'
                    }`}
                  >
                    {formatNumber(remainingTeamPay)}{' '}
                    <span className="text-xs font-normal text-[#7A736A]">
                      {currency}
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right tabular-nums">
                    {totalTeamCost > 0 ? '100.00%' : '0.00%'}
                  </td>
                  {isEditor && <td className="no-print" />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </section>
  );
};
