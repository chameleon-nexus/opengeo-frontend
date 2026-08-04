/**
 * 诊断报告 API
 */

import apiClient from './client';

export interface DiagnosisReportData {
  id: number;
  batchId?: string;
  taskId: string;
  brandId: string;
  brandName: string;
  /** 部分接口（如 GEO OpenAPI）会带 industry；列表接口可能仅从 indicatorData.reportMeta 取 */
  industry?: string;
  mvpSummary?: string | null;
  keywords: string;
  totalAnswers: number;
  visibility: string;
  top1: string;
  top2: string;
  top3: string;
  top4: string;
  top5: string;
  sourceRate: string;
  sceneWords: number;
  aiPlatforms: number;
  competitorsCount: number;
  sourcesCount: number;
  competitors: Array<{
    type: string;
    name: string;
    visibility: string;
    source: string;
    count: number;
  }>;
  sources: Array<{
    name: string;
    total: number;
    target: string;
    c1: string;
    c2: string;
    c3: string;
    c4: string;
    c5: string;
  }>;
  radarData: Array<{
    subject: string;
    A: number;
    fullMark: number;
  }>;
  indicatorData: {
    indicators?: Array<{
      label: string;
      value: string;
      diagnosis: string;
    }>;
    platform_visibility?: Array<{
      platform: string;
      visibility: number;
    }>;
    vs_competitor?: {
      brand_visibility: number;
      top_competitor_visibility: number;
      gap: number;
    };
    reportMeta?: { industry?: string; schemaVersion?: number; [k: string]: unknown };
    questionAnalysis?: Array<Record<string, unknown>>;
    positiveKeywords?: string[];
    citationPreference?: Array<Record<string, unknown>>;
    optimizationSuggestions?: Array<Record<string, unknown>>;
    sectionSummaries?: {
      visibility?: { line1?: string; line2?: string; foot?: string };
      aiPlatform?: { line1?: string; line2?: string; foot?: string };
      aiRanking?: { line1?: string; line2?: string; foot?: string };
    };
    questions?: Array<{ question?: string; answer?: string }>;
    weak_scenarios?: Array<{
      scenario: string;
      first_competitor: string;
      competitors_text: string;
    }>;
    word_pack?: string[];
  } | Array<any>;
  createdAt: string;
  updatedAt: string;
}

/** Admin 分析报告列表项（含商户/产品展示字段） */
export interface AdminGeoReportListItem extends DiagnosisReportData {
  merchantId?: number | null;
  merchantName?: string | null;
  productName?: string | null;
}

export interface CoreIndicatorPayload {
  label: string;
  value: string;
  diagnosis?: string;
}

export const diagnosisReportAPI = {
  /** 获取系统最新诊断报告（左侧菜单入口，不按品牌过滤） */
  getLatest: async (): Promise<DiagnosisReportData | null> => {
    return apiClient.get<DiagnosisReportData | null>(`/api/diagnosis-report/latest`);
  },

  /** 按品牌获取最新诊断报告（兼容） */
  getLatestByBrand: async (brandId: string): Promise<DiagnosisReportData | null> => {
    return apiClient.get<DiagnosisReportData | null>(`/api/diagnosis-report/${brandId}/latest`);
  },

  /** 获取指定批次的诊断报告 */
  getByBatch: async (batchId: string): Promise<DiagnosisReportData | null> => {
    return apiClient.get<DiagnosisReportData | null>(`/api/diagnosis-report/batch/${batchId}`);
  },

  /** 获取指定任务的诊断报告（从现状分析进入，后端会自动关联到批次报告） */
  getByTask: async (taskId: string): Promise<DiagnosisReportData | null> => {
    return apiClient.get<DiagnosisReportData | null>(`/api/diagnosis-report/task/${taskId}`);
  },

  /** 创建分享，返回 shareId（须登录） */
  createShare: async (taskId: string, isMock: boolean): Promise<{ shareId: string }> => {
    return apiClient.post<{ shareId: string }>(`/api/diagnosis-report/share/create`, {
      task_id: taskId,
      is_mock: isMock,
    });
  },

  /** 按 shareId 获取固化的诊断报告（免登录） */
  getByShare: async (shareId: string): Promise<DiagnosisReportData | null> => {
    return apiClient.get<DiagnosisReportData | null>(`/api/diagnosis-report/share/${shareId}`);
  },

  /** 获取品牌历史诊断报告列表 */
  list: async (brandId: string, skip = 0, limit = 20): Promise<{
    reports: DiagnosisReportData[];
    total: number;
  }> => {
    return apiClient.get(`/api/diagnosis-report/${brandId}/list?skip=${skip}&limit=${limit}`);
  },

  /** [Admin] 获取系统全部 GEO 分析报告（跨商户） */
  listAllAdmin: async (opts?: {
    skip?: number;
    limit?: number;
    brand_name?: string;
  }): Promise<{
    reports: AdminGeoReportListItem[];
    total: number;
    skip: number;
    limit: number;
  }> => {
    const qs = new URLSearchParams();
    qs.set('skip', String(opts?.skip ?? 0));
    qs.set('limit', String(opts?.limit ?? 20));
    if (opts?.brand_name?.trim()) qs.set('brand_name', opts.brand_name.trim());
    return apiClient.get(`/api/diagnosis-report/admin/list-all?${qs.toString()}`);
  },

  /** @deprecated 使用 listAllAdmin */
  listAll: async (skip = 0, limit = 20) => {
    return diagnosisReportAPI.listAllAdmin({ skip, limit });
  },

  /** [Admin] 获取单条诊断报告详情 */
  getById: async (reportId: number): Promise<DiagnosisReportData | null> => {
    return apiClient.get<DiagnosisReportData | null>(`/api/diagnosis-report/admin/report/${reportId}`);
  },

  /** [Admin] 指派报告给用户 */
  assign: async (reportId: number, userId: number): Promise<void> => {
    await apiClient.post(`/api/diagnosis-report/admin/report/${reportId}/assign`, { user_id: userId });
  },

  /** [Admin] 按原始问答明细重算报告（分母 = 问题数 × 平台数） */
  recalculate: async (reportId: number): Promise<DiagnosisReportData> => {
    return apiClient.post(`/api/diagnosis-report/admin/report/${reportId}/recalculate`, {});
  },

  /** [Admin] 更新诊断报告 */
  update: async (reportId: number, body: Partial<{
    visibility: string;
    top1: string;
    top2: string;
    top3: string;
    top4: string;
    top5: string;
    source_rate: string;
    total_answers: number;
    scene_words: number;
    ai_platforms: number;
    competitors_count: number;
    sources_count: number;
    competitors: Array<{ type: string; name: string; visibility: string; source: string; count: number }>;
    sources: Array<Record<string, unknown>>;
    radar_data: Array<Record<string, unknown>>;
    indicator_data: Record<string, unknown>;
    /** 与后端 DiagnosisReportUpdateBody.core_indicators 一致，可选；已有 indicator_data.indicators 时仍建议一并传 */
    core_indicators?: CoreIndicatorPayload[];
  }>): Promise<DiagnosisReportData> => {
    return apiClient.put(`/api/diagnosis-report/admin/report/${reportId}`, body);
  },
};
