import { apiClient } from './client';
import { getAccessToken } from '../lib/authSession';
import { getActiveSiteId } from '../lib/activeSiteId';
import { RetainedKeyword, ArticleResult, ContentGenerationTask, ArticleTemplate, ContentGenerationBatch } from '../types';
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
  const match = /filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i.exec(cd);
  const filename = match?.[1]?.trim() || fallbackFilename;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = decodeURIComponent(filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 单篇 Word（融媒宝） */
export const downloadArticleDocx = (taskId: string) =>
  triggerBlobDownload(`/api/content/generation/${encodeURIComponent(taskId)}/export.docx`, `${taskId}.docx`);

/** 批次 ZIP（每篇一个 docx） */
export const downloadBatchZip = (batchId: string) =>
  triggerBlobDownload(`/api/content/batch/${encodeURIComponent(batchId)}/export.zip`, `${batchId}.zip`);

/** 优化任务周期 · 范文 / 仿写 ZIP（融媒宝） */
export const downloadOptimizationCycleBranchZip = (
  taskId: string,
  cycleNumber: number,
  branch: 'fanwen' | 'fangxie',
) =>
  triggerBlobDownload(
    `/api/optimization-tasks/${encodeURIComponent(taskId)}/cycles/${cycleNumber}/export/${branch}.zip`,
    `${branch}_${taskId}_C${cycleNumber}.zip`,
  );

// 获取保留的词条
export const getRetainedKeywords = async (params: {
  knowledge_base_id: number;
  brand_name: string;
  product_name?: string;
}): Promise<RetainedKeyword[]> => {
  const queryParams = new URLSearchParams();
  queryParams.append('knowledge_base_id', params.knowledge_base_id.toString());
  queryParams.append('brand_name', params.brand_name);
  if (params.product_name) {
    queryParams.append('product_name', params.product_name);
  }
  const response = await apiClient.get<{ keywords: RetainedKeyword[]; total: number }>(`/api/knowledge/retained-keywords?${queryParams.toString()}`);
  return response.keywords || [];
};

// 生成文章（extraction_task_id 为选中的词包，用于关联内容↔词包）
export const generateArticle = async (params: {
  knowledge_base_id: number;
  brand_name: string;
  product_name: string;
  keyword_id: number;
  keyword_text: string;
  kg_type: string;
  extraction_task_id?: string | null;
}): Promise<{ success: boolean; task_id: string; message: string }> => {
  const response = await apiClient.post<{ task_id: string; success: boolean }>('/api/content/generate-article', params);
  return {
    success: response.success !== false,
    task_id: response.task_id,
    message: '文章生成任务已启动'
  };
};

/** 三方媒体发布：可选的已生成文章列表（标题+概要，支持搜索） */
export interface PublishCandidateArticle {
  task_id: string;
  title: string;
  summary: string;
  keyword_text?: string;
  extraction_task_id?: string | null;
  brand_name?: string | null;
  created_at?: string | null;
}

export const getPublishCandidates = async (params?: {
  brand_name?: string;
  search?: string;
  limit?: number;
}): Promise<{ items: PublishCandidateArticle[]; total: number }> => {
  const queryParams = new URLSearchParams();
  if (params?.brand_name) queryParams.append('brand_name', params.brand_name);
  if (params?.search) queryParams.append('search', params.search);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  const qs = queryParams.toString();
  return apiClient.get<{ items: PublishCandidateArticle[]; total: number }>(
    `/api/content/publish-candidates${qs ? `?${qs}` : ''}`
  );
};

// 按词包查询关联的内容创作任务（发稿待办「关联内容」Tab）
export const getContentTasksByExtractionTaskId = async (
  extractionTaskId: string
): Promise<{ tasks: ContentGenerationTask[]; total: number }> => {
  const response = await apiClient.get<{ tasks: ContentGenerationTask[]; total: number; limit: number; offset: number }>(
    '/api/content/tasks-by-extraction',
    { params: { extraction_task_id: extractionTaskId, limit: 50, offset: 0 } }
  );
  return { tasks: response?.tasks ?? [], total: response?.total ?? 0 };
};

// 获取生成历史
export const getGenerationHistory = async (params: {
  brand_name?: string;
  product_name?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  success: boolean;
  data: {
    tasks: ContentGenerationTask[];
    total: number;
    limit: number;
    offset: number;
  };
}> => {
  const queryParams = new URLSearchParams();
  if (params.brand_name) queryParams.append('brand_name', params.brand_name);
  if (params.product_name) queryParams.append('product_name', params.product_name);
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());
  const queryString = queryParams.toString();
  console.log('📋 [API] 请求URL:', `/api/content/generation-history${queryString ? `?${queryString}` : ''}`);
  const response = await apiClient.get<{
    tasks: ContentGenerationTask[];
    total: number;
    limit: number;
    offset: number;
  }>(`/api/content/generation-history${queryString ? `?${queryString}` : ''}`);
  console.log('📋 [API] 响应数据:', response);
  return {
    success: true,
    data: response
  };
};

// 获取生成详情
export const getGenerationDetail = async (taskId: string): Promise<{ data: ContentGenerationTask }> => {
  // apiClient.get 已经处理了 ResponseBase 格式，直接返回 data
  const response = await apiClient.get<ContentGenerationTask>(`/api/content/generation/${taskId}`);
  return { data: response };
};

// 重新生成文章
export const regenerateArticle = async (taskId: string): Promise<{
  success: boolean;
  new_task_id: string;
  message: string;
}> => {
  const response = await apiClient.post<{ new_task_id: string; message: string }>(`/api/content/regenerate/${taskId}`);
  return {
    success: true,
    new_task_id: response.new_task_id,
    message: response.message || '重新生成任务已启动'
  };
};

// ========== 批量生成 API ==========

export const generateBatch = async (params: {
  brand_name?: string;
  core_word?: string;
  product_name?: string;
  promoted_brand?: string;
  extraction_task_id: string;
  pack_type: string;
  keywords: string[];
  template_ids: number[];
  knowledge_base_id?: number | null;
  kg_type?: string | null;
}): Promise<{ batch_id: string; task_ids: string[]; total: number; success: boolean }> => {
  return await apiClient.post<{ batch_id: string; task_ids: string[]; total: number; success: boolean }>('/api/content/generate-batch', params);
};

export const getBatchDetail = async (batchId: string): Promise<{
  batch_id: string;
  tasks: ContentGenerationTask[];
  total: number;
}> => {
  return await apiClient.get<{ batch_id: string; tasks: ContentGenerationTask[]; total: number }>(`/api/content/batch/${batchId}`);
};

export const getBatchHistory = async (params: {
  brand_name?: string;
  search?: string;
  /** 仅 OPT-{id}-* 批次（与优化任务周期内容一致） */
  optimization_task_id?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  batches: ContentGenerationBatch[];
  total: number;
}> => {
  const queryParams = new URLSearchParams();
  if (params.brand_name) queryParams.append('brand_name', params.brand_name);
  if (params.search) queryParams.append('search', params.search);
  if (params.optimization_task_id) queryParams.append('optimization_task_id', params.optimization_task_id);
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
  const qs = queryParams.toString();
  return await apiClient.get<{ batches: ContentGenerationBatch[]; total: number }>(`/api/content/batch-history${qs ? `?${qs}` : ''}`);
};

// ========== 范文模板 API ==========

export const getArticleTemplates = async (params?: {
  is_active?: boolean;
  limit?: number;
  market?: 'domestic' | 'overseas';
}): Promise<{ templates: ArticleTemplate[]; total: number }> => {
  const queryParams = new URLSearchParams();
  if (params?.is_active !== undefined) queryParams.append('is_active', String(params.is_active));
  if (params?.market) queryParams.append('market', params.market);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  const qs = queryParams.toString();
  return await apiClient.get<{ templates: ArticleTemplate[]; total: number }>(`/api/article-templates${qs ? `?${qs}` : ''}`);
};

export const createArticleTemplate = async (data: {
  title: string;
  content: string;
  description?: string;
  prompt_template?: string;
  enricher_hints?: string;
  market?: 'domestic' | 'overseas';
}): Promise<ArticleTemplate> => {
  return await apiClient.post<ArticleTemplate>('/api/article-templates', data);
};

export const updateArticleTemplate = async (id: number, data: {
  title?: string;
  content?: string;
  description?: string;
  prompt_template?: string;
  enricher_hints?: string;
  is_active?: boolean;
  is_default?: boolean;
  market?: 'domestic' | 'overseas';
}): Promise<ArticleTemplate> => {
  return await apiClient.put<ArticleTemplate>(`/api/article-templates/${id}`, data);
};

export const setArticleTemplateDefault = async (id: number): Promise<ArticleTemplate> => {
  return await apiClient.post<ArticleTemplate>(`/api/article-templates/${id}/set-default`, {});
};

export const deleteArticleTemplate = async (id: number): Promise<void> => {
  await apiClient.delete<any>(`/api/article-templates/${id}`);
};
