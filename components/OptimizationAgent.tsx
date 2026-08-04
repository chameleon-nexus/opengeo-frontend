import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  Plus,
  Clock,
  ArrowRight,
  BoxSelect,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { Theme } from '../types';
import { optimizationTaskAPI, type OptimizationTaskDTO } from '../api/optimizationTask';
import Pagination from './Pagination';
import { useModuleI18n } from '../i18n/hooks';
import type { TFunction } from 'i18next';

interface OptimizationAgentProps {
  theme: Theme;
  /** 创建周期优化：跳转「优化任务」新建表单 */
  onCreateMonitoringOptimization: () => void;
  /** 查看某条周期任务详情：跳转「优化任务」详情 */
  onOpenTaskDetail: (taskId: string) => void;
}

const PAGE_SIZE = 20;

function formatDt(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
}

function scheduleLabel(t: OptimizationTaskDTO, tr: TFunction<'agent'>): string {
  const c = t.scheduleCycle || '';
  if (c === 'hourly_6') return tr('optimizationAgent.schedule.hourly6');
  if (c === 'weekly') return `${tr('optimizationAgent.schedule.weekly')} · ${t.scheduleHour ?? '—'}`;
  return `${tr('optimizationAgent.schedule.daily')} · ${t.scheduleHour ?? '—'}`;
}

function statusBadge(status: string, tr: TFunction<'agent'>) {
  const label = tr(`optimizationAgent.status.${status}`, { defaultValue: status });
  const map: Record<string, { cls: string }> = {
    running: { cls: 'bg-blue-100 text-blue-700' },
    paused: { cls: 'bg-amber-100 text-amber-800' },
    accepted: { cls: 'bg-green-100 text-green-700' },
    failed: { cls: 'bg-red-100 text-red-700' },
    stopped: { cls: 'bg-slate-200 text-slate-800' },
    expired: { cls: 'bg-orange-100 text-orange-800' },
    pending: { cls: 'bg-slate-100 text-slate-600' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1.5 ${s.cls}`}>
      {status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {status === 'accepted' && <CheckCircle2 className="w-3.5 h-3.5" />}
      {(status === 'failed' || status === 'paused' || status === 'stopped' || status === 'expired') && (
        <AlertCircle className="w-3.5 h-3.5" />
      )}
      {label}
    </span>
  );
}

/**
 * 优化智能体：周期优化任务列表（布局与「内容生成」列表页一致）
 */
const OptimizationAgent: React.FC<OptimizationAgentProps> = ({
  theme,
  onCreateMonitoringOptimization,
  onOpenTaskDetail,
}) => {
  const { t } = useModuleI18n('agent');
  const isDark = theme === 'dark';
  const [items, setItems] = useState<OptimizationTaskDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [archiveBusyId, setArchiveBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await optimizationTaskAPI.list();
      setItems(res.items ?? []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t('optimizationAgent.errors.loadFailed'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        (item.brandName || '').toLowerCase().includes(q) ||
        (item.taskId || '').toLowerCase().includes(q) ||
        (item.coreKeywords || []).some((k) => String(k).toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const totalFiltered = filtered.length;
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSearch = () => {
    setCurrentPage(1);
    setSearchQuery(searchInput.trim());
  };
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleArchive = async (taskId: string) => {
    if (
      !confirm(t('optimizationAgent.confirm.remove'))
    ) {
      return;
    }
    setArchiveBusyId(taskId);
    try {
      await optimizationTaskAPI.archive(taskId);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t('optimizationAgent.errors.deleteFailed'));
    } finally {
      setArchiveBusyId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 flex flex-col overflow-hidden relative h-full bg-white">
        <div className="flex-1 p-8 lg:p-12 overflow-y-auto no-scrollbar">
          <div className="max-w-[1400px] mx-auto space-y-10">
            <div className="flex justify-between items-end">
              <div className="space-y-3">
                <h2 className="text-4xl font-semibold tracking-tight text-slate-900">{t('optimizationAgent.pageTitle')}</h2>
                <p className="text-sm text-slate-500">{t('optimizationAgent.subtitleDetail')}</p>
              </div>
              <button
                type="button"
                onClick={onCreateMonitoringOptimization}
                className="flex items-center gap-3 px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-sm hover-scale bg-gradient-coral text-white shadow-coral hover:opacity-95"
              >
                <Plus className="w-5 h-5" /> {t('optimizationAgent.createMonitoring')}
              </button>
            </div>

            {err ? (
              <p className="text-sm font-medium text-red-600">{err}</p>
            ) : null}

            <div className="p-4 rounded-2xl border flex items-center gap-4 bg-white border-slate-200 shadow-sm">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-3.5 w-5 h-5 transition-colors text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={t('optimizationAgent.form.searchPlaceholder')}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border outline-none font-bold transition-all bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                className="p-3.5 rounded-xl border transition-colors border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => void load()}
                className="p-3.5 rounded-xl border transition-colors border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="rounded-2xl border overflow-hidden shadow-sm bg-white border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">{t('optimizationAgent.table.brand')}</th>
                    <th className="px-4 py-3">{t('optimizationAgent.table.taskId')}</th>
                    <th className="px-4 py-3">{t('optimizationAgent.table.schedule')}</th>
                    <th className="px-4 py-3">{t('optimizationAgent.table.nextRun')}</th>
                    <th className="px-4 py-3">{t('optimizationAgent.table.status')}</th>
                    <th className="px-4 py-3 text-right">{t('optimizationAgent.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
                        <p className="text-sm font-bold text-slate-500">{t('optimizationAgent.loading')}</p>
                      </td>
                    </tr>
                  ) : pageItems.length > 0 ? (
                    pageItems.map((item) => (
                      <tr key={item.taskId} className="group transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-700 truncate max-w-[180px] block">{item.brandName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm px-3 py-1.5 rounded border border-slate-200 bg-slate-50 text-slate-900">
                            {item.taskId}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-700">{scheduleLabel(item, t)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium flex items-center gap-2 text-slate-600">
                            <Clock className="w-4 h-4 shrink-0" />
                            {formatDt(item.nextCycleAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{statusBadge(item.status, t)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenTaskDetail(item.taskId)}
                              className="p-3.5 rounded-2xl transition-all hover-scale border bg-slate-100 text-slate-400 hover:text-blue-600 border-slate-200"
                              aria-label={t('optimizationAgent.actions.view')}
                            >
                              <ArrowRight className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              disabled={archiveBusyId === item.taskId}
                              onClick={() => void handleArchive(item.taskId)}
                              className="p-3.5 rounded-2xl transition-all hover-scale border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                              aria-label={t('optimizationAgent.actions.remove')}
                              title={t('optimizationAgent.actions.remove')}
                            >
                              {archiveBusyId === item.taskId ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <Trash2 className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <BoxSelect className="w-12 h-12 mb-4 text-slate-400 mx-auto" />
                        <p className="text-sm font-bold text-slate-500">
                          {items.length > 0 && searchQuery ? t('optimizationAgent.empty.noResults') : t('optimizationAgent.empty.noData')}
                        </p>
                        <p className="text-xs mt-2 text-slate-400">
                          {items.length > 0 && searchQuery ? t('optimizationAgent.empty.noResultsHint') : t('optimizationAgent.empty.noDataHint')}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <Pagination
                currentPage={currentPage}
                total={totalFiltered}
                pageSize={PAGE_SIZE}
                onPageChange={setCurrentPage}
                isDark={isDark}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationAgent;
