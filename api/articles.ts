/**
 * 文章管理相关API
 */

import apiClient from './client';

// ========== 类型定义 ==========

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: {
    name: string;
    avatar: string;
  };
  date: string;
  coverImage: string;
  tags: string[];
  status: 'published' | 'draft';
}

export interface Article {
  id: string;  // 前端使用的ID（对应后端的 article_id）
  article_id?: string;  // 后端返回的 article_id（UUID）
  title: string;
  subtitle: string;
  category: string;
  category_id?: number | null;  // 所属分类ID，编辑时回填
  column_id?: number | null;  // 所属栏目ID，编辑时回填
  image: string;
  content: string;
  author: string;
  date: string;
}

export interface ArticleCreateRequest {
  article_id?: string;
  title: string;
  excerpt?: string;
  content: string;
  author_name: string;
  author_avatar?: string;
  cover_image?: string;
  tags?: string[];
  category?: string;
  category_id?: number | null;
  column_id?: number | null;
  status?: 'published' | 'draft';
  publish_date?: string;
}

export interface ArticleUpdateRequest {
  title?: string;
  excerpt?: string;
  content?: string;
  author_name?: string;
  author_avatar?: string;
  cover_image?: string;
  tags?: string[];
  category?: string;
  category_id?: number | null;
  column_id?: number | null;
  status?: 'published' | 'draft';
  publish_date?: string;
}

export interface ArticleListParams {
  status?: 'published' | 'draft';
  tag?: string;
  skip?: number;
  limit?: number;
  format?: 'blog' | 'list';
}

// ========== API 函数 ==========

export const articlesAPI = {
  /**
   * 获取文章列表
   */
  async listArticles(params: ArticleListParams = {}): Promise<BlogPost[] | Article[]> {
    const { status, tag, skip = 0, limit = 100, format = 'blog' } = params;
    const queryParams = new URLSearchParams();
    
    if (status) queryParams.append('status', status);
    if (tag) queryParams.append('tag', tag);
    queryParams.append('skip', skip.toString());
    queryParams.append('limit', limit.toString());
    queryParams.append('format', format);
    
    // apiClient.request 已经提取了 data 字段，直接返回
    return apiClient.request<BlogPost[] | Article[]>(`/api/articles?${queryParams.toString()}`);
  },

  /**
   * 获取所有标签
   */
  async getTags(): Promise<string[]> {
    return apiClient.request<string[]>('/api/articles/tags');
  },

  /**
   * 获取文章详情
   */
  async getArticle(articleId: string, format: 'blog' | 'list' = 'blog'): Promise<BlogPost | Article> {
    return apiClient.request<BlogPost | Article>(`/api/articles/${articleId}?format=${format}`);
  },

  /**
   * 创建文章
   */
  async createArticle(articleData: ArticleCreateRequest): Promise<Article> {
    return apiClient.request<Article>('/api/articles', {
      method: 'POST',
      body: JSON.stringify(articleData),
    });
  },

  /**
   * 更新文章
   */
  async updateArticle(articleId: string, articleData: ArticleUpdateRequest): Promise<Article> {
    return apiClient.request<Article>(`/api/articles/${articleId}`, {
      method: 'PUT',
      body: JSON.stringify(articleData),
    });
  },

  /**
   * 删除文章
   */
  async deleteArticle(articleId: string): Promise<void> {
    await apiClient.request<void>(`/api/articles/${articleId}`, {
      method: 'DELETE',
    });
  },

  /**
   * 生成封面图（基于文章标题）
   */
  async generateCoverImage(articleId: string): Promise<{ cover_image: string }> {
    return apiClient.request<{ cover_image: string }>(`/api/articles/${articleId}/generate-cover`, {
      method: 'POST',
    });
  },

  /**
   * 生成文案内容（基于文章标题和知识库）
   */
  async generateContent(articleId: string, knowledgeBaseIds: number[]): Promise<{ content: string }> {
    const queryParams = new URLSearchParams();
    knowledgeBaseIds.forEach(id => queryParams.append('knowledge_base_ids', id.toString()));
    return apiClient.request<{ content: string }>(`/api/articles/${articleId}/generate-content?${queryParams.toString()}`, {
      method: 'POST',
    });
  },
};
