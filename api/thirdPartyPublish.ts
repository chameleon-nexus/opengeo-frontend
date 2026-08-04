import { apiClient } from './client';
import { getAccessToken } from '../lib/authSession';
import { getActiveSiteId } from '../lib/activeSiteId';
import type { ArticleMediaTierInfo, MediaTier } from '../constants/mediaPublishTier';
import { getApiOrigin } from '../lib/apiOrigin';

const API_BASE_URL = getApiOrigin();

function buildDownloadHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (typeof window !== 'undefined') {
    const hn = window.location.hostname?.toLowerCase();
    if (hn && hn !== 'localhost' && hn !== '127.0.0.1') {
      headers['X-Site-Host'] = window.location.hostname;
    } else {
      const devHost = import.meta.env.VITE_DEV_SUBSITE_HOST || 'www.htsjgeo.com';
      if (devHost) headers['X-Site-Host'] = devHost;
    }
  }
  const siteId = getActiveSiteId();
  if (siteId != null) headers['X-Site-Id'] = String(siteId);
  return headers;
}

async function triggerBlobDownload(endpoint: string, fallbackFilename: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: buildDownloadHeaders(),
  });
  if (!res.ok) {
    let detail = '下载失败';
    try {
      const j = await res.json();
      detail = j.detail || j.message || detail;
    } catch {
      detail = (await res.text()).slice(0, 200) || detail;
    }
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }
  const blob = await res.blob();
  const cd = res.headers.get('Content-Disposition') || '';
  const m = /filename="?([^";\n]+)"?/.exec(cd);
  const filename = m?.[1] || fallbackFilename;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ThirdPartyPublishItem {
  id: number;
  name: string;
  type: string;
  keyword: string;
  avatar: string;
  extraction_task_id?: string | null;
  workflow_id?: string | null;
  /** 创建时勾选的内容生成任务 ID（新流程） */
  content_generation_task_ids?: string[];
  /** 勾选的文章篇数 */
  selected_article_count?: number;
  count: number;
  published: number;
  status: string;
  time: string;
  created_at?: string;
  /** 本任务绑定的媒体名称 */
  mediaWhitelistLabels?: string[];
  mediaWhitelistSummary?: string;
  defaultMediaTier?: MediaTier | null;
}

export interface ThirdPartyPublishListResult {
  items: ThirdPartyPublishItem[];
  total: number;
  page: number;
  page_size: number;
}

/** 分页获取第三方媒体发布任务列表 */
export async function getThirdPartyPublishList(params?: {
  page?: number;
  page_size?: number;
  market?: 'domestic' | 'overseas';
  workflow_id?: string;
}): Promise<ThirdPartyPublishListResult> {
  const data = await apiClient.get<ThirdPartyPublishListResult>('/api/third-party', {
    params: {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? 10,
      market: params?.market ?? 'domestic',
      ...(params?.workflow_id ? { workflow_id: params.workflow_id } : {}),
    },
  });
  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    page_size: data?.page_size ?? 10,
  };
}

/** 创建第三方媒体发布任务（勾选已生成文章 + 媒体发布数量/篇） */
export type ThirdPartyPublishMode = 'bundle' | 'per_media';

export interface CreateThirdPartyPublishResult {
  item?: ThirdPartyPublishItem;
  items?: ThirdPartyPublishItem[];
  count?: number;
}

/** 创建第三方媒体发布任务 */
export async function createThirdPartyPublishTask(params: {
  content_generation_task_ids: string[];
  article_count: number;
  market?: 'domestic' | 'overseas';
  media_whitelist_ids?: number[] | null;
  /** per_media：文章×媒体笛卡尔积，每种组合各一条任务（手动发布） */
  publish_mode?: ThirdPartyPublishMode;
  /** 驾驶舱关联优化任务，用于免审核配置 */
  optimization_task_id?: string | null;
  workflow_id?: string | null;
}): Promise<CreateThirdPartyPublishResult> {
  const data = await apiClient.post<CreateThirdPartyPublishResult>('/api/third-party', {
    ...params,
    market: params.market ?? 'domestic',
    media_whitelist_ids: params.media_whitelist_ids ?? undefined,
    publish_mode: params.publish_mode ?? 'bundle',
    optimization_task_id: params.optimization_task_id ?? undefined,
    workflow_id: params.workflow_id ?? undefined,
  });
  return data as CreateThirdPartyPublishResult;
}

/** 发稿待办：该发布任务已选文章的标题、概要、全文 */
export async function getThirdPartySelectedArticles(publishId: number): Promise<{
  items: Array<{
    task_id: string;
    title: string;
    summary: string;
    keyword_text?: string;
    generated_article?: string;
    published?: boolean;
  } & ArticleMediaTierInfo>;
  default_media_tier?: MediaTier | null;
  workflow_media_tier?: MediaTier | null;
}> {
  const data = await apiClient.get<{
    items: Array<{
      task_id: string;
      title: string;
      summary: string;
      keyword_text?: string;
      generated_article?: string;
      published?: boolean;
    } & ArticleMediaTierInfo>;
    default_media_tier?: MediaTier | null;
    workflow_media_tier?: MediaTier | null;
  }>(`/api/third-party/${publishId}/selected-articles`);
  return {
    items: data?.items ?? [],
    default_media_tier: data?.default_media_tier ?? null,
    workflow_media_tier: data?.workflow_media_tier ?? null,
  };
}

/** 发稿待办：将选中文章标记为已发布 */
export async function markThirdPartyArticlesPublished(
  publishId: number,
  taskIds: string[],
): Promise<{ marked_task_ids?: string[]; status?: string; published_count?: number; task?: ThirdPartyPublishItem }> {
  const data = await apiClient.post<{
    marked_task_ids?: string[];
    status?: string;
    published_count?: number;
    task?: ThirdPartyPublishItem;
  }>(`/api/third-party/${publishId}/articles/mark-published`, {
    task_ids: taskIds,
  });
  return data ?? {};
}

/** 更新第三方媒体发布任务（状态或批次媒体档） */
export async function updateThirdPartyPublishTask(
  taskId: number,
  payload: {
    status?: string;
    default_media_tier?: MediaTier | null;
    media_whitelist_ids?: number[];
  },
): Promise<ThirdPartyPublishItem> {
  const body: Record<string, unknown> = {};
  if (payload.status !== undefined) body.status = payload.status;
  if (payload.default_media_tier !== undefined) {
    body.default_media_tier = payload.default_media_tier ?? '';
  }
  if (payload.media_whitelist_ids !== undefined) {
    body.media_whitelist_ids = payload.media_whitelist_ids;
  }
  const data = await apiClient.patch<ThirdPartyPublishItem>(`/api/third-party/${taskId}`, body);
  return data as ThirdPartyPublishItem;
}

/** 更新第三方媒体发布任务状态（商户前台：已生成→待发布） */
export async function updateThirdPartyPublishStatus(
  taskId: number,
  status: string,
  opts?: { media_whitelist_ids?: number[] }
): Promise<ThirdPartyPublishItem> {
  return updateThirdPartyPublishTask(taskId, {
    status,
    media_whitelist_ids: opts?.media_whitelist_ids,
  });
}

/** 导出本发稿任务全部文章 ZIP */
export async function downloadThirdPartyPublishZip(publishId: number): Promise<void> {
  await triggerBlobDownload(
    `/api/third-party/${publishId}/export.zip`,
    `publish_${publishId}.zip`,
  );
}

/** 删除发稿任务 */
export async function deleteThirdPartyPublishTask(taskId: number): Promise<void> {
  await apiClient.delete(`/api/third-party/${taskId}`);
}

/** 更新本任务内文章正文或单篇媒体档 */
export async function updateThirdPartyPublishArticle(
  publishId: number,
  cgTaskId: string,
  payload: {
    generated_article?: string;
    media_tier?: MediaTier | null;
    clear_media_tier?: boolean;
  },
): Promise<ArticleMediaTierInfo & { task_id?: string }> {
  const body: Record<string, unknown> = {};
  if (payload.generated_article !== undefined) {
    body.generated_article = payload.generated_article;
  }
  if (payload.clear_media_tier) {
    body.clear_media_tier = true;
  } else if (payload.media_tier) {
    body.media_tier = payload.media_tier;
  }
  const data = await apiClient.patch<ArticleMediaTierInfo & { task_id?: string }>(
    `/api/third-party/${publishId}/articles/${encodeURIComponent(cgTaskId)}`,
    body,
  );
  return data ?? {};
}

/** 从本任务移除一篇文章 */
export async function removeThirdPartyPublishArticle(
  publishId: number,
  cgTaskId: string,
): Promise<{ publish_task_deleted?: boolean }> {
  const data = await apiClient.delete<{ publish_task_deleted?: boolean }>(
    `/api/third-party/${publishId}/articles/${encodeURIComponent(cgTaskId)}`,
  );
  return data ?? {};
}

/** 上传 docx 追加到本发稿批次（不覆盖已有文章） */
export async function importThirdPartyPublishDocxFiles(
  publishId: number,
  files: File[],
): Promise<{ imported_task_ids?: string[]; errors?: string[] }> {
  const fd = new FormData();
  for (const file of files) {
    fd.append('files', file);
  }
  const data = await apiClient.upload<{ imported_task_ids?: string[]; errors?: string[] }>(
    `/api/third-party/${publishId}/import.docx`,
    fd,
  );
  return data ?? {};
}
