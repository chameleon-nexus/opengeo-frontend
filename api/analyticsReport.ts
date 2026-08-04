/**
 * 分析报告相关API
 */

import apiClient from './client';

export type EngineKey = 'doubao' | 'deepseek' | 'wenxin' | 'qianwen' | 'yuanbao' | 'kimi';

export interface AnalyticsReportData {
  matrix_data_positive: Array<{
    brand: string;
    doubao: number;
    deepseek: number;
    wenxin: number;
    qianwen: number;
    yuanbao: number;
    isMain: boolean;
  }>;
  matrix_data_negative: Array<{
    brand: string;
    doubao: number;
    deepseek: number;
    wenxin: number;
    qianwen: number;
    yuanbao: number;
    isMain: boolean;
  }>;
  audit_details: Array<{
    q: string;
    mentioned: string;
    platforms: string;
    brands: string;
    summary: string;
    platform?: string;  // 平台标识（doubao, deepseek等）
    task_id?: string;   // 任务ID
    question_type?: string;  // 问题类别（positive/negative/brand）
  }>;
  source_stats: Record<string, Array<{
    rank: number;
    name: string;
    count: number;
  }>>;  // 新增：信源统计（按平台分组）
  platforms: string[];
  total_tasks: number;
  tasks_by_platform?: Record<string, string>;  // 平台到任务ID的映射
}

export const analyticsReportAPI = {
  /**
   * 获取品牌的分析报告数据
   */
  getBrandAnalyticsReport: async (
    brandId: string,
    productName?: string,
    questionType?: 'positive' | 'negative' | 'brand'
  ): Promise<AnalyticsReportData> => {
    const params = new URLSearchParams();
    if (productName) {
      params.append('product_name', productName);
    }
    if (questionType) {
      params.append('question_type', questionType);
    }
    const query = params.toString();
    return apiClient.get<AnalyticsReportData>(
      `/api/brands/${brandId}/analytics-report${query ? `?${query}` : ''}`
    );
  },
};
