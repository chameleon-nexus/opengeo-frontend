/**
 * 站点管理 API
 */
import apiClient from './client';

export type SiteKind = 'template' | 'custom';

export interface SiteHostRow {
  id: number;
  host: string;
  is_primary: boolean;
}

export interface SiteRow {
  id: number;
  merchant_id: number;
  site_kind: SiteKind;
  display_name: string;
  template_id: string;
  is_open: boolean;
  site_settings: Record<string, unknown>;
  primary_host: string;
  hosts: SiteHostRow[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SiteTemplateOption {
  id: string;
  name: string;
  description: string;
}

export interface SiteCapabilities {
  allowed_site_kinds: SiteKind[];
  max_per_kind: Partial<Record<SiteKind, number | null>>;
  can_bind_custom_domain: boolean;
  can_assign_to_other_merchant: boolean;
}

export interface MySitesPayload {
  sites: SiteRow[];
  site_capabilities: SiteCapabilities;
}

export interface SiteCreatePayload {
  site_kind: SiteKind;
  display_name: string;
  template_id?: string;
  is_open?: boolean;
  hosts: Array<{ host: string; is_primary?: boolean }>;
  merchant_id?: number;
  site_settings?: Record<string, unknown>;
}

export interface SiteUpdatePayload {
  display_name?: string;
  template_id?: string;
  is_open?: boolean;
  site_settings?: Record<string, unknown>;
  primary_host?: string;
}

export type SiteAssetType =
  | 'logo'
  | 'favicon'
  | 'background'
  | 'company_section'
  | 'customer_logo'
  | 'og_image';

export interface SiteBusinessIntro {
  title: string;
  steps: Array<Record<string, unknown>>;
}

function resolveUploadUrl(url: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL || '').toString();
  if (base && (base.startsWith('http://') || base.startsWith('https://')) && url.startsWith('/')) {
    return base.replace(/\/$/, '') + url;
  }
  return url;
}

const emptyCapabilities: SiteCapabilities = {
  allowed_site_kinds: [],
  max_per_kind: {},
  can_bind_custom_domain: false,
  can_assign_to_other_merchant: false,
};

/** 自定义站创建时勾选「旅游组件」后为 true（见 site_settings.components.travel） */
export {
  siteHasTravelComponent,
  getSiteComponents,
  siteHasContactLegalComponent,
  siteHasContactLegalCms,
  buildCustomSiteSettings,
} from '../lib/siteComponents';
export type { ContactLegalMode, SiteComponents } from '../lib/siteComponents';

export const sitesAPI = {
  async listMine(): Promise<MySitesPayload> {
    const data = await apiClient.get<MySitesPayload>('/api/sites/me');
    return data ?? { sites: [], site_capabilities: emptyCapabilities };
  },

  async getCapabilities(): Promise<SiteCapabilities> {
    return apiClient.get<SiteCapabilities>('/api/sites/me/capabilities');
  },

  async listTemplates(): Promise<SiteTemplateOption[]> {
    const data = await apiClient.get<SiteTemplateOption[]>('/api/sites/templates');
    return Array.isArray(data) ? data : [];
  },

  async get(siteId: number): Promise<SiteRow> {
    return apiClient.get<SiteRow>(`/api/sites/${siteId}`);
  },

  async create(body: SiteCreatePayload): Promise<SiteRow> {
    return apiClient.post<SiteRow>('/api/sites', body);
  },

  async update(siteId: number, body: SiteUpdatePayload): Promise<SiteRow> {
    return apiClient.put<SiteRow>(`/api/sites/${siteId}`, body);
  },

  async delete(siteId: number): Promise<void> {
    await apiClient.delete(`/api/sites/${siteId}`);
  },

  async uploadAsset(
    siteId: number,
    file: File,
    assetType: SiteAssetType = 'logo',
  ): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('asset_type', assetType);
    const res = await apiClient.upload<{ url: string }>(`/api/sites/${siteId}/upload`, formData);
    if (!res?.url) throw new Error('上传失败');
    return resolveUploadUrl(res.url);
  },

  /** 从 site_settings 读取业务介绍（无则 null） */
  getBusinessIntroFromSite(site: SiteRow): SiteBusinessIntro | null {
    const bi = site.site_settings?.business_intro;
    if (!bi || typeof bi !== 'object') return null;
    const row = bi as SiteBusinessIntro;
    if (!row.title && (!row.steps || row.steps.length === 0)) return null;
    return {
      title: row.title || '我们的服务',
      steps: Array.isArray(row.steps) ? row.steps : [],
    };
  },
};

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

export const siteContactSubmissionsAPI = {
  async list(siteId: number, skip = 0, limit = 20): Promise<ContactSubmissionsResult> {
    const data = await apiClient.get<ContactSubmissionsResult>(
      `/api/sites/${siteId}/contact-submissions?skip=${skip}&limit=${limit}`,
    );
    return data ?? { total: 0, items: [] };
  },

  async markRead(siteId: number, submissionId: number): Promise<void> {
    await apiClient.put(`/api/sites/${siteId}/contact-submissions/${submissionId}/read`, {});
  },

  async delete(siteId: number, submissionId: number): Promise<void> {
    await apiClient.delete(`/api/sites/${siteId}/contact-submissions/${submissionId}`);
  },
};
