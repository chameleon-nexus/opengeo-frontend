/**
 * 优化智能体任务 API
 */

import apiClient from './client';
import type { MediaTier } from '../constants/mediaPublishTier';

export interface TargetAccount {
  account_id: number;
  platform?: string;
}

export interface OptimizationTaskDTO {
  taskId: string;
  userId?: number;
  merchantId?: number | null;
  brandName: string;
  /** 产品线/型号，撰文用（与 brandName 区分） */
  productName?: string | null;
  sourceDiagnosisReportId?: number | null;
  coreKeywords: string[];
  /** 地域词快照（成稿场景 = 核心词 × 地域词） */
  diagnosisRegionWords?: string[] | null;
  /** 按行业分组的词包快照 */
  coreKeywordGroups?: { industry: string; keywords: string[] }[] | null;
  /** 行业/品类列表 */
  subjectCategories?: string[] | null;
  knowledgeBaseId?: number | null;
  /** 兼容：首范文模板 ID，与 templateIds[0] 一致 */
  templateId?: number | null;
  /** 范文模板 ID 列表（兼容：国内列表） */
  templateIds?: number[] | null;
  templateIdsDomestic?: number[] | null;
  templateIdsOverseas?: number[] | null;
  extractionTaskId?: string | null;
  targetAccounts: TargetAccount[];
  /** 周期生成成功后写入「信源库-三方媒体发布」待发记录（国内） */
  thirdPartyPublishEnabled?: boolean;
  /** 驾驶舱免审核：三方发稿任务创建即为待发布 */
  thirdPartyPublishSkipReview?: boolean;
  /** 驾驶舱工作流默认发稿媒体档 */
  thirdPartyPublishMediaTier?: MediaTier | null;
  /** 用户自选三方媒体 ID；空表示全库 */
  thirdPartyMediaWhitelistIds?: number[] | null;
  /** 周期生成成功后写入「信源库-三方出海媒体发布」待发记录 */
  overseasThirdPartyPublishEnabled?: boolean;
  scheduleCycle: string;
  scheduleHour?: number | null;
  scheduleDayOfWeek?: number | null;
  maxArticlesPerCycle: number;
  cooldownHours: number;
  acceptanceMetric: string;
  acceptanceThreshold: number;
  acceptanceCompareMode: string;
  acceptanceConsecutive: number;
  baselineSnapshot?: { visibility?: number } | null;
  status: string;
  currentConsecutivePass: number;
  totalCyclesRun: number;
  maxCycles: number;
  celeryTaskId?: string | null;
  lastCycleAt?: string | null;
  nextCycleAt?: string | null;
  acceptedAt?: string | null;
  /** 任务有效期截止（UTC ISO8601），到期自动标记为 expired */
  expiresAt?: string | null;
  errorMessage?: string | null;
  /** false 表示已软删除，列表接口不会返回 */
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** 仿写参考信源（本周期诊断 search_results） */
  imitateEnabled?: boolean;
  imitateConfig?: Record<string, unknown> | null;
  /** OpenClaw 深度仿写（兼容：任一侧开启） */
  deepImitateEnabled?: boolean;
  deepImitateEnabledDomestic?: boolean;
  deepImitateEnabledOverseas?: boolean;
  deepImitateConfig?: Record<string, unknown> | null;
  /** sau 自媒体平台 slug 列表，如 xiaohongshu */
  sauPublishTargets?: string[];
  /** 是否纳入 OpenClaw coordinator 轮询 */
  openclawCoordinatorEnabled?: boolean;
  /** 手工写作提示词 */
  customPrompt?: string | null;
  /** 每周期积分预算（兼容：国内） */
  pointsBudgetPerCycle?: number | null;
  pointsBudgetDomesticPerCycle?: number | null;
  pointsBudgetOverseasPerCycle?: number | null;
  /** 国际撰稿语言 code：zh-Hans|en|zh-Hant|ja|es|de；存量默认 zh-Hans */
  overseasWritingLanguage?: string | null;
  overseasWritingLanguageLabel?: string | null;
  /** 显式篇数：{ mode:'quota', template_articles, imitate_articles, custom_articles }；存量可能为 ratio */
  pointsBudgetStrategy?: Record<string, unknown> | null;
  pointsLocked?: number;
  pointsUsedTotal?: number;
  /** 详情/列表接口可能带商户当前积分余额 */
  merchantBalance?: number | null;
  cycles?: OptimizationCycleDTO[];
  /** 与 GEO 主线 artifactReportTaskId 一致；详情接口按主线/周期日志解析 */
  artifactReportTaskId?: string | null;
}

/** 仅重跑诊断：POST 返回 Celery id，GET 轮询结果 */
export interface RerunDiagnosisEnqueueDTO {
  celeryTaskId: string;
}

export interface RerunDiagnosisPollDTO {
  pending?: boolean;
  state?: string;
  ok?: boolean;
  diagnosisReportId?: number;
  detail?: string;
}

/** 覆盖最后一轮：仅重跑文章生成与发布（POST Celery id，GET 轮询） */
export interface RerunArticlesPublishEnqueueDTO {
  celeryTaskId: string;
}

export interface RerunArticlesPublishPollDTO {
  pending?: boolean;
  state?: string;
  ok?: boolean;
  detail?: string;
  cycle?: number;
  articlesStatus?: string;
  publishStatus?: string;
  overwriteLast?: boolean;
}

/** 单轮三步：最新诊断报告 / 优化文章生成 / 发送（各自 success | failed | skipped） */
export interface CycleStepResultDTO {
  status?: string;
  error?: string | null;
  reportId?: number;
  taskIds?: string[];
  published?: number;
  failed?: number;
  note?: string;
  /** 优化周期发布后自动生成的三方待发任务摘要（国内，兼容旧 thirdParty） */
  thirdParty?: PublishThirdPartyMetaDTO | null;
  thirdPartyDomestic?: PublishThirdPartyMetaDTO | null;
  thirdPartyOverseas?: PublishThirdPartyMetaDTO | null;
}

/** 周期 publish 步骤内嵌的三方入队摘要（camelCase 与后端一致） */
export interface PublishThirdPartyMetaDTO {
  taskId?: number | null;
  targetCount?: number;
  error?: string | null;
  /** 详情接口 enrich：third_party_publish_tasks.status */
  status?: string | null;
}

/** 仿写信源快照（周期日志 articles.imitate.used_sources） */
export interface ImitateUsedSourceDTO {
  search_result_id?: number;
  title?: string;
  summary?: string;
  url?: string;
  domain?: string;
  source_type?: string;
  publish_time?: string;
  /** 标题+摘要中命中诊断报告竞品名的数量（仿写排序用） */
  competitor_hits?: number;
  /** 是否命中体裁词（对比/评测/排行等） */
  genre_hit?: number;
}

/** 预算模式下三路子结果 */
export interface ArticlesBranchDTO {
  taskIds?: string[];
  /** CG task_id → 正文首行标题（周期落库时写入；旧数据可能没有） */
  taskTitles?: Record<string, string>;
  count?: number;
  error?: string | null;
  used_sources?: ImitateUsedSourceDTO[];
  prompt_snapshot?: string | null;
}

/** 文章等待超时/中断时的任务级明细（camelCase 与后端一致） */
export interface ArticleWaitDiagnosticDTO {
  summary?: string;
  missingTaskIds?: string[];
  pendingTaskIds?: string[];
  processingTaskIds?: string[];
  failedTasks?: { taskId: string; error: string }[];
  completedWithoutArticleTaskIds?: string[];
}

/** 文章步骤（含 legacy 与预算三路结构） */
export interface ArticlesStepResultDTO extends CycleStepResultDTO {
  reason?: string;
  total?: number;
  budget?: { allocated?: number; used?: number; refunded?: number } | null;
  template?: ArticlesBranchDTO;
  imitate?: ArticlesBranchDTO;
  custom?: ArticlesBranchDTO;
  /** 商户预算路径：plannedSlots / capArticles / planExceedsCap 等 */
  budgetPlan?: Record<string, unknown>;
  /** 等待 CG 任务结束时汇总的原因（超时路径） */
  waitDiagnostic?: ArticleWaitDiagnosticDTO | null;
}

/** OpenClaw 深度仿写步骤（cycleStepResults.deepImitate） */
export interface DeepImitateStepResultDTO {
  status?: string;
  taskIds?: string[];
  usedSources?: ImitateUsedSourceDTO[];
  error?: string | null;
}

/** sau 单平台回写 */
export interface SauPlatformPublishResultDTO {
  status?: string;
  recordId?: number;
  platformUrl?: string | null;
  platformPostId?: string | null;
  error?: string | null;
}

/** OpenClaw sau 分发步骤（cycleStepResults.sauPublish） */
export interface SauPublishStepResultDTO {
  status?: string;
  platforms?: Record<string, SauPlatformPublishResultDTO>;
  error?: string | null;
}

/** 群发分支状态（cycleStepResults.massPublish.fanwen | fangxie） */
export interface MassPublishBranchDTO {
  status?: string;
  statusLabel?: string;
  exportedAt?: string | null;
  localPathHint?: string | null;
}

/** OpenClaw 待群发双状态（cycleStepResults.massPublish） */
export interface MassPublishStepResultDTO {
  fanwen?: MassPublishBranchDTO;
  fangxie?: MassPublishBranchDTO;
  canMassPublish?: boolean;
  /** fanwen_only | fangxie_only | both */
  massPublishScope?: string | null;
  /** 范文可群发 | 仿写可群发 | 均可群发 */
  massPublishScopeLabel?: string | null;
}

export interface CycleStepResultsDTO {
  report?: CycleStepResultDTO;
  articles?: ArticlesStepResultDTO;
  publish?: CycleStepResultDTO;
  deepImitate?: DeepImitateStepResultDTO;
  sauPublish?: SauPublishStepResultDTO;
  massPublish?: MassPublishStepResultDTO;
}

/** sau 平台选项（slug 与 Backend 一致） */
export const SAU_PUBLISH_PLATFORM_OPTIONS = [
  { slug: 'xiaohongshu', label: '小红书' },
  { slug: 'douyin', label: '抖音' },
  { slug: 'kuaishou', label: '快手' },
  { slug: 'bilibili', label: 'B站' },
  { slug: 'shipinhao', label: '视频号' },
] as const;

/** 后端默认；前端不再暴露「每周期篇数」配置 */
export const OPTIMIZATION_TASK_DEFAULT_MAX_ARTICLES_PER_CYCLE = 1;
/** 执行与验收之间的默认冷却；前端不再暴露 */
export const OPTIMIZATION_TASK_DEFAULT_COOLDOWN_HOURS = 24;

/** 本轮 Celery 执行维度状态（与任务调度 status 区分） */
export interface CycleExecutionDTO {
  executionStatus: string;
  executionPhase?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  celeryExecuteId?: string | null;
}

export interface OptimizationCycleDTO {
  id: number;
  /** 关联 optimization_task_cycles.id */
  cycleId?: number | null;
  cycleNumber: number;
  contentTaskIds?: string[];
  publishRecordIds?: number[];
  diagnosisReportId?: number | null;
  metricValue?: number | null;
  baselineValue?: number | null;
  passed?: boolean | null;
  status: string;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  /** 后端 optimization_cycle_logs.cycle_step_results */
  cycleStepResults?: CycleStepResultsDTO | null;
  /** 嵌套周期执行头（详情接口在链上表时返回） */
  cycleExecution?: CycleExecutionDTO | null;
}

/** 从 GEO 诊断报告页「开始优化」传入 */
export interface OptimizationStartPayload {
  brandName: string;
  /** 可选：创建优化任务时预填产品名 */
  productName?: string | null;
  keywords: string[];
  sourceDiagnosisReportId?: number | null;
  baselineVisibility?: number | null;
}

function cycleLogIndicatesBusy(cycle: OptimizationCycleDTO): boolean {
  const logSt = (cycle.status || '').toLowerCase();
  if (logSt === 'running') return true;
  if (!cycle.completedAt && logSt !== 'completed' && logSt !== 'failed') {
    return true;
  }
  const artSt = (cycle.cycleStepResults?.articles?.status ?? '').toLowerCase();
  if (artSt === 'running') return true;
  const mp = cycle.cycleStepResults?.massPublish;
  for (const branch of [mp?.fanwen, mp?.fangxie]) {
    const bs = (branch?.status || '').toLowerCase();
    if (bs === 'waiting_content' || bs === 'ready_to_export') return true;
  }
  return false;
}

/** 首轮 Celery 已排队但周期日志尚未写入（run_immediately.delay 窗口期） */
function optimizationTaskFirstCycleQueued(task: OptimizationTaskDTO): boolean {
  if ((task.totalCyclesRun ?? 0) > 0) return false;
  if (task.cycles?.[0]) return false;
  const celeryId = (task.celeryTaskId || '').trim();
  if (!celeryId) return false;
  const st = (task.status || '').toLowerCase();
  if (!['running', 'pending'].includes(st)) return false;
  if (!task.nextCycleAt) return true;
  const nextMs = new Date(task.nextCycleAt).getTime();
  if (Number.isNaN(nextMs)) return true;
  // 下次执行在 2 分钟内：视为已排队即将执行，不可再点「立即开始」
  return nextMs <= Date.now() + 2 * 60 * 1000;
}

/**
 * 详情接口 cycles[0] 为最新一轮。
 * 周期执行头 running、周期日志 running、文章/群发进行中，或首轮 Celery 已排队时，
 * 不可并行再点「立即开始」。
 */
export function optimizationTaskHasRunningCycle(task: OptimizationTaskDTO): boolean {
  const latest = task.cycles?.[0];
  const ex = latest?.cycleExecution?.executionStatus;
  if ((ex || '').toLowerCase() === 'running') return true;
  if (latest && cycleLogIndicatesBusy(latest)) return true;
  if (optimizationTaskFirstCycleQueued(task)) return true;
  return false;
}

export interface CreateOptimizationTaskPayload {
  brand_name: string;
  /** 产品线/型号（必填），撰文/KB 与品牌区分 */
  product_name: string;
  core_keywords: string[];
  /** 按行业分组的词包快照 */
  core_keyword_groups?: { industry: string; keywords: string[] }[] | null;
  /** 地域词快照（成稿场景 = 核心词 × 地域词） */
  diagnosis_region_words?: string[] | null;
  /** 行业/品类列表 */
  subject_categories?: string[] | null;
  /** 可为空：无账号时周期内发布步骤跳过 */
  target_accounts: TargetAccount[];
  knowledge_base_id?: number | null;
  /** 兼容旧接口：多范文时建议用 template_ids */
  template_id?: number | null;
  /** 范文模板 ID 顺序列表（兼容：国内） */
  template_ids?: number[] | null;
  template_ids_domestic?: number[] | null;
  template_ids_overseas?: number[] | null;
  extraction_task_id?: string | null;
  source_diagnosis_report_id?: number | null;
  imitate_enabled?: boolean;
  imitate_config?: Record<string, unknown> | null;
  deep_imitate_enabled?: boolean;
  deep_imitate_enabled_domestic?: boolean;
  deep_imitate_enabled_overseas?: boolean;
  deep_imitate_config?: Record<string, unknown> | null;
  sau_publish_targets?: string[];
  openclaw_coordinator_enabled?: boolean;
  custom_prompt?: string | null;
  points_budget_per_cycle?: number | null;
  points_budget_domestic_per_cycle?: number | null;
  points_budget_overseas_per_cycle?: number | null;
  points_budget_strategy?: Record<string, unknown> | null;
  schedule_cycle?: string;
  schedule_hour?: number | null;
  schedule_day_of_week?: number | null;
  max_articles_per_cycle?: number;
  cooldown_hours?: number;
  acceptance_metric?: string;
  acceptance_threshold?: number;
  acceptance_compare_mode?: string;
  acceptance_consecutive?: number;
  max_cycles?: number;
  baseline_visibility?: number | null;
  /** 必填：任务有效期截止（ISO8601），到期自动结束 */
  expires_at: string;
  /** 快速开始优化主线，创建优化任务后关联 */
  geo_workflow_id?: string | null;
  /** 默认 true：创建后立即跑第一轮；false：仅按调度在下次周期点跑首轮 */
  run_immediately?: boolean;
  /** 为 true 时每周期成功后自动创建一条三方媒体发布待发记录（国内） */
  third_party_publish_enabled?: boolean;
  third_party_media_whitelist_ids?: number[] | null;
  overseas_third_party_publish_enabled?: boolean;
  overseas_writing_language?: string | null;
}

export const optimizationTaskAPI = {
  async getMerchantBalance(): Promise<{ merchantBalance: number }> {
    return apiClient.get<{ merchantBalance: number }>('/api/optimization-tasks/merchant-balance');
  },

  async list(): Promise<{ items: OptimizationTaskDTO[] }> {
    return apiClient.get<{ items: OptimizationTaskDTO[] }>('/api/optimization-tasks/');
  },

  async create(payload: CreateOptimizationTaskPayload): Promise<OptimizationTaskDTO> {
    return apiClient.post<OptimizationTaskDTO>('/api/optimization-tasks/', payload);
  },

  async get(taskId: string, opts?: { skipDoubaoHeader?: boolean }): Promise<OptimizationTaskDTO> {
    return apiClient.get<OptimizationTaskDTO>(`/api/optimization-tasks/${encodeURIComponent(taskId)}`, {
      skipDoubaoHeader: opts?.skipDoubaoHeader,
    });
  },

  async pause(taskId: string): Promise<OptimizationTaskDTO> {
    return apiClient.post<OptimizationTaskDTO>(`/api/optimization-tasks/${encodeURIComponent(taskId)}/pause`);
  },

  async resume(taskId: string): Promise<OptimizationTaskDTO> {
    return apiClient.post<OptimizationTaskDTO>(`/api/optimization-tasks/${encodeURIComponent(taskId)}/resume`);
  },

  /** 跳过下次调度时间立即执行一轮；若周期表仍有 running 则后端 409 */
  async runCycleNow(taskId: string): Promise<OptimizationTaskDTO> {
    return apiClient.post<OptimizationTaskDTO>(
      `/api/optimization-tasks/${encodeURIComponent(taskId)}/run-cycle-now`
    );
  },

  async rerunDiagnosisOnly(taskId: string): Promise<RerunDiagnosisEnqueueDTO> {
    return apiClient.post<RerunDiagnosisEnqueueDTO>(
      `/api/optimization-tasks/${encodeURIComponent(taskId)}/rerun-diagnosis-only`,
      {},
      { skipDoubaoHeader: true },
    );
  },

  /** 轮询「仅重跑诊断」Celery 结果（pending=true 时请间隔后再调） */
  async pollRerunDiagnosisOnly(
    taskId: string,
    celeryTaskId: string,
  ): Promise<RerunDiagnosisPollDTO> {
    return apiClient.get<RerunDiagnosisPollDTO>(
      `/api/optimization-tasks/${encodeURIComponent(taskId)}/rerun-diagnosis-only-async/${encodeURIComponent(celeryTaskId)}`,
      { skipDoubaoHeader: true },
    );
  },

  /** 基于既有诊断子表重跑报告与分析明细汇总（不调多平台联网） */
  async rerunReportOnly(taskId: string): Promise<RerunDiagnosisEnqueueDTO> {
    return apiClient.post<RerunDiagnosisEnqueueDTO>(
      `/api/optimization-tasks/${encodeURIComponent(taskId)}/rerun-report-only`,
      {},
      { skipDoubaoHeader: true },
    );
  },

  async pollRerunReportOnly(taskId: string, celeryTaskId: string): Promise<RerunDiagnosisPollDTO> {
    return apiClient.get<RerunDiagnosisPollDTO>(
      `/api/optimization-tasks/${encodeURIComponent(taskId)}/rerun-report-only-async/${encodeURIComponent(celeryTaskId)}`,
      { skipDoubaoHeader: true },
    );
  },

  /** 覆盖最后一轮周期：仅重跑文章生成与发布（不重跑诊断、不重新排验收） */
  async rerunArticlesPublishLastCycle(taskId: string): Promise<RerunArticlesPublishEnqueueDTO> {
    return apiClient.post<RerunArticlesPublishEnqueueDTO>(
      `/api/optimization-tasks/${encodeURIComponent(taskId)}/rerun-articles-publish-last-cycle`,
      {},
      { skipDoubaoHeader: true },
    );
  },

  async pollRerunArticlesPublishLastCycle(
    taskId: string,
    celeryTaskId: string,
  ): Promise<RerunArticlesPublishPollDTO> {
    return apiClient.get<RerunArticlesPublishPollDTO>(
      `/api/optimization-tasks/${encodeURIComponent(taskId)}/rerun-articles-publish-last-cycle-async/${encodeURIComponent(celeryTaskId)}`,
      { skipDoubaoHeader: true },
    );
  },

  /** 重置最近一轮：撤销 Celery、删除该 cycle_number 周期头与日志，total_cycles_run 回退（不修改连续验收等累计字段） */
  async resetLastCycle(taskId: string, opts?: { skipDoubaoHeader?: boolean }): Promise<OptimizationTaskDTO> {
    return apiClient.post<OptimizationTaskDTO>(
      `/api/optimization-tasks/${encodeURIComponent(taskId)}/reset-last-cycle`,
      undefined,
      { skipDoubaoHeader: opts?.skipDoubaoHeader }
    );
  },

  async stop(taskId: string): Promise<OptimizationTaskDTO> {
    return apiClient.post<OptimizationTaskDTO>(`/api/optimization-tasks/${encodeURIComponent(taskId)}/stop`);
  },

  /** 软删除：列表不可见，停止定时任务，解除 GEO 主线关联 */
  async archive(taskId: string): Promise<{ taskId: string }> {
    return apiClient.post<{ taskId: string }>(`/api/optimization-tasks/${encodeURIComponent(taskId)}/archive`);
  },

  async listCycles(taskId: string): Promise<{ cycles: OptimizationCycleDTO[] }> {
    return apiClient.get<{ cycles: OptimizationCycleDTO[] }>(
      `/api/optimization-tasks/${encodeURIComponent(taskId)}/cycles`
    );
  },

  async patch(
    taskId: string,
    payload: Partial<{
      schedule_cycle: string;
      schedule_hour: number | null;
      schedule_day_of_week: number | null;
      max_articles_per_cycle: number;
      cooldown_hours: number;
      acceptance_threshold: number;
      acceptance_compare_mode: string;
      acceptance_consecutive: number;
      max_cycles: number;
      expires_at: string;
      imitate_enabled: boolean;
      imitate_config: Record<string, unknown> | null;
      deep_imitate_enabled: boolean;
      deep_imitate_config: Record<string, unknown> | null;
      sau_publish_targets: string[] | null;
      openclaw_coordinator_enabled: boolean;
      custom_prompt: string | null;
      template_id: number | null;
      template_ids: number[] | null;
      template_ids_domestic: number[] | null;
      template_ids_overseas: number[] | null;
      points_budget_per_cycle: number | null;
      points_budget_strategy: Record<string, unknown> | null;
      product_name?: string | null;
      brand_name?: string;
      third_party_publish_enabled?: boolean;
      third_party_media_whitelist_ids?: number[] | null;
      third_party_publish_skip_review?: boolean;
      third_party_publish_media_tier?: MediaTier | null;
      overseas_third_party_publish_enabled?: boolean;
      overseas_writing_language?: string | null;
      core_keywords?: string[];
      diagnosis_region_words?: string[] | null;
      extraction_task_id?: string | null;
    }>
  ): Promise<OptimizationTaskDTO> {
    return apiClient.patch<OptimizationTaskDTO>(
      `/api/optimization-tasks/${encodeURIComponent(taskId)}`,
      payload
    );
  },
};
