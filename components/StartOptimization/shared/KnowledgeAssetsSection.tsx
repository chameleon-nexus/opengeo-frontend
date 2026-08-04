import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Database, Network } from 'lucide-react';
import type { GeoWorkflowDTO } from '../../../api/geoWorkflow';
import { ModuleType } from '../../../types';
import { useWorkflowKnowledgeAssets } from '../hooks/useWorkflowKnowledgeAssets';
import type { SelectedBrand } from '../types';

interface Props {
  brand: SelectedBrand;
  workflow: GeoWorkflowDTO;
  enableKnowledgeGraph: boolean;
  onEnableKnowledgeGraphChange: (next: boolean) => void;
  defaultCollapsed?: boolean;
  onJumpModule?: (
    m: ModuleType,
    opts?: { workflowId?: string; knowledgeBaseId?: number; taskId?: string }
  ) => void;
}

const KnowledgeAssetsSection: React.FC<Props> = ({
  brand,
  workflow,
  enableKnowledgeGraph,
  onEnableKnowledgeGraphChange,
  defaultCollapsed = true,
  onJumpModule,
}) => {
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const { knowledgeBaseId, semanticSeoTaskId } = useWorkflowKnowledgeAssets(workflow, brand);
  const kgEnabled = enableKnowledgeGraph;

  const kbSummary = knowledgeBaseId != null ? `已关联知识库 #${knowledgeBaseId}` : '尚未关联知识库';
  const kgSummary = semanticSeoTaskId
    ? `已生成图谱任务 ${semanticSeoTaskId}`
    : kgEnabled
      ? '已开启增强，图谱任务生成中或未完成'
      : '未开启知识图谱增强';

  const openKnowledgeBase = () => {
    onJumpModule?.(ModuleType.KNOWLEDGE_BASE, {
      workflowId: workflow.workflowId,
      knowledgeBaseId: knowledgeBaseId ?? undefined,
    });
  };

  const openKnowledgeGraph = () => {
    onJumpModule?.(ModuleType.SEMANTIC_SEO, {
      workflowId: workflow.workflowId,
      taskId: semanticSeoTaskId ?? undefined,
    });
  };

  if (defaultCollapsed && !expanded) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title="展开知识库与知识图谱"
          aria-label="展开知识库与知识图谱"
          className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-50/80"
        >
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[#111827]">知识库 · 知识图谱</h3>
            <p className="mt-1 truncate text-xs text-[#64748b]">
              {kbSummary} · {kgSummary}
            </p>
          </div>
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#64748b]"
            aria-hidden
          >
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[#111827]">知识库 · 知识图谱</h3>
          <p className="mt-1 text-xs text-[#64748b]">
            查看或管理本周期关联的知识库材料与语义知识图谱；与解析品牌阶段使用同一套数据。
          </p>
        </div>
        {defaultCollapsed ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            title="收起"
            aria-label="收起知识库与知识图谱"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#64748b] shadow-sm transition-colors hover:bg-slate-50"
          >
            <ChevronUp className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-[#f8f9fb] px-4 py-3 hover:border-orange-200/90">
        <input
          type="checkbox"
          checked={kgEnabled}
          onChange={(e) => onEnableKnowledgeGraphChange(e.target.checked)}
          className="h-4 w-4 shrink-0 rounded border-slate-400 text-[#E8553F] focus:ring-[#E8553F]"
        />
        <div className="min-w-0">
          <span className="text-sm font-semibold text-[#374151]">开启知识图谱增强</span>
          <p className="mt-0.5 text-xs text-[#64748b] leading-relaxed">
            开启后，重新生成词包时将走知识图谱增强；请先在知识库上传材料。
          </p>
        </div>
      </label>

      <div className="mt-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#f8f9fb] px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <Database className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              知识库
            </div>
            <p className="mt-1 text-xs text-[#64748b]">{kbSummary}</p>
          </div>
          {onJumpModule ? (
            <button
              type="button"
              onClick={openKnowledgeBase}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#374151] transition-colors hover:border-[#E8553F]/35 hover:bg-[#FFF9F6]"
            >
              管理知识库
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#f8f9fb] px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <Network className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              知识图谱
            </div>
            <p className="mt-1 break-all text-xs text-[#64748b]">{kgSummary}</p>
          </div>
          {onJumpModule ? (
            <button
              type="button"
              onClick={openKnowledgeGraph}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#374151] transition-colors hover:border-[#E8553F]/35 hover:bg-[#FFF9F6]"
            >
              管理知识图谱
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeAssetsSection;
