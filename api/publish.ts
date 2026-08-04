import { apiClient } from './client';

export interface SocialAccount {
  id: number | null;
  user_id?: number;
  platform: string;
  platform_user_id?: string;
  nickname?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  authType?: string;
  postizIdentifier?: string | null;
  postizIntegrationId?: string | null;
  displayName?: string | null;
  /** 是否已完成授权（OAuth 或凭证绑号） */
  authorized?: boolean;
}

export interface PublishRecord {
  id: number;
  user_id: number;
  content_generation_task_id: string;
  social_media_account_id: number;
  status: string;
  platform_article_id?: string;
  published_at?: string;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
  account_platform?: string;
  account_nickname?: string;
  article_preview?: string;
  keyword_text?: string;
  /** 网易号等平台状态码 */
  platform_status?: number;
  platform_status_label?: string;
}

/** 获取当前用户的自媒体授权账号列表（不含 token） */
export const getSocialAccounts = async (): Promise<SocialAccount[]> => {
  const data = await apiClient.get<{ accounts: SocialAccount[] }>('/api/publish/accounts');
  return data?.accounts ?? [];
};

/** 分页获取发布记录 */
export const getPublishRecords = async (params?: {
  status?: string;
  /** 仅该优化任务周期内产生的内容任务对应的发布记录 */
  optimization_task_id?: string;
  limit?: number;
  offset?: number;
}): Promise<{ records: PublishRecord[]; total: number; limit: number; offset: number }> => {
  const queryParams: Record<string, string | number> = {};
  if (params?.status) queryParams.status = params.status;
  if (params?.optimization_task_id) queryParams.optimization_task_id = params.optimization_task_id;
  if (params?.limit != null) queryParams.limit = params.limit;
  if (params?.offset != null) queryParams.offset = params.offset;
  const data = await apiClient.get<{
    records: PublishRecord[];
    total: number;
    limit: number;
    offset: number;
  }>('/api/publish/records', { params: queryParams });
  return {
    records: data?.records ?? [],
    total: data?.total ?? 0,
    limit: data?.limit ?? 20,
    offset: data?.offset ?? 0,
  };
};

/** 创建发布记录 */
export const createPublishRecord = async (params: {
  content_generation_task_id: string;
  social_media_account_id: number;
  user_classify?: string;
}): Promise<PublishRecord> => {
  const data = await apiClient.post<PublishRecord>('/api/publish/records', params);
  return data as PublishRecord;
};

/** 再次发送：对待发送记录重新调用平台接口 */
export const retryPublishRecord = async (
  recordId: number,
  userClassify?: string
): Promise<PublishRecord> => {
  const data = await apiClient.post<PublishRecord>(`/api/publish/records/${recordId}/retry`, {
    user_classify: userClassify,
  });
  return data as PublishRecord;
};

/** 获取 OAuth 授权 URL（含签名 state，用于前往授权） */
export const getOAuthAuthUrl = async (platform: string): Promise<string> => {
  const res = await apiClient.get<{ auth_url: string }>('/api/publish/oauth/auth-url', { params: { platform } });
  return res?.auth_url ?? '';
};

/** 获取网易号图文分类 */
export const getNeteaseCategories = async (): Promise<Record<string, string[]>> => {
  const res = await apiClient.get<{ categories: Record<string, string[]> }>('/api/publish/netease/categories');
  return res?.categories ?? {};
};

/** OAuth2 应用配置（与表单字段一致，camelCase） */
export interface OAuth2ConfigForm {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scope: string;
}

/** 获取当前用户某平台的 OAuth2 应用配置（保存到数据库） */
export const getOAuthConfig = async (platform: string): Promise<OAuth2ConfigForm | null> => {
  const data = await apiClient.get<{ config: Record<string, string> | null }>(
    '/api/publish/oauth-config',
    { params: { platform } }
  );
  const c = data?.config;
  if (!c) return null;
  return {
    clientId: c.client_id ?? '',
    clientSecret: c.client_secret ?? '',
    authorizationUrl: c.authorization_url ?? '',
    tokenUrl: c.token_url ?? '',
    redirectUri: c.redirect_uri ?? '',
    scope: c.scope ?? '',
  };
};

/** 保存 OAuth2 应用配置到服务器数据库 */
export const saveOAuthConfig = async (
  platform: string,
  form: OAuth2ConfigForm
): Promise<void> => {
  await apiClient.post('/api/publish/oauth-config', {
    platform,
    client_id: form.clientId,
    client_secret: form.clientSecret,
    authorization_url: form.authorizationUrl,
    token_url: form.tokenUrl,
    redirect_uri: form.redirectUri,
    scope: form.scope,
  });
};
