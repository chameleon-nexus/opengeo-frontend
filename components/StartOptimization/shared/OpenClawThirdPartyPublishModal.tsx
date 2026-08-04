import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { createThirdPartyPublishTask } from '../../../api/thirdPartyPublish';
import {
  listThirdPartyMediaOutlets,
  type ThirdPartyMediaOutletDTO,
} from '../../../api/thirdPartyMedia';

const MEDIA_PAGE_SIZE = 8;

export interface CycleBranchArticleItem {
  taskId: string;
  title: string;
}

interface Props {
  open: boolean;
  branchLabel: string;
  articles: CycleBranchArticleItem[];
  onClose: () => void;
  onPublished?: () => void;
  onError?: (message: string) => void;
}

const OpenClawThirdPartyPublishModal: React.FC<Props> = ({
  open,
  branchLabel,
  articles,
  onClose,
  onPublished,
  onError,
}) => {
  const [step, setStep] = useState<'articles' | 'media'>('articles');
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(new Set());
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaTotal, setMediaTotal] = useState(0);
  const [mediaItems, setMediaItems] = useState<ThirdPartyMediaOutletDTO[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaSearchInput, setMediaSearchInput] = useState('');
  const [mediaSearchApplied, setMediaSearchApplied] = useState('');
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  /** 仅弹窗从关→开时初始化，避免父组件轮询导致 articles 引用变化把 step 打回「选文章」 */
  const openSessionRef = useRef(false);

  useEffect(() => {
    if (!open) {
      openSessionRef.current = false;
      return;
    }
    if (openSessionRef.current) return;
    openSessionRef.current = true;
    setStep('articles');
    setSelectedArticleIds(new Set());
    setMediaPage(1);
    setMediaSearchInput('');
    setMediaSearchApplied('');
    setSelectedMediaIds(new Set());
  }, [open, articles]);

  const toggleArticle = (taskId: string) => {
    setSelectedArticleIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleAllArticles = () => {
    if (articles.length === 0) return;
    const allOn = articles.every((a) => selectedArticleIds.has(a.taskId));
    setSelectedArticleIds(
      allOn ? new Set() : new Set(articles.map((a) => a.taskId))
    );
  };

  const loadMediaPage = useCallback(async () => {
    if (!open || step !== 'media') return;
    setMediaLoading(true);
    try {
      const res = await listThirdPartyMediaOutlets({
        page: mediaPage,
        page_size: MEDIA_PAGE_SIZE,
        market: 'domestic',
        q: mediaSearchApplied || undefined,
      });
      setMediaItems(res.items);
      setMediaTotal(res.total);
    } catch {
      setMediaItems([]);
      setMediaTotal(0);
    } finally {
      setMediaLoading(false);
    }
  }, [open, step, mediaPage, mediaSearchApplied]);

  useEffect(() => {
    void loadMediaPage();
  }, [loadMediaPage]);

  const mediaTotalPages = Math.max(1, Math.ceil(mediaTotal / MEDIA_PAGE_SIZE));

  const toggleMedia = (it: ThirdPartyMediaOutletDTO) => {
    setSelectedMediaIds((prev) => {
      const next = new Set(prev);
      if (next.has(it.id)) next.delete(it.id);
      else next.add(it.id);
      return next;
    });
  };

  const handlePublish = async () => {
    const cgIds = Array.from(selectedArticleIds);
    const wl = Array.from(selectedMediaIds);
    if (cgIds.length < 1) {
      onError?.('请至少选择一篇文章');
      return;
    }
    if (wl.length < 1) {
      onError?.('请至少选择一家媒体');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createThirdPartyPublishTask({
        content_generation_task_ids: cgIds,
        article_count: cgIds.length,
        market: 'domestic',
        media_whitelist_ids: wl,
        publish_mode: 'per_media',
      });
      const n = res.count ?? res.items?.length ?? 1;
      onPublished?.();
      onClose();
      const articleN = cgIds.length;
      window.alert(
        `已创建 ${n} 条三方媒体发布任务（${branchLabel}）：${articleN} 篇 × ${wl.length} 家媒体。可在「三方媒体发布」列表查看每条对应的媒体。`
      );
    } catch (e) {
      onError?.(e instanceof Error ? e.message : '发布失败');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedArticleList = useMemo(
    () => articles.filter((a) => selectedArticleIds.has(a.taskId)),
    [articles, selectedArticleIds]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(92vh,820px)] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="oc-tp-publish-title"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 id="oc-tp-publish-title" className="text-sm font-semibold text-slate-900">
            三方媒体发布 · {branchLabel}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-[min(60vh,520px)] flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {step === 'articles' ? (
            <>
              <p className="text-xs text-slate-600">
                选择本行成稿（共 {articles.length} 篇），下一步选择发稿媒体。
              </p>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={toggleAllArticles}
                  className="text-xs font-medium text-blue-600 underline underline-offset-2 hover:opacity-80"
                >
                  {articles.every((a) => selectedArticleIds.has(a.taskId))
                    ? '取消全选'
                    : `全选 ${articles.length} 篇`}
                </button>
                <span className="text-xs text-slate-500">已选 {selectedArticleIds.size} 篇</span>
              </div>
              <ul className="max-h-[min(42vh,360px)] space-y-1.5 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                {articles.map((a) => (
                  <li key={a.taskId}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-white">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={selectedArticleIds.has(a.taskId)}
                        onChange={() => toggleArticle(a.taskId)}
                      />
                      <span className="min-w-0 flex-1 text-xs text-slate-800">
                        <span className="font-mono text-[10px] text-slate-400">{a.taskId}</span>
                        <span className="mt-0.5 block line-clamp-2">{a.title}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-600">
                已选 {selectedArticleList.length} 篇文章；请勾选媒体。
                <strong> 手动发布：文章 × 媒体 </strong>各生成 1 条任务（与周期自动入队、发稿待办终选无关）。
              </p>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={mediaSearchInput}
                    onChange={(e) => setMediaSearchInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setMediaSearchApplied(mediaSearchInput.trim());
                        setMediaPage(1);
                      }
                    }}
                    placeholder="搜索媒体名称"
                    className="w-full rounded-lg border border-slate-200 py-1.5 pl-7 pr-2 text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMediaSearchApplied(mediaSearchInput.trim());
                    setMediaPage(1);
                  }}
                  className="shrink-0 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-600 hover:bg-slate-50"
                >
                  搜索
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                已选媒体 {selectedMediaIds.size} 家（必填）· 将创建{' '}
                <strong>{selectedArticleIds.size * selectedMediaIds.size}</strong> 条任务（
                {selectedArticleIds.size} 篇 × {selectedMediaIds.size} 家）
              </p>
              {mediaLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <ul className="space-y-1 max-h-[min(38vh,320px)] overflow-y-auto">
                  {mediaItems.map((it) => (
                    <li key={it.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-100 px-2 py-2 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={selectedMediaIds.has(it.id)}
                          onChange={() => toggleMedia(it)}
                        />
                        <span className="text-xs font-medium text-slate-800">{it.name}</span>
                        {it.accountType ? (
                          <span className="text-[10px] text-slate-400">{it.accountType}</span>
                        ) : null}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  disabled={mediaPage <= 1}
                  onClick={() => setMediaPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-0.5 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  上一页
                </button>
                <span>
                  {mediaPage} / {mediaTotalPages}
                </span>
                <button
                  type="button"
                  disabled={mediaPage >= mediaTotalPages}
                  onClick={() => setMediaPage((p) => Math.min(mediaTotalPages, p + 1))}
                  className="inline-flex items-center gap-0.5 disabled:opacity-40"
                >
                  下一页
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
          {step === 'media' ? (
            <button
              type="button"
              onClick={() => setStep('articles')}
              className="mr-auto text-xs text-slate-600 hover:text-slate-900"
            >
              上一步
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            取消
          </button>
          {step === 'articles' ? (
            <button
              type="button"
              disabled={selectedArticleIds.size < 1}
              onClick={() => setStep('media')}
              className="rounded-lg bg-[#E8553F] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              下一步 · 选择媒体
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || selectedMediaIds.size < 1}
              onClick={() => void handlePublish()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#E8553F] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              发布
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpenClawThirdPartyPublishModal;
