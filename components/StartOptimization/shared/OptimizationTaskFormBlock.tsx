/**
 * 创建/编辑优化任务表单 + 监控视图
 * 与「快速开始」BrandParseWizard.tsx 的 opt_form / monitoring 视图等价；
 * 监控态仅保留任务摘要与统计（「最新一轮产出」入口已迁至工作台 GEO 主线产出卡片）。
 *
 * 复用 API：
 *   - getArticleTemplates
 *   - getSocialAccounts
 *   - optimizationTaskAPI.create / patch / get
 *   - geoWorkflowAPI.advance(optimization_task_id) （创建后关联）
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { getArticleTemplates } from '../../../api/contentGeneration';
import { getPostizAccounts, type PostizAccount } from '../../../api/postizPublish';
import { listThirdPartyMediaOutlets, type ThirdPartyMediaOutletDTO } from '../../../api/thirdPartyMedia';
import ThirdPartyMediaWhitelistModal from './ThirdPartyMediaWhitelistModal';
import ThirdPartyMediaWhitelistSummary from './ThirdPartyMediaWhitelistSummary';
import {
  optimizationTaskAPI,
  optimizationTaskHasRunningCycle,
  OPTIMIZATION_TASK_DEFAULT_COOLDOWN_HOURS,
  OPTIMIZATION_TASK_DEFAULT_MAX_ARTICLES_PER_CYCLE,
  type CreateOptimizationTaskPayload,
  type OptimizationTaskDTO,
  type TargetAccount,
} from '../../../api/optimizationTask';
import OpenClawCycleSteps from './OpenClawCycleSteps';
import { SHOW_OPT_WRITER_PATH_OPTIONS } from '../../../constants/optimizationMode';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../../../api/geoWorkflow';
import { SOCIAL_ACCOUNTS_FROM_OPTIMIZATION_WORKBENCH_KEY } from '../../../constants/socialAccountsNavigation';
import {
  DEFAULT_DOMESTIC_WRITING_LANGUAGE,
  DEFAULT_OVERSEAS_WRITING_LANGUAGE,
  OVERSEAS_WRITING_LANGUAGE_OPTIONS,
  normalizeOverseasWritingLanguage,
  overseasWritingLanguageLabel,
} from '../../../constants/overseasWritingLanguage';
import WorkbenchToast, { useWorkbenchToast } from './WorkbenchToast';
import { useOverseasNotOpenHint } from './useOverseasNotOpenHint';
import { GEO_WORKFLOW_POLL_MS } from '../../../constants/brandParsePolling';
import { useModuleI18n } from '../../../i18n/hooks';
import type { GeoCoreKeywordGroup } from '../types';
import { countOptimizationScenarioKeywords } from '../../../utils/coreKeywordGroups';

function DeployGuideLink({
  onNavigate,
  className = '',
  label,
}: {
  onNavigate?: () => void;
  className?: string;
  label: string;
}) {
  if (!onNavigate) return null;
  return (
    <button
      type="button"
      onClick={onNavigate}
      className={`text-[11px] text-violet-600 underline hover:opacity-80 ${className}`.trim()}
    >
      {label}
    </button>
  );
}

function defaultExpiresDatetimeLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function datetimeLocalToIsoUtc(localValue: string): string {
  const t = new Date(localValue);
  return Number.isNaN(t.getTime()) ? '' : t.toISOString();
}
function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return defaultExpiresDatetimeLocal();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return defaultExpiresDatetimeLocal();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 与「知识库 · 知识图谱」同级、可折叠的工作台卡片 */
function OptTaskSectionCard({
  title,
  description,
  collapsedSummary,
  defaultCollapsed = false,
  hideHeader = false,
  expandAriaLabel,
  collapseAriaLabel,
  collapseTitle,
  children,
}: {
  title: string;
  description?: string;
  /** 收起时单行摘要 */
  collapsedSummary?: string;
  /** true = 初始收起 */
  defaultCollapsed?: boolean;
  /** 编辑等场景：不展示标题、说明与折叠按钮 */
  hideHeader?: boolean;
  expandAriaLabel: string;
  collapseAriaLabel: string;
  collapseTitle: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const summary = (collapsedSummary || description || '').trim();

  if (hideHeader) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">{children}</div>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title={expandAriaLabel}
          aria-label={expandAriaLabel}
          className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-50/80"
        >
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[#111827]">{title}</h3>
            {summary ? (
              <p className="mt-1 truncate text-xs text-[#64748b]">{summary}</p>
            ) : null}
          </div>
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#64748b]"
            aria-hidden
          >
            <ChevronDown className="h-4 w-4" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[#111827]">{title}</h3>
          {description ? <p className="mt-1 text-xs text-[#64748b]">{description}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          title={collapseTitle}
          aria-label={collapseAriaLabel}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#64748b] shadow-sm transition-colors hover:bg-slate-50"
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

export interface OptimizationTaskFormBlockProps {
  workflowId: string;
  brandName: string;
  /** 创建任务时预填：来自 GEO 主线的产品线/型号 */
  defaultProductName?: string | null;
  coreKeywords: string[];
  /** 按行业分组的词包（创建任务快照） */
  coreKeywordGroups?: GeoCoreKeywordGroup[] | null;
  /** 地域词（成稿场景 = 核心词 × 地域词） */
  diagnosisRegionWords?: string[] | null;
  subjectCategories?: string[] | null;
  extractionTaskId?: string | null;
  knowledgeBaseId?: number | null;
  sourceDiagnosisReportId?: number | null;
  baselineVisibility?: number | null;
  /** 已存在的 optimizationTaskId：进入「监控/编辑」视图 */
  existingTaskId?: string | null;
  /** 任务创建/编辑成功后回调（含返回的 task） */
  onTaskUpserted?: (task: OptimizationTaskDTO, workflow?: GeoWorkflowDTO | null) => void;
  /** 用于编辑模式下「返回上一视图」 */
  onCancel?: () => void;
  /** 跳转侧栏「自媒体账号」（未授权去授权 / 无账号去添加） */
  onNavigateToSocialAccounts?: () => void;
  /** 跳转「自动化部署指南」 */
  onNavigateToDeployGuide?: () => void;
  /** 查看最新轮次分析报告（驾驶舱任务内 drill-down） */
  onOpenAnalysisReport?: () => void;
  /** 查看最新轮次分析明细（驾驶舱任务内 drill-down） */
  onOpenAnalysisDetail?: () => void;
  /** 工作流优化市场：编辑监控配置时决定展示国内/出海写作项 */
  optimizationMarket?: 'domestic' | 'overseas' | string | null;
}

type ViewMode = 'form' | 'monitoring';

/** 监控区互斥操作：仅当前点击的按钮显示 loading，其余仅禁用 */
type TaskMonitorAction = 'run_now' | 'pause' | 'resume' | 'reset';

/** 深度仿写信源筛选（UI 已隐藏，提交时使用固定默认值） */
const DEFAULT_DEEP_IMITATE_CONFIG = {
  freshness_days: 180,
  exclude_owned: false,
} as const;

const OptimizationTaskFormBlock: React.FC<OptimizationTaskFormBlockProps> = ({
  workflowId,
  brandName,
  defaultProductName,
  coreKeywords,
  coreKeywordGroups,
  diagnosisRegionWords,
  subjectCategories,
  extractionTaskId,
  knowledgeBaseId,
  sourceDiagnosisReportId,
  baselineVisibility,
  existingTaskId,
  onTaskUpserted,
  onCancel,
  onNavigateToSocialAccounts,
  onNavigateToDeployGuide,
  onOpenAnalysisReport,
  onOpenAnalysisDetail,
  optimizationMarket,
}) => {
  const { t } = useModuleI18n('optimization');
  const isOverseasWorkflow = optimizationMarket === 'overseas';
  const sectionCardI18n = (sectionTitle: string) => ({
    expandAriaLabel: t('taskForm.expandSection', { title: sectionTitle }),
    collapseAriaLabel: t('taskForm.collapseSection', { title: sectionTitle }),
    collapseTitle: t('taskForm.collapse'),
  });
  const [mode, setMode] = useState<ViewMode>(existingTaskId ? 'monitoring' : 'form');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [templatesDomestic, setTemplatesDomestic] = useState<{ id: number; name: string }[]>([]);
  const [templatesOverseas, setTemplatesOverseas] = useState<{ id: number; name: string }[]>([]);
  const [accounts, setAccounts] = useState<PostizAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<number>>(new Set());

  const [scheduleCycle, setScheduleCycle] = useState('weekly');
  const [scheduleHour, setScheduleHour] = useState(9);
  const [scheduleDow, setScheduleDow] = useState(0);
  const [templateIdsDomestic, setTemplateIdsDomestic] = useState<number[]>([]);
  const [templateIdsOverseas, setTemplateIdsOverseas] = useState<number[]>([]);
  const [runImmediately, setRunImmediately] = useState(true);
  const [expiresAtLocal, setExpiresAtLocal] = useState<string>(defaultExpiresDatetimeLocal());

  const [pointsBudgetDomesticInput, setPointsBudgetDomesticInput] = useState<string>('');
  const [pointsBudgetOverseasInput, setPointsBudgetOverseasInput] = useState<string>('');
  const [merchantBalance, setMerchantBalance] = useState<number | null>(null);
  /** 每周期成功后写入「信源库-三方媒体发布」待发记录（智能匹配入队） */
  const [thirdPartyPublishEnabled, setThirdPartyPublishEnabled] = useState(false);
  const [mediaWhitelistIds, setMediaWhitelistIds] = useState<number[]>([]);
  const [mediaWhitelistItems, setMediaWhitelistItems] = useState<ThirdPartyMediaOutletDTO[]>([]);
  const [mediaWhitelistModalOpen, setMediaWhitelistModalOpen] = useState(false);
  const [overseasThirdPartyPublishEnabled, setOverseasThirdPartyPublishEnabled] = useState(false);
  /** 国内普通仿写（周期 Celery 自动成稿；与深度仿写互斥，深度仿写 UI 已隐藏） */
  const [imitateEnabledDomestic, setImitateEnabledDomestic] = useState(false);
  /** 国际撰稿语言（出海路径仅英文） */
  const [overseasWritingLanguage, setOverseasWritingLanguage] = useState(
    DEFAULT_OVERSEAS_WRITING_LANGUAGE
  );
  /** 产品线/型号（创建可改；编辑时随任务 PATCH） */
  const [productDraft, setProductDraft] = useState(() =>
    ((defaultProductName ?? '') as string).trim()
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useWorkbenchToast();
  const {
    notifyOverseasNotOpen,
    notifyOverseasPathActivated,
    resetOverseasPathHint,
  } = useOverseasNotOpenHint(showToast);

  const [monitorTask, setMonitorTask] = useState<OptimizationTaskDTO | null>(null);
  /** 已有任务 id 时拉取详情：避免 monitoring + task 未就绪时误渲染整页「创建表单」导致布局跳动 */
  const [monitoringDetailStatus, setMonitoringDetailStatus] = useState<'idle' | 'loading' | 'error'>(() =>
    existingTaskId ? 'loading' : 'idle'
  );
  const [pollTick, setPollTick] = useState(0);
  const [taskActionPending, setTaskActionPending] = useState<TaskMonitorAction | null>(null);

  const refreshMonitorTask = useCallback(async () => {
    if (!existingTaskId) return;
    try {
      const t = await optimizationTaskAPI.get(existingTaskId);
      setMonitorTask(t);
    } catch (e) {
      console.warn('[OptimizationTaskFormBlock] refreshMonitorTask failed', e);
    }
  }, [existingTaskId]);

  // 拉模板与账号
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tplDom, tplOvs, accRes] = await Promise.all([
          getArticleTemplates({ is_active: true, limit: 100, market: 'domestic' }),
          getArticleTemplates({ is_active: true, limit: 100, market: 'overseas' }),
          getPostizAccounts(),
        ]);
        if (cancelled) return;
        const mapTpl = (list: typeof tplDom.templates) =>
          (list || []).map((t) => ({ id: t.id, name: t.title || `#${t.id}` }));
        setTemplatesDomestic(mapTpl(tplDom.templates));
        setTemplatesOverseas(mapTpl(tplOvs.templates));
        setAccounts(accRes || []);
      } catch {
        if (!cancelled) {
          setTemplatesDomestic([]);
          setTemplatesOverseas([]);
          setAccounts([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 商户积分余额（创建 / 编辑时展示）
  useEffect(() => {
    let cancelled = false;
    optimizationTaskAPI
      .getMerchantBalance()
      .then((r) => {
        if (!cancelled) setMerchantBalance(typeof r.merchantBalance === 'number' ? r.merchantBalance : null);
      })
      .catch(() => {
        if (!cancelled) setMerchantBalance(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 已有任务：拉详情进入监控视图
  useEffect(() => {
    if (!existingTaskId) {
      setMonitoringDetailStatus('idle');
      return;
    }
    let cancelled = false;
    setMonitoringDetailStatus('loading');
    (async () => {
      try {
        const t = await optimizationTaskAPI.get(existingTaskId);
        if (!cancelled) {
          setMonitorTask(t);
          setMode('monitoring');
          setMonitoringDetailStatus('idle');
        }
      } catch {
        if (!cancelled) {
          setMonitorTask(null);
          setMonitoringDetailStatus('error');
          setMode('form');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [existingTaskId]);

  // 监控视图轮询
  useEffect(() => {
    if (mode !== 'monitoring' || !monitorTask?.taskId) return;
    const t = setInterval(() => setPollTick((x) => x + 1), GEO_WORKFLOW_POLL_MS);
    return () => clearInterval(t);
  }, [mode, monitorTask?.taskId]);

  useEffect(() => {
    if (mode !== 'monitoring' || !monitorTask?.taskId) return;
    let cancelled = false;
    (async () => {
      try {
        const t = await optimizationTaskAPI.get(monitorTask.taskId);
        if (cancelled) return;
        setMonitorTask(t);
        let wf: GeoWorkflowDTO | null = null;
        if (workflowId) {
          try {
            wf = await geoWorkflowAPI.get(workflowId);
          } catch {
            wf = null;
          }
        }
        onTaskUpsertedRef.current?.(t, wf);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, monitorTask?.taskId, pollTick, workflowId]);

  const beginEdit = useCallback(async (taskId: string) => {
    try {
      const t = await optimizationTaskAPI.get(taskId);
      setScheduleCycle(t.scheduleCycle || 'weekly');
      setScheduleHour(t.scheduleHour ?? 9);
      setScheduleDow(t.scheduleDayOfWeek ?? 0);
      const domIds =
        (t.templateIdsDomestic?.length ? t.templateIdsDomestic : t.templateIds) || [];
      setTemplateIdsDomestic(
        domIds.length > 0
          ? domIds.map((x) => Number(x))
          : t.templateId != null
            ? [Number(t.templateId)]
            : []
      );
      setTemplateIdsOverseas((t.templateIdsOverseas || []).map((x) => Number(x)));
      setExpiresAtLocal(isoToDatetimeLocal(t.expiresAt));
      setImitateEnabledDomestic(Boolean(t.imitateEnabled));
      setPointsBudgetDomesticInput(
        (t.pointsBudgetDomesticPerCycle ?? t.pointsBudgetPerCycle) != null &&
          (t.pointsBudgetDomesticPerCycle ?? t.pointsBudgetPerCycle)! > 0
          ? String(t.pointsBudgetDomesticPerCycle ?? t.pointsBudgetPerCycle)
          : ''
      );
      setPointsBudgetOverseasInput(
        t.pointsBudgetOverseasPerCycle != null && t.pointsBudgetOverseasPerCycle > 0
          ? String(t.pointsBudgetOverseasPerCycle)
          : ''
      );
      setProductDraft((t.productName || '').trim());
      const ids = new Set<number>();
      for (const x of t.targetAccounts || []) {
        if (x.account_id != null) ids.add(x.account_id);
      }
      setSelectedAccountIds(ids);
      setThirdPartyPublishEnabled(Boolean(t.thirdPartyPublishEnabled));
      const wlIds = (t.thirdPartyMediaWhitelistIds || [])
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0);
      setMediaWhitelistIds(wlIds);
      setMediaWhitelistItems([]);
      if (wlIds.length > 0) {
        try {
          const cat = await listThirdPartyMediaOutlets({ page: 1, page_size: 200, ids: wlIds });
          const byId = new Map(cat.items.map((it) => [it.id, it]));
          setMediaWhitelistItems(wlIds.map((id) => byId.get(id)).filter(Boolean) as ThirdPartyMediaOutletDTO[]);
        } catch {
          /* ignore */
        }
      }
      setOverseasThirdPartyPublishEnabled(Boolean(t.overseasThirdPartyPublishEnabled));
      setOverseasWritingLanguage(
        normalizeOverseasWritingLanguage(t.overseasWritingLanguage),
      );
      setEditingTaskId(taskId);
      setMode('form');
    } catch (e: any) {
      alert(e?.message || t('taskForm.errors.loadFailed'));
    }
  }, []);

  const domesticPathOn = templateIdsDomestic.length > 0 || imitateEnabledDomestic;
  const overseasPathOn = templateIdsOverseas.length > 0;
  const hasOverseasWritingConfig = useMemo(() => {
    if (templateIdsOverseas.length > 0) return true;
    const raw = pointsBudgetOverseasInput.trim();
    if (raw) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n > 0) return true;
    }
    if ((monitorTask?.pointsBudgetOverseasPerCycle ?? 0) > 0) return true;
    if ((monitorTask?.templateIdsOverseas?.length ?? 0) > 0) return true;
    if (overseasThirdPartyPublishEnabled || monitorTask?.overseasThirdPartyPublishEnabled) return true;
    if (
      imitateEnabledDomestic &&
      ((monitorTask?.pointsBudgetOverseasPerCycle ?? 0) > 0 ||
        (raw && !Number.isNaN(parseInt(raw, 10)) && parseInt(raw, 10) > 0))
    ) {
      return true;
    }
    return false;
  }, [
    templateIdsOverseas.length,
    pointsBudgetOverseasInput,
    monitorTask?.pointsBudgetOverseasPerCycle,
    monitorTask?.templateIdsOverseas,
    monitorTask?.overseasThirdPartyPublishEnabled,
    overseasThirdPartyPublishEnabled,
    imitateEnabledDomestic,
  ]);
  const anyWriterPath = domesticPathOn || overseasPathOn || hasOverseasWritingConfig;
  const POINTS_UNIT = 10;

  useEffect(() => {
    if (!overseasPathOn) resetOverseasPathHint();
  }, [overseasPathOn, resetOverseasPathHint]);

  const effectiveRegionWords = useMemo(() => {
    if (diagnosisRegionWords?.length) return diagnosisRegionWords;
    if (monitorTask?.diagnosisRegionWords?.length) return monitorTask.diagnosisRegionWords;
    return null;
  }, [diagnosisRegionWords, monitorTask?.diagnosisRegionWords]);

  const cycleKeywordCount = useMemo(
    () => countOptimizationScenarioKeywords(coreKeywords.length, effectiveRegionWords),
    [coreKeywords.length, effectiveRegionWords]
  );

  const plannedDomesticTemplateArticles = useMemo(
    () =>
      templateIdsDomestic.length > 0
        ? Math.max(0, cycleKeywordCount) * templateIdsDomestic.length
        : 0,
    [templateIdsDomestic.length, cycleKeywordCount]
  );
  const plannedDomesticImitateArticles = useMemo(
    () => (imitateEnabledDomestic ? Math.max(0, cycleKeywordCount) : 0),
    [imitateEnabledDomestic, cycleKeywordCount]
  );
  const plannedDomesticArticlesTotal =
    plannedDomesticTemplateArticles + plannedDomesticImitateArticles;
  const plannedOverseasArticles = useMemo(
    () =>
      templateIdsOverseas.length > 0
        ? Math.max(0, cycleKeywordCount) * templateIdsOverseas.length
        : 0,
    [templateIdsOverseas.length, cycleKeywordCount]
  );

  const moveTemplateOrder = useCallback(
    (market: 'domestic' | 'overseas', idx: number, delta: number) => {
      const setter = market === 'domestic' ? setTemplateIdsDomestic : setTemplateIdsOverseas;
      setter((prev) => {
        const j = idx + delta;
        if (j < 0 || j >= prev.length) return prev;
        const next = [...prev];
        const t = next[idx]!;
        next[idx] = next[j]!;
        next[j] = t;
        return next;
      });
    },
    []
  );

  const removeTemplateAt = useCallback((market: 'domestic' | 'overseas', idx: number) => {
    const setter = market === 'domestic' ? setTemplateIdsDomestic : setTemplateIdsOverseas;
    setter((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const buildImitateConfig = useCallback((): Record<string, unknown> => {
    return {
      freshness_days: DEFAULT_DEEP_IMITATE_CONFIG.freshness_days,
      exclude_owned: DEFAULT_DEEP_IMITATE_CONFIG.exclude_owned,
    };
  }, []);

  const buildPointsStrategy = useCallback((): Record<string, unknown> | null => {
    if (!domesticPathOn && !overseasPathOn) return null;
    return { mode: 'quota', template_articles: 0, imitate_articles: 0, custom_articles: 0 };
  }, [domesticPathOn, overseasPathOn]);

  const validateMarketBudget = useCallback(
    (marketKey: 'domesticMarket' | 'overseasMarket', active: boolean, rawInput: string): string | null => {
      if (!active) return null;
      const pb = parseInt(rawInput.trim(), 10);
      if (!rawInput.trim() || Number.isNaN(pb) || pb < POINTS_UNIT || pb % POINTS_UNIT !== 0) {
        return t('taskForm.errors.invalidMarketBudget', {
          market: t(`taskForm.errors.${marketKey}`),
          unit: POINTS_UNIT,
        });
      }
      return null;
    },
    [t]
  );

  const validateWriterBudget = useCallback((): string | null => {
    return (
      validateMarketBudget('domesticMarket', domesticPathOn, pointsBudgetDomesticInput) ||
      validateMarketBudget('overseasMarket', overseasPathOn, pointsBudgetOverseasInput)
    );
  }, [
    domesticPathOn,
    overseasPathOn,
    pointsBudgetDomesticInput,
    pointsBudgetOverseasInput,
    validateMarketBudget,
  ]);

  const validateOverseasWritingLanguage = useCallback((): string | null => {
    if (!isOverseasWorkflow) return null;
    const code = normalizeOverseasWritingLanguage(overseasWritingLanguage);
    if (!code) return t('taskForm.errors.requireOverseasLanguage');
    return null;
  }, [isOverseasWorkflow, overseasWritingLanguage, t]);

  const handleSubmit = async () => {
    setError(null);
    const expIso = datetimeLocalToIsoUtc(expiresAtLocal.trim());
    if (!expIso || new Date(expIso).getTime() <= Date.now()) {
      setError(t('taskForm.errors.requireExpiry'));
      return;
    }

    if (editingTaskId) {
      if (isOverseasWorkflow) {
        const langErr = validateOverseasWritingLanguage();
        if (langErr) {
          setError(langErr);
          return;
        }
      }
      const editOverseasPathOn =
        isOverseasWorkflow && (templateIdsOverseas.length > 0 || imitateEnabledDomestic);
      const budgetErr = isOverseasWorkflow
        ? validateMarketBudget('overseasMarket', editOverseasPathOn, pointsBudgetOverseasInput)
        : validateMarketBudget('domesticMarket', domesticPathOn, pointsBudgetDomesticInput);
      if (budgetErr) {
        setError(budgetErr);
        return;
      }
      setSubmitting(true);
      try {
        const parseBudget = (active: boolean, raw: string) => {
          if (!active || !raw.trim()) return null;
          const n = parseInt(raw.trim(), 10);
          return Number.isNaN(n) ? null : n;
        };
        const patchPayload: Parameters<typeof optimizationTaskAPI.patch>[1] = {
          schedule_cycle: scheduleCycle,
          schedule_hour: scheduleCycle === 'hourly_6' ? null : scheduleHour,
          schedule_day_of_week: scheduleCycle === 'weekly' ? scheduleDow : null,
          expires_at: expIso,
        };
        const imitateConfig = imitateEnabledDomestic ? buildImitateConfig() : null;
        if (isOverseasWorkflow) {
          patchPayload.template_ids_overseas =
            templateIdsOverseas.length > 0 ? templateIdsOverseas : null;
          patchPayload.imitate_enabled = imitateEnabledDomestic;
          patchPayload.imitate_config = imitateConfig;
          patchPayload.overseas_writing_language = normalizeOverseasWritingLanguage(
            overseasWritingLanguage,
          );
          const pbOvs = parseBudget(editOverseasPathOn, pointsBudgetOverseasInput);
          patchPayload.points_budget_overseas_per_cycle = pbOvs;
        } else {
          patchPayload.template_ids_domestic =
            templateIdsDomestic.length > 0 ? templateIdsDomestic : null;
          patchPayload.template_ids = templateIdsDomestic.length > 0 ? templateIdsDomestic : null;
          patchPayload.imitate_enabled = imitateEnabledDomestic;
          patchPayload.imitate_config = imitateConfig;
          const pbDom = parseBudget(domesticPathOn, pointsBudgetDomesticInput);
          patchPayload.points_budget_domestic_per_cycle = pbDom;
          patchPayload.points_budget_per_cycle = pbDom;
        }
        const updated = await optimizationTaskAPI.patch(editingTaskId, patchPayload);
        setMonitorTask(updated);
        setEditingTaskId(null);
        setMode('monitoring');
        onTaskUpserted?.(updated, null);
      } catch (e: any) {
        setError(e?.message || t('taskForm.errors.saveFailed'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!anyWriterPath) {
      setError(t('taskForm.errors.requireWriterPath'));
      return;
    }
    if (pointsBudgetDomesticInput.trim() && !domesticPathOn) {
      setError(t('taskForm.errors.requireBudgetWithPath'));
      return;
    }

    const wbErr = validateWriterBudget();
    if (wbErr) {
      setError(wbErr);
      return;
    }
    const langErr = validateOverseasWritingLanguage();
    if (langErr) {
      setError(langErr);
      return;
    }

    const parseBudget = (active: boolean, raw: string) => {
      if (!active || !raw.trim()) return null;
      const n = parseInt(raw.trim(), 10);
      return Number.isNaN(n) ? null : n;
    };
    const points_budget_domestic_per_cycle = parseBudget(domesticPathOn, pointsBudgetDomesticInput);
    const points_budget_overseas_per_cycle = parseBudget(overseasPathOn, pointsBudgetOverseasInput);
    const points_budget_strategy = buildPointsStrategy();
    const effectiveProduct = productDraft.trim() || brandName.trim();

    const openclawCoordinator = domesticPathOn;
    const imitateConfig = imitateEnabledDomestic ? buildImitateConfig() : null;

    if (!brandName.trim() || !workflowId) {
      setError(t('taskForm.errors.requireBrandWorkflow'));
      return;
    }
    if (coreKeywords.length === 0) {
      setError(t('taskForm.errors.requireKeywords'));
      return;
    }

    const picked = accounts.filter(
      (a) => a.authorized && selectedAccountIds.has(a.id)
    );
    const target_accounts: TargetAccount[] = picked.map((a) => ({
      account_id: a.id,
      platform: a.postizIdentifier || a.platform || undefined,
    }));

    setSubmitting(true);
    try {
      const payload: CreateOptimizationTaskPayload = {
        brand_name: brandName.trim(),
        product_name: effectiveProduct,
        core_keywords: coreKeywords,
        core_keyword_groups: coreKeywordGroups?.length
          ? coreKeywordGroups.map((g) => ({ industry: g.industry, keywords: [...g.keywords] }))
          : null,
        diagnosis_region_words: effectiveRegionWords?.length ? effectiveRegionWords : null,
        subject_categories: subjectCategories?.length ? subjectCategories : null,
        target_accounts,
        knowledge_base_id: knowledgeBaseId ?? null,
        schedule_cycle: scheduleCycle,
        schedule_hour: scheduleCycle === 'hourly_6' ? null : scheduleHour,
        schedule_day_of_week: scheduleCycle === 'weekly' ? scheduleDow : null,
        max_articles_per_cycle: OPTIMIZATION_TASK_DEFAULT_MAX_ARTICLES_PER_CYCLE,
        cooldown_hours: OPTIMIZATION_TASK_DEFAULT_COOLDOWN_HOURS,
        template_id: templateIdsDomestic[0] ?? null,
        template_ids: templateIdsDomestic.length > 0 ? templateIdsDomestic : null,
        template_ids_domestic: templateIdsDomestic.length > 0 ? templateIdsDomestic : null,
        template_ids_overseas: templateIdsOverseas.length > 0 ? templateIdsOverseas : null,
        source_diagnosis_report_id: sourceDiagnosisReportId ?? null,
        baseline_visibility: baselineVisibility ?? null,
        extraction_task_id: extractionTaskId?.trim() || undefined,
        geo_workflow_id: workflowId,
        run_immediately: runImmediately,
        expires_at: expIso,
        imitate_enabled: imitateEnabledDomestic,
        imitate_config: imitateConfig ?? undefined,
        deep_imitate_enabled: false,
        deep_imitate_enabled_domestic: false,
        deep_imitate_enabled_overseas: false,
        deep_imitate_config: undefined,
        openclaw_coordinator_enabled: openclawCoordinator,
        custom_prompt: null,
        points_budget_per_cycle: points_budget_domestic_per_cycle,
        points_budget_domestic_per_cycle,
        points_budget_overseas_per_cycle,
        points_budget_strategy: points_budget_strategy ?? null,
        third_party_publish_enabled: thirdPartyPublishEnabled,
        third_party_media_whitelist_ids:
          mediaWhitelistIds.length > 0 ? mediaWhitelistIds : null,
        overseas_third_party_publish_enabled: overseasThirdPartyPublishEnabled,
        overseas_writing_language: isOverseasWorkflow
          ? normalizeOverseasWritingLanguage(overseasWritingLanguage)
          : overseasPathOn
            ? DEFAULT_DOMESTIC_WRITING_LANGUAGE
            : null,
      };
      const created = await optimizationTaskAPI.create(payload);

      // 写回 workflow.optimization_task_id（与 BrandParseWizard 不同：BrandParseWizard 只在 fetchWorkflowDetail 时刷新；
      // 这里显式 advance 以确保半周期 diagnosis(pending) 直接跳 monitoring）
      let nextWf: GeoWorkflowDTO | null = null;
      try {
        nextWf = await geoWorkflowAPI.advance(workflowId, {
          optimization_task_id: created.taskId,
        });
      } catch {
        /* 状态不允许 advance 时忽略：后端已通过 geo_workflow_id 关联，回落到 get 兜底 */
      }
      if (!nextWf) {
        try {
          nextWf = await geoWorkflowAPI.get(workflowId);
        } catch {
          /* 兜底失败也不阻塞主流程，父端会再做一次 refetch */
        }
      }

      setMonitorTask(created);
      setMode('monitoring');
      onTaskUpserted?.(created, nextWf);
    } catch (e: any) {
      setError(e?.message || t('taskForm.errors.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAccount = (id: number) => {
    const n = new Set(selectedAccountIds);
    if (n.has(id)) n.delete(id);
    else {
      n.add(id);
      notifyOverseasNotOpen();
    }
    setSelectedAccountIds(n);
  };

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#E8553F] focus:ring-2 focus:ring-[#E8553F]/20';
  const labelStrong = 'mb-2 block text-sm font-semibold text-[#374151]';

  const showCancel = useMemo(
    () => Boolean(editingTaskId || onCancel),
    [editingTaskId, onCancel]
  );

  const scheduleCycleLabel = useMemo(() => {
    if (scheduleCycle === 'hourly_6') return t('taskForm.schedule.hourly6');
    if (scheduleCycle === 'weekly') return t('taskForm.schedule.weekly');
    return t('taskForm.schedule.daily');
  }, [scheduleCycle]);

  const commonSectionSummary = useMemo(() => {
    const prod = (productDraft || brandName).trim() || brandName;
    let exp = '—';
    const iso = datetimeLocalToIsoUtc(expiresAtLocal.trim());
    if (iso) {
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) {
        exp = d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      }
    }
    const run = runImmediately ? t('taskForm.schedule.runImmediately') : t('taskForm.schedule.runScheduled');
    return `${brandName} · ${prod} · ${scheduleCycleLabel} · 有效期 ${exp} · ${run}`;
  }, [brandName, productDraft, scheduleCycleLabel, expiresAtLocal, runImmediately]);

  const domesticSectionSummary = useMemo(() => {
    const parts: string[] = [];
    if (templateIdsDomestic.length > 0) parts.push(`范文 ${templateIdsDomestic.length} 个`);
    if (imitateEnabledDomestic) parts.push(t('taskForm.summary.imitate'));
    if (pointsBudgetDomesticInput.trim()) parts.push(`预算 ${pointsBudgetDomesticInput.trim()} 分`);
    if (thirdPartyPublishEnabled) {
      parts.push(
        mediaWhitelistIds.length > 0
          ? `智能匹配三方媒体(${mediaWhitelistIds.length}家)`
          : t('taskForm.summary.thirdPartyAllCatalog')
      );
    }
    if (parts.length > 0) return parts.join(' · ');
    if (pointsBudgetDomesticInput.trim()) return `周期上限 ${pointsBudgetDomesticInput.trim()} 分（待启用范文/仿写）`;
    return t('taskForm.summary.noDomestic');
  }, [
    templateIdsDomestic.length,
    imitateEnabledDomestic,
    pointsBudgetDomesticInput,
    thirdPartyPublishEnabled,
    mediaWhitelistIds.length,
  ]);

  const internationalSectionSummary = useMemo(() => {
    const parts: string[] = [];
    if (templateIdsOverseas.length > 0) parts.push(`范文 ${templateIdsOverseas.length} 个`);
    if (pointsBudgetOverseasInput.trim()) parts.push(`预算 ${pointsBudgetOverseasInput.trim()} 分`);
    if (overseasPathOn || hasOverseasWritingConfig) {
      parts.push(overseasWritingLanguageLabel(DEFAULT_DOMESTIC_WRITING_LANGUAGE));
    }
    const accN = selectedAccountIds.size;
    if (accN > 0) parts.push(`出海账号 ${accN} 个`);
    if (overseasThirdPartyPublishEnabled) parts.push(t('taskForm.summary.overseasThirdParty'));
    return parts.length > 0 ? parts.join(' · ') : t('taskForm.summary.noInternational');
  }, [
    templateIdsOverseas.length,
    pointsBudgetOverseasInput,
    overseasPathOn,
    hasOverseasWritingConfig,
    selectedAccountIds.size,
    overseasThirdPartyPublishEnabled,
  ]);

  if (mode === 'monitoring' && existingTaskId && !monitorTask && monitoringDetailStatus === 'loading') {
    return (
      <div className="w-full min-w-0 space-y-4">
        <div className="w-full min-h-[280px] rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-sm text-slate-500">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#E8553F]" aria-hidden />
            {t('cockpit.loading')}
          </div>
        </div>
      </div>
    );
  }

  // ============== 监控视图 ==============
  if (mode === 'monitoring' && monitorTask) {
    const task = monitorTask;
    const ended = ['stopped', 'expired', 'failed', 'accepted'].includes((task.status || '').toLowerCase());

    const actionLocked = taskActionPending !== null;

    const handlePause = async () => {
      setTaskActionPending('pause');
      try {
        await optimizationTaskAPI.pause(task.taskId);
        await refreshMonitorTask();
      } catch (e: unknown) {
        alert((e as Error)?.message || t('taskForm.errors.pauseFailed'));
      } finally {
        setTaskActionPending(null);
      }
    };
    const handleResume = async () => {
      setTaskActionPending('resume');
      try {
        await optimizationTaskAPI.resume(task.taskId);
        await refreshMonitorTask();
      } catch (e: unknown) {
        alert((e as Error)?.message || t('taskForm.errors.resumeFailed'));
      } finally {
        setTaskActionPending(null);
      }
    };

    const handleResetLastCycle = async () => {
      setTaskActionPending('reset');
      try {
        await optimizationTaskAPI.resetLastCycle(task.taskId, { skipDoubaoHeader: true });
        try {
          const updated = await optimizationTaskAPI.get(task.taskId, { skipDoubaoHeader: true });
          setMonitorTask(updated);
        } catch {
          await refreshMonitorTask();
        }
        alert(t('taskForm.monitoring.resetSuccess'));
      } catch (e: unknown) {
        const err = e as Error;
        console.error('[OptimizationTaskFormBlock] resetLastCycle failed', err);
        alert(err?.message || t('taskForm.errors.resetFailed'));
      } finally {
        setTaskActionPending(null);
      }
    };

    const cycleBusy = optimizationTaskHasRunningCycle(task);
    const canManualRunNow =
      !ended && ['running', 'pending', 'paused'].includes((task.status || '').toLowerCase());

    const handleRunCycleNow = async () => {
      if (cycleBusy) {
        alert(t('taskForm.errors.cycleBusy'));
        return;
      }
      setTaskActionPending('run_now');
      try {
        await optimizationTaskAPI.runCycleNow(task.taskId);
        await refreshMonitorTask();
      } catch (e: unknown) {
        const err = e as Error & { status?: number; statusCode?: number };
        const code = err.status ?? err.statusCode;
        if (code === 409) {
          alert(t('taskForm.errors.cycleAlreadyRunning'));
        } else {
          alert(err?.message || t('taskForm.errors.runNowFailed'));
        }
      } finally {
        setTaskActionPending(null);
      }
    };

    return (
      <div className="w-full min-w-0 space-y-4">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-[#111827]">{t('cockpit.statusInProgress')}</h3>
              <p className="mt-1 text-xs text-[#64748b]">
                {t('taskForm.monitoring.taskSummary', {
                  taskId: task.taskId,
                  status: task.status,
                  cycles: task.totalCyclesRun,
                })}
                {task.expiresAt
                  ? t('taskForm.monitoring.expiresAt', {
                      time: new Date(task.expiresAt).toLocaleString(),
                    })
                  : ''}
              </p>
              <p className="mt-1 text-xs text-[#64748b]">
                {t('taskForm.monitoring.nextRun', {
                  time: task.nextCycleAt ? new Date(task.nextCycleAt).toLocaleString() : '—',
                })}
              </p>
              {task.errorMessage ? (
                <p className="mt-1 text-xs text-amber-700">
                  {t('taskForm.monitoring.hintPrefix', { message: task.errorMessage })}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
              {canManualRunNow ? (
                <button
                  type="button"
                  disabled={actionLocked || cycleBusy}
                  title={cycleBusy ? t('taskForm.monitoring.runNowBlocked') : t('taskForm.monitoring.runNowTitle')}
                  onClick={() => void handleRunCycleNow()}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#E8553F]/40 bg-[#E8553F]/5 text-[#E8553F] hover:bg-[#E8553F]/10 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed"
                >
                  {taskActionPending === 'run_now' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  {t('taskForm.monitoring.runNow')}
                </button>
              ) : null}
              {!ended && task.status === 'running' ? (
                <button
                  type="button"
                  disabled={actionLocked}
                  title={t('taskForm.monitoring.pauseTitle')}
                  onClick={() => void handlePause()}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:border-amber-400 hover:text-amber-800 disabled:opacity-50"
                >
                  {taskActionPending === 'pause' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Pause className="w-3.5 h-3.5" />
                  )}
                  {t('taskForm.monitoring.pause')}
                </button>
              ) : null}
              {!ended && ['running', 'pending', 'paused'].includes((task.status || '').toLowerCase()) ? (
                <button
                  type="button"
                  disabled={actionLocked}
                  title={t('taskForm.monitoring.resetTitle')}
                  onClick={() => void handleResetLastCycle()}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  {taskActionPending === 'reset' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  {t('taskForm.monitoring.reset')}
                </button>
              ) : null}
              {!ended && task.status === 'paused' ? (
                <button
                  type="button"
                  disabled={actionLocked}
                  onClick={() => void handleResume()}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-500/50 hover:text-emerald-700 disabled:opacity-50"
                >
                  {taskActionPending === 'resume' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {t('taskForm.monitoring.resume')}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => beginEdit(task.taskId)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:border-[#E8553F]/40 hover:text-[#E8553F]"
              >
                {t('taskForm.editMonitoringConfig')}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label={t('taskForm.monitoring.taskStatus')} value={task.status} />
            <Stat label={t('taskForm.monitoring.totalCycles')} value={String(task.totalCyclesRun)} />
            <Stat
              label={t('taskForm.monitoring.merchantPoints')}
              value={task.merchantBalance != null ? String(task.merchantBalance) : '—'}
            />
            <Stat
              label={t('taskForm.monitoring.domesticBudget')}
              value={
                (task.pointsBudgetDomesticPerCycle ?? task.pointsBudgetPerCycle) != null &&
                (task.pointsBudgetDomesticPerCycle ?? task.pointsBudgetPerCycle)! > 0
                  ? String(task.pointsBudgetDomesticPerCycle ?? task.pointsBudgetPerCycle)
                  : '—'
              }
            />
          </div>

          {(() => {
            const latest = task.cycles?.[0] ?? null;
            const reportStep = latest?.cycleStepResults?.report;
            const reportSt = (reportStep?.status || '').toLowerCase();
            const reportTaskId = (task.artifactReportTaskId || '').trim();
            const reportReady =
              Boolean(reportTaskId) ||
              reportSt === 'success' ||
              (reportStep?.reportId != null && reportStep.reportId > 0);
            const reportGenerating =
              !reportReady && (cycleBusy || reportSt === 'running' || reportSt === 'pending');
            const writerPathOn =
              SHOW_OPT_WRITER_PATH_OPTIONS &&
              ((task.templateIdsDomestic?.length ?? task.templateIds?.length ?? 0) > 0 ||
                Boolean(task.imitateEnabled));
            const statusCls = (kind: 'ready' | 'busy' | 'idle') =>
              kind === 'ready'
                ? 'text-emerald-700'
                : kind === 'busy'
                  ? 'text-amber-700'
                  : 'text-slate-500';
            const statusText = reportReady
              ? t('taskForm.monitoring.diagnosisReady')
              : reportGenerating
                ? t('taskForm.monitoring.diagnosisGenerating')
                : t('taskForm.monitoring.diagnosisPending');
            const statusKind: 'ready' | 'busy' | 'idle' = reportReady
              ? 'ready'
              : reportGenerating
                ? 'busy'
                : 'idle';
            return (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#111827]">
                      {latest
                        ? t('taskForm.monitoring.latestCycleDiagnosis', {
                            cycle: latest.cycleNumber,
                          })
                        : t('taskForm.monitoring.latestCycleDiagnosisEmpty')}
                    </p>
                    {latest ? (
                      <span className={`text-xs font-medium ${statusCls(statusKind)}`}>
                        {statusText}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('taskForm.monitoring.diagnosisCycleHint')}
                  </p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-white bg-white px-3 py-2">
                      <span className="text-sm font-medium text-[#111827]">
                        {t('taskForm.monitoring.analysisReport')}
                      </span>
                      <span className="text-right text-xs">
                        {reportReady && onOpenAnalysisReport ? (
                          <button
                            type="button"
                            className="font-semibold text-[#E8553F] underline-offset-2 hover:underline"
                            onClick={() => onOpenAnalysisReport()}
                          >
                            {t('taskForm.monitoring.view')}
                          </button>
                        ) : (
                          <span className={statusCls(statusKind)}>{statusText}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-white bg-white px-3 py-2">
                      <span className="text-sm font-medium text-[#111827]">
                        {t('taskForm.monitoring.analysisDetail')}
                      </span>
                      <span className="text-right text-xs">
                        {reportReady && onOpenAnalysisDetail ? (
                          <button
                            type="button"
                            className="font-semibold text-[#E8553F] underline-offset-2 hover:underline"
                            onClick={() => onOpenAnalysisDetail()}
                          >
                            {t('taskForm.monitoring.view')}
                          </button>
                        ) : (
                          <span className={statusCls(statusKind)}>{statusText}</span>
                        )}
                      </span>
                    </div>
                  </div>
                  {(() => {
                    const deliveryArticles =
                      latest?.cycleStepResults?.delivery?.articles?.filter(
                        (a) => (a?.url || '').trim().length > 0,
                      ) ?? [];
                    if (deliveryArticles.length === 0) return null;
                    return (
                      <div className="mt-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4">
                        <p className="text-sm font-semibold text-[#111827]">
                          {t('taskForm.monitoring.cycleDeliveryTitle')}
                        </p>
                        <ul className="mt-2 space-y-2">
                          {deliveryArticles.map((item, idx) => (
                            <li key={`${item.url}-${idx}`}>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm font-medium text-[#E8553F] underline-offset-2 hover:underline break-all"
                              >
                                {item.title?.trim() || item.url}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })()}
                </div>

                {writerPathOn && latest ? (
                  <OpenClawCycleSteps
                    taskId={task.taskId}
                    cycleNumber={latest.cycleNumber}
                    cycleStepResults={latest.cycleStepResults}
                    sectionTitle={t('taskForm.sections.monitoring.latestCycle')}
                    onDownloadError={(msg) => showToast(msg)}
                    thirdPartyPublishEnabled={task.thirdPartyPublishEnabled}
                    cycleRunning={cycleBusy}
                  />
                ) : null}
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // ============== 表单视图 ==============
  return (
    <div className="w-full min-w-0 space-y-4">
      <WorkbenchToast toast={toast} />

      <OptTaskSectionCard
        {...sectionCardI18n(t('taskForm.sections.common.title'))}
        title={t('taskForm.sections.common.title')}
        description={t('taskForm.sections.common.description')}
        collapsedSummary={commonSectionSummary}
        defaultCollapsed={false}
        hideHeader={Boolean(editingTaskId)}
      >
      {!editingTaskId ? (
      <div className="grid w-full min-w-0 grid-cols-2 gap-4 max-sm:grid-cols-1">
        <div className="sm:col-span-2">
          <label className={labelStrong}>{t('taskForm.form.brandName')}</label>
          <input type="text" className={`${inputCls} bg-slate-50 text-slate-600`} readOnly value={brandName} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelStrong}>{t('taskForm.form.productLine')}</label>
          <input
            type="text"
            className={inputCls}
            value={productDraft}
            onChange={(e) => setProductDraft(e.target.value)}
            placeholder={t('taskForm.form.productLinePlaceholder')}
          />
        </div>
      </div>
      ) : null}

      <div className="grid w-full min-w-0 grid-cols-2 gap-4 max-sm:grid-cols-1">
        <div className="sm:col-span-2">
          <label className={labelStrong}>{t('taskForm.form.taskExpiry')}</label>
          <input
            type="datetime-local"
            className={inputCls}
            value={expiresAtLocal}
            onChange={(e) => setExpiresAtLocal(e.target.value)}
          />
          {!editingTaskId ? (
            <p className="mt-1 text-xs text-slate-500">{t('taskForm.form.taskExpiryHint')}</p>
          ) : null}
        </div>

        <div>
          <label className={labelStrong}>{t('taskForm.form.schedule')}</label>
          <select
            className={inputCls}
            value={scheduleCycle}
            onChange={(e) => setScheduleCycle(e.target.value)}
          >
            <option value="hourly_6">{t('taskForm.schedule.hourly6')}</option>
            <option value="daily">{t('taskForm.schedule.daily')}</option>
            <option value="weekly">{t('taskForm.schedule.weekly')}</option>
          </select>
        </div>
        {scheduleCycle !== 'hourly_6' ? (
          <div>
            <label className={labelStrong}>{t('taskForm.form.scheduleHour')}</label>
            <input
              type="number"
              min={0}
              max={23}
              className={inputCls}
              value={scheduleHour}
              onChange={(e) => setScheduleHour(Number(e.target.value))}
            />
          </div>
        ) : null}
        {scheduleCycle === 'weekly' ? (
          <div>
            <label className={labelStrong}>{t('taskForm.form.scheduleDow')}</label>
            <input
              type="number"
              min={0}
              max={6}
              className={inputCls}
              value={scheduleDow}
              onChange={(e) => setScheduleDow(Number(e.target.value))}
            />
          </div>
        ) : null}

        {!editingTaskId ? (
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
                checked={runImmediately}
                onChange={(e) => setRunImmediately(e.target.checked)}
              />
              <span>
                <span className="font-semibold">{t('taskForm.form.runImmediately')}</span>
                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  {t('taskForm.form.runImmediatelyHint')}
                </span>
              </span>
            </label>
          </div>
        ) : null}

        {editingTaskId ? (
          <div className="sm:col-span-2 space-y-4 border-t border-slate-100 pt-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{t('taskForm.form.templatesTitle')}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {isOverseasWorkflow
                    ? t('taskForm.form.overseasTemplatesEditHint')
                    : t('taskForm.form.templatesSectionDescription')}
                </p>
              </div>
              <div className="space-y-2">
                <label className={labelStrong}>{t('taskForm.form.templates')}</label>
                <select
                  className={inputCls}
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) return;
                    const id = Number(v);
                    if (Number.isNaN(id)) return;
                    if (isOverseasWorkflow) {
                      if (!templateIdsOverseas.includes(id)) {
                        setTemplateIdsOverseas((prev) => [...prev, id]);
                      }
                    } else if (!templateIdsDomestic.includes(id)) {
                      setTemplateIdsDomestic((prev) => [...prev, id]);
                    }
                    e.target.value = '';
                  }}
                >
                  <option value="">
                    {isOverseasWorkflow
                      ? t('taskForm.form.addOverseasTemplate')
                      : t('taskForm.form.addTemplate')}
                  </option>
                  {(isOverseasWorkflow ? templatesOverseas : templatesDomestic)
                    .filter((x) =>
                      isOverseasWorkflow
                        ? !templateIdsOverseas.includes(x.id)
                        : !templateIdsDomestic.includes(x.id),
                    )
                    .map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                </select>
                {(isOverseasWorkflow ? templateIdsOverseas : templateIdsDomestic).length > 0 ? (
                  <ul className="space-y-1.5">
                    {(isOverseasWorkflow ? templateIdsOverseas : templateIdsDomestic).map((tid, idx) => {
                      const catalog = isOverseasWorkflow ? templatesOverseas : templatesDomestic;
                      const name = catalog.find((x) => x.id === tid)?.name ?? `#${tid}`;
                      const market = isOverseasWorkflow ? 'overseas' : 'domestic';
                      return (
                        <li
                          key={`edit-${market}-${tid}-${idx}`}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-xs"
                        >
                          <span className="min-w-[1.25rem] font-mono text-slate-500">{idx + 1}.</span>
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{name}</span>
                          <button
                            type="button"
                            className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                            disabled={idx === 0}
                            onClick={() => moveTemplateOrder(market, idx, -1)}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                            disabled={
                              idx >=
                              (isOverseasWorkflow ? templateIdsOverseas : templateIdsDomestic).length - 1
                            }
                            onClick={() => moveTemplateOrder(market, idx, 1)}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="shrink-0 rounded px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                            onClick={() => removeTemplateAt(market, idx)}
                          >
                            {t('taskForm.form.removeTemplate')}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-400">{t('taskForm.form.noTemplatesHint')}</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{t('taskForm.form.rewrite')}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {isOverseasWorkflow
                    ? t('taskForm.form.overseasRewriteEditHint')
                    : t('taskForm.form.rewriteDescription')}
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
                  checked={imitateEnabledDomestic}
                  onChange={(e) => setImitateEnabledDomestic(e.target.checked)}
                />
                <span>
                  <span className="font-semibold">{t('taskForm.form.enableRewrite')}</span>
                  <span className="mt-0.5 block text-xs font-normal text-slate-500">
                    {isOverseasWorkflow
                      ? t('taskForm.form.overseasEnableRewriteHint')
                      : t('taskForm.form.enableRewriteHint')}
                  </span>
                </span>
              </label>
            </div>

            {isOverseasWorkflow ? (
              <div>
                <label className={labelStrong}>{t('taskForm.form.overseasWritingLanguage')}</label>
                <select
                  className={inputCls}
                  value={overseasWritingLanguage}
                  onChange={(e) => setOverseasWritingLanguage(e.target.value)}
                >
                  {OVERSEAS_WRITING_LANGUAGE_OPTIONS.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label className={labelStrong}>
                {isOverseasWorkflow
                  ? t('taskForm.form.overseasPointsBudget')
                  : t('taskForm.form.pointsBudget')}
              </label>
              <input
                type="number"
                min={10}
                step={10}
                className={inputCls}
                value={isOverseasWorkflow ? pointsBudgetOverseasInput : pointsBudgetDomesticInput}
                onChange={(e) =>
                  isOverseasWorkflow
                    ? setPointsBudgetOverseasInput(e.target.value)
                    : setPointsBudgetDomesticInput(e.target.value)
                }
                placeholder={t('taskForm.form.pointsBudgetPlaceholder')}
              />
            </div>
          </div>
        ) : null}
      </div>
      </OptTaskSectionCard>

      {!editingTaskId && SHOW_OPT_WRITER_PATH_OPTIONS ? (
      <>
      <OptTaskSectionCard
        {...sectionCardI18n(t('taskForm.sections.domestic.title'))}
        title={t('taskForm.sections.domestic.title')}
        description={t('taskForm.sections.domestic.description')}
        collapsedSummary={domesticSectionSummary}
        defaultCollapsed
      >
        <div className="space-y-4">
          {/* ① 范文 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-[#111827]">{t('taskForm.form.templatesTitle')}</p>
              <p className="mt-1 text-xs text-slate-500">
                {t('taskForm.form.templatesSectionDescription')}
              </p>
            </div>
            <div className="space-y-2">
              <label className={labelStrong}>{t('taskForm.form.templates')}</label>
              <select
                className={inputCls}
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  const id = Number(v);
                  if (!Number.isNaN(id) && !templateIdsDomestic.includes(id)) {
                    setTemplateIdsDomestic((prev) => [...prev, id]);
                  }
                  e.target.value = '';
                }}
              >
                <option value="">{t('taskForm.form.addTemplate')}</option>
                {templatesDomestic
                  .filter((x) => !templateIdsDomestic.includes(x.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
              {templateIdsDomestic.length > 0 ? (
                <ul className="space-y-1.5">
                  {templateIdsDomestic.map((tid, idx) => {
                    const name = templatesDomestic.find((x) => x.id === tid)?.name ?? `#${tid}`;
                    return (
                      <li
                        key={`dom-${tid}-${idx}`}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-2 py-1.5 text-xs"
                      >
                        <span className="min-w-[1.25rem] font-mono text-slate-500">{idx + 1}.</span>
                        <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{name}</span>
                        <button
                          type="button"
                          className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                          disabled={idx === 0}
                          onClick={() => moveTemplateOrder('domestic', idx, -1)}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                          disabled={idx >= templateIdsDomestic.length - 1}
                          onClick={() => moveTemplateOrder('domestic', idx, 1)}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="shrink-0 rounded px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                          onClick={() => removeTemplateAt('domestic', idx)}
                        >
                          {t('taskForm.form.removeTemplate')}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">{t('taskForm.form.noTemplatesHint')}</p>
              )}
              {templateIdsDomestic.length > 0 ? (
                <p className="text-xs text-slate-500">
                  {t('taskForm.form.plannedArticles', {
                    count: plannedDomesticTemplateArticles,
                    keywords: cycleKeywordCount,
                    templates: templateIdsDomestic.length,
                  })}
                </p>
              ) : null}
            </div>
          </div>

          {/* ② 仿写 */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-[#111827]">{t('taskForm.form.rewrite')}</p>
              <p className="mt-1 text-xs text-slate-500">
                {t('taskForm.form.rewriteDescription')}
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
                checked={imitateEnabledDomestic}
                onChange={(e) => setImitateEnabledDomestic(e.target.checked)}
              />
              <span>
                <span className="font-semibold">{t('taskForm.form.enableRewrite')}</span>
                <span className="mt-0.5 block text-xs font-normal text-slate-500">
                  {t('taskForm.form.enableRewriteHint')}
                </span>
              </span>
            </label>
            {imitateEnabledDomestic ? (
              <p className="text-xs text-slate-500">
                {t('taskForm.form.plannedRewrite', {
                  count: plannedDomesticImitateArticles,
                  keywords: cycleKeywordCount,
                })}
              </p>
            ) : null}
          </div>

          {/* 周期计费 */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 space-y-3">
            <p className="text-sm font-semibold text-[#111827]">{t('taskForm.form.billing')}</p>
            <p className="text-xs leading-relaxed text-slate-600">
              {t('taskForm.form.billingDescription')}
            </p>
            <div className="space-y-2">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <label className={labelStrong}>{t('taskForm.form.pointsBudget')}</label>
                {merchantBalance != null ? (
                  <span
                    className="text-xs text-slate-600 pb-0.5"
                    dangerouslySetInnerHTML={{
                      __html: t('taskForm.form.merchantBalance', { balance: merchantBalance }),
                    }}
                  />
                ) : null}
              </div>
              <input
                type="number"
                min={10}
                step={10}
                className={inputCls}
                value={pointsBudgetDomesticInput}
                onChange={(e) => setPointsBudgetDomesticInput(e.target.value)}
                placeholder={t('taskForm.form.pointsBudgetPlaceholder')}
              />
              {domesticPathOn && plannedDomesticArticlesTotal > 0 ? (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('taskForm.form.billingPlanNote', {
                    total: plannedDomesticArticlesTotal,
                    detail:
                      plannedDomesticTemplateArticles > 0 || plannedDomesticImitateArticles > 0
                        ? `（${[
                            plannedDomesticTemplateArticles > 0
                              ? t('taskForm.form.billingBreakdownTemplate', {
                                  count: plannedDomesticTemplateArticles,
                                })
                              : '',
                            plannedDomesticImitateArticles > 0
                              ? t('taskForm.form.billingBreakdownRewrite', {
                                  count: plannedDomesticImitateArticles,
                                })
                              : '',
                          ]
                            .filter(Boolean)
                            .join('；')}）`
                        : '',
                  })}
                </p>
              ) : null}
            </div>
          </div>

          {/* 国内发布（可选） */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <p className="text-sm font-semibold text-[#111827]">{t('taskForm.form.domesticPublish')}</p>
            <p className="text-xs leading-relaxed text-[#64748b]">
              {t('taskForm.form.domesticPublishHint')}
            </p>

          <div className="rounded-xl border border-slate-100 bg-[#f8f9fb] p-4 space-y-3">
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-800">
                1
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-rose-900">{t('taskForm.form.selfMediaPublish')}</span>
                    <DeployGuideLink onNavigate={onNavigateToDeployGuide} label={t('taskForm.deployGuideLink')} />
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {t('taskForm.form.selfMediaPublishHint')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-[#f8f9fb] p-4">
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700">
                2
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <span className="text-sm font-semibold text-slate-900">{t('taskForm.form.thirdPartyPublish')}</span>
                  <p className="mt-1 text-xs text-slate-600">
                    {t('taskForm.form.thirdPartyPublishHint')}
                  </p>
                </div>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                checked={thirdPartyPublishEnabled}
                onChange={(e) => setThirdPartyPublishEnabled(e.target.checked)}
              />
              <span className="min-w-0 flex-1 font-semibold text-slate-900">{t('taskForm.form.enableThirdPartyPublish')}</span>
              <button
                type="button"
                disabled={!thirdPartyPublishEnabled}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMediaWhitelistModalOpen(true);
                }}
                className="shrink-0 text-sm font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
              >
                {t('taskForm.form.mediaWhitelist')}
              </button>
            </label>
                <ThirdPartyMediaWhitelistSummary
                  items={mediaWhitelistItems}
                  useAllCatalog={thirdPartyPublishEnabled && mediaWhitelistIds.length === 0}
                />
              </div>
            </div>
          </div>
          <ThirdPartyMediaWhitelistModal
            open={mediaWhitelistModalOpen}
            onClose={() => setMediaWhitelistModalOpen(false)}
            selectedIds={mediaWhitelistIds}
            onSave={(ids, items) => {
              setMediaWhitelistIds(ids);
              setMediaWhitelistItems(items);
            }}
          />
          </div>
        </div>
      </OptTaskSectionCard>

      <OptTaskSectionCard
        {...sectionCardI18n(t('taskForm.sections.international.title'))}
        title={t('taskForm.sections.international.title')}
        description={t('taskForm.sections.international.description')}
        collapsedSummary={internationalSectionSummary}
        defaultCollapsed
      >
          <div className="space-y-2">
            <label className={labelStrong}>{t('taskForm.form.templates')}</label>
            <select
              className={inputCls}
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                const id = Number(v);
                if (!Number.isNaN(id) && !templateIdsOverseas.includes(id)) {
                  if (templateIdsOverseas.length === 0) {
                    notifyOverseasPathActivated();
                  }
                  setTemplateIdsOverseas((prev) => [...prev, id]);
                }
                e.target.value = '';
              }}
            >
              <option value="">{t('taskForm.form.addOverseasTemplate')}</option>
              {templatesOverseas
                .filter((x) => !templateIdsOverseas.includes(x.id))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
            {templateIdsOverseas.length > 0 ? (
              <ul className="space-y-1.5">
                {templateIdsOverseas.map((tid, idx) => {
                  const name = templatesOverseas.find((x) => x.id === tid)?.name ?? `#${tid}`;
                  return (
                    <li
                      key={`ovs-${tid}-${idx}`}
                      className="flex items-center gap-2 rounded-lg border border-teal-100 bg-white px-2 py-1.5 text-xs"
                    >
                      <span className="font-mono text-slate-500">{idx + 1}.</span>
                      <span className="min-w-0 flex-1 truncate">{name}</span>
                      <button type="button" onClick={() => removeTemplateAt('overseas', idx)} className="text-red-600 text-[11px]">
                        {t('taskForm.form.removeTemplate')}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          {overseasPathOn ? (
            <>
              <div>
                <label className={labelStrong}>{t('taskForm.form.overseasPointsBudget')}</label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  className={inputCls}
                  value={pointsBudgetOverseasInput}
                  onChange={(e) => setPointsBudgetOverseasInput(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {t('taskForm.form.overseasPlanned', {
                    count: plannedOverseasArticles,
                    language: overseasWritingLanguageLabel(DEFAULT_DOMESTIC_WRITING_LANGUAGE),
                  })}
                </p>
              </div>
            </>
          ) : null}

        <div className="space-y-3 pt-1">
            <p className="text-sm font-semibold text-[#111827]">{t('taskForm.form.overseasPublish')}</p>
            <p className="text-xs text-[#64748b]">
              {t('taskForm.form.overseasPublishHint')}
            </p>

          <div className="rounded-xl border border-teal-100 bg-white/90 p-4 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-800">
                1
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-teal-900">{t('taskForm.form.overseasSocialPublish')}</p>
                <p className="mt-1 text-xs text-teal-800/80">
                  {t('taskForm.form.overseasSocialPublishHint')}
                </p>
              </div>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto ml-9">
              {accounts.filter((a) => a.authorized).length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">{t('taskForm.form.noOverseasAccounts')}</p>
                  {onNavigateToSocialAccounts ? (
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          sessionStorage.setItem(SOCIAL_ACCOUNTS_FROM_OPTIMIZATION_WORKBENCH_KEY, '1');
                        } catch {
                          /* ignore */
                        }
                        onNavigateToSocialAccounts();
                      }}
                      className="text-sm font-semibold text-[#E8553F] underline-offset-2 hover:underline"
                    >
                      {t('taskForm.form.goAddOverseasAccounts')}
                    </button>
                  ) : null}
                </div>
              ) : (
                accounts
                  .filter((a) => a.authorized)
                  .map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                        disabled={!!editingTaskId}
                        checked={selectedAccountIds.has(a.id)}
                        onChange={() => toggleAccount(a.id)}
                      />
                      <span className="text-sm text-slate-800">
                        {a.displayName || a.nickname || a.platform}
                        {a.postizIdentifier ? ` · ${a.postizIdentifier}` : ''}
                      </span>
                    </label>
                  ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50/80 to-cyan-50/40 p-4 shadow-sm">
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[11px] font-bold text-teal-800">
                2
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-teal-900">{t('taskForm.form.overseasThirdPartyPublish')}</span>
                <p className="mt-1 text-xs text-teal-800/90">
                  {t('taskForm.form.overseasThirdPartyPublishHint')}
                </p>
              </div>
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-lg border border-teal-200/70 bg-white/90 px-3 py-3 text-sm text-teal-950 ml-9">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-teal-300 text-teal-600 focus:ring-teal-500/30"
                checked={overseasThirdPartyPublishEnabled}
                onChange={(e) => {
                  const on = e.target.checked;
                  if (on) notifyOverseasNotOpen();
                  setOverseasThirdPartyPublishEnabled(on);
                }}
              />
              <span className="font-semibold text-teal-900">{t('taskForm.form.enableOverseasThirdParty')}</span>
            </label>
          </div>
        </div>
      </OptTaskSectionCard>
      </>
      ) : null}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3">
          {showCancel && (
            <button
              type="button"
              onClick={() => {
                if (editingTaskId) {
                  setEditingTaskId(null);
                  setMode('monitoring');
                  return;
                }
                onCancel?.();
              }}
              className="text-sm text-slate-600 hover:text-[#E8553F] inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              {editingTaskId ? t('taskForm.actions.cancelEdit') : t('taskForm.actions.back')}
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={submitting || (!editingTaskId && !anyWriterPath)}
          onClick={() => void handleSubmit()}
          className="btn-geo-primary"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('taskForm.actions.submitting')}
            </>
          ) : editingTaskId ? (
            <>{t('taskForm.actions.save')}</>
          ) : (
            <>{t('taskForm.actions.create')}</>
          )}
        </button>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
    <div className="text-[11px] text-gray-400">{label}</div>
    <div className="mt-0.5 text-sm font-semibold text-gray-900 truncate">{value}</div>
  </div>
);

export default OptimizationTaskFormBlock;
