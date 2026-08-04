
import React, { useState, useEffect } from 'react';
import { Plus, Save, X, FileText, Edit2, Trash2, LayoutTemplate, Loader2, Search, Eye, EyeOff, Star } from 'lucide-react';
import { Theme, ArticleTemplate } from '../types';
import { getArticleTemplates, createArticleTemplate, updateArticleTemplate, deleteArticleTemplate, setArticleTemplateDefault } from '../api/contentGeneration';

interface ArticleTemplateManagerProps {
  theme: Theme;
}

const ArticleTemplateManager: React.FC<ArticleTemplateManagerProps> = ({ theme }) => {
  const isDark = theme === 'dark';

  const [templatesList, setTemplatesList] = useState<ArticleTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ArticleTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    title: '',
    content: '',
    description: '',
    prompt_template: '',
    enricher_hints: '',
    market: 'domestic' as 'domestic' | 'overseas',
  });
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [marketTab, setMarketTab] = useState<'domestic' | 'overseas'>('domestic');

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await getArticleTemplates({ limit: 200, market: marketTab });
      setTemplatesList(res.templates || []);
    } catch {
      setTemplatesList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadTemplates(); }, [marketTab]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    if (!templateForm.title.trim() || !templateForm.content.trim()) {
      showMsg('error', '请填写模板标题和内容');
      return;
    }
    try {
      const payload = {
        title: templateForm.title,
        content: templateForm.content,
        description: templateForm.description,
        prompt_template: templateForm.prompt_template || undefined,
        enricher_hints: templateForm.enricher_hints || undefined,
        market: templateForm.market,
      };
      if (editingTemplate) {
        await updateArticleTemplate(editingTemplate.id, payload);
        showMsg('success', '模板更新成功');
      } else {
        await createArticleTemplate(payload);
        showMsg('success', '模板创建成功');
      }
      setShowForm(false);
      setEditingTemplate(null);
      setTemplateForm({
        title: '',
        content: '',
        description: '',
        prompt_template: '',
        enricher_hints: '',
        market: marketTab,
      });
      loadTemplates();
    } catch (err: any) {
      showMsg('error', err.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此模板？')) return;
    try {
      await deleteArticleTemplate(id);
      showMsg('success', '模板已删除');
      loadTemplates();
    } catch (err: any) {
      showMsg('error', err.message || '删除失败');
    }
  };

  const handleToggleDefault = async (tpl: ArticleTemplate) => {
    if (!tpl.is_default && !tpl.is_active) {
      showMsg('error', '请先启用该范文再设为默认');
      return;
    }
    try {
      if (tpl.is_default) {
        await updateArticleTemplate(tpl.id, { is_default: false });
        showMsg('success', '已取消默认范文');
      } else {
        await setArticleTemplateDefault(tpl.id);
        showMsg('success', '已设为默认范文（自动创建优化任务时将使用）');
      }
      loadTemplates();
    } catch (err: any) {
      showMsg('error', err.message || '操作失败');
    }
  };

  const DEFAULT_PROMPT_TEMPLATE = `文章必须采用排行榜/Top N 榜单形式，标题包含"2025年{keyword}排行榜"。

排行榜要求：
- 包含至少{brand_count}个不同品牌
- "{promoted_brand}"排在第1名，篇幅最详细（至少是其他品牌的2倍）
- 其他品牌使用联网搜索到的真实品牌，不要编造
- 每个排名包含：排名位置、品牌名称、核心优势、特色产品/服务、客观评价

结构：
- 开头：直接给出排行榜结论（结论先行）
- 中间：按排名顺序逐个展开介绍（第1名、第2名、第3名……）
- 结尾：总结排行榜，自然强调{promoted_brand}的综合领先优势

要求：
- 推广要自然，像真实的测评推荐，不要有广告感
- 融入真实使用体验和专业分析
- 其他品牌保持客观，优缺点兼顾`;

  const openEdit = (tpl: ArticleTemplate) => {
    setEditingTemplate(tpl);
    const mk = (tpl.market === 'overseas' ? 'overseas' : 'domestic') as 'domestic' | 'overseas';
    setTemplateForm({
      title: tpl.title,
      content: tpl.content,
      description: tpl.description || '',
      prompt_template: tpl.prompt_template || '',
      enricher_hints: tpl.enricher_hints || '',
      market: mk,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openNew = () => {
    setEditingTemplate(null);
    setTemplateForm({
      title: '',
      content: '',
      description: '',
      prompt_template: '',
      enricher_hints: '',
      market: marketTab,
    });
    setShowForm(true);
  };

  const filtered = templatesList.filter(t =>
    !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`h-full overflow-y-auto ${isDark ? 'bg-geo-bg' : 'bg-slate-50'}`}>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>范文模板管理</h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              管理内容生成范文；设为「默认」后，自动创建智能优化任务时将使用该范文（用户可在驾驶舱编辑中修改）
            </p>
          </div>
          <button onClick={openNew} className={`px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95 shadow-blue-glow' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95 shadow-blue-500/30 shadow-lg'}`}>
            <Plus className="w-4 h-4" /> 新建模板
          </button>
        </div>

        <div className="flex gap-2">
          {(['domestic', 'overseas'] as const).map((mk) => (
            <button
              key={mk}
              type="button"
              onClick={() => setMarketTab(mk)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                marketTab === mk
                  ? 'bg-[#E8553F] text-white'
                  : isDark
                    ? 'bg-zinc-800 text-zinc-400 hover:text-white'
                    : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {mk === 'domestic' ? '国内范文' : '出海范文'}
            </button>
          ))}
        </div>

        {/* Toast */}
        {message && (
          <div className={`px-4 py-3 rounded-xl text-sm font-medium ${message.type === 'success' ? (isDark ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-green-50 text-green-700 border border-green-200') : (isDark ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-700 border border-red-200')}`}>
            {message.text}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className={`p-6 rounded-2xl border ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {editingTemplate ? '编辑模板' : '新建模板'}
              </h3>
              <button onClick={() => setShowForm(false)} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-400'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>市场</label>
                <select
                  value={templateForm.market}
                  onChange={(e) =>
                    setTemplateForm((f) => ({
                      ...f,
                      market: e.target.value as 'domestic' | 'overseas',
                    }))
                  }
                  className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200'}`}
                >
                  <option value="domestic">国内</option>
                  <option value="overseas">出海</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>模板标题 <span className="text-red-400">*</span></label>
                <input
                  type="text" value={templateForm.title}
                  onChange={e => setTemplateForm(f => ({ ...f, title: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border transition-colors ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-geo-blue' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'} outline-none`}
                  placeholder="例如：科技产品评测模板"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>描述</label>
                <input
                  type="text" value={templateForm.description}
                  onChange={e => setTemplateForm(f => ({ ...f, description: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border transition-colors ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-geo-blue' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'} outline-none`}
                  placeholder="简短描述模板用途（可选）"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>范文内容 <span className="text-red-400">*</span></label>
                <textarea
                  rows={14} value={templateForm.content}
                  onChange={e => setTemplateForm(f => ({ ...f, content: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border resize-y transition-colors ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-geo-blue' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'} outline-none`}
                  placeholder="请粘贴或编写范文内容，AI 生成文章时将参考此模板的结构和风格"
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  已输入 {templateForm.content.length} 字
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={`block text-sm font-medium ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>提示词模板</label>
                  {!templateForm.prompt_template && (
                    <button
                      type="button"
                      onClick={() => setTemplateForm(f => ({ ...f, prompt_template: DEFAULT_PROMPT_TEMPLATE }))}
                      className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${isDark ? 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                    >
                      填入排行榜案例
                    </button>
                  )}
                </div>
                <textarea
                  rows={8} value={templateForm.prompt_template}
                  onChange={e => setTemplateForm(f => ({ ...f, prompt_template: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border resize-y transition-colors text-sm ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-geo-blue' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'} outline-none`}
                  placeholder="可选，配置 AI 生成文章时的具体指令。不填则使用系统默认提示词。&#10;&#10;可用占位符：{keyword} 关键词、{promoted_brand} 推广品牌、{category} 品类名称、{brand_count} 品牌数量（默认6）"
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  可用占位符：{'{keyword}'} {'{promoted_brand}'} {'{category}'} {'{brand_count}'}
                </p>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>联网补充信息</label>
                <textarea
                  rows={3} value={templateForm.enricher_hints}
                  onChange={e => setTemplateForm(f => ({ ...f, enricher_hints: e.target.value }))}
                  className={`w-full px-4 py-3 rounded-xl border resize-y transition-colors text-sm ${isDark ? 'bg-zinc-800 border-zinc-700 text-white focus:border-geo-blue' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'} outline-none`}
                  placeholder="可选，指定需要联网搜索的额外信息，多项用逗号分隔。不填则默认搜索竞品品牌。&#10;例如：各品牌课程价格、学员真实评价、行业市场规模"
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                  不填 = 默认搜索竞品品牌；填写 = 竞品 + 你指定的内容
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'}`}>
                  <Save className="w-4 h-4" />{editingTemplate ? '更新模板' : '创建模板'}
                </button>
                <button onClick={() => setShowForm(false)} className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        {!showForm && templatesList.length > 0 && (
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
            <input
              type="text" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm transition-colors ${isDark ? 'bg-zinc-900 border-zinc-700 text-white focus:border-geo-blue placeholder-zinc-500' : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500 placeholder-slate-400'} outline-none`}
              placeholder="搜索模板..."
            />
          </div>
        )}

        {/* Stats */}
        {!showForm && (
          <div className="flex gap-4">
            <div className={`flex-1 px-5 py-4 rounded-2xl border ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'}`}>
              <p className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>模板总数</p>
              <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{templatesList.length}</p>
            </div>
            <div className={`flex-1 px-5 py-4 rounded-2xl border ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'}`}>
              <p className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>已启用</p>
              <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>{templatesList.filter(t => t.is_active).length}</p>
            </div>
            <div className={`flex-1 px-5 py-4 rounded-2xl border ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'}`}>
              <p className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>默认范文</p>
              <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{templatesList.filter(t => t.is_default).length}</p>
            </div>
            <div className={`flex-1 px-5 py-4 rounded-2xl border ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'}`}>
              <p className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>总使用次数</p>
              <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-geo-blue' : 'text-blue-600'}`}>{templatesList.reduce((s, t) => s + t.usage_count, 0)}</p>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className={`w-6 h-6 animate-spin ${isDark ? 'text-geo-blue' : 'text-blue-500'}`} />
            </div>
          ) : filtered.length === 0 ? (
            <div className={`text-center py-20 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              <LayoutTemplate className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm font-medium">{searchQuery ? '未找到匹配的模板' : '暂无范文模板'}</p>
              {!searchQuery && <p className="text-xs mt-1 opacity-60">点击「新建模板」开始创建第一个范文模板</p>}
            </div>
          ) : (
            filtered.map(tpl => (
              <div key={tpl.id} className={`rounded-2xl border transition-all ${isDark ? 'bg-zinc-900 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'}`}>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <FileText className={`w-4 h-4 shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                        <h4 className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{tpl.title}</h4>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full shrink-0 font-medium ${tpl.is_active
                          ? (isDark ? 'bg-green-500/15 text-green-400' : 'bg-green-50 text-green-600 border border-green-200')
                          : (isDark ? 'bg-red-500/15 text-red-400' : 'bg-red-50 text-red-600 border border-red-200')
                        }`}>
                          {tpl.is_active ? '启用' : '禁用'}
                        </span>
                        {tpl.is_default && (
                          <span className={`text-xs px-2.5 py-0.5 rounded-full shrink-0 font-medium ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            默认
                          </span>
                        )}
                      </div>
                      {tpl.description && (
                        <p className={`text-sm mb-2 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{tpl.description}</p>
                      )}
                      <p className={`text-sm leading-relaxed ${expandedId === tpl.id ? '' : 'line-clamp-3'} ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                        {tpl.content}
                      </p>
                      <div className={`flex items-center gap-3 flex-wrap text-xs mt-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                        <span>{tpl.content.length} 字</span>
                        <span>使用 {tpl.usage_count} 次</span>
                        <span>{new Date(tpl.created_at).toLocaleDateString('zh-CN')}</span>
                        {tpl.prompt_template && (
                          <span className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>提示词</span>
                        )}
                        {tpl.enricher_hints && (
                          <span className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>联网补充</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleDefault(tpl)}
                        className={`p-2 rounded-lg transition-colors ${
                          tpl.is_default
                            ? (isDark ? 'text-amber-400 hover:bg-amber-500/10' : 'text-amber-500 hover:bg-amber-50')
                            : (isDark ? 'hover:bg-zinc-800 text-zinc-500 hover:text-amber-400' : 'hover:bg-amber-50 text-slate-400 hover:text-amber-600')
                        }`}
                        title={tpl.is_default ? '取消默认范文' : '设为默认范文'}
                      >
                        <Star className={`w-4 h-4 ${tpl.is_default ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => setExpandedId(expandedId === tpl.id ? null : tpl.id)}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                        title={expandedId === tpl.id ? '收起' : '展开全文'}
                      >
                        {expandedId === tpl.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEdit(tpl)}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-500 hover:text-blue-400' : 'hover:bg-slate-100 text-slate-400 hover:text-blue-500'}`}
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tpl.id)}
                        className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-500 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`}
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticleTemplateManager;
