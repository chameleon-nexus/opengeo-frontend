import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface SeriesPoint {
  x?: string | number;
  y?: number;
  name?: string;
  value?: number;
}

interface SeriesDef {
  name?: string;
  points?: SeriesPoint[];
  values?: SeriesPoint[];
}

interface Props {
  chartType: 'line' | 'bar' | 'pie';
  title: string;
  series: SeriesDef[];
}

const COLORS = ['#E8553F', '#5B9BD5', '#70AD47', '#FFC000', '#997300'];

const ChartCard: React.FC<Props> = ({ chartType, title, series }) => {
  const lineData = useMemo(() => {
    if (chartType === 'pie') return [];
    const pts = series[0]?.points || [];
    return pts.map((p) => ({
      x: p.x ?? p.name ?? '',
      y: p.y ?? p.value ?? 0,
    }));
  }, [chartType, series]);

  const pieData = useMemo(() => {
    const s0 = series[0];
    if (!s0) return [];
    if (Array.isArray(s0.points))
      return s0.points.map((p) => ({ name: String(p.name ?? p.x), value: Number(p.y ?? p.value ?? 0) }));
    if (Array.isArray(s0.values))
      return s0.values.map((p) => ({ name: String(p.name ?? ''), value: Number(p.value ?? 0) }));
    return [];
  }, [series]);

  return (
    <div className="rounded-xl border border-gray-100 bg-white px-2 py-2 text-left shadow-sm w-full min-w-0">
      <div className="text-xs font-semibold text-gray-800 mb-1 px-1">{title}</div>
      <div className="h-48 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="x" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="y" stroke="#E8553F" dot={false} name={series[0]?.name || 'y'} />
            </LineChart>
          ) : chartType === 'bar' ? (
            <BarChart data={lineData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="x" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={32} />
              <Tooltip />
              <Bar
                dataKey="y"
                fill="#E8553F"
                name={series[0]?.name || 'y'}
                maxBarSize={36}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <PieChart>
              <Tooltip />
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={56} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartCard;
