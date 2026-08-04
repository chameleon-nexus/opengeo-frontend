
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Clock, CheckCircle2, ArrowRight, BoxSelect, ArrowLeft, Copy, Check, Loader2, AlertCircle, Filter, RefreshCcw, Download } from 'lucide-react';
import { Theme, Brand, ContentGenerationTask, ContentGenerationBatch } from '../types';
import { getBatchHistory, getBatchDetail, getGenerationDetail, downloadArticleDocx, downloadBatchZip } from '../api/contentGeneration';
import { copyToClipboard } from '../utils/clipboard';
import { useModuleI18n } from '../i18n/hooks';
import Pagination from './Pagination';

interface GenerateListProps {
  theme: Theme;
  onNewTask: (productId?: string | null) => void;
  currentBrand?: Brand | null;
  allBrands?: Brand[];
  onBrandChange?: (brand: Brand) => void;
  onNavigateToBrandManagement?: () => void;
  initialProduct?: string | null;
  /** 自 GEO 智能优化节点跳转：仅显示该优化任务周期内容批次（OPT-{id}-*） */
  initialOptimizationTaskIdFilter?: string | null;
  onInitialOptimizationTaskFilterConsumed?: () => void;
  /** 工作台模式：锁定优化任务 ID，不可清除筛选，精简工具栏 */
  lockedOptimizationTaskId?: string | null;
  /** 进入模块后直接打开指定内容任务详情（CG-…） */
  initialContentTaskId?: string | null;
  onInitialContentTaskConsumed?: () => void;
  /** 从优化工作台「查看正文」打开详情时：返回工作台而非批次/列表 */
  onExitArticleDetailToWorkbench?: () => void;
  /** 原文详情视图激活时通知宿主（用于隐藏九宫格子页的顶栏「返回 Hub」，避免与页内返回重复） */
  onArticleDetailViewActive?: (active: boolean) => void;
  /** 顶栏统一「返回」：在批次文章视图内先退回批次列表，返回 true 表示已消耗；再由外层回到 Hub */
  nestedHubBackRef?: React.MutableRefObject<(() => boolean) | null>;
}

type ViewLevel = 'batches' | 'articles' | 'detail';

const PAGE_SIZE = 20;

/** 取正文首行作为列表标题；遇到 `---` / ```` / `<<< … >>>` 等围栏行跳过。 */
const HEADLINE_SKIP_RE = /^(?:[-=*_]{2,}|`{3,}.*|<<<.*>>>)$/;
const extractArticleTitle = (text?: string | null): string => {
  const src = (text || '').trim();
  if (!src) return '';
  for (const raw of src.split('\n')) {
    const s = raw.trim();
    if (!s) continue;
    if (HEADLINE_SKIP_RE.test(s)) continue;
    const cleaned = s.replace(/^#+\s*/, '').trim();
    if (cleaned) return cleaned.slice(0, 60);
  }
  return '';
};

const GenerateList: React.FC<GenerateListProps> = ({
  theme,
  onNewTask,
  initialOptimizationTaskIdFilter,
  onInitialOptimizationTaskFilterConsumed,
  lockedOptimizationTaskId,
  initialContentTaskId,
  onInitialContentTaskConsumed,
  onExitArticleDetailToWorkbench,
  onArticleDetailViewActive,
  nestedHubBackRef,
}) => {
  const { t, i18n } = useModuleI18n('generate');
  const isDark = theme === 'dark';

  const [viewLevel, setViewLevel] = useState<ViewLevel>('batches');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBatches, setTotalBatches] = useState(0);
  const [optimizationTaskFilterId, setOptimizationTaskFilterId] = useState<string | null>(null);

  const isWorkflowScoped = Boolean(lockedOptimizationTaskId?.trim());
  const effectiveOptimizationTaskId =
    lockedOptimizationTaskId?.trim() || optimizationTaskFilterId || undefined;

  // 批次列表
  const [batches, setBatches] = useState<ContentGenerationBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // 文章列表（某个批次下）
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchArticles, setBatchArticles] = useState<ContentGenerationTask[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  // 文章详情
  const [taskDetail, setTaskDetail] = useState<ContentGenerationTask | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [downloadingExport, setDownloadingExport] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!onArticleDetailViewActive) return;
    onArticleDetailViewActive(viewLevel === 'detail');
    return () => {
      onArticleDetailViewActive(false);
    };
  }, [viewLevel, onArticleDetailViewActive]);

  useEffect(() => {
    if (lockedOptimizationTaskId?.trim()) return;
    if (!initialOptimizationTaskIdFilter?.trim()) return;
    setOptimizationTaskFilterId(initialOptimizationTaskIdFilter.trim());
    setCurrentPage(1);
    onInitialOptimizationTaskFilterConsumed?.();
  }, [initialOptimizationTaskIdFilter, onInitialOptimizationTaskFilterConsumed, lockedOptimizationTaskId]);

  useEffect(() => {
    if (!initialContentTaskId?.trim()) return;
    const tid = initialContentTaskId.trim();
    let cancelled = false;
    let consumed = false;
    const safeConsume = () => {
      if (consumed) return;
      consumed = true;
      onInitialContentTaskConsumed?.();
    };
    (async () => {
      setLoadingDetail(true);
      setViewLevel('detail');
      try {
        const res = await getGenerationDetail(tid);
        if (cancelled) return;
        const raw = res?.data ?? res;
        const data = raw && typeof raw === 'object' && 'task_id' in raw ? (raw as ContentGenerationTask) : null;
        if (!data || !data.task_id) {
          throw new Error(t('errors.invalidTask'));
        }
        setTaskDetail(data);
        if (!onExitArticleDetailToWorkbench) {
          const bid = data.batch_id;
          if (bid) {
            setSelectedBatchId(bid);
            try {
              const bd = await getBatchDetail(bid);
              if (!cancelled) setBatchArticles(bd.tasks || []);
            } catch {
              /* 忽略 */
            }
          }
        }
      } catch {
        if (!cancelled) {
          alert(t('errors.loadFailed'));
          setViewLevel('batches');
        }
      } finally {
        if (!cancelled) {
          safeConsume();
        }
        setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
      setLoadingDetail(false);
    };
  }, [initialContentTaskId, onInitialContentTaskConsumed, onExitArticleDetailToWorkbench]);

  const loadBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const res = await getBatchHistory({
        limit: PAGE_SIZE,
        offset: (currentPage - 1) * PAGE_SIZE,
        search: isWorkflowScoped ? undefined : (searchQuery || undefined),
        optimization_task_id: effectiveOptimizationTaskId,
      });
      setBatches(res.batches || []);
      setTotalBatches(res.total || 0);
    } catch { setBatches([]); setTotalBatches(0); }
    finally { setLoadingBatches(false); }
  }, [currentPage, searchQuery, effectiveOptimizationTaskId, isWorkflowScoped]);

  useEffect(() => { loadBatches(); }, [loadBatches]);

  useEffect(() => {
    const holder = nestedHubBackRef;
    if (!holder) return;
    holder.current = () => {
      if (viewLevel !== 'articles') return false;
      setViewLevel('batches');
      setSelectedBatchId(null);
      setBatchArticles([]);
      void loadBatches();
      return true;
    };
    return () => {
      holder.current = null;
    };
  }, [nestedHubBackRef, viewLevel, loadBatches]);

  const handleSearch = () => { setCurrentPage(1); setSearchQuery(searchInput.trim()); };
  const handleSearchKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

  // 进入批次的文章列表
  const openBatch = async (batchId: string) => {
    setSelectedBatchId(batchId);
    setLoadingArticles(true);
    setViewLevel('articles');
    try {
      const res = await getBatchDetail(batchId);
      setBatchArticles(res.tasks || []);
    } catch { setBatchArticles([]); }
    finally { setLoadingArticles(false); }
  };

  // 进入文章详情
  const openArticle = async (taskId: string) => {
    const hadBatchContext = Boolean(selectedBatchId);
    setLoadingDetail(true);
    setViewLevel('detail');
    try {
      const res = await getGenerationDetail(taskId);
      const data = res.data;
      setTaskDetail(data);
      const bid = data?.batch_id;
      if (bid) {
        setSelectedBatchId(bid);
        try {
          const bd = await getBatchDetail(bid);
          setBatchArticles(bd.tasks || []);
        } catch {
          /* 忽略 */
        }
      }
    } catch {
      alert(t('errors.loadFailed'));
      setViewLevel(hadBatchContext ? 'articles' : 'batches');
    } finally {
      setLoadingDetail(false);
    }
  };

  const goBack = () => {
    if (viewLevel === 'detail') {
      if (onExitArticleDetailToWorkbench) {
        onExitArticleDetailToWorkbench();
        return;
      }
      setTaskDetail(null);
      if (selectedBatchId) {
        setViewLevel('articles');
      } else {
        setViewLevel('batches');
      }
    } else if (viewLevel === 'articles') {
      setViewLevel('batches');
      setSelectedBatchId(null);
      setBatchArticles([]);
      loadBatches();
    }
  };

  const handleCopyArticle = async () => {
    if (taskDetail?.generated_article) {
      const ok = await copyToClipboard(taskDetail.generated_article);
      if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
    }
  };

  const handleDownloadWord = async (taskId: string) => {
    setDownloadingExport(true);
    try {
      await downloadArticleDocx(taskId);
    } catch (e) {
      alert(e instanceof Error ? e.message : t('errors.downloadWordFailed'));
    } finally {
      setDownloadingExport(false);
    }
  };

  const handleDownloadBatchZip = async (batchId: string) => {
    setDownloadingExport(true);
    try {
      await downloadBatchZip(batchId);
    } catch (e) {
      alert(e instanceof Error ? e.message : t('errors.downloadZipFailed'));
    } finally {
      setDownloadingExport(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { labelKey: 'completed' | 'processing' | 'failed' | 'pending'; cls: string }> = {
      completed: { labelKey: 'completed', cls: 'bg-green-100 text-green-700' },
      processing: { labelKey: 'processing', cls: 'bg-blue-100 text-blue-700' },
      failed: { labelKey: 'failed', cls: 'bg-red-100 text-red-700' },
      pending: { labelKey: 'pending', cls: 'bg-slate-100 text-slate-600' },
    };
    const s = map[status] || map.pending;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold gap-1.5 ${s.cls}`}>
        {status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
        {status === 'processing' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {status === 'failed' && <AlertCircle className="w-3.5 h-3.5" />}
        {t(`status.${s.labelKey}`)}
      </span>
    );
  };

  const toolbarBorder = isDark ? 'border-zinc-700/80' : 'border-gray-100';
  const batchSearchInputCls = isDark
    ? 'w-full min-w-[11rem] max-w-xs pl-7 pr-2 py-1.5 text-xs rounded-lg border border-zinc-600 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/25 focus:border-[#E8553F]/50'
    : 'w-full min-w-[11rem] max-w-xs pl-7 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50';

  // ======== 文章详情视图（加载与正文共用同一外层布局，避免宽度/留白突变闪烁） ========
  if (viewLevel === 'detail') {
    return (
      <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col bg-white">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto no-scrollbar p-8 lg:p-12">
          {loadingDetail ? (
            <div className="flex w-full min-h-[min(70vh,560px)] flex-col items-center justify-center">
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-500" />
              <p className="text-sm font-bold text-slate-500">{t('loading')}</p>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-[1200px] space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={goBack} className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-600 transition-all hover:bg-slate-200">
                  <ArrowLeft className="h-4 w-4" />
                  <span>{onExitArticleDetailToWorkbench ? t('actions.backToWorkbench') : t('actions.backToList')}</span>
                </button>
                <div className="flex flex-wrap items-center gap-2">
                  {taskDetail?.status === 'completed' && taskDetail?.task_id ? (
                    <button
                      type="button"
                      disabled={downloadingExport}
                      onClick={() => void handleDownloadWord(taskDetail.task_id)}
                      className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 font-bold text-white transition-all hover:bg-rose-700 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4" />
                      <span>{t('actions.downloadWordRongmei')}</span>
                    </button>
                  ) : null}
                  <button type="button" onClick={handleCopyArticle} className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-600 transition-all hover:bg-slate-200">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? t('actions.copied') : t('actions.copyArticle')}</span>
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="mb-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {taskDetail?.article_title?.trim()
                    || (taskDetail?.generated_article ? extractArticleTitle(taskDetail.generated_article) : null)
                    || t('detail.title')}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="rounded border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-slate-900">{taskDetail?.task_id}</span>
                  {taskDetail?.template_title ? (
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">{t('articles.templatePrefix')} {taskDetail.template_title}</span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">{t('articles.rewrite')}</span>
                  )}
                  {taskDetail?.keyword_text && <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">{t('articles.keywordPrefix')} {taskDetail.keyword_text}</span>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-8">
                <div className="prose prose-lg max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed text-slate-900">{taskDetail?.generated_article || t('empty.noArticles')}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ======== 文章列表视图（某批次下） ========
  if (viewLevel === 'articles') {
    const currentBatch = batches.find(b => b.batch_id === selectedBatchId);
    return (
      <div className={`h-full min-h-0 flex flex-col ${isDark ? 'bg-geo-bg' : 'bg-[#F5F5F7]'}`}>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            <div>
              <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-gray-900'}`}>{t('batchArticles.title')}</h2>
              {currentBatch && (
                <p className={`mt-1 text-sm ${isDark ? 'text-geo-text-sec' : 'text-gray-500'}`}>
                  {currentBatch.keyword_text} · {t('batchArticles.articleCount', { count: currentBatch.article_count })}
                </p>
              )}
            </div>
            <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-geo-bg/30 border-geo-border' : 'bg-white border-gray-200'}`}>
              <div className={`flex flex-wrap items-center justify-end gap-2 px-5 py-4 border-b ${toolbarBorder}`}>
                {selectedBatchId && (currentBatch?.completed_count ?? 0) > 0 ? (
                  <button
                    type="button"
                    disabled={downloadingExport}
                    onClick={() => void handleDownloadBatchZip(selectedBatchId)}
                    className="btn-geo-primary shrink-0 inline-flex items-center gap-1.5 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t('actions.downloadBatchZip')}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openBatch(selectedBatchId!)}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${isDark ? 'text-zinc-400 hover:text-[#E8553F] hover:bg-[#E8553F]/10' : 'text-gray-400 hover:text-[#E8553F] hover:bg-[#FFF6F2]'}`}
                  title={t('actions.refresh')}
                >
                  <RefreshCcw className={`w-3.5 h-3.5 ${loadingArticles ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 w-12">{t('articlesTable.index')}</th>
                    <th className="px-4 py-3">{t('articlesTable.title')}</th>
                    <th className="px-4 py-3">{t('articlesTable.keyword')}</th>
                    <th className="px-4 py-3">{t('articlesTable.template')}</th>
                    <th className="px-4 py-3">{t('articlesTable.status')}</th>
                    <th className="px-4 py-3 text-right">{t('articlesTable.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {loadingArticles ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" /><p className="text-sm text-slate-500">{t('loading')}</p></td></tr>
                  ) : batchArticles.length > 0 ? batchArticles.map((task, idx) => {
                    const title = task.article_title?.trim()
                      || (task.generated_article
                        ? (extractArticleTitle(task.generated_article) || t('detail.generatedArticle'))
                        : t('empty.generating'));
                    return (
                      <tr key={task.task_id} className={`transition-colors ${isDark ? 'hover:bg-geo-card/50' : 'hover:bg-[#FFF9F6]/80'}`}>
                        <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-4 py-3"><div className="max-w-md truncate font-medium text-slate-700" title={title}>{title}</div></td>
                        <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-700 font-medium">{task.keyword_text}</span></td>
                        <td className="px-4 py-3">
                          {task.template_title ? (
                            <span className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-medium">{task.template_title}</span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded bg-amber-50 text-amber-800 font-medium">{t('articles.rewrite')}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{statusBadge(task.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openArticle(task.task_id)} disabled={task.status !== 'completed'}
                            className={`p-2.5 rounded-xl transition-all border ${task.status === 'completed' ? 'bg-slate-100 text-slate-400 hover:text-blue-600 border-slate-200' : 'bg-slate-50 text-slate-300 cursor-not-allowed border-slate-100'}`}>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={6} className="px-4 py-12 text-center"><p className="text-sm text-slate-500">{t('articles.empty')}</p></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ======== 批次列表视图（默认） ========
  return (
    <div className={`h-full min-h-0 flex flex-col ${isDark ? 'bg-geo-bg' : 'bg-[#F5F5F7]'}`}>
      <div className="flex-1 flex flex-col overflow-hidden relative h-full min-h-0">
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
            <div>
              <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-gray-900'}`}>
                {isWorkflowScoped ? t('pageTitleWorkflow') : t('pageTitle')}
              </h2>
              <p className={`mt-1 text-sm ${isDark ? 'text-geo-text-sec' : 'text-gray-500'}`}>
                {isWorkflowScoped ? t('subtitleWorkflow') : t('subtitle')}
              </p>
            </div>

            <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-geo-bg/30 border-geo-border' : 'bg-white border-gray-200'}`}>
              <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b ${toolbarBorder}`}>
                {!isWorkflowScoped ? (
                  <div className="relative shrink-0 flex-1 min-w-[10rem] max-w-xs">
                    <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-zinc-500' : 'text-gray-300'}`} />
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder={t('form.searchPlaceholder')}
                      className={batchSearchInputCls}
                    />
                  </div>
                ) : null}
                <div className={`flex flex-wrap items-center gap-2 ${isWorkflowScoped ? 'ml-auto' : 'ml-auto sm:ml-0'}`}>
                  {!isWorkflowScoped ? (
                    <>
                      <button type="button" onClick={() => onNewTask(null)} className="btn-geo-primary shrink-0 inline-flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> {t('actions.createTask')}
                      </button>
                      <button
                        type="button"
                        onClick={handleSearch}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${isDark ? 'text-zinc-400 hover:text-[#E8553F] hover:bg-[#E8553F]/10' : 'text-gray-400 hover:text-[#E8553F] hover:bg-[#FFF6F2]'}`}
                        title={t('actions.filter')}
                      >
                        <Filter className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void loadBatches()}
                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${isDark ? 'text-zinc-400 hover:text-[#E8553F] hover:bg-[#E8553F]/10' : 'text-gray-400 hover:text-[#E8553F] hover:bg-[#FFF6F2]'}`}
                    title={t('actions.refreshList')}
                  >
                    <RefreshCcw className={`w-3.5 h-3.5 ${loadingBatches ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">{t('table.batchId')}</th>
                    <th className="px-4 py-3">{t('table.time')}</th>
                    <th className="px-4 py-3">{t('table.keyword')}</th>
                    <th className="px-4 py-3">{t('table.articleCount')}</th>
                    <th className="px-4 py-3">{t('table.status')}</th>
                    <th className="px-4 py-3 text-right">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {loadingBatches ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" /><p className="text-sm font-bold text-slate-500">{t('loading')}</p></td></tr>
                  ) : batches.length > 0 ? batches.map(batch => {
                    const dt = batch.created_at ? new Date(batch.created_at).toLocaleString(i18n.language, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
                    return (
                      <tr key={batch.batch_id} className={`group transition-colors ${isDark ? 'hover:bg-geo-card/50' : 'hover:bg-[#FFF9F6]/80'}`}>
                        <td className="px-4 py-3"><span className="font-mono text-sm px-3 py-1.5 rounded border border-slate-200 bg-slate-50 text-slate-900">{batch.batch_id}</span></td>
                        <td className="px-4 py-3"><span className="text-sm font-medium flex items-center gap-2 text-slate-600"><Clock className="w-4 h-4" />{dt}</span></td>
                        <td className="px-4 py-3"><span className="text-sm font-medium text-slate-700 truncate max-w-[200px] block">{batch.keyword_text || '-'}</span></td>
                        <td className="px-4 py-3"><span className="font-semibold">{batch.completed_count}/{batch.article_count}</span></td>
                        <td className="px-4 py-3">{statusBadge(batch.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openBatch(batch.batch_id)} className={`p-2 rounded-lg border transition-colors ${isDark ? 'border-zinc-600 bg-zinc-800 text-zinc-400 hover:text-[#E8553F]' : 'border-slate-200 bg-slate-100 text-slate-400 hover:text-[#E8553F] hover:bg-[#FFF6F2]'}`}>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={6} className="px-4 py-12 text-center">
                      <BoxSelect className="w-12 h-12 mb-4 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-500">{t('empty.noData')}</p>
                      {!isWorkflowScoped ? (
                        <p className="text-xs mt-2 text-slate-400">{t('empty.createHint')}</p>
                      ) : null}
                    </td></tr>
                  )}
                </tbody>
              </table>
              <Pagination currentPage={currentPage} total={totalBatches} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} isDark={isDark} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateList;
