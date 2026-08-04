/**
 * JWT 品牌联网诊断（与 OpenAPI /analyze 同源，供 SaaS 登录态使用）
 */
import { getApiOrigin } from '../lib/apiOrigin';

export interface BrandDiagnosisAnalyzeSessionResult {
  id?: number;
  batchId?: string;
  taskId?: string;
  brandId?: string;
  brandName?: string;
  industry?: string;
  mvpSummary?: string;
  indicatorData?: unknown;
  [key: string]: unknown;
}

/** 每轮间隔 ms；多平台联网诊断可能 15～25 分钟+，总上限需大于 Celery 常见耗时 */
const POLL_MS = 4000;
/** 最多轮询次数：450 × 4s ≈ 30 分钟（与后端 Celery task_time_limit 3600s 留余量） */
const MAX_POLLS = 450;

type PollParseResult =
  | { kind: 'pending' }
  | { kind: 'done'; report: BrandDiagnosisAnalyzeSessionResult }
  | { kind: 'unexpected' };

/** 兼容 {code,data} 包装与历史扁平报告 JSON（含 id / batchId） */
function parsePollAnalyzeResponse(json: unknown): PollParseResult {
  if (!json || typeof json !== 'object') return { kind: 'unexpected' };
  const body = json as Record<string, unknown>;

  if (body.code === 0 && body.data && typeof body.data === 'object') {
    const data = body.data as Record<string, unknown>;
    if (data.pending) return { kind: 'pending' };
    if (data.code === 0 && data.data && typeof data.data === 'object' && !data.pending) {
      return { kind: 'done', report: data.data as BrandDiagnosisAnalyzeSessionResult };
    }
    return { kind: 'done', report: data as BrandDiagnosisAnalyzeSessionResult };
  }

  if (body.id != null || body.batchId || body.batch_id) {
    return { kind: 'done', report: body as BrandDiagnosisAnalyzeSessionResult };
  }

  return { kind: 'unexpected' };
}

async function pollAnalyzeSessionUntilDone(
  base: string,
  headers: Record<string, string>,
  celeryTaskId: string
): Promise<BrandDiagnosisAnalyzeSessionResult> {
  console.info('[brandDiagnosisSession] poll_start', { celeryTaskId });
  for (let i = 0; i < MAX_POLLS; i++) {
    const res = await fetch(
      `${base}/api/brand-diagnosis/analyze-session-result/${encodeURIComponent(celeryTaskId)}`,
      { method: 'GET', headers }
    );
    const text = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(text);
    } catch {
      console.error('[brandDiagnosisSession] poll_parse_failed', {
        celeryTaskId,
        pollIndex: i,
        status: res.status,
        textPreview: text?.slice(0, 200),
      });
      throw new Error(text?.slice(0, 200) || '诊断轮询响应解析失败');
    }
    if (!res.ok) {
      const detail =
        (typeof json?.detail === 'string' && json.detail) ||
        json?.message ||
        res.statusText;
      console.error('[brandDiagnosisSession] poll_http_error', {
        celeryTaskId,
        pollIndex: i,
        status: res.status,
        detail,
      });
      throw new Error(detail || `HTTP ${res.status}`);
    }
    const parsed = parsePollAnalyzeResponse(json);
    if (parsed.kind === 'pending') {
      if (i === 0 || i % 15 === 0) {
        console.info('[brandDiagnosisSession] poll_pending', {
          celeryTaskId,
          pollIndex: i,
          elapsedSec: i * (POLL_MS / 1000),
        });
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
      continue;
    }
    if (parsed.kind === 'done') {
      console.info('[brandDiagnosisSession] poll_done', {
        celeryTaskId,
        pollIndex: i,
        reportId: parsed.report?.id,
      });
      return parsed.report;
    }
    console.error('[brandDiagnosisSession] poll_unexpected', {
      celeryTaskId,
      pollIndex: i,
      json,
    });
    throw new Error(json.message || '诊断失败');
  }
  console.error('[brandDiagnosisSession] poll_timeout', { celeryTaskId, maxPolls: MAX_POLLS });
  throw new Error(
    '诊断任务等待超时（约 30 分钟）。若多平台联网较慢，请稍后在前台「诊断报告」或列表中查看是否已生成；并确认 Celery Worker 已启动。'
  );
}

export async function analyzeBrandDiagnosisSession(body: {
  brand_name: string;
  industry?: string;
  brand_introduction?: string;
  core_keywords?: string[];
  ai_platforms?: string[];
  product_name?: string;
  question_intent?: 'recommendation' | 'evaluation';
  geo_workflow_id?: string;
}): Promise<BrandDiagnosisAnalyzeSessionResult> {
  const base = getApiOrigin();
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // 不传 X-Doubao-API-Key：SaaS JWT 诊断与 brand-parse/finalize 一致，豆包用服务端 DOUBAO_API_KEY，避免 Key 设置页旧 Key 覆盖

  if (typeof window !== 'undefined') {
    const hn = window.location.hostname?.toLowerCase();
    if (hn && hn !== 'localhost' && hn !== '127.0.0.1') {
      headers['X-Site-Host'] = window.location.hostname;
    } else {
      const devHost = import.meta.env.VITE_DEV_SUBSITE_HOST || 'www.htsjgeo.com';
      if (devHost) headers['X-Site-Host'] = devHost;
    }
  }

  const res = await fetch(`${base}/api/brand-diagnosis/analyze-session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      brand_name: body.brand_name,
      industry: body.industry,
      brand_introduction: body.brand_introduction,
      core_keywords: body.core_keywords,
      ai_platforms: body.ai_platforms,
      product_name: body.product_name?.trim() || undefined,
      question_intent: body.question_intent ?? 'recommendation',
      geo_workflow_id: body.geo_workflow_id?.trim() || undefined,
    }),
  });

  console.info('[brandDiagnosisSession] analyze_session_response', {
    status: res.status,
    ok: res.ok,
    workflowId: body.geo_workflow_id,
    aiPlatforms: body.ai_platforms,
  });

  const text = await res.text();
  let json: any = {};
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(text?.slice(0, 200) || '诊断响应解析失败');
  }

  if (!res.ok) {
    const detail =
      (typeof json?.detail === 'string' && json.detail) ||
      json?.message ||
      res.statusText;
    console.error('[brandDiagnosisSession] analyze_session_failed', {
      status: res.status,
      detail,
      workflowId: body.geo_workflow_id,
    });
    throw new Error(detail || `HTTP ${res.status}`);
  }

  if (json.code === 0 && json.data?.async && json.data?.celery_task_id) {
    console.info('[brandDiagnosisSession] analyze_session_async', {
      celeryTaskId: json.data.celery_task_id,
      workflowId: body.geo_workflow_id,
    });
    return pollAnalyzeSessionUntilDone(base, headers, json.data.celery_task_id as string);
  }

  if (json.code === 0 && json.data) {
    console.info('[brandDiagnosisSession] analyze_session_sync', {
      reportId: json.data?.id,
      workflowId: body.geo_workflow_id,
    });
    return json.data as BrandDiagnosisAnalyzeSessionResult;
  }
  console.error('[brandDiagnosisSession] analyze_session_unexpected', { json });
  throw new Error(json.message || '诊断失败');
}
