/**
 * SaaS 引导：品牌材料解析（/api/brand-parse）
 */
import { BRAND_PARSE_MAX_POLLS, BRAND_PARSE_POLL_MS } from '../constants/brandParsePolling';
import apiClient from './client';
import type { GeoCoreKeywordGroupDTO, GeoWorkflowQuestionIntent } from './geoWorkflow';

export interface BrandParseStartResult {
  /** 未勾选图谱且无上传文件时不建知识库，为 null */
  knowledge_base_id: number | null;
  /** 未开启知识图谱增强时为 null */
  semantic_seo_task_id: string | null;
  brand_name: string;
  knowledge_graph_enabled?: boolean;
}

export interface BrandParseFinalizeResult {
  extraction_task_id: string;
  core_keywords: string[];
  keywords_all: string[];
  knowledge_base_id: number | null;
  brand_introduction: string;
  /** 主角所在品类（neutral_category / industry）；advance 时一并写回主线，撰文需要用到 */
  subject_category?: string;
  /** 按行业分组的词包（n-n-n 主线；缺省时由 core_keywords + industry 推导） */
  core_keyword_groups?: GeoCoreKeywordGroupDTO[];
}

/** finalize 未开知识图谱时先返回，需轮询 finalize-result */
export interface BrandParseFinalizeAsyncMeta {
  async: true;
  celery_task_id: string;
  knowledge_base_id: number | null;
}

export type BrandParseFinalizeResponse = BrandParseFinalizeResult | BrandParseFinalizeAsyncMeta;

export function isBrandParseFinalizeAsync(
  x: BrandParseFinalizeResponse
): x is BrandParseFinalizeAsyncMeta {
  return !!(x as BrandParseFinalizeAsyncMeta).async && !!(x as BrandParseFinalizeAsyncMeta).celery_task_id;
}

export interface InferSubjectCategoriesResult {
  subject_categories: string[];
  evidence?: Record<string, string>;
  brand_introduction?: string;
}

export interface ParseKeywordsBatchResult {
  extraction_task_id: string;
  core_keywords: string[];
  core_keyword_groups: GeoCoreKeywordGroupDTO[];
  workflow?: import('./geoWorkflow').GeoWorkflowDTO;
}

export const brandParseAPI = {
  start: async (params: {
    brandName: string;
    files?: File[];
    /** 为 true 时创建语义 SEO 下钻任务（知识图谱增强），需轮询直至完成 */
    enableKnowledgeGraph?: boolean;
    /** 可选：回写 geo_optimization_workflows 关联 */
    geoWorkflowId?: string | null;
    /** multipart 上传进度（浏览器 → 服务器 body），仅在含文件时更有意义 */
    onUploadProgress?: (percent: number | null) => void;
  }): Promise<BrandParseStartResult> => {
    const fd = new FormData();
    fd.append('brand_name', params.brandName.trim());
    fd.append('enable_knowledge_graph', params.enableKnowledgeGraph ? 'true' : 'false');
    if (params.geoWorkflowId?.trim()) {
      fd.append('geo_workflow_id', params.geoWorkflowId.trim());
    }
    for (const f of params.files || []) {
      fd.append('files', f);
    }
    return apiClient.uploadWithProgress<BrandParseStartResult>('/api/brand-parse/start', fd, {
      onProgress: params.onUploadProgress,
    });
  },

  finalize: async (body: {
    /** 未开启知识图谱时传 null，后端走与小程序相同的 parse-brand（联网核心词） */
    semantic_seo_task_id: string | null;
    /** 未建知识库时（无文件且未勾选图谱）传 null */
    knowledge_base_id: number | null;
    brand_name: string;
    /** 与 parse-brand 一致的行业弱提示 */
    industry?: string | null;
    /** 产品线/型号弱提示 */
    product_name?: string | null;
    /** recommendation（默认）| evaluation */
    question_intent?: GeoWorkflowQuestionIntent;
    core_keyword_max?: number;
  }): Promise<BrandParseFinalizeResponse> => {
    // 不传 X-Doubao-API-Key，避免 Key 设置页/localStorage 中的旧 Key 覆盖服务端 DOUBAO_API_KEY（与小程序一致用后端配置）
    return apiClient.post<BrandParseFinalizeResponse>(
      '/api/brand-parse/finalize',
      {
        semantic_seo_task_id: body.semantic_seo_task_id,
        knowledge_base_id: body.knowledge_base_id,
        brand_name: body.brand_name.trim(),
        industry: body.industry?.trim() || undefined,
        product_name: body.product_name?.trim() || undefined,
        question_intent: body.question_intent ?? 'recommendation',
        core_keyword_max: body.core_keyword_max ?? 20,
      },
      { skipDoubaoHeader: true }
    );
  },

  /** 轮询 Celery finalize（parse-brand）直至完成 */
  pollFinalizeUntilDone: async (
    celeryTaskId: string,
    opts?: { pollMs?: number; maxPolls?: number }
  ): Promise<BrandParseFinalizeResult> => {
    const pollMs = opts?.pollMs ?? BRAND_PARSE_POLL_MS;
    const maxPolls = opts?.maxPolls ?? BRAND_PARSE_MAX_POLLS;
    for (let i = 0; i < maxPolls; i++) {
      const row = await apiClient.get<BrandParseFinalizeResult & { pending?: boolean; celery_state?: string }>(
        `/api/brand-parse/finalize-result/${encodeURIComponent(celeryTaskId)}`,
        { skipDoubaoHeader: true }
      );
      if (!row.pending) {
        return row as BrandParseFinalizeResult;
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }
    throw new Error('词包生成超时，请确认 Celery 已启动或稍后重试');
  },

  inferSubjectCategories: async (body: {
    workflow_id: string;
    brand_name: string;
    product_name?: string | null;
    knowledge_base_id?: number | null;
    question_intent?: GeoWorkflowQuestionIntent;
  }): Promise<InferSubjectCategoriesResult> => {
    return apiClient.post<InferSubjectCategoriesResult>(
      '/api/brand-parse/infer-subject-categories',
      {
        workflow_id: body.workflow_id.trim(),
        brand_name: body.brand_name.trim(),
        product_name: body.product_name?.trim() || undefined,
        knowledge_base_id: body.knowledge_base_id ?? undefined,
        question_intent: body.question_intent ?? 'recommendation',
      },
      { skipDoubaoHeader: true }
    );
  },

  parseKeywordsBatch: async (body: {
    workflow_id: string;
    brand_name: string;
    industries: string[];
    product_name?: string | null;
    knowledge_base_id?: number | null;
    question_intent?: GeoWorkflowQuestionIntent;
    core_keyword_max?: number;
  }): Promise<ParseKeywordsBatchResult> => {
    return apiClient.post<ParseKeywordsBatchResult>(
      '/api/brand-parse/parse-keywords-batch',
      {
        workflow_id: body.workflow_id.trim(),
        brand_name: body.brand_name.trim(),
        industries: body.industries.map((x) => x.trim()).filter(Boolean),
        product_name: body.product_name?.trim() || undefined,
        knowledge_base_id: body.knowledge_base_id ?? undefined,
        question_intent: body.question_intent ?? 'recommendation',
        core_keyword_max: body.core_keyword_max ?? 20,
      },
      { skipDoubaoHeader: true }
    );
  },
};
