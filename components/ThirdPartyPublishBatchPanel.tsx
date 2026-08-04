import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { Theme } from '../types';
import {
  downloadThirdPartyPublishZip,
  getThirdPartySelectedArticles,
  importThirdPartyPublishDocxFiles,
  markThirdPartyArticlesPublished,
  removeThirdPartyPublishArticle,
  updateThirdPartyPublishArticle,
  updateThirdPartyPublishTask,
  type ThirdPartyPublishItem,
} from '../api/thirdPartyPublish';
import { getMediaPublishTierOptions } from '../api/mediaPublishTier';
import MediaTierSaveField from './shared/MediaTierSaveField';
import { formatMediaTierDisplay } from '../lib/mediaTierI18n';
import type { ArticleMediaTierInfo, MediaTier, MediaTierOption } from '../constants/mediaPublishTier';
import { copyToClipboard } from '../utils/clipboard';
import { TP_STATUS, tpStatusBadgeClass } from '../constants/thirdPartyPublishStatus';
import { useModuleI18n } from '../i18n/hooks';
import type { TFunction } from 'i18next';

function articleMediaTierBadgeCls(isDark: boolean): string {
  return isDark
    ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
    : 'bg-violet-50 text-violet-700 border border-violet-100';
}

function formatArticleMediaTierSource(a: PublishGroupArticle, t: TFunction<'publish'>): string | null {
  if (!a.media_tier_source) return null;
  const key = `mediaTierSource.${a.media_tier_source}` as const;
  return t(key, { defaultValue: a.media_tier_source });
}

export type PublishGroupArticle = {
  task_id: string;
  title: string;
  summary: string;
  keyword_text?: string;
  generated_article?: string;
  published?: boolean;
} & ArticleMediaTierInfo;

export type BatchPanelMode = 'manage' | 'admin';

interface Props {
  theme: Theme;
  embedded?: boolean;
  row: ThirdPartyPublishItem;
  mode: BatchPanelMode;
  market?: 'domestic' | 'overseas';
  onBack: () => void;
  onRefreshList: () => void;
}

const ThirdPartyPublishBatchPanel: React.FC<Props> = ({
  theme,
  embedded = false,
  row,
  mode,
  market = 'domestic',
  onBack,
  onRefreshList,
}) => {
  const { t } = useModuleI18n('publish');
  const isDark = theme === 'dark';
  const pageShellCls = embedded
    ? 'w-full px-4 md:px-6 py-6 space-y-6'
    : 'max-w-7xl mx-auto px-6 py-8 space-y-6';
  const toolbarBorder = isDark ? 'border-zinc-700/80' : 'border-gray-100';
  const cardCls = `rounded-2xl border overflow-hidden shadow-sm transition-colors ${
    isDark ? 'bg-zinc-900/40 border-zinc-700' : 'bg-white border-gray-200'
  }`;

  const editable = row.status === TP_STATUS.GENERATED && mode === 'manage';
  const isAdminMode = mode === 'admin';

  const [view, setView] = useState<'list' | 'detail'>('list');
  const [articles, setArticles] = useState<PublishGroupArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailArticle, setDetailArticle] = useState<PublishGroupArticle | null>(null);
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copiedFullTaskId, setCopiedFullTaskId] = useState<string | null>(null);
  const batchImportInputRef = useRef<HTMLInputElement>(null);
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [adminMarking, setAdminMarking] = useState(false);
  const [tierOptions, setTierOptions] = useState<MediaTierOption[]>([]);
  const [tierOptionsLoading, setTierOptionsLoading] = useState(false);
  const [batchDefaultTier, setBatchDefaultTier] = useState<MediaTier | null>(null);
  const [workflowMediaTier, setWorkflowMediaTier] = useState<MediaTier | null>(null);
  const [batchTierDraft, setBatchTierDraft] = useState<MediaTier | null>(null);
  const [batchTierSaving, setBatchTierSaving] = useState(false);
  const [articleTierDraft, setArticleTierDraft] = useState<MediaTier>('standard');
  const [articleTierSaving, setArticleTierSaving] = useState(false);

  const unpublishedArticles = useMemo(
    () => articles.filter((a) => !a.published),
    [articles],
  );

  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getThirdPartySelectedArticles(row.id);
      const batchTier = (res.default_media_tier as MediaTier | null) ?? null;
      setArticles(res.items ?? []);
      setBatchDefaultTier(batchTier);
      setBatchTierDraft(batchTier ?? (res.workflow_media_tier as MediaTier | null) ?? 'standard');
      setWorkflowMediaTier((res.workflow_media_tier as MediaTier | null) ?? null);
    } catch {
      setArticles([]);
      setBatchDefaultTier(null);
      setBatchTierDraft(null);
      setWorkflowMediaTier(null);
    } finally {
      setLoading(false);
    }
  }, [row.id]);

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
    void loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    const valid = new Set(articles.map((a) => a.task_id));
    setSelectedArticleIds((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [articles]);

  const selectedCount = selectedArticleIds.size;
  const allArticlesSelected = articles.length > 0 && selectedCount === articles.length;
  const allUnpublishedSelected =
    unpublishedArticles.length > 0 &&
    unpublishedArticles.every((a) => selectedArticleIds.has(a.task_id));

  const toggleArticleSelect = (taskId: string) => {
    setSelectedArticleIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleSelectAllArticles = () => {
    if (isAdminMode) {
      if (allUnpublishedSelected) {
        setSelectedArticleIds(new Set());
        return;
      }
      setSelectedArticleIds(new Set(unpublishedArticles.map((a) => a.task_id)));
      return;
    }
    if (allArticlesSelected) {
      setSelectedArticleIds(new Set());
      return;
    }
    setSelectedArticleIds(new Set(articles.map((a) => a.task_id)));
  };

  const openDetail = (a: PublishGroupArticle) => {
    setDetailArticle(a);
    setEditBody((a.generated_article || a.summary || '').trim());
    setArticleTierDraft((a.media_tier as MediaTier) ?? 'standard');
    setView('detail');
  };

  const handleExportZip = async () => {
    setExporting(true);
    try {
      await downloadThirdPartyPublishZip(row.id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t('errors.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const batchTierDirty =
    batchTierDraft !== (batchDefaultTier ?? workflowMediaTier ?? 'standard');

  const articleTierDirty = useMemo(() => {
    if (!detailArticle) return false;
    return articleTierDraft !== ((detailArticle.media_tier as MediaTier) ?? 'standard');
  }, [detailArticle, articleTierDraft]);

  const handleSaveBatchTier = async () => {
    if (!editable || batchTierSaving) return;
    setBatchTierSaving(true);
    try {
      await updateThirdPartyPublishTask(row.id, { default_media_tier: batchTierDraft });
      setBatchDefaultTier(batchTierDraft);
      await loadArticles();
      onRefreshList();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t('errors.saveFailed'));
    } finally {
      setBatchTierSaving(false);
    }
  };

  const handleSaveArticleTier = async () => {
    if (!detailArticle || !editable || articleTierSaving || !articleTierDirty) return;
    setArticleTierSaving(true);
    try {
      await updateThirdPartyPublishArticle(row.id, detailArticle.task_id, {
        media_tier: articleTierDraft,
      });
      const tierLabel =
        tierOptions.find((o) => o.tier === articleTierDraft)?.label ?? articleTierDraft;
      await loadArticles();
      setDetailArticle((prev) =>
        prev
          ? {
              ...prev,
              media_tier: articleTierDraft,
              media_tier_override: articleTierDraft,
              media_tier_label: tierLabel,
              media_tier_source: 'article',
            }
          : prev,
      );
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t('errors.saveFailed'));
    } finally {
      setArticleTierSaving(false);
    }
  };

  const handleSaveArticle = async () => {
    if (!detailArticle || !editable) return;
    const body = editBody.trim();
    if (!body) {
      window.alert(t('errors.bodyRequired'));
      return;
    }

    setSaving(true);
    try {
      await updateThirdPartyPublishArticle(row.id, detailArticle.task_id, {
        generated_article: body,
      });
      await loadArticles();
      setDetailArticle((prev) =>
        prev
          ? {
              ...prev,
              generated_article: body,
            }
          : prev,
      );
      window.alert(t('batchPanel.saved'));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleBatchImportDocx = async (fileList: FileList | File[]) => {
    if (!editable) return;
    const files = Array.from(fileList).filter((f) => f.name.toLowerCase().endsWith('.docx'));
    if (files.length < 1) {
      window.alert(t('batchPanel.selectDocx'));
      return;
    }
    setImporting(true);
    try {
      const res = await importThirdPartyPublishDocxFiles(row.id, files);
      const n = res.imported_task_ids?.length ?? 0;
      const errs = res.errors ?? [];
      await loadArticles();
      onRefreshList();
      if (errs.length > 0) {
        window.alert(t('batchPanel.importPartial', { count: n, errors: errs.join('\n') }));
      } else {
        window.alert(t('batchPanel.importResult', { count: n }));
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t('errors.importFailed'));
    } finally {
      setImporting(false);
    }
  };

  const handleRemoveArticle = async (a: PublishGroupArticle) => {
    if (!editable) return;
    if (!window.confirm(t('batchPanel.confirmRemoveOne', { title: a.title }))) return;
    try {
      const res = await removeThirdPartyPublishArticle(row.id, a.task_id);
      if (res.publish_task_deleted) {
        onRefreshList();
        onBack();
        return;
      }
      if (view === 'detail' && detailArticle?.task_id === a.task_id) {
        setView('list');
        setDetailArticle(null);
      }
      setSelectedArticleIds((prev) => {
        const next = new Set(prev);
        next.delete(a.task_id);
        return next;
      });
      await loadArticles();
      onRefreshList();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t('errors.deleteFailed'));
    }
  };

  const handleBatchRemoveArticles = async () => {
    if (!editable) return;
    if (selectedCount < 1) {
      window.alert(t('batchPanel.selectToDelete'));
      return;
    }
    const ids = articles
      .filter((a) => selectedArticleIds.has(a.task_id))
      .map((a) => a.task_id);
    if (ids.length < 1) return;

    const removingAll = ids.length === articles.length;
    const confirmMsg = removingAll
      ? t('batchPanel.confirmRemoveAll', { count: ids.length })
      : t('batchPanel.confirmRemoveSelected', { count: ids.length });
    if (!window.confirm(confirmMsg)) return;

    setBatchDeleting(true);
    try {
      for (const taskId of ids) {
        const res = await removeThirdPartyPublishArticle(row.id, taskId);
        if (res.publish_task_deleted) {
          onRefreshList();
          onBack();
          return;
        }
      }
      setSelectedArticleIds(new Set());
      await loadArticles();
      onRefreshList();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t('errors.batchDeleteFailed'));
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleAdminMarkPublished = async () => {
    if (!isAdminMode) return;
    if (selectedCount < 1) {
      window.alert(t('batchPanel.selectToMark'));
      return;
    }
    const ids = articles
      .filter((a) => selectedArticleIds.has(a.task_id) && !a.published)
      .map((a) => a.task_id);
    if (ids.length < 1) {
      window.alert(t('batchPanel.allPublished'));
      return;
    }
    if (!window.confirm(t('batchPanel.confirmMarkPublished', { count: ids.length }))) return;

    setAdminMarking(true);
    try {
      const res = await markThirdPartyArticlesPublished(row.id, ids);
      setSelectedArticleIds(new Set());
      await loadArticles();
      onRefreshList();
      if (res.status === TP_STATUS.PUBLISHED) {
        window.alert(t('batchPanel.allGroupPublished'));
        onBack();
      } else {
        window.alert(t('batchPanel.markedPublished', { count: res.marked_task_ids?.length ?? ids.length }));
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : t('errors.markFailed'));
    } finally {
      setAdminMarking(false);
    }
  };

  if (view === 'detail' && detailArticle) {
    const body = editBody;
    return (
      <div className={pageShellCls}>
        <button
          type="button"
          onClick={() => {
            setView('list');
            setDetailArticle(null);
          }}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
            isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          {t('batchPanel.backToArticles')}
        </button>
        <div className={cardCls}>
          <div className={`border-b px-6 py-5 ${toolbarBorder}`}>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {detailArticle.title}
            </h2>
            {detailArticle.keyword_text ? (
              <p className={`mt-1 text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                {t('batchPanel.entryLabel', { text: detailArticle.keyword_text })}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyToClipboard(body);
                  if (ok) {
                    setCopiedFullTaskId(detailArticle.task_id);
                    setTimeout(() => setCopiedFullTaskId(null), 2000);
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  isDark ? 'bg-white/10 text-zinc-200' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {copiedFullTaskId === detailArticle.task_id ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {t('batchPanel.copyFullText')}
              </button>
              {editable ? (
                <>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSaveArticle()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    {t('actions.save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRemoveArticle(detailArticle)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('batchPanel.removeFromBatch')}
                  </button>
                </>
              ) : null}
            </div>
          </div>
          <div className="p-6">
            <div className="mb-6">
                <p className={`text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
                  {t('batchPanel.effectiveMediaTier')}
                </p>
                {editable ? (
                  <>
                    {(detailArticle.media_tier || detailArticle.media_tier_label) ? (
                      <p className={`mt-0.5 mb-2 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                        {t('batchPanel.currentEffective', {
                          label: formatMediaTierDisplay(detailArticle, t),
                          source: detailArticle.media_tier_source
                            ? `（${formatArticleMediaTierSource(detailArticle, t)}）`
                            : '',
                        })}
                      </p>
                    ) : null}
                    <MediaTierSaveField
                      theme={theme}
                      options={tierOptions}
                      value={articleTierDraft}
                      onChange={(t) => {
                        if (t) setArticleTierDraft(t);
                      }}
                      onSave={handleSaveArticleTier}
                      saving={articleTierSaving}
                      dirty={articleTierDirty}
                      disabled={!editable}
                      loading={tierOptionsLoading}
                      saveLabel={t('batchPanel.saveMediaTier')}
                      market={market}
                    />
                  </>
                ) : (
                  <div
                    className={`mt-2 rounded-xl border px-4 py-3 ${isDark ? 'border-zinc-700 bg-zinc-900/40' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${articleMediaTierBadgeCls(isDark)}`}
                    >
                      {formatMediaTierDisplay(detailArticle, t)}
                    </span>
                    <p className={`mt-2 text-xs ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
                      {formatArticleMediaTierSource(detailArticle, t)
                        ? t('batchPanel.sourceLabel', { source: formatArticleMediaTierSource(detailArticle, t) })
                        : t('batchPanel.sourceDefault')}
                      {detailArticle.price_points != null ? ` · ${t('batchPanel.pointsPerArticle', { count: detailArticle.price_points })}` : ''}
                    </p>
                  </div>
                )}
              </div>
            {editable ? (
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={24}
                className={`w-full rounded-xl border p-4 text-sm leading-relaxed font-mono ${
                  isDark
                    ? 'border-white/10 bg-black/20 text-zinc-200'
                    : 'border-slate-200 bg-slate-50 text-slate-800'
                }`}
              />
            ) : (
              <div
                className={`whitespace-pre-wrap rounded-xl border p-5 text-sm leading-relaxed ${
                  isDark ? 'border-white/10 bg-black/20 text-zinc-200' : 'border-slate-200 bg-slate-50 text-slate-800'
                }`}
              >
                {body || t('batchPanel.noBody')}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={pageShellCls}>
      <button
        type="button"
        onClick={onBack}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
          isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-600'
        }`}
      >
        <ArrowLeft className="h-4 w-4" />
        {t('batchPanel.backToList')}
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {mode === 'admin' ? t('batchPanel.adminTitle', { name: row.name }) : t('batchPanel.editTitle', { name: row.name })}
          </h2>
          <p className={`mt-1 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
            {t('batchPanel.articleCount', { count: articles.length || row.selected_article_count || row.count || 0 })}
            {editable
              ? t('batchPanel.hintEditable')
              : isAdminMode && market === 'domestic'
                ? t('batchPanel.hintAdminViewTier')
                : t('batchPanel.hintViewOnly')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={tpStatusBadgeClass(row.status, isDark)}>{row.status}</span>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExportZip()}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold ${
              isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t('actions.export')}
          </button>
          {editable ? (
            <>
              <button
                type="button"
                disabled={importing}
                onClick={() => batchImportInputRef.current?.click()}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold ${
                  isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {t('actions.import')}
              </button>
              <input
                ref={batchImportInputRef}
                type="file"
                multiple
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const input = e.target;
                  const picked = Array.from(input.files ?? []);
                  input.value = '';
                  if (picked.length > 0) void handleBatchImportDocx(picked);
                }}
              />
            </>
          ) : null}
        </div>
      </div>

      {editable ? (
        <div className={cardCls}>
          <div className={`border-b px-5 py-4 ${toolbarBorder}`}>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('batchPanel.batchDefaultTier')}</h3>
            <p className={`mt-0.5 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
              {t('batchPanel.batchDefaultHint')}
            </p>
          </div>
          <div className="p-5">
            <MediaTierSaveField
              theme={theme}
              options={tierOptions}
              value={batchTierDraft}
              onChange={setBatchTierDraft}
              onSave={handleSaveBatchTier}
              saving={batchTierSaving}
              dirty={batchTierDirty}
              loading={tierOptionsLoading}
              saveLabel={t('batchPanel.saveBatchTier')}
              market={market}
            />
          </div>
        </div>
      ) : null}

      <div className={cardCls}>
        <div className={`border-b px-5 py-4 ${toolbarBorder}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('batchPanel.groupArticles')}</h3>
            {editable && articles.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <button
                  type="button"
                  onClick={toggleSelectAllArticles}
                  className={`font-semibold underline underline-offset-2 hover:opacity-80 ${
                    isDark ? 'text-violet-400' : 'text-violet-600'
                  }`}
                >
                  {allArticlesSelected ? t('batchPanel.deselectAll') : t('batchPanel.selectAll')}
                </button>
                <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>{t('batchPanel.selectedCount', { count: selectedCount })}</span>
                <button
                  type="button"
                  disabled={batchDeleting}
                  onClick={() => void handleBatchRemoveArticles()}
                  className="inline-flex items-center gap-1.5 font-semibold text-red-500 hover:opacity-80 disabled:opacity-50"
                >
                  {batchDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  {t('actions.delete')}
                </button>
              </div>
            ) : null}
            {isAdminMode && unpublishedArticles.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <button
                  type="button"
                  onClick={toggleSelectAllArticles}
                  className={`font-semibold underline underline-offset-2 hover:opacity-80 ${
                    isDark ? 'text-violet-400' : 'text-violet-600'
                  }`}
                >
                  {allUnpublishedSelected ? t('batchPanel.deselectAll') : t('batchPanel.selectAll')}
                </button>
                <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>{t('batchPanel.selectedCount', { count: selectedCount })}</span>
                <button
                  type="button"
                  disabled={adminMarking}
                  onClick={() => void handleAdminMarkPublished()}
                  className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 hover:opacity-80 disabled:opacity-50"
                >
                  {adminMarking ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {t('batchPanel.markPublished')}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin opacity-60" />
            </div>
          ) : articles.length === 0 ? (
            <p className="py-8 text-center text-sm opacity-60">{t('empty.noArticles')}</p>
          ) : (
            <>
              {isAdminMode && market === 'domestic' ? (
                <div
                  className={`mb-1 grid items-center gap-3 px-2 pb-2 text-xs font-semibold ${
                    isDark ? 'text-zinc-500' : 'text-slate-500'
                  } ${editable || unpublishedArticles.length > 0 ? 'grid-cols-[auto_auto_1fr_auto]' : 'grid-cols-[auto_1fr_auto]'}`}
                >
                  {editable || (isAdminMode && unpublishedArticles.length > 0) ? <span className="w-6" /> : null}
                  <span className="w-8 text-center">#</span>
                  <span>{t('batchPanel.articleTitleCol')}</span>
                  <span className="pr-2 text-right">{t('batchPanel.effectiveTierCol')}</span>
                </div>
              ) : null}
              <ul className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-gray-100'}`}>
              {articles.map((a, idx) => (
                <li key={a.task_id} className="flex items-center gap-1">
                  {editable || (isAdminMode && !a.published) ? (
                    <label
                      className="flex shrink-0 cursor-pointer items-center py-4 pl-1 pr-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedArticleIds.has(a.task_id)}
                        onChange={() => toggleArticleSelect(a.task_id)}
                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500/30"
                      />
                    </label>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openDetail(a)}
                    className={`flex min-w-0 flex-1 items-center gap-3 px-2 py-4 text-left ${
                      isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-[#FFF9F6]/80'
                    }`}
                  >
                    <span className="w-8 shrink-0 font-mono text-xs opacity-40">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`truncate text-sm font-semibold ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
                          {a.title}
                        </p>
                        {a.published ? (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isDark
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {t('batchPanel.published')}
                          </span>
                        ) : null}
                      </div>
                      {!isAdminMode ? (
                        <p className={`mt-1 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                          {formatMediaTierDisplay(a, t)}
                          {a.price_points != null ? ` · ${t('batchPanel.pointsPerArticle', { count: a.price_points })}` : ''}
                        </p>
                      ) : null}
                      {a.summary ? (
                        <p className={`mt-1 line-clamp-2 text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                          {a.summary}
                        </p>
                      ) : null}
                    </div>
                    {isAdminMode && market === 'domestic' ? (
                      <div className="shrink-0 pr-2 text-right">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${articleMediaTierBadgeCls(isDark)}`}
                        >
                          {formatMediaTierDisplay(a, t)}
                        </span>
                        <p className={`mt-1 text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                          {formatArticleMediaTierSource(a, t) ?? t('mediaTierSource.default')}
                        </p>
                        {a.price_points != null ? (
                          <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                            {t('batchPanel.pointsPerArticle', { count: a.price_points })}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 opacity-40" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThirdPartyPublishBatchPanel;
