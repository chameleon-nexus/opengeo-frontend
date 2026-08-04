import { apiClient } from './client';

async function downloadBlobResponse(response: Response, fallbackFilename: string): Promise<void> {
  if (!response.ok) {
    let detail = '下载失败';
    try {
      const error = await response.json();
      detail = error.detail || error.message || detail;
    } catch {
      // 保留默认错误
    }
    throw new Error(typeof detail === 'string' ? detail : '下载失败');
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const utf8Name = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const asciiName = disposition.match(/filename="([^"]+)"/i);
  const filename = utf8Name ? decodeURIComponent(utf8Name[1]) : asciiName?.[1] || fallbackFilename;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export interface Document {
  id: number;
  knowledge_base_id: number | null;
  original_filename: string;
  file_type: string;
  file_size: number;
  chunks_count: number;
  status: string;
  upload_time: string;
}

export interface UploadResponse {
  success: boolean;
  document_id: number;
  chunks_count: number;
  message: string;
}

export interface ExtractRequest {
  knowledge_base_id: number;
  query: string;
  name?: string;  // 任务名称（用户自定义，便于识别）
  top_k?: number;
  brand_name?: string;  // 品牌名称（用于历史记录）
  product_name?: string;  // 产品名称（用于历史记录）
  model_selection?: string;  // 模型选择（前端传入，后端统一使用豆包）
  model_type?: string;  // 模型类型: semantic 或 traditional
}

export interface ExtractResponse {
  success: boolean;
  keywords?: Array<{text: string; score: number}>;  // 同步返回时才有
  count?: number;  // 同步返回时才有
  task_id: string;  // 任务ID（异步模式）
  stream_url?: string;  // SSE流式URL（异步模式）
}

export interface ExpandRequest {
  knowledge_base_id: number;
  selected_keywords: string[];
  brand_name: string;
  product_name: string;
  expand_dimensions?: string[];
  top_k?: number;
}

export interface LongTailKeyword {
  id: number;
  text: string;
  base_keyword: string;
  dimension: string;
  score: number;
  volume: number;
  competition: string;
}

export interface ExpandResponse {
  success: boolean;
  long_tail_keywords: LongTailKeyword[];
  total_count: number;
  base_keywords_count: number;
}

export interface ExtractionTask {
  id: string;  // task_id
  name?: string;  // 任务名称（用户自定义，便于识别）
  date: string;  // 日期时间（ISO格式）
  keyword: string;  // 查询关键词
  /** 后端 to_dict 展示名：知识库 (RAG)、词条生成、手动录入、品牌解析、全网爬取 (Crawl) */
  source: string;
  /** semantic | semantic_v2 | traditional | word_expand | manual | brand_parse */
  model_type?: string;
  status: string;  // 状态：Completed, Processing, Failed
  count: number;  // 关键词数量
  brand_name?: string;
  product_name?: string;
  knowledge_base_id?: number;
  created_at?: string;
  completed_at?: string;
}

export interface ExtractionHistoryResponse {
  tasks: ExtractionTask[];
  total: number;
  skip: number;
  limit: number;
}

export interface NextIterationRequest {
  knowledge_base_id: number;
  query: string;
  top_k?: number;
  brand_name: string;
  product_name?: string;
  retained_keywords: string[];  // 当前选中的关键词文本列表
  iteration: number;
}

export interface NextIterationResponse {
  new_keywords: Array<{text: string; score: number}>;
  retained_keywords: Array<{text: string; score: number}>;
  iteration: number;
  task_id: string;
}

class KnowledgeAPI {
  /**
   * 上传文档
   */
  async upload(file: File, knowledgeBaseId?: number): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (knowledgeBaseId) {
      formData.append('knowledge_base_id', knowledgeBaseId.toString());
    }
    
    const url = `${apiClient['baseURL']}/api/knowledge/upload`;
    const headers: HeadersInit = {};
    
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 添加豆包API Key用于向量化
    const doubaoApiKey = localStorage.getItem('geo_ai_key');
    if (doubaoApiKey) {
      headers['X-Doubao-API-Key'] = doubaoApiKey;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '上传失败');
    }
    
    return response.json();
  }

  /**
   * 获取文档列表
   */
  async list(knowledgeBaseId?: number): Promise<Document[]> {
    const params = knowledgeBaseId ? `?knowledge_base_id=${knowledgeBaseId}` : '';
    const result = await apiClient.get<Document[]>(`/api/knowledge/list${params}`);
    // 确保返回数组
    return Array.isArray(result) ? result : [];
  }

  /**
   * 删除文档
   */
  async delete(documentId: number): Promise<any> {
    return apiClient.delete<any>(`/api/knowledge/${documentId}`);
  }

  /** 经后端鉴权代理下载私有 OSS 中的原始文件。 */
  async downloadDocument(documentId: number, fallbackFilename: string): Promise<void> {
    const baseURL = (apiClient as { baseURL?: string }).baseURL || '';
    const headers: HeadersInit = {};
    const token = localStorage.getItem('auth_token');
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${baseURL}/api/knowledge/documents/${documentId}/download`, { headers });
    await downloadBlobResponse(response, fallbackFilename);
  }

  /**
   * 从知识库提取关键词
   */
  async extract(request: ExtractRequest): Promise<any> {
    return apiClient.post<any>('/api/knowledge/extract', request);
  }

  /**
   * 扩展长尾关键词
   */
  async expand(request: ExpandRequest): Promise<ExpandResponse> {
    return apiClient.post<ExpandResponse>('/api/knowledge/expand', request);
  }

  /**
   * 造句扩词：前缀+核心词+行业+后缀 组合生成长尾问题（纯组合，不用AI），用于长尾问题二次生成
   */
  async sentenceExpand(params: {
    core_words: string[];
    prefix_words?: string[];
    industry_words?: string[];
    suffix_words?: string[];
    max_per_word?: number;
  }): Promise<{ text: string; source_keyword: string }[]> {
    const res = await apiClient.post<{ code: number; data?: { questions: { text: string; source_keyword: string }[] } }>(
      '/api/knowledge/sentence-expand',
      params
    );
    if (res?.data?.questions) return res.data.questions;
    return [];
  }

  /**
   * 将词条生成（造句拓词）结果保存为关键词列表（词包），出现在词包蒸馏任务列表中
   */
  async saveWordExpand(params: { name?: string; phrases: string[]; core_words?: string[] }): Promise<{ task_id: string; name: string; count: number }> {
    const res = await apiClient.post<{ task_id: string; name: string; count: number }>(
      '/api/knowledge/save-word-expand',
      params
    );
    return res;
  }

  /**
   * 手动录入关键词保存为词包
   */
  async saveManualKeywords(params: { name?: string; keywords: string[] }): Promise<{ task_id: string; name: string; count: number }> {
    return apiClient.post<{ task_id: string; name: string; count: number }>(
      '/api/knowledge/save-manual-keywords',
      params
    );
  }

  /**
   * 查询词条提炼历史记录
   */
  async getExtractionHistory(params?: {
    brand_name?: string;
    product_name?: string;
    knowledge_base_id?: number;
    task_source?: string;
    task_model_type?: string;
    search?: string;
    skip?: number;
    limit?: number;
  }): Promise<ExtractionHistoryResponse> {
    const queryParams = new URLSearchParams();
    if (params?.brand_name) queryParams.append('brand_name', params.brand_name);
    if (params?.product_name) queryParams.append('product_name', params.product_name);
    if (params?.knowledge_base_id) queryParams.append('knowledge_base_id', params.knowledge_base_id.toString());
    if (params?.task_source) queryParams.append('task_source', params.task_source);
    if (params?.task_model_type) queryParams.append('task_model_type', params.task_model_type);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return apiClient.get<ExtractionHistoryResponse>(`/api/knowledge/extraction-history${query ? `?${query}` : ''}`);
  }

  /**
   * 获取词条提炼任务的完整结果（支持语义模型和传统模型）
   */
  /**
   * 逻辑删除词包（后端软删，列表不再展示）
   */
  async deleteExtractionTask(taskId: string): Promise<{ task_id: string }> {
    return apiClient.delete<{ task_id: string }>(`/api/knowledge/extraction-tasks/${taskId}`);
  }

  async getExtractionTaskKeywords(taskId: string): Promise<{
    task_id: string;
    model_type?: string;  // 模型类型: semantic | traditional | semantic_v2 | word_expand
    // 语义模型字段
    semantic_keywords?: Array<{text: string; score: number}>;
    longtail_questions?: Array<{text: string; source_keyword: string}>;
    semantic_extension_questions?: Array<{text: string; source_keyword: string}>;
    // 语义模型2 字段（5 Tab）
    brand_pack_questions?: string[];
    qa_pack_questions?: string[];
    competitor_pack_questions?: string[];
    // 传统模型字段
    core_keywords?: Array<string | {text: string; score?: number}>;
    positive_questions?: string[];
    negative_questions?: string[];
    brand_questions?: string[];
    // 向后兼容字段
    keywords?: Array<{text: string; score: number}>;
    keywords_count: number;
  }> {
    return apiClient.get(`/api/knowledge/extraction-tasks/${taskId}/keywords`);
  }

  /**
   * 下一轮迭代：保存保留关键词并生成新关键词
   */
  async nextIteration(request: NextIterationRequest): Promise<NextIterationResponse> {
    return apiClient.post<NextIterationResponse>('/api/knowledge/keywords/next-iteration', request);
  }

  /**
   * 知识库检索测试
   */
  async testSearch(knowledgeBaseId: number, query: string, topK: number = 5): Promise<{
    results: Array<{id: number; text: string; score: number; metadata?: any}>;
    total: number;
    query: string;
  }> {
    const url = `${apiClient['baseURL']}/api/knowledge/search/test`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // 添加豆包API Key用于向量化
    const doubaoApiKey = localStorage.getItem('geo_ai_key');
    if (doubaoApiKey) {
      headers['X-Doubao-API-Key'] = doubaoApiKey;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        knowledge_base_id: knowledgeBaseId,
        query: query,
        top_k: topK
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || '检索测试失败');
    }
    
    const result = await response.json();
    return result.data;
  }

  /**
   * 获取最新一次词条提炼任务的核心关键词
   */
  async getLatestExtractionCoreKeywords(params?: {
    brand_name?: string;
    product_name?: string;
    knowledge_base_id?: number;
  }): Promise<{
    core_keywords: Array<{text: string; score: number}>;
    task_id: string | null;
    brand_name?: string;
    product_name?: string;
    knowledge_base_id?: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.brand_name) queryParams.append('brand_name', params.brand_name);
    if (params?.product_name) queryParams.append('product_name', params.product_name);
    if (params?.knowledge_base_id) queryParams.append('knowledge_base_id', params.knowledge_base_id.toString());
    const queryString = queryParams.toString();
    return apiClient.get<{
      core_keywords: Array<{text: string; score: number}>;
      task_id: string | null;
      brand_name?: string;
      product_name?: string;
      knowledge_base_id?: number;
    }>(`/api/knowledge/latest-extraction-core-keywords${queryString ? `?${queryString}` : ''}`);
  }
}

export const knowledgeAPI = new KnowledgeAPI();

