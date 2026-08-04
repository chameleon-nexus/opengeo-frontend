/**
 * GEO 优化主线：与「快速开始」列表/流程条共用的常量与纯函数
 */

import type { GeoWorkflowDTO, GeoWorkflowPhase } from '../api/geoWorkflow';
import i18n from '../i18n/config';

/** 4 格「优化主线」条：与历史快速开始 UI 一致；与后端 5 值业务 phase（及旧别称）用 phaseToPipelineStep 映射 */
export const PHASE_LABEL: Record<string, string> = {
  brand_input: '新建优化',
  cycle_selection: '新建优化',
  brand_parse: '解析品牌',
  report_generation: '现状分析',
  intelligent_optimization: '智能优化中',
  completion: '结束',
  brand_analysis: '解析品牌',
  diagnosis: '现状分析',
  monitoring: '智能优化中',
  completed: '结束',
};

const PHASE_I18N_KEYS: Record<string, string> = {
  brand_input: 'workflowPhases.brandInput',
  cycle_selection: 'workflowPhases.brandInput',
  brand_parse: 'workflowPhases.brandParse',
  brand_analysis: 'workflowPhases.brandParse',
  report_generation: 'workflowPhases.reportGeneration',
  diagnosis: 'workflowPhases.reportGeneration',
  intelligent_optimization: 'workflowPhases.intelligentOptimization',
  monitoring: 'workflowPhases.intelligentOptimization',
  completion: 'workflowPhases.completion',
  completed: 'workflowPhases.completion',
};

export function translateWorkflowPhase(phase: string): string {
  const p = String(phase || '').toLowerCase();
  const i18nKey = PHASE_I18N_KEYS[p];
  if (i18nKey) {
    return i18n.t(i18nKey, { ns: 'optimization', defaultValue: PHASE_LABEL[p] ?? p });
  }
  return PHASE_LABEL[p] ?? p;
}

/** 流程条 4 步对应的旧别称 key（与 rewind 目标一致） */
export type PipelineLegacyPhaseKey = 'brand_analysis' | 'diagnosis' | 'monitoring' | 'completed';

const PIPELINE_STEP_I18N_KEYS: Record<PipelineLegacyPhaseKey, string> = {
  brand_analysis: 'workflowPhases.brandParse',
  diagnosis: 'workflowPhases.reportGeneration',
  monitoring: 'workflowPhases.intelligentOptimization',
  completed: 'workflowPhases.completion',
};

export const PIPELINE_STEPS: { key: PipelineLegacyPhaseKey; label: string }[] = [
  { key: 'brand_analysis', label: '解析品牌' },
  { key: 'diagnosis', label: '现状分析' },
  { key: 'monitoring', label: '智能优化中' },
  { key: 'completed', label: '结束' },
];

export function getPipelineStepLabel(key: PipelineLegacyPhaseKey): string {
  const i18nKey = PIPELINE_STEP_I18N_KEYS[key];
  const fallback = PIPELINE_STEPS.find((s) => s.key === key)?.label ?? key;
  return i18n.t(i18nKey, { ns: 'optimization', defaultValue: fallback });
}

/** 后端 5 值业务 phase / 旧 4 值别称 → 流程条 0..3（仅依据 phase 字符串） */
export function phaseToPipelineStep(phase: GeoWorkflowPhase | string | undefined): number {
  const p = String(phase || '').toLowerCase();
  if (['brand_input', 'cycle_selection', 'brand_parse', 'brand_analysis'].includes(p)) {
    return 0;
  }
  if (p === 'report_generation' || p === 'diagnosis') {
    return 1;
  }
  if (p === 'intelligent_optimization' || p === 'monitoring') {
    return 2;
  }
  if (p === 'completion' || p === 'completed') {
    return 3;
  }
  return 0;
}

/** 基线诊断已写入工作流（与后端 advance 关联 diagnosis_report_id + phase_status=done 一致） */
export function isGeoBaselineReportCommitted(wf: GeoWorkflowDTO): boolean {
  const p = String(wf.phase || '').toLowerCase();
  if (p !== 'report_generation' && p !== 'diagnosis') {
    return false;
  }
  if ((wf.cycleMode || 'full') === 'half') {
    return true;
  }
  const st = String(wf.phaseStatus || '').toLowerCase();
  const id = wf.diagnosisReportId;
  const hasId = id != null && Number(id) > 0;
  return st === 'done' && hasId;
}

/** 流程条第二步「现状分析」是否已达到（成功或已过线进入后续阶段） */
export function isGeoReportGenerationStepDone(wf: GeoWorkflowDTO): boolean {
  if ((wf.cycleMode || 'full') === 'half') {
    return true;
  }
  if (isGeoBaselineReportCommitted(wf)) return true;
  const p = String(wf.phase || '').toLowerCase();
  return ['intelligent_optimization', 'monitoring', 'completion', 'completed'].includes(p);
}

/**
 * 全周期：在未成功关联基线报告前，流程条「当前步」仍视为第 0 格（解析品牌），
 * 避免词包刚完成就显示已进入「现状分析」。
 */
export function geoWorkflowToPipelineStep(wf: GeoWorkflowDTO): number {
  const p = String(wf.phase || '').toLowerCase();
  if (
    (wf.cycleMode || 'full') === 'full' &&
    (p === 'report_generation' || p === 'diagnosis') &&
    !isGeoBaselineReportCommitted(wf)
  ) {
    return 0;
  }
  return phaseToPipelineStep(wf.phase);
}

/** 列表/条带展示用：未提交基线报告时不显示「现状分析」 */
export function geoWorkflowListPhaseLabel(wf: GeoWorkflowDTO): string {
  const p = String(wf.phase || '').toLowerCase();
  if (
    (wf.cycleMode || 'full') === 'full' &&
    (p === 'report_generation' || p === 'diagnosis') &&
    !isGeoBaselineReportCommitted(wf)
  ) {
    return translateWorkflowPhase('brand_parse');
  }
  return translateWorkflowPhase(p);
}

export function artifactStepToRewindTarget(step: number): 'brand_analysis' | 'diagnosis' | 'monitoring' | null {
  if (step === 3) return 'monitoring';
  const row = PIPELINE_STEPS[step];
  if (!row || row.key === 'completed') return null;
  return row.key;
}

export function formatCompletionReason(reason: string | null | undefined): string {
  const r = (reason ?? '').trim().toLowerCase();
  switch (r) {
    case 'accepted':
      return '达标验收通过';
    case 'max_cycles':
      return '已达设定最大周期数';
    case 'expired':
      return '时间到期或周期已结束';
    case 'manual_stop':
      return '手动关闭主线';
    default:
      return reason?.trim() || '—';
  }
}

export function getPipelineNodeVisual(
  wf: GeoWorkflowDTO,
  stepIndex: number
): 'done' | 'current' | 'pending' {
  const p = (wf.phase || '') as string;
  if (p === 'completion' || p === 'completed') {
    if (stepIndex < 0 || stepIndex > 3) return 'pending';
    return 'done';
  }
  const cur = geoWorkflowToPipelineStep(wf);
  if (stepIndex < cur) return 'done';
  if (stepIndex === cur) return 'current';
  return 'pending';
}

/** 工作流最新分析报告对应的 task_id（与 CompletionStage / 后端 artifactReportTaskId 一致） */
export function getWorkflowReportTaskId(wf: GeoWorkflowDTO): string | null {
  const tid = (wf.artifactReportTaskId ?? wf.diagnosisReportTaskId)?.trim();
  return tid || null;
}

/** 智能优化工作台：主线 DTO + 优化任务详情（周期日志）合并解析报告 task_id */
export function resolveArtifactReportTaskId(
  wf: GeoWorkflowDTO,
  opt?: { artifactReportTaskId?: string | null } | null
): string | null {
  const fromOpt = (opt?.artifactReportTaskId ?? '').trim();
  if (fromOpt) return fromOpt;
  return getWorkflowReportTaskId(wf);
}
