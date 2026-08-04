/**
 * GEO 双轨 Agent（与 /api/agent/chat 分离）
 */

import apiClient from './client';
import { getActiveSiteId } from '../lib/activeSiteId';
import { getApiOrigin } from '../lib/apiOrigin';
import {
  clearAuthSession,
  ensureFreshToken,
  getAccessToken,
  syncAuthSession,
} from '../lib/authSession';

export interface GeoOrchestratorChatRequest {
  message: string;
  threadId?: string | null;
  workflowId?: string | null;
  phaseHint?: string | null;
  formPayload?: Record<string, unknown> | null;
}

/** apiClient 已解包为后端 `data` 字段 */
export interface GeoOrchestratorChatResult {
  ok: boolean;
  reply?: string;
  workflowId?: string | null;
  reactStage?: string;
  phase?: string | null;
  threadId?: string;
  currentStage?: string;
  completed?: boolean;
  error?: string;
  messages?: unknown[];
  richMedia?: unknown[];
  lastSeq?: number;
  acceptance?: unknown;
}

export interface RichMediaListResult {
  items: unknown[];
  lastSeq: number;
  nextRichMediaSeq: number;
}

function parseStreamErrorBody(body: unknown, status: number): string {
  if (!body || typeof body !== 'object') {
    return `请求失败（HTTP ${status}）`;
  }
  const row = body as Record<string, unknown>;
  if (typeof row.detail === 'string' && row.detail.trim()) return row.detail;
  if (typeof row.message === 'string' && row.message.trim()) return row.message;
  if (row.detail && typeof row.detail === 'object') {
    const d = row.detail as Record<string, unknown>;
    if (typeof d.message === 'string' && d.message.trim()) return d.message;
  }
  return `请求失败（HTTP ${status}）`;
}

/** 与 apiClient 对齐：刷新 token + 站点头，供 SSE fetch 使用 */
async function buildStreamAuthHeaders(): Promise<Record<string, string>> {
  await ensureFreshToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const doubao = localStorage.getItem('geo_ai_key');
  if (doubao) headers['X-Doubao-API-Key'] = doubao;
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

function streamApiUrl(): string {
  const base = (getApiOrigin() || '').replace(/\/$/, '');
  const path = '/api/geo-orchestrator/chat?stream=true';
  return base ? `${base}${path}` : path;
}

export const geoOrchestratorAPI = {
  async chat(body: GeoOrchestratorChatRequest): Promise<GeoOrchestratorChatResult> {
    return apiClient.post<GeoOrchestratorChatResult>('/api/geo-orchestrator/chat', {
      message: body.message,
      thread_id: body.threadId ?? undefined,
      workflow_id: body.workflowId ?? undefined,
      phase_hint: body.phaseHint ?? undefined,
      form_payload: body.formPayload ?? undefined,
    });
  },
};

export async function fetchRichMedia(
  workflowId: string,
  sinceSeq: number,
  limit = 200
): Promise<RichMediaListResult> {
  return apiClient.get<RichMediaListResult>('/api/geo-orchestrator/rich-media', {
    params: {
      workflow_id: workflowId,
      since_seq: sinceSeq,
      limit,
    },
  });
}

/**
 * POST /api/geo-orchestrator/chat?stream=true，解析 SS data 行。
 * onEvent: 每解析一条 JSON 即回调（整对象）
 * 返回最后一个 type=done 的 data
 */
export async function chatStream(
  body: GeoOrchestratorChatRequest,
  onEvent: (o: Record<string, unknown>) => void
): Promise<GeoOrchestratorChatResult> {
  const payload = JSON.stringify({
    message: body.message,
    thread_id: body.threadId ?? undefined,
    workflow_id: body.workflowId ?? undefined,
    phase_hint: body.phaseHint ?? undefined,
    form_payload: body.formPayload ?? undefined,
  });

  const postStream = async (retried401 = false): Promise<Response> => {
    const url = streamApiUrl();
    const headers = await buildStreamAuthHeaders();
    if (import.meta.env.DEV) {
      console.log('[geo-orchestrator] POST', url);
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: payload,
    });
    if (res.status === 401 && !retried401) {
      const refreshed = await syncAuthSession();
      if (refreshed) return postStream(true);
      clearAuthSession();
    }
    return res;
  };

  const res = await postStream();
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = await res.json();
      detail = parseStreamErrorBody(j, res.status);
    } catch {
      detail = `请求失败（HTTP ${res.status}）`;
    }
    throw new Error(detail);
  }
  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('无响应体');
  }
  const dec = new TextDecoder();
  let buf = '';
  let last: GeoOrchestratorChatResult = { ok: true };
  let streamThreadId: string | undefined;
  let streamError: string | undefined;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split('\n\n');
    buf = parts.pop() ?? '';
    for (const part of parts) {
      const line = part
        .split('\n')
        .map((l) => l.trim())
        .find((l) => l.startsWith('data:'));
      if (!line) continue;
      const jsons = line.slice(5).trim();
      if (!jsons) continue;
      let o: Record<string, unknown>;
      try {
        o = JSON.parse(jsons) as Record<string, unknown>;
      } catch {
        continue;
      }
      onEvent(o);
      if (o.type === 'error') {
        const err = (o as { error?: string }).error;
        streamError = (typeof err === 'string' && err.trim()) || '服务端处理失败';
      }
      if (o.type === 'stream_end' && typeof (o as { threadId?: string }).threadId === 'string') {
        streamThreadId = (o as { threadId: string }).threadId;
      }
      if (o.type === 'done' && o.data && typeof o.data === 'object') {
        const data = o.data as GeoOrchestratorChatResult;
        last = { ...last, ...data };
        if (data.ok === false) {
          streamError = (data.error || '').trim() || streamError || '对话处理失败';
        }
      }
    }
  }
  if (streamError) {
    throw new Error(streamError);
  }
  return { ...last, threadId: last.threadId || streamThreadId };
}
