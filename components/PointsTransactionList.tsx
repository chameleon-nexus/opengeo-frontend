/**
 * 积分明细：列表风格对齐主站栏目管理（ColumnManagement）
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, BoxSelect, Coins, RefreshCw, ShoppingCart } from 'lucide-react';
import { authAPI, type PointTransactionRow } from '../api/auth';
import Pagination from './Pagination';

const PAGE_SIZE = 20;

const REASON_LABELS: Record<string, string> = {
  recharge: '管理员充值',
  purchase: '套餐购买',
  credits_purchase: '积分充值',
  consume_content_generate: '内容生成',
  consume_semantic_seo_drill: '语义 SEO 下钻',
  consume_knowledge_extract: '知识库提取',
  consume_knowledge_expand: '知识库扩展',
  consume_knowledge_search: '知识库搜索',
  consume_knowledge_next_round: '知识库下一轮',
  consume_agent_chat: 'Agent 对话',
  geo_orchestrator_chat: 'GEO 优化对话',
  geo_orchestrator_chat_stream: 'GEO 优化对话',
  consume_task_ai: '任务 AI 处理',
  hold_optimization_cycle: '优化周期预扣',
  refund_optimization_cycle: '优化周期退还',
};

function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] || reason;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatRelated(type: string | null | undefined, id: string | null | undefined): string {
  if (!type && !id) return '—';
  if (type && id) return `${type} #${id}`;
  return type || id || '—';
}

interface PointsTransactionListProps {
  balance?: number | null;
  onBack?: () => void;
  onRecharge?: () => void;
  refreshKey?: number;
}

const PointsTransactionList: React.FC<PointsTransactionListProps> = ({
  balance: balanceProp,
  onBack,
  onRecharge,
  refreshKey = 0,
}) => {
  const [rows, setRows] = useState<PointTransactionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [balance, setBalance] = useState<number | null>(balanceProp ?? null);
  const [unlimited, setUnlimited] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const showUserColumn = unlimited || rows.some((r) => r.username);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authAPI.listPointTransactions((page - 1) * PAGE_SIZE, PAGE_SIZE);
      setRows(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total ?? 0);
      setUnlimited(!!data.unlimited);
      if (data.unlimited) {
        setBalance(null);
      } else if (data.balance != null) {
        setBalance(data.balance);
      }
    } catch {
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadRows();
  }, [loadRows, refreshKey]);

  useEffect(() => {
    if (balanceProp != null) setBalance(balanceProp);
  }, [balanceProp]);

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 p-8 lg:p-12 overflow-y-auto no-scrollbar">
        <div className="max-w-[1400px] mx-auto space-y-10">
          <div className="flex justify-between items-end">
            <div className="space-y-3">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#E8553F] transition-colors mb-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  返回
                </button>
              ) : null}
              <h2 className="text-4xl font-semibold tracking-tight text-slate-900">积分明细</h2>
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-[#E8553F]" />
                当前积分：
                <strong className="text-[#E8553F]">
                  {unlimited ? '无限' : balance != null ? balance : '—'}
                </strong>
                <span className="text-slate-400">
                  · {unlimited ? '全站积分流水（管理员视图）' : '充值与消耗流水记录'}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!unlimited && onRecharge ? (
                <button
                  type="button"
                  onClick={onRecharge}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-coral px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
                >
                  <ShoppingCart className="w-4 h-4" />
                  积分充值
                </button>
              ) : null}
              <button
                type="button"
                onClick={loadRows}
                disabled={loading}
                className="p-2.5 rounded-xl border transition-colors border-slate-200 hover:bg-slate-50 text-slate-600"
                title="刷新"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <div className="rounded-2xl border overflow-hidden shadow-sm bg-white border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">时间</th>
                  {showUserColumn ? <th className="px-4 py-3">用户</th> : null}
                  <th className="px-4 py-3">类型</th>
                  <th className="px-4 py-3">变动</th>
                  <th className="px-4 py-3">关联</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={showUserColumn ? 5 : 4} className="px-4 py-12 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                      <p className="text-sm font-bold text-slate-500">加载中...</p>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={showUserColumn ? 5 : 4} className="px-4 py-12 text-center">
                      <BoxSelect className="w-12 h-12 mb-4 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-500">暂无积分流水</p>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="group transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDateTime(r.created_at)}
                      </td>
                      {showUserColumn ? (
                        <td className="px-4 py-3 text-slate-600">{r.username || '—'}</td>
                      ) : null}
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {reasonLabel(r.reason)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold tabular-nums ${
                            r.amount > 0 ? 'text-emerald-600' : r.amount < 0 ? 'text-red-500' : 'text-slate-500'
                          }`}
                        >
                          {r.amount > 0 ? `+${r.amount}` : r.amount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatRelated(r.related_type, r.related_id)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!loading && total > PAGE_SIZE ? (
              <Pagination
                currentPage={page}
                total={total}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointsTransactionList;
