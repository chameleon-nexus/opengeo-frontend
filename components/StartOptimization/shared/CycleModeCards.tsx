import React from 'react';
import { CheckCircle2, RefreshCcw, Zap } from 'lucide-react';
import type { GeoWorkflowCycleMode } from '../../../api/geoWorkflow';

export const CYCLE_OPTIONS: {
  mode: GeoWorkflowCycleMode;
  title: string;
  description: string;
  badge?: string;
  bullets: string[];
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    mode: 'full',
    title: '全周期',
    description: '从品牌解析开始，依次现状分析 -> 智能优化 -> 完成',
    badge: '推荐',
    bullets: ['解析品牌生成词包（豆包联网）', '生成基线诊断报告', '构建并执行智能优化', '到期 / 手动结束'],
    Icon: RefreshCcw,
  },
  {
    mode: 'half',
    title: '半周期',
    description: '解析品牌生成词包后，跳过现状分析，直接进入智能优化',
    bullets: ['解析品牌生成词包（同全周期）', '跳过现状分析阶段', '直接构建智能优化任务'],
    Icon: Zap,
  },
];

interface Props {
  value: GeoWorkflowCycleMode;
  onChange: (mode: GeoWorkflowCycleMode) => void;
  /** 卡片区域上方的说明（如弹窗内「跳过输入品牌」提示） */
  topHint?: string;
}

/**
 * 全周期 / 半周期选择与「新建优化」工作台同布局、同样式。
 */
export function CycleModeCardsSection({ value, onChange, topHint }: Props) {
  return (
    <div>
      {topHint ? (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">{topHint}</p>
      ) : null}
      <h3 className="text-sm font-semibold text-gray-900 mb-1">优化周期</h3>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        半周期同样会生成词包，仅跳过基线诊断报告阶段。
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CYCLE_OPTIONS.map(({ mode, title, description, badge, bullets, Icon }) => {
          const isActive = value === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => onChange(mode)}
              className={`text-left rounded-2xl border p-5 transition-all
                ${
                  isActive
                    ? 'border-[#E8553F] bg-[#FFF6F2] shadow-[0_8px_24px_-12px_rgba(232,85,63,0.25)]'
                    : 'border-gray-200 bg-white hover:border-[#E8553F]/40'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center
                    ${isActive ? 'bg-[#E8553F] text-white' : 'bg-gray-100 text-gray-500'}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-base font-semibold text-gray-900">{title}</div>
                </div>
                {badge ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8553F]/10 text-[#E8553F] shrink-0">
                    {badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">{description}</p>
              <ul className="mt-3 space-y-1.5">
                {bullets.map((b) => (
                  <li
                    key={b}
                    className={`flex items-start gap-2 text-xs ${
                      isActive ? 'text-gray-600' : 'text-gray-500'
                    }`}
                  >
                    <CheckCircle2
                      className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        isActive ? 'text-[#E8553F]' : 'text-gray-300'
                      }`}
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}
