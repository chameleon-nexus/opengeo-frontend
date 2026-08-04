import React from 'react';
import {
  CheckCircle2,
  Loader2,
  Link2,
  Sparkles,
  ClipboardCheck,
  Flag,
} from 'lucide-react';
import type { BaseRichItem } from '../types';
import GenericEventCard from '../cards/GenericEventCard';
import type { DocumentDeepLink } from '../cards/DocumentCard';
import { ModuleType } from '../../../../types';

interface Props {
  item: BaseRichItem;
  onOpenModule?: (m: ModuleType, opts: { reportId?: number; taskId?: string; workflowId?: string }) => void;
}

/** 与 KeywordVisualizationV1 核心词配色一致：橙 + 蓝灰 */
const KW_COLORS = ['#FF8C42', '#FF6B35', '#E8553F', '#5B9BD5', '#4A90E2'];

function CoreKeywordChips({ words }: { words: unknown }) {
  const arr: string[] = Array.isArray(words)
    ? words.map((x) => (typeof x === 'string' ? x : (x as { text?: string })?.text || String(x)))
    : [];
  const top = arr.filter(Boolean).slice(0, 5);
  if (!top.length) return <span className="text-[10px] text-gray-400">暂无核心词</span>;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {top.map((w, i) => (
        <span
          key={`${w}-${i}`}
          className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white shadow-sm"
          style={{ backgroundColor: KW_COLORS[i % KW_COLORS.length] }}
        >
          {w}
        </span>
      ))}
    </div>
  );
}

const BusinessEventCard: React.FC<Props> = ({ item, onOpenModule }) => {
  const d = (item.data || {}) as Record<string, unknown>;
  const kind = item.kind;

  switch (kind) {
    case 'brand_linked':
      return (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
            <Link2 className="w-3.5 h-3.5" />
            品牌已关联
          </div>
          <div className="text-[10px] text-emerald-700 mt-1 font-mono">{String(d.brandId ?? d.brand_id ?? '')}</div>
        </div>
      );
    case 'intake_complete':
      return (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            采集完成
          </div>
          <div className="text-[10px] text-emerald-700 mt-1">
            {String(d.brandName ?? d.message ?? '')}
          </div>
        </div>
      );
    case 'cycle_acked':
      return (
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            周期已确认
          </div>
          <div className="text-[10px] text-blue-700 mt-1">{String(d.message ?? d.nextPhase ?? '')}</div>
        </div>
      );
    case 'diagnosis_running':
      return (
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-2.5 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
          <div className="text-[11px] text-amber-900">诊断运行中… {String(d.message ?? '')}</div>
        </div>
      );
    case 'diagnosis_done': {
      const rid = d.diagnosisReportId ?? d.diagnosis_report_id;
      return (
        <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5 shadow-sm">
          <div className="text-[11px] font-semibold text-gray-900 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E8553F]" />
            诊断完成
          </div>
          {rid != null && (
            <button
              type="button"
              className="mt-2 text-[10px] text-[#E8553F] underline"
              onClick={() =>
                onOpenModule?.(ModuleType.DIAGNOSIS_REPORT, { reportId: Number(rid) })
              }
            >
              查看报告 #{String(rid)}
            </button>
          )}
        </div>
      );
    }
    case 'extraction_done':
      return (
        <div className="rounded-xl border border-[#FFE4D6] bg-gradient-to-br from-[#FFF8F4] to-white px-3 py-2.5 shadow-sm">
          <div className="text-[11px] font-semibold text-gray-900">词包抽取完成</div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            任务 {String(d.extractionTaskId ?? '')}
          </div>
          <CoreKeywordChips words={d.coreKeywords} />
        </div>
      );
    case 'core_keywords_updated':
      return (
        <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5">
          <div className="text-[11px] font-medium text-gray-800">核心词已更新</div>
          <CoreKeywordChips words={d.coreKeywords} />
        </div>
      );
    case 'workflow_completed':
      return (
        <div className="rounded-xl border border-green-100 bg-green-50/40 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-green-800">
            <Flag className="w-3.5 h-3.5" />
            工作流已完成
          </div>
        </div>
      );
    case 'acceptance_verdict': {
      if (String(d.verdict ?? '').toLowerCase() === 'passed') {
        return null;
      }
      return (
        <div className="rounded-xl border border-violet-100 bg-violet-50/40 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-900">
            <ClipboardCheck className="w-3.5 h-3.5" />
            验收：{String(d.verdict ?? '')}
          </div>
          {d.reason && <div className="text-[10px] text-violet-800 mt-1">{String(d.reason)}</div>}
        </div>
      );
    }
    case 'dedup_conflict':
      return (
        <div className="rounded-xl border border-red-100 bg-red-50/50 px-3 py-2.5">
          <div className="text-[11px] font-semibold text-red-800">品牌名冲突</div>
          <div className="text-[10px] text-red-700 mt-1">请从候选中确认或修改后重试。</div>
        </div>
      );
    case 'document_card': {
      const deep = d.deepLink as DocumentDeepLink | undefined;
      const title = String(d.title ?? '文档');
      const dk = String(d.docKind ?? '');
      return (
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px]">
          <div className="font-medium">{title}</div>
          {deep && onOpenModule && (
            <button
              type="button"
              className="mt-1 text-[10px] text-[#E8553F]"
              onClick={() => {
                if (deep.module === 'DIAGNOSIS_REPORT')
                  onOpenModule(ModuleType.DIAGNOSIS_REPORT, {
                    reportId: deep.reportId,
                    workflowId: deep.workflowId,
                  });
                else if (deep.module === 'OPTIMIZATION_BOT')
                  onOpenModule(ModuleType.OPTIMIZATION_BOT, {
                    taskId: deep.taskId,
                    workflowId: deep.workflowId,
                  });
              }}
            >
              打开
            </button>
          )}
        </div>
      );
    }
    default:
      return <GenericEventCard item={item} />;
  }
};

export default BusinessEventCard;
