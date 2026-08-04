
import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, User, Calendar, Trash2, 
  ChevronRight, X, Image as ImageIcon, Check, Loader2,
  ArrowRight, Sparkles, BoxSelect, Clock, AlignLeft
} from 'lucide-react';
import { Theme, Article } from '../types';
import { articlesAPI, type Article as ApiArticle } from '../api/articles';
import { getMyColumns, getMyCategories, type ColumnTreeNode, type CategoryItem } from '../api/merchants';
import { useModuleI18n } from '../i18n/hooks';
import BlogManagementWebMain from './BlogManagementWebMain';

interface BlogManagementProps {
  theme: Theme;
  /** 子站资讯（默认）；`web_main` 为营销主站根域资讯 */
  siteScope?: 'aieo' | 'web_main';
}

/** 用于 datetime-local 的当前本地时间字符串 YYYY-MM-DDTHH:mm */
function getNowDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 将接口返回的日期/时间字符串转为 datetime-local 值 */
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

/** 提交给后端的 publish_date（与原先一致为 YYYY-MM-DD，取自用户选择的本地日期） */
function publishDateFromLocalInput(dateTimeLocal: string): string {
  if (!dateTimeLocal || dateTimeLocal.length < 10) return new Date().toISOString().split('T')[0];
  return dateTimeLocal.slice(0, 10);
}

function resolveColumnName(columns: ColumnTreeNode[], columnId: number | null | undefined): string {
  if (columnId == null) return '—';
  for (const p of columns) {
    if (p.id === columnId) return p.name;
    if (p.children?.length) {
      const child = p.children.find(c => c.id === columnId);
      if (child) return `${p.name} › ${child.name}`;
    }
  }
  return '—';
}

function mapApiArticle(a: ApiArticle, columns: ColumnTreeNode[]): Article {
  return {
    id: a.id,
    title: a.title,
    subtitle: a.subtitle,
    category: a.category,
    column: resolveColumnName(columns, a.column_id),
    column_id: a.column_id,
    image: a.image,
    content: a.content,
    author: a.author,
    date: a.date,
  };
}

const BlogManagement: React.FC<BlogManagementProps> = ({ theme, siteScope = 'aieo' }) => {
  const { t } = useModuleI18n('site');
  const defaultAuthor = t('blogManagement.defaultAuthor');

  if (siteScope === 'web_main') {
    return <BlogManagementWebMain theme={theme} />;
  }

  // 强制使用白橙明亮主题
  const isDark = false;
  const geoBlue = '#3B82F6'; // 主色蓝
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [currentArticleId, setCurrentArticleId] = useState<string | null>(null);
  
  const [columns, setColumns] = useState<ColumnTreeNode[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [publishDateTimeLocal, setPublishDateTimeLocal] = useState(getNowDateTimeLocal);

  const reloadArticles = async (columnTree: ColumnTreeNode[] = columns) => {
    const apiArticles = await articlesAPI.listArticles({ format: 'list' }) as ApiArticle[];
    setArticles(apiArticles.map(a => mapApiArticle(a, columnTree)));
  };

  // 从 API 加载文章列表
  useEffect(() => {
    const loadArticles = async () => {
      try {
        setLoading(true);
        setError(null);
        await reloadArticles();
      } catch (err: any) {
        console.error('加载文章列表失败:', err);
        setError(t('blogManagement.loadFailed', { error: err.message || t('blogManagement.unknownError') }));
        setArticles([]);
      } finally {
        setLoading(false);
      }
    };

    loadArticles();
  }, []);

  useEffect(() => {
    getMyColumns().then(setColumns).catch(() => setColumns([]));
  }, []);

  useEffect(() => {
    getMyCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (columns.length === 0) return;
    reloadArticles(columns).catch(() => {});
  }, [columns]);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    category_id: null as number | null,
    author: defaultAuthor,
    content: '',
    image: '',
    column_id: null as number | null,
  });

  /** 正文排版：标准化换行并保留 Markdown 结构（标题/列表/分隔线） */
  const formatArticleContent = (raw: string): string => {
    const normalized = raw.replace(/\r\n/g, '\n').trim();
    if (!normalized) return '';
    const lines = normalized
      .split('\n')
      .map(line => line.replace(/\s+$/g, ''));

    const out: string[] = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t) {
        if (out.length > 0 && out[out.length - 1] !== '') out.push('');
        continue;
      }
      // Markdown 分隔线统一为空行，避免展示成 "---"
      if (/^-{3,}$/.test(t)) {
        if (out.length > 0 && out[out.length - 1] !== '') out.push('');
        continue;
      }
      // 标题/列表前补一个空行，便于发布页阅读
      const isHeading = /^#{1,6}\s+/.test(t);
      const isList = /^(\d+\.\s+|[-*+]\s+)/.test(t);
      if ((isHeading || isList) && out.length > 0 && out[out.length - 1] !== '') {
        out.push('');
      }
      out.push(line);
    }

    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  };

  const escapeHtml = (text: string): string =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  /** 发布用：将纯文本/Markdown 风格正文转为可展示的 HTML 结构 */
  const toPublishedHtmlContent = (raw: string): string => {
    const normalized = formatArticleContent(raw);
    if (!normalized) return '';

    const blocks = normalized.split(/\n{2,}/).map(b => b.trim()).filter(Boolean);
    const htmlBlocks: string[] = [];

    for (const block of blocks) {
      if (/^-{3,}$/.test(block)) {
        htmlBlocks.push('<hr />');
        continue;
      }

      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;

      const isListBlock = lines.every(line => /^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line));
      if (isListBlock) {
        const isOrdered = lines.every(line => /^\d+\.\s+/.test(line));
        const tag = isOrdered ? 'ol' : 'ul';
        const items = lines
          .map(line => line.replace(/^([-*+]|\d+\.)\s+/, ''))
          .map(item => `<li>${escapeHtml(item)}</li>`)
          .join('');
        htmlBlocks.push(`<${tag}>${items}</${tag}>`);
        continue;
      }

      if (lines.length === 1) {
        const single = lines[0];
        if (/^[一二三四五六七八九十]+、/.test(single) || /^\d+(\.\d+)*\s+/.test(single)) {
          htmlBlocks.push(`<h3>${escapeHtml(single)}</h3>`);
          continue;
        }
        if (single.endsWith('：')) {
          htmlBlocks.push(`<h4>${escapeHtml(single)}</h4>`);
          continue;
        }
      }

      const paragraph = lines.map(escapeHtml).join('<br />');
      htmlBlocks.push(`<p>${paragraph}</p>`);
    }

    return htmlBlocks.join('\n');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentArticleId(null);
    setPublishDateTimeLocal(getNowDateTimeLocal());
    setFormData({ title: '', subtitle: '', category_id: null, author: defaultAuthor, content: '', image: '', column_id: null });
  };

  /** 编辑文章：拉取详情并填充表单 */
  const handleEdit = async (article: Article) => {
    setCurrentArticleId(article.id);
    setIsModalOpen(true);
    try {
      const detail = await articlesAPI.getArticle(article.id, 'list') as ApiArticle & { category_id?: number | null; column_id?: number | null; publish_date?: string };
      const rawPublish = detail.publish_date ?? detail.date;
      setPublishDateTimeLocal(toDateTimeLocalValue(rawPublish));
      setFormData({
        title: detail.title,
        subtitle: detail.subtitle ?? '',
        category_id: detail.category_id ?? null,
        author: detail.author ?? defaultAuthor,
        content: detail.content ?? '',
        image: detail.image ?? '',
        column_id: detail.column_id ?? null,
      });
    } catch (err: any) {
      console.error('加载文章详情失败:', err);
      alert(t('blogManagement.loadDetailFailed', { error: err.message || t('blogManagement.unknownError') }));
      handleCloseModal();
    }
  };

  // 生成封面图
  const handleGenerateCover = async () => {
    if (!formData.title.trim()) {
      alert(t('blogManagement.enterTitleFirst'));
      return;
    }
    
    setIsGeneratingCover(true);
    try {
      // 如果文章还没有创建，先创建草稿
      let articleId = currentArticleId;
      if (!articleId) {
        const articleData = {
          title: formData.title,
          excerpt: formData.subtitle || '',
          content: formData.content || '',
          author_name: formData.author,
          cover_image: '',
          tags: categories.find(c => c.id === formData.category_id)?.name ? [categories.find(c => c.id === formData.category_id)!.name] : [],
          category_id: formData.category_id,
          column_id: formData.column_id,
          status: 'draft' as const,
          publish_date: publishDateFromLocalInput(publishDateTimeLocal)
        };
        
        const newArticle = await articlesAPI.createArticle(articleData);
        // 优先使用 article_id（UUID），如果没有则使用 id（数据库主键）
        articleId = (newArticle as any).article_id || newArticle.id;
        setCurrentArticleId(articleId);
      }
      
      // 调用生成封面图API
      const result = await articlesAPI.generateCoverImage(articleId);
      if (result && result.cover_image) {
        setFormData({ ...formData, image: result.cover_image });
        alert(t('blogManagement.coverSuccess'));
      } else {
        alert(t('blogManagement.coverFailed'));
      }
    } catch (err: any) {
      console.error('生成封面图失败:', err);
      alert(t('blogManagement.coverFailedDetail', { error: err.message || t('blogManagement.unknownError') }));
    } finally {
      setIsGeneratingCover(false);
    }
  };

  // 生成文案
  const handleGenerateContent = async () => {
    if (!formData.title.trim()) {
      alert(t('blogManagement.enterTitleFirst'));
      return;
    }
    
    setIsGeneratingContent(true);
    try {
      // 如果文章还没有创建，先创建草稿
      let articleId = currentArticleId;
      if (!articleId) {
        const articleData = {
          title: formData.title,
          excerpt: formData.subtitle || '',
          content: formData.content || '',
          author_name: formData.author,
          cover_image: formData.image || '',
          tags: categories.find(c => c.id === formData.category_id)?.name ? [categories.find(c => c.id === formData.category_id)!.name] : [],
          category_id: formData.category_id,
          column_id: formData.column_id,
          status: 'draft' as const,
          publish_date: publishDateFromLocalInput(publishDateTimeLocal)
        };
        
        const newArticle = await articlesAPI.createArticle(articleData);
        // 优先使用 article_id（UUID），如果没有则使用 id（数据库主键）
        articleId = (newArticle as any).article_id || newArticle.id;
        setCurrentArticleId(articleId);
      }
      
      // 调用生成文案API（使用默认知识库ID 1，实际应该让用户选择）
      const knowledgeBaseIds = [1]; // TODO: 从用户选择获取
      const result = await articlesAPI.generateContent(articleId, knowledgeBaseIds);
      if (result && result.content) {
        setFormData({ ...formData, content: result.content });
        alert(t('blogManagement.contentSuccess'));
      } else {
        alert(t('blogManagement.contentFailed'));
      }
    } catch (err: any) {
      console.error('生成文案失败:', err);
      alert(t('blogManagement.contentFailedDetail', { error: err.message || t('blogManagement.unknownError') }));
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const handleCreate = async () => {
    setIsUploading(true);
    try {
      const formattedContent = formatArticleContent(formData.content);
      const publishedHtmlContent = toPublishedHtmlContent(formattedContent);
      const articleData = {
        title: formData.title,
        excerpt: formData.subtitle,
        content: publishedHtmlContent || formattedContent,
        author_name: formData.author,
        cover_image: formData.image || 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&q=80&w=800',
        tags: formData.category_id ? [categories.find(c => c.id === formData.category_id)?.name].filter(Boolean) as string[] : [],
        category_id: formData.category_id,
        column_id: formData.column_id,
        status: 'published' as const,
        publish_date: publishDateFromLocalInput(publishDateTimeLocal)
      };
      
      // 如果已经有文章ID（可能是草稿），则更新；否则创建新文章
      if (currentArticleId) {
        await articlesAPI.updateArticle(currentArticleId, {
          ...articleData,
          status: 'published'
        });
      } else {
        await articlesAPI.createArticle(articleData);
      }
      
      // 重新加载文章列表
      await reloadArticles(columns);
      
      setIsModalOpen(false);
      setCurrentArticleId(null);
      setPublishDateTimeLocal(getNowDateTimeLocal());
      setFormData({ title: '', subtitle: '', category_id: null, author: defaultAuthor, content: '', image: '', column_id: null });
    } catch (err: any) {
      console.error('创建文章失败:', err);
      alert(t('blogManagement.createFailed', { error: err.message || t('blogManagement.unknownError') }));
    } finally {
      setIsUploading(false);
    }
  };

  const deleteArticle = async (id: string) => {
    if(!confirm(t('blogManagement.confirmDelete'))) {
      return;
    }
    
    try {
      await articlesAPI.deleteArticle(id);
      
      // 重新加载文章列表
      await reloadArticles(columns);
    } catch (err: any) {
      console.error('删除文章失败:', err);
      alert(t('blogManagement.deleteFailed', { error: err.message || t('blogManagement.unknownError') }));
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 lg:p-10 overflow-y-auto no-scrollbar">
        <div className="max-w-[1400px] mx-auto text-center py-20">
          <p className="text-slate-500">{t('blogManagement.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 lg:p-10 overflow-y-auto no-scrollbar">
        <div className="max-w-[1400px] mx-auto text-center py-20">
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
              <p className="text-sm text-slate-500">{t('blogManagement.subtitle')}</p>
            </div>
            <button
              onClick={() => { setCurrentArticleId(null); setPublishDateTimeLocal(getNowDateTimeLocal()); setFormData({ title: '', subtitle: '', category_id: null, author: defaultAuthor, content: '', image: '', column_id: null }); setIsModalOpen(true); }}
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
            <button className="p-3.5 rounded-xl border transition-colors border-slate-200 hover:bg-slate-50 text-slate-600">
              <Filter className="w-5 h-5" />
            </button>
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
                {articles.length > 0 ? articles.map((article) => (
                  <tr key={article.id} className="group transition-colors hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="max-w-md truncate font-medium text-slate-700" title={article.title}>{article.title}</div>
                      {article.subtitle && <div className="text-xs text-slate-400 truncate max-w-md mt-0.5">{article.subtitle}</div>}
                    </td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">{article.column || '—'}</span></td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">{article.category}</span></td>
                    <td className="px-4 py-3"><span className="text-sm flex items-center gap-2 text-slate-600"><User className="w-3.5 h-3.5" />{article.author}</span></td>
                    <td className="px-4 py-3"><span className="text-sm flex items-center gap-2 text-slate-600"><Calendar className="w-3.5 h-3.5" />{article.date}</span></td>
                    <td className="px-4 py-3 text-right flex justify-end gap-1">
                      <button
                        onClick={() => handleEdit(article)}
                        className="p-3.5 rounded-2xl transition-all hover-scale border bg-slate-100 text-slate-400 hover:text-blue-600 border-slate-200"
                        title={t('blogManagement.table.edit')}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteArticle(article.id)}
                        className="p-3.5 rounded-2xl transition-all border bg-slate-100 text-red-500/70 hover:text-red-500 hover:bg-red-50 border-slate-200"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                )) : (
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

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => !isUploading && handleCloseModal()}>
          <div 
            className="w-full max-w-3xl rounded-[2.5rem] shadow-sm overflow-hidden border animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] bg-white border-slate-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-8 border-b flex justify-between items-center border-slate-100">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">{currentArticleId ? t('blogManagement.modalEdit') : t('blogManagement.modalPublish')}</h3>
                <p className="text-xs font-bold  opacity-50 mt-1 tracking-widest text-slate-500">{t('blogManagement.modalHint')}</p>
              </div>
              <button onClick={handleCloseModal} className="p-2.5 rounded-full transition-colors hover:bg-slate-100 text-slate-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-semibold  opacity-40 ml-1 text-slate-600">{t('blogManagement.form.title')}</label>
                  <input 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    placeholder={t('blogManagement.form.titlePlaceholder')} 
                    className="w-full px-5 py-3 rounded-xl border-2 outline-none font-bold transition-all bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500" 
                    style={{ '--tw-border-opacity': '1' } as React.CSSProperties}
                    onFocus={(e) => e.currentTarget.style.borderColor = geoBlue}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgb(241 245 249)'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold  opacity-40 ml-1 text-slate-600">{t('blogManagement.form.subtitle')}</label>
                  <input 
                    value={formData.subtitle}
                    onChange={e => setFormData({...formData, subtitle: e.target.value})}
                    placeholder={t('blogManagement.form.subtitlePlaceholder')} 
                    className="w-full px-5 py-3 rounded-xl border-2 outline-none font-bold transition-all bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500"
                    style={{ '--tw-border-opacity': '1' } as React.CSSProperties}
                    onFocus={(e) => e.currentTarget.style.borderColor = geoBlue}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgb(241 245 249)'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold  opacity-40 ml-1 text-slate-600">{t('blogManagement.form.category')}</label>
                  <select 
                    value={formData.category_id ?? ''}
                    onChange={e => setFormData({...formData, category_id: e.target.value ? parseInt(e.target.value, 10) : null})}
                    className="w-full px-5 py-3 rounded-xl border-2 outline-none font-bold appearance-none transition-all bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500"
                    style={{ '--tw-border-opacity': '1' } as React.CSSProperties}
                    onFocus={(e) => e.currentTarget.style.borderColor = geoBlue}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgb(241 245 249)'}>
                    <option value="">{t('blogManagement.form.uncategorized')}</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold  opacity-40 ml-1 text-slate-600">{t('blogManagement.form.author')}</label>
                  <input 
                    value={formData.author}
                    onChange={e => setFormData({...formData, author: e.target.value})}
                    placeholder={t('blogManagement.form.authorPlaceholder')} 
                    className="w-full px-5 py-3 rounded-xl border-2 outline-none font-bold transition-all bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500"
                    style={{ '--tw-border-opacity': '1' } as React.CSSProperties}
                    onFocus={(e) => e.currentTarget.style.borderColor = geoBlue}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgb(241 245 249)'}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold  opacity-40 ml-1 text-slate-600">{t('blogManagement.form.column')}</label>
                  <select 
                    value={formData.column_id ?? ''}
                    onChange={e => setFormData({...formData, column_id: e.target.value ? parseInt(e.target.value, 10) : null})}
                    className="w-full px-5 py-3 rounded-xl border-2 outline-none font-bold appearance-none transition-all bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500"
                    style={{ '--tw-border-opacity': '1' } as React.CSSProperties}
                    onFocus={(e) => e.currentTarget.style.borderColor = geoBlue}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgb(241 245 249)'}>
                    <option value="">{t('blogManagement.form.noColumn')}</option>
                    {columns.flatMap(p => {
                      if (p.children && p.children.length > 0) {
                        return p.children.map(ch => <option key={ch.id} value={ch.id}>{p.name} › {ch.name}</option>);
                      }
                      return [<option key={p.id} value={p.id}>{p.name}</option>];
                    })}
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
                      style={{ '--tw-border-opacity': '1' } as React.CSSProperties}
                      onFocus={(e) => { e.currentTarget.style.borderColor = geoBlue; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgb(241 245 249)'; }}
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
                  <p className="text-[11px] opacity-50 ml-1 text-slate-500">{t('blogManagement.form.publishTimeHint')}</p>
                </div>
              </div>

              {/* Full Width Fields */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold  opacity-40 ml-1 text-slate-600">{t('blogManagement.form.content')}</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, content: formatArticleContent(prev.content) }))}
                      disabled={!formData.content.trim()}
                      className="px-4 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-slate-200"
                    >
                      <AlignLeft className="w-3 h-3 inline-block mr-2" />
                      {t('blogManagement.form.formatContent')}
                    </button>
                    <button
                      type="button"
                      onClick={handleGenerateContent}
                      disabled={isGeneratingContent || !formData.title.trim()}
                      className="px-4 py-2 rounded-lg text-xs font-bold  text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                      style={{ 
                        backgroundColor: isGeneratingContent || !formData.title.trim() ? '#ccc' : '#10b981',
                      }}
                    >
                      {isGeneratingContent ? (
                        <>
                          <Loader2 className="w-3 h-3 inline-block mr-2 animate-spin text-blue-500" />
                          {t('blogManagement.form.generating')}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 inline-block mr-2" />
                          {t('blogManagement.form.aiGenerateContent')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <textarea 
                  rows={8}
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  placeholder={t('blogManagement.form.contentPlaceholder')} 
                  className="w-full px-5 py-4 rounded-2xl border-2 outline-none font-medium leading-relaxed transition-all bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500"
                  style={{ '--tw-border-opacity': '1' } as React.CSSProperties}
                  onFocus={(e) => e.currentTarget.style.borderColor = geoBlue}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'rgb(241 245 249)'}
                />
              </div>

              {/* Image Upload Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold  opacity-40 ml-1 text-slate-600">{t('blogManagement.form.cover')}</label>
                  <button
                    type="button"
                    onClick={handleGenerateCover}
                    disabled={isGeneratingCover || !formData.title.trim()}
                    className="px-4 py-2 rounded-lg text-xs font-bold  text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                    style={{ 
                      backgroundColor: isGeneratingCover || !formData.title.trim() ? '#ccc' : '#3b82f6',
                    }}
                  >
                    {isGeneratingCover ? (
                      <>
                        <Loader2 className="w-3 h-3 inline-block mr-2 animate-spin text-blue-500" />
                        {t('blogManagement.form.generating')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 inline-block mr-2" />
                        {t('blogManagement.form.aiGenerateCover')}
                      </>
                    )}
                  </button>
                </div>
                <div 
                  className="w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-colors group cursor-pointer bg-slate-50 border-slate-200"
                  style={{ '--tw-border-opacity': '1' } as React.CSSProperties}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = geoBlue + '80'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgb(226 232 240)'}>
                   {formData.image ? (
                     <img src={formData.image} alt={t('blogManagement.form.coverPreview')} className="w-full h-full object-cover rounded-2xl" />
                   ) : (
                     <>
                       <ImageIcon className="w-10 h-10 opacity-20 group-hover:opacity-100 transition-opacity text-slate-400" />
                       <span className="text-xs font-bold opacity-40  text-slate-500">{t('blogManagement.form.coverUploadHint')}</span>
                       <input 
                        type="text" 
                        placeholder={t('blogManagement.form.coverUrlPlaceholder')} 
                        value={formData.image}
                        onChange={e => setFormData({...formData, image: e.target.value})}
                        className="bg-transparent border-none outline-none text-xs text-center w-full max-w-xs opacity-60 text-slate-500" 
                       />
                     </>
                   )}
                </div>
              </div>
            </div>

            <div className={`p-8 border-t flex justify-end gap-4 ${isDark ? 'bg-black/20 border-geo-border' : 'bg-slate-50'}`}>
              <button 
                onClick={handleCloseModal}
                disabled={isUploading}
                className="px-5 py-2 rounded-xl text-xs font-semibold  text-slate-500 hover:text-white transition-colors">{t('blogManagement.form.cancel')}</button>
              <button 
                onClick={handleCreate}
                disabled={isUploading || !formData.title}
                className={`px-12 py-3 rounded-xl text-xs font-semibold  text-white shadow-xl transition-all hover-scale flex items-center gap-2 ${isDark ? 'bg-gradient-coral shadow-coral hover:opacity-95' : 'bg-slate-900'}`}>
                {isUploading ? <><Loader2 className="w-4 h-4 animate-spin text-blue-500" /> {t('blogManagement.form.publishing')}</> : <><ArrowRight className="w-4 h-4" /> {t('blogManagement.form.confirmPublish')}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogManagement;
