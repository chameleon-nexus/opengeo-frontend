/**
 * LLM_INSTRUCTION: 本文件为遗留页「快速开始」（侧栏已无入口，仍可能被 App 内链接打开）。
 * 不要将本页作为 GEO 优化主流程的参考实现；请优先阅读/修改 StartOptimization、OptimizationWorkbench
 * 及 saas/components/StartOptimization/**。分析或补功能时可整体忽略本文件，除非明确要修此遗留路径。
 */
import React, { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { Loader2, FileUp, Archive, Search, FileText, X, Plus, RefreshCw, Bot } from 'lucide-react';
import { Theme, Brand } from '../types';
import { brandParseAPI, isBrandParseFinalizeAsync } from '../api/brandParse';
import { semanticSEOAPI } from '../api/semanticSeo';
import { analyzeBrandDiagnosisSession } from '../api/brandDiagnosisSession';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../api/geoWorkflow';
import { getArticleTemplates } from '../api/contentGeneration';
import { getSocialAccounts, type SocialAccount } from '../api/publish';
import {
  optimizationTaskAPI,
  OPTIMIZATION_TASK_DEFAULT_COOLDOWN_HOURS,
  OPTIMIZATION_TASK_DEFAULT_MAX_ARTICLES_PER_CYCLE,
  type CreateOptimizationTaskPayload,
  type OptimizationTaskDTO,
  type TargetAccount,
} from '../api/optimizationTask';
import type { OptimizationStartPayload } from '../api/optimizationTask';
import WorkflowPipelineStrip from './WorkflowPipelineStrip';
import { geoWorkflowListPhaseLabel } from './geoWorkflowShared';
import GeoWorkflowArtifactModal from './GeoWorkflowArtifactModal';
import { DEFAULT_WORKBENCH_OPEN, GEO_QUESTION_INTENT, type WorkbenchOpenParams } from './StartOptimization/types';
import {
  BRAND_PARSE_ACCEPT_ATTR,
  brandParseAllowedFormatsLabel,
  filterBrandParseUploadFiles,
} from '../utils/brandParseUpload';
import { BRAND_PARSE_MAX_POLLS, BRAND_PARSE_POLL_MS, GEO_WORKFLOW_POLL_MS } from '../constants/brandParsePolling';

const GeoBrandReportMiniLayout = lazy(() => import('./GeoBrandReportMiniLayout'));

interface BrandParseWizardProps {
  theme: Theme;
  currentBrand: Brand | null;
  /** 自侧栏「优化任务」等入口跳转时预选中主线并可打开指定节点产出 */
  initialWorkflowId?: string | null;
  initialArtifactStep?: number | null;
  onInitialFocusConsumed?: () => void;
  onOpenDataScreenAll?: (brandId: string, options?: { geoWizardBack?: boolean }) => void;
  onOpenGenerateListForOptimizationTask?: (optimizationTaskId: string) => void;
  onOpenPublishRecordsForOptimizationTask?: (optimizationTaskId: string) => void;
  /** 打开二级「优化工作台」，与「最新优化」列表进入同一页面 */
  onOpenOptimizationWorkbench?: (params: WorkbenchOpenParams) => void;
}

/** 词包核心词：系统生成可叉除；用户可追加自定义 */
interface CoreKeywordItem {
  id: string;
  text: string;
  fromSystem: boolean;
}

const POLL_MS = BRAND_PARSE_POLL_MS;
const MAX_POLLS = BRAND_PARSE_MAX_POLLS;
const ABORT_POLL_MSG = '__BRAND_PARSE_POLL_ABORT__';

function normalizeSeoTaskStatus(raw: string | undefined): string {
  return (raw ?? '').trim().toLowerCase();
}

function isSeoTaskSuccess(st: string): boolean {
  return ['completed', 'complete', 'done', 'success'].includes(st);
}

function isSeoTaskFailed(st: string): boolean {
  return ['failed', 'fail', 'error', 'cancelled', 'canceled'].includes(st);
}

function getKnowledgeGraphStatusLabel(raw: string | undefined): string {
  const s = normalizeSeoTaskStatus(raw);
  switch (s) {
    case 'pending':
      return '知识图谱任务排队中，即将开始生成';
    case 'processing':
    case 'running':
      return '正在生成知识图谱（联网检索、实体关系与共现词）';
    case 'completed':
    case 'complete':
    case 'done':
    case 'success':
      return '知识图谱已生成完成';
    case 'failed':
    case 'fail':
    case 'error':
      return '知识图谱生成失败';
    default:
      if (!s) return '知识图谱生成中';
      return `知识图谱处理中（状态：${(raw ?? '').trim() || s}）`;
  }
}

function parseVisibilityNum(v: unknown): number {
  if (v == null) return 0;
  const n = parseFloat(String(v).replace(/%/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function coreKeywordsToItems(kws: string[] | null | undefined): CoreKeywordItem[] {
  const list = (kws ?? []).map((t) => String(t).trim()).filter(Boolean);
  return list.map((text, i) => ({
    id: `wf-${i}-${text.slice(0, 24)}`,
    text,
    fromSystem: true,
  }));
}

/** 与知识图谱「新建知识图谱」一致（index.css `.btn-geo-primary`） */
const CORAL_BTN =
  'btn-geo-primary min-w-[120px] disabled:opacity-50 disabled:pointer-events-none';

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

const AI_PLATFORM_OPTIONS = [
  { id: 'doubao', label: '豆包', icon: '/imgs/ai-icons/doubao.png' },
  { id: 'deepseek', label: 'DeepSeek', icon: '/imgs/ai-icons/deepseek.png' },
  { id: 'wenxin', label: '文心一言', icon: '/imgs/ai-icons/wenxin.png' },
  { id: 'qianwen', label: '通义千问', icon: '/imgs/ai-icons/tongyi.png' },
  { id: 'yuanbao', label: '腾讯元宝', icon: '/imgs/ai-icons/yuanbao.png' },
  { id: 'kimi', label: 'Kimi', icon: '/imgs/ai-icons/kimi.png' },
  { id: 'quark', label: '夸克', icon: '/imgs/ai-icons/quark.png' },
  { id: 'nami', label: '纳米', icon: '/imgs/ai-icons/nami.png' },
  { id: 'xunfei', label: '讯飞星火', icon: '/imgs/ai-icons/xunfei.png' },
  { id: 'zhipu', label: '智谱', icon: '/imgs/ai-icons/zhipu.png' },
] as const;

const BrandParseWizard: React.FC<BrandParseWizardProps> = ({
  theme,
  currentBrand: _currentBrand,
  initialWorkflowId,
  initialArtifactStep,
  onInitialFocusConsumed,
  onOpenDataScreenAll,
  onOpenGenerateListForOptimizationTask,
  onOpenPublishRecordsForOptimizationTask,
  onOpenOptimizationWorkbench,
}) => {
  const isDark = theme === 'dark';
  const [brandName, setBrandName] = useState('');
  const [productLine, setProductLine] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadFormatHint, setUploadFormatHint] = useState<string | null>(null);
  const allowedFormatsLabel = brandParseAllowedFormatsLabel();
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'form' | 'seo' | 'keywords' | 'diagnosis' | 'done'>('form');
  const [statusHint, setStatusHint] = useState('');
  const [coreKeywordItems, setCoreKeywordItems] = useState<CoreKeywordItem[]>([]);
  const [customKwInput, setCustomKwInput] = useState('');
  const [keywordsAll, setKeywordsAll] = useState<string[]>([]);
  const [, setKbId] = useState<number | null>(null);
  const [, setSeoTaskId] = useState<string | null>(null);
  const [enableKnowledgeGraph, setEnableKnowledgeGraph] = useState(false);
  const [usedKnowledgeGraphEnhancement, setUsedKnowledgeGraphEnhancement] = useState(false);
  const pollAbortRef = useRef(false);

  /** 优化主线 workflow */
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [mainView, setMainView] = useState<'wizard' | 'report' | 'opt_form' | 'monitoring'>('wizard');
  const [reportTaskId, setReportTaskId] = useState<string | null>(null);
  /** 内嵌诊断报告顶栏「开始优化」：节点 2 打开为 true，节点 3 打开为 false */
  const [reportShowOptimize, setReportShowOptimize] = useState(true);
  const [workflowList, setWorkflowList] = useState<GeoWorkflowDTO[]>([]);
  const [workflowListLoading, setWorkflowListLoading] = useState(false);
  const [workflowDetail, setWorkflowDetail] = useState<GeoWorkflowDTO | null>(null);
  /** 点击流程节点查看产出：0–3 对应 PIPELINE_STEPS */
  const [artifactStep, setArtifactStep] = useState<number | null>(null);
  const [optMonitorTask, setOptMonitorTask] = useState<OptimizationTaskDTO | null>(null);
  const [optPollTick, setOptPollTick] = useState(0);

  /** 内嵌创建优化任务 */
  const [templates, setTemplates] = useState<{ id: number; name: string }[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<number>>(new Set());
  const [scheduleCycle, setScheduleCycle] = useState('weekly');
  const [scheduleHour, setScheduleHour] = useState(9);
  const [scheduleDow, setScheduleDow] = useState(0);
  const [templateId, setTemplateId] = useState<number | ''>('');
  const [optPointsBudget, setOptPointsBudget] = useState('100');
  const [runImmediately, setRunImmediately] = useState(true);
  const [thirdPartyPublishEnabled, setThirdPartyPublishEnabled] = useState(false);
  const [expiresAtLocal, setExpiresAtLocal] = useState(defaultExpiresDatetimeLocal);
  const [optCreateDraft, setOptCreateDraft] = useState<Partial<CreateOptimizationTaskPayload> | null>(null);
  const [optSubmitting, setOptSubmitting] = useState(false);

  /** 非空表示优化表单为「编辑已有任务」仅可 PATCH 调度与有效期等 */
  const [optEditingTaskId, setOptEditingTaskId] = useState<string | null>(null);

  const [selectedAiPlatforms, setSelectedAiPlatforms] = useState<Set<string>>(() => new Set(['doubao']));

  useEffect(() => {
    pollAbortRef.current = false;
    return () => {
      pollAbortRef.current = true;
    };
  }, []);

  const loadWorkflowList = useCallback(async () => {
    setWorkflowListLoading(true);
    try {
      const res = await geoWorkflowAPI.list();
      setWorkflowList(res.items ?? []);
    } catch {
      setWorkflowList([]);
    } finally {
      setWorkflowListLoading(false);
    }
  }, []);

  const fetchWorkflowDetail = useCallback(async (wid: string | null) => {
    if (!wid) {
      setWorkflowDetail(null);
      return;
    }
    try {
      const d = await geoWorkflowAPI.get(wid);
      setWorkflowDetail(d);
    } catch {
      setWorkflowDetail(null);
    }
  }, []);

  useEffect(() => {
    void fetchWorkflowDetail(workflowId);
  }, [workflowId, fetchWorkflowDetail]);

  useEffect(() => {
    const list = workflowDetail?.aiPlatforms;
    if (list && list.length > 0) {
      setSelectedAiPlatforms(new Set(list));
    }
  }, [workflowDetail?.workflowId, workflowDetail?.aiPlatforms]);

  useEffect(() => {
    loadWorkflowList();
  }, [loadWorkflowList]);

  /** 侧栏「优化任务」等：跳转并同步选中主线 / 产出节点 */
  useEffect(() => {
    const wid = initialWorkflowId?.trim();
    if (!wid) return;
    setWorkflowId(wid);
    setArtifactStep(
      initialArtifactStep != null && initialArtifactStep >= 0 ? initialArtifactStep : null
    );
    void fetchWorkflowDetail(wid);
    void loadWorkflowList();
    onInitialFocusConsumed?.();
  }, [
    initialWorkflowId,
    initialArtifactStep,
    fetchWorkflowDetail,
    loadWorkflowList,
    onInitialFocusConsumed,
  ]);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const [tplRes, accRes] = await Promise.all([
          getArticleTemplates({ is_active: true, limit: 100 }),
          getSocialAccounts(),
        ]);
        if (c) return;
        setTemplates((tplRes.templates || []).map((t) => ({ id: t.id, name: t.name || `#${t.id}` })));
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

  /** 监控中轮询优化任务 */
  useEffect(() => {
    if (mainView !== 'monitoring' || !optMonitorTask?.taskId) return;
    const t = setInterval(() => setOptPollTick((x) => x + 1), GEO_WORKFLOW_POLL_MS);
    return () => clearInterval(t);
  }, [mainView, optMonitorTask?.taskId]);

  useEffect(() => {
    if (mainView !== 'monitoring' || !optMonitorTask?.taskId) return;
    let cancelled = false;
    (async () => {
      try {
        const t = await optimizationTaskAPI.get(optMonitorTask.taskId);
        if (!cancelled) setOptMonitorTask(t);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mainView, optMonitorTask?.taskId, optPollTick]);

  const pollSeoUntilDone = useCallback(async (taskId: string) => {
    for (let i = 0; i < MAX_POLLS; i++) {
      if (pollAbortRef.current) {
        throw new Error(ABORT_POLL_MSG);
      }
      const detail = await semanticSEOAPI.getTask(taskId);
      const st = normalizeSeoTaskStatus(detail?.task?.status);
      const kgLine = getKnowledgeGraphStatusLabel(detail?.task?.status);
      const longWait = i >= 15;
      setStatusHint(
        longWait
          ? `${kgLine} · 已等待较久，若进度不变请确认后台已启动 Celery 并处理知识图谱任务`
          : `${kgLine} · 第 ${i + 1} 次进度检查（约每 ${POLL_MS / 1000} 秒刷新）`
      );
      if (isSeoTaskSuccess(st)) return;
      if (isSeoTaskFailed(st)) {
        throw new Error('知识图谱生成失败，请稍后重试或联系管理员');
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    throw new Error('知识图谱生成超时，请稍后在侧栏「知识图谱」中查看任务状态');
  }, []);

  const handleStart = async () => {
    const name = brandName.trim();
    if (!name) {
      setError('请填写品牌名称');
      return;
    }
    if (!productLine.trim()) {
      setError('请填写产品线 / 产品型号');
      return;
    }
    setError(null);
    setPhase('seo');
    const willUploadFiles = files.length > 0;
    setStatusHint(
      willUploadFiles
        ? '正在上传材料…'
        : enableKnowledgeGraph
          ? '正在创建知识库并启动知识图谱生成…'
          : '正在准备词包…'
    );
    try {
      // 品牌以输入框为准（与侧栏「当前品牌」无关）
      const wf = await geoWorkflowAPI.create({
        brand_name: name,
        ai_platforms: Array.from(selectedAiPlatforms),
        product_name: productLine.trim(),
        question_intent: GEO_QUESTION_INTENT,
      });
      setWorkflowId(wf.workflowId);

      const start = await brandParseAPI.start({
        brandName: name,
        files: files.length ? files : undefined,
        enableKnowledgeGraph,
        geoWorkflowId: wf.workflowId,
        ...(willUploadFiles
          ? {
              onUploadProgress: (pct: number | null) => {
                setStatusHint(pct === null ? '正在上传材料…' : `正在上传材料 ${pct}%`);
              },
            }
          : {}),
      });
      setKbId(start.knowledge_base_id);
      setSeoTaskId(start.semantic_seo_task_id);
      setUsedKnowledgeGraphEnhancement(!!start.semantic_seo_task_id);
      if (start.semantic_seo_task_id) {
        setStatusHint('知识图谱任务已提交，正在生成中（联网检索 → 实体关系 → 共现词）…');
        await pollSeoUntilDone(start.semantic_seo_task_id);
      }
      setStatusHint(
        start.semantic_seo_task_id
          ? '知识图谱已完成，正在根据共现词生成词包…'
          : '已提交词包任务（后台 Celery），正在联网解析品牌与核心词…'
      );
      const finRaw = await brandParseAPI.finalize({
        semantic_seo_task_id: start.semantic_seo_task_id,
        knowledge_base_id: start.knowledge_base_id ?? null,
        brand_name: name,
        core_keyword_max: 20,
        product_name: productLine.trim(),
        question_intent: GEO_QUESTION_INTENT,
      });
      const fin = isBrandParseFinalizeAsync(finRaw)
        ? await brandParseAPI.pollFinalizeUntilDone(finRaw.celery_task_id, {
            pollMs: POLL_MS,
            maxPolls: MAX_POLLS,
          })
        : finRaw;
      const sys = (fin.core_keywords || []).map((t) => String(t).trim()).filter(Boolean);
      setCoreKeywordItems(
        sys.map((text, i) => ({
          id: `sys-${Date.now()}-${i}-${text.slice(0, 12)}`,
          text,
          fromSystem: true,
        }))
      );
      setKeywordsAll(fin.keywords_all || []);

      await geoWorkflowAPI.advance(wf.workflowId, {
        extraction_task_id: fin.extraction_task_id,
        core_keywords: sys,
        knowledge_base_id: start.knowledge_base_id ?? undefined,
        semantic_seo_task_id: start.semantic_seo_task_id ?? undefined,
      });
      await loadWorkflowList();
      await fetchWorkflowDetail(wf.workflowId);

      setPhase('keywords');
      setStatusHint('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === ABORT_POLL_MSG) {
        setPhase('form');
        return;
      }
      setError(msg);
      setPhase('form');
      setWorkflowId(null);
    }
  };

  const handleRunDiagnosis = async () => {
    const name = brandName.trim();
    const kws = coreKeywordItems.map((x) => x.text).filter(Boolean);
    if (!name || !kws.length) {
      setError('缺少品牌名或核心词');
      return;
    }
    if (!workflowId) {
      setError('Workflow 未初始化，请从第一步重新提交');
      return;
    }
    setError(null);
    setPhase('diagnosis');
    setStatusHint('正在生成 GEO 诊断报告（可能需要数分钟）…');
    const platList = Array.from(selectedAiPlatforms);
    try {
      await geoWorkflowAPI.advance(workflowId, {
        set_diagnosis_running: true,
        ai_platforms: platList,
      });
      const data = await analyzeBrandDiagnosisSession({
        brand_name: name,
        brand_introduction: undefined,
        core_keywords: kws,
        ai_platforms: platList,
        product_name: productLine.trim(),
        question_intent: GEO_QUESTION_INTENT,
      });
      const tid = (data.taskId as string) || (data.batchId as string);
      if (!tid) {
        throw new Error('诊断成功但未返回 taskId');
      }
      if (data.id == null) {
        throw new Error('诊断成功但未返回报告 id');
      }
      const baseline = parseVisibilityNum(data.visibility);
      await geoWorkflowAPI.advance(workflowId, {
        diagnosis_report_id: Number(data.id),
        baseline_visibility: baseline,
      });
      await loadWorkflowList();
      await fetchWorkflowDetail(workflowId);

      setReportTaskId(tid);
      setReportShowOptimize(true);
      setPhase('done');
      setMainView('report');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setPhase('keywords');
    }
  };

  const openOptimizationForm = useCallback((payload: OptimizationStartPayload) => {
    setOptEditingTaskId(null);
    setExpiresAtLocal(defaultExpiresDatetimeLocal());
    setOptPointsBudget('100');
    setProductLine((payload.productName ?? '').trim());
    setOptCreateDraft({
      brand_name: payload.brandName,
      core_keywords: payload.keywords,
      source_diagnosis_report_id: payload.sourceDiagnosisReportId ?? undefined,
      baseline_visibility: payload.baselineVisibility ?? undefined,
    });
    setMainView('opt_form');
  }, []);

  /** 从已有优化任务加载表单（编辑调度与有效期等，依赖后端 PATCH 允许的状态） */
  const openOptimizationFormForEdit = useCallback(async (taskId: string) => {
    setArtifactStep(null);
    try {
      const t = await optimizationTaskAPI.get(taskId);
      setOptCreateDraft({
        brand_name: t.brandName,
        core_keywords: t.coreKeywords || [],
        source_diagnosis_report_id: t.sourceDiagnosisReportId ?? undefined,
        baseline_visibility: t.baselineSnapshot?.visibility ?? undefined,
      });
      setProductLine((t.productName ?? '').trim());
      setScheduleCycle(t.scheduleCycle || 'weekly');
      setScheduleHour(t.scheduleHour ?? 9);
      setScheduleDow(t.scheduleDayOfWeek ?? 0);
      setTemplateId(
        t.templateIds && t.templateIds.length > 0
          ? Number(t.templateIds[0])
          : t.templateId != null
            ? t.templateId
            : ''
      );
      setOptPointsBudget(
        t.pointsBudgetPerCycle != null && t.pointsBudgetPerCycle > 0
          ? String(t.pointsBudgetPerCycle)
          : '100'
      );
      setExpiresAtLocal(isoToDatetimeLocal(t.expiresAt));
      const ids = new Set<number>();
      for (const x of t.targetAccounts || []) {
        if (x.account_id != null) ids.add(x.account_id);
      }
      setSelectedAccountIds(ids);
      setThirdPartyPublishEnabled(Boolean(t.thirdPartyPublishEnabled));
      setOptEditingTaskId(taskId);
      setMainView('opt_form');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '加载优化任务失败');
    }
  }, []);

  const handleCreateOptimization = async () => {
    if (optEditingTaskId) {
      if (!productLine.trim()) {
        alert('请填写产品线 / 产品型号');
        return;
      }
      setOptSubmitting(true);
      try {
        const expIso = datetimeLocalToIsoUtc(expiresAtLocal.trim());
        if (!expIso || new Date(expIso).getTime() <= Date.now()) {
          alert('请填写任务有效期，且须晚于当前时间');
          setOptSubmitting(false);
          return;
        }
        if (templateId === '') {
          alert('范文模板不能为空；若需改走仿写/手工请使用工作台完整表单。');
          setOptSubmitting(false);
          return;
        }
        const pb = parseInt(optPointsBudget.trim(), 10);
        if (Number.isNaN(pb) || pb < 10 || pb % 10 !== 0) {
          alert('每周期积分预算须为 ≥10 且为 10 的整数倍');
          setOptSubmitting(false);
          return;
        }
        const updated = await optimizationTaskAPI.patch(optEditingTaskId, {
          schedule_cycle: scheduleCycle,
          schedule_hour: scheduleCycle === 'hourly_6' ? null : scheduleHour,
          schedule_day_of_week: scheduleCycle === 'weekly' ? scheduleDow : null,
          expires_at: expIso,
          template_id: templateId === '' ? null : Number(templateId),
          template_ids: templateId === '' ? null : [Number(templateId)],
          points_budget_per_cycle: pb,
          points_budget_strategy: {
            mode: 'quota',
            template_articles: 0,
            imitate_articles: 0,
            custom_articles: 0,
          },
          product_name: productLine.trim(),
          third_party_publish_enabled: thirdPartyPublishEnabled,
        });
        setOptMonitorTask(updated);
        setOptEditingTaskId(null);
        setMainView('monitoring');
        if (workflowId) {
          await loadWorkflowList();
          await fetchWorkflowDetail(workflowId);
        }
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : '保存失败');
      } finally {
        setOptSubmitting(false);
      }
      return;
    }

    const d = optCreateDraft;
    if (!d?.brand_name?.trim() || !workflowId) {
      alert('缺少品牌或 Workflow');
      return;
    }
    const kws = d.core_keywords || [];
    if (kws.length < 1) {
      alert('请至少一个核心词');
      return;
    }
    const picked = accounts.filter((a) => a.id != null && a.authorized && selectedAccountIds.has(a.id!));
    const target_accounts: TargetAccount[] = picked.map((a) => ({
      account_id: a.id!,
      platform: a.platform || undefined,
    }));
    const expIso = datetimeLocalToIsoUtc(expiresAtLocal.trim());
    if (!expIso || new Date(expIso).getTime() <= Date.now()) {
      alert('请填写任务有效期，且须晚于当前时间');
      return;
    }
    if (templateId === '') {
      alert('请选择范文模板；仿写/多范文/手工提示词请使用优化工作台完整表单。');
      return;
    }
    const pb = parseInt(optPointsBudget.trim(), 10);
    if (Number.isNaN(pb) || pb < 10 || pb % 10 !== 0) {
      alert('每周期积分预算须为 ≥10 且为 10 的整数倍');
      return;
    }
    if (!productLine.trim()) {
      alert('请填写产品线 / 产品型号');
      return;
    }
    setOptSubmitting(true);
    try {
      const payload: CreateOptimizationTaskPayload = {
        brand_name: d.brand_name.trim(),
        product_name: productLine.trim(),
        core_keywords: kws,
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
        source_diagnosis_report_id: d.source_diagnosis_report_id ?? null,
        baseline_visibility: d.baseline_visibility ?? null,
        extraction_task_id: undefined,
        geo_workflow_id: workflowId,
        run_immediately: runImmediately,
        expires_at: expIso,
        third_party_publish_enabled: thirdPartyPublishEnabled,
      };
      const created = await optimizationTaskAPI.create(payload);
      setOptMonitorTask(created);
      setMainView('monitoring');
      await loadWorkflowList();
      await fetchWorkflowDetail(workflowId);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '创建失败');
    } finally {
      setOptSubmitting(false);
    }
  };

  const pageBg = isDark
    ? 'bg-[linear-gradient(180deg,#111827_0%,#0f172a_40%,#0f172a_100%)]'
    : 'bg-[linear-gradient(180deg,#fff5f2_0%,#f8f9fb_38%,#f8f9fb_100%)]';

  const cardShell = isDark
    ? 'overflow-hidden rounded-2xl border border-slate-600/80 bg-slate-900/90 shadow-lg shadow-black/30'
    : 'overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg shadow-slate-200/50';

  const cardHeader = isDark
    ? 'border-b border-slate-700 bg-gradient-to-r from-orange-950/50 to-amber-950/30 px-5 py-4 sm:px-8'
    : 'border-b border-slate-100 bg-gradient-to-r from-orange-50/90 to-amber-50/40 px-5 py-4 sm:px-8';

  const titleCls = isDark ? 'text-lg font-semibold text-white sm:text-xl' : 'text-lg font-semibold text-[#111827] sm:text-xl';
  const subCls = isDark ? 'mt-1 text-sm text-zinc-400' : 'mt-1 text-sm text-[#64748b]';
  const labelStrong = isDark ? 'mb-2 block text-sm font-semibold text-zinc-200' : 'mb-2 block text-sm font-semibold text-[#374151]';

  const inputCls = isDark
    ? `w-full max-w-xl rounded-lg border border-slate-600 bg-slate-900/80 px-4 py-2.5 text-sm text-white outline-none ring-0 transition placeholder:text-zinc-500 focus:border-[#E8553F] focus:ring-2 focus:ring-[#E8553F]/20`
    : `w-full max-w-xl rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-[#111827] outline-none ring-0 transition placeholder:text-slate-400 focus:border-[#E8553F] focus:ring-2 focus:ring-[#E8553F]/20`;

  const fileCard = isDark
    ? 'flex cursor-pointer items-center gap-3 rounded-xl border border-slate-600 bg-slate-800/80 px-3 py-2.5 transition hover:border-orange-500/50'
    : 'flex cursor-pointer items-center gap-3 rounded-xl border border-slate-100 bg-[#f8f9fb] px-3 py-2.5 transition hover:border-orange-200/90 hover:bg-orange-50/40';

  const recordCard = isDark
    ? 'mt-8 overflow-hidden rounded-2xl border border-slate-600/80 bg-slate-900/90 shadow-md shadow-black/25'
    : 'mt-8 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-200/40';

  const emptyBox = isDark
    ? 'mb-6 flex h-28 w-40 items-center justify-center rounded-lg border-2 border-dashed border-sky-800/80 bg-sky-950/30 text-sky-500'
    : 'mb-6 flex h-28 w-40 items-center justify-center rounded-lg border-2 border-dashed border-sky-200/80 bg-sky-50/50 text-sky-400';

  const removeCoreKeyword = (id: string) => {
    setCoreKeywordItems((prev) => prev.filter((x) => x.id !== id));
  };

  const addCustomCoreKeyword = () => {
    const t = customKwInput.trim();
    if (!t) return;
    const dup = coreKeywordItems.some((k) => k.text.toLowerCase() === t.toLowerCase());
    if (dup) {
      setCustomKwInput('');
      return;
    }
    setCoreKeywordItems((prev) => [
      ...prev,
      { id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, text: t, fromSystem: false },
    ]);
    setCustomKwInput('');
  };

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const { accepted, rejected } = filterBrandParseUploadFiles(Array.from(list));
    if (rejected.length > 0) {
      setUploadFormatHint(
        `以下文件格式不支持（仅支持 ${allowedFormatsLabel}），未加入列表：${rejected.join('、')}`
      );
    } else {
      setUploadFormatHint(null);
    }
    if (accepted.length > 0) {
      setFiles((prev) => [...prev, ...accepted]);
    }
    e.target.value = '';
  };

  const removeFile = (i: number) => {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const allAiIds = AI_PLATFORM_OPTIONS.map((o) => o.id);
  const allAiSelected = allAiIds.every((id) => selectedAiPlatforms.has(id));

  const primaryDisabled =
    phase === 'seo' ||
    phase === 'diagnosis' ||
    (phase === 'form' && (!brandName.trim() || selectedAiPlatforms.size < 1));

  const primaryAction = () => {
    if (phase === 'form') void handleStart();
    else if (phase === 'keywords') {
      if (
        (workflowDetail?.phase === 'monitoring' ||
          workflowDetail?.phase === 'intelligent_optimization') &&
        !workflowDetail?.optimizationTaskId &&
        workflowDetail?.diagnosisReportId
      ) {
        openOptimizationForm({
          brandName: workflowDetail.brandName,
          productName: workflowDetail.productName ?? null,
          keywords: (workflowDetail.coreKeywords ?? []).map((x) => String(x).trim()).filter(Boolean),
          sourceDiagnosisReportId: workflowDetail.diagnosisReportId,
          baselineVisibility: workflowDetail.baselineVisibility ?? null,
        });
        return;
      }
      void handleRunDiagnosis();
    }
  };

  const primaryLabel =
    phase === 'form'
      ? '开始引导'
      : phase === 'keywords'
        ? (workflowDetail?.phase === 'monitoring' ||
            workflowDetail?.phase === 'intelligent_optimization') &&
            !workflowDetail?.optimizationTaskId &&
            workflowDetail?.diagnosisReportId
          ? '创建优化任务'
          : '生成诊断报告'
        : phase === 'seo' || phase === 'diagnosis'
          ? '处理中…'
          : '开始引导';

  const toggleAccount = (id: number) => {
    const n = new Set(selectedAccountIds);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelectedAccountIds(n);
  };

  /** 主卡片：报告 / 优化表单 / 监控 / 向导 */
  const renderMainCardBody = () => {
    if (mainView === 'report' && reportTaskId) {
      return (
        <Suspense
          fallback={
            <div className="flex min-h-[320px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#E8553F]" />
            </div>
          }
        >
          <GeoBrandReportMiniLayout
            theme={theme}
            taskId={reportTaskId}
            backButtonLabel="返回快速开始"
            onBack={() => {
              setMainView('wizard');
              setPhase('form');
              setArtifactStep(null);
            }}
            onStartOptimize={reportShowOptimize ? openOptimizationForm : undefined}
          />
        </Suspense>
      );
    }

    if (mainView === 'opt_form' && optCreateDraft) {
      const inputClsLocal = isDark
        ? 'w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white'
        : 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm';
      return (
        <div className="space-y-6 px-5 py-6 sm:px-8">
          <h3 className={titleCls}>{optEditingTaskId ? '编辑监控配置' : '创建自动优化任务'}</h3>
          <p className={subCls}>
            {optEditingTaskId
              ? '修改调度周期、有效期与写作/积分预算（任务需为运行中或已暂停方可保存；账号与模板请在侧栏任务详情中查看）。'
              : '将关联当前优化主线，启动后与侧栏「优化任务」同源。'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelStrong}>品牌名称</label>
              <input
                type="text"
                readOnly
                className={`${inputClsLocal} opacity-80`}
                value={optCreateDraft.brand_name || ''}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelStrong}>产品线 / 产品型号（必填）</label>
              <input
                type="text"
                className={inputClsLocal}
                value={productLine}
                onChange={(e) => setProductLine(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelStrong}>任务有效期（必填）</label>
              <input
                type="datetime-local"
                className={inputClsLocal}
                value={expiresAtLocal}
                onChange={(e) => setExpiresAtLocal(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                到期后自动结束；仅「手动关闭」与「到期」可结束任务。
              </p>
            </div>
            <div>
              <label className={labelStrong}>调度周期</label>
              <select className={inputClsLocal} value={scheduleCycle} onChange={(e) => setScheduleCycle(e.target.value)}>
                <option value="hourly_6">每 6 小时</option>
                <option value="daily">每天</option>
                <option value="weekly">每周</option>
              </select>
            </div>
            {scheduleCycle !== 'hourly_6' ? (
              <div>
                <label className={labelStrong}>执行时刻（0–23）</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  className={inputClsLocal}
                  value={scheduleHour}
                  onChange={(e) => setScheduleHour(Number(e.target.value))}
                />
              </div>
            ) : null}
            {scheduleCycle === 'weekly' ? (
              <div>
                <label className={labelStrong}>周几（0=周一）</label>
                <input
                  type="number"
                  min={0}
                  max={6}
                  className={inputClsLocal}
                  value={scheduleDow}
                  onChange={(e) => setScheduleDow(Number(e.target.value))}
                />
              </div>
            ) : null}
            {!optEditingTaskId ? (
              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
                    checked={runImmediately}
                    onChange={(e) => setRunImmediately(e.target.checked)}
                  />
                  <span>
                    <span className="font-semibold">创建后立即执行第一轮周期</span>
                    <span className="mt-0.5 block text-xs font-normal text-slate-500 dark:text-zinc-400">
                      关闭则首轮仅在下次周期时间点执行（按上方调度排队）。
                    </span>
                  </span>
                </label>
              </div>
            ) : null}
            <div>
              <label className={labelStrong}>范文模板（必填）</label>
              <select
                className={inputClsLocal}
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">请选择</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">
                本向导为单范文简版；多范文与仿写/手工请用优化工作台。
              </p>
            </div>
            <div>
              <label className={labelStrong}>每周期积分上限</label>
              <input
                type="number"
                min={10}
                step={10}
                className={inputClsLocal}
                value={optPointsBudget}
                onChange={(e) => setOptPointsBudget(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-zinc-500">10 分/篇，须为 10 的整数倍。</p>
            </div>
          </div>
          <div>
            <label className={labelStrong}>发布账号（可选，多选）</label>
            <p className="mb-2 text-xs text-slate-500 dark:text-zinc-400">
              可选用自媒体 OAuth 帐号自动发稿，并可勾选三方媒体待发；不配自媒体且未勾三方则该周期发布步骤跳过（报告与内容仍独立执行）。
            </p>
            <label
              className={`mb-3 flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                isDark
                  ? 'border-slate-600 bg-slate-800/80 text-zinc-200'
                  : 'border-slate-100 bg-slate-50/60 text-slate-700'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
                checked={thirdPartyPublishEnabled}
                onChange={(e) => setThirdPartyPublishEnabled(e.target.checked)}
              />
              <span>
                <span className="font-semibold">三方媒体发布</span>
                <span className="mt-0.5 block text-xs font-normal opacity-90">
                  本周期全部文章生成成功后自动出现在左侧「信源库 → 三方媒体发布」；待发篇数为该周期成功篇数，可与自媒体同时使用。
                </span>
              </span>
            </label>
            <div className="max-h-40 space-y-2 overflow-y-auto">
              {accounts.filter((a) => a.authorized && a.id != null).length === 0 ? (
                <p className="text-sm text-amber-600">
                  若无已授权自媒体账号，仍可勾选上方「三方媒体发布」，或先到「自媒体账号」完成 OAuth。
                </p>
              ) : (
                accounts
                  .filter((a) => a.authorized && a.id != null)
                  .map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        disabled={!!optEditingTaskId}
                        checked={selectedAccountIds.has(a.id!)}
                        onChange={() => toggleAccount(a.id!)}
                      />
                      <span className="text-sm">
                        {a.platform}
                        {a.nickname ? ` · ${a.nickname}` : ''}
                      </span>
                    </label>
                  ))
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (optEditingTaskId) {
                  setMainView('wizard');
                  setOptEditingTaskId(null);
                } else {
                  setMainView('report');
                }
              }}
              className="text-sm text-slate-600 underline dark:text-zinc-400"
            >
              {optEditingTaskId ? '返回快速开始' : '返回报告'}
            </button>
            <button
              type="button"
              disabled={optSubmitting}
              onClick={() => void handleCreateOptimization()}
              className={CORAL_BTN}
            >
              {optSubmitting ? '提交中…' : optEditingTaskId ? '保存配置' : '创建并启动优化'}
            </button>
          </div>
        </div>
      );
    }

    if (mainView === 'monitoring' && optMonitorTask) {
      const t = optMonitorTask;
      return (
        <div className="space-y-4 px-5 py-6 sm:px-8">
          <h3 className={titleCls}>智能优化进行中</h3>
          <p className={subCls}>
            任务 {t.taskId} · 状态 {t.status} · 已执行 {t.totalCyclesRun} 轮周期
            {t.expiresAt ? ` · 有效期至 ${new Date(t.expiresAt).toLocaleString('zh-CN')}` : ''}
          </p>
          <p className={subCls}>下次执行：{t.nextCycleAt ? new Date(t.nextCycleAt).toLocaleString('zh-CN') : '—'}</p>
          <button
            type="button"
            className="text-sm text-violet-600 underline"
            onClick={() => {
              setMainView('wizard');
              setPhase('form');
            }}
          >
            返回快速开始
          </button>
        </div>
      );
    }

    return (
      <>
        <div className="grid gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-10">
          <div className="min-w-0 space-y-6">
            {workflowId ? (
              <p className={isDark ? 'text-xs text-zinc-500' : 'text-xs text-slate-500'}>
                Workflow：{workflowId}
              </p>
            ) : null}
            {workflowDetail && mainView === 'wizard' && phase !== 'form' ? (
              <WorkflowPipelineStrip
                isDark={isDark}
                wf={workflowDetail}
                embedded
                onNodeClick={(idx) => setArtifactStep(idx)}
              />
            ) : null}
            {phase === 'form' && (
              <>
                <div>
                  <label htmlFor="bpw-brand-name" className={labelStrong}>
                    品牌名称
                  </label>
                  <input
                    id="bpw-brand-name"
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="品牌名称，如：珊瑚 GEO"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label htmlFor="bpw-product-line" className={labelStrong}>
                    产品线 / 产品型号（必填）
                  </label>
                  <input
                    id="bpw-product-line"
                    type="text"
                    value={productLine}
                    onChange={(e) => setProductLine(e.target.value)}
                    className={inputCls}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className={labelStrong}>AI 平台</span>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={allAiSelected}
                        onChange={() => {
                          if (allAiSelected) setSelectedAiPlatforms(new Set());
                          else setSelectedAiPlatforms(new Set(allAiIds));
                        }}
                        className="h-4 w-4 rounded border-slate-400 text-[#E8553F] focus:ring-[#E8553F]"
                      />
                      <span className={isDark ? 'text-zinc-300' : 'text-slate-700'}>全选</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                    {AI_PLATFORM_OPTIONS.map((p) => (
                      <label
                        key={p.id}
                        className={
                          'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ' +
                          (selectedAiPlatforms.has(p.id)
                            ? isDark
                              ? 'border-orange-500/50 bg-orange-950/40'
                              : 'border-orange-200 bg-orange-50/80'
                            : isDark
                              ? 'border-slate-600 bg-slate-800/40 hover:border-slate-500'
                              : 'border-slate-200 bg-white hover:border-slate-300')
                        }
                      >
                        <img src={p.icon} alt="" className="h-8 w-8 shrink-0 rounded-md object-contain" />
                        <span className="min-w-0 flex-1 font-medium">{p.label}</span>
                        <input
                          type="checkbox"
                          checked={selectedAiPlatforms.has(p.id)}
                          onChange={() => {
                            setSelectedAiPlatforms((prev) => {
                              const n = new Set(prev);
                              if (n.has(p.id)) n.delete(p.id);
                              else n.add(p.id);
                              return n;
                            });
                          }}
                          className="h-4 w-4 shrink-0 rounded border-slate-400 text-[#E8553F] focus:ring-[#E8553F]"
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                      isDark
                        ? 'border-slate-600 bg-slate-800/50 hover:border-orange-500/40'
                        : 'border-slate-200 bg-[#f8f9fb] hover:border-orange-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={enableKnowledgeGraph}
                      onChange={(e) => setEnableKnowledgeGraph(e.target.checked)}
                      className="h-4 w-4 shrink-0 rounded border-slate-400 text-[#E8553F] focus:ring-[#E8553F]"
                    />
                    <span className={isDark ? 'text-sm font-semibold text-zinc-100' : 'text-sm font-semibold text-[#374151]'}>
                      开启知识图谱增强
                    </span>
                  </label>
                </div>

                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-4">
                    <span className={isDark ? 'text-sm font-semibold text-zinc-200' : 'text-sm font-semibold text-[#374151]'}>
                      上传材料（可选）
                    </span>
                    <span className={isDark ? 'text-xs text-zinc-500' : 'text-xs text-[#64748b]'}>
                      支持多文件；仅支持 {allowedFormatsLabel}
                    </span>
                  </div>
                  {uploadFormatHint ? (
                    <div
                      className={
                        isDark
                          ? 'mb-3 rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-xs text-amber-100'
                          : 'mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900'
                      }
                    >
                      {uploadFormatHint}
                    </div>
                  ) : null}
                  <div className="space-y-3">
                    <input
                      id="brand-parse-wizard-files"
                      type="file"
                      multiple
                      accept={BRAND_PARSE_ACCEPT_ATTR}
                      className="sr-only"
                      onChange={onPickFiles}
                    />
                    <label
                      htmlFor="brand-parse-wizard-files"
                      className={`${fileCard} inline-flex max-w-full sm:max-w-md`}
                    >
                      <FileUp className="h-10 w-10 shrink-0 rounded-lg bg-orange-500/15 p-2 text-orange-600" />
                      <span className="min-w-0 text-sm font-medium text-[#111827] dark:text-zinc-100">选择文件</span>
                    </label>
                    <ul className="space-y-2">
                      {files.map((f, i) => (
                        <li
                          key={`${f.name}-${i}-${f.size}`}
                          className={
                            isDark
                              ? 'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-600 bg-slate-800/80 px-3 py-2.5'
                              : 'grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-100 bg-[#f8f9fb] px-3 py-2.5'
                          }
                        >
                          <FileText
                            className={
                              'h-10 w-10 shrink-0 rounded-lg p-2 shadow-sm ring-1 ' +
                              (isDark
                                ? 'bg-slate-700 text-zinc-400 ring-slate-600'
                                : 'bg-white text-slate-500 ring-slate-100')
                            }
                          />
                          <span className="min-w-0 break-words text-sm font-medium leading-snug text-[#111827] dark:text-zinc-100">
                            {f.name || `未命名文件 ${i + 1}`}
                          </span>
                          <button
                            type="button"
                            className="shrink-0 rounded px-2 text-sm text-red-500 hover:underline"
                            onClick={() => removeFile(i)}
                          >
                            移除
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
              </>
            )}

            {(phase === 'seo' || phase === 'diagnosis') && (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className={`h-8 w-8 animate-spin ${isDark ? 'text-orange-400' : 'text-[#E8553F]'}`} />
                <p className={`text-center text-sm ${isDark ? 'text-zinc-400' : 'text-[#64748b]'}`}>{statusHint}</p>
              </div>
            )}

            {phase === 'keywords' && (
              <>
                {!usedKnowledgeGraphEnhancement && (
                  <p className={isDark ? 'mb-2 text-sm text-zinc-500' : 'mb-2 text-sm text-[#64748b]'}>
                    未启用知识图谱增强：核心词来自联网 parse-brand（与小程序一致），可直接生成诊断报告。
                  </p>
                )}
                <p className={labelStrong}>词包核心词（供诊断使用）</p>
                <p className={isDark ? 'mb-3 text-xs text-zinc-500' : 'mb-3 text-xs text-[#64748b]'}>
                  系统生成的词可点击右上角关闭；也可添加自定义词。诊断通常使用前 5 个词。
                </p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {coreKeywordItems.map((item) => {
                    const isSys = item.fromSystem;
                    const cardBase =
                      'relative inline-flex max-w-[min(100%,280px)] min-w-[72px] flex-col rounded-xl border px-3 pb-2.5 pt-1.5 text-left shadow-sm transition';
                    const cardTheme = isSys
                      ? isDark
                        ? 'border-orange-500/35 bg-orange-950/50 text-orange-100'
                        : 'border-orange-200/90 bg-orange-50/90 text-orange-950'
                      : isDark
                        ? 'border-sky-600/50 bg-sky-950/40 text-sky-100'
                        : 'border-sky-200 bg-sky-50 text-sky-950';
                    return (
                      <div key={item.id} className={`${cardBase} ${cardTheme}`}>
                        <div className="mb-1 flex items-start justify-between gap-1 pr-0">
                          <span
                            className={
                              'text-[10px] font-semibold uppercase tracking-wide ' +
                              (isSys
                                ? isDark
                                  ? 'text-orange-300/90'
                                  : 'text-orange-700/90'
                                : isDark
                                  ? 'text-sky-300/90'
                                  : 'text-sky-700/90')
                            }
                          >
                            {isSys ? '系统' : '自定义'}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeCoreKeyword(item.id)}
                            className={
                              '-mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ' +
                              (isDark
                                ? 'text-zinc-400 hover:bg-white/10 hover:text-white'
                                : 'text-slate-400 hover:bg-black/5 hover:text-slate-800')
                            }
                            aria-label={`移除「${item.text}」`}
                          >
                            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                        </div>
                        <span className="break-words text-sm font-medium leading-snug">{item.text}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={customKwInput}
                    onChange={(e) => setCustomKwInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomCoreKeyword();
                      }
                    }}
                    placeholder="输入自定义核心词"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={addCustomCoreKeyword}
                    className={
                      'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition ' +
                      (isDark
                        ? 'border-slate-600 bg-slate-800 text-zinc-200 hover:border-orange-500/50 hover:bg-slate-700/80'
                        : 'border-slate-200 bg-white text-[#374151] hover:border-orange-200 hover:bg-orange-50/50')
                    }
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                    添加
                  </button>
                </div>
                {keywordsAll.length > coreKeywordItems.length && (
                  <details className={isDark ? 'text-sm text-zinc-400' : 'text-sm text-[#64748b]'}>
                    <summary className="cursor-pointer hover:underline">查看全部共现词</summary>
                    <p className={`mt-2 break-words ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                      {keywordsAll.join('、')}
                    </p>
                  </details>
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}
              </>
            )}
          </div>

          {mainView === 'wizard' && (phase === 'form' || phase === 'keywords') ? (
            <div className="flex justify-end lg:pt-8">
              <button
                type="button"
                disabled={primaryDisabled || (phase === 'keywords' && !coreKeywordItems.length)}
                onClick={primaryAction}
                className={CORAL_BTN}
              >
                {phase === 'form' || phase === 'keywords' ? (
                  <>
                    <Search className="h-4 w-4" aria-hidden />
                    {primaryLabel}
                  </>
                ) : (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {primaryLabel}
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
      </>
    );
  };

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col overflow-y-auto font-sans ${pageBg} pb-16 pt-4`}>
      <div className="mx-auto w-full max-w-[1300px] px-4 sm:px-6 lg:px-8">
        <h1 className="sr-only">快速开始</h1>

        <section className={cardShell}>
          <div className={cardHeader}>
            <h2 className={titleCls}>快速开始</h2>
            <p className={subCls}>按 GEO 全生命周期引导</p>
          </div>

          {renderMainCardBody()}
        </section>

        {mainView === 'wizard' && phase === 'form' ? (
          <section className={recordCard}>
            <div
              className={
                isDark
                  ? 'flex flex-col gap-2 border-b border-slate-700 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-8'
                  : 'flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-8'
              }
            >
              <div>
                <h2 className={isDark ? 'text-base font-semibold text-white sm:text-lg' : 'text-base font-semibold text-[#111827] sm:text-lg'}>
                  优化记录（GEO 工作流）
                </h2>
                <p className={`mt-1 text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                  各品牌的全生命周期引导、阶段状态与产出；与「周期优化任务」定时调度不是同一概念。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadWorkflowList()}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <RefreshCw className="h-4 w-4" /> 刷新
                </button>
                {onOpenOptimizationWorkbench ? (
                  <button
                    type="button"
                    onClick={() => onOpenOptimizationWorkbench(DEFAULT_WORKBENCH_OPEN)}
                    className={CORAL_BTN + ' inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm'}
                  >
                    <Plus className="h-4 w-4" />
                    新建新优化
                  </button>
                ) : null}
              </div>
            </div>

            <div className="min-h-[200px] px-4 py-6 sm:px-6">
              {workflowListLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#E8553F]" />
                </div>
              ) : workflowList.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                  <div className={emptyBox} aria-hidden>
                    <Archive className="h-14 w-14 opacity-60" strokeWidth={1.25} />
                  </div>
                  <p className={isDark ? 'max-w-md text-sm text-zinc-400' : 'max-w-md text-sm text-[#64748b]'}>
                    暂无 Workflow，完成「开始引导」后将在此展示主线进度。
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {workflowList.map((w) => (
                    <div
                      key={w.workflowId}
                      className={
                        'rounded-xl border p-4 text-left transition ' +
                        (isDark
                          ? 'border-slate-600 bg-slate-800/50'
                          : 'border-slate-200 bg-white')
                      }
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[#111827] dark:text-white">{w.brandName}</span>
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
                          <span className="flex items-center gap-1">
                            <Bot className="h-3 w-3" />
                            {w.optimizationTaskId}
                          </span>
                        ) : null}
                      </div>
                      {onOpenOptimizationWorkbench ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-[#E8553F] hover:bg-orange-50"
                            onClick={() =>
                              onOpenOptimizationWorkbench({
                                workflowId: w.workflowId,
                                brand: null,
                                initialStage: 'brand_input',
                                intake: null,
                              })
                            }
                          >
                            历史优化
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}

        {artifactStep !== null && workflowDetail && workflowId ? (
          <GeoWorkflowArtifactModal
            isDark={isDark}
            workflowId={workflowId}
            workflowDetail={workflowDetail}
            artifactStep={artifactStep}
            brandNameHint={brandName}
            geoQuickStartDataScreenBack
            onClose={() => setArtifactStep(null)}
            onWorkflowUpdated={(wf) => setWorkflowDetail(wf)}
            onListRefresh={loadWorkflowList}
            onOpenDiagnosisReport={(tid, opts) => {
              setReportShowOptimize(opts?.showOptimizeButton !== false);
              setReportTaskId(tid);
              setMainView('report');
              setPhase('done');
              setArtifactStep(null);
            }}
            onOptimizationEdit={(taskId) => void openOptimizationFormForEdit(taskId)}
            onOptimizationCreate={(payload) => {
              setArtifactStep(null);
              openOptimizationForm(payload);
            }}
            onOpenDataScreenAll={(bid, opts) => {
              setArtifactStep(null);
              onOpenDataScreenAll?.(bid, opts);
            }}
            onOpenGenerateListForOptimizationTask={onOpenGenerateListForOptimizationTask}
            onOpenPublishRecordsForOptimizationTask={onOpenPublishRecordsForOptimizationTask}
            onRewindWizardSideEffect={(wf, target) => {
              setReportTaskId(null);
              setOptMonitorTask(null);
              setMainView('wizard');
              if (target === 'brand_analysis') {
                setPhase('form');
                setCoreKeywordItems([]);
                setKeywordsAll([]);
                setBrandName(wf.brandName || '');
                setProductLine((wf.productName ?? '').trim());
              } else if (target === 'diagnosis') {
                setPhase('keywords');
                setBrandName(wf.brandName || '');
                setProductLine((wf.productName ?? '').trim());
                setCoreKeywordItems(coreKeywordsToItems(wf.coreKeywords));
              } else {
                setPhase('keywords');
                setBrandName(wf.brandName || '');
                setProductLine((wf.productName ?? '').trim());
                setCoreKeywordItems(coreKeywordsToItems(wf.coreKeywords));
              }
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

export default BrandParseWizard;
