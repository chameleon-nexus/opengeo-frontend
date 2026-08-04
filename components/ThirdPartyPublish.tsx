
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Loader2, FileText, Search, RefreshCcw } from 'lucide-react';
import { Theme } from '../types';
import {
  getThirdPartyPublishList,
  createThirdPartyPublishTask,
  updateThirdPartyPublishStatus,
  downloadThirdPartyPublishZip,
  deleteThirdPartyPublishTask,
  type ThirdPartyPublishItem,
} from '../api/thirdPartyPublish';
import { getPublishCandidates, type PublishCandidateArticle } from '../api/contentGeneration';
import { optimizationTaskAPI } from '../api/optimizationTask';
import { getMediaPublishTierOptions } from '../api/mediaPublishTier';
import MediaShowcaseLogoWall from './MediaShowcaseLogoWall';
import MediaTierSaveField from './shared/MediaTierSaveField';
import type { MediaTier, MediaTierOption } from '../constants/mediaPublishTier';
import { TP_STATUS, tpStatusBadgeClass } from '../constants/thirdPartyPublishStatus';
import ThirdPartyPublishBatchPanel, { type BatchPanelMode } from './ThirdPartyPublishBatchPanel';
import { useModuleI18n } from '../i18n/hooks';
import { ensureNamespaces } from '../i18n/loader';
import { I18nNamespace } from '../i18n/types';
import { translateTpStatus } from '../i18n/translateStatus';

/** 入口场景：商户 SaaS 前台 / 平台发稿待办后台 / 优化驾驶舱内嵌 */
export type ThirdPartyPublishPortal = 'merchantSaas' | 'adminTodo' | 'cockpitEmbed';

function resolvePortal(
  portal: ThirdPartyPublishPortal | undefined,
  readOnly: boolean | undefined,
  embedded: boolean | undefined,
): ThirdPartyPublishPortal {
  if (portal) return portal;
  if (embedded) return 'cockpitEmbed';
  if (readOnly) return 'adminTodo';
  return 'merchantSaas';
}

const formatListTime = (row: ThirdPartyPublishItem): string => {
  if (row.created_at) {
    const d = new Date(row.created_at);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    }
  }
  return row.time;
};

interface ThirdPartyPublishProps {
  theme: Theme;
  /** 入口场景（推荐显式传入）；未传时由 readOnly / embedded 推导 */
  portal?: ThirdPartyPublishPortal;
  /** @deprecated 请用 portal="adminTodo"；发稿待办后台 */
  readOnly?: boolean;
  market?: 'domestic' | 'overseas';
  /** 仅展示本 GEO 主线 workflow 下的发稿（优化驾驶舱） */
  workflowIdFilter?: string | null;
  /** 变化时重新拉取列表（如切换 Tab） */
  listRefreshKey?: number | string;
  /** 驾驶舱：关联优化任务 ID（免审核配置读写） */
  optimizationTaskId?: string | null;
  /** @deprecated 请用 portal="cockpitEmbed"；嵌入优化驾驶舱 */
  embedded?: boolean;
}

const MARKET_LABEL_KEYS: Record<'domestic' | 'overseas', { titleKey: string; subtitleKey: string }> = {
  domestic: { titleKey: 'publish.domesticTitle', subtitleKey: 'publish.domesticSubtitle' },
  overseas: { titleKey: 'publish.overseasTitle', subtitleKey: 'publish.overseasSubtitle' },
};

const ThirdPartyPublish: React.FC<ThirdPartyPublishProps> = ({
  theme,
  portal: portalProp,
  readOnly,
  market = 'domestic',
  workflowIdFilter,
  listRefreshKey,
  optimizationTaskId,
  embedded = false,
}) => {
  const { t: to } = useModuleI18n('optimization');
  const { t: tp, i18n } = useModuleI18n('publish');
  const { t: tc } = useModuleI18n('common');
  const [publishI18nReady, setPublishI18nReady] = useState(() =>
    i18n.hasResourceBundle(i18n.language, I18nNamespace.Publish),
  );

  useEffect(() => {
    if (publishI18nReady) return;
    void ensureNamespaces([I18nNamespace.Publish]).then(() => setPublishI18nReady(true));
  }, [publishI18nReady, i18n.language]);

  const portal = resolvePortal(portalProp, readOnly, embedded);
  const isMerchantPortal = portal === 'merchantSaas' || portal === 'cockpitEmbed';
  const isAdminTodoPortal = portal === 'adminTodo';
  const isCockpitEmbed = portal === 'cockpitEmbed';
  const pageShellCls = isCockpitEmbed
    ? 'w-full px-4 md:px-6 py-6 space-y-6'
    : 'max-w-7xl mx-auto px-6 py-8 space-y-6';
  const marketLabelKeys = MARKET_LABEL_KEYS[market];
  const isDark = theme === 'dark';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [candidates, setCandidates] = useState<PublishCandidateArticle[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [selectedCgIds, setSelectedCgIds] = useState<Set<string>>(new Set());
  const [articleCount, setArticleCount] = useState('10');
  const [listItems, setListItems] = useState<ThirdPartyPublishItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitPendingRowId, setSubmitPendingRowId] = useState<number | null>(null);
  const [exportingRowId, setExportingRowId] = useState<number | null>(null);
  const [deletingRowId, setDeletingRowId] = useState<number | null>(null);
  const [pageView, setPageView] = useState<'list' | 'batch'>('list');
  const [batchRow, setBatchRow] = useState<ThirdPartyPublishItem | null>(null);
  const [batchMode, setBatchMode] = useState<BatchPanelMode>('manage');
  const [listSearch, setListSearch] = useState('');
  const [skipReview, setSkipReview] = useState(false);
  const [skipReviewLoading, setSkipReviewLoading] = useState(false);
  const [skipReviewSaving, setSkipReviewSaving] = useState(false);
  const [workflowMediaTier, setWorkflowMediaTier] = useState<MediaTier>('standard');
  const [workflowMediaTierDraft, setWorkflowMediaTierDraft] = useState<MediaTier>('standard');
  const [workflowTierSaving, setWorkflowTierSaving] = useState(false);
  const [tierOptions, setTierOptions] = useState<MediaTierOption[]>([]);
  const [tierOptionsLoading, setTierOptionsLoading] = useState(false);

  const showCockpitWorkflowConfig =
    isCockpitEmbed && Boolean((optimizationTaskId || '').trim());
  const showSkipReviewToggle = showCockpitWorkflowConfig;

  const pageTitle = isAdminTodoPortal
    ? to('publish.adminTitle')
    : isCockpitEmbed
      ? to('cockpit.tabs.publish')
      : to(marketLabelKeys.titleKey);
  const pageSubtitle = isAdminTodoPortal
    ? to('publish.adminSubtitle')
    : portal === 'merchantSaas'
      ? to(marketLabelKeys.subtitleKey)
      : null;

  const cockpitWorkflowId = (workflowIdFilter || '').trim();

  const fetchList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await getThirdPartyPublishList({
        page: 1,
        page_size: 100,
        market,
        workflow_id: cockpitWorkflowId || undefined,
      });
      setListItems(res.items);
    } catch {
      setListItems([]);
    } finally {
      setListLoading(false);
    }
  }, [market, cockpitWorkflowId]);

  const filteredListItems = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return listItems;
    return listItems.filter((row) => {
      const hay = [
        row.name,
        row.keyword,
        row.status,
        formatListTime(row),
        row.count != null ? String(row.count) : '',
        row.published != null ? String(row.published) : '',
        row.selected_article_count != null ? String(row.selected_article_count) : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [listItems, listSearch]);

  useEffect(() => {
    fetchList();
  }, [fetchList, listRefreshKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setTierOptionsLoading(true);
      try {
        const items = await getMediaPublishTierOptions(market);
        if (!cancelled) setTierOptions(items);
      } catch {
        if (!cancelled) setTierOptions([]);
      } finally {
        if (!cancelled) setTierOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [market]);

  useEffect(() => {
    const tid = (optimizationTaskId || '').trim();
    if (!showCockpitWorkflowConfig || !tid) {
      setSkipReview(false);
      setWorkflowMediaTier('standard');
      setWorkflowMediaTierDraft('standard');
      return;
    }
    let cancelled = false;
    (async () => {
      setSkipReviewLoading(true);
      try {
        const task = await optimizationTaskAPI.get(tid);
        if (!cancelled) {
          const tier = (task.thirdPartyPublishMediaTier as MediaTier) || 'standard';
          setSkipReview(Boolean(task.thirdPartyPublishSkipReview));
          setWorkflowMediaTier(tier);
          setWorkflowMediaTierDraft(tier);
        }
      } catch {
        if (!cancelled) {
          setSkipReview(false);
          setWorkflowMediaTier('standard');
          setWorkflowMediaTierDraft('standard');
        }
      } finally {
        if (!cancelled) setSkipReviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showCockpitWorkflowConfig, optimizationTaskId]);

  useEffect(() => {
    if (!isModalOpen) return;
    let cancelled = false;
    (async () => {
      setLoadingCandidates(true);
      try {
        const res = await getPublishCandidates({
          search: searchApplied || undefined,
          limit: 200,
        });
        if (!cancelled) setCandidates(res.items ?? []);
      } catch {
        if (!cancelled) setCandidates([]);
      } finally {
        if (!cancelled) setLoadingCandidates(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isModalOpen, searchApplied]);

  const isMerchantUi = isMerchantPortal;

  const openBatch = (row: ThirdPartyPublishItem, mode: BatchPanelMode) => {
    setBatchRow(row);
    setBatchMode(mode);
    setPageView('batch');
  };

  const closeBatch = () => {
    setBatchRow(null);
    setPageView('list');
  };

  const handleExportRow = async (row: ThirdPartyPublishItem) => {
    setExportingRowId(row.id);
    try {
      await downloadThirdPartyPublishZip(row.id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : tp('errors.exportFailed'));
    } finally {
      setExportingRowId(null);
    }
  };

  const handleDeleteRow = async (row: ThirdPartyPublishItem) => {
    if (!window.confirm(`${tp('actions.delete')} ${row.name}?`)) return;
    setDeletingRowId(row.id);
    try {
      await deleteThirdPartyPublishTask(row.id);
      await fetchList();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : tp('errors.deleteFailed'));
    } finally {
      setDeletingRowId(null);
    }
  };

  const handleSubmitForPublish = async (row: ThirdPartyPublishItem) => {
    if (row.status !== TP_STATUS.GENERATED) return;
    if (!window.confirm(tp('confirm.submitPending'))) return;
    setSubmitPendingRowId(row.id);
    try {
      await updateThirdPartyPublishStatus(row.id, TP_STATUS.PENDING);
      await fetchList();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : tp('errors.submitFailed'));
    } finally {
      setSubmitPendingRowId(null);
    }
  };

  const canMerchantSubmit = (row: ThirdPartyPublishItem) =>
    row.status === TP_STATUS.GENERATED && isMerchantPortal;

  const canAdminProcess = (row: ThirdPartyPublishItem) =>
    (row.status === TP_STATUS.PENDING || row.status === TP_STATUS.PARTIAL) && isAdminTodoPortal;

  const canDeleteRow = (row: ThirdPartyPublishItem) =>
    isMerchantUi && row.status === TP_STATUS.GENERATED;

  const articleEntryLabel = (row: ThirdPartyPublishItem) =>
    row.status === TP_STATUS.GENERATED && isMerchantUi ? tp('actions.editArticle') : tp('actions.viewArticle');

  const toggleSelectCg = (taskId: string) => {
    setSelectedCgIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const selectAllVisible = () => {
    if (candidates.length === 0) return;
    const allSelected = candidates.every((c) => selectedCgIds.has(c.task_id));
    setSelectedCgIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        candidates.forEach((c) => next.delete(c.task_id));
      } else {
        candidates.forEach((c) => next.add(c.task_id));
      }
      return next;
    });
  };

  const handleOpenModal = () => {
    setSearchInput('');
    setSearchApplied('');
    setSelectedCgIds(new Set());
    setIsModalOpen(true);
  };

  const handleStartTrain = async () => {
    if (selectedCgIds.size < 1) return;
    const count = parseInt(articleCount, 10);
    if (Number.isNaN(count) || count < 1) return;
    setSubmitLoading(true);
    try {
      await createThirdPartyPublishTask({
        content_generation_task_ids: Array.from(selectedCgIds),
        article_count: count,
        market,
        optimization_task_id: showSkipReviewToggle ? optimizationTaskId?.trim() || undefined : undefined,
        workflow_id: cockpitWorkflowId || undefined,
      });
      setIsModalOpen(false);
      await fetchList();
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSaveWorkflowMediaTier = async () => {
    const tid = (optimizationTaskId || '').trim();
    if (!tid || workflowTierSaving || workflowMediaTierDraft === workflowMediaTier) return;
    setWorkflowTierSaving(true);
    try {
      await optimizationTaskAPI.patch(tid, { third_party_publish_media_tier: workflowMediaTierDraft });
      setWorkflowMediaTier(workflowMediaTierDraft);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : tp('errors.saveFailed'));
    } finally {
      setWorkflowTierSaving(false);
    }
  };

  const handleSkipReviewToggle = async (next: boolean) => {
    const tid = (optimizationTaskId || '').trim();
    if (!tid || skipReviewSaving) return;
    setSkipReviewSaving(true);
    try {
      await optimizationTaskAPI.patch(tid, { third_party_publish_skip_review: next });
      setSkipReview(next);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : tp('errors.saveFailed'));
    } finally {
      setSkipReviewSaving(false);
    }
  };

  const toolbarBorder = isDark ? 'border-zinc-700/80' : 'border-gray-100';
  const listColCount = isAdminTodoPortal ? 8 : 10;
  const searchInputCls = isDark
    ? 'w-full min-w-[11rem] max-w-xs pl-7 pr-2 py-1.5 text-xs rounded-lg border border-zinc-600 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/25 focus:border-[#E8553F]/50'
    : 'w-full min-w-[11rem] max-w-xs pl-7 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50';

  if (pageView === 'batch' && batchRow) {
    if (!publishI18nReady) {
      return (
        <div className={`flex flex-1 items-center justify-center min-h-[12rem] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          <Loader2 className="w-6 h-6 animate-spin opacity-60" />
        </div>
      );
    }
    return (
      <div
        className={`flex-1 flex flex-col h-full min-h-0 overflow-hidden ${
          isDark ? 'bg-geo-bg text-white' : 'bg-[#F5F5F7] text-slate-900'
        }`}
      >
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <ThirdPartyPublishBatchPanel
            theme={theme}
            embedded={isCockpitEmbed}
            row={batchRow}
            mode={batchMode}
            market={market}
            onBack={closeBatch}
            onRefreshList={() => void fetchList()}
          />
        </div>
      </div>
    );
  }

  if (!publishI18nReady) {
    return (
      <div
        className={`flex flex-1 items-center justify-center min-h-[12rem] ${
          isDark ? 'bg-geo-bg text-zinc-400' : 'bg-[#F5F5F7] text-slate-500'
        }`}
      >
        <Loader2 className="w-6 h-6 animate-spin opacity-60" />
      </div>
    );
  }

  return (
    <div
      className={`flex-1 flex flex-col h-full min-h-0 overflow-hidden transition-colors duration-500 ${
        isDark ? 'bg-geo-bg text-white' : 'bg-[#F5F5F7] text-slate-900'
      }`}
    >
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className={pageShellCls}>
          <div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{pageTitle}</h1>
            {pageSubtitle ? (
              <p className={`mt-1 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{pageSubtitle}</p>
            ) : null}
          </div>

          {!isAdminTodoPortal ? <MediaShowcaseLogoWall theme={theme} market={market} /> : null}

          {showCockpitWorkflowConfig ? (
            <div
              className={`rounded-xl border px-4 py-4 space-y-4 ${
                isDark ? 'border-zinc-700 bg-zinc-900/40' : 'border-gray-200 bg-white'
              }`}
            >
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                  {tp('workflowConfig.title')}
                </p>
                <p className={`mt-0.5 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                  {tp('workflowConfig.hint')}
                </p>
              </div>
              <div>
                <p className={`mb-2 text-xs font-semibold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  {tp('workflowConfig.defaultTier')}
                </p>
                <MediaTierSaveField
                  theme={theme}
                  options={tierOptions}
                  value={workflowMediaTierDraft}
                  onChange={(t) => {
                    if (t) setWorkflowMediaTierDraft(t);
                  }}
                  onSave={handleSaveWorkflowMediaTier}
                  saving={workflowTierSaving}
                  dirty={workflowMediaTierDraft !== workflowMediaTier}
                  disabled={skipReviewLoading}
                  loading={tierOptionsLoading || skipReviewLoading}
                  saveLabel={tp('actions.saveWorkflowTier')}
                  market={market}
                />
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm min-w-0">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                  checked={skipReview}
                  disabled={skipReviewLoading || skipReviewSaving}
                  onChange={(e) => void handleSkipReviewToggle(e.target.checked)}
                />
                <span className={isDark ? 'text-zinc-200' : 'text-slate-800'}>
                  <span className="font-semibold">{tp('workflowConfig.skipReview')}</span>
                  <span className={`mt-0.5 block text-xs font-normal ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                    {tp('workflowConfig.skipReviewHint')}
                  </span>
                </span>
              </label>
              {skipReviewSaving || workflowTierSaving ? (
                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{tp('workflowConfig.saving')}</p>
              ) : null}
            </div>
          ) : null}

          <div
            className={`rounded-2xl border overflow-hidden shadow-sm transition-colors ${
              isDark ? 'bg-zinc-900/40 border-zinc-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b ${toolbarBorder}`}>
              <div className="relative shrink-0 flex-1 min-w-[10rem] max-w-xs">
                <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-gray-300'}`} />
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder={isAdminTodoPortal ? tp('form.searchAdmin') : tp('form.searchMerchant')}
                  className={searchInputCls}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 ml-auto sm:ml-0">
                {portal === 'merchantSaas' && (
                  <button
                    type="button"
                    onClick={handleOpenModal}
                    className="btn-geo-primary shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold"
                  >
                    {tp('pageTitle')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void fetchList()}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                    isDark ? 'text-zinc-400 hover:text-[#E8553F] hover:bg-[#E8553F]/10' : 'text-gray-400 hover:text-[#E8553F] hover:bg-[#FFF6F2]'
                  }`}
                  title={tp('actions.refresh')}
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${listLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table
                className={`w-full text-left border-collapse ${isAdminTodoPortal ? 'min-w-[60rem]' : 'min-w-[1100px]'}`}
              >
                <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3 w-[16rem] min-w-[16rem] max-w-[20rem]">{tp('table.taskName')}</th>
                    {!isAdminTodoPortal ? <th className="px-4 py-3">{tp('table.keywords')}</th> : null}
                    <th className="px-4 py-3">{tp('table.content')}</th>
                    {!isAdminTodoPortal ? <th className="px-4 py-3 min-w-[7rem]">{tp('table.entry')}</th> : null}
                    <th className="px-4 py-3">{tp('table.articleCount')}</th>
                    <th className="px-4 py-3">{tp('status.published')}</th>
                    <th className="px-4 py-3">{tp('table.status')}</th>
                    <th className="px-4 py-3">{tp('table.createdAt')}</th>
                    <th className="px-4 py-3 text-right">{tp('table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {listLoading ? (
                    <tr>
                      <td colSpan={listColCount} className="px-4 py-12 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-6 h-6 animate-spin opacity-60" />
                          <span className="opacity-60">{tc('actions.loading')}</span>
                        </div>
                      </td>
                    </tr>
                  ) : listItems.length === 0 ? (
                    <tr>
                      <td colSpan={listColCount} className="px-4 py-12 text-center text-xs opacity-60">
                        {cockpitWorkflowId
                          ? tp('empty.noWorkflowTasks')
                          : `${tp('empty.noArticles')}${isAdminTodoPortal ? '' : ` · ${tp('pageTitle')}`}`}
                      </td>
                    </tr>
                  ) : filteredListItems.length === 0 ? (
                    <tr>
                      <td colSpan={listColCount} className="px-4 py-12 text-center text-xs text-gray-400">
                        {tp('empty.noTasks')}
                      </td>
                    </tr>
                  ) : (
                    filteredListItems.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`transition-colors group ${isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-[#FFF9F6]/80'}`}
                      >
                        <td className="px-4 py-3 font-mono opacity-50">{idx + 1}</td>
                        <td className="px-4 py-3 w-[16rem] min-w-[16rem] max-w-[20rem]">
                          <div
                            className={`max-w-[20rem] truncate whitespace-nowrap font-bold ${isDark ? 'text-zinc-200' : 'text-slate-700'}`}
                            title={row.name}
                          >
                            {row.name}
                          </div>
                        </td>
                        {!isAdminTodoPortal ? (
                          <td className={`px-4 py-3 font-bold ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                            {row.keyword}
                          </td>
                        ) : null}
                        <td className="px-4 py-3 font-mono font-bold">
                          {row.selected_article_count != null && row.selected_article_count > 0
                            ? tp('workflowConfig.articleUnit', { count: row.selected_article_count })
                            : '—'}
                        </td>
                        {!isAdminTodoPortal ? (
                          <td
                            className={`px-4 py-3 text-xs font-medium max-w-[10rem] ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}
                            title={row.mediaWhitelistSummary || ''}
                          >
                            <div className="line-clamp-2">
                              {row.mediaWhitelistSummary ||
                                (row.mediaWhitelistLabels?.length
                                  ? row.mediaWhitelistLabels.join('、')
                                  : '—')}
                            </div>
                          </td>
                        ) : null}
                        <td className="px-4 py-3 font-mono font-bold">
                          {tp('workflowConfig.articleUnit', { count: row.count })}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold">
                          {tp('workflowConfig.articleUnit', { count: row.published })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={tpStatusBadgeClass(row.status, isDark)}>
                            {translateTpStatus(row.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs opacity-70 whitespace-nowrap">{formatListTime(row)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 text-xs font-semibold">
                            {isMerchantUi ? (
                              <>
                                <button
                                  type="button"
                                  disabled={exportingRowId === row.id}
                                  onClick={() => void handleExportRow(row)}
                                  className="text-slate-600 hover:text-slate-800 disabled:opacity-50"
                                >
                                  {exportingRowId === row.id ? tp('actions.exporting') : tp('actions.export')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openBatch(row, 'manage')}
                                  className="text-indigo-600 hover:text-indigo-500"
                                >
                                  {articleEntryLabel(row)}
                                </button>
                              </>
                            ) : null}
                            {canMerchantSubmit(row) ? (
                              <button
                                type="button"
                                disabled={submitPendingRowId === row.id}
                                onClick={() => void handleSubmitForPublish(row)}
                                className="text-violet-600 hover:text-violet-500 disabled:opacity-50"
                              >
                                {submitPendingRowId === row.id ? tp('actions.submitting') : tp('actions.submitPending')}
                              </button>
                            ) : null}
                            {canAdminProcess(row) ? (
                              <button
                                type="button"
                                onClick={() => openBatch(row, 'admin')}
                                className="text-blue-500 hover:text-blue-400"
                              >
                                {tp('workflowConfig.process')}
                              </button>
                            ) : null}
                            {canDeleteRow(row) ? (
                              <button
                                type="button"
                                disabled={deletingRowId === row.id}
                                onClick={() => void handleDeleteRow(row)}
                                className="text-red-500 hover:text-red-400 disabled:opacity-50"
                              >
                                {deletingRowId === row.id ? tp('actions.deleting') : tp('actions.delete')}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[2.5rem] shadow-sm overflow-hidden animate-in zoom-in-95 duration-300 ${isDark ? 'bg-[#1e1e1e] border border-white/10' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-6 md:p-8 border-b flex justify-between items-center shrink-0 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
              <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{tp('pageTitle')}</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-500' : 'hover:bg-slate-100 text-slate-400'}`}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className={`p-6 md:p-8 space-y-6 flex-1 min-h-0 flex flex-col overflow-hidden`}>
              <div className="space-y-2 shrink-0">
                <label className={`flex items-center gap-2 text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                  <FileText className="w-3.5 h-3.5" /> {tp('workflowConfig.selectArticles')}
                </label>
                <div className="flex gap-2">
                  <div className={`relative flex-1 flex items-center gap-2 px-4 py-2 rounded-2xl border ${isDark ? 'bg-zinc-900/50 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                    <Search className="w-4 h-4 opacity-50 shrink-0" />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && setSearchApplied(searchInput.trim())}
                      placeholder={tp('form.searchArticle')}
                      className={`flex-1 bg-transparent outline-none text-sm font-medium ${isDark ? 'text-white placeholder:text-zinc-600' : 'text-slate-900 placeholder:text-slate-400'}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchApplied(searchInput.trim())}
                    className="px-4 py-2 rounded-2xl text-sm font-bold bg-gradient-coral text-white shadow-coral hover:opacity-95 shrink-0"
                  >
                    {tp('actions.search')}
                  </button>
                  <button
                    type="button"
                    onClick={selectAllVisible}
                    className={`px-3 py-2 rounded-2xl text-xs font-bold border shrink-0 ${isDark ? 'border-white/10 text-zinc-300' : 'border-slate-200 text-slate-600'}`}
                  >
                    {tp('workflowConfig.selectAllPage')}
                  </button>
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                  {tp('workflowConfig.allCompletedArticles', { total: candidates.length })}
                  {selectedCgIds.size > 0 ? tp('workflowConfig.selectedCount', { count: selectedCgIds.size }) : ''}
                </p>
              </div>

              <div
                className={`flex-1 min-h-[200px] max-h-[42vh] overflow-y-auto rounded-2xl border ${isDark ? 'border-white/10 bg-zinc-900/30' : 'border-slate-200 bg-slate-50'}`}
              >
                {loadingCandidates ? (
                  <div className="flex items-center justify-center gap-2 py-16">
                    <Loader2 className="w-6 h-6 animate-spin opacity-60" />
                    <span className="text-sm opacity-60">{tc('actions.loading')}</span>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="p-8 text-center text-sm opacity-60">{tp('empty.noArticles')}</div>
                ) : (
                  <ul className="divide-y divide-slate-200/10">
                    {candidates.map((c) => {
                      const checked = selectedCgIds.has(c.task_id);
                      return (
                        <li
                          key={c.task_id}
                          onClick={() => toggleSelectCg(c.task_id)}
                          className={`px-4 py-3 cursor-pointer flex gap-3 items-start transition-colors ${checked ? (isDark ? 'bg-blue-500/10' : 'bg-blue-50') : isDark ? 'hover:bg-white/5' : 'hover:bg-white'}`}
                        >
                          <input
                            type="checkbox"
                            readOnly
                            checked={checked}
                            className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>{c.title}</p>
                            {c.summary && <p className="text-xs mt-1 line-clamp-2 opacity-75">{c.summary}</p>}
                            <p className="text-[10px] font-mono mt-1 opacity-40 truncate">{c.task_id}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-3 shrink-0">
                <label className={`text-xs font-semibold ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                  {tp('workflowConfig.publishCountLabel')}
                </label>
                <div className="relative group">
                  <input
                    type="number"
                    min={1}
                    value={articleCount}
                    onChange={(e) => setArticleCount(e.target.value)}
                    className={`w-full p-4 rounded-2xl border outline-none font-mono font-semibold transition-all
                      ${isDark ? 'bg-zinc-900/50 border-white/10 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}
                    `}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold opacity-30 ">
                    {tp('workflowConfig.articleSuffix')}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-4 shrink-0">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={`flex-1 py-4 rounded-lg font-semibold text-xs transition-all ${isDark ? 'bg-zinc-800 text-zinc-400 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {tc('actions.cancel')}
                </button>
                <button
                  onClick={handleStartTrain}
                  disabled={selectedCgIds.size < 1 || submitLoading}
                  className="flex-1 py-4 rounded-lg font-semibold text-xs bg-gradient-coral text-white shadow-xl shadow-coral hover:opacity-95 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {submitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {tp('workflowConfig.startTraining')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThirdPartyPublish;
