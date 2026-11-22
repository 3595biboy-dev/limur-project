import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import {
  PayoutType,
  ProjectStage,
  TeamExpense,
  ViewMode,
} from '../types/dashboard';
import { formatNumber } from '../data/defaultData';

interface TeamTableProps {
  team: TeamExpense[];
  stages: ProjectStage[];
  currency: string;
  areaM2: number;
  mode: ViewMode;
  totalTeamCost: number;
  paidTeamAmount: number;
  remainingTeamPay: number;
  onUpdateAreaM2: (area: number) => void;
  onAddTeamItem: () => void;
  onUpdateTeamItem: (id: string, patch: Partial<TeamExpense>) => void;
  onDeleteTeamItem: (id: string) => void;
}

export const TeamTable: React.FC<TeamTableProps> = ({
  team,
  stages,
  currency,
  areaM2,
  mode,
  totalTeamCost,
  paidTeamAmount,
  remainingTeamPay,
  onUpdateAreaM2,
  onAddTeamItem,
  onUpdateTeamItem,
  onDeleteTeamItem,
}) => {
  const isEditor = mode === 'editor';
  const [clientExpanded, setClientExpanded] = useState(false);

  useEffect(() => {
    if (!isEditor) {
      setClientExpanded(false);
    }
  }, [isEditor]);

  const showTable = isEditor || clientExpanded;
  const safeArea = areaM2 > 0 ? areaM2 : 1;

  return (
    <section className="bg-white border border-[#E6DFD5] rounded-xl overflow-hidden print-break-avoid">
      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif-display text-2xl font-bold text-[#1F1D1A]">
            Команда проекта: оплаты и остаток
          </h2>
          <p className="text-xs text-[#7A736A] mt-0.5">
            Детализация выплат по ролям, типу выплаты (По объекту / Оклад), привязке к этапу и ставке за м² ({currency})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E6DFD5] bg-[#FAF8F5] text-xs">
            <span className="text-[#6B655D]">Площадь:</span>
            {isEditor ? (
              <input
                type="number"
                min={1}
                step="1"
                value={areaM2}
                onChange={(e) =>
                  onUpdateAreaM2(Math.max(1, Number(e.target.value) || 1))
                }
                aria-label="Площадь объекта в м²"
                className="w-16 text-right font-semibold text-[#1F1D1A] tabular-nums bg-white border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded px-1.5 py-0.5"
              />
            ) : (
              <span className="font-semibold text-[#1F1D1A] tabular-nums">
                {formatNumber(areaM2)}
              </span>
            )}
            <span className="text-[#7A736A]">м²</span>
          </div>

          <div className="no-print flex items-center gap-2">
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
      </div>

      {showTable && (
        <div className="border-t border-[#E6DFD5] overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[880px]">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E6DFD5] text-[11px] font-semibold uppercase tracking-wider text-[#7A736A]">
                <th className="py-3 px-6">Команда / Статья</th>
                <th className="py-3 px-3">Тип выплаты</th>
                <th className="py-3 px-3">Этап оплаты</th>
                <th className="py-3 px-4 text-right">Общие затраты</th>
                <th className="py-3 px-4 text-right">Ставка / м²</th>
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
                    colSpan={isEditor ? 9 : 8}
                    className="py-8 text-center text-sm text-[#7A736A]"
                  >
                    Статьи расходов не добавлены.
                  </td>
                </tr>
              ) : (
                team.map((item) => {
                  const remaining = Math.max(
                    0,
                    item.totalCost - item.paidAmount
                  );
                  const sharePct =
                    totalTeamCost > 0
                      ? (item.totalCost / totalTeamCost) * 100
                      : 0;
                  const perM2 = (item.totalCost * 1000) / safeArea;
                  const payoutType: PayoutType =
                    item.payoutType === 'salary' ? 'salary' : 'project';
                  const linkedStageName =
                    stages.find((s) => s.id === item.stageId)?.name || 'Общий';

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
                              onUpdateTeamItem(item.id, {
                                role: e.target.value,
                              })
                            }
                            aria-label="Название роли или статьи"
                            className="w-full max-w-[190px] text-sm font-medium text-[#1F1D1A] bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-md px-2.5 py-1.5"
                          />
                        ) : (
                          item.role
                        )}
                      </td>

                      <td className="py-3 px-3 text-xs">
                        {isEditor ? (
                          <select
                            value={payoutType}
                            onChange={(e) =>
                              onUpdateTeamItem(item.id, {
                                payoutType: e.target.value as PayoutType,
                              })
                            }
                            aria-label={`Тип выплаты: ${item.role}`}
                            className="text-xs font-medium text-[#4A453E] bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-md px-2 py-1.5 cursor-pointer"
                          >
                            <option value="project">По объекту</option>
                            <option value="salary">Оклад (ЗП)</option>
                          </select>
                        ) : (
                          <span className="text-[#6B655D]">
                            {payoutType === 'salary'
                              ? 'Оклад (ЗП)'
                              : 'По объекту'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-xs">
                        {isEditor ? (
                          <select
                            value={item.stageId || ''}
                            onChange={(e) =>
                              onUpdateTeamItem(item.id, {
                                stageId: e.target.value || undefined,
                              })
                            }
                            aria-label={`Этап оплаты: ${item.role}`}
                            className="max-w-[170px] text-xs text-[#4A453E] bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-md px-2 py-1.5 cursor-pointer"
                          >
                            <option value="">Без привязки</option>
                            {stages.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[#6B655D] truncate block max-w-[160px]">
                            {linkedStageName}
                          </span>
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
                                totalCost: Math.max(
                                  0,
                                  Number(e.target.value) || 0
                                ),
                              })
                            }
                            aria-label={`Общие затраты: ${item.role}`}
                            className="w-22 text-right text-sm font-medium text-[#1F1D1A] tabular-nums bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-md px-2 py-1.5"
                          />
                        ) : (
                          <span>
                            {formatNumber(item.totalCost)}{' '}
                            <span className="text-xs text-[#7A736A]">
                              {currency}
                            </span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right tabular-nums text-xs text-[#6B655D]">
                        {Math.round(perM2).toLocaleString('ru-RU')} ₽/м²
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
                                paidAmount: Math.max(
                                  0,
                                  Number(e.target.value) || 0
                                ),
                              })
                            }
                            aria-label={`Оплачено: ${item.role}`}
                            className="w-22 text-right text-sm font-medium text-[#4E735D] tabular-nums bg-[#FAF8F5] border border-[#E6DFD5] focus:border-[#B8956A] focus:outline-none rounded-md px-2 py-1.5"
                          />
                        ) : (
                          <span>
                            {formatNumber(item.paidAmount)}{' '}
                            <span className="text-xs text-[#7A736A]">
                              {currency}
                            </span>
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
                  <td className="py-3.5 px-6" colSpan={3}>
                    Итого по команде
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums">
                    {formatNumber(totalTeamCost)}{' '}
                    <span className="text-xs font-normal text-[#7A736A]">
                      {currency}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums text-xs font-semibold text-[#6B655D]">
                    {Math.round(
                      (totalTeamCost * 1000) / safeArea
                    ).toLocaleString('ru-RU')}{' '}
                    ₽/м²
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
