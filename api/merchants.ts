/**
 * 商户管理 API（当前用户所属商户 + admin 商户列表/创建）
 */

import apiClient from './client';

export interface MerchantListItem {
  id: number;
  company_name: string;
  contact_email: string | null;
  legal_info: string | null;
  created_at: string;
}

export interface MerchantCreateBody {
  company_name: string;
  contact_email?: string | null;
  legal_info?: string | null;
}

export async function listMerchants(): Promise<MerchantListItem[]> {
  const data = await apiClient.get<MerchantListItem[]>('/api/merchants');
  return Array.isArray(data) ? data : [];
}

export async function createMerchant(body: MerchantCreateBody): Promise<MerchantListItem> {
  return apiClient.post<MerchantListItem>('/api/merchants', body);
}

export async function updateMerchant(id: number, body: MerchantCreateBody): Promise<MerchantListItem> {
  return apiClient.put<MerchantListItem>(`/api/merchants/${id}`, body);
}

export interface MerchantProfile {
  id: number;
  company_name: string;
  contact_email: string | null;
  legal_info: string | null;
  created_at: string;
}

export interface MerchantUpdateBody {
  company_name?: string;
  contact_email?: string | null;
  legal_info?: string | null;
}

export async function getMyMerchant(): Promise<MerchantProfile> {
  const data = await apiClient.request<MerchantProfile>('/api/merchants/me');
  if (!data) throw new Error('获取商户信息失败');
  return data;
}

export async function updateMyMerchant(body: MerchantUpdateBody): Promise<MerchantProfile> {
  const data = await apiClient.request<MerchantProfile>('/api/merchants/me', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!data) throw new Error('更新失败');
  return data;
}

export interface MerchantSiteConfig {
  id: number;
  domain: string;
  site_settings: Record<string, unknown>;
}

export async function getMySiteConfig(): Promise<MerchantSiteConfig | null> {
  const data = await apiClient.get<MerchantSiteConfig | null>('/api/merchants/me/site-config');
  return data ?? null;
}

export async function updateMySiteConfig(body: { domain?: string; site_settings?: Record<string, unknown> }): Promise<MerchantSiteConfig> {
  const data = await apiClient.put<MerchantSiteConfig>('/api/merchants/me/site-config', body);
  if (!data) throw new Error('保存失败');
  return data;
}

export interface MerchantFaqConfig {
  id: number;
  merchant_id: number;
  title: string;
  description: string | null;
  items: Array<{ question: string; answer: string }>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MerchantFaqCreateBody {
  title: string;
  description?: string | null;
  items: Array<{ question: string; answer: string }>;
}

export async function getMyFaq(): Promise<MerchantFaqConfig | null> {
  const data = await apiClient.get<MerchantFaqConfig | null>('/api/merchants/me/faq');
  return data ?? null;
}

export async function updateMyFaq(body: MerchantFaqCreateBody): Promise<MerchantFaqConfig> {
  const data = await apiClient.put<MerchantFaqConfig>('/api/merchants/me/faq', body);
  if (!data) throw new Error('保存失败');
  return data;
}

export interface MerchantBusinessIntroConfig {
  id: number;
  merchant_id: number;
  title: string;
  steps: Array<Record<string, unknown>>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface MerchantBusinessIntroCreateBody {
  title: string;
  steps: Array<Record<string, unknown>>;
}

export async function getMyBusinessIntro(): Promise<MerchantBusinessIntroConfig | null> {
  const data = await apiClient.get<MerchantBusinessIntroConfig | null>('/api/merchants/me/business-intro');
  return data ?? null;
}

export async function updateMyBusinessIntro(body: MerchantBusinessIntroCreateBody): Promise<MerchantBusinessIntroConfig> {
  const data = await apiClient.put<MerchantBusinessIntroConfig>('/api/merchants/me/business-intro', body);
  if (!data) throw new Error('保存失败');
  return data;
}

/** 子站栏目（父子结构，页头导航） */
export interface ColumnTreeNode {
  id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  children: Array<{ id: number; name: string }>;
}

export async function getMyColumns(): Promise<ColumnTreeNode[]> {
  const data = await apiClient.get<ColumnTreeNode[]>('/api/merchants/me/columns');
  return Array.isArray(data) ? data : [];
}

export async function createColumn(body: { name: string; parent_id?: number | null; sort_order?: number }): Promise<{ id: number }> {
  const res = await apiClient.post<{ id: number }>('/api/merchants/me/columns', {
    name: body.name,
    parent_id: body.parent_id ?? null,
    sort_order: body.sort_order ?? 0,
  });
  return res;
}

export async function updateColumn(columnId: number, body: { name?: string; parent_id?: number | null; sort_order?: number }): Promise<void> {
  await apiClient.put(`/api/merchants/me/columns/${columnId}`, body);
}

export async function deleteColumn(columnId: number): Promise<void> {
  await apiClient.delete(`/api/merchants/me/columns/${columnId}`);
}

/** 子站文章分类（扁平，首页资讯 tab） */
export interface CategoryItem {
  id: number;
  name: string;
  sort_order: number;
}

export async function getMyCategories(): Promise<CategoryItem[]> {
  const data = await apiClient.get<CategoryItem[]>('/api/merchants/me/categories');
  return Array.isArray(data) ? data : [];
}

export async function createCategory(body: { name: string; sort_order?: number }): Promise<{ id: number }> {
  const res = await apiClient.post<{ id: number }>('/api/merchants/me/categories', {
    name: body.name,
    sort_order: body.sort_order ?? 0,
  });
  return res;
}

export async function updateCategory(categoryId: number, body: { name?: string; sort_order?: number }): Promise<void> {
  await apiClient.put(`/api/merchants/me/categories/${categoryId}`, body);
}

export async function deleteCategory(categoryId: number): Promise<void> {
  await apiClient.delete(`/api/merchants/me/categories/${categoryId}`);
}

/** 初始化分类：批量插入 10 个行业预设分类，已存在的名称跳过 */
export async function initCategories(): Promise<{ created: number }> {
  const res = await apiClient.post<{ created: number }>('/api/merchants/me/categories/init');
  return res;
}

/** 子站模板 */
export interface SiteTemplate {
  id: string;
  name: string;
  description: string;
}

export async function listTemplates(): Promise<SiteTemplate[]> {
  const data = await apiClient.get<SiteTemplate[]>('/api/merchants/me/templates');
  return Array.isArray(data) ? data : [];
}

/** 联系表单留言 */
export interface ContactSubmissionItem {
  id: number;
  site_id?: number | null;
  name: string;
  phone: string;
  contact_method?: string;
  contact_value?: string;
  contact_extra?: Record<string, string>;
  company: string;
  message: string;
  source_page: string;
  ip_address: string;
  is_read: boolean;
  created_at: string;
}

export interface ContactSubmissionsResult {
  total: number;
  items: ContactSubmissionItem[];
}

export async function getContactSubmissions(
  skip = 0,
  limit = 20,
  siteId?: number,
): Promise<ContactSubmissionsResult> {
  const siteQuery = siteId != null ? `&site_id=${siteId}` : '';
  const data = await apiClient.get<ContactSubmissionsResult>(
    `/api/merchants/me/contact-submissions?skip=${skip}&limit=${limit}${siteQuery}`,
  );
  return data ?? { total: 0, items: [] };
}

export async function markSubmissionRead(id: number): Promise<void> {
  await apiClient.put(`/api/merchants/me/contact-submissions/${id}/read`, {});
}

export async function deleteSubmission(id: number): Promise<void> {
  await apiClient.delete(`/api/merchants/me/contact-submissions/${id}`);
}

/** 上传子站图片到 OSS（logo / favicon / 背景 / 集团板块配图 / 分析品牌 Logo 等），返回图片 URL */
export async function uploadSiteAsset(
  file: File,
  assetType: 'logo' | 'favicon' | 'background' | 'company_section' | 'customer_logo' | 'og_image' = 'logo',
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('asset_type', assetType);
  const res = await apiClient.upload<{ url: string }>('/api/merchants/me/site-config/upload', formData);
  if (!res?.url) throw new Error('上传失败');
  const base = (import.meta.env.VITE_API_BASE_URL || '').toString();
  if (base && (base.startsWith('http://') || base.startsWith('https://')) && res.url.startsWith('/')) {
    return base.replace(/\/$/, '') + res.url;
  }
  return res.url;
}
