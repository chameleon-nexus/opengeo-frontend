/**
 * 通用设置 API
 */

import apiClient from './client';

export interface GeneralSettings {
  dataScreenUseMock: boolean;
  diagnosisReportUseMock: boolean;
}

export const generalSettingsAPI = {
  /** 获取通用设置（需 admin 登录） */
  get: async (): Promise<GeneralSettings> => {
    const data = await apiClient.get<any>('/api/general-settings');
    return {
      dataScreenUseMock: data?.data_screen_use_mock ?? true,
      diagnosisReportUseMock: data?.diagnosis_report_use_mock ?? true,
    };
  },

  /** 更新通用设置（需 admin 登录） */
  update: async (body: { data_screen_use_mock?: boolean; diagnosis_report_use_mock?: boolean }): Promise<GeneralSettings> => {
    const data = await apiClient.put<any>('/api/general-settings', body);
    return {
      dataScreenUseMock: data?.data_screen_use_mock ?? true,
      diagnosisReportUseMock: data?.diagnosis_report_use_mock ?? true,
    };
  },
};
