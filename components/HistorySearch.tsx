import React, { useState, useMemo } from 'react';
import { Search, Calendar, ArrowLeft, GitCompare, TrendingUp, CheckSquare, Square, X, FileText, Swords, Crown, Minus, Trophy, Zap, AlertTriangle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Theme, Brand } from '../types';

interface HistorySearchProps {
  theme: Theme;
  currentBrand: Brand;
  onBack: () => void;
}

// Unified Task Data Structure
const MOCK_TASKS = [
  { 
    id: 'T-20240312-01', 
    date: '2024-03-12 14:30', 
    status: 'completed', 
    score: 85, 
    summary: '综合表现优秀，信源覆盖率提升',
    details: {
        volume: { score: 85, topBrands: [{name: '本品', val: 68}, {name: '竞品A', val: 20}, {name: '竞品B', val: 12}] },
        source: { count: 1240, topDomain: 'zhihu.com' },
        weakness: { count: 2, topIssue: '售后服务' }
    }
  },
  { 
    id: 'T-20240311-02', 
    date: '2024-03-11 09:20', 
    status: 'completed', 
    score: 78, 
    summary: '发现新的负面弱点，声量略有下降',
    details: {
        volume: { score: 78, topBrands: [{name: '本品', val: 55}, {name: '竞品A', val: 25}, {name: '竞品B', val: 20}] },
        source: { count: 1100, topDomain: 'xiaohongshu.com' },
        weakness: { count: 5, topIssue: '产品质量' }
    }
  },
  { 
    id: 'T-20240310-01', 
    date: '2024-03-10 15:00', 
    status: 'completed', 
    score: 82, 
    summary: '常规监测，数据平稳',
    details: {
        volume: { score: 82, topBrands: [{name: '本品', val: 60}, {name: '竞品A', val: 22}, {name: '竞品B', val: 18}] },
        source: { count: 1150, topDomain: 'zhihu.com' },
        weakness: { count: 3, topIssue: '发货速度' }
    }
  },
  { 
    id: 'T-20240309-03', 
    date: '2024-03-09 11:30', 
    status: 'warning', 
    score: 70, 
    summary: '部分信源连接超时，数据完整性受限',
    details: {
        volume: { score: 70, topBrands: [{name: '本品', val: 50}, {name: '竞品A', val: 30}, {name: '竞品B', val: 20}] },
        source: { count: 980, topDomain: 'douyin.com' },
        weakness: { count: 4, topIssue: '价格争议' }
    }
  },
  { 
    id: 'T-20240308-01', 
    date: '2024-03-08 10:00', 
    status: 'completed', 
    score: 65, 
    summary: '周末流量低谷，竞品活动影响显著',
    details: {
        volume: { score: 65, topBrands: [{name: '本品', val: 45}, {name: '竞品A', val: 35}, {name: '竞品B', val: 20}] },
        source: { count: 950, topDomain: 'zhihu.com' },
        weakness: { count: 6, topIssue: '功能缺失' }
    }
  },
];

const HistorySearch: React.FC<HistorySearchProps> = ({ theme, currentBrand, onBack }) => {
  const isDark = theme === 'dark';
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'compare' | 'trend'>('list');
  const [dateRange, setDateRange] = useState('Last 7 Days');

  const filteredTasks = MOCK_TASKS;

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCompare = () => {
      if (selectedIds.length === 2) setViewMode('compare');
  };

  const handleTrend = () => {
      if (selectedIds.length >= 2) setViewMode('trend');
  };

  // --- Comparison PK Logic ---
  
  const renderMetricPK = (
      label: string, 
      val1: number, 
      val2: number, 
      type: 'high_better' | 'low_better',
      unit: string = '',
      icon: React.ReactNode
  ) => {
      // Determine winner
      let winner = 0; // 0: tie, 1: left, 2: right
      if (val1 !== val2) {
          if (type === 'high_better') {
              winner = val1 > val2 ? 1 : 2;
          } else {
              winner = val1 < val2 ? 1 : 2;
          }
      }

      const diff = Math.abs(val1 - val2);
      
      // Labels for statuses
      const getStatusLabel = (isWinner: boolean) => {
          if (winner === 0) return '持平';
          return isWinner ? '领先' : '落后';
      };

      const getCardStyle = (side: 1 | 2) => {
          const isWinner = winner === side;
          const isLoser = winner !== 0 && winner !== side;
          
          if (isWinner) {
              return `bg-gradient-to-br from-green-600 to-emerald-700 text-white shadow-xl shadow-green-900/20 scale-105 border-transparent relative overflow-hidden z-10 ring-4 ring-white/10`;
          }
          if (isLoser) {
               return `${isDark ? 'bg-zinc-800/30 text-zinc-500 border-zinc-700' : 'bg-slate-50 text-slate-400 border-slate-100'} border opacity-80 scale-95 grayscale`;
          }
          return `${isDark ? 'bg-zinc-800/50 text-zinc-400 border-zinc-700' : 'bg-white text-slate-400 border-slate-200'} border shadow-sm`;
      };

      return (
          <div className="flex items-center gap-4 lg:gap-8 py-4 lg:py-6 group">
              {/* Left Card */}
              <div className={`flex-1 p-6 rounded-2xl transition-all duration-500 flex justify-between items-center h-32 ${getCardStyle(1)}`}>
                  <div className="flex flex-col justify-center h-full">
                      <div className="flex items-baseline gap-1">
                        <div className={`text-4xl font-bold font-mono tracking-tighter ${winner === 1 ? 'text-white' : ''}`}>{val1}</div>
                        <div className={`text-xs font-medium opacity-60`}>{unit}</div>
                      </div>
                      {winner !== 0 && (
                          <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold w-fit ${winner === 1 ? 'bg-white/20 text-white' : 'bg-black/5 text-current'}`}>
                              {getStatusLabel(winner === 1)} {winner === 1 && `+${diff}`}
                          </div>
                      )}
                  </div>
                  {winner === 1 && <Crown className="w-12 h-12 text-white/20 rotate-[-15deg] absolute -right-2 -bottom-2" />}
              </div>

              {/* Center Label */}
              <div className="w-32 text-center shrink-0 flex flex-col items-center gap-2">
                  <div className={`p-3 rounded-full shadow-sm mb-1
                      ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-white text-slate-400 border border-slate-100'}
                  `}>
                      {icon}
                  </div>
                  <div className={`text-xs font-bold  ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>{label}</div>
                  
                  {/* Difference Line (Neutral) */}
                  {winner !== 0 ? (
                      <div className={`text-xs font-medium px-3 py-1 rounded-full mt-1 flex items-center gap-1
                          ${isDark ? 'bg-zinc-900 text-zinc-500' : 'bg-slate-100 text-slate-500'}
                      `}>
                          差值: <span className="font-mono font-bold">{diff}</span>
                      </div>
                  ) : (
                      <div className={`text-xs font-medium px-3 py-1 rounded-full mt-1 flex items-center gap-1
                          ${isDark ? 'bg-zinc-900 text-zinc-500' : 'bg-slate-100 text-slate-500'}
                      `}>
                          <Minus className="w-3 h-3" /> 无变化
                      </div>
                  )}
              </div>

              {/* Right Card */}
              <div className={`flex-1 p-6 rounded-2xl transition-all duration-500 flex justify-between items-center h-32 ${getCardStyle(2)}`}>
                   {winner === 2 && <Crown className="w-12 h-12 text-white/20 rotate-[15deg] absolute -left-2 -bottom-2" />}
                   <div className="text-right flex-1 flex flex-col items-end justify-center h-full">
                      <div className="flex items-baseline gap-1 justify-end">
                        <div className={`text-4xl font-bold font-mono tracking-tighter ${winner === 2 ? 'text-white' : ''}`}>{val2}</div>
                        <div className={`text-xs font-medium opacity-60`}>{unit}</div>
                      </div>
                      {winner !== 0 && (
                          <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold w-fit ${winner === 2 ? 'bg-white/20 text-white' : 'bg-black/5 text-current'}`}>
                              {getStatusLabel(winner === 2)} {winner === 2 && `+${diff}`}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  };

  const renderComparison = () => {
      const t1 = MOCK_TASKS.find(t => t.id === selectedIds[0]);
      const t2 = MOCK_TASKS.find(t => t.id === selectedIds[1]);
      if (!t1 || !t2) return null;

      return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-20">
              
              {/* VS Header */}
              <div className="flex items-center justify-center mb-12 relative">
                  <div className={`absolute inset-x-0 h-px top-1/2 -z-10 ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`}></div>
                  <div className={`px-10 py-3 rounded-full border shadow-xl font-semibold text-3xl italic tracking-tighter flex items-center gap-6 z-10
                      ${isDark ? 'bg-black border-zinc-800 text-white' : 'bg-white border-slate-100 text-slate-900'}
                  `}>
                      <span className="text-blue-500">A</span>
                      <div className="w-px h-8 bg-zinc-200/20 rotate-12"></div>
                      <Swords className="w-6 h-6 opacity-30" />
                      <div className="w-px h-8 bg-zinc-200/20 rotate-12"></div>
                      <span className="text-blue-500">B</span>
                  </div>
              </div>

              {/* Headers */}
              <div className="flex justify-between items-start mb-8 px-4">
                  <div className={`w-1/3 p-6 rounded-2xl border-l-4 border-blue-500 ${isDark ? 'bg-zinc-900/50' : 'bg-white/50'}`}>
                      <div className="flex items-center gap-2 mb-3">
                          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold border border-blue-500/20">任务 A</span>
                          <span className={`text-xs font-mono opacity-50`}>{t1.id}</span>
                      </div>
                      <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t1.date}</h3>
                      <p className={`text-sm opacity-60 leading-relaxed`}>{t1.summary}</p>
                  </div>
                  <div className={`w-1/3 p-6 rounded-2xl border-r-4 border-blue-500 text-right ${isDark ? 'bg-zinc-900/50' : 'bg-white/50'}`}>
                      <div className="flex items-center gap-2 justify-end mb-3">
                          <span className={`text-xs font-mono opacity-50`}>{t2.id}</span>
                          <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold border border-blue-500/20">任务 B</span>
                      </div>
                      <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{t2.date}</h3>
                      <p className={`text-sm opacity-60 leading-relaxed`}>{t2.summary}</p>
                  </div>
              </div>

              {/* PK Metrics */}
              <div className="space-y-4 mb-16">
                  {renderMetricPK('全域可见度', t1.details.volume.score, t2.details.volume.score, 'high_better', '分', <Trophy className="w-5 h-5" />)}
                  {renderMetricPK('信源覆盖数', t1.details.source.count, t2.details.source.count, 'high_better', '个', <Zap className="w-5 h-5" />)}
                  {renderMetricPK('风险弱点', t1.details.weakness.count, t2.details.weakness.count, 'low_better', '处', <AlertTriangle className="w-5 h-5" />)}
              </div>

              {/* Detailed Breakdown */}
              <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-zinc-900/30 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="flex items-center justify-center gap-3 mb-10 opacity-50">
                      <div className="h-px w-12 bg-current"></div>
                      <h4 className="font-bold text-xs ">详细参数透视</h4>
                      <div className="h-px w-12 bg-current"></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-16">
                      {/* Left Details */}
                      <div className="space-y-8">
                          <div>
                              <div className="flex items-center gap-2 mb-4">
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                  <div className="text-sm font-bold text-blue-500 ">TOP 3 品牌声量</div>
                              </div>
                              <div className="space-y-3">
                                  {t1.details.volume.topBrands.map((b, i) => (
                                      <div key={i} className="flex items-center justify-between text-sm">
                                          <span className={`${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{b.name}</span>
                                          <div className="flex items-center gap-3 w-40">
                                              <div className={`h-2 flex-1 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                                                  <div className="h-full bg-blue-500 rounded-full" style={{width: `${b.val}%`}}></div>
                                              </div>
                                              <span className="font-mono text-xs w-8 text-right opacity-60">{b.val}%</span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div className={`p-4 rounded-2xl ${isDark ? 'bg-zinc-800' : 'bg-slate-50'}`}>
                                  <div className="text-xs opacity-50 mb-1">核心信源</div>
                                  <div className="font-bold text-sm truncate" title={t1.details.source.topDomain}>{t1.details.source.topDomain}</div>
                              </div>
                              <div className={`p-4 rounded-2xl ${isDark ? 'bg-red-900/10 border border-red-500/10' : 'bg-red-50 border border-red-100'}`}>
                                  <div className="text-xs text-red-500/70 mb-1">首要风险</div>
                                  <div className="font-bold text-sm text-red-500 truncate" title={t1.details.weakness.topIssue}>{t1.details.weakness.topIssue}</div>
                              </div>
                          </div>
                      </div>

                      {/* Right Details */}
                      <div className="space-y-8">
                          <div>
                              <div className="flex items-center gap-2 mb-4 justify-end">
                                  <div className="text-sm font-bold text-blue-500 ">TOP 3 品牌声量</div>
                                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              </div>
                              <div className="space-y-3">
                                  {t2.details.volume.topBrands.map((b, i) => (
                                      <div key={i} className="flex items-center justify-between text-sm flex-row-reverse">
                                          <span className={`${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>{b.name}</span>
                                          <div className="flex items-center gap-3 w-40 flex-row-reverse">
                                              <div className={`h-2 flex-1 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-slate-100'}`}>
                                                  <div className="h-full bg-blue-500 rounded-full" style={{width: `${b.val}%`}}></div>
                                              </div>
                                              <span className="font-mono text-xs w-8 text-left opacity-60">{b.val}%</span>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div className={`p-4 rounded-2xl ${isDark ? 'bg-zinc-800' : 'bg-slate-50'}`}>
                                  <div className="text-xs opacity-50 mb-1">核心信源</div>
                                  <div className="font-bold text-sm truncate" title={t2.details.source.topDomain}>{t2.details.source.topDomain}</div>
                              </div>
                              <div className={`p-4 rounded-2xl ${isDark ? 'bg-red-900/10 border border-red-500/10' : 'bg-red-50 border border-red-100'}`}>
                                  <div className="text-xs text-red-500/70 mb-1">首要风险</div>
                                  <div className="font-bold text-sm text-red-500 truncate" title={t2.details.weakness.topIssue}>{t2.details.weakness.topIssue}</div>
                              </div>
                          </div>
                      </div>
                  </div>
              </div>

          </div>
      );
  };

  const renderTrend = () => {
      const data = selectedIds.map(id => MOCK_TASKS.find(t => t.id === id)).filter(Boolean).reverse().map(t => ({
          date: t.date.split(' ')[0],
          score: t.score,
          sourceCount: t.details.source.count
      }));
      
      return (
          <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
              <div className={`flex-1 p-6 rounded-2xl border shadow-sm mb-6 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
                  <h3 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>多任务趋势分析</h3>
                  <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data}>
                              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#e2e8f0'} vertical={false} />
                              <XAxis dataKey="date" stroke={isDark ? '#71717a' : '#94a3b8'} />
                              <YAxis yAxisId="left" stroke={isDark ? '#71717a' : '#94a3b8'} domain={[0, 100]} />
                              <YAxis yAxisId="right" orientation="right" stroke={isDark ? '#71717a' : '#94a3b8'} />
                              <Tooltip 
                                  contentStyle={{ backgroundColor: isDark ? '#18181b' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
                                  labelStyle={{ color: isDark ? '#a1a1aa' : '#64748b' }}
                              />
                              <Legend />
                              <Line yAxisId="left" type="monotone" dataKey="score" name="可见度得分" stroke="#3b82f6" strokeWidth={4} activeDot={{ r: 8 }} />
                              <Line yAxisId="right" type="monotone" dataKey="sourceCount" name="信源覆盖数" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" />
                          </LineChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className={`flex-1 flex flex-col h-full overflow-hidden ${isDark ? 'bg-black' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className={`h-16 border-b flex items-center justify-between px-6 shrink-0 ${isDark ? 'border-zinc-800 bg-zinc-900' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center gap-4">
              <button onClick={onBack} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-400' : 'hover:bg-slate-100 text-slate-600'}`}>
                  <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-current opacity-10"></div>
              <div>
                  <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>历史任务归档</h2>
                  <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>当前品牌: {currentBrand.name}</p>
              </div>
          </div>
          
          {viewMode !== 'list' && (
              <button 
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
              >
                  退出视图
              </button>
          )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto h-full flex flex-col">
              
              {viewMode === 'list' ? (
                  <>
                    {/* Filters */}
                    <div className={`p-6 rounded-2xl border mb-6 flex flex-wrap gap-4 items-center justify-between
                        ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}
                    `}>
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isDark ? 'bg-black/20 border-zinc-700' : 'bg-slate-50 border-slate-200'}`}>
                                <Calendar className="w-4 h-4 opacity-50" />
                                <select 
                                    value={dateRange}
                                    onChange={(e) => setDateRange(e.target.value)}
                                    className="bg-transparent outline-none text-sm font-medium appearance-none pr-4 cursor-pointer"
                                >
                                    <option>Last 7 Days</option>
                                    <option>Last 30 Days</option>
                                    <option>Custom Range</option>
                                </select>
                            </div>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 opacity-40" />
                            <input 
                                type="text" 
                                placeholder="搜索任务 ID 或摘要..."
                                className={`w-full pl-10 pr-4 py-2 rounded-xl border text-sm outline-none transition-all
                                    ${isDark ? 'bg-black/20 border-zinc-700 focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}
                                `} 
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className={`flex-1 rounded-2xl border overflow-hidden flex flex-col shadow-sm
                        ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}
                    `}>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 w-16 text-center">选择</th>
                                        <th className="px-4 py-3">任务 ID</th>
                                        <th className="px-4 py-3">执行时间</th>
                                        <th className="px-4 py-3">全域可见度得分</th>
                                        <th className="px-4 py-3">状态</th>
                                        <th className="px-4 py-3 w-1/3">分析摘要</th>
                                        <th className="px-4 py-3 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                    {filteredTasks.map((task) => {
                                        const isSelected = selectedIds.includes(task.id);
                                        return (
                                            <tr 
                                                key={task.id} 
                                                onClick={() => toggleSelection(task.id)}
                                                className={`cursor-pointer transition-colors ${isSelected ? (isDark ? 'bg-blue-900/20' : 'bg-blue-50') : (isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50')}`}
                                            >
                                                <td className="px-4 py-3 text-center">
                                                    {isSelected 
                                                        ? <CheckSquare className="w-5 h-5 text-blue-500 mx-auto" /> 
                                                        : <Square className="w-5 h-5 text-gray-400 mx-auto" />
                                                    }
                                                </td>
                                                <td className={`px-4 py-3 font-mono text-sm ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>{task.id}</td>
                                                <td className={`px-4 py-3 text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{task.date}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-lg font-bold font-mono ${task.score >= 80 ? 'text-green-500' : task.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                        {task.score}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                                        <span className="text-sm capitalize">{task.status}</span>
                                                    </div>
                                                </td>
                                                <td className={`px-4 py-3 text-sm ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>{task.summary}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <button className={`p-2 rounded-lg hover:bg-opacity-20 ${isDark ? 'hover:bg-white text-zinc-400' : 'hover:bg-black text-slate-400'}`}>
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Floating Action Bar */}
                    {selectedIds.length > 0 && (
                        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
                            <div className={`pl-6 pr-2 py-2 rounded-full shadow-sm border flex items-center gap-6 backdrop-blur-xl
                                ${isDark ? 'bg-zinc-900/90 border-zinc-700 text-white' : 'bg-white/90 border-slate-200 text-slate-900'}
                            `}>
                                <span className="text-sm font-bold">已选择 {selectedIds.length} 项</span>
                                <div className="h-6 w-px bg-current opacity-10"></div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleCompare}
                                        disabled={selectedIds.length !== 2}
                                        className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all
                                            ${selectedIds.length === 2 
                                                ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95 shadow-lg' 
                                                : 'opacity-50 cursor-not-allowed bg-black/5'
                                            }
                                        `}
                                    >
                                        <GitCompare className="w-4 h-4" /> 全域对比
                                    </button>
                                    <button 
                                        onClick={handleTrend}
                                        disabled={selectedIds.length < 2}
                                        className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all
                                            ${selectedIds.length >= 2 
                                                ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95 shadow-lg' 
                                                : 'opacity-50 cursor-not-allowed bg-black/5'
                                            }
                                        `}
                                    >
                                        <TrendingUp className="w-4 h-4" /> 走势分析
                                    </button>
                                    <button onClick={() => setSelectedIds([])} className="p-2 rounded-full hover:bg-black/10 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                  </>
              ) : viewMode === 'compare' ? (
                  renderComparison()
              ) : (
                  renderTrend()
              )}
          </div>
      </div>
    </div>
  );
};

export default HistorySearch;