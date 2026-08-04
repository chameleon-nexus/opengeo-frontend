
import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Cpu, Scan, Award, ThumbsUp, ThumbsDown,
  LineChart as LucideLineChart, BarChart as LucideBarChart,
  CheckCircle2, AlertTriangle, ShieldCheck, Activity, ChevronRight,
  Target, Globe, Brain, ListChecks, Info, Trophy, BarChart2, Hash,
  Database, Zap, BarChart3, TrendingUp, Loader2, Link, Download
} from 'lucide-react';
import { 
  ResponsiveContainer, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Cell, LineChart, Line, Legend
} from 'recharts';
import html2pdf from 'html2pdf.js';
import { Theme, Brand } from '../types';
import { analyticsReportAPI, AnalyticsReportData, EngineKey } from '../api/analyticsReport';

interface AnalyticsReportProps {
  theme: Theme;
  currentBrand: Brand | null;
}

type PhaseType = 'positive' | 'negative' | 'brand';
type VisibilityType = 'positive' | 'negative';

const AnalyticsReport: React.FC<AnalyticsReportProps> = ({ theme, currentBrand }) => {
  const isDark = theme === 'dark';
  const [activeMenu, setActiveMenu] = useState('mau');

  const containerClasses = `
    flex-1 p-4 md:p-10 overflow-y-auto no-scrollbar font-sans transition-colors duration-500
    ${isDark ? 'bg-[#1A1A1A] text-white' : 'bg-white text-slate-900'}
  `;
  const cardClasses = `
    rounded-2xl border p-6 md:p-10 relative overflow-hidden backdrop-blur-md transition-all
    ${isDark ? 'bg-white/5 border-white/5 shadow-black/20' : 'bg-white border-slate-200 shadow-sm'}
  `;
  const tableHeaderClasses = `sticky top-0 z-10 text-xs font-medium ${isDark ? 'text-zinc-500 bg-zinc-800 border-zinc-700' : 'text-gray-500 bg-gray-50 border-gray-100'}`;
  
  // --- 状态控制 A: 品牌模型矩阵视图 ---
  const [visibilityType, setVisibilityType] = useState<VisibilityType>('positive');
  const [matrixEngine, setMatrixEngine] = useState<EngineKey>('doubao');

  // --- 状态控制 B: 模型专项视图 ---
  const [activePhase, setActivePhase] = useState<PhaseType>('positive');
  
  // --- 数据状态 ---
  const [reportData, setReportData] = useState<AnalyticsReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isContentLoading, setIsContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // --- Refs for PDF export ---
  const mauSectionRef = useRef<HTMLDivElement>(null);
  const visibilitySectionRef = useRef<HTMLDivElement>(null);
  const conclusionSectionRef = useRef<HTMLDivElement>(null);
  
  // --- 加载报告数据 ---
  useEffect(() => {
    if (currentBrand?.id) {
      loadReportData();
    }
  }, [currentBrand?.id]);
  
  useEffect(() => {
    if (currentBrand?.id && ['doubao', 'deepseek', 'wenxin', 'qianwen', 'yuanbao', 'kimi'].includes(activeMenu)) {
      loadReportData(activePhase, true);
    }
  }, [activePhase, activeMenu, currentBrand?.id]);
  
  /** 基于文心一言等已有数据，为其他平台生成 mock 数据 */
  const expandMockDataForAllPlatforms = (data: AnalyticsReportData): AnalyticsReportData => {
    const platforms: EngineKey[] = ['doubao', 'deepseek', 'wenxin', 'qianwen', 'yuanbao', 'kimi'];
    const wenxinAudit = (data.audit_details || []).filter((r: any) => !r.platform || r.platform === 'wenxin');
    const vary = (v: number, delta = 3) => Math.max(0, Math.min(100, v + (Math.random() - 0.5) * 2 * delta));

    let auditDetails = [...(data.audit_details || [])];
    if (wenxinAudit.length > 0) {
      for (const p of ['doubao', 'deepseek', 'qianwen', 'yuanbao', 'kimi'] as EngineKey[]) {
        if (!auditDetails.some((r: any) => r.platform === p)) {
          auditDetails = auditDetails.concat(wenxinAudit.map((r: any) => ({ ...r, platform: p })));
        }
      }
    }

    const fillMatrix = (rows: typeof data.matrix_data_positive) => {
      if (!rows?.length) return rows;
      return rows.map(row => {
        const out = { ...row } as any;
        for (const p of platforms) {
          if (out[p] == null || out[p] === 0) {
            const src = (row as any).wenxin ?? (row as any).doubao ?? 0;
            out[p] = Math.round(vary(typeof src === 'number' ? src : parseFloat(String(src)) || 0) * 100) / 100;
          }
        }
        return out;
      });
    };

    const matrixPositive = fillMatrix(data.matrix_data_positive || []);
    const matrixNegative = fillMatrix(data.matrix_data_negative || []);

    let sourceStats = { ...(data.source_stats || {}) };
    const wenxinSources = sourceStats['wenxin'];
    if (wenxinSources?.length) {
      for (const p of ['doubao', 'deepseek', 'qianwen', 'yuanbao', 'kimi']) {
        if (!sourceStats[p]?.length) {
          sourceStats[p] = wenxinSources.map((s, i) => ({
            rank: s.rank,
            name: s.name,
            count: Math.max(1, s.count + Math.floor((Math.random() - 0.5) * 4)),
          }));
        }
      }
    }

    return {
      ...data,
      audit_details: auditDetails,
      matrix_data_positive: matrixPositive,
      matrix_data_negative: matrixNegative,
      source_stats: sourceStats,
    };
  };

  const loadReportData = async (questionType?: 'positive' | 'negative' | 'brand', isContentLoad = false) => {
    if (!currentBrand?.id) return;
    
    if (isContentLoad) {
      setIsContentLoading(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const shouldFilter = ['doubao', 'deepseek', 'wenxin', 'qianwen', 'yuanbao', 'kimi'].includes(activeMenu) && questionType;
      const data = await analyticsReportAPI.getBrandAnalyticsReport(
        currentBrand.id,
        undefined,
        shouldFilter ? questionType : undefined
      );
      const expanded = expandMockDataForAllPlatforms(data);
      setReportData(expanded);
      console.log('✅ 分析报告数据加载成功:', expanded);
    } catch (err) {
      console.error('❌ 加载分析报告失败:', err);
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setIsLoading(false);
      setIsContentLoading(false);
    }
  };

  // --- PDF导出函数 ---
  const handleExportPDF = async () => {
    if (!currentBrand) return;
    
    setIsExporting(true);
    try {
      const exportContainer = document.createElement('div');
      exportContainer.style.width = '210mm';
      exportContainer.style.padding = '20px';
      exportContainer.style.backgroundColor = '#ffffff';
      
      const title = document.createElement('h1');
      title.textContent = `${currentBrand.name} - 分析报告`;
      title.style.color = '#2563eb';
      title.style.textAlign = 'center';
      title.style.marginBottom = '30px';
      title.style.fontSize = '28px';
      title.style.fontWeight = 'bold';
      exportContainer.appendChild(title);
      
      if (mauSectionRef.current) {
        const mauClone = mauSectionRef.current.cloneNode(true) as HTMLElement;
        mauClone.style.marginBottom = '40px';
        exportContainer.appendChild(mauClone);
      }
      
      if (visibilitySectionRef.current) {
        const visibilityClone = visibilitySectionRef.current.cloneNode(true) as HTMLElement;
        exportContainer.appendChild(visibilityClone);
      }
      
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `${currentBrand.name}_分析报告_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };
      
      await html2pdf().set(opt).from(exportContainer).save();
      console.log('✅ PDF导出成功');
    } catch (err) {
      console.error('❌ PDF导出失败:', err);
      alert('PDF导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  // --- 模拟数据: MAU 数据分析（近3个月：12月、1月、2月）---
  const mauTableData = [
    { name: 'DeepSeek', dec: 1.44, jan: 1.42, feb: 1.45, range: '开发者社区+to B场景', features: '技术开发者+专业人士 (细调调研55%)', color: '#8b5cf6' },
    { name: '豆包', dec: 1.72, jan: 1.78, feb: 1.85, range: '国内全渠道 (字节系生态)', features: '年轻用户 (19-35岁占75%)', color: '#10b981' },
    { name: '文心一言', dec: 0.0531, jan: 0.055, feb: 0.058, range: '百度系生态+开放平台', features: '泛大众 (25-45岁占60%)', color: '#3b82f6' },
    { name: '通义千问', dec: 0.0306, jan: 0.0696, feb: 0.075, range: '阿里生态+企业服务', features: '企业用户+电商场景 (企业占40%)', color: '#3b82f6' },
    { name: '腾讯元宝', dec: 0.3286, jan: 0.42, feb: 0.45, range: '微信生态+腾讯系应用', features: '微信生态用户 (30-45岁占65%)', color: '#06b6d4' },
    { name: 'kimi', dec: 0.2, jan: 0.25, feb: 0.3, range: 'Moonshot AI生态', features: '年轻用户+内容创作者 (18-35岁占70%)', color: '#ec4899' },
  ];

  const mauChartData = [
    { month: '12月', 'DeepSeek': 1.44, '豆包': 1.72, '文心一言': 0.0531, '通义千问': 0.0306, '腾讯元宝': 0.3286, 'kimi': 0.2 },
    { month: '1月', 'DeepSeek': 1.42, '豆包': 1.78, '文心一言': 0.055, '通义千问': 0.0696, '腾讯元宝': 0.42, 'kimi': 0.25 },
    { month: '2月', 'DeepSeek': 1.45, '豆包': 1.85, '文心一言': 0.058, '通义千问': 0.075, '腾讯元宝': 0.45, 'kimi': 0.3 },
  ];

  // --- 使用真实数据或默认数据 ---
  const matrixDataPositive = reportData?.matrix_data_positive || [
    { brand: currentBrand?.name || 'HOKA', doubao: 0, deepseek: 0, wenxin: 0, qianwen: 0, yuanbao: 0, kimi: 0, isMain: true },
  ];

  const matrixDataNegative = reportData?.matrix_data_negative || [
    { brand: currentBrand?.name || 'HOKA', doubao: 0, deepseek: 0, wenxin: 0, qianwen: 0, yuanbao: 0, kimi: 0, isMain: true },
  ];

  const auditDetails = reportData?.audit_details || [];
  const sourceStats = reportData?.source_stats || {};

  const engineLabels: Record<EngineKey, string> = {
    doubao: '豆包', deepseek: 'DeepSeek', wenxin: '文心一言', qianwen: '通义千问', yuanbao: '腾讯元宝', kimi: 'kimi'
  };

  const menuItems = [
    { id: 'mau', label: '大模型月活', icon: TrendingUp },
    { id: 'visibility', label: '品牌模型矩阵分析', icon: LucideBarChart },
    { id: 'doubao', label: '豆包', iconSrc: '/imgs/ai-icons/doubao.png' },
    { id: 'deepseek', label: 'DeepSeek', iconSrc: '/imgs/ai-icons/deepseek.png' },
    { id: 'wenxin', label: '文心一言', iconSrc: '/imgs/ai-icons/wenxin.png' },
    { id: 'qianwen', label: '通义千问', iconSrc: '/imgs/ai-icons/tongyi.png' },
    { id: 'yuanbao', label: '腾讯元宝', iconSrc: '/imgs/ai-icons/yuanbao.png' },
    { id: 'kimi', label: 'kimi', iconSrc: '/imgs/ai-icons/kimi.png' },
  ];

  const phaseTabs = [
    { id: 'positive', label: '正面评估期', icon: ThumbsUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'negative', label: '负面质疑期', icon: ThumbsDown, color: 'text-red-500', bg: 'bg-red-50' },
    { id: 'brand', label: '品牌决策期', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
  ];
  
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${containerClasses}`}>
        <div className="text-center">
          <Loader2 className={`w-12 h-12 animate-spin mx-auto mb-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>加载分析报告中...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${containerClasses}`}>
        <div className="text-center">
          <AlertTriangle className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
          <p className={`mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
          <button
            onClick={loadReportData}
            className={`px-4 py-2 rounded-xl font-semibold text-sm ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'}`}
          >
            重试
          </button>
        </div>
      </div>
    );
  }
  
  if (!reportData || reportData.total_tasks === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${containerClasses}`}>
        <div className="text-center">
          <Info className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
          <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>暂无分析数据，请先创建现状分析任务</p>
        </div>
      </div>
    );
  }

  // --- 子组件: 专项深度审计阶段 ---
  const RenderAuditPhase = ({ engineName, type }: { engineName: string, type: PhaseType }) => {
    const label = phaseTabs.find(t => t.id === type)?.label;
    const color = type === 'positive' ? '#3b82f6' : type === 'negative' ? '#ef4444' : '#3b82f6';
    
    const engineKey = engineName.toLowerCase() as EngineKey;
    const filteredAuditDetails = auditDetails.filter((row: any) => {
      const platformMatch = !row.platform || row.platform === engineKey;
      const typeMatch = !row.question_type || row.question_type === type;
      return platformMatch && typeMatch;
    });
    
    const matrixData = type === 'positive' ? matrixDataPositive : matrixDataNegative;
    const totalConversations = filteredAuditDetails.length;
    
    const matrixDataForEngine = matrixData.map(item => {
      const visibilityPercent = (item as any)[engineKey] || 0;
      const mentionedCount = Math.round((visibilityPercent / 100) * totalConversations);
      const actualVisibility = totalConversations > 0 ? (mentionedCount / totalConversations) * 100 : 0;
      
      return {
        ...item,
        value: actualVisibility,
        totalConversations,
        mentionedCount
      };
    }).filter(item => item.value > 0 || item.isMain).slice(0, 10);
    
    return (
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="px-10 py-6 border-b flex items-center gap-3 bg-slate-50/50">
                <ListChecks className="w-5 h-5 text-slate-400" />
                <h4 className="font-semibold text-lg text-slate-800">{label}语义明细 ({engineLabels[engineKey]})</h4>
            </div>
            <table className="w-full text-left">
                <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                    <tr><th className="px-4 py-3 w-1/4">语义提问词</th><th className="px-4 py-3 text-center">是否提及</th><th className="px-4 py-3">提及品牌</th><th className="px-4 py-3">回复摘要</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {filteredAuditDetails.length > 0 ? (
                      filteredAuditDetails.map((row: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-800">{row.q}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded font-semibold text-xs ${
                                row.mentioned === '是' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                              }`}>
                                {row.mentioned || '是'}
                              </span>
                            </td>
                            <td className="px-4 py-3"><span className="text-blue-600 font-bold">{row.brands}</span></td>
                            <td className="px-4 py-3 text-slate-500 italic">"{row.summary}"</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-slate-400">暂无数据</td>
                      </tr>
                    )}
                </tbody>
            </table>
        </div>
        <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="px-10 py-6 border-b flex items-center gap-3 bg-slate-50/50">
                <BarChart2 className="w-5 h-5 text-slate-400" />
                <h4 className="font-semibold text-lg text-slate-800">可见度权重汇总 ({engineLabels[engineKey]})</h4>
            </div>
            <table className="w-full text-left">
                <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="px-4 py-3">品牌名称</th>
                        <th className="px-4 py-3 text-right">对话次数</th>
                        <th className="px-4 py-3 text-right">提及次数</th>
                        <th className="px-4 py-3 text-right">可见度占比</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {matrixDataForEngine.length > 0 ? (
                      matrixDataForEngine.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className={`px-4 py-3 ${item.isMain ? 'text-blue-600' : ''}`}>{item.brand}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-600">{item.totalConversations}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-600">{item.mentionedCount}</td>
                            <td className="px-4 py-3 text-right font-mono">{item.value.toFixed(2)}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-slate-400">暂无数据</td>
                      </tr>
                    )}
                </tbody>
            </table>
        </div>
        <div className="bg-white rounded-2xl border p-6 md:p-10 h-[400px] flex flex-col">
            <h4 className="font-semibold text-lg text-slate-800 mb-8 flex items-center gap-2"><Trophy className="w-5 h-5 text-blue-600" /> {label}对比柱状图 ({engineLabels[engineKey]})</h4>
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={matrixDataForEngine.slice(0, 5)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="brand" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 'black'}} />
                        <YAxis hide domain={[0, 110]} />
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-200">
                                  <p className="font-semibold text-slate-800 mb-2">{data.brand}</p>
                                  <p className="text-sm text-slate-600">对话次数: <span className="font-bold">{data.totalConversations}</span></p>
                                  <p className="text-sm text-slate-600">提及次数: <span className="font-bold">{data.mentionedCount}</span></p>
                                  <p className="text-sm text-slate-600">可见度: <span className="font-bold text-blue-600">{data.value.toFixed(2)}%</span></p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={50}>
                            {matrixDataForEngine.slice(0, 5).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.isMain ? color : '#e2e8f0'} />)}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
        <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="px-10 py-6 border-b flex items-center gap-3 bg-slate-50/50">
                <Link className="w-5 h-5 text-slate-400" />
                <h4 className="font-semibold text-lg text-slate-800">信源引用排名 ({engineLabels[engineKey]})</h4>
            </div>
            <table className="w-full text-left">
                <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="px-4 py-3 text-center w-20">排名</th>
                        <th className="px-4 py-3">信源名称</th>
                        <th className="px-4 py-3 text-right">引用次数</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {sourceStats[engineKey] && sourceStats[engineKey].length > 0 ? (
                      sourceStats[engineKey].map((source) => (
                        <tr key={source.rank} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-center">
                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold text-xs ${
                                  source.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                  source.rank === 2 ? 'bg-slate-100 text-slate-600' :
                                  source.rank === 3 ? 'bg-blue-100 text-blue-600' :
                                  'bg-slate-50 text-slate-500'
                                }`}>
                                  {source.rank}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{source.name}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-600">{source.count}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-12 text-center text-slate-400">暂无信源数据</td>
                      </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex h-full font-sans overflow-hidden selection:bg-blue-100 selection:text-blue-700 ${isDark ? 'bg-[#1A1A1A] text-white' : 'bg-[#FBFBFD] text-slate-900'}`}>
      <div className={`w-80 border-r flex flex-col p-8 shrink-0 shadow-sm ${isDark ? 'border-white/10 bg-zinc-900/50' : 'border-slate-200 bg-white'}`}>
          <div className="mb-12">
              <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-500 p-2 rounded-xl shadow-blue-500/30"><Scan className="w-5 h-5 text-white" /></div>
                  <span className="text-xs font-semibold  text-blue-600">Audit Command</span>
              </div>
              <h3 className="text-2xl font-semibold tracking-tighter">分析报告</h3>
          </div>
          <nav className="space-y-1.5 flex-1 overflow-y-auto no-scrollbar">
              {menuItems.map(item => (
                  <button key={item.id} onClick={() => setActiveMenu(item.id)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-lg text-xs font-semibold transition-all text-left  ${activeMenu === item.id ? 'bg-blue-500 text-white shadow-blue-500/30 translate-x-2' : (isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900')}`}>
                    {'iconSrc' in item && item.iconSrc ? (
                      <img src={item.iconSrc} alt="" className="w-4 h-4 shrink-0 object-contain" />
                    ) : (
                      <item.icon className={`w-4 h-4 shrink-0 ${activeMenu === item.id ? 'text-white' : isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                    )}
                    <span>{item.label}</span>
                  </button>
              ))}
          </nav>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-10 lg:p-16">
          <div className="max-w-[1400px] mx-auto space-y-12 pb-40">

              {/* 模块：MAU 数据分析 */}
              {activeMenu === 'mau' && (
                <div ref={mauSectionRef} className="space-y-12 animate-in fade-in duration-700">
                    <header className="text-center mb-16">
                        <h2 className="text-5xl font-semibold tracking-tighter mb-4">AI大模型月活 (MAU) 数据分析</h2>
                        <div className="h-1.5 w-40 bg-blue-500 mx-auto rounded-full"></div>
                    </header>

                    {/* 1. MAU 统计表 */}
                    <div className="bg-white rounded-2xl border overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className={`${tableHeaderClasses} border-b`}>
                                <tr>
                                    <th className="px-4 py-3">模型名称</th>
                                    <th className="px-4 py-3 text-center">12月MAU (亿)</th>
                                    <th className="px-4 py-3 text-center">1月MAU (亿)</th>
                                    <th className="px-4 py-3 text-center font-bold bg-blue-50">2月MAU (亿)</th>
                                    <th className="px-4 py-3">统计范围</th>
                                    <th className="px-4 py-3">用户特征</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                {mauTableData.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-semibold text-slate-800">{row.name}</td>
                                        <td className="px-4 py-3 text-center font-mono">{row.dec}</td>
                                        <td className="px-4 py-3 text-center font-mono">{row.jan}</td>
                                        <td className="px-4 py-3 text-center font-mono font-semibold text-blue-600 bg-blue-50/30">{row.feb}</td>
                                        <td className="px-4 py-3 opacity-80">{row.range}</td>
                                        <td className="px-4 py-3 opacity-80">{row.features}</td>
                                    </tr>
                                ))}
                                <tr className="bg-slate-50 font-semibold text-slate-900">
                                    <td className="px-4 py-3">月度汇总</td>
                                    <td className="px-4 py-3 text-center font-mono">3.8423</td>
                                    <td className="px-4 py-3 text-center font-mono">3.9946</td>
                                    <td className="px-4 py-3 text-center font-mono bg-blue-50">4.1130</td>
                                    <td className="px-4 py-3 text-center">——</td>
                                    <td className="px-4 py-3 text-center">——</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* 2. MAU 趋势对比图 */}
                    <div className="bg-white rounded-2xl border p-6 md:p-10 flex flex-col">
                        <div className="flex items-center gap-3 mb-10 pl-2 border-l-4 border-blue-600">
                            <h4 className="font-semibold text-2xl tracking-tight text-slate-800">大模型月活趋势对比</h4>
                        </div>
                        <div className="h-[500px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={mauChartData} margin={{ top: 20, right: 80, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="month" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#475569', fontSize: 13, fontWeight: 'bold'}}
                                        dy={10}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}}
                                        unit="亿"
                                    />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                                    />
                                    <Legend 
                                        layout="vertical" 
                                        verticalAlign="middle" 
                                        align="right" 
                                        iconType="circle"
                                        wrapperStyle={{ paddingLeft: '40px', fontWeight: 'bold', fontSize: '13px' }}
                                    />
                                    {mauTableData.map((engine) => (
                                        <Line 
                                            key={engine.name}
                                            type="monotone" 
                                            dataKey={engine.name} 
                                            stroke={engine.color} 
                                            strokeWidth={4} 
                                            dot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                                            activeDot={{ r: 8 }}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
              )}

              {/* 模块：品牌模型矩阵全景 */}
              {activeMenu === 'visibility' && (
                  <div ref={visibilitySectionRef} className="space-y-12 animate-in fade-in duration-700">
                      <header className="flex flex-col gap-6">
                          <h2 className="text-5xl font-semibold tracking-tighter">品牌模型矩阵分析</h2>
                          <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit border shadow-inner">
                              <button onClick={() => setVisibilityType('positive')} className={`flex items-center gap-3 px-10 py-3.5 rounded-xl text-sm font-semibold transition-all ${visibilityType === 'positive' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500'}`}>
                                <ThumbsUp className="w-4 h-4" /> 竞品正面分析
                              </button>
                              <button onClick={() => setVisibilityType('negative')} className={`flex items-center gap-3 px-10 py-3.5 rounded-xl text-sm font-semibold transition-all ${visibilityType === 'negative' ? 'bg-white text-red-600 shadow-md' : 'text-slate-500'}`}>
                                <ThumbsDown className="w-4 h-4" /> 竞品负面分析
                              </button>
                          </div>
                      </header>
                      <div className="bg-white rounded-2xl border overflow-hidden">
                          <div className="px-10 py-6 border-b bg-slate-50/50 flex justify-between items-center">
                              <h4 className="font-semibold text-slate-800 text-xs">可见度百分比 (跨引擎对比)</h4>
                          </div>
                          <table className="w-full text-left">
                              <thead className={`${tableHeaderClasses} border-b`}>
                                  <tr>
                                      <th className="px-4 py-3 w-1/3">品牌</th>
                                      {Object.keys(engineLabels).map(key => <th key={key} className="px-4 py-3 text-center">{engineLabels[key as EngineKey]}</th>)}
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                  {(visibilityType === 'positive' ? matrixDataPositive : matrixDataNegative).map((row, i) => (
                                      <tr key={i} className={`hover:bg-slate-50/50 transition-colors ${row.isMain ? 'bg-blue-50/50' : ''}`}>
                                          <td className={`px-4 py-3 font-bold ${row.isMain ? 'text-blue-600' : 'text-slate-700'}`}>{row.brand}</td>
                                          {['doubao', 'deepseek', 'wenxin', 'qianwen', 'yuanbao', 'kimi'].map(key => {
                                              const value = (row as any)[key];
                                              const numValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) || 0 : 0);
                                              return (
                                                  <td key={key} className={`px-4 py-3 text-center font-mono font-semibold ${numValue > 0 ? (visibilityType === 'positive' ? 'text-blue-600' : 'text-red-600') : 'opacity-10'}`}>
                                                      {numValue.toFixed(2)}%
                                                  </td>
                                              );
                                          })}
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                      <div className="bg-white rounded-2xl border p-6 md:p-10 space-y-10">
                          <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-2xl tracking-tight">{engineLabels[matrixEngine]} 数据对比</h4>
                              <div className="flex p-1 bg-slate-100 rounded-xl">
                                  {Object.entries(engineLabels).map(([key, label]) => (
                                      <button key={key} onClick={() => setMatrixEngine(key as EngineKey)} className={`px-4 py-2 rounded-lg text-xs font-semibold  transition-all ${matrixEngine === key ? (visibilityType === 'positive' ? 'bg-blue-600 text-white shadow-lg' : 'bg-red-600 text-white shadow-lg') : 'text-slate-400'}`}>{label}</button>
                                  ))}
                              </div>
                          </div>
                          <div className="h-[500px] w-full">
                              <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={(visibilityType === 'positive' ? matrixDataPositive : matrixDataNegative).map(r => {
                                      const value = (r as any)[matrixEngine];
                                      const numValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) || 0 : 0);
                                      return { name: r.brand, val: numValue, isMain: r.isMain };
                                  })} layout="vertical" margin={{ left: 40, right: 80 }}>
                                      <XAxis type="number" hide domain={[0, 110]} />
                                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 12, fontWeight: 'bold'}} width={150} />
                                      <Bar dataKey="val" radius={[0, 8, 8, 0]} barSize={24}>
                                          { (visibilityType === 'positive' ? matrixDataPositive : matrixDataNegative).map((entry, index) => <Cell key={index} fill={entry.isMain ? (visibilityType === 'positive' ? '#3b82f6' : '#ef4444') : '#f1f5f9'} />) }
                                      </Bar>
                                  </BarChart>
                              </ResponsiveContainer>
                          </div>
                      </div>
                  </div>
              )}

              {/* 模块：模型专项审计 */}
              {['doubao', 'deepseek', 'wenxin', 'qianwen', 'yuanbao', 'kimi'].includes(activeMenu) && (
                  <div className="space-y-12">
                      <header>
                          <h2 className="text-2xl font-semibold tracking-tighter">
                            {engineLabels[activeMenu as EngineKey]} 专项审计
                          </h2>
                      </header>
                      <div className="flex p-1.5 bg-white border border-slate-200 rounded-[2rem] w-fit shadow-sm">
                          {phaseTabs.map(tab => (
                              <button key={tab.id} onClick={() => setActivePhase(tab.id as PhaseType)} className={`flex items-center gap-3 px-10 py-4 rounded-[1.8rem] text-sm font-semibold transition-all ${activePhase === tab.id ? `${tab.bg} ${tab.color} border shadow-sm` : 'text-slate-400 hover:text-slate-600'}`}>
                                <tab.icon className="w-4 h-4" /> {tab.label}
                              </button>
                          ))}
                      </div>
                      
                      {isContentLoading ? (
                        <div className="flex items-center justify-center py-32">
                          <div className="text-center">
                            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
                            <p className="text-slate-600 font-bold">加载专项数据中...</p>
                          </div>
                        </div>
                      ) : (
                        <RenderAuditPhase engineName={activeMenu} type={activePhase} />
                      )}
                  </div>
              )}

          </div>
      </div>
    </div>
  );
};

export default AnalyticsReport;
