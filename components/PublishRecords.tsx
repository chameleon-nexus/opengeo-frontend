import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Loader2, Send, RefreshCcw, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Theme, Brand } from '../types';
import ArticlePublishPage from './ArticlePublishPage';
import { getPublishRecords, retryPublishRecord, PublishRecord } from '../api/publish';
import { useModuleI18n } from '../i18n/hooks';

interface PublishRecordsProps {
  theme: Theme;
  currentBrand: Brand | null;
  /** 自 GEO 智能优化节点跳转：仅显示该任务周期关联过的发布记录 */
  initialOptimizationTaskIdFilter?: string | null;
  onInitialOptimizationTaskFilterConsumed?: () => void;
}

const PublishRecords: React.FC<PublishRecordsProps> = ({
  theme,
  currentBrand,
  initialOptimizationTaskIdFilter,
  onInitialOptimizationTaskFilterConsumed,
}) => {
  const { t } = useModuleI18n('publish');
  const isDark = theme === 'dark';
  /** 图文：走内容生成 + OAuth 账号发稿页 */
  const [view, setView] = useState<'records' | 'image_text_publish'>('records');
  const [records, setRecords] = useState<PublishRecord[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [optimizationTaskFilterId, setOptimizationTaskFilterId] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [isDraftOnly, setIsDraftOnly] = useState(false);

  useEffect(() => {
    if (!initialOptimizationTaskIdFilter?.trim()) return;
    setOptimizationTaskFilterId(initialOptimizationTaskIdFilter.trim());
    onInitialOptimizationTaskFilterConsumed?.();
  }, [initialOptimizationTaskIdFilter, onInitialOptimizationTaskFilterConsumed]);

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const res = await getPublishRecords({
        status: isDraftOnly ? 'pending' : undefined,
        optimization_task_id: optimizationTaskFilterId ?? undefined,
        limit: 50,
        offset: 0,
      });
      setRecords(res.records);
      setRecordsTotal(res.total);
    } catch (_) {
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }, [isDraftOnly, optimizationTaskFilterId]);

  useEffect(() => {
    if (view !== 'records') return;
    void loadRecords();
  }, [view, loadRecords]);

  const displayRecords = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const hay = [
        r.keyword_text,
        r.content_generation_task_id,
        r.article_preview,
        r.account_nickname,
        r.account_platform,
        r.platform_status_label,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [records, listSearch]);

  const handleRetry = async (r: PublishRecord) => {
    if (r.status !== 'pending') return;
    setRetryingId(r.id);
    try {
      await retryPublishRecord(r.id);
      await loadRecords();
    } catch (e) {
      alert((e as Error)?.message || t('publishRecords.retryFailed'));
    } finally {
      setRetryingId(null);
    }
  };

  const toolbarBorder = isDark ? 'border-zinc-700/80' : 'border-gray-100';
  const searchInputCls = isDark
    ? 'w-full min-w-[11rem] max-w-xs pl-7 pr-2 py-1.5 text-xs rounded-lg border border-zinc-600 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/25 focus:border-[#E8553F]/50'
    : 'w-full min-w-[11rem] max-w-xs pl-7 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50';

  if (view === 'image_text_publish') {
    return (
      <ArticlePublishPage
        theme={theme}
        currentBrand={currentBrand}
        onBack={() => setView('records')}
      />
    );
  }

  return (
    <div className={`min-h-0 flex-1 overflow-y-auto no-scrollbar transition-colors duration-500 ${isDark ? 'bg-geo-bg text-white' : 'bg-[#F5F5F7] text-slate-900'}`}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('publishRecords.pageTitle')}</h2>
            <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800 ring-1 ring-teal-200/80">
              {t('publishRecords.overseasBadge')}
            </span>
          </div>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{t('publishRecords.pageSubtitle')}</p>
        </div>

        {optimizationTaskFilterId ? (
          <div
            className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-sm ${
              isDark ? 'border-amber-900/50 bg-amber-950/40 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            <span>
              {t('publishRecords.filterHint', { taskId: optimizationTaskFilterId })}
            </span>
            <button
              type="button"
              className={`font-semibold underline underline-offset-2 ${isDark ? 'text-amber-200 hover:text-white' : 'text-amber-800 hover:text-amber-950'}`}
              onClick={() => setOptimizationTaskFilterId(null)}
            >
              {t('publishRecords.clearFilter')}
            </button>
          </div>
        ) : null}

        <section className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-zinc-900/40 border-zinc-700' : 'bg-white border-gray-200'}`}>
          <div className={`space-y-3 px-5 py-4 border-b ${toolbarBorder}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative shrink-0 flex-1 min-w-[10rem] max-w-xs">
                <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-gray-300'}`} />
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder={t('publishRecords.searchPlaceholder')}
                  className={searchInputCls}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 ml-auto sm:ml-0">
                <button
                  type="button"
                  onClick={() => setView('image_text_publish')}
                  className="btn-geo-primary shrink-0 inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> {t('publishRecords.newPublish')}
                </button>
                <button
                  type="button"
                  onClick={() => void loadRecords()}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${isDark ? 'text-zinc-400 hover:text-[#E8553F] hover:bg-[#E8553F]/10' : 'text-gray-400 hover:text-[#E8553F] hover:bg-[#FFF6F2]'}`}
                  title={t('publishRecords.refreshList')}
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${recordsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all shrink-0 ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-white border-gray-200 text-slate-600'
                }`}
              >
                {t('publishRecords.allPublishTypes')} <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </button>
              <button
                type="button"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all shrink-0 ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-300' : 'bg-white border-gray-200 text-slate-600'
                }`}
              >
                {t('publishRecords.allPushStatus')} <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </button>
              <label className="flex items-center gap-2 cursor-pointer ml-auto sm:ml-0">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsDraftOnly(!isDraftOnly)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsDraftOnly(!isDraftOnly);
                    }
                  }}
                  className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center shrink-0 ${
                    isDraftOnly
                      ? isDark
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-blue-600 border-blue-600 shadow-md'
                      : isDark
                        ? 'border-zinc-700 bg-zinc-900'
                        : 'border-slate-300 bg-white'
                  }`}
                >
                  {isDraftOnly && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                </div>
                <span className={`text-xs font-semibold ${isDraftOnly ? (isDark ? 'text-blue-400' : 'text-blue-600') : isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                  {t('publishRecords.draftOnly')}
                </span>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">{t('publishRecords.articleKeyword')}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t('publishRecords.account')}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t('publishRecords.status')}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t('publishRecords.platformStatus')}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t('publishRecords.createdAt')}</th>
                  <th className="text-left px-4 py-3 font-semibold">{t('publishRecords.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {recordsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <Loader2 className={`w-5 h-5 animate-spin inline-block mr-2 align-middle ${isDark ? 'text-zinc-400' : 'text-gray-400'}`} />
                      <span className={isDark ? 'text-zinc-500' : 'text-gray-500'}>{t('publishRecords.loading')}</span>
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <p className={`text-sm font-medium ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>{t('publishRecords.emptyHint')}</p>
                    </td>
                  </tr>
                ) : displayRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-xs text-gray-400">
                      {t('publishRecords.noMatch')}
                    </td>
                  </tr>
                ) : (
                  displayRecords.map((r) => (
                    <tr key={r.id} className={isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-[#FFF9F6]/80'}>
                      <td className="py-3 px-4">
                        <div className={isDark ? 'text-white' : 'text-slate-900'}>{r.keyword_text || r.content_generation_task_id}</div>
                        {r.article_preview && (
                          <div className={`text-xs mt-0.5 truncate max-w-md ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{r.article_preview}</div>
                        )}
                      </td>
                      <td className={`py-3 px-4 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>{r.account_nickname || r.account_platform || '-'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium
                                            ${r.status === 'success' ? 'bg-green-500/20 text-green-600' : ''}
                                            ${r.status === 'failed' ? 'bg-red-500/20 text-red-600' : ''}
                                            ${r.status === 'pending' ? (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/20 text-amber-700') : ''}
                                            ${r.status === 'submitted' ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-500/20 text-blue-700') : ''}
                                        `}
                        >
                          {t(`publishRecords.recordStatus.${r.status}`, { defaultValue: r.status })}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{r.platform_status_label ?? '-'}</td>
                      <td className={`py-3 px-4 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                      <td className="py-3 px-4">
                        {r.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleRetry(r)}
                            disabled={retryingId === r.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                                                    ${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-[#FFF6F2] text-[#E8553F] hover:bg-[#ffe8df]'}
                                                    disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {retryingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            {t('publishRecords.retrySend')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!recordsLoading && records.length > 0 && recordsTotal > records.length && (
            <div className={`py-2 px-5 text-xs border-t ${toolbarBorder} ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
              {t('publishRecords.totalLoaded', { total: recordsTotal, loaded: records.length })}
              {listSearch.trim() ? t('publishRecords.localFilter', { count: displayRecords.length }) : ''}
            </div>
          )}
          {!recordsLoading && records.length > 0 && recordsTotal <= records.length && listSearch.trim() && (
            <div className={`py-2 px-5 text-xs border-t ${toolbarBorder} ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
              {t('publishRecords.localFilterOnly', { filtered: displayRecords.length, total: records.length })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default PublishRecords;
