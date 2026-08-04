/**
 * 「开始优化」工作台模块本地类型与常量
 */

import type { GeoWorkflowDTO, GeoWorkflowCycleMode, GeoWorkflowQuestionIntent } from '../../api/geoWorkflow';
import { isGeoBaselineReportCommitted } from '../geoWorkflowShared';

export type { GeoCoreKeywordGroup } from '../../utils/coreKeywordGroups';
export {
  flattenCoreKeywords,
  flattenCoreKeywordsFromWorkflow,
  mergeGroupKeywords,
  normalizeCoreKeywordGroups,
  primarySubjectCategory,
  readCoreKeywordGroupsFromWorkflow,
  readDiagnosisRegionWords,
  subjectCategoriesFromGroups,
  subjectCategoriesFromWorkflow,
  keywordIndustryMap,
} from '../../utils/coreKeywordGroups';

/** 当前产品固定走「产品推荐」命题；UI 已隐藏评价取向 */
export const GEO_QUESTION_INTENT: GeoWorkflowQuestionIntent = 'recommendation';

/** 工作台 5 个阶段（业务可见） */
export type WorkbenchStage =
  | 'brand_input'        // 新建优化（合并原「周期选择」）
  | 'brand_parse'        // 解析品牌（词包）
  | 'report_generation'  // 现状分析
  | 'intelligent_optimization' // 智能优化
  | 'completion';        // 完成

export interface StageMeta {
  id: WorkbenchStage;
  label: string;
  shortLabel: string;
  description: string;
}

export const WORKBENCH_STAGES: StageMeta[] = [
  { id: 'brand_input',              label: '新建优化',     shortLabel: '新建',   description: '填写优化对象、行业词、国内/出海 AI 平台与可选知识库/知识图谱' },
  { id: 'brand_parse',              label: '解析品牌',     shortLabel: '解析',   description: '联网解析品牌生成词包（与「快速开始」同源 API）' },
  { id: 'report_generation',        label: '现状分析',     shortLabel: '现状',   description: '调用豆包联网接口生成基线诊断报告' },
  { id: 'intelligent_optimization', label: '智能优化',     shortLabel: '优化',   description: '构建智能优化任务、查看分析报告与明细' },
  { id: 'completion',               label: '完成',         shortLabel: '完成',   description: '满足条件（手动 / 过期）结束，沉淀历史报告与明细' },
];

/** 当前所选品牌（含「开始优化」拓展字段） */
export interface SelectedBrand {
  id: number;          // brands.id
  brand_id: string;    // brands.brand_id (slug)
  name: string;
  category: string;
  brand_introduction?: string | null;
  knowledge_base_id?: number | null;
}

/** 工作台进入时收集的配置（与「快速开始」第一步等价） */
export interface BrandIntakeConfig {
  brand: SelectedBrand;
  /** 与品牌分开填写：产品线/型号，供 GEO 撰文与绑定优化任务 */
  productName?: string | null;
  /** @deprecated 使用 subjectCategories */
  subjectCategory?: string | null;
  /** 行业/品类（至少 1 个；与 workflow.coreKeywordGroups 对齐） */
  subjectCategories?: string[];
  /** 为 true 时行业由解析阶段 AI 推理，intake 可不填行业 */
  subjectCategoriesInferByAi?: boolean;
  /** 词包与诊断命题语义：推荐 vs 评价 */
  questionIntent?: GeoWorkflowQuestionIntent;
  aiPlatforms: string[];
  /** 出海 AI 平台（选填；与国内至少选其一） */
  overseasPlatforms?: string[];
  enableKnowledgeGraph: boolean;
  files: File[];
}

/** 独立「优化工作台」页打开参数（由 App 持有并传入 OptimizationWorkbench） */
export interface WorkbenchOpenParams {
  workflowId: string | null;
  brand: SelectedBrand | null;
  initialStage: WorkbenchStage;
  intake: BrandIntakeConfig | null;
  /** 为 true 时停留在智能优化 Hub，不自动进入驾驶舱（如从驾驶舱返回） */
  skipAutoCockpit?: boolean;
}

export const DEFAULT_WORKBENCH_OPEN: WorkbenchOpenParams = {
  workflowId: null,
  brand: null,
  initialStage: 'brand_input',
  intake: null,
};

const WORKBENCH_IDS = new Set<string>(WORKBENCH_STAGES.map((s) => s.id));

/** 后端 5 值 phase 与历史 4 值别称 → 工作台 stage */
export function workflowPhaseToWorkbenchStage(wf: GeoWorkflowDTO): WorkbenchStage {
  const p = (wf.phase || '') as string;
  if (p === 'cycle_selection') {
    return 'brand_input';
  }
  if (WORKBENCH_IDS.has(p)) {
    if (p === 'report_generation' && (wf.cycleMode || 'full') === 'half') {
      return 'intelligent_optimization';
    }
    return p as WorkbenchStage;
  }
  const legacy: Record<string, WorkbenchStage> = {
    brand_analysis: 'brand_parse',
    diagnosis: (wf.cycleMode || 'full') === 'half' ? 'intelligent_optimization' : 'report_generation',
    monitoring: 'intelligent_optimization',
    completed: 'completion',
  };
  return legacy[p] ?? 'brand_input';
}

/**
 * 进度里程碑用：全周期下在基线报告未成功写入前，不把业务算在「现状分析」，
 * 等同于仍停留在「解析品牌」节点（与列表/流程条展示一致）。
 */
export function workflowPhaseToProgressBenchStage(wf: GeoWorkflowDTO): WorkbenchStage {
  const nav = workflowPhaseToWorkbenchStage(wf);
  if ((wf.cycleMode || 'full') === 'half') {
    return nav;
  }
  const p = String(wf.phase || '').toLowerCase();
  if (
    (p === 'report_generation' || p === 'diagnosis') &&
    !isGeoBaselineReportCommitted(wf)
  ) {
    return 'brand_parse';
  }
  return nav;
}

/**
 * 无 workflow 详情时仅用于首屏；有 workflow 时以 phase 为准。
 */
export function phaseToStage(
  workflow: GeoWorkflowDTO | null,
  hasBrand: boolean,
  cycleChosen: boolean
): WorkbenchStage {
  if (!hasBrand) return 'brand_input';
  if (!workflow) return cycleChosen ? 'brand_parse' : 'brand_input';
  return workflowPhaseToWorkbenchStage(workflow);
}

/** 可与实际 `phase` 一致：词包后进入 report_generation 也可点进「现状分析」页（未成功前阶段条不算到达该里程碑）。 */
export function maxNavigableWorkbenchIndexFromWorkflow(wf: GeoWorkflowDTO | null): number {
  if (!wf) return -1;
  const st = workflowPhaseToWorkbenchStage(wf);
  const idx = WORKBENCH_STAGES.findIndex((s) => s.id === st);
  if (idx < 0) return 0;
  return idx;
}

/**
 * 里程碑/打勾用下标上界：仅在基线诊断成功写入后才把「现状分析」计为已越过。
 */
export function maxProgressWorkbenchIndexFromWorkflow(wf: GeoWorkflowDTO | null): number {
  if (!wf) return -1;
  const st = workflowPhaseToProgressBenchStage(wf);
  const idx = WORKBENCH_STAGES.findIndex((s) => s.id === st);
  if (idx < 0) return 0;
  return idx;
}

/** @deprecated 使用 maxNavigableWorkbenchIndexFromWorkflow 或 maxProgressWorkbenchIndexFromWorkflow */
export function maxReachedWorkbenchIndexFromWorkflow(wf: GeoWorkflowDTO | null): number {
  return maxNavigableWorkbenchIndexFromWorkflow(wf);
}

export type { GeoWorkflowCycleMode, GeoWorkflowQuestionIntent };
