/**
 * 营销主站 CMS（与子站 aieo 隔离）
 */
import apiClient from './client';

export type ContactChannelType =
  | 'phone'
  | 'email'
  | 'wechat'
  | 'whatsapp'
  | 'discord'
  | 'telegram'
  | 'line'
  | 'custom';

export interface ContactChannelRow {
  type: ContactChannelType;
  label?: string | null;
  value?: string | null;
  qr_url?: string | null;
  link?: string | null;
  enabled?: boolean | null;
  sort?: number | null;
}

export type ContactFormFieldKey =
  | 'phone'
  | 'email'
  | 'wechat'
  | 'whatsapp'
  | 'discord'
  | 'telegram'
  | 'line';

export interface ContactFormFieldRow {
  key: ContactFormFieldKey;
  type?: string | null;
  enabled?: boolean | null;
  required?: boolean | null;
  sort?: number | null;
}

export interface WebMainSettings {
  site_title?: string | null;
  brand_name?: string | null;
  hero_headline?: string | null;
  site_description?: string | null;
  slogan?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  phone?: string | null;
  icp_number?: string | null;
  police_number?: string | null;
  address?: string | null;
  contact_email?: string | null;
  default_og_image?: string | null;
  hero_background_url?: string | null;
  hero_images?: string[];
  hero_show_mask?: boolean | null;
  hero_text_color?: string | null;
  company_intro?: string | null;
  contact_qr_code_url?: string | null;
  contact_channels?: ContactChannelRow[] | null;
  contact_form_fields?: ContactFormFieldRow[] | null;
  keywords?: string[];
  show_contact_form?: boolean | null;
  baidu_push_token?: string | null;
  analytics_enabled?: boolean | null;
  google_analytics_id?: string | null;
  llms_txt?: string | null;
  localized_settings?: Record<string, Record<string, string | null | undefined>>;
}

export async function getWebMainSettings(): Promise<WebMainSettings> {
  const data = await apiClient.get<WebMainSettings | Record<string, never>>('/api/web-main-site/me/settings');
  return data && typeof data === 'object' ? (data as WebMainSettings) : {};
}

export async function updateWebMainSettings(body: Partial<WebMainSettings>): Promise<WebMainSettings> {
  return apiClient.put<WebMainSettings>('/api/web-main-site/me/settings', body);
}

/** 下载当前站点全部公开 URL（txt，每行一条） */
export async function downloadSiteUrlsTxt(): Promise<void> {
  const { ensureFreshToken, getAccessToken } = await import('../lib/authSession');
  const { getActiveSiteId } = await import('../lib/activeSiteId');
  const { getApiOrigin } = await import('../lib/apiOrigin');
  await ensureFreshToken();
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const siteId = getActiveSiteId();
  if (siteId != null) headers['X-Site-Id'] = String(siteId);
  const res = await fetch(`${getApiOrigin()}/api/web-main-site/me/urls.txt`, { headers });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || '导出失败');
  }
  const text = await res.text();
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'site-urls.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type SiteAssetGenerateType = 'logo' | 'favicon' | 'og_image' | 'banner';

export async function generateWebMainSiteAsset(
  assetType: SiteAssetGenerateType,
  styleHint?: string,
): Promise<string> {
  const res = await apiClient.post<{ url: string }>('/api/web-main-site/me/settings/generate-asset', {
    asset_type: assetType,
    style_hint: styleHint || undefined,
  });
  if (!res?.url) throw new Error('生成失败');
  return res.url;
}

export interface WebMainCategoryRow {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
}

export async function listWebMainCategories(): Promise<WebMainCategoryRow[]> {
  const res = await apiClient.get<WebMainCategoryRow[]>('/api/web-main-site/me/categories');
  return Array.isArray(res) ? res : [];
}

export async function createWebMainCategory(body: { name: string; slug: string; sort_order?: number }): Promise<{ id: number }> {
  return apiClient.post('/api/web-main-site/me/categories', body);
}

export async function updateWebMainCategory(id: number, body: { name: string; slug: string; sort_order?: number }): Promise<void> {
  await apiClient.put(`/api/web-main-site/me/categories/${id}`, body);
}

export async function deleteWebMainCategory(id: number): Promise<void> {
  await apiClient.delete(`/api/web-main-site/me/categories/${id}`);
}

export interface WebMainColumnRow {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  sort_order: number;
}

export async function listWebMainColumns(): Promise<WebMainColumnRow[]> {
  const res = await apiClient.get<WebMainColumnRow[]>('/api/web-main-site/me/columns');
  return Array.isArray(res) ? res : [];
}

/** 按站点 ID 拉取栏目（内容创作任务跨站点选目标站时使用） */
export async function listWebMainColumnsForSite(siteId: number): Promise<WebMainColumnRow[]> {
  const { ensureFreshToken, getAccessToken } = await import('../lib/authSession');
  const { getApiOrigin } = await import('../lib/apiOrigin');
  await ensureFreshToken();
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  headers['X-Site-Id'] = String(siteId);
  const res = await fetch(`${getApiOrigin()}/api/web-main-site/me/columns`, { headers });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || '加载栏目失败');
  }
  const json = (await res.json()) as { data?: WebMainColumnRow[] };
  const rows = json?.data;
  return Array.isArray(rows) ? rows : [];
}

export async function createWebMainColumn(body: {
  name: string;
  slug: string;
  parent_id?: number | null;
  sort_order?: number;
}): Promise<{ id: number }> {
  return apiClient.post('/api/web-main-site/me/columns', body);
}

export async function updateWebMainColumn(
  id: number,
  body: { name: string; slug: string; parent_id?: number | null; sort_order?: number },
): Promise<void> {
  await apiClient.put(`/api/web-main-site/me/columns/${id}`, body);
}

export async function deleteWebMainColumn(id: number): Promise<void> {
  await apiClient.delete(`/api/web-main-site/me/columns/${id}`);
}

export interface WebMainArticleRow {
  id: string;
  slug?: string;
  title: string;
  excerpt: string;
  content: string;
  author: { name: string; avatar: string };
  date: string;
  coverImage: string;
  tags: string[];
  status: string;
  category_id: number | null;
  column_id: number | null;
  sourceType?: string;
  contentTaskId?: string | null;
  cycleNumber?: number | null;
}

export async function listWebMainArticles(
  status?: string,
  sourceType?: 'manual' | 'auto',
): Promise<WebMainArticleRow[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (sourceType) params.set('source_type', sourceType);
  const q = params.toString() ? `?${params.toString()}` : '';
  const res = await apiClient.get<WebMainArticleRow[]>(`/api/web-main-site/me/articles${q}`);
  return Array.isArray(res) ? res : [];
}

export async function createWebMainArticle(body: Record<string, unknown>): Promise<WebMainArticleRow> {
  return apiClient.post('/api/web-main-site/me/articles', body);
}

export async function updateWebMainArticle(articleId: string, body: Record<string, unknown>): Promise<WebMainArticleRow> {
  return apiClient.put(`/api/web-main-site/me/articles/${articleId}`, body);
}

export async function deleteWebMainArticle(articleId: string): Promise<void> {
  await apiClient.delete(`/api/web-main-site/me/articles/${articleId}`);
}

/** AI 生成资讯封面并上传 OSS，返回新 cover_image URL */
export async function generateWebMainArticleCover(articleId: string): Promise<string> {
  const res = await apiClient.post<{ cover_image: string }>(
    `/api/web-main-site/me/articles/${articleId}/generate-cover`,
  );
  if (!res?.cover_image) throw new Error('封面图生成失败');
  return res.cover_image;
}

export interface WebMainFaqPayload {
  title: string;
  description?: string | null;
  items: Array<{ question: string; answer: string }>;
  sort_order?: number;
}

export async function getWebMainFaq(): Promise<WebMainFaqPayload> {
  const res = await apiClient.get<WebMainFaqPayload>('/api/web-main-site/me/faq');
  return res as WebMainFaqPayload;
}

export async function updateWebMainFaq(body: WebMainFaqPayload): Promise<WebMainFaqPayload> {
  const res = await apiClient.put<WebMainFaqPayload>('/api/web-main-site/me/faq', body);
  return res as WebMainFaqPayload;
}
