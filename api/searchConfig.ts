/**
 * Admin 三方搜索通道 API（IQS / Exa / Tavily）
 */

import apiClient from './client';

export type SearchProviderType = 'aliyun_iqs' | 'exa' | 'tavily';

export interface SearchChannelRow {
  id: number;
  code: string;
  name: string;
  providerType: SearchProviderType;
  baseUrl: string;
  extraJson: Record<string, unknown>;
  enabled: boolean;
  isDefault: boolean;
  hasKey: boolean;
  maskedKey?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface SearchChannelPayload {
  code: string;
  name: string;
  providerType: SearchProviderType;
  baseUrl?: string;
  apiKey?: string;
  extraJson?: Record<string, unknown>;
  enabled?: boolean;
}

export interface SearchChannelUpdatePayload {
  name?: string;
  baseUrl?: string;
  apiKey?: string;
  extraJson?: Record<string, unknown>;
  enabled?: boolean;
}

export interface SearchTestPreviewItem {
  title?: string;
  url?: string;
  snippet?: string;
}

function mapRow(r: any): SearchChannelRow {
  return {
    id: Number(r.id),
    code: r.code ?? '',
    name: r.name ?? '',
    providerType: (r.providerType ?? r.provider_type ?? 'aliyun_iqs') as SearchProviderType,
    baseUrl: r.baseUrl ?? r.base_url ?? '',
    extraJson: (r.extraJson ?? r.extra_json ?? {}) as Record<string, unknown>,
    enabled: Boolean(r.enabled),
    isDefault: Boolean(r.isDefault ?? r.is_default),
    hasKey: Boolean(r.hasKey ?? r.has_key),
    maskedKey: r.maskedKey ?? r.masked_key ?? null,
    createdAt: r.createdAt ?? r.created_at ?? null,
    updatedAt: r.updatedAt ?? r.updated_at ?? null,
  };
}

export const searchConfigAPI = {
  list: async (): Promise<SearchChannelRow[]> => {
    const data = await apiClient.get<any>('/api/admin/search-channels');
    const rows = Array.isArray(data) ? data : data?.items ?? [];
    return rows.map(mapRow);
  },

  create: async (payload: SearchChannelPayload): Promise<SearchChannelRow> => {
    const data = await apiClient.post<any>('/api/admin/search-channels', payload);
    return mapRow(data);
  },

  update: async (id: number, payload: SearchChannelUpdatePayload): Promise<SearchChannelRow> => {
    const data = await apiClient.put<any>(`/api/admin/search-channels/${id}`, payload);
    return mapRow(data);
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/admin/search-channels/${id}`);
  },

  setDefault: async (id: number): Promise<SearchChannelRow> => {
    const data = await apiClient.post<any>(`/api/admin/search-channels/${id}/default`, {});
    return mapRow(data);
  },

  test: async (id: number, query?: string): Promise<{ count: number; preview: SearchTestPreviewItem[]; answer?: string }> => {
    const data = await apiClient.post<any>(`/api/admin/search-channels/${id}/test`, {
      query: query || '人工智能最新进展',
    });
    return {
      count: Number(data?.count ?? 0),
      preview: Array.isArray(data?.preview) ? data.preview : [],
      answer: data?.answer ?? '',
    };
  },
};
