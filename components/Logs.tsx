import React from 'react';
import { Search, Calendar, Filter, Image as ImageIcon, MessageSquare } from 'lucide-react';
import { Theme, DashboardData } from '../types';

interface LogsProps {
  theme: Theme;
  data: DashboardData;
}

const Logs: React.FC<LogsProps> = ({ theme, data }) => {
  const isDark = theme === 'dark';
  const { logs } = data;

  return (
    <div className="flex-1 p-6 lg:p-10 overflow-y-auto h-full no-scrollbar">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
                <h2 className={`text-4xl font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>系统日志</h2>
                <p className={`mt-2 font-medium ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>AI 交互历史与证据留存</p>
            </div>
            
            {/* Search Bar - Floating */}
            <div className={`px-4 py-2 rounded-full flex items-center gap-3 w-full md:w-96 shadow-sm border backdrop-blur-md
                ${isDark ? 'bg-zinc-800/50 border-white/10 text-white' : 'bg-white/75 border-white/50 text-slate-900'}
            `}>
                <Search className={`w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`} />
                <input 
                    type="text" 
                    placeholder="搜索日志..." 
                    className={`bg-transparent border-none outline-none text-sm font-medium w-full ${isDark ? 'placeholder-zinc-600' : 'placeholder-slate-400'}`}
                />
            </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
            <button className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm shadow-lg whitespace-nowrap
                ${isDark ? 'bg-white text-black shadow-white/10' : 'bg-blue-500 text-white shadow-blue-500/30'}
            `}>
                全部日志
            </button>
            <button className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm shadow-sm whitespace-nowrap transition-colors
                ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white text-slate-600 hover:bg-slate-50'}
            `}>
                <Calendar className="w-4 h-4" /> 本周
            </button>
            <button className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm shadow-sm whitespace-nowrap transition-colors
                ${isDark ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-white text-slate-600 hover:bg-slate-50'}
            `}>
                <Filter className="w-4 h-4" /> 模型筛选
            </button>
        </div>

        {/* Logs Card */}
        <div className={`rounded-[2.5rem] shadow-apple border overflow-hidden transition-colors
            ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-white/50'}
        `}>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-4 py-3">时间戳 / 模型</th>
                            <th className="px-4 py-3 w-1/4">提问 (Query)</th>
                            <th className="px-4 py-3 w-1/4">摘要 (Summary)</th>
                            <th className="px-4 py-3 text-center">排名</th>
                            <th className="px-4 py-3 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                        {logs.map((log) => (
                            <tr key={log.id} className={`transition-colors group ${isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-slate-50/80'}`}>
                                <td className="px-4 py-3">
                                    <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{log.model}</div>
                                    <div className={`text-xs font-mono mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{log.date}</div>
                                    <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-bold  rounded-md
                                        ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-slate-100 text-slate-500'}
                                    `}>{log.product}</span>
                                </td>
                                <td className={`px-4 py-3 font-medium ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                                    {log.question}
                                </td>
                                <td className={`px-4 py-3 leading-relaxed line-clamp-2 ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                                    {log.replySummary}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-bold text-sm shadow-sm
                                        ${log.rank === 1 
                                            ? (isDark ? 'bg-blue-500 text-white' : 'bg-blue-500 text-white') 
                                            : log.rank <= 3 
                                                ? (isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700')
                                                : (isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-slate-100 text-slate-400')
                                        }
                                    `}>
                                        {log.rank}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <button className={`p-2.5 rounded-xl transition-colors
                                            ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}
                                        `}>
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                        {log.hasScreenshot && (
                                            <button className={`p-2.5 rounded-xl transition-colors
                                                ${isDark ? 'bg-blue-900/20 hover:bg-blue-900/40 text-blue-400' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'}
                                            `}>
                                                <ImageIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Logs;