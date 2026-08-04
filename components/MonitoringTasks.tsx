
import React, { useState, useEffect } from 'react';
import { 
    MonitorCheck, Plus, ArrowRight, ArrowLeft, Search, Eye, 
    BarChart2, Globe, Sparkles, Image as ImageIcon, X, 
    CheckCircle2, Clock, AlertTriangle, ExternalLink, Save, Layers, Calendar, Mail, Hash, Filter, Monitor
} from 'lucide-react';
import { Theme, Brand } from '../types';
import { useBrandCatalog } from '../hooks/useBrandCatalog';

interface MonitoringTasksProps {
  theme: Theme;
  currentBrand: Brand;
}

interface MonitorTask {
    id: string;
    brand: string;
    product: string;
    createTime: string;
    status: 'Running' | 'Completed';
    stats: {
        appearanceRate: number;
        coverageRate: number;
        sentiment: '正面' | '中立' | '负面';
    };
}

const SPECIFIC_KEYWORDS = [
    "哪个品牌的电动剃须刀刀网材质更好，飞利浦、博朗还是松下？",
    "需要精准控制剃须体验，哪个品牌的剃须刀更适合我？",
    "对于旅行达人，哪个品牌的电动剃须刀全球电压适配更方便？",
    "电动剃须刀使用时有烧焦味怎么办，飞利浦和博朗哪个品牌更耐用？",
    "剃须刀用完不好清洗怎么办，飞利浦的电动剃须刀支持全身水洗吗？"
];

const INITIAL_TASKS: MonitorTask[] = [
    {
        id: 'MT-20240315-01',
        brand: '飞利浦',
        product: '剃须刀全系',
        createTime: '2024-03-15 10:00',
        status: 'Completed',
        stats: { appearanceRate: 88, coverageRate: 92, sentiment: '正面' }
    },
    {
        id: 'MT-20240314-02',
        brand: '飞利浦',
        product: '电动牙刷 S9900',
        createTime: '2024-03-14 14:30',
        status: 'Running',
        stats: { appearanceRate: 75, coverageRate: 60, sentiment: '中立' }
    }
];

const MonitoringTasks: React.FC<MonitoringTasksProps> = ({ theme, currentBrand }) => {
  const isDark = theme === 'dark';

  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [tasks, setTasks] = useState<MonitorTask[]>(INITIAL_TASKS);
  const [selectedTask, setSelectedTask] = useState<MonitorTask | null>(null);
  const [showScreenshot, setShowScreenshot] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
      product: '',
      selectedKeywords: [] as string[],
      frequency: '24h',
      duration: '30d',
      email: ''
  });

  const { catalog } = useBrandCatalog(currentBrand);
  const allProducts = catalog.flatMap(c => c.products);

  const handleTaskClick = (task: MonitorTask) => {
      setSelectedTask(task);
      setViewMode('detail');
  };

  const handleBack = () => {
      setSelectedTask(null);
      setViewMode('list');
  };

  const toggleKeyword = (keyword: string) => {
      setNewTaskData(prev => {
          const exists = prev.selectedKeywords.includes(keyword);
          if (exists) {
              return { ...prev, selectedKeywords: prev.selectedKeywords.filter(k => k !== keyword) };
          } else {
              return { ...prev, selectedKeywords: [...prev.selectedKeywords, keyword] };
          }
      });
  };

  const handleCreateTask = () => {
      if (!newTaskData.product || newTaskData.selectedKeywords.length === 0 || !newTaskData.email) {
          alert('请完成所有必填项');
          return;
      }
      const newTask: MonitorTask = {
          id: `MT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(Math.random()*100)}`,
          brand: currentBrand.name,
          product: newTaskData.product,
          createTime: new Date().toLocaleString('zh-CN', { hour12: false }),
          status: 'Running',
          stats: { appearanceRate: 0, coverageRate: 0, sentiment: '中立' }
      };
      setTasks([newTask, ...tasks]);
      setIsCreateModalOpen(false);
  };

  const detailKeywords = SPECIFIC_KEYWORDS.flatMap((k, i) => [
      { id: `db-${i}`, keyword: k, rank: Math.floor(Math.random() * 3) + 1, engine: 'Doubao', hasSnapshot: true },
      { id: `ds-${i}`, keyword: k, rank: Math.floor(Math.random() * 3) + 1, engine: 'DeepSeek', hasSnapshot: true }
  ]);

  const renderList = () => (
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 relative font-sans">
          <div className="flex justify-between items-end">
              <div>
                  <h2 className={`text-4xl font-semibold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>数据监控</h2>
                  <p className={`mt-2 font-medium ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>
                      自动化全网爬虫雷达，实时监测品牌在 AIGC 回复中的动态权重
                  </p>
              </div>
              <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl font-semibold text-sm  shadow-sm hover-scale transition-all
                  ${isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95'}
              `}>
                  <Plus className="w-5 h-5" /> Launch Radar
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tasks.map(task => (
                  <div 
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className={`group p-8 rounded-2xl border cursor-pointer transition-all hover:-translate-y-2 hover:shadow-sm relative overflow-hidden
                          ${isDark 
                              ? 'bg-geo-card border-geo-border shadow-black/40' 
                              : 'bg-white border-slate-200'
                          }
                      `}
                  >
                      <div className="flex justify-between items-start mb-8">
                          <div className={`p-4 rounded-2xl transition-all duration-300 ${isDark ? 'bg-geo-bg text-geo-blue shadow-blue-glow' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                              <MonitorCheck className="w-8 h-8" />
                          </div>
                          <div className={`px-4 py-1.5 rounded-full text-xs font-semibold  border
                              ${task.status === 'Completed' 
                                  ? (isDark ? 'bg-green-900/20 text-green-400 border-green-500/20' : 'bg-green-50 text-green-700 border-green-200')
                                  : (isDark ? 'bg-blue-900/20 text-blue-400 border-blue-500/20 animate-pulse' : 'bg-blue-50 text-blue-700 animate-pulse')
                              }
                          `}>
                              {task.status === 'Completed' ? 'Steady' : 'Monitoring'}
                          </div>
                      </div>
                      
                      <h3 className={`text-xl font-semibold mb-1 tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>{task.brand} - {task.product}</h3>
                      <div className={`text-xs font-semibold font-mono  opacity-40 mb-8 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>ID: {task.id}</div>
                      
                      <div className={`grid grid-cols-2 gap-6 pt-6 border-t border-dashed ${isDark ? 'border-geo-border' : 'border-slate-100'}`}>
                          <div>
                              <div className={`text-xs font-semibold  mb-1 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>Recall Rate</div>
                              <div className={`text-2xl font-semibold font-mono tracking-tighter ${task.stats.appearanceRate > 80 && isDark ? 'text-geo-blue geo-glow-text' : (isDark ? 'text-white' : 'text-slate-900')}`}>
                                  {task.stats.appearanceRate === 0 ? '-' : task.stats.appearanceRate + '%'}
                              </div>
                          </div>
                          <div>
                              <div className={`text-xs font-semibold  mb-1 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`}>Source Depth</div>
                              <div className={`text-2xl font-semibold font-mono tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {task.stats.coverageRate === 0 ? '-' : task.stats.coverageRate + '%'}
                              </div>
                          </div>
                      </div>
                      
                      <div className={`absolute bottom-0 left-0 w-full h-1.5 transition-all group-hover:h-2
                          ${task.status === 'Completed' ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-geo-blue animate-pulse shadow-blue-glow'}
                      `}></div>
                  </div>
              ))}
          </div>

          {isCreateModalOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsCreateModalOpen(false)}>
                  <div 
                      className={`w-full max-w-xl rounded-2xl shadow-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] border
                          ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white'}
                      `}
                      onClick={e => e.stopPropagation()}
                  >
                      <div className={`p-8 border-b flex justify-between items-center ${isDark ? 'border-geo-border' : 'border-slate-100'}`}>
                          <div>
                              <h3 className={`text-2xl font-semibold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>New Monitor Task</h3>
                              <p className={`text-xs font-bold  mt-2 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>Configure Semantic Radar Instance</p>
                          </div>
                          <button onClick={() => setIsCreateModalOpen(false)} className={`p-2.5 rounded-full transition-colors ${isDark ? 'bg-geo-bg text-geo-text-sec hover:text-white' : 'hover:bg-slate-100 text-slate-500'}`}>
                              <X className="w-5 h-5" />
                          </button>
                      </div>
                      
                      <div className="p-10 space-y-8 overflow-y-auto no-scrollbar">
                          <div className="space-y-4">
                              <label className={`text-xs font-semibold  ${isDark ? 'text-geo-text-sec' : 'text-slate-700'}`}>Instance Target</label>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className={`p-4 rounded-xl border flex items-center gap-3 ${isDark ? 'bg-geo-bg/40 border-geo-border opacity-50' : 'bg-slate-50 border-slate-200'}`}>
                                      <div className={`w-5 h-5 rounded-lg bg-current ${currentBrand.logoColor}`}></div>
                                      <span className="text-sm font-bold">{currentBrand.name}</span>
                                  </div>
                                  <select 
                                      value={newTaskData.product}
                                      onChange={(e) => setNewTaskData({...newTaskData, product: e.target.value})}
                                      className={`w-full p-4 rounded-xl border outline-none text-sm font-semibold transition-all appearance-none cursor-pointer
                                          ${isDark 
                                              ? 'bg-geo-bg/40 border-geo-border text-white focus:border-geo-blue' 
                                              : 'bg-white border-slate-200 text-slate-900 focus:border-blue-500'
                                          }
                                      `}
                                  >
                                      <option value="">Select SKU Product</option>
                                      {allProducts.map((p, i) => (<option key={i} value={p}>{p}</option>))}
                                  </select>
                              </div>
                          </div>

                          <div className="space-y-4">
                              <label className={`text-xs font-semibold  ${isDark ? 'text-geo-text-sec' : 'text-slate-700'}`}>
                                  Query Matrix <span className="font-normal opacity-40 lowercase ml-2">(Source: Keyword Extractor)</span>
                              </label>
                              <div className={`w-full rounded-2xl border max-h-[220px] overflow-y-auto no-scrollbar flex flex-col
                                  ${isDark ? 'bg-geo-bg/40 border-geo-border' : 'bg-slate-50 border-slate-200'}
                              `}>
                                  {SPECIFIC_KEYWORDS.map((kw, i) => {
                                      const isSelected = newTaskData.selectedKeywords.includes(kw);
                                      return (
                                          <div key={i} onClick={() => toggleKeyword(kw)} className={`p-4 text-xs font-bold border-b cursor-pointer transition-all flex items-start gap-4 last:border-0 ${isSelected ? (isDark ? 'bg-geo-blue/10 text-white' : 'bg-blue-50 text-blue-900') : (isDark ? 'text-geo-text-sec hover:bg-geo-bg/60' : 'text-slate-600 hover:bg-white')} ${isDark ? 'border-geo-border' : 'border-slate-200'}`}>
                                              <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? (isDark ? 'bg-geo-blue border-geo-blue' : 'bg-blue-500 border-blue-500') : (isDark ? 'border-geo-border bg-geo-bg' : 'border-slate-300 bg-white')}`}>{isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}</div>
                                              <span className="leading-relaxed">{kw}</span>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-8">
                              <div className="space-y-4">
                                  <label className={`text-xs font-semibold  ${isDark ? 'text-geo-text-sec' : 'text-slate-700'}`}>Scan Frequency</label>
                                  <select value={newTaskData.frequency} onChange={(e) => setNewTaskData({...newTaskData, frequency: e.target.value})} className={`w-full p-4 rounded-xl border outline-none text-sm font-semibold appearance-none cursor-pointer ${isDark ? 'bg-geo-bg border-geo-border text-white focus:border-geo-blue' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                      <option value="24h">Daily (Standard)</option>
                                      <option value="12h">12h Cycle</option>
                                      <option value="realtime">Real-time mapping</option>
                                  </select>
                              </div>
                              <div className="space-y-4">
                                  <label className={`text-xs font-semibold  ${isDark ? 'text-geo-text-sec' : 'text-slate-700'}`}>Retention Period</label>
                                  <select value={newTaskData.duration} onChange={(e) => setNewTaskData({...newTaskData, duration: e.target.value})} className={`w-full p-4 rounded-xl border outline-none text-sm font-semibold appearance-none cursor-pointer ${isDark ? 'bg-geo-bg border-geo-border text-white focus:border-geo-blue' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                                      <option value="30d">30 Day Log</option>
                                      <option value="90d">Quarterly Scan</option>
                                  </select>
                              </div>
                          </div>
                      </div>

                      <div className={`p-8 border-t flex justify-end gap-4 ${isDark ? 'bg-geo-bg/40 border-geo-border' : 'bg-slate-50'}`}>
                          <button onClick={() => setIsCreateModalOpen(false)} className={`px-5 py-2 rounded-xl text-xs font-semibold  transition-all hover-scale ${isDark ? 'text-geo-text-sec hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>Cancel</button>
                          <button onClick={handleCreateTask} className={`px-10 py-3 rounded-xl text-xs font-semibold  text-white shadow-sm transition-all hover-scale ${isDark ? 'bg-gradient-coral shadow-coral hover:opacity-95' : 'bg-slate-900 hover:bg-slate-800'}`}>Deploy Terminal</button>
                      </div>
                  </div>
              </div>
          )}
      </div>
  );

  // Added renderDetail to fix the "Cannot find name renderDetail" error
  const renderDetail = () => {
    if (!selectedTask) return null;
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500 relative font-sans">
            <header className="flex items-center gap-6">
                <button 
                    onClick={handleBack}
                    className={`p-3 rounded-2xl transition-all hover:scale-110 active:scale-95 border
                        ${isDark ? 'bg-geo-bg border-geo-border text-geo-text-sec hover:text-white' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 shadow-sm'}
                    `}
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <h2 className={`text-3xl font-semibold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>{selectedTask.product}</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold  border
                            ${selectedTask.status === 'Completed' 
                                ? (isDark ? 'bg-green-900/20 text-green-400 border-green-500/20' : 'bg-green-50 text-green-700 border-green-200')
                                : (isDark ? 'bg-blue-900/20 text-blue-400 border-blue-500/20 animate-pulse' : 'bg-blue-50 text-blue-700 animate-pulse')
                            }
                        `}>
                            {selectedTask.status}
                        </span>
                    </div>
                    <p className={`text-sm font-bold opacity-50 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>Task Instance: {selectedTask.id} • Created at {selectedTask.createTime}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Appearance Rate', value: selectedTask.stats.appearanceRate + '%', icon: Eye, color: 'text-blue-500' },
                    { label: 'Source Coverage', value: selectedTask.stats.coverageRate + '%', icon: Globe, color: 'text-purple-500' },
                    { label: 'Sentiment Index', value: selectedTask.stats.sentiment, icon: BarChart2, color: 'text-emerald-500' },
                    { label: 'Active Engines', value: '2', icon: Sparkles, color: 'text-geo-blue' }
                ].map((stat, i) => (
                    <div key={i} className={`p-6 rounded-2xl border shadow-sm ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl bg-opacity-10 ${isDark ? 'bg-white' : 'bg-slate-900'} ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <div className={`text-2xl font-semibold font-mono tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat.value}</div>
                        <div className={`text-xs font-semibold  mt-1 opacity-40 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>{stat.label}</div>
                    </div>
                ))}
            </div>

            <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200'}`}>
                <div className={`px-8 py-6 border-b flex items-center justify-between ${isDark ? 'border-geo-border' : 'border-slate-100'}`}>
                    <h3 className={`font-semibold text-xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Keyword Drill-down</h3>
                    <div className="flex items-center gap-2">
                         <button className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-geo-bg text-geo-text-sec' : 'hover:bg-slate-50 text-slate-400'}`}>
                             <Filter className="w-5 h-5" />
                         </button>
                    </div>
                </div>
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-3">语义查询</th>
                            <th className="px-4 py-3">AI 引擎</th>
                            <th className="px-4 py-3">召回排名</th>
                            <th className="px-4 py-3 text-right">证据</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                        {detailKeywords.map((item) => (
                            <tr key={item.id} className={`group transition-colors ${isDark ? 'hover:bg-geo-bg/30' : 'hover:bg-slate-50'}`}>
                                <td className="px-4 py-3">
                                    <div className={`font-bold leading-relaxed max-w-lg ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>{item.keyword}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold  border
                                        ${item.engine === 'Doubao' 
                                            ? (isDark ? 'bg-blue-900/20 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-200')
                                            : (isDark ? 'bg-purple-900/20 text-purple-400 border-purple-500/20' : 'bg-purple-50 text-purple-600 border-purple-200')
                                        }
                                    `}>{item.engine}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-2xl font-semibold font-mono ${item.rank === 1 && isDark ? 'text-geo-blue geo-glow-text' : (isDark ? 'text-white' : 'text-slate-900')}`}>
                                            #{item.rank}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button 
                                        onClick={() => setShowScreenshot(item.id)}
                                        className={`p-3 rounded-2xl transition-all hover-scale border ${isDark ? 'bg-geo-card border-geo-border text-geo-text-sec hover:text-geo-blue hover:border-geo-blue/30' : 'bg-white border-slate-200 text-slate-600 hover:text-blue-600'}`}
                                    >
                                        <ImageIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Fake Screenshot Modal */}
            {showScreenshot && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-10 bg-black/90 backdrop-blur-xl animate-in fade-in" onClick={() => setShowScreenshot(null)}>
                    <button className="absolute top-8 right-8 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                        <X className="w-8 h-8" />
                    </button>
                    <div className={`w-full max-w-5xl h-full rounded-[2rem] border overflow-hidden relative shadow-sm ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
                        <div className={`h-16 border-b flex items-center justify-between px-8 ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                            <div className="flex items-center gap-4">
                                <ImageIcon className="w-5 h-5 text-blue-500" />
                                <span className="font-bold text-sm">Evidence Snapshot: {detailKeywords.find(k => k.id === showScreenshot)?.engine}</span>
                            </div>
                            <button onClick={() => setShowScreenshot(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center bg-black/40 p-20 text-center space-y-6">
                            <Monitor className="w-24 h-24 text-white/10 stroke-[1]" />
                            <div className="space-y-2">
                                <h4 className="text-white font-bold text-xl">Visual Evidence Mockup</h4>
                                <p className="text-white/40 text-sm max-w-sm">In a production environment, this area would render the actual high-resolution browser snapshot of the AI's response.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="flex-1 p-6 lg:p-12 overflow-y-auto h-full no-scrollbar font-sans">
      <div className="max-w-[1500px] mx-auto h-full">
          {viewMode === 'list' ? renderList() : renderDetail()}
      </div>
    </div>
  );
};

export default MonitoringTasks;
