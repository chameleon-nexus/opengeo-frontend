/**
 * 可见度趋势图 - 从全域看板提取，用于分析明细第一行
 */

import React from 'react';
import { LineChart, Line, Tooltip, ResponsiveContainer, XAxis, Legend, CartesianGrid, YAxis } from 'recharts';
import { Share2, TrendingUp } from 'lucide-react';
import { Theme } from '../types';

export interface VisibilityTrendData {
  score: number;
  change: number;
  history: { date: string; value: number; comp1?: number; comp2?: number; comp3?: number; comp4?: number }[];
}

export interface CompetitorItem {
  name: string;
  score: number;
  change?: number;
}

interface VisibilityTrendChartProps {
  theme: Theme;
  visibility: VisibilityTrendData;
  competitors: CompetitorItem[];
  cardClasses: string;
}

/** 当 history 为空时的默认数据：趋势各异（持续上升/平滑/先降后升），可见度 80-95 */
const FALLBACK_HISTORY = [
  { date: '2025-03', value: 80, comp1: 88, comp2: 92, comp3: 84, comp4: 81 },
  { date: '2025-06', value: 86, comp1: 89, comp2: 86, comp3: 86, comp4: 88 },
  { date: '2025-09', value: 92, comp1: 90, comp2: 88, comp3: 88, comp4: 93 },
  { date: '2025-11', value: 95, comp1: 91, comp2: 94, comp3: 90, comp4: 95 },
];

const VisibilityTrendChart: React.FC<VisibilityTrendChartProps> = ({
  theme,
  visibility,
  competitors,
  cardClasses,
}) => {
  const isDark = theme === 'dark';
  const chartData = Array.isArray(visibility?.history) && visibility.history.length >= 2
    ? visibility.history
    : FALLBACK_HISTORY;

  return (
    <div
      className={`${cardClasses} flex flex-col min-h-[420px] relative overflow-hidden
        ${isDark
          ? 'border-white/5'
          : 'border-slate-200'
        }
      `}
    >
      <div
        className={`absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none
          ${isDark ? 'bg-blue-500/10' : 'bg-blue-500/5'}
        `}
      />
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold
              ${isDark ? 'bg-white/5 border-white/10 text-zinc-300' : 'bg-slate-50 border-slate-200 text-slate-600'}
            `}
          >
            <Share2 className="w-3.5 h-3.5" /> 可见度评分
          </div>
          <div
            className={`text-xs font-semibold px-3 py-1 rounded-lg border flex items-center gap-1.5
              ${visibility.change >= 0
                ? (isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200')
                : (isDark ? 'bg-red-500/20 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200')
              }
            `}
          >
            <TrendingUp className={`w-3.5 h-3.5 ${visibility.change < 0 ? 'rotate-180' : ''}`} />
            {visibility.change > 0 ? '+' : ''}{visibility.change}%
          </div>
        </div>

        <div className="mb-6">
          <div
            className={`text-6xl lg:text-7xl font-semibold tracking-tighter
              ${isDark ? 'text-white' : 'text-slate-900'}
            `}
          >
            {visibility.score}
          </div>
          <div
            className={`mt-2 font-bold text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}
          >
            下一代 AI 优化指数
          </div>
        </div>

        <div className="w-full h-[220px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: isDark ? '#A3A3A3' : '#64748b',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
                dy={10}
                interval={1}
              />
              <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#18181b' : '#fff',
                  borderRadius: '12px',
                  border: isDark ? '1px solid #404040' : '1px solid #e2e8f0',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  color: isDark ? '#f5f5f5' : '#333',
                }}
                itemStyle={{ fontWeight: 'bold' }}
              />
              <Legend
                verticalAlign="top"
                height={40}
                iconType="circle"
                wrapperStyle={{
                  fontSize: '10px',
                  fontWeight: 'bold',
                  letterSpacing: '0.05em',
                  opacity: 0.9,
                }}
              />
              <Line
                name={competitors[0]?.name || '目标品牌'}
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={4}
                dot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3, fill: '#3b82f6' }}
              />
              <Line
                name={competitors[1]?.name || '竞品1'}
                type="monotone"
                dataKey="comp1"
                stroke="#94a3b8"
                strokeWidth={2}
                dot={false}
              />
              <Line
                name={competitors[2]?.name || '竞品3'}
                type="monotone"
                dataKey="comp2"
                stroke="#64748b"
                strokeWidth={2}
                dot={false}
              />
              <Line
                name={competitors[3]?.name || '竞品4'}
                type="monotone"
                dataKey="comp3"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={false}
              />
              <Line
                name={competitors[4]?.name || '竞品5'}
                type="monotone"
                dataKey="comp4"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default VisibilityTrendChart;
