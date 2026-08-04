import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../../api/geoWorkflow';
import { geoWorkflowListPhaseLabel, getWorkflowReportTaskId } from '../geoWorkflowShared';
import type { SelectedBrand } from './types';

const PAGE_SIZE = 5;

function fmtTime(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface Props {
  brand: SelectedBrand;
  onCancel: () => void;
  /** 打开该工作流最新分析报告（全页诊断报告） */
  onOpenReport: (reportTaskId: string) => void;
}

/**
 * 按品牌拉取历史 GEO 工作流，点击有报告的项进入最新分析报告页
 */
const HistoryReportModal: React.FC<Props> = ({ brand, onCancel, onOpenReport }) => {
  const [page, setPage] = useState(0);
  const [items, setItems] = useState<GeoWorkflowDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await geoWorkflowAPI.list({
        brand_id: brand.id,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        scope: 'mine',
      });
      setItems(res.items ?? []);
      setTotal(typeof res.total === 'number' ? res.total : 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '加载失败');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [brand.id, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE) || 1);
  const canPrev = page > 0;
  const canNext = (page + 1) * PAGE_SIZE < total;

  const handleOpen = async (wf: GeoWorkflowDTO) => {
    let taskId = getWorkflowReportTaskId(wf);
    if (!taskId) {
      setOpeningId(wf.workflowId);
      try {
        const detail = await geoWorkflowAPI.get(wf.workflowId);
        taskId = getWorkflowReportTaskId(detail);
      } catch {
        taskId = null;
      } finally {
        setOpeningId(null);
      }
    }
    if (!taskId) return;
    onOpenReport(taskId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <div className="text-sm font-semibold text-gray-900">历史报告</div>
            <div className="mt-0.5 text-[11px] text-gray-400">
              品牌：{brand.name} · 按最近更新时间倒序，有报告可点击查看
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-xs">加载中…</span>
            </div>
          ) : error ? (
            <div className="text-center text-sm text-red-500 py-8">{error}</div>
          ) : items.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-12">该品牌暂无优化工作流</div>
          ) : (
            <ul className="space-y-2">
              {items.map((wf) => {
                const reportTaskId = getWorkflowReportTaskId(wf);
                const hasReport = Boolean(reportTaskId);
                const isOpening = openingId === wf.workflowId;

                if (!hasReport) {
                  return (
                    <li
                      key={wf.workflowId}
                      className="rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 opacity-80"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-gray-700 truncate min-w-0 block">
                            {wf.brandName}
                          </span>
                          {wf.productName ? (
                            <span className="text-xs text-gray-500 mt-0.5 block truncate">
                              产品：{wf.productName}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[11px] text-gray-400 shrink-0">更新 {fmtTime(wf.updatedAt)}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <span className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-gray-500">
                          {geoWorkflowListPhaseLabel(wf)} · {wf.phaseStatus}
                        </span>
                        <span className="text-gray-400">暂无报告</span>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={wf.workflowId}>
                    <button
                      type="button"
                      disabled={isOpening}
                      onClick={() => void handleOpen(wf)}
                      className="w-full text-left rounded-xl border border-gray-100 bg-gray-50/80 hover:bg-[#FFF9F6] hover:border-[#E8553F]/30 px-4 py-3 transition-colors disabled:opacity-60"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate min-w-0 block">
                            {wf.brandName}
                          </span>
                          {wf.productName ? (
                            <span className="text-xs text-gray-600 mt-0.5 block truncate">
                              产品：{wf.productName}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-[11px] text-gray-400 shrink-0">
                          {isOpening ? (
                            <span className="inline-flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              打开中…
                            </span>
                          ) : (
                            <>更新 {fmtTime(wf.updatedAt)}</>
                          )}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                        <span className="font-mono text-[10px] text-gray-400 truncate max-w-full">
                          {wf.workflowId}
                        </span>
                        <span className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-gray-700">
                          {geoWorkflowListPhaseLabel(wf)} · {wf.phaseStatus}
                        </span>
                        {wf.cycleMode ? (
                          <span className="text-gray-400">
                            {wf.cycleMode === 'full' ? '全周期' : '半周期'}
                          </span>
                        ) : null}
                        <span className="ml-auto text-[#E8553F] font-medium">查看报告</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {total > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-t border-gray-100 text-[11px] text-gray-500 shrink-0">
            <span>
              共 {total} 条 · 第 {page + 1} / {totalPages} 页
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={!canPrev || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-0.5 rounded-lg border border-gray-200 px-2 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                上一页
              </button>
              <button
                type="button"
                disabled={!canNext || loading}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-0.5 rounded-lg border border-gray-200 px-2 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                下一页
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default HistoryReportModal;
