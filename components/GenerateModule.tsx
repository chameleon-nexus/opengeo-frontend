
import React, { useState, useEffect, useMemo } from 'react';
import { 
    PenTool, BookOpen, Wand2, Loader2,
    ArrowLeft, Check, Network, LayoutTemplate, Award
} from 'lucide-react';
import { Theme, Brand, SemanticSEOTask, ArticleTemplate, RetainedKeyword } from '../types';
import { generateBatch, getArticleTemplates } from '../api/contentGeneration';
import { knowledgeBaseAPI } from '../api/knowledgeBase';
import { semanticSEOAPI } from '../api/semanticSeo';
import { knowledgeAPI } from '../api/knowledge';
import type { ExtractionTask } from '../api/knowledge';
import { useModuleI18n } from '../i18n/hooks';

interface GenerateModuleProps {
  theme: Theme;
  currentBrand?: Brand | null;
  selectedProduct?: string | null;
  onBack?: () => void;
}

const GenerateModule: React.FC<GenerateModuleProps> = ({ theme, currentBrand, onBack }) => {
  const { t } = useModuleI18n('generate');
  const isDark = theme === 'dark';

  // 知识库（可选）
  const [selectedKbId, setSelectedKbId] = useState<number | null>(null);
  const [knowledgeBases, setKnowledgeBases] = useState<any[]>([]);

  /** 语义 SEO / 知识图谱任务 ID，后端从库注入真实关系与共现词 */
  const [selectedKgType, setSelectedKgType] = useState<string | null>(null);
  const [seoTasks, setSeoTasks] = useState<SemanticSEOTask[]>([]);
  const [isLoadingSeoTasks, setIsLoadingSeoTasks] = useState(false);

  // 词包选择
  const [extractionTasks, setExtractionTasks] = useState<ExtractionTask[]>([]);
  const [isLoadingExtractionTasks, setIsLoadingExtractionTasks] = useState(false);
  const [selectedExtractionTaskId, setSelectedExtractionTaskId] = useState<string | null>(null);
  const [selectedPackType, setSelectedPackType] = useState<'normal' | 'semantic' | 'manual' | null>(null);
  // 普通词包的核心词
  const [coreWords, setCoreWords] = useState<string[]>([]);

  // 语义词包下的词条选择
  const [availableKeywords, setAvailableKeywords] = useState<RetainedKeyword[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<RetainedKeyword[]>([]);
  const [isLoadingTaskKeywords, setIsLoadingTaskKeywords] = useState(false);

  // 范文模板选择（多选）
  const [templates, setTemplates] = useState<ArticleTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // 推广品牌
  const [promotedBrand, setPromotedBrand] = useState('');

  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 加载知识库列表
  useEffect(() => {
    const loadKnowledgeBases = async () => {
      try {
        const response = await knowledgeBaseAPI.list();
        if (response.knowledge_bases && response.knowledge_bases.length > 0) {
          setKnowledgeBases(response.knowledge_bases);
          if (!selectedKbId) setSelectedKbId(response.knowledge_bases[0].id);
        }
      } catch (err) {
        console.error('加载知识库失败:', err);
      }
    };
    loadKnowledgeBases();
  }, []);

  useEffect(() => {
    loadSeoTasks();
  }, []);

  const loadSeoTasks = async () => {
    setIsLoadingSeoTasks(true);
    try {
      const tasks = await semanticSEOAPI.listTasks({ limit: 50 });
      const list = tasks || [];
      setSeoTasks(list);
      setSelectedKgType((prev) => {
        if (prev && list.some((t) => t.task_id === prev)) return prev;
        return list.length > 0 ? list[0].task_id : null;
      });
    } catch {
      setSeoTasks([]);
      setSelectedKgType(null);
    } finally {
      setIsLoadingSeoTasks(false);
    }
  };

  // 加载词包列表（普通 / 手动 / 语义）
  useEffect(() => {
    const loadExtractionTasks = async () => {
      setIsLoadingExtractionTasks(true);
      try {
        const response = await knowledgeAPI.getExtractionHistory({ limit: 100 });
        setExtractionTasks(response.tasks || []);
      } catch { setExtractionTasks([]); }
      finally { setIsLoadingExtractionTasks(false); }
    };
    loadExtractionTasks();
  }, []);

  // 加载范文模板列表
  useEffect(() => {
    const loadTemplates = async () => {
      setIsLoadingTemplates(true);
      try {
        const res = await getArticleTemplates({ is_active: true, limit: 100 });
        setTemplates(res.templates || []);
      } catch { setTemplates([]); }
      finally { setIsLoadingTemplates(false); }
    };
    loadTemplates();
  }, []);

  // 判断词包类型
  const getPackType = (modelType?: string): 'normal' | 'semantic' | 'manual' => {
    if (modelType === 'traditional' || modelType === 'word_expand') return 'normal';
    if (modelType === 'manual') return 'manual';
    return 'semantic';
  };

  // 选中词包后加载词条
  useEffect(() => {
    if (!selectedExtractionTaskId) {
      setAvailableKeywords([]);
      setSelectedKeywords([]);
      setSelectedPackType(null);
      setCoreWords([]);
      return;
    }
    const loadTaskKeywords = async () => {
      setIsLoadingTaskKeywords(true);
      try {
        const res = await knowledgeAPI.getExtractionTaskKeywords(selectedExtractionTaskId);
        const mt = res.model_type || 'semantic';
        const packType = getPackType(mt);
        setSelectedPackType(packType);

        if (packType === 'normal') {
          // 普通词包：核心词就是生成关键词，只生成一篇文章
          const savedCoreWords: string[] = (res as any).core_words || [];
          setCoreWords(savedCoreWords);

          // 用核心词（第一个）作为唯一关键词
          const coreWord = savedCoreWords[0] || '';
          if (coreWord) {
            const kw: RetainedKeyword = { id: 1, text: coreWord, score: 100, iteration: 1 };
            setAvailableKeywords([kw]);
            setSelectedKeywords([kw]);
          } else {
            setAvailableKeywords([]);
            setSelectedKeywords([]);
          }
        } else if (packType === 'manual') {
          setCoreWords([]);
          const keywords = aggregateTaskKeywordsToRetained(res);
          setAvailableKeywords(keywords);
          setSelectedKeywords(keywords);
        } else {
          setCoreWords([]);
          const keywords = aggregateTaskKeywordsToRetained(res);
          setAvailableKeywords(keywords);
          setSelectedKeywords(keywords);
        }
      } catch {
        setAvailableKeywords([]);
        setSelectedKeywords([]);
        setSelectedPackType(null);
      } finally {
        setIsLoadingTaskKeywords(false);
      }
    };
    loadTaskKeywords();
  }, [selectedExtractionTaskId]);

  const aggregateTaskKeywordsToRetained = (res: any): RetainedKeyword[] => {
    const toText = (x: string | { text: string; [k: string]: unknown }): string =>
      typeof x === 'string' ? x : (x?.text ?? '');
    const list: RetainedKeyword[] = [];
    let id = 1;
    const push = (text: string, score = 80, source?: 'semantic_keyword' | 'semantic_extension') => {
      if (!text.trim()) return;
      list.push({ id: id++, text, score, iteration: 1, retained_at: undefined, source });
    };
    const mt = res.model_type || 'semantic';
    if (mt === 'semantic_v2') {
      (res.semantic_keywords || []).forEach((kw: any) => push(typeof kw === 'string' ? kw : kw.text, kw?.score ?? 80, 'semantic_keyword'));
      (res.longtail_questions || []).forEach((q: any) => push(typeof q === 'string' ? q : q?.text ?? toText(q), 80, 'semantic_extension'));
      (res.semantic_extension_questions || []).forEach((q: any) => push(typeof q === 'string' ? q : q?.text ?? toText(q), 80, 'semantic_extension'));
      (res.brand_pack_questions || []).forEach((q: any) => push(typeof q === 'string' ? q : toText(q), 80, 'semantic_extension'));
      (res.qa_pack_questions || []).forEach((q: any) => push(typeof q === 'string' ? q : toText(q), 80, 'semantic_extension'));
      (res.competitor_pack_questions || []).forEach((q: any) => push(typeof q === 'string' ? q : toText(q), 80, 'semantic_extension'));
    } else if (mt === 'manual' || mt === 'word_expand') {
      // 普通词包和手动词包：仅从 semantic_keywords/phrases 取词，后端 longtail_questions 与 semantic_keywords 同源会重复
      (res.semantic_keywords || res.keywords || []).forEach((kw: any) => push(typeof kw === 'string' ? kw : kw.text, kw?.score ?? 80));
    } else {
      (res.semantic_keywords || res.keywords || []).forEach((kw: any) => push(typeof kw === 'string' ? kw : kw.text, kw?.score ?? 80, 'semantic_keyword'));
      (res.longtail_questions || []).forEach((q: any) => push(typeof q === 'string' ? q : q?.text ?? toText(q), 80, 'semantic_extension'));
      (res.semantic_extension_questions || []).forEach((q: any) => push(typeof q === 'string' ? q : q?.text ?? toText(q), 80, 'semantic_extension'));
    }
    return list;
  };

  const semanticCoreKeywords = useMemo(() => {
    if (selectedPackType !== 'semantic') return [];
    return availableKeywords.filter(k => k.source === 'semantic_keyword');
  }, [selectedPackType, availableKeywords]);

  const semanticExtensionKeywords = useMemo(() => {
    if (selectedPackType !== 'semantic') return [];
    return availableKeywords.filter(k => k.source !== 'semantic_keyword');
  }, [selectedPackType, availableKeywords]);

  const toggleTemplate = (id: number) => {
    setSelectedTemplateIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!selectedExtractionTaskId) { alert(t('errors.selectPack')); return; }
    if (!selectedKgType) {
      alert(t('errors.selectKg'));
      return;
    }

    const keywords = selectedPackType === 'normal'
      ? availableKeywords.map(kw => kw.text)
      : selectedKeywords.map(kw => kw.text);

    if (keywords.length === 0) {
      alert(selectedPackType !== 'normal' ? t('errors.selectKeyword') : t('errors.noKeywordsInPack'));
      return;
    }

    setIsSubmitting(true);
    try {
      await generateBatch({
        core_word: coreWords[0] || '',
        promoted_brand: promotedBrand.trim() || undefined,
        extraction_task_id: selectedExtractionTaskId,
        pack_type: selectedPackType || 'semantic',
        keywords,
        template_ids: selectedTemplateIds,
        knowledge_base_id: selectedKbId,
        kg_type: selectedKgType,
      });
      if (onBack) onBack();
    } catch (err: any) {
      alert(t('errors.generateFailed', { message: err.message || '' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 计算将要生成的文章数
  const kwCount = selectedPackType === 'normal' ? (availableKeywords.length > 0 ? 1 : 0) : selectedKeywords.length;
  const tplCount = selectedTemplateIds.length || 1;
  const articleCount = kwCount * tplCount;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col font-sans">
      <div className="flex justify-between items-end mb-2 shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-xl transition-all hover:bg-slate-100 text-slate-600" title={t('actions.backToList')}>
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{t('pageTitle')}</h2>
            <p className="text-sm font-bold opacity-60 text-slate-500">{t('moduleSubtitle')}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
        <div className="space-y-8 pb-10">
          {/* Row 1: 知识库 + 知识图谱 + 词包选择 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 关联 RAG 知识库 */}
            <div className="p-8 rounded-[2.5rem] border shadow-sm bg-white border-slate-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600"><BookOpen className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-semibold text-xl tracking-tight text-slate-900">{t('module.ragKb')}</h3>
                  <p className="text-xs font-bold opacity-40 text-slate-500">{t('module.optional')}</p>
                </div>
              </div>
              <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar pr-2">
                {knowledgeBases.length > 0 ? knowledgeBases.map(kb => {
                  const isSelected = selectedKbId === kb.id;
                  return (
                    <div key={kb.id} onClick={() => setSelectedKbId(isSelected ? null : kb.id)}
                      className={`p-5 rounded-2xl border-2 cursor-pointer transition-all group hover-scale ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 bg-white'}`}>{isSelected && <Check className="w-4 h-4" />}</div>
                        <span className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>{kb.name}</span>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <BookOpen className="w-8 h-8 mb-3 text-slate-400" />
                    <p className="text-sm font-bold text-slate-500">{t('module.noData')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 知识图谱 */}
            <div className="p-8 rounded-[2.5rem] border shadow-sm bg-white border-slate-200">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-green-50 text-green-600"><Network className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-semibold text-xl tracking-tight text-slate-900">{t('module.knowledgeGraph')}</h3>
                  <p className="text-xs font-bold opacity-40 text-slate-500">{t('module.kgRequired')}</p>
                </div>
              </div>
              <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar pr-2">
                {isLoadingSeoTasks ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 mb-3 animate-spin text-blue-500" />
                    <p className="text-sm font-bold text-slate-500">{t('loading')}</p>
                  </div>
                ) : seoTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-2 text-center">
                    <Network className="w-8 h-8 mb-3 text-slate-400" />
                    <p className="text-sm font-bold text-slate-500">{t('module.noKgTasks')}</p>
                    <p className="text-xs mt-2 text-slate-400">{t('module.createKgFirst')}</p>
                  </div>
                ) : (
                  seoTasks.map(task => {
                    const isSelected = selectedKgType === task.task_id;
                    return (
                      <div key={task.task_id} onClick={() => setSelectedKgType(task.task_id)}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all group hover-scale ${isSelected ? 'border-green-500 bg-green-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 bg-white'}`}>{isSelected && <Check className="w-4 h-4" />}</div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold truncate ${isSelected ? 'text-green-700' : 'text-slate-700'}`}>{task.name || task.keyword || task.task_id}</div>
                            <div className="text-xs font-bold opacity-40 mt-0.5 text-slate-500">{task.created_at ? new Date(task.created_at).toLocaleDateString() : ''}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 词包选择 */}
            <div className="p-8 rounded-[2.5rem] border shadow-sm bg-white border-slate-200">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-purple-50 text-purple-600"><PenTool className="w-6 h-6" /></div>
                <div className="flex-1">
                  <h3 className="font-semibold text-xl tracking-tight text-slate-900">{t('module.selectPack')}</h3>
                  <p className="text-xs font-bold opacity-40 text-slate-500">{t('module.packTypesHint')}</p>
                </div>
              </div>
              <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar pr-2">
                {isLoadingExtractionTasks ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 mb-2 animate-spin text-blue-500" />
                    <p className="text-xs font-bold text-slate-500">{t('loading')}</p>
                  </div>
                ) : extractionTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <PenTool className="w-8 h-8 mb-2 text-slate-400" />
                    <p className="text-sm font-bold text-slate-500">{t('module.noPacks')}</p>
                    <p className="text-xs mt-1 text-slate-400">{t('module.createPackFirst')}</p>
                  </div>
                ) : extractionTasks.map((task) => {
                  const isSelected = selectedExtractionTaskId === task.id;
                  const packType = getPackType(task.model_type);
                  return (
                    <div key={task.id} onClick={() => setSelectedExtractionTaskId(isSelected ? null : task.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all group hover-scale ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-purple-500 border-purple-500 text-white' : 'border-slate-300 bg-white'}`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold truncate ${isSelected ? 'text-purple-700' : 'text-slate-700'}`}>{task.name || task.keyword || task.id}</span>
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              packType === 'normal' ? 'bg-amber-100 text-amber-700' : packType === 'manual' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {packType === 'normal' ? t('module.packTypes.normal') : packType === 'manual' ? t('module.packTypes.manual') : t('module.packTypes.semantic')}
                            </span>
                          </div>
                          <div className="text-xs font-bold opacity-60 mt-0.5 text-slate-500">{t('module.keywordCount', { count: task.count ?? 0 })} · {task.date ? new Date(task.date).toLocaleDateString() : ''}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 手动词包：词条多选 */}
          {selectedExtractionTaskId && selectedPackType === 'manual' && (
            <div className="p-8 rounded-[2.5rem] border shadow-sm bg-white border-slate-200">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-purple-50 text-purple-600"><PenTool className="w-6 h-6" /></div>
                <div className="flex-1">
                  <h3 className="font-semibold text-xl tracking-tight text-slate-900">{t('module.selectKeywords')}</h3>
                  <p className="text-xs font-bold opacity-40 text-slate-500">{t('module.manualHint')}</p>
                </div>
                {availableKeywords.length > 0 && (
                  <label className="shrink-0 flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-600">
                    <input type="checkbox" checked={selectedKeywords.length >= availableKeywords.length}
                      onChange={e => setSelectedKeywords(e.target.checked ? [...availableKeywords] : [])}
                      className="w-5 h-5 rounded border-2 transition-all appearance-none checked:bg-purple-500 cursor-pointer bg-slate-100 border-slate-300" />
                    {t('module.selectAll')}
                  </label>
                )}
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto no-scrollbar pr-2">
                {isLoadingTaskKeywords ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 mb-3 animate-spin text-blue-500" />
                    <p className="text-sm font-bold text-slate-500">{t('module.loadingKeywords')}</p>
                  </div>
                ) : availableKeywords.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {availableKeywords.map(kw => {
                      const isSelected = selectedKeywords.some(s => s.text === kw.text);
                      return (
                        <div key={`${kw.id}-${kw.text}`}
                          onClick={() => {
                            if (isSelected) setSelectedKeywords(prev => prev.filter(s => s.text !== kw.text));
                            else setSelectedKeywords(prev => [...prev, kw]);
                          }}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all group hover-scale ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 mt-0.5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-purple-500 border-purple-500 text-white' : 'border-slate-300 bg-white'}`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-semibold tracking-tight line-clamp-2 ${isSelected ? 'text-purple-700' : 'text-slate-700'}`}>{kw.text}</div>
                              <div className="text-xs font-bold opacity-40 mt-0.5 text-slate-500">{t('module.score', { score: kw.score })}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-sm font-bold text-slate-500">{t('module.noKeywords')}</p>
                  </div>
                )}
              </div>
              {selectedKeywords.length > 0 && (
                <div className="mt-6 p-4 rounded-xl bg-purple-50 border border-purple-200">
                  <p className="text-xs font-bold mb-2 text-purple-600">{t('module.selectedCount', { count: selectedKeywords.length })}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedKeywords.map((kw, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-700 border border-purple-300">{kw.text}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 语义词包：核心词 / 扩展词 分区勾选 */}
          {selectedExtractionTaskId && selectedPackType === 'semantic' && (
            <div className="p-8 rounded-[2.5rem] border shadow-sm bg-white border-slate-200 space-y-10">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600"><PenTool className="w-6 h-6" /></div>
                <div className="flex-1">
                  <h3 className="font-semibold text-xl tracking-tight text-slate-900">{t('module.selectKeywords')}</h3>
                  <p className="text-xs font-bold opacity-40 text-slate-500">{t('module.semanticHint')}</p>
                </div>
              </div>

              {isLoadingTaskKeywords ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 mb-3 animate-spin text-blue-500" />
                  <p className="text-sm font-bold text-slate-500">{t('module.loadingKeywords')}</p>
                </div>
              ) : (
                <>
              {semanticCoreKeywords.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-slate-800">{t('module.coreWords')}</h4>
                    <label className="shrink-0 flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={semanticCoreKeywords.length > 0 && semanticCoreKeywords.every(k => selectedKeywords.some(s => s.text === k.text))}
                        onChange={e => {
                          const checked = e.target.checked;
                          setSelectedKeywords(prev => {
                            const without = prev.filter(s => !semanticCoreKeywords.some(c => c.text === s.text));
                            return checked ? [...without, ...semanticCoreKeywords] : without;
                          });
                        }}
                        className="w-5 h-5 rounded border-2 transition-all appearance-none checked:bg-blue-500 cursor-pointer bg-slate-100 border-slate-300"
                      />
                      {t('module.selectSection')}
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {semanticCoreKeywords.map((kw, idx) => {
                      const isSelected = selectedKeywords.some(s => s.text === kw.text);
                      return (
                        <div
                          key={`core-${idx}-${kw.text}`}
                          onClick={() => {
                            if (isSelected) setSelectedKeywords(prev => prev.filter(s => s.text !== kw.text));
                            else setSelectedKeywords(prev => [...prev, kw]);
                          }}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all group hover-scale ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 mt-0.5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 bg-white'}`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-semibold tracking-tight line-clamp-2 ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>{kw.text}</div>
                              <div className="text-xs font-bold opacity-40 mt-0.5 text-slate-500">{t('module.score', { score: kw.score })}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {semanticExtensionKeywords.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-slate-800">{t('module.extensionWords')}</h4>
                    <label className="shrink-0 flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={semanticExtensionKeywords.length > 0 && semanticExtensionKeywords.every(k => selectedKeywords.some(s => s.text === k.text))}
                        onChange={e => {
                          const checked = e.target.checked;
                          setSelectedKeywords(prev => {
                            const without = prev.filter(s => !semanticExtensionKeywords.some(c => c.text === s.text));
                            return checked ? [...without, ...semanticExtensionKeywords] : without;
                          });
                        }}
                        className="w-5 h-5 rounded border-2 transition-all appearance-none checked:bg-blue-500 cursor-pointer bg-slate-100 border-slate-300"
                      />
                      {t('module.selectSection')}
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {semanticExtensionKeywords.map((kw, idx) => {
                      const isSelected = selectedKeywords.some(s => s.text === kw.text);
                      return (
                        <div
                          key={`ext-${idx}-${kw.text}`}
                          onClick={() => {
                            if (isSelected) setSelectedKeywords(prev => prev.filter(s => s.text !== kw.text));
                            else setSelectedKeywords(prev => [...prev, kw]);
                          }}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all group hover-scale ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 mt-0.5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 bg-white'}`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-semibold tracking-tight line-clamp-2 ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>{kw.text}</div>
                              <div className="text-xs font-bold opacity-40 mt-0.5 text-slate-500">{t('module.score', { score: kw.score })}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {semanticCoreKeywords.length === 0 && semanticExtensionKeywords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-sm font-bold text-slate-500">{t('module.noKeywords')}</p>
                </div>
              ) : null}
                </>
              )}

              {!isLoadingTaskKeywords && selectedKeywords.length > 0 && (
                <div className="mt-2 p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <p className="text-xs font-bold mb-2 text-blue-700">{t('module.selectedCount', { count: selectedKeywords.length })}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedKeywords.map((kw, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">{kw.text}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 普通词包提示 */}
          {selectedExtractionTaskId && selectedPackType === 'normal' && (
            <div className="p-6 rounded-[2.5rem] border shadow-sm bg-white border-slate-200">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-600"><PenTool className="w-6 h-6" /></div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg tracking-tight text-slate-900">{t('module.normalPack')}</h3>
                  {coreWords.length > 0 && (
                    <p className="text-sm text-slate-600 mt-1">{t('module.coreWordsLabel')}<span className="font-bold text-amber-700">{coreWords.join('、')}</span></p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{t('module.allKeywordsParticipate', { count: availableKeywords.length })}</p>
                </div>
              </div>
            </div>
          )}

          {/* 范文模板选择 */}
          <div className="p-8 rounded-[2.5rem] border shadow-sm bg-white border-slate-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600"><LayoutTemplate className="w-6 h-6" /></div>
              <div className="flex-1">
                <h3 className="font-semibold text-xl tracking-tight text-slate-900">{t('module.templates')}</h3>
                <p className="text-xs font-bold opacity-40 text-slate-500">{t('module.templatesHint')}</p>
              </div>
            </div>
            <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar pr-2">
              {isLoadingTemplates ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 mb-2 animate-spin text-blue-500" />
                  <p className="text-xs font-bold text-slate-500">{t('loading')}</p>
                </div>
              ) : templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <LayoutTemplate className="w-8 h-8 mb-2 text-slate-400" />
                  <p className="text-sm font-bold text-slate-500">{t('module.noTemplates')}</p>
                  <p className="text-xs mt-1 text-slate-400">{t('module.addTemplatesHint')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.map(tpl => {
                    const isSelected = selectedTemplateIds.includes(tpl.id);
                    return (
                      <div key={tpl.id} onClick={() => toggleTemplate(tpl.id)}
                        className={`p-5 rounded-2xl border-2 cursor-pointer transition-all group hover-scale ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 mt-0.5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white'}`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold truncate ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{tpl.title}</div>
                            {tpl.description && <div className="text-xs text-slate-500 mt-1 line-clamp-2">{tpl.description}</div>}
                            <div className="text-xs font-bold opacity-40 mt-1 text-slate-500">{t('module.charCount', { count: tpl.content.length })}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 推广品牌 */}
          <div className="p-8 rounded-[2.5rem] border shadow-sm bg-white border-slate-200">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-600"><Award className="w-6 h-6" /></div>
              <div className="flex-1">
                <h3 className="font-semibold text-xl tracking-tight text-slate-900">{t('module.promotedBrand')}</h3>
                <p className="text-xs font-bold opacity-40 text-slate-500">{t('module.promotedBrandHint')}</p>
              </div>
            </div>
            <input
              type="text"
              value={promotedBrand}
              onChange={e => setPromotedBrand(e.target.value)}
              placeholder={t('module.promotedBrandPlaceholder')}
              className="w-full px-5 py-4 rounded-2xl border-2 text-sm font-semibold transition-all focus:outline-none focus:ring-0 border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:bg-white"
            />
            {promotedBrand.trim() && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-xs font-bold text-amber-700">{t('module.promotedBrandPreview', { brand: promotedBrand.trim() })}</p>
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="p-8 rounded-[2.5rem] border shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 bg-white border-slate-200">
            <div className="text-sm text-slate-600">
              {articleCount > 0 && (
                <span>{t('module.articleEstimate', { count: articleCount })}{selectedTemplateIds.length > 0 ? ` ${t('module.articleEstimateDetail', { kw: kwCount, tpl: tplCount })}` : ''}</span>
              )}
            </div>
            <button onClick={handleSubmit} disabled={isSubmitting || kwCount === 0 || !selectedKgType || seoTasks.length === 0}
              className={`px-16 py-6 rounded-lg font-semibold text-sm shadow-sm hover-scale transition-all flex items-center gap-4 ${
                isSubmitting || kwCount === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'
              }`}>
              {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Wand2 className="w-6 h-6" />}
              {isSubmitting ? t('module.submitting') : t('module.startGenerate')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateModule;
