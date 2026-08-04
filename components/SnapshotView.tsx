
import React, { useState, useEffect } from 'react';
import { Package, BoxSelect, Camera, ExternalLink, Clock, Monitor, Calendar, Filter } from 'lucide-react';
import { Theme, Brand } from '../types';
import { useBrandCatalog } from '../hooks/useBrandCatalog';

interface SnapshotViewProps {
  theme: Theme;
  currentBrand: Brand;
}

const QUESTIONS = [
    '哪个品牌的电动剃须刀刀网材质更好，飞利浦、博朗还是松下？',
    '需要精准控制剃须体验，哪个品牌的剃须刀更适合我？',
    '对于旅行达人，哪个品牌的电动剃须刀全球电压适配更方便？',
    '电动剃须刀使用时有烧焦味怎么办，飞利浦和博朗哪个品牌更耐用？',
    '剃须刀用完不好清洗怎么办，飞利浦的电动剃须刀支持全身水洗吗？'
];

const SnapshotView: React.FC<SnapshotViewProps> = ({ theme, currentBrand }) => {
  const isDark = theme === 'dark';
  
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  
  // Snapshot Data State
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter State
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>('7d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Catalog Data
  const { catalog } = useBrandCatalog(currentBrand);
  
  // 获取所有产品列表（扁平化）
  const allProducts = catalog.flatMap(cat => cat.products);

  // Reset when brand changes
  useEffect(() => {
    setSelectedProduct(null);
  }, [currentBrand.id]);

  const handleProductSelect = (product: string) => {
      setSelectedProduct(product || null);
  };

  const quickFilters = [
      { id: 'yesterday', label: '昨天' },
      { id: '3d', label: '近 3 天' },
      { id: '7d', label: '近 7 天' },
  ];

  return (
    <div className="h-full flex flex-col font-sans">
        {/* Header with Filter Bar - 永远显示 */}
        <div className={`border-b shrink-0 ${isDark ? 'border-geo-border bg-geo-card' : 'border-slate-200 bg-slate-50'}`}>
            <div className="p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-wrap">
                    {/* 筛选图标和标题 */}
                    <div className="flex items-center gap-3">
                        <Filter className={`w-5 h-5 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`} />
                        <span className={`text-sm font-medium ${isDark ? 'text-geo-text-main' : 'text-slate-700'}`}>
                            筛选条件
                        </span>
                    </div>
                    
                    {/* 产品选择 - 永远显示 */}
                    <div className="flex items-center gap-2">
                        <Package className={`w-4 h-4 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`} />
                        <label className={`text-xs font-medium ${isDark ? 'text-geo-text-sec' : 'text-slate-600'}`}>
                            产品
                        </label>
                        <select
                            value={selectedProduct || ''}
                            onChange={(e) => handleProductSelect(e.target.value)}
                            className={`px-3 py-2 rounded-lg text-sm border outline-none transition-colors min-w-[200px]
                                ${isDark 
                                    ? 'bg-zinc-800 border-zinc-700 text-white focus:border-geo-blue' 
                                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                                }
                            `}
                        >
                            <option value="">全部产品</option>
                            {allProducts.map((product, idx) => (
                                <option key={idx} value={product}>{product}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        {/* Main Content Area - 永远显示 */}
        <div className={`flex-1 flex flex-col overflow-hidden relative h-full min-w-0 ${isDark ? 'bg-geo-bg' : 'bg-white'}`}>
            {!selectedProduct ? (
                <div className="flex flex-col items-center justify-center flex-1 text-center opacity-40 pb-20 p-8">
                    <BoxSelect className="w-16 h-16 mb-4 stroke-1 text-slate-400" />
                    <h3 className={`text-xl font-bold ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>请选择监测对象</h3>
                    <p className={`text-sm mt-2 ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>在上方下拉菜单中选择具体的品类或 SKU 以查看结果截屏</p>
                </div>
            ) : (
                <div className="flex-1 p-6 lg:p-12 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="max-w-[1400px] mx-auto space-y-8">
                        
                        {/* Header */}
                        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                            <div>
                                <div className={`flex items-center gap-2 mb-2 text-xs font-semibold  ${isDark ? 'text-geo-blue geo-glow-text' : 'text-blue-600'}`}>
                                    <BoxSelect className="w-3.5 h-3.5" />
                                    当前对象: {selectedProduct}
                                </div>
                                <h2 className={`text-4xl font-semibold tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-900'}`}>结果截屏 (Visual Evidence)</h2>
                                <p className={`mt-2 font-medium ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>搜索结果页面快照与 AI 引擎权重留存</p>
                            </div>
                            <div className="flex gap-3">
                                <button className={`flex items-center gap-3 px-5 py-2.5 rounded-lg font-semibold text-sm  text-white shadow-sm transition-all hover-scale active:scale-95 ${isDark ? 'bg-gradient-coral shadow-coral hover:opacity-95' : 'bg-slate-900 shadow-slate-900/20 hover:bg-slate-800'}`}>
                                    <Camera className="w-5 h-5" /> 立即抓取
                                </button>
                            </div>
                        </div>

                        {/* Search & Filter Bar */}
                        <div className={`p-6 rounded-[2rem] border shadow-sm flex flex-col lg:flex-row gap-6 items-center
                            ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200'}
                        `}>
                            {/* Date Picker Section */}
                            <div className="flex items-center gap-4 flex-1 w-full lg:w-auto">
                                <div className={`p-2.5 rounded-xl ${isDark ? 'bg-geo-bg text-geo-blue' : 'bg-slate-50 text-slate-500'}`}>
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div className="flex items-center gap-2 flex-1">
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => {setStartDate(e.target.value); setActiveQuickFilter(null);}}
                                        className={`flex-1 p-2.5 rounded-xl border text-sm font-bold outline-none transition-all
                                            ${isDark ? 'bg-geo-bg border-geo-border text-white focus:border-geo-blue' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}
                                        `}
                                    />
                                    <span className={`text-xs font-semibold  opacity-30 ${isDark ? 'text-white' : 'text-slate-900'}`}>至</span>
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => {setEndDate(e.target.value); setActiveQuickFilter(null);}}
                                        className={`flex-1 p-2.5 rounded-xl border text-sm font-bold outline-none transition-all
                                            ${isDark ? 'bg-geo-bg border-geo-border text-white focus:border-geo-blue' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}
                                        `}
                                    />
                                </div>
                            </div>

                            {/* Quick Filters */}
                            <div className={`h-10 w-px hidden lg:block ${isDark ? 'bg-geo-border' : 'bg-slate-100'}`}></div>

                            <div className="flex items-center gap-2 w-full lg:w-auto">
                                {quickFilters.map((f) => (
                                    <button
                                        key={f.id}
                                        onClick={() => setActiveQuickFilter(f.id)}
                                        className={`px-5 py-2.5 rounded-xl text-xs font-semibold  transition-all
                                            ${activeQuickFilter === f.id
                                                ? (isDark ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' : 'bg-gradient-coral text-white shadow-coral hover:opacity-95')
                                                : (isDark ? 'bg-geo-bg text-geo-text-sec border border-geo-border hover:text-white' : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100')
                                            }
                                        `}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            <div className={`h-10 w-px hidden lg:block ${isDark ? 'bg-geo-border' : 'bg-slate-100'}`}></div>

                            {/* Engine Filter */}
                            <button className={`flex items-center gap-3 px-6 py-2.5 rounded-xl text-xs font-semibold  border transition-all w-full lg:w-auto justify-center
                                ${isDark ? 'bg-geo-bg border-geo-border text-geo-text-sec hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                            `}>
                                <Filter className="w-4 h-4" /> 引擎筛选
                            </button>
                        </div>

                        {/* List Layout */}
                        <div className="flex flex-col gap-6">
                            {snapshots.length > 0 ? (
                                snapshots.map((item) => (
                                <div key={item.id} className={`group rounded-2xl overflow-hidden border shadow-sm transition-all hover:shadow-apple flex flex-col md:flex-row h-auto md:h-52
                                    ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200'}
                                `}>
                                    {/* Info Left */}
                                    <div className="flex-1 p-8 flex flex-col justify-center min-w-0">
                                        <div>
                                            <div className="flex items-center justify-between md:justify-start gap-5 mb-5">
                                                <span className={`text-xs font-semibold px-3 py-1 rounded-lg border  flex items-center gap-2
                                                    ${isDark 
                                                        ? 'bg-geo-bg border-geo-border text-geo-blue' 
                                                        : 'bg-slate-50 text-slate-700 border-slate-200'}
                                                `}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${item.engine === 'Doubao' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                                                    {item.engine}
                                                </span>
                                                <div className={`flex items-center gap-1.5 text-xs font-semibold  ${isDark ? 'text-geo-text-sec/40' : 'text-slate-400'}`}>
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {item.time}
                                                </div>
                                            </div>
                                            <h4 className={`text-xl font-semibold pr-6 leading-snug line-clamp-2 tracking-tight ${isDark ? 'text-geo-text-main' : 'text-slate-800'}`}>
                                                {item.keyword}
                                            </h4>
                                        </div>
                                    </div>

                                    {/* Snapshot Right */}
                                    <div className={`w-full md:w-[420px] relative overflow-hidden border-t md:border-t-0 md:border-l
                                        ${isDark ? 'bg-black/40 border-geo-border' : 'bg-slate-50 border-slate-200'}
                                    `}>
                                         {/* Fake Screen UI Mockup */}
                                         <div className="w-full h-full p-6 flex flex-col opacity-60 group-hover:opacity-100 transition-opacity scale-[0.85] origin-top-left md:scale-100">
                                            {/* Fake AI Input Bar */}
                                            <div className={`h-9 w-full rounded-full mb-5 flex items-center px-4 gap-3
                                                ${isDark ? 'bg-geo-bg border border-geo-border' : 'bg-white shadow-sm'}
                                            `}>
                                                <div className={`w-3.5 h-3.5 rounded-full ${item.engine === 'Doubao' ? 'bg-blue-500' : 'bg-purple-600'}`}></div>
                                                <div className={`h-2.5 w-3/4 rounded-full ${isDark ? 'bg-geo-border' : 'bg-slate-200'}`}></div>
                                            </div>
                                            {/* Fake AI Response Content */}
                                            <div className="space-y-4">
                                                <div className={`p-5 rounded-2xl rounded-tl-sm ${isDark ? 'bg-geo-bg border border-geo-border' : 'bg-white shadow-sm'}`}>
                                                    <div className={`h-2.5 w-1/4 rounded-full mb-3 ${isDark ? 'bg-geo-blue/40' : 'bg-blue-100'}`}></div>
                                                    <div className={`h-2 w-full rounded-full mb-2 ${isDark ? 'bg-geo-border/50' : 'bg-slate-100'}`}></div>
                                                    <div className={`h-2 w-11/12 rounded-full mb-2 ${isDark ? 'bg-geo-border/50' : 'bg-slate-100'}`}></div>
                                                    <div className={`h-2 w-4/5 rounded-full ${isDark ? 'bg-geo-border/50' : 'bg-slate-100'}`}></div>
                                                </div>
                                                
                                                {/* Follow-up question bubbles */}
                                                <div className="flex gap-3">
                                                    <div className={`h-7 w-24 rounded-full ${isDark ? 'bg-geo-bg border border-geo-border' : 'bg-white shadow-sm'}`}></div>
                                                    <div className={`h-7 w-20 rounded-full ${isDark ? 'bg-geo-bg border border-geo-border' : 'bg-white shadow-sm'}`}></div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Interaction Overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-black/40 backdrop-blur-[2px]">
                                            <button className="flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-coral border border-white/20 text-white shadow-coral transform scale-90 group-hover:scale-100 transition-all hover:opacity-95 font-semibold text-xs ">
                                                <ExternalLink className="w-4 h-4" /> 查看证据快照
                                            </button>
                                        </div>
                                        
                                        {/* Rank Badge */}
                                        <div className={`absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center font-semibold font-mono text-lg shadow-xl
                                            ${item.rank === 1 
                                                ? 'bg-gradient-coral text-white shadow-coral hover:opacity-95' 
                                                : (isDark ? 'bg-geo-card text-geo-text-sec' : 'bg-slate-800 text-white')
                                            }
                                        `}>
                                            #{item.rank}
                                        </div>

                                        {/* Device Label */}
                                        <div className={`absolute bottom-3 right-4 px-2 py-1 rounded text-[8px] font-semibold  opacity-30 flex items-center gap-1.5 pointer-events-none
                                            ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}
                                        `}>
                                            <Monitor className="w-3 h-3" /> Agent Scan (Ver 2.4)
                                        </div>
                                    </div>
                                </div>
                            ))
                            ) : (
                                <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border ${isDark ? 'bg-geo-card border-geo-border' : 'bg-white border-slate-200'}`}>
                                    <Camera className={`w-12 h-12 mb-4 ${isDark ? 'text-geo-text-sec' : 'text-slate-400'}`} />
                                    <p className={`text-sm font-bold ${isDark ? 'text-geo-text-sec' : 'text-slate-500'}`}>暂无数据</p>
                                    <p className={`text-xs mt-2 ${isDark ? 'text-geo-text-sec/60' : 'text-slate-400'}`}>该产品暂无结果截屏数据</p>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default SnapshotView;
