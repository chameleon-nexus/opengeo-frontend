/**
 * 对外 API Key：管理员代商户 / 当前用户自助（龙虾密钥）
 */

import apiClient from './client';

export interface MerchantExternalKeyItem {
  id: number;
  merchant_id: number;
  name: string | null;
  key_prefix: string;
  is_active: boolean;
  created_at: string | null;
  last_used_at: string | null;
}

export interface MerchantExternalKeyCreated extends MerchantExternalKeyItem {
  api_key: string;
}

/** 当前登录用户：本商户密钥列表 */
export async function listMyExternalKeys(): Promise<MerchantExternalKeyItem[]> {
  const data = await apiClient.get<MerchantExternalKeyItem[]>('/api/me/external-api-keys');
  return Array.isArray(data) ? data : [];
}

/** 当前登录用户：创建本商户密钥 */
export async function createMyExternalKey(
  body: { name?: string | null }
): Promise<MerchantExternalKeyCreated> {
  return apiClient.post<MerchantExternalKeyCreated>('/api/me/external-api-keys', body);
}

/** 当前登录用户：吊销本商户密钥 */
export async function revokeMyExternalKey(keyId: number): Promise<void> {
  await apiClient.delete(`/api/me/external-api-keys/${keyId}`);
}

/** @deprecated 管理员代签；侧栏已改为用户自助，保留供脚本/兼容 */
export async function listMerchantExternalKeys(merchantId: number): Promise<MerchantExternalKeyItem[]> {
  const data = await apiClient.get<MerchantExternalKeyItem[]>(
    `/api/merchants/${merchantId}/external-api-keys`
  );
  return Array.isArray(data) ? data : [];
}

export async function createMerchantExternalKey(
  merchantId: number,
  body: { name?: string | null }
): Promise<MerchantExternalKeyCreated> {
  return apiClient.post<MerchantExternalKeyCreated>(
    `/api/merchants/${merchantId}/external-api-keys`,
    body
  );
}

export async function revokeMerchantExternalKey(merchantId: number, keyId: number): Promise<void> {
  await apiClient.delete(`/api/merchants/${merchantId}/external-api-keys/${keyId}`);
}
