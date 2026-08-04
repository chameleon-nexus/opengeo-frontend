import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { 
    Search, Sparkles, Zap, ArrowRight, 
    Layers, HelpCircle, LayoutGrid, CheckCircle2,
    Compass, ChevronLeft, ChevronRight, Network,
    MapPin, Globe, Info, Target, ArrowLeft, Loader2, X
} from 'lucide-react';
import { Theme, SemanticEntityRelation, CooccurrenceWord } from '../types';
import { semanticSEOAPI } from '../api/semanticSeo';
import { useModuleI18n } from '../i18n/hooks';

interface SemanticSEOProps {
  theme: Theme;
  taskId?: string;
  onBack?: () => void;
  /** 嵌入优化驾驶舱：全宽布局 */
  embedded?: boolean;
}

// Fallback empty data
const ALL_RELATIONS: SemanticEntityRelation[] = [];
const ALL_COOCCURRENCE_WORDS: CooccurrenceWord[] = [];

const SemanticSEO: React.FC<SemanticSEOProps> = ({ theme, taskId, onBack, embedded = false }) => {
  const { t } = useModuleI18n('semanticSeo');
  const { t: tc } = useModuleI18n('common');
  const isDark = theme === 'dark';
  const contentShellCls = embedded
    ? 'w-full space-y-10 pb-24'
    : 'max-w-[1600px] mx-auto space-y-10 pb-24';
  const [keyword, setKeyword] = useState("");
  const [relations, setRelations] = useState<SemanticEntityRelation[]>([]);
  const [cooccurrenceWords, setCooccurrenceWords] = useState<CooccurrenceWord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const graphChartRef = useRef<echarts.ECharts | null>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  
  // 分页状态
  const [relPage, setRelPage] = useState(1);
  const [wordPage, setWordPage] = useState(1);
  const pageSize = 20;

  // Load task data from API
  useEffect(() => {
    if (taskId) {
      loadTaskData(taskId);
    } else {
      // Fallback to mock data if no taskId
      setRelations(ALL_RELATIONS);
      setCooccurrenceWords(ALL_COOCCURRENCE_WORDS);
    }
  }, [taskId]);

  const loadTaskData = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await semanticSEOAPI.getTask(id);
      setKeyword(data.task.keyword);
      setRelations(data.relations || []);
      setCooccurrenceWords(data.cooccurrence_words || []);
    } catch (error: any) {
      console.error('加载语义SEO任务失败:', error);
      // Fallback to mock data on error
      setRelations(ALL_RELATIONS);
      setCooccurrenceWords(ALL_COOCCURRENCE_WORDS);
    } finally {
      setIsLoading(false);
    }
  };

  const currentRelations = useMemo(() => {
    return relations.slice((relPage - 1) * pageSize, relPage * pageSize);
  }, [relations, relPage]);

  const currentWords = useMemo(() => {
    return cooccurrenceWords.slice((wordPage - 1) * pageSize, wordPage * pageSize);
  }, [cooccurrenceWords, wordPage]);

  const totalRelPages = Math.ceil(relations.length / pageSize);
  const totalWordPages = Math.ceil(cooccurrenceWords.length / pageSize);

  // 知识图谱 ECharts：弹窗打开时构建 nodes/links 并渲染
  useEffect(() => {
    if (!graphModalOpen || relations.length === 0 || !graphContainerRef.current) return;
    const container = graphContainerRef.current;
    if (!graphChartRef.current) {
      graphChartRef.current = echarts.init(container);
    }
    const chart = graphChartRef.current;
    const nodeIds = new Set<string>();
    const degree: Record<string, number> = {};
    relations.forEach((r) => {
      nodeIds.add(r.source);
      nodeIds.add(r.target);
      degree[r.source] = (degree[r.source] || 0) + 1;
      degree[r.target] = (degree[r.target] || 0) + 1;
    });
    const nodes = Array.from(nodeIds).map((id) => ({
      id,
      name: id,
      symbolSize: Math.max(28, Math.min(56, (degree[id] || 1) * 12)),
      value: degree[id] || 1,
      itemStyle: {
        color: isDark
          ? { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: '#FF8C42' }, { offset: 1, color: '#E85D04' }] }
          : { type: 'linear', x: 0, y: 0, x2: 1, y2: 1, colorStops: [{ offset: 0, color: '#FFB366' }, { offset: 1, color: '#FF8C42' }] },
        borderColor: isDark ? 'rgba(255,140,66,0.8)' : 'rgba(255,140,66,0.6)',
        borderWidth: 2,
        shadowBlur: 12,
        shadowColor: isDark ? 'rgba(255,107,53,0.4)' : 'rgba(255,140,66,0.35)',
      },
      label: { show: true, fontSize: 12, color: isDark ? '#e4e4e7' : '#27272a', fontWeight: 'bold' },
    }));
    const links = relations.map((r) => ({
      source: r.source,
      target: r.target,
      value: r.relation,
      lineStyle: {
        color: isDark ? 'rgba(255,140,66,0.5)' : 'rgba(255,140,66,0.45)',
        width: 2,
        curveness: 0.25,
        shadowBlur: 4,
        shadowColor: isDark ? 'rgba(255,107,53,0.3)' : 'rgba(255,140,66,0.25)',
      },
    }));
    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      title: {
        text: t('pageTitle'),
        left: 'center',
        top: 16,
        textStyle: { color: isDark ? '#fafafa' : '#18181b', fontSize: 20, fontWeight: 'bold' },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.dataType === 'node') {
            return `<div style="font-weight:bold">${params.data.name}</div>连接数: ${params.data.value}`;
          }
          if (params.dataType === 'edge' && params.data?.value) {
            const e = params.data;
            return `<div>${e.source} &nbsp;<span style="color:#3b82f6">→ ${e.value} →</span>&nbsp; ${e.target}</div>`;
          }
          return '';
        },
        backgroundColor: isDark ? 'rgba(24,24,27,0.92)' : 'rgba(255,255,255,0.95)',
        borderColor: isDark ? 'rgba(255,140,66,0.5)' : 'rgba(255,140,66,0.4)',
        textStyle: { color: isDark ? '#fafafa' : '#18181b', fontSize: 12 },
        padding: [10, 14],
      },
      series: [
        {
          type: 'graph',
          layout: 'force',
          data: nodes,
          links,
          roam: true,
          draggable: true,
          focusNodeAdjacency: true,
          label: { position: 'right', formatter: '{b}' },
          labelLayout: { hideOverlap: true },
          emphasis: {
            focus: 'adjacency',
            scale: 1.15,
            lineStyle: { width: 4, color: isDark ? 'rgba(255,140,66,0.9)' : 'rgba(255,140,66,0.8)' },
            itemStyle: { shadowBlur: 20, shadowColor: 'rgba(255,107,53,0.5)' },
          },
          force: {
            repulsion: 320,
            gravity: 0.06,
            edgeLength: [90, 180],
            layoutAnimation: true,
          },
        },
      ],
    };
    chart.setOption(option, true);
    const resizeTimer = setTimeout(() => chart.resize(), 80);
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [graphModalOpen, relations, isDark, t]);

  useEffect(() => {
    if (!graphModalOpen && graphChartRef.current) {
      graphChartRef.current.dispose();
      graphChartRef.current = null;
    }
  }, [graphModalOpen]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full font-sans animate-in fade-in duration-500 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full font-sans animate-in fade-in duration-500 overflow-hidden">
        <div className="flex-1 p-6 lg:p-10 overflow-y-auto no-scrollbar">
            <div className={contentShellCls}>
                
                {/* 页头 */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="flex items-start gap-4">
                        {onBack && (
                            <button 
                                onClick={onBack}
                                className={`p-2 rounded-lg transition-all hover:bg-black/5 active:scale-95 border mt-2 ${isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white' : 'bg-white border-slate-200 text-slate-500'}`}
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <div>
                            <div className={`flex items-center gap-2 mb-2 text-xs font-semibold  ${isDark ? 'text-geo-blue geo-glow-text' : 'text-blue-600'}`}>
                                <LayoutGrid className="w-3.5 h-3.5" />
                            </div>
                            <h2 className={`text-4xl font-semibold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>{keyword || t('pageTitle')}</h2>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className={`flex items-center px-4 py-2 rounded-2xl border backdrop-blur-md ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200'}`}>
                            <Search className="w-4 h-4 mr-3 opacity-30" />
                            <input 
                                value={keyword} 
                                onChange={e => setKeyword(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm font-bold w-48" 
                                placeholder={t('form.keywordPlaceholder')}
                                disabled={!!taskId}
                            />
                        </div>
                        {!taskId && (
                            <button className={`px-5 py-2 rounded-lg font-semibold text-xs  text-white transition-all hover-scale bg-gradient-coral shadow-coral hover:opacity-95 ${isDark ? 'shadow-blue-glow' : ''}`}>
                                {t('actions.refresh')}
                            </button>
                        )}
                    </div>
                </div>

                {/* 核心工作区 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    
                    {/* 左侧: 实体关系列表 */}
                    <div className={`rounded-[3rem] border relative overflow-hidden flex flex-col h-[850px] transition-all
                        ${isDark ? 'bg-geo-bg border-geo-border shadow-sm' : 'bg-white border-slate-200 shadow-apple'}
                    `}>
                        <div className="p-8 pb-4">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <Network className={`w-5 h-5 ${isDark ? 'text-geo-blue' : 'text-blue-500'}`} />
                                    <h3 className={`text-xl font-semibold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>{t('subtitle')}</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-semibold  px-2 py-1 rounded border ${isDark ? 'border-geo-blue/50 text-geo-blue' : 'border-blue-200 text-blue-600'}`}>
                                        已挖掘关系：{relations.length}
                                    </span>
                                    <button
                                        onClick={() => setGraphModalOpen(true)}
                                        disabled={relations.length === 0}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs  transition-all shrink-0
                                            ${relations.length === 0
                                                ? (isDark ? 'bg-geo-card/50 text-geo-text-sec/50 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed')
                                                : (isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95 hover:scale-105' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95 hover:scale-105')
                                            }`}
                                    >
                                        <LayoutGrid className="w-4 h-4" /> {t('actions.open')}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto px-4 py-2 no-scrollbar">
                            <div className="space-y-2">
                                {currentRelations.map((rel) => (
                                    <div key={rel.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.01]
                                        ${isDark ? 'bg-geo-card/40 border-white/5 hover:bg-geo-card' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'}
                                    `}>
                                        <div className="w-10 font-mono text-xs opacity-20">{String(rel.id).padStart(4, '0')}</div>
                                        <div className={`flex-1 text-center py-2 rounded-xl font-semibold text-xs ${isDark ? 'bg-geo-bg text-geo-text-main border border-white/5' : 'bg-white text-slate-800 border border-slate-200 shadow-sm'}`}>
                                            {rel.source}
                                        </div>
                                        <div className="flex flex-col items-center gap-1 shrink-0 px-2 min-w-[80px]">
                                            <ArrowRight className={`w-3 h-3 ${isDark ? 'text-geo-blue' : 'text-blue-500'}`} />
                                            <span className={`text-[9px] font-semibold  ${isDark ? 'text-geo-blue' : 'text-blue-600'}`}>{rel.relation}</span>
                                        </div>
                                        <div className={`flex-1 text-center py-2 rounded-xl font-semibold text-xs ${isDark ? 'bg-geo-blue/10 text-geo-blue border border-geo-blue/20' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
                                            {rel.target}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 分页控制 */}
                        <div className={`p-6 border-t flex justify-between items-center ${isDark ? 'border-white/5 bg-geo-card/30' : 'border-slate-100 bg-slate-50'}`}>
                            <button 
                                onClick={() => setRelPage(p => Math.max(1, p - 1))}
                                disabled={relPage === 1}
                                className={`p-2.5 rounded-xl border transition-all disabled:opacity-20 ${isDark ? 'bg-geo-bg border-white/5 text-white' : 'bg-white border-slate-200 shadow-sm'}`}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-xs font-semibold font-mono tracking-widest opacity-50 ">
                                关系矩阵 第 {relPage} / {totalRelPages} 页
                            </span>
                            <button 
                                onClick={() => setRelPage(p => Math.min(totalRelPages, p + 1))}
                                disabled={relPage === totalRelPages}
                                className={`p-2.5 rounded-xl border transition-all disabled:opacity-20 ${isDark ? 'bg-geo-bg border-white/5 text-white' : 'bg-white border-slate-200 shadow-sm'}`}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* 右侧: 共现词表 */}
                    <div className={`rounded-[3rem] border border-2 flex flex-col h-[850px] relative overflow-hidden transition-all
                        ${isDark ? 'bg-geo-card border-geo-blue/40 shadow-blue-glow/10' : 'bg-white border-blue-500/20 shadow-apple'}
                    `}>
                        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] pointer-events-none transition-colors ${isDark ? 'bg-geo-blue/20' : 'bg-blue-500/10'}`}></div>
                        
                        <header className={`p-8 border-b relative z-10 ${isDark ? 'border-geo-border' : 'border-slate-100'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-geo-blue/10 text-geo-blue shadow-blue-glow' : 'bg-gradient-coral text-white shadow-coral'}`}><Layers className="w-6 h-6" /></div>
                                    <h4 className="font-semibold text-xl tracking-tight">共现词表</h4>
                                </div>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-4 no-scrollbar relative z-10">
                            {cooccurrenceWords.length === 0 ? (
                                <div className={`text-center py-12 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>
                                    <p className="text-sm">{tc('status.noData')}</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {currentWords.map((word) => (
                                        <div 
                                            key={word.id} 
                                            className={`p-4 rounded-xl border transition-all hover:scale-[1.02]
                                                ${isDark ? 'bg-geo-bg/40 border-white/5 hover:bg-geo-bg hover:border-geo-blue/30' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-md'}
                                            `}
                                        >
                                            <span className={`text-sm font-semibold ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{word.word}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 分页控制 */}
                        <div className={`p-6 border-t flex justify-between items-center shrink-0 ${isDark ? 'bg-geo-blue/5 border-geo-blue/20' : 'bg-blue-50/50 border-blue-100'}`}>
                            <button 
                                onClick={() => setWordPage(p => Math.max(1, p - 1))}
                                disabled={wordPage === 1}
                                className={`p-2.5 rounded-xl border transition-all disabled:opacity-20 ${isDark ? 'bg-geo-bg border-white/5 text-white' : 'bg-white border-slate-200 shadow-sm'}`}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <span className="text-xs font-semibold font-mono tracking-widest opacity-60 ">
                                共现词 第 {wordPage} / {totalWordPages} 页
                            </span>
                            <button 
                                onClick={() => setWordPage(p => Math.min(totalWordPages, p + 1))}
                                disabled={wordPage === totalWordPages}
                                className={`p-2.5 rounded-xl border transition-all disabled:opacity-20 ${isDark ? 'bg-geo-bg border-white/5 text-white' : 'bg-white border-slate-200 shadow-sm'}`}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        </div>

        {/* 知识图谱图表弹窗：左侧留菜单 280px，右侧留足边距收窄，四角圆角完整 */}
        {graphModalOpen && (
            <div
                className="fixed inset-0 z-50 flex flex-col animate-in fade-in duration-200"
                style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(15,23,42,0.75)' }}
            >
                <div className="absolute inset-0" onClick={() => setGraphModalOpen(false)} aria-hidden />
                <div
                    className={`relative z-10 flex flex-col min-h-0 rounded-[1.5rem] border-2 shadow-sm overflow-hidden
                        left-6 right-10 top-6 bottom-6
                        lg:left-[296px] lg:right-12 lg:top-8 lg:bottom-8
                        ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200'}`}
                    style={{ position: 'absolute' }}
                >
                    <div className={`flex items-center justify-between px-6 py-4 shrink-0 border-b rounded-t-[1.4rem] ${isDark ? 'border-geo-border bg-geo-card' : 'border-slate-200 bg-white'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isDark ? 'bg-geo-blue/20 text-geo-blue' : 'bg-blue-100 text-blue-600'}`}>
                                <LayoutGrid className="w-5 h-5" />
                            </div>
                            <h3 className={`text-lg font-semibold ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>{t('pageTitle')}</h3>
                        </div>
                        <button
                            onClick={() => setGraphModalOpen(false)}
                            className={`p-2.5 rounded-xl transition-all hover:scale-110 ${isDark ? 'hover:bg-geo-bg text-geo-text-sec hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
                            aria-label={t('actions.close')}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div ref={graphContainerRef} className="flex-1 w-full min-h-0 overflow-hidden rounded-b-[1.4rem] bg-inherit" style={{ minHeight: '840px' }} />
                </div>
            </div>
        )}
    </div>
  );
};

export default SemanticSEO;
