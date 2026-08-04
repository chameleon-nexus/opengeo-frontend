/**
 * 子站公开 API：站点配置与文章（根据请求 Host 由后端解析商户）
 */

import apiClient from './client';

export interface SiteConfig {
  company_name: string;
  contact_email: string;
  site_title: string;
  site_description: string;
  logo_url: string;
  slogan: string;
  theme: string;
  privacy_policy_html: string;
  terms_of_service_html: string;
  /** ICP 备案号，底部可点击跳转 beian.miit.gov.cn */
  icp_number?: string;
  /** 公安备案号，底部可点击跳转 beian.mps.gov.cn */
  police_number?: string;
  /** 联系电话 */
  phone?: string;
  /** 公司地址 */
  address?: string;
  /** 公司简介（关于我们页） */
  company_intro?: string;
  /** 联系二维码图片 URL（关于我们页） */
  contact_qr_code_url?: string;
  /** 首页背景图 URL（未配置时子站使用默认图） */
  hero_background_url?: string;
  /** 首页背景图是否显示蒙版 */
  hero_show_mask?: boolean;
  /** 首页背景图上文字颜色：white | black */
  hero_text_color?: 'white' | 'black';
  /** 站点 SEO 关键词 */
  keywords?: string[];
  /** 前台首页是否显示采集用户信息表单 */
  show_contact_form?: boolean;
  /** 子站 FAQ（后台配置，无则 null） */
  faq?: {
    title: string;
    description?: string;
    items: Array<{ question: string; answer: string }>;
  } | null;
  /** 子站栏目树（父+子，页头导航用） */
  columns?: Array<{ id: number; name: string; children: Array<{ id: number; name: string }> }>;
  /** 子站文章分类（首页资讯 tab 用） */
  categories?: Array<{ id: number; name: string }>;
  /** 子站公司业务简介（后台配置，无则 null） */
  business_intro?: {
    title: string;
    steps: Array<{
      id?: string;
      title: string;
      description: string;
      detailTitle?: string;
      detailDescription?: string;
      backgroundImage?: string;
      detailImage?: string;
      gradient?: string;
      buttonText?: string;
      buttonUrl?: string;
    }>;
  } | null;
}

export async function getSiteConfig(): Promise<SiteConfig> {
  const data = await apiClient.get<SiteConfig>('/api/public/site-config');
  if (!data) throw new Error('获取站点配置失败');
  return data;
}

export interface PublicBlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: { name: string; avatar: string };
  date: string;
  coverImage: string;
  tags: string[];
  status: string;
  category?: string;
}

export interface ArticlesByCategoryGroup {
  name: string;
  articles: PublicBlogPost[];
}

export async function getArticlesByCategory(perCategory: number = 6): Promise<ArticlesByCategoryGroup[]> {
  const data = await apiClient.get<{ categories: ArticlesByCategoryGroup[] }>(
    `/api/public/articles-by-category?per_category=${perCategory}`
  );
  return data?.categories ?? [];
}

export async function getPublicArticles(params?: { status?: string; column_id?: number; skip?: number; limit?: number }): Promise<PublicBlogPost[]> {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.column_id != null) q.set('column_id', String(params.column_id));
  if (params?.skip != null) q.set('skip', String(params.skip));
  if (params?.limit != null) q.set('limit', String(params.limit));
  const data = await apiClient.get<PublicBlogPost[]>(`/api/public/articles?${q.toString()}`);
  return Array.isArray(data) ? data : [];
}

export async function getPublicArticle(articleId: string): Promise<PublicBlogPost & { json_ld_schema?: unknown }> {
  const data = await apiClient.get<PublicBlogPost & { json_ld_schema?: unknown }>(`/api/public/articles/${articleId}`);
  if (!data) throw new Error('文章不存在或未发布');
  return data;
}
