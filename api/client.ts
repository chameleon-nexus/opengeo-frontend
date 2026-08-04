/**
 * API客户端配置
 */

import {
  clearAuthSession,
  ensureFreshToken,
  getAccessToken,
  isAuthEndpoint,
  saveAuthSession,
  syncAuthSession,
} from '../lib/authSession';
import { getActiveSiteId } from '../lib/activeSiteId';
import { getApiOrigin } from '../lib/apiOrigin';
import { formatApiErrorDetail } from '../lib/formatApiError';

const API_BASE_URL = getApiOrigin();
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

// Debug log (remove in production)
if (import.meta.env.DEV) {
  console.log('🔧 [API Client] API_BASE_URL:', API_BASE_URL);
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = getAccessToken();
  }

  setToken(token: string, expiresAt?: number) {
    this.token = token;
    if (expiresAt != null) {
      saveAuthSession(token, expiresAt);
    } else {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    clearAuthSession();
  }

  private getHeaders(skipDoubaoHeader?: boolean): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    // 每次都从localStorage读取最新的token
    const currentToken = getAccessToken();
    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }
    
    // 从localStorage读取豆包API Key（前端Key设置页面配置的）；skip 时不带，由后端使用 .env
    if (!skipDoubaoHeader) {
      const doubaoApiKey = localStorage.getItem('geo_ai_key');
      if (doubaoApiKey) {
        headers['X-Doubao-API-Key'] = doubaoApiKey;
      }
    }
    
    // 子站 API 需按 Host 解析商户。非 localhost 时用当前 host；localhost 时用开发用子站域名，否则后端会 404
    if (typeof window !== 'undefined') {
      const hn = window.location.hostname?.toLowerCase();
      if (hn && hn !== 'localhost' && hn !== '127.0.0.1') {
        headers['X-Site-Host'] = window.location.hostname;
      } else {
        const devHost = import.meta.env.VITE_DEV_SUBSITE_HOST || 'www.htsjgeo.com';
        if (devHost) headers['X-Site-Host'] = devHost;
      }
    }
    
    // 站点工作台 CMS 请求携带当前 site_id
    const siteId = getActiveSiteId();
    if (siteId != null) {
      headers['X-Site-Id'] = String(siteId);
    }
    
    return headers;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit & { skipDoubaoHeader?: boolean; _retried401?: boolean } = {}
  ): Promise<T> {
    const { skipDoubaoHeader, _retried401, ...fetchOptions } = options;

    if (!isAuthEndpoint(endpoint)) {
      await ensureFreshToken();
    }

    const execute = async (): Promise<T> => {
      const url = `${this.baseURL}${endpoint}`;
      const headers = this.getHeaders(skipDoubaoHeader);
      const config: RequestInit = {
        ...fetchOptions,
        headers: {
          ...headers,
          ...(fetchOptions.headers as Record<string, string> | undefined),
        },
      };

      console.log(`🌐 [API] ${options.method || 'GET'} ${url}`);
      console.log(`🔑 [API] Headers:`, {
        'Authorization': headers['Authorization'] ? `${headers['Authorization'].substring(0, 20)}...` : 'none',
        'Content-Type': headers['Content-Type']
      });

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), DEFAULT_REQUEST_TIMEOUT_MS);
      let response: Response;
      try {
        response = await fetch(url, { ...config, signal: controller.signal });
      } finally {
        window.clearTimeout(timeoutId);
      }
      console.log(`📥 [API] Response status: ${response.status} ${response.statusText}`);

      let responseData: any;
      try {
        const text = await response.text();
        console.log(`📄 [API] Response body (raw):`, text.substring(0, 200));
        responseData = JSON.parse(text);
        console.log(`📦 [API] Response data (parsed):`, responseData);
      } catch (parseError) {
        console.error('❌ [API] JSON解析失败:', parseError);
        responseData = {};
      }

      if (response.status === 401 && !_retried401 && !isAuthEndpoint(endpoint)) {
        const refreshed = await syncAuthSession();
        if (refreshed) {
          return this.request<T>(endpoint, { ...options, _retried401: true });
        }
        clearAuthSession();
      }

      if (!response.ok) {
        const detail = responseData.detail;
        const accessExpired =
          response.status === 403 &&
          detail &&
          typeof detail === 'object' &&
          detail.code === 'ACCESS_EXPIRED';
        if (accessExpired && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('geo-access-expired'));
        }
        const isPointsError = response.status === 402 ||
          (typeof responseData.detail === 'string' && responseData.detail.includes('积分不足'));
        const errorDetail = accessExpired
          ? (typeof detail === 'object' ? detail.message : '试用或套餐已到期，请购买套餐后继续使用')
          : isPointsError
          ? '积分不足，请联系管理员充值'
          : formatApiErrorDetail(
              responseData.detail ?? responseData.message,
              response.statusText || '请求失败'
            );
        const error = new Error(errorDetail);
        (error as any).status = response.status;
        (error as any).statusCode = response.status;
        (error as any).response = responseData;
        (error as any).responseData = responseData;
        console.error(`❌ [API] Request failed:`, error);
        throw error;
      }

      if (responseData.code === 0) {
        console.log(`✅ [API] Success, returning data:`, responseData.data);
        return responseData.data as T;
      }

      const errorMsg = responseData.message || 'API请求失败';
      console.error(`❌ [API] Code !== 0:`, responseData);
      throw new Error(errorMsg);
    };

    try {
      return await execute();
    } catch (error) {
      console.error('❌ [API] Request Failed:', error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(
          `请求超时（${DEFAULT_REQUEST_TIMEOUT_MS / 1000} 秒），请确认后端已启动：${this.baseURL}`
        );
      }
      if (
        error instanceof TypeError &&
        /fetch|network|failed/i.test(error.message)
      ) {
        throw new Error(`无法连接后端 ${this.baseURL}，请先启动 openbackend（默认端口 8002）`);
      }
      throw error;
    }
  }

  // GET请求
  async get<T>(
    endpoint: string,
    options?: { params?: Record<string, any>; skipDoubaoHeader?: boolean }
  ): Promise<T> {
    let url = endpoint;
    if (options?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (endpoint.includes('?') ? '&' : '?') + queryString;
      }
    }
    return this.request<T>(url, { method: 'GET', skipDoubaoHeader: options?.skipDoubaoHeader });
  }

  // POST请求（skipDoubaoHeader：不传 X-Doubao-API-Key，避免 localStorage 旧 Key 覆盖服务端 .env）
  async post<T>(
    endpoint: string,
    data?: any,
    opts?: { skipDoubaoHeader?: boolean }
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      skipDoubaoHeader: opts?.skipDoubaoHeader,
    });
  }

  // 文件上传
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    // 复用 request() 的租户/鉴权头逻辑，但不要设置 Content-Type: application/json
    // 否则会干扰 multipart/form-data 的边界
    const headersObj = this.getHeaders(false) as Record<string, string>;
    delete headersObj['Content-Type'];

    const response = await fetch(url, {
      method: 'POST',
      headers: headersObj,
      body: formData,
    });

    if (!response.ok) {
      const status = response.status;
      const statusText = response.statusText;
      let detail = '';
      try {
        const text = await response.text();
        try {
          const json = JSON.parse(text);
          detail =
            (typeof json?.detail === 'string' && json.detail) ||
            (typeof json?.message === 'string' && json.message) ||
            text?.slice(0, 300) ||
            '';
        } catch {
          detail = text?.slice(0, 300) || '';
        }
      } catch {
        // ignore
      }
      throw new Error(`Upload Error: ${status} ${statusText}${detail ? ` - ${detail}` : ''}`);
    }

    const data = await response.json();
    if (data.code === 0) {
      return data.data as T;
    } else {
      throw new Error(data.message || '上传失败');
    }
  }

  /** multipart 上传，`onProgress` 为已上传百分比；`lengthComputable` 为假时回调 `null` 表示不定进度 */
  uploadWithProgress<T>(
    endpoint: string,
    formData: FormData,
    opts?: { onProgress?: (percent: number | null) => void }
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headersObj = this.getHeaders(false) as Record<string, string>;
    delete headersObj['Content-Type'];

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (evt) => {
        if (!opts?.onProgress) return;
        if (!evt.lengthComputable || evt.total <= 0) {
          opts.onProgress(null);
        } else {
          opts.onProgress(Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
        }
      };

      xhr.onerror = () => reject(new Error('Upload Error: Network failure'));
      xhr.ontimeout = () => reject(new Error('Upload Error: Request timeout'));

      xhr.onload = () => {
        const status = xhr.status;
        const statusText = xhr.statusText || '';
        const text = xhr.responseText || '';

        let data: { code?: number; message?: string; data?: unknown; detail?: unknown } = {};

        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          reject(new Error(status < 200 || status >= 300 ? `Upload Error: ${status} ${statusText}` : '上传响应解析失败'));
          return;
        }

        if (status < 200 || status >= 300) {
          const detail =
            (typeof data.detail === 'string' && data.detail) ||
            (typeof data.message === 'string' && data.message) ||
            text.slice(0, 300) ||
            '';
          reject(new Error(`Upload Error: ${status} ${statusText}${detail ? ` - ${detail}` : ''}`));
          return;
        }

        if (data.code === 0) {
          opts?.onProgress?.(100);
          resolve(data.data as T);
        } else {
          reject(new Error((typeof data.message === 'string' && data.message) || '上传失败'));
        }
      };

      xhr.open('POST', url);
      for (const [key, val] of Object.entries(headersObj)) {
        if (typeof val !== 'string' || val.trim() === '') continue;
        try {
          xhr.setRequestHeader(key, val);
        } catch {
          // ignore forbidden / invalid header names
        }
      }
      xhr.send(formData);
    });
  }

  // PUT请求
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH请求
  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE请求
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;

/** 获取 API 基础地址（用于 OAuth 回调等），同源时用 window.location.origin */
export function getApiBaseUrl(): string {
  // 1. 显式配置 OAuth 回调基域（生产环境须与网易等开放平台填写一致）
  const oauthBase = import.meta.env.VITE_OAUTH_CALLBACK_BASE;
  if (oauthBase && typeof oauthBase === 'string') return oauthBase.replace(/\/$/, '');
  // 2. 生产环境且配置了 VITE_SAAS_HOST，用其作为回调基域（如 saas.htsjgeo.com）
  const saasHost = import.meta.env.VITE_SAAS_HOST;
  if (saasHost && typeof saasHost === 'string' && !import.meta.env.DEV) {
    const h = String(saasHost).toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (h && !h.startsWith('localhost')) return `https://${h}`;
  }
  // 3. API 地址
  const base = getApiOrigin();
  if (base) return base;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}

