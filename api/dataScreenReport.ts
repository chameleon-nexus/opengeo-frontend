/**
 * 分析明细 API（路由仍为 /api/data-screen）
 */

import apiClient from './client';

export interface DataScreenReportData {
  id: number;
  batchId?: string;
  taskId: string;
  /** 兼容旧接口；新数据仅使用 brandName（用户输入的品牌名） */
  brandId?: string;
  brandName: string;
  coreWordsTotal: number;
  distilledWordsTotal: number;
  topKeywords: Array<{
    rank: number;
    word: string;
    count: number;
    medal: string;
  }>;
  platformData: Array<{
    name: string;
    value: number;
    color: string;
    icon: string;
  }>;
  reportRows: Array<{
    rank: number;
    coreWord: string;
    latestWord: string;
    platform: string;
    link: string;
    /** 后端从诊断子表聚合的该问全量模型回复；mock/旧数据可能为空 */
    aiAnswer?: string;
  }>;
  snapshotDate: string;
  summaryMetrics?: {
    totalCollected?: string;
    totalCollectedToday?: string;
    platformCount?: string;
    totalPlatformCount?: string;
    contactExposure?: string;
    contactExposureToday?: string;
    officialLinkExposure?: string;
    officialLinkExposureToday?: string;
    overallExposureRate?: string;
    overallExposureRateToday?: string;
    top3Rate?: string;
    top3RateToday?: string;
    displayCount?: string;  // 兼容旧数据
    displayFlags?: string;  // 6 项勾选，如 "1,1,1,1,0,0"，1=显示 0=隐藏
    showQuickCredential?: string;  // 兼容旧数据，全局
    showGotoPlatform?: string;     // 兼容旧数据，全局
    showQuickCredentialByPlatform?: string;  // JSON 对象，按平台 { "豆包（PC）": "1", "DeepSeek": "0" }
    showGotoPlatformByPlatform?: string;     // JSON 对象，按平台
    reportDetailPlatforms?: string;  // JSON 数组字符串，报表明细平台列表，如 ["豆包","doubao","豆包（PC）"]
  };
  createdAt: string;
  updatedAt: string;
  isMock?: boolean;  // 当前为 mock 数据时 true，创建分享时传入以固化
}

export const dataScreenReportAPI = {
  /** 获取品牌最新分析明细（左侧菜单入口） */
  getLatest: async (brandId: string): Promise<DataScreenReportData | null> => {
    return apiClient.get<DataScreenReportData | null>(`/api/data-screen/${brandId}/latest`);
  },

  /** 获取指定监控任务的分析明细（从监控日志进入） */
  getByTask: async (taskId: string): Promise<DataScreenReportData | null> => {
    return apiClient.get<DataScreenReportData | null>(`/api/data-screen/task/${taskId}`);
  },

  /** 获取指定监控批次的分析明细（从批次进入） */
  getByBatch: async (batchId: string): Promise<DataScreenReportData | null> => {
    return apiClient.get<DataScreenReportData | null>(`/api/data-screen/batch/${batchId}`);
  },

  /** 创建分享，返回 shareId（可选登录），is_mock 固化当前看到的是 mock 还是真实 */
  createShare: async (taskId: string, isMock: boolean): Promise<{ shareId: string }> => {
    return apiClient.post<{ shareId: string }>(`/api/data-screen/share/create`, { task_id: taskId, is_mock: isMock });
  },

  /** 按 shareId 获取固化的分析明细（免登录） */
  getByShare: async (shareId: string): Promise<DataScreenReportData | null> => {
    return apiClient.get<DataScreenReportData | null>(`/api/data-screen/share/${shareId}`);
  },

  /** 获取品牌历史分析明细列表 */
  list: async (brandId: string, skip = 0, limit = 20): Promise<{
    reports: DataScreenReportData[];
    total: number;
  }> => {
    return apiClient.get(`/api/data-screen/${brandId}/list?skip=${skip}&limit=${limit}`);
  },

  /** [Admin] 确保演示报告存在，若无则创建。返回 { id } */
  ensureDemo: async (): Promise<{ id: number }> => {
    const res = await apiClient.post<{ id: number }>(`/api/data-screen/admin/ensure-demo`);
    return res as { id: number };
  },

  /** [Admin] 获取系统全部分析明细报告 */
  listAll: async (skip = 0, limit = 20): Promise<{
    reports: DataScreenReportData[];
    total: number;
    skip: number;
    limit: number;
  }> => {
    return apiClient.get(`/api/data-screen/admin/list-all?skip=${skip}&limit=${limit}`);
  },

  /** [Admin] 获取单条分析明细报告详情 */
  getById: async (reportId: number): Promise<DataScreenReportData | null> => {
    return apiClient.get(`/api/data-screen/admin/report/${reportId}`);
  },

  /** [Admin] 指派分析明细（监控日志）给指定用户 */
  assign: async (reportId: number, userId: number): Promise<void> => {
    await apiClient.post(`/api/data-screen/admin/report/${reportId}/assign`, { user_id: userId });
  },

  /** [Admin] 按批次查询监控任务列表 */
  listAllBatches: async (skip = 0, limit = 20): Promise<{
    batches: Array<{
      batchId: string;
      batchName: string;
      taskCount: number;
      completedCount: number;
      status: string;
      targetBrand: string;
      brandDisplayName: string;
      platforms: string[];
      createdAt: string | null;
      completedAt: string | null;
      hasReport: boolean;
      reportId: number | null;
      assignedUser: { id: number; username: string; role: string } | null;
    }>;
    total: number;
  }> => {
    return apiClient.get(`/api/data-screen/admin/list-batches?skip=${skip}&limit=${limit}`);
  },

  /** [Admin] 获取批次下所有分析明细报告 */
  getBatchReports: async (batchId: string): Promise<{
    batchId: string;
    reports: DataScreenReportData[];
    total: number;
  }> => {
    return apiClient.get(`/api/data-screen/admin/batch/${batchId}/reports`);
  },

  /** [Admin] 按批次指派给指定用户 */
  assignBatch: async (batchId: string, userId: number): Promise<void> => {
    await apiClient.post(`/api/data-screen/admin/batch/${batchId}/assign`, { user_id: userId });
  },

  /** [Admin] 更新分析明细报告 */
  update: async (
    reportId: number,
    body: Partial<{
      core_words_total: number;
      distilled_words_total: number;
      top_keywords: Array<{ rank: number; word: string; count: number; medal: string }>;
      platform_data: Array<{ name: string; value: number; color: string; icon: string }>;
      report_rows: Array<{ rank: number; coreWord: string; latestWord: string; platform: string; link: string; aiAnswer?: string }>;
      snapshot_date: string;
      summary_metrics: Record<string, string>;
    }>
  ): Promise<DataScreenReportData> => {
    const res = await apiClient.put<{ data?: DataScreenReportData }>(`/api/data-screen/admin/report/${reportId}`, body);
    return (res as any)?.data ?? res;
  },
};
