import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { diagnosisReportAPI } from '../../../api/diagnosisReport';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../../../api/geoWorkflow';
import {
  optimizationTaskAPI,
  optimizationTaskHasRunningCycle,
  type OptimizationCycleDTO,
  type OptimizationTaskDTO,
} from '../../../api/optimizationTask';
import { ModuleType } from '../../../types';
import OptimizationTaskFormBlock from '../shared/OptimizationTaskFormBlock';
import KnowledgeAssetsSection from '../shared/KnowledgeAssetsSection';
import WordPackSection from '../shared/WordPackSection';
import { resolveArtifactReportTaskId } from '../../geoWorkflowShared';
import type { BrandIntakeConfig, SelectedBrand } from '../types';
import {
  flattenCoreKeywordsFromWorkflow,
  readCoreKeywordGroupsFromWorkflow,
  subjectCategoriesFromWorkflow,
} from '../types';
import { GEO_WORKFLOW_POLL_MS } from '../../../constants/brandParsePolling';
import { useModuleI18n } from '../../../i18n/hooks';
import { resolveDiagnosisRegionWords } from '../../../utils/coreKeywordGroups';

const CORAL_BTN = 'btn-geo-primary min-w-[120px] disabled:opacity-50 disabled:pointer-events-none';

/** 重跑诊断 / 撰文发布轮询（与主线详情轮询同源 30s） */
const RERUN_DIAG_POLL_MS = GEO_WORKFLOW_POLL_MS;
const RERUN_DIAG_MAX_POLLS = 120;

/** 覆盖最后一轮撰文+发布 */
const RERUN_ARTICLES_POLL_MS = GEO_WORKFLOW_POLL_MS;
const RERUN_ARTICLES_MAX_POLLS = 800;

/** GEO 主线产出卡片静默轮询 */
const OPT_DETAIL_POLL_MS = GEO_WORKFLOW_POLL_MS;

const OPT_TASK_ACTIVE_STATUSES = new Set(['running', 'pending', 'paused']);

function optimizationTaskNeedsDetailPoll(task: OptimizationTaskDTO | null): boolean {
  if (!task) return true;
  const st = (task.status || '').toLowerCase();
  if (OPT_TASK_ACTIVE_STATUSES.has(st)) return true;
  if (optimizationTaskHasRunningCycle(task)) return true;
  const latest = task.cycles?.[0];
  if (latest && cycleArticlesRunning(latest)) return true;
  if ((latest?.contentTaskIds?.length ?? 0) > 0 && !cycleHasArticleTasks(latest)) return true;
  const mp = latest?.cycleStepResults?.massPublish;
  for (const branch of [mp?.fanwen, mp?.fangxie]) {
    const bs = (branch?.status || '').toLowerCase();
    if (bs === 'waiting_content' || bs === 'ready_to_export') return true;
  }
  return false;
}

function cycleHasArticleTasks(cycle: OptimizationCycleDTO): boolean {
  if ((cycle.contentTaskIds?.length ?? 0) > 0) return true;
  const art = cycle.cycleStepResults?.articles;
  if (!art) return false;
  if ((art.taskIds?.length ?? 0) > 0) return true;
  for (const branch of [art.template, art.imitate, art.custom]) {
    if ((branch?.taskIds?.length ?? 0) > 0) return true;
    if ((branch?.count ?? 0) > 0) return true;
  }
  return false;
}

function cycleArticlesRunning(cycle: OptimizationCycleDTO): boolean {
  return (cycle.cycleStepResults?.articles?.status ?? '').toLowerCase() === 'running';
}

interface Props {
  brand: SelectedBrand;
  workflow: GeoWorkflowDTO;
  intake?: BrandIntakeConfig | null;
  onPatchIntake?: (patch: Partial<BrandIntakeConfig>) => void;
  onAdvanced: (wf: GeoWorkflowDTO) => void;
  onJumpModule?: (
    m: ModuleType,
    opts?: {
      workflowId?: string;
      reportId?: number;
      taskId?: string;
      contentGenerationTaskId?: string;
      reportTaskId?: string;
      brandName?: string;
      geoWizardBack?: boolean;
      returnTo?: ModuleType;
      backLabel?: string;
    }
  ) => void;
}

const IntelligentOptimizationStage: React.FC<Props> = ({
  brand,
  workflow,
  intake,
  onPatchIntake,
  onAdvanced,
  onJumpModule,
}) => {
  const { t } = useModuleI18n('optimization');
  const backToWorkbench = t('navigation.backToWorkbench');
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optTaskArtifact, setOptTaskArtifact] = useState<OptimizationTaskDTO | null>(null);
  const [optDetailLoading, setOptDetailLoading] = useState(false);
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [monitoringReportOpenBusy, setMonitoringReportOpenBusy] = useState(false);
  const [rerunDiagBusy, setRerunDiagBusy] = useState(false);
  const [rerunReportBusy, setRerunReportBusy] = useState(false);
  const [rerunArticlesBusy, setRerunArticlesBusy] = useState(false);
  const [optPollTick, setOptPollTick] = useState(0);
  const artifactSyncAttemptedRef = useRef(false);

  const [coreKeywords, setCoreKeywords] = useState<string[]>(() =>
    flattenCoreKeywordsFromWorkflow(workflow)
  );
  const [extractionTaskId, setExtractionTaskId] = useState<string | null>(
    workflow.extractionTaskId?.trim() || null
  );

  const finishWorkflow = async () => {
    setCompleting(true);
    setError(null);
    try {
      const wf = await geoWorkflowAPI.advance(workflow.workflowId, {
        completion_reason: 'manual_stop',
      });
      onAdvanced(wf);
    } catch (e: any) {
      setError(e?.message || t('stages.intelligentOptimization.finishFailed'));
    } finally {
      setCompleting(false);
    }
  };

  const loadOptimizationDetail = useCallback(
    async (opts?: { silent?: boolean }) => {
      const tid = workflow.optimizationTaskId?.trim();
      if (!tid) {
        setOptTaskArtifact(null);
        return null;
      }
      const silent = Boolean(opts?.silent);
      if (!silent) setOptDetailLoading(true);
      try {
        const t = await optimizationTaskAPI.get(tid);
        setOptTaskArtifact(t);
        return t;
      } catch {
        if (!silent) setOptTaskArtifact(null);
        return null;
      } finally {
        if (!silent) setOptDetailLoading(false);
      }
    },
    [workflow.optimizationTaskId]
  );

  const artifactReportTaskId = useMemo(
    () => resolveArtifactReportTaskId(workflow, optTaskArtifact),
    [workflow, optTaskArtifact]
  );

  const refreshWorkbenchArtifacts = useCallback(async () => {
    setOptDetailLoading(true);
    try {
      const [wf, t] = await Promise.all([
        geoWorkflowAPI.get(workflow.workflowId),
        workflow.optimizationTaskId?.trim()
          ? optimizationTaskAPI.get(workflow.optimizationTaskId.trim())
          : Promise.resolve(null),
      ]);
      onAdvanced(wf);
      if (t) setOptTaskArtifact(t);
    } catch {
      await loadOptimizationDetail();
    } finally {
      setOptDetailLoading(false);
    }
  }, [workflow.workflowId, workflow.optimizationTaskId, onAdvanced, loadOptimizationDetail]);

  useEffect(() => {
    artifactSyncAttemptedRef.current = false;
  }, [workflow.workflowId]);

  useEffect(() => {
    if (!artifactReportTaskId || workflow.artifactReportTaskId) return;
    if (artifactSyncAttemptedRef.current) return;
    artifactSyncAttemptedRef.current = true;
    void geoWorkflowAPI.get(workflow.workflowId).then(onAdvanced).catch(() => {
      artifactSyncAttemptedRef.current = false;
    });
  }, [artifactReportTaskId, workflow.artifactReportTaskId, workflow.workflowId, onAdvanced]);

  useEffect(() => {
    void loadOptimizationDetail();
  }, [loadOptimizationDetail]);

  const optDetailPollEnabled = useMemo(() => {
    const tid = workflow.optimizationTaskId?.trim();
    if (!tid) return false;
    if (rerunDiagBusy || rerunReportBusy || rerunArticlesBusy) return true;
    return optimizationTaskNeedsDetailPoll(optTaskArtifact);
  }, [
    workflow.optimizationTaskId,
    optTaskArtifact,
    rerunDiagBusy,
    rerunReportBusy,
    rerunArticlesBusy,
  ]);

  useEffect(() => {
    if (!optDetailPollEnabled) return;
    const timer = setInterval(() => setOptPollTick((x) => x + 1), OPT_DETAIL_POLL_MS);
    return () => clearInterval(timer);
  }, [optDetailPollEnabled]);

  useEffect(() => {
    if (!optDetailPollEnabled || optPollTick === 0) return;
    let cancelled = false;
    (async () => {
      await loadOptimizationDetail({ silent: true });
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [optDetailPollEnabled, optPollTick, loadOptimizationDetail]);

  useEffect(() => {
    if (optTaskArtifact?.coreKeywords?.length) {
      setCoreKeywords(optTaskArtifact.coreKeywords);
      setExtractionTaskId(optTaskArtifact.extractionTaskId?.trim() || workflow.extractionTaskId?.trim() || null);
    } else {
      setCoreKeywords(flattenCoreKeywordsFromWorkflow(workflow));
      setExtractionTaskId(workflow.extractionTaskId?.trim() || null);
    }
  }, [
    optTaskArtifact?.taskId,
    optTaskArtifact?.coreKeywords,
    optTaskArtifact?.extractionTaskId,
    workflow,
  ]);

  const optHasPublishRecords = useMemo(
    () =>
      (optTaskArtifact?.cycles ?? []).some(
        (c) => Array.isArray(c.publishRecordIds) && c.publishRecordIds.length > 0
      ),
    [optTaskArtifact]
  );

  const thirdPartyDomesticEnabled = Boolean(optTaskArtifact?.thirdPartyPublishEnabled);
  const thirdPartyOverseasEnabled = Boolean(optTaskArtifact?.overseasThirdPartyPublishEnabled);
  /** 未勾选三方/无出海发布记录时，发布情况无入口可追踪，不展示该行 */
  const showPublishSituation =
    thirdPartyDomesticEnabled || thirdPartyOverseasEnabled || optHasPublishRecords;

  const optHasArticleGeneration = useMemo(
    () => (optTaskArtifact?.cycles ?? []).some(cycleHasArticleTasks),
    [optTaskArtifact]
  );

  const optArticlesGenerating = useMemo(() => {
    const cycles = optTaskArtifact?.cycles ?? [];
    if (cycles.some(cycleHasArticleTasks)) return false;
    return cycles.some(cycleArticlesRunning);
  }, [optTaskArtifact]);

  const handleOpenArticleGenerationList = useCallback(() => {
    const optId = workflow.optimizationTaskId?.trim();
    if (!optId) return;
    onJumpModule?.(ModuleType.GENERATE, {
      taskId: optId,
      returnTo: ModuleType.OPTIMIZATION_WORKBENCH,
      backLabel: backToWorkbench,
    });
  }, [workflow.optimizationTaskId, onJumpModule]);

  const handleArchiveOptimization = useCallback(async () => {
    const tid = workflow.optimizationTaskId;
    if (!tid) return;
    if (
      !window.confirm(
        t('stages.intelligentOptimization.deleteCycleConfirm')
      )
    )
      return;
    setArchiveBusy(true);
    try {
      await optimizationTaskAPI.archive(tid);
      const wf = await geoWorkflowAPI.get(workflow.workflowId);
      onAdvanced(wf);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : t('stages.intelligentOptimization.deleteFailed'));
    } finally {
      setArchiveBusy(false);
    }
  }, [workflow.optimizationTaskId, workflow.workflowId, onAdvanced]);

  const handleRerunDiagnosisOnly = useCallback(async () => {
    const tid = workflow.optimizationTaskId?.trim();
    if (!tid) return;
    setRerunDiagBusy(true);
    try {
      const { celeryTaskId } = await optimizationTaskAPI.rerunDiagnosisOnly(tid);
      for (let i = 0; i < RERUN_DIAG_MAX_POLLS; i++) {
        const st = await optimizationTaskAPI.pollRerunDiagnosisOnly(tid, celeryTaskId);
        if (st.pending) {
          await new Promise((r) => setTimeout(r, RERUN_DIAG_POLL_MS));
          continue;
        }
        if (!st.ok) {
          alert((st.detail as string | undefined)?.trim() || t('stages.intelligentOptimization.rerunDiagnosisFailed'));
          return;
        }
        const wfNext = await geoWorkflowAPI.get(workflow.workflowId);
        onAdvanced(wfNext);
        await loadOptimizationDetail();
        alert(t('stages.intelligentOptimization.rerunDiagnosisDone'));
        return;
      }
      alert(t('stages.intelligentOptimization.rerunDiagnosisTimeout'));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setRerunDiagBusy(false);
    }
  }, [workflow.workflowId, workflow.optimizationTaskId, onAdvanced, loadOptimizationDetail]);

  const handleRerunReportOnly = useCallback(async () => {
    const tid = workflow.optimizationTaskId?.trim();
    if (!tid) return;
    setRerunReportBusy(true);
    try {
      const { celeryTaskId } = await optimizationTaskAPI.rerunReportOnly(tid);
      for (let i = 0; i < RERUN_DIAG_MAX_POLLS; i++) {
        const st = await optimizationTaskAPI.pollRerunReportOnly(tid, celeryTaskId);
        if (st.pending) {
          await new Promise((r) => setTimeout(r, RERUN_DIAG_POLL_MS));
          continue;
        }
        if (!st.ok) {
          alert((st.detail as string | undefined)?.trim() || t('stages.intelligentOptimization.rerunReportFailed'));
          return;
        }
        const wfNext = await geoWorkflowAPI.get(workflow.workflowId);
        onAdvanced(wfNext);
        await loadOptimizationDetail();
        alert(t('stages.intelligentOptimization.rerunReportDone'));
        return;
      }
      alert(t('stages.intelligentOptimization.rerunReportTimeout'));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setRerunReportBusy(false);
    }
  }, [workflow.workflowId, workflow.optimizationTaskId, onAdvanced, loadOptimizationDetail]);

  const handleRerunArticlesPublishLastCycle = useCallback(async () => {
    const tid = workflow.optimizationTaskId?.trim();
    if (!tid) return;
    setRerunArticlesBusy(true);
    try {
      const { celeryTaskId } = await optimizationTaskAPI.rerunArticlesPublishLastCycle(tid);
      for (let i = 0; i < RERUN_ARTICLES_MAX_POLLS; i++) {
        const st = await optimizationTaskAPI.pollRerunArticlesPublishLastCycle(tid, celeryTaskId);
        if (st.pending) {
          await new Promise((r) => setTimeout(r, RERUN_ARTICLES_POLL_MS));
          continue;
        }
        if (!st.ok) {
          alert((st.detail as string | undefined)?.trim() || t('stages.intelligentOptimization.rerunArticlesFailed'));
          return;
        }
        await loadOptimizationDetail();
        const ar = st.articlesStatus || '';
        const pu = st.publishStatus || '';
        if (ar === 'success') {
          alert(
            t('stages.intelligentOptimization.rerunArticlesDone', {
              articles: ar,
              publish: pu || '—',
            }),
          );
        } else {
          alert(
            t('stages.intelligentOptimization.rerunArticlesEnded', {
              articles: ar || '—',
              publish: pu || '—',
            }),
          );
        }
        return;
      }
      alert(t('stages.intelligentOptimization.rerunArticlesTimeout'));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setRerunArticlesBusy(false);
    }
  }, [workflow.optimizationTaskId, loadOptimizationDetail]);

  const openMonitoringDiagnosisReport = useCallback(async () => {
    const wf = workflow;
    setMonitoringReportOpenBusy(true);
    try {
      if (wf.monitoringBatchId) {
        const d = await diagnosisReportAPI.getByBatch(wf.monitoringBatchId);
        if (d?.taskId) {
          onJumpModule?.(ModuleType.DIAGNOSIS_REPORT, { reportTaskId: d.taskId });
          return;
        }
      }
      if (wf.monitoringLegacyTaskId) {
        const d = await diagnosisReportAPI.getByTask(wf.monitoringLegacyTaskId);
        if (d?.taskId) {
          onJumpModule?.(ModuleType.DIAGNOSIS_REPORT, { reportTaskId: d.taskId });
          return;
        }
      }
      if (wf.monitoringDiagnosisReportId != null && wf.monitoringDiagnosisReportId > 0) {
        const d = await diagnosisReportAPI.getById(wf.monitoringDiagnosisReportId);
        if (d?.taskId) {
          onJumpModule?.(ModuleType.DIAGNOSIS_REPORT, { reportTaskId: d.taskId });
        }
      }
    } catch {
      /* 忽略，按钮可重试 */
    } finally {
      setMonitoringReportOpenBusy(false);
    }
  }, [workflow, onJumpModule]);

  const optArtifactRowCls =
    'flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2';

  /** 工作台次级操作按钮（重跑 / 刷新） */
  const workbenchSecondaryHeaderBtnCls =
    'inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#111827] shadow-sm transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50';

  const showMonitoringReportBtn =
    (workflow.phase === 'monitoring' || workflow.phase === 'intelligent_optimization') &&
    Boolean(
      workflow.monitoringBatchId ||
        workflow.monitoringLegacyTaskId ||
        workflow.monitoringDiagnosisReportId != null
    );

  const diagnosisRegionWords = useMemo(
    () => resolveDiagnosisRegionWords(workflow, optTaskArtifact?.diagnosisRegionWords),
    [workflow, optTaskArtifact?.diagnosisRegionWords]
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4 px-2 py-2">
      <div id="workbench-word-pack-section">
      <WordPackSection
        brand={brand}
        workflow={workflow}
        intake={intake ?? null}
        keywords={coreKeywords}
        extractionTaskId={extractionTaskId}
        optimizationTaskId={workflow.optimizationTaskId ?? null}
        taskDiagnosisRegionWords={optTaskArtifact?.diagnosisRegionWords}
        defaultCollapsed
        onKeywordsChange={(kws, extId) => {
          setCoreKeywords(kws);
          setExtractionTaskId(extId);
        }}
        onWorkflowUpdated={onAdvanced}
        onTaskUpdated={() => void loadOptimizationDetail()}
      />
      </div>

      <KnowledgeAssetsSection
        brand={brand}
        workflow={workflow}
        enableKnowledgeGraph={Boolean(intake?.enableKnowledgeGraph)}
        onEnableKnowledgeGraphChange={(next) => onPatchIntake?.({ enableKnowledgeGraph: next })}
        defaultCollapsed
        onJumpModule={onJumpModule}
      />

      <OptimizationTaskFormBlock
        workflowId={workflow.workflowId}
        brandName={brand.name}
        defaultProductName={workflow.productName ?? null}
        coreKeywords={coreKeywords}
        coreKeywordGroups={readCoreKeywordGroupsFromWorkflow(workflow)}
        diagnosisRegionWords={diagnosisRegionWords}
        subjectCategories={subjectCategoriesFromWorkflow(workflow)}
        extractionTaskId={extractionTaskId}
        knowledgeBaseId={brand.knowledge_base_id ?? null}
        sourceDiagnosisReportId={workflow.diagnosisReportId ?? null}
        baselineVisibility={workflow.baselineVisibility ?? null}
        existingTaskId={workflow.optimizationTaskId ?? null}
        optimizationMarket={workflow.optimizationMarket}
        onTaskUpserted={(task, nextWf) => {
          if (nextWf) {
            onAdvanced(nextWf);
            return;
          }
          // 子组件 advance + get 都失败时的最终兜底：仅在确实新建了任务时再拉一次主线，
          // 避免 GEO 主线产出卡片要退出再进入才显示。
          if (task?.taskId && !workflow.optimizationTaskId) {
            geoWorkflowAPI
              .get(workflow.workflowId)
              .then((wf) => onAdvanced(wf))
              .catch(() => {
                /* 忽略：用户手动刷新仍可恢复 */
              });
          }
        }}
        onNavigateToSocialAccounts={() => onJumpModule?.(ModuleType.SOCIAL_MEDIA_ACCOUNTS)}
        onNavigateToDeployGuide={() => onJumpModule?.(ModuleType.INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE)}
      />

      {workflow.optimizationTaskId ? (
        <>
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-[#111827]">{t('stages.intelligentOptimization.artifactsTitle')}</h3>
                <p className="mt-1 text-xs text-[#64748b]">
                  {t('stages.intelligentOptimization.artifactsHint')}
                </p>
                <p className="mt-2 text-[11px] leading-snug text-[#64748b]">
                  {t('stages.intelligentOptimization.artifactsDetail')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={
                    rerunDiagBusy ||
                    rerunReportBusy ||
                    rerunArticlesBusy ||
                    optDetailLoading ||
                    archiveBusy ||
                    !workflow.optimizationTaskId?.trim()
                  }
                  className={workbenchSecondaryHeaderBtnCls}
                  onClick={() => void handleRerunDiagnosisOnly()}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${rerunDiagBusy ? 'animate-spin' : ''}`} aria-hidden />
                  {rerunDiagBusy ? t('stages.intelligentOptimization.rerunningDiagnosis') : t('stages.intelligentOptimization.rerunDiagnosis')}
                </button>
                <button
                  type="button"
                  disabled={
                    rerunDiagBusy ||
                    rerunReportBusy ||
                    rerunArticlesBusy ||
                    optDetailLoading ||
                    archiveBusy ||
                    !workflow.optimizationTaskId?.trim() ||
                    !artifactReportTaskId
                  }
                  className={workbenchSecondaryHeaderBtnCls}
                  onClick={() => void handleRerunReportOnly()}
                  title={t('stages.intelligentOptimization.rerunReportTitle')}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${rerunReportBusy ? 'animate-spin' : ''}`} aria-hidden />
                  {rerunReportBusy ? t('stages.intelligentOptimization.rerunningReport') : t('stages.intelligentOptimization.rerunReport')}
                </button>
                {(optTaskArtifact?.totalCyclesRun ?? 0) >= 1 ? (
                  <button
                    type="button"
                    disabled={
                      rerunArticlesBusy ||
                      rerunDiagBusy ||
                      rerunReportBusy ||
                      optDetailLoading ||
                      archiveBusy ||
                      !workflow.optimizationTaskId?.trim()
                    }
                    className={workbenchSecondaryHeaderBtnCls}
                    onClick={() => void handleRerunArticlesPublishLastCycle()}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${rerunArticlesBusy ? 'animate-spin' : ''}`}
                      aria-hidden
                    />
                    {rerunArticlesBusy ? t('stages.intelligentOptimization.rerunningArticles') : t('stages.intelligentOptimization.rerunArticles')}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={optDetailLoading || rerunArticlesBusy}
                  onClick={() => void refreshWorkbenchArtifacts()}
                  className={workbenchSecondaryHeaderBtnCls}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${optDetailLoading ? 'animate-spin' : ''}`} aria-hidden />
                  {t('stages.intelligentOptimization.refresh')}
                </button>
              </div>
            </div>

            {optDetailLoading && !optTaskArtifact ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t('stages.intelligentOptimization.loadingTaskDetail')}
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
            <div className={optArtifactRowCls}>
              <span className="shrink-0 font-medium text-[#111827]">{t('stages.intelligentOptimization.optimizationTaskId')}</span>
              <div className="flex min-w-0 flex-1 flex-col items-end gap-1.5 text-xs sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                <span className="max-w-full break-all text-right font-mono text-slate-700">
                  {workflow.optimizationTaskId}
                </span>
                <button
                  type="button"
                  disabled={archiveBusy}
                  onClick={() => void handleArchiveOptimization()}
                  className="inline-flex shrink-0 items-center gap-1 font-semibold text-red-600 underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-40"
                >
                  {archiveBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {t('stages.intelligentOptimization.delete')}
                </button>
              </div>
            </div>

            <div className={optArtifactRowCls}>
              <span className="font-medium text-[#111827]">{t('stages.intelligentOptimization.analysisReport')}</span>
              <span className="text-right text-xs">
                {artifactReportTaskId ? (
                  <button
                    type="button"
                    className="font-semibold text-[#E8553F] underline-offset-2 hover:underline"
                    onClick={() =>
                      onJumpModule?.(ModuleType.DIAGNOSIS_REPORT, {
                        reportTaskId: artifactReportTaskId,
                      })
                    }
                  >
                    {t('stages.intelligentOptimization.view')}
                  </button>
                ) : (
                  <span className="text-slate-500">{t('stages.intelligentOptimization.notGenerated')}</span>
                )}
              </span>
            </div>

            <div className={optArtifactRowCls}>
              <span className="font-medium text-[#111827]">{t('stages.intelligentOptimization.analysisDetail')}</span>
              <span className="text-right text-xs">
                {artifactReportTaskId ? (
                  <button
                    type="button"
                    className="font-semibold text-[#E8553F] underline-offset-2 hover:underline"
                    onClick={() =>
                      onJumpModule?.(ModuleType.DATA_SCREEN, {
                        taskId: artifactReportTaskId,
                        geoWizardBack: true,
                        returnTo: ModuleType.OPTIMIZATION_WORKBENCH,
                        backLabel: backToWorkbench,
                      })
                    }
                  >
                    {t('stages.intelligentOptimization.view')}
                  </button>
                ) : (
                  <span className="text-slate-500">{t('stages.intelligentOptimization.notGenerated')}</span>
                )}
              </span>
            </div>

            <div className={optArtifactRowCls}>
              <span className="font-medium text-[#111827]">{t('stages.intelligentOptimization.articleGeneration')}</span>
              <span className="text-right text-xs">
                {optHasArticleGeneration ? (
                  <button
                    type="button"
                    className="font-semibold text-[#E8553F] underline-offset-2 hover:underline"
                    onClick={handleOpenArticleGenerationList}
                  >
                    {t('stages.intelligentOptimization.view')}
                  </button>
                ) : optArticlesGenerating ? (
                  <span className="inline-flex items-center gap-1 text-orange-700">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t('stages.intelligentOptimization.generating')}
                  </span>
                ) : (
                  <span className="text-slate-500">{t('stages.intelligentOptimization.notGenerated')}</span>
                )}
              </span>
            </div>

            {showPublishSituation ? (
              <div className={optArtifactRowCls}>
                <span className="font-medium text-[#111827]">{t('stages.intelligentOptimization.publishSituation')}</span>
                <span className="flex flex-col items-end gap-1 text-right text-xs">
                  {thirdPartyDomesticEnabled ? (
                    <button
                      type="button"
                      className="font-semibold text-[#E8553F] underline-offset-2 hover:underline"
                      title={t('stages.intelligentOptimization.thirdPartyPublishTitle')}
                      onClick={() => onJumpModule?.(ModuleType.THIRD_PARTY_PUBLISH)}
                    >
                      {t('stages.intelligentOptimization.view')}
                    </button>
                  ) : null}
                  {workflow.optimizationTaskId && optHasPublishRecords ? (
                    <button
                      type="button"
                      className="font-semibold text-[#E8553F] underline-offset-2 hover:underline"
                      title={t('stages.intelligentOptimization.publishRecordsTitle')}
                      onClick={() =>
                        onJumpModule?.(ModuleType.PUBLISH_RECORDS, {
                          taskId: workflow.optimizationTaskId!,
                        })
                      }
                    >
                      {t('stages.intelligentOptimization.view')}
                    </button>
                  ) : null}
                  {thirdPartyOverseasEnabled ? (
                    <button
                      type="button"
                      className="font-semibold text-[#E8553F] underline-offset-2 hover:underline"
                      title={t('stages.intelligentOptimization.overseasThirdPartyTitle')}
                      onClick={() => onJumpModule?.(ModuleType.OVERSEAS_THIRD_PARTY_PUBLISH)}
                    >
                      {t('stages.intelligentOptimization.view')}
                    </button>
                  ) : null}
                </span>
              </div>
            ) : null}
          </div>

          {!optTaskArtifact && workflow.optimizationTaskId && !optDetailLoading ? (
            <p className="mt-3 text-xs text-amber-600">
              {t('stages.intelligentOptimization.loadTaskDetailFailed')}
            </p>
          ) : null}

          {showMonitoringReportBtn ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={monitoringReportOpenBusy}
                onClick={() => void openMonitoringDiagnosisReport()}
                className={CORAL_BTN + ' w-full sm:w-auto'}
              >
                {monitoringReportOpenBusy ? (
                  <>
                    <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
                    {t('stages.intelligentOptimization.opening')}
                  </>
                ) : (
                  t('stages.intelligentOptimization.viewMonitoringReport')
                )}
              </button>
              <p className="mt-2 text-[11px] leading-snug text-slate-500">
                {t('stages.intelligentOptimization.monitoringReportHint')}
              </p>
            </div>
          ) : null}
        </div>
        </>
      ) : null}

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      )}

      {workflow.optimizationTaskId &&
        workflow.phase !== 'completion' &&
        workflow.phase !== 'completed' && (
          <div className="flex justify-end rounded-2xl border border-gray-200 bg-white p-5">
            <button
              type="button"
              onClick={finishWorkflow}
              disabled={completing}
              className="btn-geo-primary"
            >
              {completing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('stages.intelligentOptimization.finishing')}
                </>
              ) : (
                <>
                  {t('stages.intelligentOptimization.manualFinish')}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        )}
    </div>
  );
};

export default IntelligentOptimizationStage;
