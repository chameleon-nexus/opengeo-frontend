/**
 * Dashboard 相关API
 */

import apiClient from './client';
import { DashboardData } from '../types';

export const dashboardAPI = {
  /**
   * 获取品牌的最新 Dashboard 数据
   */
  getLatest: async (brandId: string): Promise<DashboardData> => {
    return apiClient.get<DashboardData>(`/api/dashboard/${brandId}/latest`);
  },

  /**
   * 获取 Dashboard 历史快照列表
   */
  getHistory: async (
    brandId: string,
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<any[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (limit) params.append('limit', limit.toString());
    
    const query = params.toString();
    return apiClient.get<any[]>(`/api/dashboard/${brandId}/history${query ? `?${query}` : ''}`);
  },

  /**
   * 获取指定日期的 Dashboard 数据
   */
  getByDate: async (brandId: string, snapshotDate: string): Promise<DashboardData> => {
    return apiClient.get<DashboardData>(`/api/dashboard/${brandId}/snapshot/${snapshotDate}`);
  },
};

