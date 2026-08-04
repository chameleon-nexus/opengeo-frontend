/**
 * 语义SEO相关API
 */

import apiClient from './client';
import { SemanticSEOTask, SemanticEntityRelation, CooccurrenceWord } from '../types';

// ========== 类型定义 ==========

export interface SemanticSEOTaskCreateRequest {
  keyword: string;
  brand_id?: string;
}

export interface SemanticSEOTaskUpdateRequest {
  status?: string;
  total_relations?: number;
  total_cooccurrence_words?: number;
}

export interface SemanticEntityRelationCreateRequest {
  source: string;
  relation: string;
  target: string;
}

export interface CooccurrenceWordCreateRequest {
  word: string;
}

export interface SemanticSEOTaskDetailResponse {
  task: SemanticSEOTask;
  relations: SemanticEntityRelation[];
  cooccurrence_words: CooccurrenceWord[];
}

export interface SemanticSEOTaskBatchCreateRequest {
  task_id: string;
  keyword: string;
  brand_id?: string;
  relations: SemanticEntityRelationCreateRequest[];
  cooccurrence_words: CooccurrenceWordCreateRequest[];
}

// ========== SemanticSEO APIs ==========

export const semanticSEOAPI = {
  /**
   * 创建语义SEO任务
   */
  createTask: async (data: SemanticSEOTaskCreateRequest): Promise<SemanticSEOTask> => {
    return apiClient.post<SemanticSEOTask>('/api/semantic-seo/tasks', data);
  },

  /**
   * 创建语义下钻任务（启动工作流）
   */
  createDrillTask: async (
    name?: string,
    keyword?: string, 
    brandId?: string, 
    knowledgeBaseId?: number,
    crawlTaskId?: string,
    entityModel?: string,
    relationModel?: string,
    doubaoApiKey?: string
  ): Promise<{ task_id: string }> => {
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (keyword) params.append('keyword', keyword);
    if (brandId) params.append('brand_id', brandId);
    if (knowledgeBaseId) params.append('knowledge_base_id', String(knowledgeBaseId));
    if (crawlTaskId) params.append('crawl_task_id', crawlTaskId);
    if (entityModel) params.append('entity_model', entityModel);
    if (relationModel) params.append('relation_model', relationModel);
    if (doubaoApiKey) params.append('doubao_api_key', doubaoApiKey);
    
    return apiClient.post<{ task_id: string }>(`/api/semantic-seo/tasks/create-drill?${params.toString()}`);
  },

  /**
   * 获取语义SEO任务列表
   */
  listTasks: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<SemanticSEOTask[]> => {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', String(params.skip));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    
    const query = queryParams.toString();
    return apiClient.get<SemanticSEOTask[]>(`/api/semantic-seo/tasks${query ? `?${query}` : ''}`);
  },

  /**
   * 获取语义SEO任务详情（包含关系和共现词表）
   */
  getTask: async (taskId: string): Promise<SemanticSEOTaskDetailResponse> => {
    return apiClient.get<SemanticSEOTaskDetailResponse>(`/api/semantic-seo/tasks/${taskId}`);
  },

  /**
   * 更新语义SEO任务
   */
  updateTask: async (taskId: string, data: SemanticSEOTaskUpdateRequest): Promise<SemanticSEOTask> => {
    return apiClient.put<SemanticSEOTask>(`/api/semantic-seo/tasks/${taskId}`, data);
  },

  /**
   * 删除语义SEO任务
   */
  deleteTask: async (taskId: string): Promise<void> => {
    return apiClient.delete<void>(`/api/semantic-seo/tasks/${taskId}`);
  },

  /**
   * 添加实体关系
   */
  addRelation: async (taskId: string, data: SemanticEntityRelationCreateRequest): Promise<SemanticEntityRelation> => {
    return apiClient.post<SemanticEntityRelation>(`/api/semantic-seo/tasks/${taskId}/relations`, data);
  },

  /**
   * 获取实体关系列表
   */
  listRelations: async (taskId: string, params?: {
    skip?: number;
    limit?: number;
  }): Promise<SemanticEntityRelation[]> => {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', String(params.skip));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    
    const query = queryParams.toString();
    return apiClient.get<SemanticEntityRelation[]>(`/api/semantic-seo/tasks/${taskId}/relations${query ? `?${query}` : ''}`);
  },

  /**
   * 添加共现词
   */
  addCooccurrenceWord: async (taskId: string, data: CooccurrenceWordCreateRequest): Promise<CooccurrenceWord> => {
    return apiClient.post<CooccurrenceWord>(`/api/semantic-seo/tasks/${taskId}/cooccurrence-words`, data);
  },

  /**
   * 获取共现词列表
   */
  getCooccurrenceWords: async (taskId: string, params?: {
    skip?: number;
    limit?: number;
  }): Promise<CooccurrenceWord[]> => {
    const queryParams = new URLSearchParams();
    if (params?.skip) queryParams.append('skip', String(params.skip));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    
    const query = queryParams.toString();
    return apiClient.get<CooccurrenceWord[]>(`/api/semantic-seo/tasks/${taskId}/cooccurrence-words${query ? `?${query}` : ''}`);
  },

  /**
   * 批量创建任务、关系和共现词
   */
  batchCreate: async (data: SemanticSEOTaskBatchCreateRequest): Promise<SemanticSEOTaskDetailResponse> => {
    return apiClient.post<SemanticSEOTaskDetailResponse>('/api/semantic-seo/tasks/batch', data);
  },
};
