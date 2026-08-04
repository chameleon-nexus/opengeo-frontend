/**
 * Admin 日常 AI 通道 API
 */

import apiClient from './client';

export type WebSearchMode = 'none' | 'native' | 'third_party';
export type ProviderType = 'doubao_bot' | 'openai_compatible';

export interface LlmChannelRow {
  id: number;
  code: string;
  name: string;
  providerType: ProviderType;
  baseUrl: string;
  model: string;
  temperature?: number | null;
  webSearchMode: WebSearchMode;
  enabled: boolean;
  isDefault: boolean;
  hasKey: boolean;
  maskedKey?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface LlmChannelPayload {
  code: string;
  name: string;
  providerType: ProviderType;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number | null;
  webSearchMode: WebSearchMode;
  enabled?: boolean;
}

export interface LlmChannelUpdatePayload {
  name?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number | null;
  webSearchMode?: WebSearchMode;
  enabled?: boolean;
}

function mapRow(r: any): LlmChannelRow {
  return {
    id: Number(r.id),
    code: r.code ?? '',
    name: r.name ?? '',
    providerType: (r.providerType ?? r.provider_type ?? 'openai_compatible') as ProviderType,
    baseUrl: r.baseUrl ?? r.base_url ?? '',
    model: r.model ?? '',
    temperature: r.temperature ?? null,
    webSearchMode: (r.webSearchMode ?? r.web_search_mode ?? 'none') as WebSearchMode,
    enabled: Boolean(r.enabled),
    isDefault: Boolean(r.isDefault ?? r.is_default),
    hasKey: Boolean(r.hasKey ?? r.has_key),
    maskedKey: r.maskedKey ?? r.masked_key ?? null,
    createdAt: r.createdAt ?? r.created_at ?? null,
    updatedAt: r.updatedAt ?? r.updated_at ?? null,
  };
}

export const llmChannelAPI = {
  list: async (): Promise<LlmChannelRow[]> => {
    const data = await apiClient.get<any>('/api/admin/llm-channels');
    const rows = Array.isArray(data) ? data : data?.items ?? [];
    return rows.map(mapRow);
  },

  create: async (payload: LlmChannelPayload): Promise<LlmChannelRow> => {
    const data = await apiClient.post<any>('/api/admin/llm-channels', payload);
    return mapRow(data);
  },

  update: async (id: number, payload: LlmChannelUpdatePayload): Promise<LlmChannelRow> => {
    const data = await apiClient.put<any>(`/api/admin/llm-channels/${id}`, payload);
    return mapRow(data);
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/admin/llm-channels/${id}`);
  },

  setDefault: async (id: number): Promise<LlmChannelRow> => {
    const data = await apiClient.post<any>(`/api/admin/llm-channels/${id}/default`, {});
    return mapRow(data);
  },

  test: async (id: number, prompt?: string): Promise<string> => {
    const data = await apiClient.post<any>(`/api/admin/llm-channels/${id}/test`, {
      prompt: prompt || '你好，请用一句话介绍你自己。',
    });
    return String(data?.reply ?? '');
  },
};
