import React from 'react';
import { CheckCircle2, ClipboardList, Sparkles } from 'lucide-react';
import type { GeoWorkflowQuestionIntent } from '../../../api/geoWorkflow';

export const QUESTION_INTENT_OPTIONS: {
  intent: GeoWorkflowQuestionIntent;
  title: string;
  description: string;
  badge?: string;
  bullets: string[];
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    intent: 'recommendation',
    title: '产品推荐',
    description: '词包与现状分析问题偏选购、榜单与场景选型（默认）',
    badge: '默认',
    bullets: ['核心词贴近型号 / 人群 / 场景（如大学生、游戏向）', '模拟「推荐几款、怎么选、榜单」类提问', '适合上新曝光与种草链路'],
    Icon: Sparkles,
  },
  {
    intent: 'evaluation',
    title: '产品评价',
    description: '词包与现状分析问题偏评测、决策求证与对比',
    bullets: ['核心词贴近优缺点、评测、值得买吗', '模拟「好不好、对比竞品、翻车与否」类提问', '适合口碑与转化决策链路'],
    Icon: ClipboardList,
  },
];

interface Props {
  value: GeoWorkflowQuestionIntent;
  onChange: (intent: GeoWorkflowQuestionIntent) => void;
  topHint?: string;
}

/**
 * 产品推荐 / 产品评价 —— 布局与样式对齐 {@link CycleModeCardsSection}（全周期 / 半周期）。
 */
export function QuestionIntentCardsSection({ value, onChange, topHint }: Props) {
  return (
    <div>
      {topHint ? (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">{topHint}</p>
      ) : null}
      <h3 className="text-sm font-semibold text-gray-900 mb-1">语义取向</h3>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        影响词包生成与现状分析的模拟提问风格；可随时在半周期 / 全周期流程前切换。
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUESTION_INTENT_OPTIONS.map(({ intent, title, description, badge, bullets, Icon }) => {
          const isActive = value === intent;
          return (
            <button
              key={intent}
              type="button"
              onClick={() => onChange(intent)}
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
