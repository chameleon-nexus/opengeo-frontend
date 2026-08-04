import { apiClient } from './client';

export interface KnowledgeBase {
  id: number;
  name: string;
  description?: string;
  brand_id?: string;  // 品牌ID（字符串，如'philips'）
  status: 'empty' | 'ready' | 'indexing';
  doc_count: number;
  created_at?: string;
  updated_at?: string;
  /** 列表接口 JOIN 主线：关联的 GEO 主线 id */
  geo_workflow_id?: string | null;
  /** 列表接口：品牌名 · 主线创建时间 */
  geo_workflow_label?: string | null;
}

export interface KnowledgeBaseCreate {
  name: string;
  description?: string;
  brand_id?: string;  // 品牌ID（字符串，如'philips'）
}

export interface KnowledgeBaseUpdate {
  name?: string;
  description?: string;
  status?: string;
}

export interface KnowledgeBaseListResponse {
  knowledge_bases: KnowledgeBase[];
  total: number;
}

class KnowledgeBaseAPI {
  /**
   * 获取知识库列表
   */
  async list(brandId?: string): Promise<KnowledgeBaseListResponse> {
    const params = brandId ? { brand_id: brandId } : {};
    return apiClient.get<KnowledgeBaseListResponse>('/api/knowledge-bases/', { params });
  }

  /**
   * 创建知识库
   */
  async create(data: KnowledgeBaseCreate): Promise<KnowledgeBase> {
    return apiClient.post<KnowledgeBase>('/api/knowledge-bases/', data);
  }

  /**
   * 获取知识库详情
   */
  async get(id: number): Promise<KnowledgeBase> {
    return apiClient.get<KnowledgeBase>(`/api/knowledge-bases/${id}`);
  }

  /**
   * 更新知识库
   */
  async update(id: number, data: KnowledgeBaseUpdate): Promise<KnowledgeBase> {
    return apiClient.put<KnowledgeBase>(`/api/knowledge-bases/${id}`, data);
  }

  /**
   * 删除知识库
   */
  async delete(id: number): Promise<void> {
    return apiClient.delete<void>(`/api/knowledge-bases/${id}`);
  }
}

export const knowledgeBaseAPI = new KnowledgeBaseAPI();


