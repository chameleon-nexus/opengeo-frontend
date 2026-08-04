import { apiClient } from './client';

export interface PostizCustomField {
  key: string;
  label: string;
  validation?: string;
  defaultValue?: string;
  type: 'text' | 'password';
}

export interface PostizProvider {
  identifier: string;
  name: string;
  picture?: string;
  customFields?: PostizCustomField[];
  isChromeExtension?: boolean;
  isBetweenSteps?: boolean;
}

export interface PostizAccount {
  id: number;
  platform: string;
  authType?: string;
  postizIdentifier?: string | null;
  postizIntegrationId?: string | null;
  displayName?: string | null;
  nickname?: string | null;
  avatar_url?: string | null;
  authorized?: boolean;
}

export async function getPostizProviders(): Promise<PostizProvider[]> {
  const data = await apiClient.get<{ providers: PostizProvider[] }>('/api/publish/postiz/providers');
  return data?.providers ?? [];
}

export async function getPostizAccounts(): Promise<PostizAccount[]> {
  const data = await apiClient.get<{ accounts: PostizAccount[] }>('/api/publish/postiz/accounts');
  return data?.accounts ?? [];
}

export async function getPostizOAuthUrl(identifier: string): Promise<string> {
  const data = await apiClient.get<{ auth_url: string }>('/api/publish/postiz/oauth-url', {
    params: { identifier },
  });
  return data?.auth_url ?? '';
}

export async function connectPostizForm(identifier: string, credentials: Record<string, string>): Promise<void> {
  await apiClient.post('/api/publish/postiz/connect-form', { identifier, credentials });
}

export async function syncPostizAccounts(): Promise<PostizAccount[]> {
  const data = await apiClient.post<{ accounts: PostizAccount[] }>('/api/publish/postiz/sync', {});
  return data?.accounts ?? [];
}

export async function deletePostizAccount(accountId: number): Promise<void> {
  await apiClient.delete(`/api/publish/postiz/accounts/${accountId}`);
}
