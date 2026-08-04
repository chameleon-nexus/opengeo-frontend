import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Activity, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

const Monitoring: React.FC = () => {
  const [kpis, setKpis] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  return (
    <div className="flex-1 bg-slate-50 p-4 md:p-8 overflow-y-auto h-full">
      <div className="max-w-7xl mx-auto space-y-8 pb-20 md:pb-0">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between border-b border-slate-200 pb-6 gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">品牌监测管道</h2>
                <p className="text-slate-500 text-sm">主要 AI 引擎的实时品牌感知雷达。</p>
            </div>
            <div className="flex gap-3">
                 <button className="flex-1 md:flex-none px-4 py-2 bg-white text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-900 text-sm transition-colors border border-slate-200 font-medium shadow-sm">
                    导出报表
                 </button>
                 <button className="flex-1 md:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all">
                    <Activity className="w-4 h-4" /> 运行探测任务
                 </button>
            </div>
        </header>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {kpis.length > 0 ? (
                kpis.map((kpi, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md hover:border-slate-200 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-slate-500 text-sm font-medium">{kpi.name}</span>
                        <div className={`p-1 rounded-full ${kpi.trend === 'up' ? 'bg-green-50' : 'bg-red-50'}`}>
                           {kpi.trend === 'up' ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">{kpi.value}</div>
                    <div className={`text-xs font-semibold flex items-center ${kpi.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {kpi.change >= 0 ? '+' : ''}{kpi.change}% 
                        <span className="text-slate-400 ml-2 font-normal">对比上周</span>
                    </div>
                </div>
                ))
            ) : (
                <div className="lg:col-span-4 bg-white p-12 rounded-2xl border border-slate-100 shadow-sm text-center">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p className="text-sm font-bold text-slate-500">暂无数据</p>
                    <p className="text-xs mt-2 text-slate-400">该品牌暂无监测数据</p>
                </div>
            )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="font-bold text-slate-800">品牌提及趋势</h3>
                    <div className="flex gap-2 text-xs">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 font-medium rounded-full">7 天</span>
                        <span className="px-3 py-1 text-slate-500 hover:bg-slate-50 rounded-full cursor-pointer transition-colors">30 天</span>
                    </div>
                </div>
                <div className="h-[250px] md:h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData.length > 0 ? chartData : []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ color: '#475569' }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />
                            <Line type="monotone" dataKey="Doubao" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2, stroke:'#fff', fill: '#3b82f6'}} activeDot={{ r: 6, strokeWidth: 0 }} name="主渠道" />
                            <Line type="monotone" dataKey="ChatGPT" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2, stroke:'#fff', fill: '#10b981'}} name="ChatGPT" />
                            <Line type="monotone" dataKey="Gemini" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, strokeWidth: 2, stroke:'#fff', fill: '#8b5cf6'}} name="Gemini" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Side Stats */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col space-y-6">
                <div>
                    <h3 className="font-bold text-slate-800 mb-6">平台优势度</h3>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData.length > 0 ? chartData.slice(0, 4) : []} layout="vertical" barSize={20}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="day" type="category" hide />
                                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px' }} />
                                <Bar dataKey="Doubao" fill="#3b82f6" radius={[0, 4, 4, 0]} background={{ fill: '#f1f5f9', radius: [0, 4, 4, 0] }} name="主渠道" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-slate-500 mt-4 text-center bg-slate-50 p-3 rounded-lg">
                        <span className="font-semibold text-blue-600">主渠道</span> 目前是您的最强渠道。
                    </p>
                </div>

                <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-red-700">负面情感预警</h4>
                            <p className="text-xs text-red-600/80 mt-1 leading-relaxed">话题 "副作用" 在 Reddit 上过去 12 小时呈现负面趋势。</p>
                            <button className="mt-3 text-xs bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg font-medium hover:bg-red-50 transition-colors shadow-sm">一键自动优化回应 &rarr;</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;