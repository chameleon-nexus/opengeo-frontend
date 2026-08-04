import { apiClient } from './client';

export interface ThirdPartyMediaOutletDTO {
  id: number;
  name: string;
  accountType: string;
  successRate: number;
  pricePoints: number;
  market?: string;
}

export interface ThirdPartyMediaCatalogResult {
  items: ThirdPartyMediaOutletDTO[];
  total: number;
  page: number;
  page_size: number;
}

export interface ThirdPartyMediaWhitelistResolved {
  scope: 'all' | 'selected';
  scopeLabel: string;
  items: ThirdPartyMediaOutletDTO[];
  ids?: number[] | null;
  totalInCatalog?: number;
}

export async function listThirdPartyMediaOutlets(params?: {
  page?: number;
  page_size?: number;
  market?: 'domestic' | 'overseas';
  q?: string;
  ids?: number[];
}): Promise<ThirdPartyMediaCatalogResult> {
  const data = await apiClient.get<ThirdPartyMediaCatalogResult>('/api/third-party/media-outlets', {
    params: {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 10,
      market: params?.market ?? 'domestic',
      q: params?.q?.trim() || undefined,
      ids: params?.ids?.length ? params.ids.join(',') : undefined,
    },
  });
  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    page_size: data?.page_size ?? 10,
  };
}

export async function getPublishTaskMediaWhitelist(
  publishId: number
): Promise<ThirdPartyMediaWhitelistResolved> {
  return apiClient.get<ThirdPartyMediaWhitelistResolved>(
    `/api/third-party/${publishId}/media-whitelist`
  );
}
