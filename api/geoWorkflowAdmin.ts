/**
 * Admin / Agent 工作流治理 API
 */

import apiClient from './client';

export interface WorkflowTransferListItem {
  workflowId: string;
  brandName: string;
  productName: string | null;
  phase: string;
  phaseStatus: string;
  merchantId: number | null;
  merchantName: string | null;
  userId: number | null;
  username: string | null;
  brandId: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkflowTransferListResponse {
  items: WorkflowTransferListItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface WorkflowTransferBody {
  target_merchant_id: number;
  target_user_id?: number | null;
}

export interface WorkflowTransferResult {
  workflowId: string;
  merchantId: number | null;
  userId: number | null;
  sourceMerchantId: number | null;
  sourceUserId: number | null;
  brandUpdated: boolean;
  optimizationTaskUpdated: boolean;
  diagnosisReportsUpdated: number;
  publishTasksUpdated: number;
  extractionTaskUpdated: boolean;
}

export interface WorkflowTransferTargetUser {
  id: number;
  username: string | null;
  role: string | null;
  merchantId: number | null;
  merchantName: string | null;
  isPlatformAdmin: boolean;
}

export async function listTransferTargetUsers(
  merchantId: number,
): Promise<WorkflowTransferTargetUser[]> {
  const data = await apiClient.get<{ items: WorkflowTransferTargetUser[] }>(
    '/api/admin/geo-workflows/transfer-target-users',
    { params: { merchant_id: merchantId } },
  );
  return data?.items ?? [];
}

export async function listAdminGeoWorkflows(params?: {
  merchant_id?: number;
  skip?: number;
  limit?: number;
}): Promise<WorkflowTransferListResponse> {
  const data = await apiClient.get<WorkflowTransferListResponse>('/api/admin/geo-workflows', {
    params,
  });
  return data ?? { items: [], total: 0, skip: 0, limit: 50 };
}

export async function transferGeoWorkflow(
  workflowId: string,
  body: WorkflowTransferBody,
): Promise<WorkflowTransferResult> {
  return apiClient.post<WorkflowTransferResult>(
    `/api/admin/geo-workflows/${encodeURIComponent(workflowId)}/transfer`,
    body,
  );
}
