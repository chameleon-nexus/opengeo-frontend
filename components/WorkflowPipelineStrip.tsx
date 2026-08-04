import React from 'react';
import { Check, CircleDot } from 'lucide-react';
import type { GeoWorkflowDTO } from '../api/geoWorkflow';
import { getPipelineNodeVisual, geoWorkflowListPhaseLabel, getPipelineStepLabel, PIPELINE_STEPS } from './geoWorkflowShared';

interface WorkflowPipelineStripProps {
  isDark: boolean;
  wf: GeoWorkflowDTO;
  embedded?: boolean;
  onNodeClick: (stepIndex: number) => void;
}

/** 与快速开始「优化主线」流程条一致 */
const WorkflowPipelineStrip: React.FC<WorkflowPipelineStripProps> = ({
  isDark,
  wf,
  embedded,
  onNodeClick,
}) => (
  <div
    className={
      (embedded ? 'mt-0 ' : 'mt-3 ') +
      'rounded-lg border px-2.5 py-2 backdrop-blur-md ' +
      (isDark
        ? 'border-white/10 bg-slate-950/40 shadow-inner shadow-black/20'
        : 'border-slate-200/60 bg-white/45 shadow-sm shadow-slate-200/30')
    }
    onClick={(e) => e.stopPropagation()}
    onKeyDown={(e) => e.stopPropagation()}
  >
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span
        className={
          'text-[10px] font-medium tracking-wide ' + (isDark ? 'text-zinc-500' : 'text-slate-500/90')
        }
      >
        优化主线
      </span>
      <span className={'text-[10px] ' + (isDark ? 'text-zinc-500' : 'text-slate-500')}>
        {geoWorkflowListPhaseLabel(wf)} · {wf.phaseStatus}
      </span>
    </div>
    <div className="flex min-w-0 items-center justify-between gap-0.5 overflow-x-auto pb-0.5">
      {PIPELINE_STEPS.map((s, idx) => {
        const isHalfSkipped = wf.cycleMode === 'half' && idx === 1;
        const v = isHalfSkipped ? 'done' : getPipelineNodeVisual(wf, idx);
        const lineDone = idx > 0 && getPipelineNodeVisual(wf, idx - 1) === 'done';
        const disk =
          v === 'done'
            ? 'border-emerald-500/70 bg-emerald-500/20 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-200'
            : v === 'current'
              ? 'border-[#E8553F]/80 bg-[#E8553F]/15 text-[#E8553F] ring-1 ring-[#E8553F]/30 dark:bg-[#E8553F]/20'
              : isDark
                ? 'border-slate-600/70 bg-slate-800/60 text-zinc-500'
                : 'border-slate-300/80 bg-slate-200/50 text-slate-500';
        return (
          <React.Fragment key={s.key}>
            {idx > 0 ? (
              <div
                className={
                  'h-px min-w-[10px] flex-1 shrink ' +
                  (lineDone
                    ? 'bg-emerald-400/60'
                    : isDark
                      ? 'bg-slate-600/50'
                      : 'bg-slate-300/70')
                }
                aria-hidden
              />
            ) : null}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNodeClick(idx);
              }}
              className="flex min-w-0 max-w-[64px] flex-col items-center gap-0.5 rounded-md p-0.5 text-center transition hover:opacity-90 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#E8553F]/50"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold leading-none ${disk}`}
              >
                {v === 'done' ? (
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                ) : v === 'current' ? (
                  <CircleDot className="h-2.5 w-2.5" strokeWidth={2.5} />
                ) : (
                  <span className="tabular-nums">{idx + 1}</span>
                )}
              </span>
              <span
                className={
                  'line-clamp-2 max-w-[64px] text-[9px] font-medium leading-tight ' +
                  (isDark ? 'text-zinc-400' : 'text-slate-600/95')
                }
              >
                {isHalfSkipped ? '已跳过' : getPipelineStepLabel(s.key)}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
    <p className={'mt-1 text-[9px] ' + (isDark ? 'text-zinc-600' : 'text-slate-400')}>点击节点查看产出</p>
  </div>
);

export default WorkflowPipelineStrip;
