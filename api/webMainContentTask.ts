/**
 * 内容创作任务 API（跨站点，/api/content-tasks）
 */
import apiClient from './client';

const BASE = '/api/content-tasks';

export type ContentTaskGenerationMode = 'rewrite' | 'original' | 'associate' | 'iqs_feed';

export type ContentTaskScheduleMode = 'recurring' | 'once_only';

export type ContentTaskRecurringCycle = 'daily' | 'weekly' | 'monthly';

export type ContentTaskTitleStyle = 'question' | 'declarative';
export type ContentTaskAnswerTemplate = 'qa' | 'news';

export interface TitlePoolSummary {
  total: number;
  pending: number;
  published: number;
  failed: number;
  skipped: number;
}

export interface ConsumedSourcesSummary {
  total: number;
}

export interface WebMainContentTaskDTO {
  taskId: string;
  siteId?: number;
  name: string;
  contentType: string;
  generationMode?: ContentTaskGenerationMode;
  topicPrompt?: string | null;
  knowledgeBaseId?: number | null;
  knowledgeBaseStatus?: string | null;
  seedKeywords: string[];
  maxKeywordsPerCycle: number;
  maxArticlesPerCycle: number;
  titlePoolSize?: number;
  titlePoolSummary?: TitlePoolSummary | null;
  iqsNumResultsPerKeyword?: number;
  consumedSourcesSummary?: ConsumedSourcesSummary | null;
  defaultCategoryId?: number | null;
  defaultColumnId?: number | null;
  authorName: string;
  authorAvatar?: string | null;
  customPrompt?: string | null;
  writingLanguage?: string;
  scheduleCycle: string;
  scheduleHour?: number | null;
  scheduleDayOfWeek?: number | null;
  scheduleDayOfMonth?: number | null;
  status: string;
  totalCyclesRun: number;
  maxCycles: number;
  celeryTaskId?: string | null;
  lastCycleAt?: string | null;
  nextCycleAt?: string | null;
  expiresAt?: string | null;
  errorMessage?: string | null;
  isActive?: boolean;
  baiduPushToken?: string | null;
  titleStyle?: ContentTaskTitleStyle;
  answerTemplate?: ContentTaskAnswerTemplate;
  topicClusterId?: string | null;
  enableCycleRoundup?: boolean;
  roundupMaxItems?: number;
  createdAt?: string | null;
  cycles?: WebMainContentCycleDTO[];
}

export interface WebMainContentCycleDTO {
  cycleNumber: number;
  status: string;
  stepResults?: Record<string, unknown>;
  keywordRuns?: unknown[];
  createdArticleIds: string[];
  errorMessage?: string | null;
  completedAt?: string | null;
  createdAt?: string | null;
}

export interface CreateWebMainContentTaskPayload {
  site_id: number;
  name: string;
  seed_keywords?: string[];
  generation_mode?: ContentTaskGenerationMode;
  topic_prompt?: string;
  title_pool_size?: number;
  iqs_num_results_per_keyword?: number;
  content_type?: string;
  max_keywords_per_cycle?: number;
  max_articles_per_cycle?: number;
  default_category_id?: number | null;
  default_column_id?: number | null;
  author_name?: string;
  author_avatar?: string | null;
  custom_prompt?: string | null;
  writing_language?: string;
  schedule_cycle?: string;
  schedule_hour?: number | null;
  schedule_day_of_week?: number | null;
  schedule_day_of_month?: number | null;
  max_cycles?: number;
  expires_at?: string | null;
  run_immediately?: boolean;
  baidu_push_token?: string | null;
  title_style?: ContentTaskTitleStyle;
  answer_template?: ContentTaskAnswerTemplate;
  topic_cluster_id?: string | null;
  enable_cycle_roundup?: boolean;
  roundup_max_items?: number;
}

export type PatchWebMainContentTaskPayload = Omit<
  CreateWebMainContentTaskPayload,
  'site_id' | 'run_immediately' | 'generation_mode'
> & {
  topic_prompt?: string;
  baidu_push_token?: string | null;
};

async function downloadTextFromApi(endpoint: string, filename: string): Promise<void> {
  const { ensureFreshToken, getAccessToken } = await import('../lib/authSession');
  const { getActiveSiteId } = await import('../lib/activeSiteId');
  const { getApiOrigin } = await import('../lib/apiOrigin');
  await ensureFreshToken();
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const siteId = getActiveSiteId();
  if (siteId != null) headers['X-Site-Id'] = String(siteId);
  const res = await fetch(`${getApiOrigin()}${endpoint}`, { headers });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(errText || '导出失败');
  }
  const text = await res.text();
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const webMainContentTaskAPI = {
  async list(params?: { site_id?: number; status?: string }): Promise<WebMainContentTaskDTO[]> {
    const query: Record<string, string | number> = {};
    if (params?.site_id != null) query.site_id = params.site_id;
    const data = await apiClient.get<WebMainContentTaskDTO[]>(BASE, { params: query });
    let rows = Array.isArray(data) ? data : [];
    if (params?.status) {
      rows = rows.filter((t) => t.status === params.status);
    }
    return rows;
  },

  async get(taskId: string): Promise<WebMainContentTaskDTO> {
    return apiClient.get<WebMainContentTaskDTO>(`${BASE}/${encodeURIComponent(taskId)}`);
  },

  async create(body: CreateWebMainContentTaskPayload): Promise<WebMainContentTaskDTO> {
    return apiClient.post<WebMainContentTaskDTO>(BASE, body);
  },

  async patch(taskId: string, body: PatchWebMainContentTaskPayload): Promise<WebMainContentTaskDTO> {
    return apiClient.patch<WebMainContentTaskDTO>(
      `${BASE}/${encodeURIComponent(taskId)}`,
      body,
    );
  },

  async uploadKnowledge(taskId: string, files: File[]): Promise<WebMainContentTaskDTO> {
    const fd = new FormData();
    for (const f of files) {
      fd.append('files', f);
    }
    return apiClient.upload<WebMainContentTaskDTO>(
      `${BASE}/${encodeURIComponent(taskId)}/knowledge`,
      fd,
    );
  },

  async runNow(taskId: string): Promise<{ celeryTaskId: string }> {
    return apiClient.post<{ celeryTaskId: string }>(
      `${BASE}/${encodeURIComponent(taskId)}/run-now`,
    );
  },

  async pause(taskId: string): Promise<WebMainContentTaskDTO> {
    return apiClient.post<WebMainContentTaskDTO>(
      `${BASE}/${encodeURIComponent(taskId)}/pause`,
    );
  },

  async resume(taskId: string): Promise<WebMainContentTaskDTO> {
    return apiClient.post<WebMainContentTaskDTO>(
      `${BASE}/${encodeURIComponent(taskId)}/resume`,
    );
  },

  async stop(taskId: string): Promise<WebMainContentTaskDTO> {
    return apiClient.post<WebMainContentTaskDTO>(
      `${BASE}/${encodeURIComponent(taskId)}/stop`,
    );
  },

  async remove(taskId: string): Promise<void> {
    await apiClient.delete(`${BASE}/${encodeURIComponent(taskId)}`);
  },

  async downloadCycleUrlsTxt(taskId: string, cycleNumber: number): Promise<void> {
    await downloadTextFromApi(
      `${BASE}/${encodeURIComponent(taskId)}/cycles/${cycleNumber}/urls.txt`,
      `urls-cycle-${cycleNumber}.txt`,
    );
  },
};
