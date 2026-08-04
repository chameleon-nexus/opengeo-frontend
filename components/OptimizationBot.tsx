import React, { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import {
  Loader2,
  Plus,
  ArrowLeft,
  RefreshCw,
  Pause,
  Play,
  StopCircle,
  Bot,
  Archive,
  Trash2,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Theme, Brand } from '../types';
import { getArticleTemplates } from '../api/contentGeneration';
import { getSocialAccounts, type SocialAccount } from '../api/publish';
import {
  optimizationTaskAPI,
  OPTIMIZATION_TASK_DEFAULT_COOLDOWN_HOURS,
  OPTIMIZATION_TASK_DEFAULT_MAX_ARTICLES_PER_CYCLE,
  type CreateOptimizationTaskPayload,
  type CycleStepResultDTO,
  type OptimizationCycleDTO,
  type OptimizationTaskDTO,
  type TargetAccount,
} from '../api/optimizationTask';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../api/geoWorkflow';
import WorkflowPipelineStrip from './WorkflowPipelineStrip';
import { geoWorkflowListPhaseLabel } from './geoWorkflowShared';
import GeoWorkflowArtifactModal from './GeoWorkflowArtifactModal';
import OpenClawCycleSteps from './StartOptimization/shared/OpenClawCycleSteps';
import { useModuleI18n } from '../i18n/hooks';

const GeoBrandReportMiniLayout = lazy(() => import('./GeoBrandReportMiniLayout'));

export type { OptimizationStartPayload } from '../api/optimizationTask';

interface OptimizationBotProps {
  theme: Theme;
  currentBrand: Brand | null;
  initialCreateDraft?: Partial<CreateOptimizationTaskPayload> | null;
  initialDetailTaskId?: string | null;
  /** 从「优化智能体」创建监控优化进入时打开新建表单 */
  initialOpenCreate?: boolean;
  onInitialRouteConsumed?: () => void;
  /** 新建主线：进入快速开始 */
  onOpenQuickStart?: () => void;
  /** 与 App 侧栏联动：分析明细 */
  onOpenDataScreenAll?: (brandId: string, options?: { geoWizardBack?: boolean }) => void;
  onOpenGenerateListForOptimizationTask?: (optimizationTaskId: string) => void;
  onOpenPublishRecordsForOptimizationTask?: (optimizationTaskId: string) => void;
}

type Phase = 'list' | 'create' | 'detail';

const STATUS_LABEL: Record<string, string> = {
  pending: '待启动',
  running: '运行中',
  paused: '已暂停',
  accepted: '已达标',
  failed: '已结束',
  stopped: '手动关闭',
  expired: '已到期',
};

function defaultExpiresDatetimeLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIsoUtc(localValue: string): string {
  const d = new Date(localValue);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return defaultExpiresDatetimeLocal();
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return defaultExpiresDatetimeLocal();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isOptimizationTerminal(status: string): boolean {
  return ['stopped', 'expired', 'failed', 'accepted'].includes(status);
}

const CYCLE_STATUS_LABEL: Record<string, string> = {
  running: '进行中',
  completed: '已完成',
  failed: '失败',
};

function formatDt(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('zh-CN');
  } catch {
    return String(iso);
  }
}

function stepStatusLabel(status?: string): string {
  if (status === 'success') return '成功';
  if (status === 'failed') return '失败';
  if (status === 'skipped') return '跳过';
  return '—';
}

function stepStatusClass(status: string | undefined, isDark: boolean): string {
  if (status === 'success') return isDark ? 'text-emerald-400' : 'text-emerald-700';
  if (status === 'failed') return 'text-red-500';
  if (status === 'skipped') return isDark ? 'text-zinc-500' : 'text-slate-500';
  return isDark ? 'text-zinc-500' : 'text-slate-500';
}

function CycleStepRow({
  title,
  step,
  isDark,
}: {
  title: string;
  step?: CycleStepResultDTO;
  isDark: boolean;
}) {
  const st = step?.status;
  const detail: string[] = [];
  if (step?.error) detail.push(step.error);
  if (step?.reportId != null) detail.push(`报告 ID ${step.reportId}`);
  if (step?.note) detail.push(step.note);
  if (step?.taskIds?.length) detail.push(`内容任务 ${step.taskIds.length} 个`);
  if (step?.published != null || step?.failed != null) {
    detail.push(`成功 ${step.published ?? 0} / 失败 ${step.failed ?? 0}`);
  }
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
      <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>{title}</span>
      <span className={`font-medium ${stepStatusClass(st, isDark)}`}>{stepStatusLabel(st)}</span>
      {detail.length > 0 ? (
        <div className={`w-full text-[11px] leading-snug ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
          {detail.join(' · ')}
        </div>
      ) : null}
    </div>
  );
}

const OptimizationBot: React.FC<OptimizationBotProps> = ({
  theme,
  currentBrand,
  initialCreateDraft,
  initialDetailTaskId,
  initialOpenCreate = false,
  onInitialRouteConsumed,
  onOpenQuickStart,
  onOpenDataScreenAll,
  onOpenGenerateListForOptimizationTask,
  onOpenPublishRecordsForOptimizationTask,
}) => {
  const { t } = useModuleI18n('agent');
  const isDark = theme === 'dark';
  const [phase, setPhase] = useState<Phase>('list');
  const [items, setItems] = useState<OptimizationTaskDTO[]>([]);
  const [listErr, setListErr] = useState<string | null>(null);

  const [geoWorkflowList, setGeoWorkflowList] = useState<GeoWorkflowDTO[]>([]);
  const [geoListLoading, setGeoListLoading] = useState(true);
  const [geoListErr, setGeoListErr] = useState<string | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [selectedWorkflowDetail, setSelectedWorkflowDetail] = useState<GeoWorkflowDTO | null>(null);
  const [artifactStep, setArtifactStep] = useState<number | null>(null);
  const [geoWorkflowIdForCreate, setGeoWorkflowIdForCreate] = useState<string | null>(null);
  const [diagnosisOverlayTaskId, setDiagnosisOverlayTaskId] = useState<string | null>(null);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<OptimizationTaskDTO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // 创建表单
  const [brandName, setBrandName] = useState('');
  const [productName, setProductName] = useState('');
  const [kwInput, setKwInput] = useState('');
  const [coreKeywords, setCoreKeywords] = useState<string[]>([]);
  const [scheduleCycle, setScheduleCycle] = useState('weekly');
  const [scheduleHour, setScheduleHour] = useState(9);
  const [scheduleDow, setScheduleDow] = useState(0);
  const [templateId, setTemplateId] = useState<number | ''>('');
  const [optPointsBudget, setOptPointsBudget] = useState('100');
  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<number>>(new Set());
  const [baselineVis, setBaselineVis] = useState<number | ''>('');
  const [sourceReportId, setSourceReportId] = useState('');
  const [extractionTaskId, setExtractionTaskId] = useState('');
  const [runImmediately, setRunImmediately] = useState(true);
  const [thirdPartyPublishEnabled, setThirdPartyPublishEnabled] = useState(false);
  const [expiresAtLocal, setExpiresAtLocal] = useState(defaultExpiresDatetimeLocal);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [archiveTaskBusy, setArchiveTaskBusy] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setListErr(null);
    try {
      const res = await optimizationTaskAPI.list();
      setItems(res.items ?? []);
    } catch (e: unknown) {
      setListErr(e instanceof Error ? e.message : '加载失败');
      setItems([]);
    }
  }, []);

  const loadGeoWorkflowList = useCallback(async () => {
    setGeoListLoading(true);
    setGeoListErr(null);
    try {
      const res = await geoWorkflowAPI.list();
      setGeoWorkflowList(res.items ?? []);
    } catch (e: unknown) {
      setGeoListErr(e instanceof Error ? e.message : '加载失败');
      setGeoWorkflowList([]);
    } finally {
      setGeoListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
    loadGeoWorkflowList();
  }, [loadList, loadGeoWorkflowList]);

  useEffect(() => {
    setArtifactStep(null);
  }, [selectedWorkflowId]);

  useEffect(() => {
    if (!selectedWorkflowId) {
      setSelectedWorkflowDetail(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const d = await geoWorkflowAPI.get(selectedWorkflowId);
        if (!cancelled) setSelectedWorkflowDetail(d);
      } catch {
        if (!cancelled) setSelectedWorkflowDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedWorkflowId]);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const [tplRes, accRes] = await Promise.all([
          getArticleTemplates({ is_active: true, limit: 100 }),
          getSocialAccounts(),
        ]);
        if (c) return;
        setTemplates((tplRes.templates || []).map(t => ({ id: t.id, name: t.name || `模板 #${t.id}` })));
        setAccounts(accRes || []);
      } catch {
        if (!c) {
          setTemplates([]);
          setAccounts([]);
        }
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  useEffect(() => {
    if (currentBrand?.name && !brandName) {
      setBrandName(currentBrand.name);
    }
  }, [currentBrand, brandName]);

  /** 外部路由：打开详情 */
  useEffect(() => {
    if (!initialDetailTaskId) return;
    setDetailId(initialDetailTaskId);
    setPhase('detail');
    onInitialRouteConsumed?.();
  }, [initialDetailTaskId, onInitialRouteConsumed]);

  /** 外部路由：预填创建 */
  useEffect(() => {
    if (!initialCreateDraft || Object.keys(initialCreateDraft).length === 0) return;
    const d = initialCreateDraft;
    if (d.brand_name) setBrandName(d.brand_name);
    if (typeof d.product_name === 'string' && d.product_name.trim()) setProductName(d.product_name.trim());
    if (d.core_keywords?.length) setCoreKeywords(d.core_keywords);
    if (d.schedule_cycle) setScheduleCycle(d.schedule_cycle);
    if (d.schedule_hour != null) setScheduleHour(d.schedule_hour);
    if (d.schedule_day_of_week != null) setScheduleDow(d.schedule_day_of_week);
    if (d.template_id != null) setTemplateId(d.template_id);
    if (d.baseline_visibility != null && d.baseline_visibility !== undefined) {
      setBaselineVis(d.baseline_visibility);
    }
    if (d.source_diagnosis_report_id != null) setSourceReportId(String(d.source_diagnosis_report_id));
    if (d.extraction_task_id) setExtractionTaskId(d.extraction_task_id);
    if (d.expires_at) setExpiresAtLocal(isoToDatetimeLocal(d.expires_at));
    setPhase('create');
    onInitialRouteConsumed?.();
  }, [initialCreateDraft, onInitialRouteConsumed]);

  /** 仅打开新建表单（无预填草稿） */
  useEffect(() => {
    if (!initialOpenCreate) return;
    if (initialDetailTaskId) return;
    if (initialCreateDraft && Object.keys(initialCreateDraft).length > 0) return;
    setPhase('create');
    setBrandName(prev => prev || currentBrand?.name || '');
    onInitialRouteConsumed?.();
  }, [initialOpenCreate, initialDetailTaskId, initialCreateDraft, currentBrand?.name, onInitialRouteConsumed]);

  const loadDetail = useCallback(async (taskId: string) => {
    setDetailLoading(true);
    setDetailErr(null);
    try {
      const t = await optimizationTaskAPI.get(taskId);
      setDetailTask(t);
    } catch (e: unknown) {
      setDetailErr(e instanceof Error ? e.message : '加载失败');
      setDetailTask(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (phase === 'detail' && detailId) {
      loadDetail(detailId);
    }
  }, [phase, detailId, loadDetail]);

  const goCreate = () => {
    setPhase('create');
    setKwInput('');
    setProductName('');
    setGeoWorkflowIdForCreate(null);
    if (!brandName && currentBrand?.name) setBrandName(currentBrand.name);
  };

  const handleArchiveTask = async (taskId: string) => {
    setArchiveTaskBusy(taskId);
    try {
      await optimizationTaskAPI.archive(taskId);
      await loadList();
      await loadGeoWorkflowList();
      if (detailId === taskId) {
        setDetailId(null);
        setDetailTask(null);
        setPhase('list');
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '移除失败');
    } finally {
      setArchiveTaskBusy(null);
    }
  };

  const addKeyword = () => {
    const s = kwInput.trim();
    if (!s || coreKeywords.includes(s)) return;
    setCoreKeywords([...coreKeywords, s]);
    setKwInput('');
  };

  const removeKeyword = (k: string) => {
    setCoreKeywords(coreKeywords.filter(x => x !== k));
  };

  const toggleAccount = (id: number) => {
    const n = new Set(selectedAccountIds);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelectedAccountIds(n);
  };

  const handleCreate = async () => {
    if (!brandName.trim()) {
      alert('请填写品牌名');
      return;
    }
    if (!productName.trim()) {
      alert('请填写产品线/产品型号');
      return;
    }
    if (coreKeywords.length < 1) {
      alert('请至少添加一个核心词');
      return;
    }
    const expIso = datetimeLocalToIsoUtc(expiresAtLocal.trim());
    if (!expIso || new Date(expIso).getTime() <= Date.now()) {
      alert('请填写任务有效期，且须晚于当前时间');
      return;
    }
    if (templateId === '') {
      alert('请选择范文模板；多范文/仿写/手工请在工作台 GEO 主线使用完整表单。');
      return;
    }
    const pb = parseInt(optPointsBudget.trim(), 10);
    if (Number.isNaN(pb) || pb < 10 || pb % 10 !== 0) {
      alert('每周期积分预算须为 ≥10 且为 10 的整数倍');
      return;
    }
    const authAccounts = accounts.filter(a => a.id != null && a.authorized);
    const picked = authAccounts.filter(a => selectedAccountIds.has(a.id!));
    const target_accounts: TargetAccount[] = picked.map(a => ({
      account_id: a.id!,
      platform: a.platform || undefined,
    }));
    const payload: CreateOptimizationTaskPayload = {
      brand_name: brandName.trim(),
      product_name: productName.trim(),
      core_keywords: coreKeywords,
      target_accounts,
      schedule_cycle: scheduleCycle,
      schedule_hour: scheduleCycle === 'hourly_6' ? null : scheduleHour,
      schedule_day_of_week: scheduleCycle === 'weekly' ? scheduleDow : null,
      max_articles_per_cycle: OPTIMIZATION_TASK_DEFAULT_MAX_ARTICLES_PER_CYCLE,
      cooldown_hours: OPTIMIZATION_TASK_DEFAULT_COOLDOWN_HOURS,
      template_id: Number(templateId),
      template_ids: [Number(templateId)],
      points_budget_per_cycle: pb,
      points_budget_strategy: {
        mode: 'quota',
        template_articles: 0,
        imitate_articles: 0,
        custom_articles: 0,
      },
      baseline_visibility: baselineVis === '' ? null : Number(baselineVis),
      source_diagnosis_report_id:
        sourceReportId.trim() === '' ? null : Number.parseInt(sourceReportId, 10) || null,
      extraction_task_id: extractionTaskId.trim() || null,
      geo_workflow_id: geoWorkflowIdForCreate,
      run_immediately: runImmediately,
      expires_at: expIso,
      third_party_publish_enabled: thirdPartyPublishEnabled,
    };
    setCreateSubmitting(true);
    try {
      await optimizationTaskAPI.create(payload);
      await loadList();
      await loadGeoWorkflowList();
      setPhase('list');
      setSelectedAccountIds(new Set());
      setBaselineVis('');
      setSourceReportId('');
      setGeoWorkflowIdForCreate(null);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '创建失败');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const chartData = useMemo(() => {
    const cycles = (detailTask?.cycles || []) as OptimizationCycleDTO[];
    if (!cycles.length) return [];
    return cycles.map(c => ({
      name: String(c.cycleNumber),
      metric: c.metricValue != null ? Number(c.metricValue) : null,
    }));
  }, [detailTask]);

  const cardCls = `rounded-2xl border p-6 ${
    isDark ? 'bg-zinc-900/80 border-white/10' : 'bg-white border-slate-200 shadow-sm'
  }`;
  const labelCls = isDark ? 'text-zinc-400' : 'text-slate-500';
  const inputCls = `w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
    isDark
      ? 'border-zinc-600 bg-zinc-800 text-white focus:border-[#E8553F] focus:ring-2 focus:ring-[#E8553F]/20'
      : 'border-slate-200 bg-white focus:border-[#E8553F] focus:ring-2 focus:ring-[#E8553F]/20'
  }`;

  const pageBg = isDark
    ? 'bg-[linear-gradient(180deg,#111827_0%,#0f172a_40%,#0f172a_100%)]'
    : 'bg-[linear-gradient(180deg,#fff5f2_0%,#f8f9fb_38%,#f8f9fb_100%)]';

  const recordCard = isDark
    ? 'overflow-hidden rounded-2xl border border-slate-600/80 bg-slate-900/90 shadow-md shadow-black/25'
    : 'overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-200/40';

  const emptyBox = isDark
    ? 'mb-6 flex h-28 w-40 items-center justify-center rounded-lg border-2 border-dashed border-sky-800/80 bg-sky-950/30 text-sky-500'
    : 'mb-6 flex h-28 w-40 items-center justify-center rounded-lg border-2 border-dashed border-sky-200/80 bg-sky-50/50 text-sky-400';

  const renderList = () => (
    <>
    <div className={`relative flex min-h-0 flex-1 flex-col overflow-y-auto font-sans ${pageBg} pb-16 pt-4`}>
      <div className="mx-auto w-full max-w-[1300px] space-y-6 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1
              className={`flex items-center gap-2 text-xl font-bold sm:text-2xl ${isDark ? 'text-white' : 'text-[#111827]'}`}
            >
              <Bot className="h-7 w-7 shrink-0 text-[#E8553F]" aria-hidden />
              {t('optimizationBot.pageTitle')}
            </h1>
            <p className={`mt-1 text-sm ${labelCls}`}>{t('optimizationBot.subtitleDetail')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadGeoWorkflowList()}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" /> 刷新
            </button>
            <button
              type="button"
              onClick={() => (onOpenQuickStart ? onOpenQuickStart() : goCreate())}
              className="btn-geo-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" /> 新建主线
            </button>
            <button
              type="button"
              onClick={goCreate}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              独立创建周期任务
            </button>
          </div>
        </div>

        {listErr ? <p className="text-sm text-red-500">{listErr}</p> : null}

        <section className={recordCard}>
          <div
            className={
              isDark
                ? 'flex flex-col gap-4 border-b border-slate-700 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8'
                : 'flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8'
            }
          >
            <h2
              className={
                isDark ? 'text-base font-semibold text-white sm:text-lg' : 'text-base font-semibold text-[#111827] sm:text-lg'
              }
            >
              {t('optimizationBot.cycleTasksTitle')}
            </h2>
          </div>
          <div className="min-h-[120px] px-4 py-5 sm:px-6">
            {items.length === 0 ? (
              <p className={isDark ? 'text-sm text-zinc-500' : 'text-sm text-slate-500'}>
                暂无周期任务。可通过「独立创建周期任务」新建，或在下方 GEO 主线中关联。
              </p>
            ) : (
              <ul className="space-y-2">
                {items.map((it: OptimizationTaskDTO) => (
                  <li
                    key={it.taskId}
                    className={
                      'flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-3 sm:px-4 ' +
                      (isDark ? 'border-slate-600 bg-slate-800/40' : 'border-slate-200 bg-slate-50/80')
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDetailId(it.taskId);
                          setPhase('detail');
                        }}
                        className="text-left font-semibold text-[#111827] hover:text-[#E8553F] dark:text-white dark:hover:text-[#E97B55]"
                      >
                        {it.brandName}
                        {it.productName ? (
                          <span className="block text-xs font-normal text-slate-600 dark:text-zinc-400">
                            产品：{it.productName}
                          </span>
                        ) : null}
                      </button>
                      <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-zinc-500">{it.taskId}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                        状态 {STATUS_LABEL[it.status] ?? it.status} · 已执行 {it.totalCyclesRun} 轮周期
                        {it.expiresAt ? ` · 有效期至 ${formatDt(it.expiresAt)}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={archiveTaskBusy === it.taskId}
                      onClick={() => {
                        if (
                          !confirm(
                            '确定从列表中移除该周期任务？将停止定时执行（数据仍保留在库中，列表不再显示）。',
                          )
                        )
                          return;
                        void handleArchiveTask(it.taskId);
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                    >
                      {archiveTaskBusy === it.taskId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      删除
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {geoListErr ? <p className="text-sm text-red-500">{geoListErr}</p> : null}

        <section className={recordCard}>
          <div
            className={
              isDark
                ? 'flex flex-col gap-4 border-b border-slate-700 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8'
                : 'flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8'
            }
          >
            <h2
              className={
                isDark ? 'text-base font-semibold text-white sm:text-lg' : 'text-base font-semibold text-[#111827] sm:text-lg'
              }
            >
              优化记录（GEO 主线）
            </h2>
          </div>

          <div className="min-h-[200px] px-4 py-6 sm:px-6">
            {geoListLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#E8553F]" />
              </div>
            ) : geoWorkflowList.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                <div className={emptyBox} aria-hidden>
                  <Archive className="h-14 w-14 opacity-60" strokeWidth={1.25} />
                </div>
                <p className={isDark ? 'max-w-md text-sm text-zinc-400' : 'max-w-md text-sm text-[#64748b]'}>
                  暂无 Workflow，请在「快速开始」完成引导后将在此展示。
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {geoWorkflowList.map((w) => (
                  <div
                    key={w.workflowId}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedWorkflowId(w.workflowId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedWorkflowId(w.workflowId);
                      }
                    }}
                    className={
                      'cursor-pointer rounded-xl border p-4 text-left transition hover:ring-2 hover:ring-[#E8553F]/25 ' +
                      (selectedWorkflowId === w.workflowId
                        ? 'border-[#E8553F] bg-[#E8553F]/10 dark:border-[#E97B55] dark:bg-[#E8553F]/15'
                        : isDark
                          ? 'border-slate-600 bg-slate-800/50'
                          : 'border-slate-200 bg-white')
                    }
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-[#111827] dark:text-white">{w.brandName}</span>
                        {w.productName ? (
                          <p className="mt-0.5 text-xs text-slate-600 dark:text-zinc-400">产品：{w.productName}</p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                        {geoWorkflowListPhaseLabel(w)} · {w.phaseStatus}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-slate-500">{w.workflowId}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                      {w.baselineVisibility != null ? <span>基线 {w.baselineVisibility}%</span> : null}
                      {w.latestVisibility != null ? <span>最新 {w.latestVisibility}%</span> : null}
                      {w.totalCycles != null ? <span>周期 {w.totalCycles}</span> : null}
                      {w.optimizationTaskId ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[#E8553F] underline-offset-2 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailId(w.optimizationTaskId!);
                            setPhase('detail');
                          }}
                        >
                          <Bot className="h-3 w-3" />
                          {w.optimizationTaskId}
                        </button>
                      ) : null}
                    </div>
                    {selectedWorkflowId === w.workflowId ? (
                      <WorkflowPipelineStrip
                        isDark={isDark}
                        wf={selectedWorkflowDetail ?? w}
                        onNodeClick={(idx) => setArtifactStep(idx)}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
    {artifactStep !== null && selectedWorkflowDetail && selectedWorkflowId ? (
      <GeoWorkflowArtifactModal
        isDark={isDark}
        workflowId={selectedWorkflowId}
        workflowDetail={selectedWorkflowDetail}
        artifactStep={artifactStep}
        brandNameHint={currentBrand?.name}
        onClose={() => setArtifactStep(null)}
        onWorkflowUpdated={(wf) => setSelectedWorkflowDetail(wf)}
        onListRefresh={loadGeoWorkflowList}
        onOpenDiagnosisReport={(tid) => {
          setArtifactStep(null);
          setDiagnosisOverlayTaskId(tid);
        }}
        onOpenDataScreenAll={(bid, opts) => {
          setArtifactStep(null);
          onOpenDataScreenAll?.(bid, opts);
        }}
        onOpenGenerateListForOptimizationTask={onOpenGenerateListForOptimizationTask}
        onOpenPublishRecordsForOptimizationTask={onOpenPublishRecordsForOptimizationTask}
        onOptimizationEdit={(taskId) => {
          setArtifactStep(null);
          setDetailId(taskId);
          setPhase('detail');
        }}
        onOptimizationCreate={(payload) => {
          setArtifactStep(null);
          setBrandName(payload.brandName);
          setProductName((payload.productName ?? '').trim());
          setCoreKeywords(payload.keywords);
          setSourceReportId(payload.sourceDiagnosisReportId != null ? String(payload.sourceDiagnosisReportId) : '');
          setBaselineVis(payload.baselineVisibility ?? '');
          setGeoWorkflowIdForCreate(selectedWorkflowId);
          setPhase('create');
        }}
      />
    ) : null}
    {diagnosisOverlayTaskId ? (
      <Suspense fallback={<div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/80 text-slate-500">加载中…</div>}>
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-[#f8f9fb]">
          <GeoBrandReportMiniLayout
            theme={theme}
            taskId={diagnosisOverlayTaskId}
            onBack={() => setDiagnosisOverlayTaskId(null)}
            backButtonLabel="返回"
          />
        </div>
      </Suspense>
    ) : null}
    </>
  );

  const renderCreate = () => (
    <div className="max-w-3xl mx-auto space-y-6 p-4 md:p-8 pb-20">
      <button
        type="button"
        onClick={() => setPhase('list')}
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-[#E8553F]"
      >
        <ArrowLeft className="w-4 h-4" /> 返回列表
      </button>
      <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('optimizationBot.createTitle')}</h1>

      <div className={cardCls}>
        <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>品牌与词包</h2>
        <label className={`block text-sm mb-1 ${labelCls}`}>品牌名</label>
        <input className={inputCls} value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="品牌名称" />

        <label className={`block text-sm mt-4 mb-1 ${labelCls}`}>
          产品线 / 产品型号<span className="text-red-500">*</span>
        </label>
        <input
          className={inputCls}
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="例如：MacBook Air M4"
        />

        <label className={`block text-sm mt-4 mb-1 ${labelCls}`}>核心词（可多个）</label>
        <div className="flex gap-2">
          <input
            className={inputCls}
            value={kwInput}
            onChange={e => setKwInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            placeholder="输入后回车或点添加"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            添加
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {coreKeywords.map(k => (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 text-sm text-[#b45309]"
            >
              {k}
              <button type="button" className="text-[#E8553F] hover:text-[#c2410c]" onClick={() => removeKeyword(k)}>
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className={`block text-sm mb-1 ${labelCls}`}>来源诊断报告 ID（可选）</label>
            <input
              className={inputCls}
              value={sourceReportId}
              onChange={e => setSourceReportId(e.target.value)}
              placeholder="数字"
              type="number"
            />
          </div>
          <div>
            <label className={`block text-sm mb-1 ${labelCls}`}>词包任务 ID（可选）</label>
            <input className={inputCls} value={extractionTaskId} onChange={e => setExtractionTaskId(e.target.value)} />
          </div>
          <div>
            <label className={`block text-sm mb-1 ${labelCls}`}>基线可见度 %（可选，留空则由后端取最新）</label>
            <input
              className={inputCls}
              value={baselineVis}
              onChange={e => {
                const v = e.target.value;
                setBaselineVis(v === '' ? '' : Number(v));
              }}
              type="number"
              step="0.1"
            />
          </div>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>调度与生成</h2>
        <label className={`block text-sm mb-1 ${labelCls}`}>
          任务有效期（必填）<span className="text-red-500">*</span>
        </label>
        <input
          type="datetime-local"
          className={inputCls}
          value={expiresAtLocal}
          onChange={(e) => setExpiresAtLocal(e.target.value)}
        />
        <p className={`mt-1 text-xs ${labelCls}`}>到期后任务自动结束；仅「手动关闭」与「到期」可结束任务。</p>
        <label className={`block text-sm mt-4 mb-1 ${labelCls}`}>周期</label>
        <select className={inputCls} value={scheduleCycle} onChange={e => setScheduleCycle(e.target.value)}>
          <option value="hourly_6">每 6 小时</option>
          <option value="daily">每天</option>
          <option value="weekly">每周</option>
        </select>
        {scheduleCycle !== 'hourly_6' ? (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className={`block text-sm mb-1 ${labelCls}`}>执行时刻（0–23 点）</label>
              <input
                type="number"
                min={0}
                max={23}
                className={inputCls}
                value={scheduleHour}
                onChange={e => setScheduleHour(Number(e.target.value))}
              />
            </div>
            {scheduleCycle === 'weekly' ? (
              <div>
                <label className={`block text-sm mb-1 ${labelCls}`}>周几（0=周一 … 6=周日）</label>
                <input
                  type="number"
                  min={0}
                  max={6}
                  className={inputCls}
                  value={scheduleDow}
                  onChange={e => setScheduleDow(Number(e.target.value))}
                />
              </div>
            ) : null}
          </div>
        ) : null}
        <label className={`mt-4 flex cursor-pointer items-start gap-3 ${labelCls}`}>
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
            checked={runImmediately}
            onChange={(e) => setRunImmediately(e.target.checked)}
          />
          <span>
            <span className="font-medium text-slate-800 dark:text-zinc-100">创建后立即执行第一轮周期</span>
            <span className={`mt-0.5 block text-xs font-normal text-slate-500 dark:text-zinc-500`}>
              关闭后首轮仅在下次周期时间点执行（按上方周期/时刻排队），任务仍会创建并处于待调度状态。
            </span>
          </span>
        </label>
        <label className={`block text-sm mt-4 mb-1 ${labelCls}`}>范文模板（必选）</label>
        <select
          className={inputCls}
          value={templateId}
          onChange={e => setTemplateId(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">请选择</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <label className={`block text-sm mt-4 mb-1 ${labelCls}`}>每周期积分上限（10 分/篇）</label>
        <input
          type="number"
          min={10}
          step={10}
          className={inputCls}
          value={optPointsBudget}
          onChange={(e) => setOptPointsBudget(e.target.value)}
        />
      </div>

      <div className={cardCls}>
        <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>发布账号（可选，多选）</h2>
        <p className={`text-sm mb-3 ${labelCls}`}>
          可选用自媒体 OAuth 帐号自动发稿，并可勾选三方媒体待发；不配自媒体且未勾三方：周期内报告、明细、内容生成仍会执行，仅发布步骤跳过。
        </p>
        <label
          className={`mb-3 flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2 text-sm ${
            isDark ? 'border-white/10 bg-zinc-800/90 text-zinc-200' : 'border-slate-100 bg-slate-50 text-slate-700'
          }`}
        >
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
            checked={thirdPartyPublishEnabled}
            onChange={(e) => setThirdPartyPublishEnabled(e.target.checked)}
          />
          <span>
            <span className="font-semibold text-inherit">三方媒体发布</span>
            <span className={`mt-0.5 block text-xs font-normal ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
              本周期文章生成成功后自动出现在「信源库 → 三方媒体发布」待发列表（篇数为该周期成功篇数）。
            </span>
          </span>
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {accounts.filter(a => a.authorized && a.id != null).length === 0 ? (
            <p className="text-amber-600 text-sm">
              当前无已授权自媒体账号时可改用上方「三方媒体发布」，或到「自媒体账号」 OAuth 后再来补充。
            </p>
          ) : (
            accounts
              .filter(a => a.authorized && a.id != null)
              .map(a => (
                <label key={a.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAccountIds.has(a.id!)}
                    onChange={() => toggleAccount(a.id!)}
                  />
                  <span className="text-sm">
                    <span className="font-medium">{a.platform}</span>
                    {a.nickname ? ` · ${a.nickname}` : ''}
                  </span>
                </label>
              ))
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={createSubmitting}
        onClick={handleCreate}
        className="btn-geo-primary w-full py-3 font-semibold disabled:opacity-60"
      >
        {createSubmitting ? '提交中…' : '创建并启动'}
      </button>
    </div>
  );

  const runDetailAction = async (fn: () => Promise<unknown>) => {
    if (!detailId) return;
    setActionBusy(true);
    try {
      await fn();
      await loadDetail(detailId);
      await loadList();
      await loadGeoWorkflowList();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '操作失败');
    } finally {
      setActionBusy(false);
    }
  };

  const renderDetail = () => {
    const t = detailTask;
    return (
      <div className="max-w-5xl mx-auto space-y-6 p-4 md:p-8 pb-24">
        <button
          type="button"
          onClick={() => {
            setDetailId(null);
            setDetailTask(null);
            setPhase('list');
          }}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-[#E8553F]"
        >
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </button>

        {detailLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#E8553F]" />
          </div>
        ) : detailErr || !t ? (
          <p className="text-red-500">{detailErr || '无数据'}</p>
        ) : (
          <>
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.brandName}</h1>
                {t.productName ? (
                  <p className={`text-sm font-medium mt-1 ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                    产品：{t.productName}
                  </p>
                ) : null}
                <p className={`text-sm ${labelCls} mt-1`}>{t.taskId}</p>
                <span
                  className={`inline-block mt-3 text-xs px-2 py-0.5 rounded-full ${
                    t.status === 'running'
                      ? 'bg-emerald-100 text-emerald-800'
                      : t.status === 'paused'
                        ? 'bg-amber-100 text-amber-800'
                        : t.status === 'accepted'
                          ? 'bg-violet-100 text-violet-800'
                          : t.status === 'expired'
                            ? 'bg-orange-100 text-orange-800'
                            : t.status === 'stopped' || t.status === 'failed'
                              ? 'bg-slate-200 text-slate-800'
                              : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
                {t.expiresAt ? (
                  <p className={`text-sm mt-2 ${labelCls}`}>有效期至：{formatDt(t.expiresAt)}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {t.status === 'running' ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => runDetailAction(() => optimizationTaskAPI.pause(t.taskId))}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm"
                  >
                    <Pause className="w-4 h-4" /> 暂停
                  </button>
                ) : null}
                {t.status === 'paused' ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => runDetailAction(() => optimizationTaskAPI.resume(t.taskId))}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm"
                  >
                    <Play className="w-4 h-4" /> 恢复
                  </button>
                ) : null}
                {t.status === 'running' || t.status === 'paused' ? (
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => {
                      if (!confirm('确定停止该任务？')) return;
                      runDetailAction(() => optimizationTaskAPI.stop(t.taskId));
                    }}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm"
                  >
                    <StopCircle className="w-4 h-4" /> 停止
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={() => {
                    if (
                      !confirm(
                        '确定从列表中移除该任务？将停止定时执行，关联主线会解除绑定（数据仍保留在库中）。',
                      )
                    )
                      return;
                    const tid = t.taskId;
                    setActionBusy(true);
                    optimizationTaskAPI
                      .archive(tid)
                      .then(async () => {
                        setDetailId(null);
                        setDetailTask(null);
                        setPhase('list');
                        await loadList();
                        await loadGeoWorkflowList();
                      })
                      .catch((e: unknown) => {
                        alert(e instanceof Error ? e.message : '移除失败');
                      })
                      .finally(() => setActionBusy(false));
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm hover:bg-slate-50"
                >
                  <Trash2 className="w-4 h-4" /> 从列表移除
                </button>
              </div>
            </div>

            <div className={`grid md:grid-cols-2 gap-4 ${cardCls}`}>
              <div>
                <div className={`text-xs ${labelCls}`}>已执行周期数</div>
                <div className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t.totalCyclesRun}
                </div>
              </div>
              <div>
                <div className={`text-xs ${labelCls}`}>下次执行</div>
                <div className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                  {formatDt(t.nextCycleAt)}
                </div>
              </div>
            </div>

            <div className={cardCls}>
              <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>指标趋势</h2>
              {chartData.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#e2e8f0'} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} label={{ value: '轮次', position: 'insideBottom', offset: -4 }} />
                      <YAxis tick={{ fontSize: 12 }} domain={['auto', 'auto']} label={{ value: '可见度', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line name="可见度" type="monotone" dataKey="metric" stroke="#7c3aed" dot connectNulls strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className={labelCls}>暂无周期指标数据（任务运行后会显示）。</p>
              )}
            </div>

            <div className={cardCls}>
              <h2 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>周期日志</h2>
              {(t.cycles || []).length === 0 ? (
                <p className={labelCls}>暂无记录</p>
              ) : (
                <div className="space-y-4">
                  {[...(t.cycles || [])]
                    .sort((a, b) => b.cycleNumber - a.cycleNumber)
                    .map(c => (
                      <div
                        key={c.id}
                        className={`rounded-xl border p-4 ${
                          isDark ? 'border-white/10 bg-zinc-800/50' : 'border-slate-100 bg-slate-50'
                        }`}
                      >
                        <div className="flex flex-wrap justify-between gap-2">
                          <span className="font-semibold">第 {c.cycleNumber} 轮</span>
                          <span className={`text-xs ${labelCls}`}>{CYCLE_STATUS_LABEL[c.status] ?? c.status}</span>
                        </div>
                        <div className={`text-sm mt-2 space-y-1 ${labelCls}`}>
                          {c.cycleStepResults ? (
                            <div
                              className={`mb-3 rounded-lg border p-3 space-y-2 ${
                                isDark ? 'border-slate-600 bg-zinc-900/50' : 'border-slate-200 bg-white'
                              }`}
                            >
                              <div className={`text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
                                本轮三步（独立结果）
                              </div>
                              <CycleStepRow
                                title="① 最新诊断报告"
                                step={c.cycleStepResults.report}
                                isDark={isDark}
                              />
                              <CycleStepRow
                                title="② 优化文章生成"
                                step={c.cycleStepResults.articles}
                                isDark={isDark}
                              />
                              <CycleStepRow
                                title="③ 发送文章"
                                step={c.cycleStepResults.publish}
                                isDark={isDark}
                              />
                              <OpenClawCycleSteps
                                taskId={t.taskId}
                                cycleNumber={c.cycleNumber}
                                cycleStepResults={c.cycleStepResults}
                                isDark={isDark}
                                onDownloadError={(msg) => alert(msg)}
                              />
                            </div>
                          ) : null}
                          <div>指标值：{c.metricValue != null ? `${c.metricValue}` : '—'}</div>
                          <div>是否达标：{c.passed === true ? '是' : c.passed === false ? '否' : '—'}</div>
                          <div>内容任务：{(c.contentTaskIds || []).join(', ') || '—'}</div>
                          <div>发布记录 ID：{(c.publishRecordIds || []).join(', ') || '—'}</div>
                          <div>诊断报告 ID：{c.diagnosisReportId ?? '—'}</div>
                          <div>开始：{formatDt(c.startedAt)} → 结束：{formatDt(c.completedAt)}</div>
                          {c.errorMessage ? <div className="text-red-500">错误：{c.errorMessage}</div> : null}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {t.errorMessage ? (
              <div className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-4 text-sm">{t.errorMessage}</div>
            ) : null}
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className={
        phase === 'list'
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
          : `flex-1 min-h-0 overflow-y-auto ${isDark ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-slate-900'}`
      }
    >
      {phase === 'list' && renderList()}
      {phase === 'create' && renderCreate()}
      {phase === 'detail' && renderDetail()}
    </div>
  );
};

export default OptimizationBot;
