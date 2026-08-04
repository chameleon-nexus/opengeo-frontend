/**
 * Admin 出海 AI 现状分析联网配置 API
 */

import apiClient from './client';

export type OverseasRunnerType = 'perplexity_native' | 'openai_native' | 'compose';

export interface OverseasAiRow {
  platformId: string;
  runnerType: OverseasRunnerType;
  llmChannelId?: number | null;
  llmChannelName?: string | null;
  searchChannelId?: number | null;
  searchChannelName?: string | null;
  enabled: boolean;
  updatedAt?: string | null;
}

export interface OverseasPlatformOption {
  value: string;
  label: string;
}

export interface OverseasAiUpdatePayload {
  runnerType?: OverseasRunnerType;
  llmChannelId?: number | null;
  searchChannelId?: number | null;
  enabled?: boolean;
  clearLlmChannel?: boolean;
  clearSearchChannel?: boolean;
}

function mapRow(r: any): OverseasAiRow {
  return {
    platformId: r.platformId ?? r.platform_id ?? '',
    runnerType: (r.runnerType ?? r.runner_type ?? 'compose') as OverseasRunnerType,
    llmChannelId: r.llmChannelId ?? r.llm_channel_id ?? null,
    llmChannelName: r.llmChannelName ?? r.llm_channel_name ?? null,
    searchChannelId: r.searchChannelId ?? r.search_channel_id ?? null,
    searchChannelName: r.searchChannelName ?? r.search_channel_name ?? null,
    enabled: Boolean(r.enabled),
    updatedAt: r.updatedAt ?? r.updated_at ?? null,
  };
}

export const overseasAiAPI = {
  list: async (): Promise<{ platforms: OverseasPlatformOption[]; items: OverseasAiRow[] }> => {
    const data = await apiClient.get<any>('/api/admin/overseas-ai');
    const platforms = Array.isArray(data?.platforms) ? data.platforms : [];
    const items = Array.isArray(data?.items) ? data.items.map(mapRow) : [];
    return { platforms, items };
  },

  update: async (platformId: string, payload: OverseasAiUpdatePayload): Promise<OverseasAiRow> => {
    const data = await apiClient.put<any>(`/api/admin/overseas-ai/${platformId}`, payload);
    return mapRow(data);
  },

  test: async (
    platformId: string,
    query?: string,
  ): Promise<{ answer: string; refCount: number; preview: { title?: string; url?: string; summary?: string }[] }> => {
    const data = await apiClient.post<any>(`/api/admin/overseas-ai/${platformId}/test`, {
      query: query || 'What are the best project management tools in 2025?',
    });
    return {
      answer: String(data?.answer ?? ''),
      refCount: Number(data?.refCount ?? 0),
      preview: Array.isArray(data?.preview) ? data.preview : [],
    };
  },
};
