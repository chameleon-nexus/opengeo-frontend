/**
 * 写作语言目录（与 /api/content/writing-languages 对齐）
 */
import apiClient from './client';

export interface WritingLanguageOption {
  code: string;
  label: string;
  enabled?: boolean;
}

export interface WritingLanguageListResponse {
  items: WritingLanguageOption[];
  scope: string;
}

export const writingLanguagesAPI = {
  async list(params?: {
    scope?: 'all' | 'overseas';
    enabled_only?: boolean;
  }): Promise<WritingLanguageOption[]> {
    const data = await apiClient.get<WritingLanguageListResponse>(
      '/api/content/writing-languages',
      {
        params: {
          scope: params?.scope ?? 'all',
          enabled_only: params?.enabled_only ?? true,
        },
      },
    );
    return data?.items ?? [];
  },
};
