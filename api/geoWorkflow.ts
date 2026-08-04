/**
 * 全生命周期优化主线 API（快速开始）
 */

import apiClient, { getApiBaseUrl } from './client';
import { getAccessToken } from '../lib/authSession';
import type { OptimizationTaskDTO } from './optimizationTask';

export type WorkflowAuditPeriod =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'custom';

export interface WorkflowAuditRow {
  rank: number;
  coreWord: string;
  latestWord: string;
  platform: string;
  link: string;
  aiAnswer?: string;
  answerSummary?: string;
  brandListed?: boolean;
  brandListedLabel?: string;
  auditDate?: string;
  collectedAt?: string | null;
  diagnosisReportId?: number;
  taskId?: string | null;
  cycleNumber?: number | null;
}

export interface WorkflowAuditRowsResponse {
  rows: WorkflowAuditRow[];
  total: number;
  skip: number;
  limit: number;
  period: WorkflowAuditPeriod | string;
  dateFrom?: string | null;
  dateTo?: string | null;
  platforms: Array<{ name: string; value: number; color: string; icon: string }>;
  brandName: string;
}

export type GeoWorkflowPhase =
  | 'brand_input'
  /** 已合并入 brand_input；旧接口或迁移前数据仍可能出现 */
  | 'cycle_selection'
  | 'brand_parse'
  | 'report_generation'
  | 'intelligent_optimization'
  | 'completion'
  /** 历史 API 或旧数据 */
  | 'brand_analysis'
  | 'diagnosis'
  | 'monitoring'
  | 'completed';
export type GeoWorkflowPhaseStatus = 'pending' | 'running' | 'done' | 'failed';

/** 「开始优化」周期模式 */
export type GeoWorkflowCycleMode = 'full' | 'half';

/** 词包 / 现状分析语义取向 */
export type GeoWorkflowQuestionIntent = 'recommendation' | 'evaluation';

/** 品牌解析阶段预造的诊断问句（与后端 expanded_questions 一致） */
export interface GeoDiagnosisQuestionDTO {
  text: string;
  base_keyword?: string;
  dimension?: string;
  score?: number;
  subject_category?: string;
  region_word?: string;
}

export interface GeoCoreKeywordGroupDTO {
  industry: string;
  keywords: string[];
}

export interface GeoWorkflowDTO {
  workflowId: string;
  userId?: number;
  merchantId?: number | null;
  /** 「开始优化」可选关联 brands.id */
  brandId?: number | null;
  /** full=全周期 / half=半周期，半周期独立不依赖全周期 */
  cycleMode?: GeoWorkflowCycleMode;
  /** 在 brand_input 阶段确认周期/首屏后由 advance(cycle_acked) 置位 */
  cycleAcked?: boolean;
  brandName: string;
  /** 产品线/型号（撰文用，与品牌名称分开） */
  productName?: string | null;
  /** 主角所在品类（主行业，兼容） */
  subjectCategory?: string | null;
  /** 行业/品类列表 */
  subjectCategories?: string[] | null;
  /** 为 true 时行业由解析阶段 AI 推理，intake 可不填行业 */
  subjectCategoriesInferByAi?: boolean;
  /** recommendation=选购推荐命题 evaluation=评测对比命题 */
  questionIntent?: GeoWorkflowQuestionIntent | null;
  phase: GeoWorkflowPhase;
  phaseStatus: GeoWorkflowPhaseStatus;
  knowledgeBaseId?: number | null;
  semanticSeoTaskId?: string | null;
  extractionTaskId?: string | null;
  coreKeywordGroups?: GeoCoreKeywordGroupDTO[] | null;
  /** 扁平快照（由 groups 派生） */
  coreKeywords?: string[] | null;
  diagnosisQuestions?: GeoDiagnosisQuestionDTO[] | null;
  diagnosisQuestionSource?: string | null;
  /** 品牌解析造句可选地域词列表 */
  diagnosisRegionWords?: string[] | null;
  /** 兼容：首地域 */
  diagnosisRegionWord?: string | null;
  /** 用户配置的竞品（null=未进入竞品步；[] 表示已确认不指定） */
  configuredCompetitors?: string[] | null;
  diagnosisReportId?: number | null;
  baselineVisibility?: number | null;
  optimizationTaskId?: string | null;
  /** 进入智能优化时选择 domestic|overseas */
  optimizationMarket?: 'domestic' | 'overseas' | string | null;
  /** 出海优化撰稿语言 code */
  overseasWritingLanguage?: string | null;
  /** 监控日志批次 ID（创建监控接口返回的 batch_id），用于解析 monitoringDiagnosisReportId */
  monitoringBatchId?: string | null;
  monitoringLegacyTaskId?: string | null;
  /** 由后端根据 batch/legacy 解析的 diagnosis_reports.id */
  monitoringDiagnosisReportId?: number | null;
  latestReportId?: number | null;
  /** 基线诊断报告 diagnosis_report_id 对应的 task_id（服务端直查，无需 list） */
  diagnosisReportTaskId?: string | null;
  /** 产出物「分析报告」：latest_report_id ?? diagnosis_report_id 对应 task_id */
  artifactReportTaskId?: string | null;
  latestVisibility?: number | null;
  totalCycles?: number;
  completionReason?: string | null;
  acceptedAt?: string | null;
  errorMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** 侧栏「最近优化」别名（优先于品牌/产品拼接标题） */
  sidebarTitle?: string | null;
  /** 侧栏置顶 */
  sidebarPinned?: boolean;
  sidebarPinnedAt?: string | null;
  /** 用户选择的国内 AI 平台标识（与创建/诊断一致） */
  aiPlatforms?: string[];
  /** 用户选择的出海 AI 平台标识（选填） */
  overseasAiPlatforms?: string[];
}

export interface AdvanceGeoWorkflowPayload {
  ai_platforms?: string[];
  overseas_ai_platforms?: string[];
  extraction_task_id?: string;
  core_keyword_groups?: GeoCoreKeywordGroupDTO[];
  core_keywords?: string[];
  knowledge_base_id?: number | null;
  semantic_seo_task_id?: string | null;
  diagnosis_report_id?: number | null;
  baseline_visibility?: number | null;
  set_diagnosis_running?: boolean;
  optimization_task_id?: string | null;
  completion_reason?: string | null;
  monitoring_batch_id?: string | null;
  monitoring_legacy_task_id?: string | null;
  /** 更新 workflow 产品线/型号；仅当请求体包含该字段时生效 */
  product_name?: string | null;
  /** 主角所在品类（兼容单值） */
  subject_category?: string | null;
  subject_categories?: string[] | null;
  /** 为 true 时行业由解析阶段 AI 推理 */
  subject_categories_infer_by_ai?: boolean;
  /** 在 brand_input 阶段确认周期与首屏配置并进入 brand_parse */
  cycle_acked?: boolean;
  /** 全周期：诊断已完成后从 report_generation 仅推进至 intelligent_optimization（未创建优化任务时） */
  enter_intelligent_optimization?: boolean;
  /** 进入智能优化时的市场方向 domestic|overseas */
  optimization_market?: 'domestic' | 'overseas';
  /** 出海优化目标语言 code */
  overseas_writing_language?: string;
  /** brand_parse 词包写入后跳过现状分析，直接进入智能优化 */
  skip_report_generation?: boolean;
  /** 仅写入词包字段，不推进 phase */
  persist_word_pack_only?: boolean;
  /** 地域词（persist_word_pack_only 时写入 workflow 并同步优化任务） */
  region_words?: string[] | null;
  region_word?: string | null;
}

export interface ListGeoWorkflowsQuery {
  /** 默认 50，1~200 */
  limit?: number;
  /** 默认 0 */
  offset?: number;
  /** 品牌名模糊过滤（ilike） */
  brand_name?: string;
  /** 按 brands.id 过滤 */
  brand_id?: number | null;
  /** merchant=按当前商户聚合（默认）；mine=仅当前用户 */
  scope?: 'merchant' | 'mine';
}

export const geoWorkflowAPI = {
  async create(body: {
    brand_name: string;
    /** 撰文用产品线/型号（选填，空则与 brand_name 相同） */
    product_name?: string | null;
    ai_platforms?: string[];
    overseas_ai_platforms?: string[];
    brand_id?: number | null;
    cycle_mode?: GeoWorkflowCycleMode;
    /** recommendation（默认）| evaluation */
    question_intent?: GeoWorkflowQuestionIntent;
    /** 行业/品类列表 */
    subject_categories?: string[] | null;
    subject_category?: string | null;
    /** 为 true 时行业由解析阶段 AI 推理 */
    subject_categories_infer_by_ai?: boolean;
  }): Promise<GeoWorkflowDTO> {
    return apiClient.post<GeoWorkflowDTO>('/api/geo-workflows/', body);
  },

  async list(query?: ListGeoWorkflowsQuery): Promise<{ items: GeoWorkflowDTO[]; total?: number }> {
    const qs = new URLSearchParams();
    if (query?.limit != null) qs.set('limit', String(query.limit));
    if (query?.offset != null) qs.set('offset', String(query.offset));
    if (query?.brand_name?.trim()) qs.set('brand_name', query.brand_name.trim());
    if (query?.brand_id != null) qs.set('brand_id', String(query.brand_id));
    if (query?.scope) qs.set('scope', query.scope);
    const s = qs.toString();
    return apiClient.get<{ items: GeoWorkflowDTO[]; total?: number }>(
      `/api/geo-workflows/${s ? `?${s}` : ''}`
    );
  },

  async get(workflowId: string): Promise<GeoWorkflowDTO> {
    return apiClient.get<GeoWorkflowDTO>(`/api/geo-workflows/${encodeURIComponent(workflowId)}`);
  },

  /** 优化驾驶舱「分析明细」：本工作流累加明细（分页 + 时间筛选） */
  async listAuditRows(
    workflowId: string,
    params: {
      skip?: number;
      limit?: number;
      period?: WorkflowAuditPeriod;
      dateFrom?: string;
      dateTo?: string;
      platform?: string;
    } = {}
  ): Promise<WorkflowAuditRowsResponse> {
    const qs = new URLSearchParams();
    qs.set('skip', String(params.skip ?? 0));
    qs.set('limit', String(params.limit ?? 20));
    qs.set('period', params.period ?? 'last_30_days');
    if (params.dateFrom) qs.set('date_from', params.dateFrom);
    if (params.dateTo) qs.set('date_to', params.dateTo);
    if (params.platform?.trim()) qs.set('platform', params.platform.trim());
    return apiClient.get<WorkflowAuditRowsResponse>(
      `/api/geo-workflows/${encodeURIComponent(workflowId)}/audit-rows?${qs.toString()}`
    );
  },

  /** 导出分析明细 Excel（日期、问题、答案简写、是否上榜） */
  async exportAuditRows(
    workflowId: string,
    params: {
      period?: WorkflowAuditPeriod;
      dateFrom?: string;
      dateTo?: string;
      platform?: string;
    } = {}
  ): Promise<void> {
    const qs = new URLSearchParams();
    qs.set('period', params.period ?? 'last_30_days');
    if (params.dateFrom) qs.set('date_from', params.dateFrom);
    if (params.dateTo) qs.set('date_to', params.dateTo);
    if (params.platform?.trim()) qs.set('platform', params.platform.trim());
    const token = getAccessToken();
    const headers: HeadersInit = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(
      `${getApiBaseUrl()}/api/geo-workflows/${encodeURIComponent(workflowId)}/audit-rows/export?${qs.toString()}`,
      { headers }
    );
    if (!response.ok) {
      let detail = '导出失败';
      try {
        const error = await response.json();
        detail = error.detail || error.message || detail;
      } catch {
        // keep default
      }
      throw new Error(typeof detail === 'string' ? detail : '导出失败');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const asciiName = disposition.match(/filename="([^"]+)"/i);
    const filename = utf8Name
      ? decodeURIComponent(utf8Name[1])
      : asciiName?.[1] || '分析明细.xlsx';
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  async advance(workflowId: string, payload: AdvanceGeoWorkflowPayload): Promise<GeoWorkflowDTO> {
    return apiClient.post<GeoWorkflowDTO>(
      `/api/geo-workflows/${encodeURIComponent(workflowId)}/advance`,
      payload
    );
  },

  /** 智能优化阶段幂等自动创建优化任务（系统默认配置） */
  async ensureOptimizationTask(workflowId: string): Promise<{
    workflow: GeoWorkflowDTO;
    task: OptimizationTaskDTO;
  }> {
    return apiClient.post<{ workflow: GeoWorkflowDTO; task: OptimizationTaskDTO }>(
      `/api/geo-workflows/${encodeURIComponent(workflowId)}/ensure-optimization-task`,
      {}
    );
  },

  /** 品牌解析阶段：从核心词造诊断问句并写入 workflow */
  async buildDiagnosisQuestions(
    workflowId: string,
    body: {
      core_keyword_groups?: GeoCoreKeywordGroupDTO[];
      core_keywords?: string[];
      subject_category?: string | null;
      question_intent?: GeoWorkflowQuestionIntent;
      region_words?: string[] | null;
      region_word?: string | null;
    }
  ): Promise<GeoWorkflowDTO> {
    return apiClient.post<GeoWorkflowDTO>(
      `/api/geo-workflows/${encodeURIComponent(workflowId)}/build-diagnosis-questions`,
      body
    );
  },

  /** 品牌解析阶段：保存用户编辑后的诊断问句 */
  async patchDiagnosisQuestions(
    workflowId: string,
    diagnosis_questions: GeoDiagnosisQuestionDTO[],
    opts?: { region_words?: string[] | null; region_word?: string | null }
  ): Promise<GeoWorkflowDTO> {
    return apiClient.patch<GeoWorkflowDTO>(
      `/api/geo-workflows/${encodeURIComponent(workflowId)}/diagnosis-questions`,
      {
        diagnosis_questions,
        ...(opts && 'region_words' in opts ? { region_words: opts.region_words ?? [] } : {}),
        ...(opts && 'region_word' in opts ? { region_word: opts.region_word ?? '' } : {}),
      }
    );
  },

  /** 品牌解析阶段：保存用户配置的竞品（可为空数组） */
  async patchConfiguredCompetitors(
    workflowId: string,
    configured_competitors: string[]
  ): Promise<GeoWorkflowDTO> {
    return apiClient.patch<GeoWorkflowDTO>(
      `/api/geo-workflows/${encodeURIComponent(workflowId)}/configured-competitors`,
      { configured_competitors }
    );
  },

  async stop(workflowId: string): Promise<GeoWorkflowDTO> {
    return apiClient.post<GeoWorkflowDTO>(`/api/geo-workflows/${encodeURIComponent(workflowId)}/stop`, {});
  },

  /** 逻辑删除主线（所有阶段均可操作）；删除后无前端恢复入口 */
  async deleteWorkflow(workflowId: string): Promise<{ workflowId: string }> {
    return apiClient.post<{ workflowId: string }>(
      `/api/geo-workflows/${encodeURIComponent(workflowId)}/delete`,
      {}
    );
  },

  /** 逻辑删除主线（与 deleteWorkflow 等效，保留兼容） */
  async discardDraftWorkflow(workflowId: string): Promise<{ workflowId: string }> {
    return apiClient.post<{ workflowId: string }>(
      `/api/geo-workflows/${encodeURIComponent(workflowId)}/discard`,
      {}
    );
  },

  /** 更新侧栏别名 / 置顶 */
  async patchWorkflowSidebar(
    workflowId: string,
    body: { sidebar_title?: string | null; sidebar_pinned?: boolean }
  ): Promise<GeoWorkflowDTO> {
    return apiClient.patch<GeoWorkflowDTO>(
      `/api/geo-workflows/${encodeURIComponent(workflowId)}/sidebar`,
      body
    );
  },

  /**
   * 回退到指定阶段并清空该阶段及之后的产出，便于重新执行
   * 支持新 5 值业务 phase 或旧别称 brand_analysis | diagnosis | monitoring（cycle_selection 服务端会映射为 brand_input）
   */
  async rewind(
    workflowId: string,
    target_phase:
      | 'brand_input'
      | 'brand_parse'
      | 'report_generation'
      | 'intelligent_optimization'
      | 'brand_analysis'
      | 'diagnosis'
      | 'monitoring'
  ): Promise<GeoWorkflowDTO> {
    return apiClient.post<GeoWorkflowDTO>(`/api/geo-workflows/${encodeURIComponent(workflowId)}/rewind`, {
      target_phase,
    });
  },

  /** 为主线补录知识库（multipart，至少一个文件），写回 workflow.knowledge_base_id */
  async supplementKnowledgeBase(
    workflowId: string,
    files: File[]
  ): Promise<{ knowledge_base_id: number; workflow: GeoWorkflowDTO }> {
    const fd = new FormData();
    for (const f of files) {
      fd.append('files', f);
    }
    return apiClient.upload<{ knowledge_base_id: number; workflow: GeoWorkflowDTO }>(
      `/api/geo-workflows/${encodeURIComponent(workflowId)}/supplement/knowledge-base`,
      fd
    );
  },

  /** 为主线创建语义下钻（知识图谱），写回 workflow.semantic_seo_task_id；须已有知识库 */
  async supplementKnowledgeGraph(
    workflowId: string,
    opts?: { keyword?: string; entity_model?: string; relation_model?: string }
  ): Promise<GeoWorkflowDTO> {
    const q = new URLSearchParams();
    if (opts?.keyword?.trim()) q.set('keyword', opts.keyword.trim());
    if (opts?.entity_model) q.set('entity_model', opts.entity_model);
    if (opts?.relation_model) q.set('relation_model', opts.relation_model);
    const qs = q.toString();
    return apiClient.post<GeoWorkflowDTO>(
      `/api/geo-workflows/${encodeURIComponent(workflowId)}/supplement/knowledge-graph${qs ? `?${qs}` : ''}`,
      {}
    );
  },

  /** 删除主线绑定的知识图谱并清空 workflow.semantic_seo_task_id */
  async clearKnowledgeGraph(workflowId: string): Promise<GeoWorkflowDTO> {
    return apiClient.delete<GeoWorkflowDTO>(
      `/api/geo-workflows/${encodeURIComponent(workflowId)}/supplement/knowledge-graph`,
    );
  },
};
