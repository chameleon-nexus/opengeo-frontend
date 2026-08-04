import React from 'react';

interface Props {
  title: string;
  value: string;
  description?: string;
  trend?: 'up' | 'down' | 'flat' | '';
}

const trendLabel: Record<string, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

const KPICard: React.FC<Props> = ({ title, value, description, trend }) => {
  const tr = trend && trendLabel[trend] ? trend : '';
  const trendColor =
    trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

  return (
    <div className="rounded-xl border border-gray-100 bg-white px-3 py-3 text-left shadow-sm w-full min-w-0">
      <div className="text-xs font-semibold text-gray-600 mb-1">{title}</div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-bold text-gray-900 tabular-nums">{value}</span>
        {tr ? <span className={`text-sm font-medium ${trendColor}`}>{tr}</span> : null}
      </div>
      {description ? <p className="text-xs text-gray-500 mt-2 leading-relaxed">{description}</p> : null}
    </div>
  );
};

export default KPICard;
