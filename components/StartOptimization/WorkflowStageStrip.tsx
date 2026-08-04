import React from 'react';
import { Check } from 'lucide-react';
import { WORKBENCH_STAGES, type WorkbenchStage } from './types';

interface Props {
  current: WorkbenchStage;
  /** 已经完成的阶段 ID 集合 */
  completed: Set<WorkbenchStage>;
  /** 点击允许进入的阶段（仅完成的或当前 + 1） */
  onJump?: (stage: WorkbenchStage) => void;
}

/**
 * 「开始优化」工作台顶部阶段进度条（参考 ClimateSeal 风格）
 */
const WorkflowStageStrip: React.FC<Props> = ({ current, completed, onJump }) => {
  const currentIdx = WORKBENCH_STAGES.findIndex((s) => s.id === current);
  return (
    <div className="w-full bg-white border-b border-gray-200 px-6 py-3">
      <ol className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        {WORKBENCH_STAGES.map((s, idx) => {
          const isDone = completed.has(s.id) || idx < currentIdx;
          const isActive = s.id === current;
          const reachable = isDone || isActive || (onJump && idx <= currentIdx + 1);
          const node = (
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold shrink-0
                  ${isActive
                    ? 'bg-[#E8553F] text-white ring-2 ring-[#E8553F]/20'
                    : isDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-400'}`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
              </span>
              <div className="min-w-0">
                <div
                  className={`text-sm truncate ${
                    isActive ? 'text-gray-900 font-semibold' : 'text-gray-500 font-medium'
                  }`}
                >
                  {s.label}
                </div>
              </div>
            </div>
          );
          return (
            <li key={s.id} className="flex items-center gap-2 shrink-0">
              {reachable && onJump ? (
                <button
                  type="button"
                  onClick={() => onJump(s.id)}
                  className="hover:opacity-80 transition-opacity"
                  title={s.description}
                >
                  {node}
                </button>
              ) : (
                <div title={s.description}>{node}</div>
              )}
              {idx < WORKBENCH_STAGES.length - 1 && (
                <div
                  className={`w-8 h-px ${idx < currentIdx ? 'bg-emerald-300' : 'bg-gray-200'}`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default WorkflowStageStrip;
