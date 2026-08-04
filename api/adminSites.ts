/**
 * Admin 站点配置 API
 */
import apiClient from './client';
import type { SiteKind, SiteRow } from './sites';

export interface AdminSiteRow extends SiteRow {
  merchant_name?: string;
}

export async function listAdminSites(merchantId?: number): Promise<AdminSiteRow[]> {
  const qs = merchantId != null ? `?merchant_id=${merchantId}` : '';
  return apiClient.get<AdminSiteRow[]>(`/api/admin/sites${qs}`);
}

export async function updateSiteMerchant(siteId: number, merchantId: number): Promise<AdminSiteRow> {
  return apiClient.put<AdminSiteRow>(`/api/admin/sites/${siteId}/merchant`, {
    merchant_id: merchantId,
  });
}

export const SITE_KIND_LABEL: Record<SiteKind, string> = {
  template: '模板站',
  custom: '自定义站',
};
