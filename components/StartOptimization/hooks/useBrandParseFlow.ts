/**
 * 品牌解析流 hook：复用「快速开始」form phase 全部 API 链路
 *
 * 调用顺序（与 BrandParseWizard.handleStart 完全一致）：
 *   1. brandParseAPI.start({brandName, files, enableKnowledgeGraph, geoWorkflowId, onUploadProgress?})
 *      → seoTaskId / kbId
 *   2. （若开了知识图谱）轮询 semanticSEOAPI.getTask(seoTaskId) 直至完成（间隔见 BRAND_PARSE_POLL_MS）
 *   3. brandParseAPI.finalize({...})
 *      → 同步返回完整结果，或异步返回 celery_task_id
 *   4. brandParseAPI.pollFinalizeUntilDone(celery_task_id) 直至完成
 *   5. geoWorkflowAPI.advance(workflowId, {extraction_task_id, core_keywords, persist_word_pack_only:true})
 *      → 仅写词包，不推进 phase（由解析品牌页按钮决定下一步）
 *
 * 卸载组件不会中止 finalize/persist；关闭浏览器标签则 JS 停止，需依赖 workflow 上 semanticSeoTaskId 再次进入时 resume。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { BRAND_PARSE_MAX_POLLS, BRAND_PARSE_POLL_MS } from '../../../constants/brandParsePolling';
import { brandParseAPI, isBrandParseFinalizeAsync } from '../../../api/brandParse';
import { semanticSEOAPI } from '../../../api/semanticSeo';
import { geoWorkflowAPI, type GeoWorkflowDTO, type GeoWorkflowQuestionIntent } from '../../../api/geoWorkflow';
import { GEO_QUESTION_INTENT, type GeoCoreKeywordGroup } from '../types';
import {
  normalizeCoreKeywordGroups,
  INFER_CORE_KEYWORD_MAX,
  readDiagnosisRegionWords,
} from '../../../utils/coreKeywordGroups';
import {
  pickSubjectCategoriesForPersist,
  pickSubjectCategoryForPersist,
} from '../../../utils/resolveUserSubjectCategory';

/** @deprecated 请优先使用 constants/brandParsePolling；保留别名避免外部引用断裂 */
export const POLL_MS = BRAND_PARSE_POLL_MS;
export const MAX_POLLS = BRAND_PARSE_MAX_POLLS;

const ABORT_POLL_MSG = '__BRAND_PARSE_POLL_ABORT__';

export type BrandParseFlowStatus =
  | 'idle'
  | 'starting'
  | 'polling_seo'
  | 'finalizing'
  | 'advancing'
  | 'done'
  | 'error';

export interface BrandParseFlowResult {
  workflow: GeoWorkflowDTO;
  knowledgeBaseId: number | null;
  semanticSeoTaskId: string | null;
  extractionTaskId: string;
  coreKeywords: string[];
  coreKeywordGroups: GeoCoreKeywordGroup[];
  keywordsAll: string[];
  /** 实际是否走了知识图谱增强（取决于 start 返回的 semantic_seo_task_id） */
  usedKnowledgeGraph: boolean;
}

export interface RunBrandParseParams {
  /** 已经创建好的 workflow（必须先 create） */
  workflowId: string;
  brandName: string;
  files?: File[];
  enableKnowledgeGraph: boolean;
  /** finalize → parse-brand：行业弱提示（用户本次填写） */
  industry?: string | null;
  workflowSubjectCategory?: string | null;
  productName?: string | null;
  questionIntent?: GeoWorkflowQuestionIntent;
  /** 已有 KB 时跳过 start，仅轮询语义任务 */
  existingKnowledgeBaseId?: number | null;
  existingSemanticSeoTaskId?: string | null;
}

/** 跳过 start，依据 GEO workflow 已持久化的 kb / 语义任务继续轮询与 finalize（离开页面后再进入） */
export interface ResumeBrandParseParams {
  workflowId: string;
  brandName: string;
  semanticSeoTaskId: string | null;
  knowledgeBaseId: number | null;
  industry?: string | null;
  workflowSubjectCategory?: string | null;
  productName?: string | null;
  questionIntent?: GeoWorkflowQuestionIntent;
}

interface ApiState {
  status: BrandParseFlowStatus;
  statusHint: string;
  result: BrandParseFlowResult | null;
  error: string | null;
}

function normalizeSeoTaskStatus(raw: string | undefined): string {
  return (raw ?? '').trim().toLowerCase();
}
function isSeoTaskSuccess(st: string): boolean {
  return ['completed', 'complete', 'done', 'success'].includes(st);
}
function isSeoTaskFailed(st: string): boolean {
  return ['failed', 'fail', 'error', 'cancelled', 'canceled'].includes(st);
}
function getKnowledgeGraphStatusLabel(raw: string | undefined): string {
  const s = normalizeSeoTaskStatus(raw);
  switch (s) {
    case 'pending':
      return '知识图谱任务排队中，即将开始生成';
    case 'processing':
    case 'running':
      return '正在生成知识图谱（联网检索、实体关系与共现词）';
    case 'completed':
    case 'complete':
    case 'done':
    case 'success':
      return '知识图谱已生成完成';
    case 'failed':
    case 'fail':
    case 'error':
      return '知识图谱生成失败';
    default:
      if (!s) return '知识图谱生成中';
      return `知识图谱处理中（状态：${(raw ?? '').trim() || s}）`;
  }
}

export function useBrandParseFlow() {
  const [state, setState] = useState<ApiState>({
    status: 'idle',
    statusHint: '',
    result: null,
    error: null,
  });
  const abortRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    abortRef.current = false;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const patchIfMounted = useCallback((patch: Partial<ApiState> | ((prev: ApiState) => ApiState)) => {
    if (!mountedRef.current) return;
    setState((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }));
  }, []);

  const setHintSafe = useCallback(
    (statusHint: string) => {
      patchIfMounted((prev) => ({ ...prev, statusHint }));
    },
    [patchIfMounted]
  );

  const pollSeoUntilDone = useCallback(
    async (taskId: string) => {
      const pollSec = BRAND_PARSE_POLL_MS / 1000;
      for (let i = 0; i < BRAND_PARSE_MAX_POLLS; i++) {
        if (abortRef.current) {
          throw new Error(ABORT_POLL_MSG);
        }
        const detail = await semanticSEOAPI.getTask(taskId);
        const st = normalizeSeoTaskStatus(detail?.task?.status);
        const kgLine = getKnowledgeGraphStatusLabel(detail?.task?.status);
        const longWait = i >= 15;
        setHintSafe(
          longWait
            ? `${kgLine} · 已等待较久，若进度不变请确认后台已启动 Celery 并处理知识图谱任务`
            : `${kgLine} · 第 ${i + 1} 次进度检查（约每 ${pollSec} 秒刷新）`
        );
        if (isSeoTaskSuccess(st)) return;
        if (isSeoTaskFailed(st)) {
          throw new Error('知识图谱生成失败，请稍后重试或联系管理员');
        }
        await new Promise((r) => setTimeout(r, BRAND_PARSE_POLL_MS));
      }
      throw new Error('知识图谱生成超时，请稍后在侧栏「知识图谱」中查看任务状态');
    },
    [setHintSafe]
  );

  const finalizeAndPersist = useCallback(
    async (
      workflowId: string,
      name: string,
      semantic_seo_task_id: string | null,
      knowledge_base_id: number | null,
      finCtx?: {
        industry?: string | null;
        /** 工作流在第一步已写入的 subject_category（防止被 LLM 覆盖） */
        workflowSubjectCategory?: string | null;
        productName?: string | null;
        questionIntent?: GeoWorkflowQuestionIntent;
      }
    ): Promise<BrandParseFlowResult> => {
      patchIfMounted((prev) => ({
        ...prev,
        status: 'finalizing',
        statusHint: semantic_seo_task_id
          ? '知识图谱已完成，正在根据共现词生成词包…'
          : '已提交词包任务（后台 Celery），正在联网解析品牌与核心词…',
      }));

      const finRaw = await brandParseAPI.finalize({
        semantic_seo_task_id,
        knowledge_base_id,
        brand_name: name,
        core_keyword_max: 20,
        industry: finCtx?.industry?.trim() || undefined,
        product_name: finCtx?.productName?.trim() || undefined,
        question_intent: finCtx?.questionIntent ?? GEO_QUESTION_INTENT,
      });
      const fin = isBrandParseFinalizeAsync(finRaw)
        ? await brandParseAPI.pollFinalizeUntilDone(finRaw.celery_task_id, {
            pollMs: BRAND_PARSE_POLL_MS,
            maxPolls: BRAND_PARSE_MAX_POLLS,
          })
        : finRaw;

      const sys = (fin.core_keywords || []).map((t) => String(t).trim()).filter(Boolean);
      const industryHint = finCtx?.industry?.trim() || finCtx?.workflowSubjectCategory?.trim() || fin.subject_category;
      const groupsFromFin = fin.core_keyword_groups?.length
        ? normalizeCoreKeywordGroups(fin.core_keyword_groups)
        : normalizeCoreKeywordGroups(sys, industryHint);

      patchIfMounted((prev) => ({
        ...prev,
        status: 'advancing',
        statusHint: '词包就绪，正在写回工作流…',
      }));

      const subjectCategoriesToPersist = pickSubjectCategoriesForPersist({
        userInputs: finCtx?.industry ? [finCtx.industry] : undefined,
        workflowSubjects: finCtx?.workflowSubjectCategory
          ? [finCtx.workflowSubjectCategory]
          : undefined,
        llmSubject: fin.subject_category,
      });
      const subjectCategoryToPersist = pickSubjectCategoryForPersist({
        userInput: finCtx?.industry,
        workflowSubject: finCtx?.workflowSubjectCategory,
        llmSubject: fin.subject_category,
      });
      const wfBefore = await geoWorkflowAPI.get(workflowId);
      const existingRegions = readDiagnosisRegionWords(wfBefore);
      const wf = await geoWorkflowAPI.advance(workflowId, {
        extraction_task_id: fin.extraction_task_id,
        core_keyword_groups: groupsFromFin,
        core_keywords: sys,
        knowledge_base_id: knowledge_base_id ?? undefined,
        semantic_seo_task_id: semantic_seo_task_id ?? undefined,
        ...(subjectCategoriesToPersist.length
          ? { subject_categories: subjectCategoriesToPersist }
          : {}),
        ...(subjectCategoryToPersist ? { subject_category: subjectCategoryToPersist } : {}),
        ...(existingRegions.length ? { region_words: existingRegions } : {}),
        persist_word_pack_only: true,
      });

      const result: BrandParseFlowResult = {
        workflow: wf,
        knowledgeBaseId: knowledge_base_id ?? null,
        semanticSeoTaskId: semantic_seo_task_id ?? null,
        extractionTaskId: fin.extraction_task_id,
        coreKeywords: sys,
        coreKeywordGroups: groupsFromFin,
        keywordsAll: fin.keywords_all || [],
        usedKnowledgeGraph: !!semantic_seo_task_id,
      };

      patchIfMounted({
        status: 'done',
        statusHint: '',
        result,
        error: null,
      });
      return result;
    },
    [patchIfMounted]
  );

  const run = useCallback(
    async (params: RunBrandParseParams): Promise<BrandParseFlowResult> => {
      const name = params.brandName.trim();
      if (!name) {
        const e = new Error('品牌名不能为空');
        patchIfMounted({ status: 'error', statusHint: '', result: null, error: e.message });
        throw e;
      }
      if (!params.workflowId) {
        const e = new Error('Workflow 未初始化');
        patchIfMounted({ status: 'error', statusHint: '', result: null, error: e.message });
        throw e;
      }

      const willUploadFiles = (params.files?.length ?? 0) > 0;
      patchIfMounted({
        status: 'starting',
        statusHint: willUploadFiles
          ? '正在上传材料…'
          : params.enableKnowledgeGraph
            ? '正在创建知识库并启动知识图谱生成…'
            : '正在准备词包…',
        result: null,
        error: null,
      });

      try {
        const start = await brandParseAPI.start({
          brandName: name,
          files: params.files?.length ? params.files : undefined,
          enableKnowledgeGraph: params.enableKnowledgeGraph,
          geoWorkflowId: params.workflowId,
          ...(willUploadFiles
            ? {
                onUploadProgress: (pct: number | null) => {
                  setHintSafe(pct === null ? '正在上传材料…' : `正在上传材料 ${pct}%`);
                },
              }
            : {}),
        });

        if (start.semantic_seo_task_id) {
          patchIfMounted((prev) => ({
            ...prev,
            status: 'polling_seo',
            statusHint: '知识图谱任务已提交，正在生成中（联网检索 → 实体关系 → 共现词）…',
          }));
          await pollSeoUntilDone(start.semantic_seo_task_id);
        }

        return await finalizeAndPersist(
          params.workflowId,
          name,
          start.semantic_seo_task_id,
          start.knowledge_base_id ?? null,
          {
            industry: params.industry,
            workflowSubjectCategory: params.workflowSubjectCategory,
            productName: params.productName,
            questionIntent: params.questionIntent,
          }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === ABORT_POLL_MSG) {
          patchIfMounted({ status: 'idle', statusHint: '', result: null, error: null });
          throw e;
        }
        patchIfMounted({ status: 'error', statusHint: '', result: null, error: msg });
        throw e instanceof Error ? e : new Error(msg);
      }
    },
    [pollSeoUntilDone, finalizeAndPersist, patchIfMounted, setHintSafe]
  );

  const inferSubjectCategories = useCallback(
    async (params: {
      workflowId: string;
      brandName: string;
      knowledgeBaseId?: number | null;
      productName?: string | null;
      questionIntent?: GeoWorkflowQuestionIntent;
    }): Promise<string[]> => {
      patchIfMounted((prev) => ({
        ...prev,
        status: 'finalizing',
        statusHint: '正在 AI 分析行业…',
        result: null,
        error: null,
      }));
      const data = await brandParseAPI.inferSubjectCategories({
        workflow_id: params.workflowId,
        brand_name: params.brandName,
        knowledge_base_id: params.knowledgeBaseId ?? undefined,
        product_name: params.productName?.trim() || undefined,
        question_intent: params.questionIntent ?? GEO_QUESTION_INTENT,
      });
      return (data.subject_categories || []).map((x) => String(x).trim()).filter(Boolean);
    },
    [patchIfMounted]
  );

  const parseKeywordsBatch = useCallback(
    async (params: {
      workflowId: string;
      brandName: string;
      industries: string[];
      knowledgeBaseId?: number | null;
      productName?: string | null;
      questionIntent?: GeoWorkflowQuestionIntent;
      /** AI 推断行业时为 true，核心词上限 10 */
      inferCategoriesByAi?: boolean;
    }): Promise<BrandParseFlowResult> => {
      const industries = params.industries.map((x) => x.trim()).filter(Boolean);
      if (!industries.length) {
        throw new Error('至少需要一个行业');
      }
      patchIfMounted((prev) => ({
        ...prev,
        status: 'finalizing',
        statusHint: `正在按行业解析核心词（${industries.length} 个行业）…`,
        result: null,
        error: null,
      }));

      const data = await brandParseAPI.parseKeywordsBatch({
        workflow_id: params.workflowId,
        brand_name: params.brandName,
        industries,
        knowledge_base_id: params.knowledgeBaseId ?? undefined,
        product_name: params.productName?.trim() || undefined,
        question_intent: params.questionIntent ?? GEO_QUESTION_INTENT,
        core_keyword_max: params.inferCategoriesByAi ? INFER_CORE_KEYWORD_MAX : undefined,
      });

      const groupsFromBatch = normalizeCoreKeywordGroups(data.core_keyword_groups || []);
      const sys = (data.core_keywords || []).map((t) => String(t).trim()).filter(Boolean);

      patchIfMounted((prev) => ({
        ...prev,
        status: 'advancing',
        statusHint: '词包就绪，正在写回工作流…',
      }));

      const wf =
        data.workflow ??
        (await geoWorkflowAPI.get(params.workflowId));

      const result: BrandParseFlowResult = {
        workflow: wf,
        knowledgeBaseId: params.knowledgeBaseId ?? wf.knowledgeBaseId ?? null,
        semanticSeoTaskId: wf.semanticSeoTaskId ?? null,
        extractionTaskId: data.extraction_task_id,
        coreKeywords: sys,
        coreKeywordGroups: groupsFromBatch,
        keywordsAll: sys,
        usedKnowledgeGraph: Boolean(wf.semanticSeoTaskId),
      };

      patchIfMounted({
        status: 'done',
        statusHint: '',
        result,
        error: null,
      });
      return result;
    },
    [patchIfMounted]
  );

  const pollSemanticSeo = useCallback(
    async (semanticSeoTaskId: string | null | undefined) => {
      const id = semanticSeoTaskId?.trim();
      if (!id) return;
      patchIfMounted((prev) => ({
        ...prev,
        status: 'polling_seo',
        statusHint: '知识图谱任务进行中，请稍候…',
      }));
      await pollSeoUntilDone(id);
    },
    [patchIfMounted, pollSeoUntilDone]
  );

  const ensureKnowledgeBaseReady = useCallback(
    async (params: RunBrandParseParams): Promise<{
      knowledgeBaseId: number | null;
      semanticSeoTaskId: string | null;
    }> => {
      const name = params.brandName.trim();
      if (params.existingKnowledgeBaseId != null) {
        if (params.existingSemanticSeoTaskId?.trim()) {
          await pollSemanticSeo(params.existingSemanticSeoTaskId);
        }
        return {
          knowledgeBaseId: params.existingKnowledgeBaseId,
          semanticSeoTaskId: params.existingSemanticSeoTaskId ?? null,
        };
      }
      const willUploadFiles = (params.files?.length ?? 0) > 0;
      if (!willUploadFiles && !params.enableKnowledgeGraph) {
        return { knowledgeBaseId: null, semanticSeoTaskId: null };
      }
      patchIfMounted((prev) => ({
        ...prev,
        status: 'starting',
        statusHint: willUploadFiles
          ? '正在上传材料…'
          : '正在创建知识库并启动知识图谱生成…',
      }));
      const start = await brandParseAPI.start({
        brandName: name,
        files: params.files?.length ? params.files : undefined,
        enableKnowledgeGraph: params.enableKnowledgeGraph,
        geoWorkflowId: params.workflowId,
      });
      if (start.semantic_seo_task_id) {
        patchIfMounted((prev) => ({
          ...prev,
          status: 'polling_seo',
          statusHint: '知识图谱任务已提交，正在生成中…',
        }));
        await pollSeoUntilDone(start.semantic_seo_task_id);
      }
      return {
        knowledgeBaseId: start.knowledge_base_id ?? null,
        semanticSeoTaskId: start.semantic_seo_task_id ?? null,
      };
    },
    [patchIfMounted, pollSeoUntilDone, pollSemanticSeo]
  );

  const runFullWordPackPipeline = useCallback(
    async (
      params: RunBrandParseParams & {
        inferCategoriesByAi?: boolean;
        industries?: string[];
      }
    ): Promise<BrandParseFlowResult> => {
      const kb = await ensureKnowledgeBaseReady(params);
      let industries = (params.industries || [])
        .map((x) => x.trim())
        .filter(Boolean);

      if (params.inferCategoriesByAi && industries.length === 0) {
        if (kb.knowledgeBaseId == null) {
          throw new Error('AI 分析行业须先创建知识库：请上传材料或开启知识图谱增强');
        }
        industries = await inferSubjectCategories({
          workflowId: params.workflowId,
          brandName: params.brandName,
          knowledgeBaseId: kb.knowledgeBaseId,
          productName: params.productName,
          questionIntent: params.questionIntent,
        });
      }

      if (!industries.length) {
        const hint = params.industry?.trim() || params.workflowSubjectCategory?.trim();
        if (hint) industries = [hint];
      }

      if (!industries.length) {
        throw new Error('缺少行业信息，无法解析词包');
      }

      return parseKeywordsBatch({
        workflowId: params.workflowId,
        brandName: params.brandName,
        industries,
        knowledgeBaseId: kb.knowledgeBaseId,
        productName: params.productName,
        questionIntent: params.questionIntent,
        inferCategoriesByAi: params.inferCategoriesByAi,
      });
    },
    [ensureKnowledgeBaseReady, inferSubjectCategories, parseKeywordsBatch]
  );

  const resumeFromWorkflow = useCallback(
    async (params: ResumeBrandParseParams): Promise<BrandParseFlowResult> => {
      const name = params.brandName.trim();
      if (!name) {
        const e = new Error('品牌名不能为空');
        patchIfMounted({ status: 'error', statusHint: '', result: null, error: e.message });
        throw e;
      }
      if (!params.workflowId) {
        const e = new Error('Workflow 未初始化');
        patchIfMounted({ status: 'error', statusHint: '', result: null, error: e.message });
        throw e;
      }

      const seoId = params.semanticSeoTaskId?.trim() || null;
      patchIfMounted({
        status: seoId ? 'polling_seo' : 'finalizing',
        statusHint: seoId
          ? '恢复进度：等待知识图谱任务完成（可在其它页面稍后再回来）…'
          : '恢复进度：正在生成词包…',
        result: null,
        error: null,
      });

      try {
        if (seoId) {
          await pollSeoUntilDone(seoId);
        }
        return await finalizeAndPersist(
          params.workflowId,
          name,
          seoId,
          params.knowledgeBaseId ?? null,
          {
            industry: params.industry,
            workflowSubjectCategory: params.workflowSubjectCategory,
            productName: params.productName,
            questionIntent: params.questionIntent,
          }
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === ABORT_POLL_MSG) {
          patchIfMounted({ status: 'idle', statusHint: '', result: null, error: null });
          throw e;
        }
        patchIfMounted({ status: 'error', statusHint: '', result: null, error: msg });
        throw e instanceof Error ? e : new Error(msg);
      }
    },
    [pollSeoUntilDone, finalizeAndPersist, patchIfMounted]
  );

  const reset = useCallback(() => {
    abortRef.current = false;
    setState({ status: 'idle', statusHint: '', result: null, error: null });
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return {
    ...state,
    run,
    resumeFromWorkflow,
    inferSubjectCategories,
    parseKeywordsBatch,
    ensureKnowledgeBaseReady,
    pollSemanticSeo,
    runFullWordPackPipeline,
    reset,
    abort,
  };
}
