import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, User, Loader2, CheckCircle2 } from 'lucide-react';
import { Theme, Brand } from '../types';
import { getGenerationHistory } from '../api/contentGeneration';
import { getPostizAccounts } from '../api/postizPublish';
import type { PostizAccount } from '../api/postizPublish';
import { createPublishRecord } from '../api/publish';
import { scrubInternalPublishTerms } from '../lib/userFacingMessage';
import { ContentGenerationTask } from '../types';

interface ArticlePublishPageProps {
  theme: Theme;
  currentBrand: Brand | null;
  onBack: () => void;
}

const ArticlePublishPage: React.FC<ArticlePublishPageProps> = ({ theme, currentBrand, onBack }) => {
  const isDark = theme === 'dark';
  const [articles, setArticles] = useState<ContentGenerationTask[]>([]);
  const [accounts, setAccounts] = useState<PostizAccount[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardCls = `rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-zinc-900/40 border-zinc-700' : 'bg-white border-gray-200'}`;
  const itemBorder = isDark ? 'border-zinc-600 hover:bg-zinc-800/60' : 'border-gray-200 hover:bg-[#FFF9F6]/80';
  const itemSelected = isDark
    ? 'bg-[#E8553F]/10 border-[#E8553F]/60 ring-1 ring-[#E8553F]/30'
    : 'bg-[#FFF6F2] border-[#E8553F]/50 ring-1 ring-[#E8553F]/20';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingArticles(true);
      try {
        const res = await getGenerationHistory({
          brand_name: currentBrand?.name ?? '',
          limit: 50,
          offset: 0,
        });
        if (!cancelled && res?.data?.tasks) {
          setArticles(res.data.tasks);
        }
      } catch (e) {
        if (!cancelled) setError(scrubInternalPublishTerms((e as Error).message || '加载文章列表失败'));
      } finally {
        if (!cancelled) setLoadingArticles(false);
      }
    })();
    return () => { cancelled = true; };
  }, [currentBrand?.name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAccounts(true);
      try {
        const list = await getPostizAccounts();
        if (!cancelled) setAccounts((list ?? []).filter((a) => a.authorized));
      } catch (e) {
        if (!cancelled) setError(scrubInternalPublishTerms((e as Error).message || '加载账号列表失败'));
      } finally {
        if (!cancelled) setLoadingAccounts(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async () => {
    if (!selectedTaskId || !selectedAccountId) {
      setError('请选择内容与已授权的出海自媒体账号');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createPublishRecord({
        content_generation_task_id: selectedTaskId,
        social_media_account_id: selectedAccountId,
      });
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (e) {
      setError(scrubInternalPublishTerms((e as Error).message || '提交失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const articlePreview = (t: ContentGenerationTask) => {
    const text = t.generated_article || '';
    return text.length > 120 ? text.slice(0, 120) + '…' : text || t.keyword_text || t.task_id;
  };

  return (
    <div className={`min-h-0 flex-1 overflow-y-auto no-scrollbar transition-colors duration-500 ${isDark ? 'bg-geo-bg text-white' : 'bg-[#F5F5F7] text-slate-900'}`}>
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div>
          <button
            type="button"
            onClick={onBack}
            className={`mb-4 inline-flex items-center gap-2 text-sm font-medium transition-colors ${isDark ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-[#E8553F]'}`}
          >
            <ArrowLeft className="w-4 h-4" /> 返回发布记录
          </button>
          <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>出海自媒体发稿</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>选择图文内容与已授权出海账号提交发布</p>
        </div>

        {error && (
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
            {error}
          </div>
        )}
        {submitSuccess && (
          <div className={`p-4 rounded-xl border flex items-center gap-2 ${isDark ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-green-50 border-green-200 text-green-700'}`}>
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            发布任务已创建。若所选账号未授权，仅创建记录不实际发送；授权后可在发布记录中点击「再次发送」。
          </div>
        )}

        <section className={cardCls}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-700/80">
            <h3 className={`flex items-center gap-2 text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <FileText className="w-5 h-5 text-[#E8553F]" /> 选择图文内容
            </h3>
          </div>
          <div className="p-5">
            {loadingArticles ? (
              <div className={`flex items-center gap-2 py-8 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                <Loader2 className="w-5 h-5 animate-spin text-[#E8553F]" /> 加载中…
              </div>
            ) : articles.length === 0 ? (
              <p className={`py-6 text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>暂无内容生成记录，请先在内容生成中生成文章</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
                {articles.map((t) => (
                  <div
                    key={t.task_id}
                    onClick={() => setSelectedTaskId(selectedTaskId === t.task_id ? null : t.task_id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all
                      ${selectedTaskId === t.task_id ? itemSelected : itemBorder}
                    `}
                  >
                    <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {t.article_title?.trim()
                        || (t.generated_article
                          ? (t.generated_article.split('\n').find((l) => l.trim()) || '').replace(/^#+\s*/, '').trim()
                          : '')
                        || t.keyword_text
                        || t.task_id}
                    </div>
                    <div className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                      {articlePreview(t)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={cardCls}>
          <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-700/80">
            <h3 className={`flex items-center gap-2 text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              <User className="w-5 h-5 text-[#E8553F]" /> 选择出海自媒体账号
            </h3>
          </div>
          <div className="p-5">
            {loadingAccounts ? (
              <div className={`flex items-center gap-2 py-8 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>
                <Loader2 className="w-5 h-5 animate-spin text-[#E8553F]" /> 加载中…
              </div>
            ) : accounts.length === 0 ? (
              <p className={`py-6 text-sm ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>暂无已授权的出海自媒体账号，请先在「出海自媒体账号」中绑定</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {accounts.map((a) => {
                  const canSelect = a.id != null;
                  const isAuthorized = a.authorized !== false;
                  return (
                    <div
                      key={a.id != null ? `acc-${a.id}` : `cfg-${a.platform}`}
                      onClick={() => canSelect && setSelectedAccountId(selectedAccountId === a.id ? null : a.id)}
                      className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-all
                        ${selectedAccountId === a.id ? itemSelected : itemBorder}
                      `}
                    >
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? 'bg-zinc-700' : 'bg-gray-100'}`}>
                          <User className="w-5 h-5 text-[#E8553F]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {a.displayName || a.nickname || a.platform}
                        </div>
                        <div className={`text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                          {a.platform}
                          {!isAuthorized && <span className="ml-1">(未授权)</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !selectedTaskId || !selectedAccountId}
            className="btn-geo-primary inline-flex items-center gap-2"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            提交发布
          </button>
          <button
            type="button"
            onClick={onBack}
            className="btn-geo-secondary"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticlePublishPage;
