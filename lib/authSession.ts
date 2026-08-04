/**
 * 认证 session 存储与续期（localStorage + /api/auth/session）
 */

import type { UserInfo } from '../types';
import { getApiOrigin } from './apiOrigin';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_EXPIRES_AT_KEY = 'auth_expires_at';
const AUTH_USERNAME_KEY = 'auth_username';
const REFRESH_THRESHOLD_SEC = 5 * 60;

export interface AuthSessionData {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  user: UserInfo;
}

function resolveApiBaseUrl(): string {
  return getApiOrigin();
}

function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof decoded.exp === 'number' ? decoded.exp : null;
  } catch {
    return null;
  }
}

export function getExpiresAt(): number | null {
  const raw = localStorage.getItem(AUTH_EXPIRES_AT_KEY);
  if (raw) {
    const n = Number(raw);
    if (!Number.isNaN(n)) return n;
  }
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) return decodeJwtExp(token);
  return null;
}

export function setExpiresAt(ts: number): void {
  localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(ts));
}

export function isTokenExpired(offsetSec = 0): boolean {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return true;
  const exp = getExpiresAt();
  if (!exp) return true;
  return exp <= Math.floor(Date.now() / 1000) + offsetSec;
}

export function shouldRefreshToken(): boolean {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return false;
  return isTokenExpired(REFRESH_THRESHOLD_SEC);
}

export function saveAuthSession(
  token: string,
  expiresAt: number,
  username?: string,
): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_EXPIRES_AT_KEY, String(expiresAt));
  if (username) {
    localStorage.setItem(AUTH_USERNAME_KEY, username);
  }
}

export function saveAuthSessionFromResponse(
  data: Pick<AuthSessionData, 'access_token' | 'expires_at'> & { user?: { username?: string | null; phone?: string | null } },
): void {
  const username = data.user?.username || data.user?.phone || undefined;
  saveAuthSession(data.access_token, data.expires_at, username);
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_EXPIRES_AT_KEY);
  localStorage.removeItem(AUTH_USERNAME_KEY);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

let refreshPromise: Promise<AuthSessionData | null> | null = null;

async function fetchAuthSession(): Promise<AuthSessionData | null> {
  const token = getAccessToken();
  if (!token) return null;

  const base = resolveApiBaseUrl();
  const res = await fetch(`${base}/api/auth/session`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    if (res.status === 401) clearAuthSession();
    return null;
  }

  const json = await res.json();
  if (json.code !== 0 || !json.data) return null;

  const data = json.data as AuthSessionData;
  saveAuthSessionFromResponse(data);
  return data;
}

export async function syncAuthSession(): Promise<{ user: UserInfo; session: AuthSessionData } | null> {
  if (!refreshPromise) {
    refreshPromise = fetchAuthSession().finally(() => {
      refreshPromise = null;
    });
  }

  const session = await refreshPromise;
  if (!session?.user) return null;
  return { user: session.user, session };
}

export async function ensureFreshToken(): Promise<void> {
  if (!shouldRefreshToken()) return;
  await syncAuthSession();
}

export function isAuthEndpoint(endpoint: string): boolean {
  return (
    endpoint.includes('/api/auth/login') ||
    endpoint.includes('/api/auth/session') ||
    endpoint.includes('/api/auth/send-code')
  );
}
