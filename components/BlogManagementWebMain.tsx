/**
 * 营销主站 — 资讯文章（与官网「资讯管理」同版式，独立接口）
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  User,
  Calendar,
  Trash2,
  ChevronRight,
  X,
  Image as ImageIcon,
  Loader2,
  ArrowRight,
  Clock,
  AlignLeft,
  BoxSelect,
  Sparkles,
} from 'lucide-react';
import { Theme, Article } from '../types';
import * as webMain from '../api/webMainSite';
import { useModuleI18n } from '../i18n/hooks';

interface Props {
  theme: Theme;
}

const geoBlue = '#3B82F6';

function getNowDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDateTimeLocalValue(raw: string | undefined | null): string {
  if (!raw || !String(raw).trim()) return getNowDateTimeLocal();
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  const m = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return `${m[1]}T00:00`;
  return getNowDateTimeLocal();
}

function publishDateFromLocalInput(dateTimeLocal: string): string {
  if (!dateTimeLocal || dateTimeLocal.length < 10) return new Date().toISOString().split('T')[0];
  return dateTimeLocal.slice(0, 10);
}

function mapRowToArticle(a: webMain.WebMainArticleRow, catName: string, colName: string): Article {
  return {
    id: a.id,
    title: a.title,
    subtitle: a.excerpt,
    category: catName,
    column: colName,
    column_id: a.column_id,
    image: a.coverImage,
    content: a.content,
    author: a.author?.name || '—',
    date: a.date,
  };
}

const BlogManagementWebMain: React.FC<Props> = ({ theme: _theme }) => {
  void _theme;
  const { t } = useModuleI18n('site');
  const defaultAuthor = t('blogManagement.defaultAuthor');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cols, setCols] = useState<webMain.WebMainColumnRow[]>([]);
  const [cats, setCats] = useState<webMain.WebMainCategoryRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);
  const [publishDateTimeLocal, setPublishDateTimeLocal] = useState(getNowDateTimeLocal);
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'manual' | 'auto'>('all');
  const [articleSlug, setArticleSlug] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    category_id: null as number | null,
    author: defaultAuthor,
    content: '',
    image: '',
    column_id: null as number | null,
  });

  const formatArticleContent = (raw: string): string => {
    const normalized = raw.replace(/\r\n/g, '\n').trim();
    if (!normalized) return '';
    return normalized.replace(/\n{3,}/g, '\n\n');
  };

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const srcQ = sourceFilter === 'all' ? undefined : sourceFilter;
      const [list, cCols, cCats] = await Promise.all([
        webMain.listWebMainArticles(undefined, srcQ),
        webMain.listWebMainColumns(),
        webMain.listWebMainCategories(),
      ]);
      setCols(cCols);
      setCats(cCats);
      const catMap = new Map(cCats.map(c => [c.id, c.name] as const));
      const colMap = new Map(cCols.map(c => [c.id, c.name] as const));
      setArticles(
        list.map(a => {
          const colName = a.column_id != null ? colMap.get(a.column_id) || '—' : '—';
          return mapRowToArticle(a, a.category_id != null ? catMap.get(a.category_id) || '' : '', colName);
        }),
      );
    } catch (err: unknown) {
      setError((err as Error).message || '—');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [sourceFilter]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentArticleId(null);
    setPublishDateTimeLocal(getNowDateTimeLocal());
    setStatus('published');
    setFormData({ title: '', subtitle: '', category_id: null, author: defaultAuthor, content: '', image: '', column_id: null });
    setArticleSlug(null);
  };

  const handleEdit = (article: Article) => {
    setCurrentArticleId(article.id);
    setIsModalOpen(true);
    webMain.listWebMainArticles().then((list) => {
      const r = list.find(x => x.id === article.id);
      if (!r) return;
      setPublishDateTimeLocal(toDateTimeLocalValue(r.date));
      setStatus(r.status === 'published' ? 'published' : 'draft');
      setFormData({
        title: r.title,
        subtitle: r.excerpt ?? '',
        category_id: r.category_id,
        author: r.author?.name || defaultAuthor,
        content: r.content ?? '',
        image: r.coverImage ?? '',
        column_id: r.column_id,
      });
      setArticleSlug(r.slug?.trim() || null);
    });
  };

  const handleGenerateCover = async () => {
    if (!formData.title.trim()) {
      alert(t('blogManagement.enterTitleFirst'));
      return;
    }

    setIsGeneratingCover(true);
    try {
      let articleId = currentArticleId;
      if (!articleId) {
        const draft = await webMain.createWebMainArticle({
          title: formData.title,
          excerpt: formData.subtitle || '',
          content: formData.content || '',
          author_name: formData.author,
          cover_image: formData.image || undefined,
          tags: formData.category_id
            ? ([cats.find(c => c.id === formData.category_id)?.name].filter(Boolean) as string[])
            : [],
          category_id: formData.category_id,
          column_id: formData.column_id,
          status: 'draft',
          publish_date: publishDateFromLocalInput(publishDateTimeLocal),
        });
        articleId = draft.id;
        setCurrentArticleId(articleId);
      }

      const coverUrl = await webMain.generateWebMainArticleCover(articleId);
      setFormData(prev => ({ ...prev, image: coverUrl }));
    } catch (err: unknown) {
      alert((err as Error).message || t('blogManagement.coverFailed'));
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const handleSave = async () => {
    setIsUploading(true);
    try {
      const body = {
        title: formData.title,
        excerpt: formData.subtitle || '',
        content: formData.content || '',
        author_name: formData.author,
        cover_image: formData.image || undefined,
        tags: formData.category_id ? [cats.find(c => c.id === formData.category_id)?.name].filter(Boolean) as string[] : [],
        category_id: formData.category_id,
        column_id: formData.column_id,
        status,
        publish_date: publishDateFromLocalInput(publishDateTimeLocal),
      };
      if (currentArticleId) {
        await webMain.updateWebMainArticle(currentArticleId, body);
      } else {
        await webMain.createWebMainArticle(body);
      }
      await loadAll();
      handleCloseModal();
    } catch (err: unknown) {
      alert((err as Error).message || t('blogManagement.form.saveFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm(t('blogManagement.confirmDelete'))) return;
    try {
      await webMain.deleteWebMainArticle(id);
      await loadAll();
    } catch (err: unknown) {
      alert((err as Error).message || t('blogManagement.deleteFailed'));
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex-1 p-8 lg:p-12 overflow-y-auto no-scrollbar flex items-center justify-center">
          <p className="text-slate-500">{t('blogManagement.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex-1 p-8 lg:p-12 overflow-y-auto no-scrollbar flex items-center justify-center">
          <p className="text-red-500">{t('blogManagement.loadFailed', { error })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 p-8 lg:p-12 overflow-y-auto no-scrollbar">
        <div className="max-w-[1400px] mx-auto space-y-10">
          <div className="flex justify-between items-end">
            <div className="space-y-3">
              <h2 className="text-4xl font-semibold tracking-tight text-slate-900">{t('blogManagement.pageTitle')}</h2>
              <p className="text-sm text-slate-500">{t('blogManagement.webMainSubtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                handleCloseModal();
                setIsModalOpen(true);
              }}
              className="flex items-center gap-3 px-5 py-2.5 rounded-2xl font-semibold text-sm shadow-sm hover-scale bg-gradient-coral text-white shadow-coral hover:opacity-95"
            >
              <Plus className="w-5 h-5" /> {t('blogManagement.newArticle')}
            </button>
          </div>

          <div className="p-4 rounded-2xl border flex items-center gap-4 bg-white border-slate-200 shadow-sm">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-3.5 w-5 h-5 transition-colors text-slate-400" />
              <input
                type="text"
                placeholder={t('blogManagement.searchPlaceholder')}
                className="w-full pl-12 pr-4 py-3 rounded-xl border outline-none font-bold transition-all bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
              />
            </div>
            <select
              className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-slate-50"
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value as 'all' | 'manual' | 'auto')}
            >
              <option value="all">{t('blogManagement.filter.allSources')}</option>
              <option value="manual">{t('blogManagement.filter.manual')}</option>
              <option value="auto">{t('blogManagement.filter.auto')}</option>
            </select>
          </div>

          <div className="rounded-2xl border overflow-hidden shadow-sm bg-white border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">{t('blogManagement.table.title')}</th>
                  <th className="px-4 py-3">{t('blogManagement.table.column')}</th>
                  <th className="px-4 py-3">{t('blogManagement.table.category')}</th>
                  <th className="px-4 py-3">{t('blogManagement.table.author')}</th>
                  <th className="px-4 py-3">{t('blogManagement.table.publishDate')}</th>
                  <th className="px-4 py-3 text-right">{t('blogManagement.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {articles.length > 0 ? (
                  articles.map((article) => (
                    <tr key={article.id} className="group transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="max-w-md truncate font-medium text-slate-700" title={article.title}>
                          {article.title}
                        </div>
                        {article.subtitle && (
                          <div className="text-xs text-slate-400 truncate max-w-md mt-0.5">{article.subtitle}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">{article.column || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">{article.category || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm flex items-center gap-2 text-slate-600">
                          <User className="w-3.5 h-3.5" />
                          {article.author}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm flex items-center gap-2 text-slate-600">
                          <Calendar className="w-3.5 h-3.5" />
                          {article.date}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(article)}
                          className="p-3.5 rounded-2xl transition-all hover-scale border bg-slate-100 text-slate-400 hover:text-blue-600 border-slate-200"
                          title={t('blogManagement.table.edit')}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteArticle(article.id)}
                          className="p-3.5 rounded-2xl transition-all border bg-slate-100 text-red-500/70 hover:text-red-500 hover:bg-red-50 border-slate-200"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <BoxSelect className="w-12 h-12 mb-4 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-500">{t('blogManagement.empty.noArticles')}</p>
                      <p className="text-xs mt-2 text-slate-400">{t('blogManagement.empty.noArticlesHint')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => !isUploading && !isGeneratingCover && handleCloseModal()}
        >
          <div
            className="w-full max-w-3xl rounded-[2.5rem] shadow-sm overflow-hidden border animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] bg-white border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 border-b flex justify-between items-center border-slate-100">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{currentArticleId ? t('blogManagement.modalEdit') : t('blogManagement.modalPublish')}</h3>
                <p className="text-xs font-bold opacity-50 mt-1 tracking-widest text-slate-500">{t('blogManagement.modalWebMainHint')}</p>
              </div>
              <button type="button" onClick={handleCloseModal} className="p-2.5 rounded-full transition-colors hover:bg-slate-100 text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">{t('blogManagement.form.title')}</label>
                  <input
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder={t('blogManagement.form.titlePlaceholder')}
                    className="w-full px-5 py-3 rounded-xl border-2 outline-none font-bold transition-all bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500"
                    onFocus={e => { e.currentTarget.style.borderColor = geoBlue; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgb(241 245 249)'; }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">{t('blogManagement.form.excerpt')}</label>
                  <input
                    value={formData.subtitle}
                    onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder={t('blogManagement.form.subtitlePlaceholder')}
                    className="w-full px-5 py-3 rounded-xl border-2 outline-none font-bold transition-all bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500"
                    onFocus={e => { e.currentTarget.style.borderColor = geoBlue; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgb(241 245 249)'; }}
                  />
                </div>
                {articleSlug && (
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">URL Slug</label>
                    <p className="px-5 py-3 rounded-xl bg-slate-100 text-sm font-mono text-slate-600">/articles/{articleSlug}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">{t('blogManagement.form.category')}</label>
                  <select
                    value={formData.category_id ?? ''}
                    onChange={e =>
                      setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value, 10) : null })}
                    className="w-full px-5 py-3 rounded-xl border-2 outline-none font-bold appearance-none transition-all bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500"
                  >
                    <option value="">{t('blogManagement.form.uncategorized')}</option>
                    {cats.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">{t('blogManagement.form.author')}</label>
                  <input
                    value={formData.author}
                    onChange={e => setFormData({ ...formData, author: e.target.value })}
                    placeholder={t('blogManagement.form.authorPlaceholder')}
                    className="w-full px-5 py-3 rounded-xl border-2 outline-none font-bold transition-all bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">{t('blogManagement.form.webMainColumn')}</label>
                  <select
                    value={formData.column_id ?? ''}
                    onChange={e =>
                      setFormData({ ...formData, column_id: e.target.value ? parseInt(e.target.value, 10) : null })}
                    className="w-full px-5 py-3 rounded-xl border-2 outline-none font-bold appearance-none transition-all bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500"
                  >
                    <option value="">{t('blogManagement.form.noColumn')}</option>
                    {cols.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">{t('blogManagement.form.status')}</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as 'draft' | 'published')}
                    className="w-full px-5 py-3 rounded-xl border-2 outline-none font-bold bg-slate-50 border-slate-100 text-slate-900"
                  >
                    <option value="draft">{t('blogManagement.status.draft')}</option>
                    <option value="published">{t('blogManagement.status.published')}</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">{t('blogManagement.form.publishTime')}</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="datetime-local"
                      value={publishDateTimeLocal}
                      onChange={e => setPublishDateTimeLocal(e.target.value)}
                      className="flex-1 min-w-[200px] px-5 py-3 rounded-xl border-2 outline-none font-bold transition-all bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setPublishDateTimeLocal(getNowDateTimeLocal())}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors shadow-sm shrink-0"
                    >
                      <Clock className="w-4 h-4" />
                      {t('blogManagement.form.useNow')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">{t('blogManagement.form.contentHtml')}</label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, content: formatArticleContent(prev.content) }))}
                    disabled={!formData.content.trim()}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 disabled:opacity-50"
                  >
                    <AlignLeft className="w-3 h-3 inline-block mr-2" />
                    {t('blogManagement.form.mergeBlankLines')}
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder={t('blogManagement.form.contentPlaceholder')}
                  className="w-full px-5 py-4 rounded-2xl border-2 outline-none font-medium leading-relaxed transition-all bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold opacity-40 ml-1 text-slate-600">{t('blogManagement.form.cover')}</label>
                  <button
                    type="button"
                    onClick={handleGenerateCover}
                    disabled={isGeneratingCover || isUploading || !formData.title.trim()}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 bg-blue-500"
                  >
                    {isGeneratingCover ? (
                      <>
                        <Loader2 className="w-3 h-3 inline-block mr-2 animate-spin" />
                        {t('blogManagement.form.generating')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 inline-block mr-2" />
                        {formData.image ? t('blogManagement.form.regenerateCover') : t('blogManagement.form.aiGenerateCover')}
                      </>
                    )}
                  </button>
                </div>
                <div className="w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 bg-slate-50 border-slate-200 overflow-hidden">
                  {formData.image ? (
                    <img src={formData.image} alt={t('blogManagement.form.coverPreview')} className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <>
                      <ImageIcon className="w-10 h-10 opacity-20 text-slate-400" />
                      <span className="text-xs font-bold opacity-40 text-slate-500">{t('blogManagement.form.coverUploadHint')}</span>
                      <input
                        type="text"
                        placeholder={t('blogManagement.form.coverUrlPlaceholder')}
                        value={formData.image}
                        onChange={e => setFormData({ ...formData, image: e.target.value })}
                        className="bg-transparent border-none outline-none text-xs text-center w-full max-w-xs text-slate-500"
                      />
                    </>
                  )}
                </div>
                {formData.image ? (
                  <input
                    type="text"
                    placeholder={t('blogManagement.form.coverUrlEdit')}
                    value={formData.image}
                    onChange={e => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 bg-slate-50"
                  />
                ) : null}
              </div>
            </div>

            <div className="p-8 border-t flex justify-end gap-4 bg-slate-50">
              <button type="button" onClick={handleCloseModal} disabled={isUploading || isGeneratingCover} className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-500 disabled:opacity-50">
                {t('blogManagement.form.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isUploading || !formData.title.trim()}
                className="px-12 py-3 rounded-xl text-xs font-semibold text-white shadow-xl transition-all hover-scale flex items-center gap-2 bg-slate-900"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> {t('blogManagement.form.saving')}
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" /> {t('blogManagement.form.save')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogManagementWebMain;
