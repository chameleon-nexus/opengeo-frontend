/**
 * 诊断流 hook：复用「快速开始」keywords→done phase 的 API 链路
 *
 * 调用顺序（与 BrandParseWizard.handleRunDiagnosis 一致）：
 *   1. geoWorkflowAPI.advance(workflowId, {set_diagnosis_running:true, ai_platforms})
 *   2. analyzeBrandDiagnosisSession({...}) 内部已 poll celery 完成
 *   3. geoWorkflowAPI.advance(workflowId, {diagnosis_report_id, baseline_visibility})
 */
import { useCallback, useState } from 'react';
import {
  analyzeBrandDiagnosisSession,
  type BrandDiagnosisAnalyzeSessionResult,
} from '../../../api/brandDiagnosisSession';
import { geoWorkflowAPI, type GeoWorkflowDTO, type GeoWorkflowQuestionIntent } from '../../../api/geoWorkflow';
import { GEO_QUESTION_INTENT } from '../types';

export type DiagnosisFlowStatus =
  | 'idle'
  | 'starting'
  | 'analyzing'
  | 'advancing'
  | 'done'
  | 'error';

export interface DiagnosisFlowResult {
  workflow: GeoWorkflowDTO;
  reportId: number;
  reportTaskId: string;
  baselineVisibility: number | null;
  raw: BrandDiagnosisAnalyzeSessionResult;
}

export interface RunDiagnosisParams {
  workflowId: string;
  brandName: string;
  industry?: string;
  brandIntroduction?: string;
  coreKeywords: string[];
  aiPlatforms: string[];
  productName?: string;
  questionIntent?: GeoWorkflowQuestionIntent;
}

interface ApiState {
  status: DiagnosisFlowStatus;
  statusHint: string;
  result: DiagnosisFlowResult | null;
  error: string | null;
}

function parseVisibilityNum(v: unknown): number | null {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/%/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function logDiagnosis(step: string, detail: Record<string, unknown>) {
  console.info('[DiagnosisFlow]', step, detail);
}

export function useDiagnosisFlow() {
  const [state, setState] = useState<ApiState>({
    status: 'idle',
    statusHint: '',
    result: null,
    error: null,
  });

  const run = useCallback(async (params: RunDiagnosisParams): Promise<DiagnosisFlowResult> => {
    const name = params.brandName.trim();
    const kws = params.coreKeywords.map((s) => s.trim()).filter(Boolean);
    if (!name || kws.length === 0) {
      const e = new Error('缺少品牌名或核心词');
      logDiagnosis('validate_failed', { workflowId: params.workflowId, reason: e.message });
      setState({ status: 'error', statusHint: '', result: null, error: e.message });
      throw e;
    }
    if (!params.workflowId) {
      const e = new Error('Workflow 未初始化');
      logDiagnosis('validate_failed', { reason: e.message });
      setState({ status: 'error', statusHint: '', result: null, error: e.message });
      throw e;
    }

    logDiagnosis('run_start', {
      workflowId: params.workflowId,
      brandName: name,
      coreKeywords: kws,
      aiPlatforms: params.aiPlatforms,
    });

    setState({
      status: 'starting',
      statusHint: '正在标记诊断进行中…',
      result: null,
      error: null,
    });

    try {
      try {
        logDiagnosis('step1_advance_running', { workflowId: params.workflowId });
        await geoWorkflowAPI.advance(params.workflowId, {
          set_diagnosis_running: true,
          ai_platforms: params.aiPlatforms,
        });
        logDiagnosis('step1_advance_running_ok', { workflowId: params.workflowId });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        logDiagnosis('step1_advance_running_skipped', {
          workflowId: params.workflowId,
          error: msg,
          hint: 'phase 非 pending 时会忽略（若已 running 属正常）',
        });
      }

      setState((prev) => ({
        ...prev,
        status: 'analyzing',
        statusHint: '正在生成 GEO 诊断报告',
      }));

      logDiagnosis('step2_analyze_session_start', {
        workflowId: params.workflowId,
        aiPlatforms: params.aiPlatforms,
      });
      const data = await analyzeBrandDiagnosisSession({
        brand_name: name,
        industry: params.industry,
        brand_introduction: params.brandIntroduction || undefined,
        core_keywords: kws,
        ai_platforms: params.aiPlatforms,
        product_name: params.productName?.trim() || undefined,
        question_intent: params.questionIntent ?? GEO_QUESTION_INTENT,
        geo_workflow_id: params.workflowId,
      });
      logDiagnosis('step2_analyze_session_ok', {
        workflowId: params.workflowId,
        reportId: data.id,
        taskId: data.taskId ?? data.batchId,
      });

      const tid = (data.taskId as string) || (data.batchId as string);
      if (!tid) throw new Error('诊断成功但未返回 taskId');
      if (data.id == null) throw new Error('诊断成功但未返回报告 id');

      const visibility =
        parseVisibilityNum((data as Record<string, unknown>).visibility) ??
        parseVisibilityNum(
          ((data as Record<string, unknown>).indicatorData as Record<string, unknown> | undefined)
            ?.visibility
        );

      setState((prev) => ({
        ...prev,
        status: 'advancing',
        statusHint: '诊断报告已生成，正在写回工作流…',
      }));

      logDiagnosis('step3_advance_report_start', {
        workflowId: params.workflowId,
        diagnosisReportId: Number(data.id),
        baselineVisibility: visibility,
      });
      const wf = await geoWorkflowAPI.advance(params.workflowId, {
        diagnosis_report_id: Number(data.id),
        baseline_visibility: visibility,
      });
      logDiagnosis('step3_advance_report_ok', {
        workflowId: params.workflowId,
        phase: wf.phase,
        phaseStatus: wf.phaseStatus,
        diagnosisReportId: wf.diagnosisReportId,
      });

      const result: DiagnosisFlowResult = {
        workflow: wf,
        reportId: Number(data.id),
        reportTaskId: tid,
        baselineVisibility: visibility,
        raw: data,
      };
      setState({ status: 'done', statusHint: '', result, error: null });
      return result;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[DiagnosisFlow] run_failed', {
        workflowId: params.workflowId,
        error: msg,
      });
      setState({ status: 'error', statusHint: '', result: null, error: msg });
      throw e instanceof Error ? e : new Error(msg);
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', statusHint: '', result: null, error: null });
  }, []);

  return {
    ...state,
    run,
    reset,
  };
}
