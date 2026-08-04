import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../api/geoWorkflow';
import { semanticSEOAPI } from '../api/semanticSeo';
import { diagnosisReportAPI } from '../api/diagnosisReport';
import {
  optimizationTaskAPI,
  type OptimizationTaskDTO,
  type OptimizationStartPayload,
} from '../api/optimizationTask';
import {
  PIPELINE_STEPS,
  artifactStepToRewindTarget,
  formatCompletionReason,
  geoWorkflowListPhaseLabel,
  getPipelineNodeVisual,
} from './geoWorkflowShared';
import { BRAND_PARSE_MAX_POLLS, BRAND_PARSE_POLL_MS } from '../constants/brandParsePolling';
import { formatWorkflowPlatformCoverage } from './StartOptimization/shared/platformLabels';

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

export interface GeoWorkflowArtifactModalProps {
  isDark: boolean;
  workflowId: string;
  workflowDetail: GeoWorkflowDTO;
  artifactStep: number;
  brandNameHint?: string;
  onClose: () => void;
  onWorkflowUpdated: (wf: GeoWorkflowDTO) => void;
  onListRefresh: () => Promise<void>;
  onOpenDiagnosisReport: (reportTaskId: string, options?: { showOptimizeButton?: boolean }) => void;
  /** 打开分析明细（全量快照）；仅优化机器人等入口传入 */
  onOpenDataScreenAll?: (brandId: string, options?: { geoWizardBack?: boolean }) => void;
  /** 侧栏「内容生成」并按优化任务批次过滤 */
  onOpenGenerateListForOptimizationTask?: (optimizationTaskId: string) => void;
  /** 侧栏「自媒体发布」并按优化任务过滤 */
  onOpenPublishRecordsForOptimizationTask?: (optimizationTaskId: string) => void;
  onOptimizationEdit: (taskId: string) => void;
  onOptimizationCreate: (payload: OptimizationStartPayload) => void;
  /** 仅快速开始向导：回退成功后回调（同步阶段/表单） */
  onRewindWizardSideEffect?: (
    wf: GeoWorkflowDTO,
    target: 'brand_analysis' | 'diagnosis' | 'monitoring'
  ) => void;
  /** 仅快速开始：节点 3「分析明细」顶栏与返回快速开始对齐（优化任务等侧栏入口勿开） */
  geoQuickStartDataScreenBack?: boolean;
}

const CORAL_BTN = 'btn-geo-primary min-w-[120px] disabled:opacity-50 disabled:pointer-events-none';

const GeoWorkflowArtifactModal: React.FC<GeoWorkflowArtifactModalProps> = ({
  isDark,
  workflowId,
  workflowDetail,
  artifactStep,
  brandNameHint,
  onClose,
  onWorkflowUpdated,
  onListRefresh,
  onOpenDiagnosisReport,
  onOpenDataScreenAll,
  onOpenGenerateListForOptimizationTask,
  onOpenPublishRecordsForOptimizationTask,
  onOptimizationEdit,
  onOptimizationCreate,
  onRewindWizardSideEffect,
  geoQuickStartDataScreenBack = false,
}) => {
  const pollAbortRef = useRef(false);
  const [optTaskArtifact, setOptTaskArtifact] = useState<OptimizationTaskDTO | null>(null);
  const [optDetailLoading, setOptDetailLoading] = useState(false);
  const [rewindBusy, setRewindBusy] = useState(false);
  const [completeWorkflowBusy, setCompleteWorkflowBusy] = useState(false);
  const [kbSupplementOpen, setKbSupplementOpen] = useState(false);
  const [kgSupplementOpen, setKgSupplementOpen] = useState(false);
  const [kbSuppFiles, setKbSuppFiles] = useState<File[]>([]);
  const [kgSuppKeyword, setKgSuppKeyword] = useState('');
  const [supplementBusy, setSupplementBusy] = useState(false);
  const [supplementKbError, setSupplementKbError] = useState<string | null>(null);
  const [supplementKgError, setSupplementKgError] = useState<string | null>(null);
  const [monitoringReportOpenBusy, setMonitoringReportOpenBusy] = useState(false);
  const [archiveOptBusy, setArchiveOptBusy] = useState(false);
  const [workflowDeleteBusy, setWorkflowDeleteBusy] = useState(false);
  const kbSuppInputRef = useRef<HTMLInputElement>(null);

  const openMonitoringDiagnosisReport = useCallback(async () => {
    const wf = workflowDetail;
    if (!wf) return;
    setMonitoringReportOpenBusy(true);
    try {
      if (wf.monitoringBatchId) {
        const d = await diagnosisReportAPI.getByBatch(wf.monitoringBatchId);
        if (d?.taskId) {
          onOpenDiagnosisReport(d.taskId);
          return;
        }
      }
      if (wf.monitoringLegacyTaskId) {
        const d = await diagnosisReportAPI.getByTask(wf.monitoringLegacyTaskId);
        if (d?.taskId) {
          onOpenDiagnosisReport(d.taskId);
          return;
        }
      }
      if (wf.monitoringDiagnosisReportId != null && wf.monitoringDiagnosisReportId > 0) {
        const d = await diagnosisReportAPI.getById(wf.monitoringDiagnosisReportId);
        if (d?.taskId) {
          onOpenDiagnosisReport(d.taskId);
        }
      }
    } catch {
      /* 忽略，按钮可重试 */
    } finally {
      setMonitoringReportOpenBusy(false);
    }
  }, [workflowDetail, onOpenDiagnosisReport]);

  const handleArchiveOptimization = useCallback(async () => {
    const tid = workflowDetail.optimizationTaskId;
    if (!tid) return;
    if (
      !confirm(
        '确定移除该周期任务？将停止定时执行；列表中不再显示，GEO 主线将解除关联（数据仍保留在库中）。',
      )
    )
      return;
    setArchiveOptBusy(true);
    try {
      await optimizationTaskAPI.archive(tid);
      await onListRefresh();
      const wf = await geoWorkflowAPI.get(workflowId);
      onWorkflowUpdated(wf);
    } catch {
      /* 忽略，可重试 */
    } finally {
      setArchiveOptBusy(false);
    }
  }, [workflowDetail.optimizationTaskId, workflowId, onListRefresh, onWorkflowUpdated]);

  useEffect(() => {
    pollAbortRef.current = false;
    return () => {
      pollAbortRef.current = true;
    };
  }, []);

  const loadOptimizationArtifactDetail = useCallback(async () => {
    const tid = workflowDetail.optimizationTaskId?.trim();
    if (!tid) {
      setOptTaskArtifact(null);
      return;
    }
    setOptDetailLoading(true);
    try {
      const t = await optimizationTaskAPI.get(tid);
      setOptTaskArtifact(t);
    } catch {
      setOptTaskArtifact(null);
    } finally {
      setOptDetailLoading(false);
    }
  }, [workflowDetail.optimizationTaskId]);

  useEffect(() => {
    if (artifactStep !== 2 || !workflowDetail?.optimizationTaskId?.trim()) {
      setOptTaskArtifact(null);
      setOptDetailLoading(false);
      return;
    }
    void loadOptimizationArtifactDetail();
  }, [artifactStep, workflowDetail.optimizationTaskId, loadOptimizationArtifactDetail]);

  const optHasContentTasks = useMemo(
    () =>
      (optTaskArtifact?.cycles ?? []).some(
        (c) => Array.isArray(c.contentTaskIds) && c.contentTaskIds.length > 0,
      ),
    [optTaskArtifact],
  );

  const optHasPublishRecords = useMemo(
    () =>
      (optTaskArtifact?.cycles ?? []).some(
        (c) => Array.isArray(c.publishRecordIds) && c.publishRecordIds.length > 0,
      ),
    [optTaskArtifact],
  );

  const pollSeoUntilDone = useCallback(async (taskId: string) => {
    for (let i = 0; i < MAX_POLLS; i++) {
      if (pollAbortRef.current) {
        throw new Error(ABORT_POLL_MSG);
      }
      const detail = await semanticSEOAPI.getTask(taskId);
      const st = normalizeSeoTaskStatus(detail?.task?.status);
      if (isSeoTaskSuccess(st)) return;
      if (isSeoTaskFailed(st)) {
        throw new Error('知识图谱生成失败，请稍后重试或联系管理员');
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    throw new Error('知识图谱生成超时，请稍后在侧栏「知识图谱」中查看任务状态');
  }, []);

  const submitKbSupplement = async () => {
    if (!workflowId || kbSuppFiles.length === 0) {
      setSupplementKbError('请至少选择一个文件');
      return;
    }
    setSupplementBusy(true);
    setSupplementKbError(null);
    try {
      await geoWorkflowAPI.supplementKnowledgeBase(workflowId, kbSuppFiles);
      setKbSupplementOpen(false);
      setKbSuppFiles([]);
      const d = await geoWorkflowAPI.get(workflowId);
      onWorkflowUpdated(d);
      await onListRefresh();
    } catch (e: unknown) {
      setSupplementKbError(e instanceof Error ? e.message : String(e));
    } finally {
      setSupplementBusy(false);
    }
  };

  const submitKgSupplement = async () => {
    setSupplementBusy(true);
    setSupplementKgError(null);
    try {
      const wf = await geoWorkflowAPI.supplementKnowledgeGraph(workflowId, {
        keyword: kgSuppKeyword.trim() || undefined,
      });
      const tid = wf.semanticSeoTaskId;
      if (tid) {
        await pollSeoUntilDone(tid);
      }
      setKgSupplementOpen(false);
      const d = await geoWorkflowAPI.get(workflowId);
      onWorkflowUpdated(d);
      await onListRefresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === ABORT_POLL_MSG) {
        setKgSupplementOpen(false);
        return;
      }
      setSupplementKgError(msg);
    } finally {
      setSupplementBusy(false);
    }
  };

  const handleRewindArtifactStage = async () => {
    const target = artifactStepToRewindTarget(artifactStep);
    if (!target) return;
    setRewindBusy(true);
    try {
      const wf = await geoWorkflowAPI.rewind(workflowId, target);
      onWorkflowUpdated(wf);
      await onListRefresh();
      onClose();
      onRewindWizardSideEffect?.(wf, target);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setRewindBusy(false);
    }
  };

  const handleMarkWorkflowComplete = async () => {
    if (!window.confirm('确定将当前主线标为已完成？完成后将无法再推进各阶段。')) return;
    setCompleteWorkflowBusy(true);
    try {
      const wf = await geoWorkflowAPI.stop(workflowId);
      onWorkflowUpdated(wf);
      await onListRefresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setCompleteWorkflowBusy(false);
    }
  };

  const titleCls = isDark ? 'text-lg font-semibold text-white sm:text-xl' : 'text-lg font-semibold text-[#111827] sm:text-xl';
  const subCls = isDark ? 'mt-1 text-sm text-zinc-400' : 'mt-1 text-sm text-[#64748b]';
  /** 智能优化节点：各能力行（任务 ID / 报告 / 明细 / 内容 / 发布）统一卡片 */
  const optArtifactRowCls =
    'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ' +
    (isDark ? 'border-slate-600/80 bg-slate-800/30' : 'border-slate-100 bg-white');
  const brandForKg = (workflowDetail.brandName || brandNameHint || '').trim();

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <button type="button" className="absolute inset-0 bg-black/50" aria-label="关闭" onClick={onClose} />
        <div
          className={
            'relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-5 shadow-2xl ' +
            (isDark ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-white')
          }
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <h3 className={titleCls}>{PIPELINE_STEPS[artifactStep]?.label} · 产出物</h3>
            <button
              type="button"
              className={`rounded-lg px-2 py-1 text-sm ${isDark ? 'text-zinc-400 hover:bg-white/10' : 'text-slate-500 hover:bg-slate-100'}`}
              onClick={onClose}
            >
              关闭
            </button>
          </div>
          {formatWorkflowPlatformCoverage(
            workflowDetail.aiPlatforms,
            workflowDetail.overseasAiPlatforms
          ) ? (
            <p className={`mb-3 text-xs ${subCls}`}>
              诊断覆盖{' '}
              {formatWorkflowPlatformCoverage(
                workflowDetail.aiPlatforms,
                workflowDetail.overseasAiPlatforms
              )}
            </p>
          ) : null}

          {artifactStep === 3 ? (
            <div className={`space-y-3 text-sm ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
              <p className={subCls}>主线结束与验收结论</p>
              {workflowDetail.phase === 'completed' || workflowDetail.phase === 'completion' ? (
                <dl className="space-y-2">
                  <div>
                    <dt className={isDark ? 'text-xs text-zinc-500' : 'text-xs text-slate-500'}>结束原因</dt>
                    <dd className="font-medium text-[#111827] dark:text-white">
                      {formatCompletionReason(workflowDetail.completionReason)}
                    </dd>
                  </div>
                  <div>
                    <dt className={isDark ? 'text-xs text-zinc-500' : 'text-xs text-slate-500'}>达标 / 结束时间</dt>
                    <dd>
                      {workflowDetail.acceptedAt
                        ? new Date(workflowDetail.acceptedAt).toLocaleString('zh-CN')
                        : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className={isDark ? 'text-xs text-zinc-500' : 'text-xs text-slate-500'}>备注 / 错误</dt>
                    <dd className="break-words">{workflowDetail.errorMessage ?? '—'}</dd>
                  </div>
                  <div className={`mt-3 rounded-lg border px-3 py-2 ${isDark ? 'border-red-900/50 bg-red-950/30' : 'border-red-100 bg-red-50/80'}`}>
                    <p className={`text-xs font-medium ${isDark ? 'text-red-300' : 'text-red-800'}`}>删除工作流</p>
                    <p className={`mt-1 text-[11px] ${isDark ? 'text-red-200/80' : 'text-red-700/90'}`}>
                      删除后将从列表移除且本产品内无法恢复。
                    </p>
                    <button
                      type="button"
                      disabled={workflowDeleteBusy}
                      className={`mt-2 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                        isDark
                          ? 'border-red-700 bg-red-900/40 text-red-200 hover:bg-red-900/60'
                          : 'border-red-200 bg-white text-red-700 hover:bg-red-50'
                      }`}
                      onClick={() => {
                        if (
                          !window.confirm(
                            '确定删除此工作流？删除后无法在本系统中恢复（逻辑删除）。'
                          )
                        )
                          return;
                        setWorkflowDeleteBusy(true);
                        void (async () => {
                          try {
                            await geoWorkflowAPI.deleteWorkflow(workflowId);
                            await onListRefresh();
                            onClose();
                          } catch (err: unknown) {
                            alert(err instanceof Error ? err.message : String(err));
                          } finally {
                            setWorkflowDeleteBusy(false);
                          }
                        })();
                      }}
                    >
                      {workflowDeleteBusy ? '删除中…' : '删除'}
                    </button>
                  </div>
                </dl>
              ) : (
                <p className="text-sm leading-relaxed">
                  当前主线尚未结束（阶段：{geoWorkflowListPhaseLabel(workflowDetail)}）。可在下方将主线直接标为「已完成」，用于提前结案或收尾。
                </p>
              )}
            </div>
          ) : getPipelineNodeVisual(workflowDetail, artifactStep) === 'pending' && artifactStep !== 2 ? (
            <p className={subCls}>该阶段尚未推进，暂无产出记录。</p>
          ) : artifactStep === 0 ? (
            <div className={`space-y-3 text-sm ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
              <p className={subCls}>解析品牌阶段：词包与知识库相关引用。</p>
              <dl className="space-y-2">
                <div>
                  <dt className={isDark ? 'text-xs text-zinc-500' : 'text-xs text-slate-500'}>知识库 ID</dt>
                  <dd className="flex flex-wrap items-center gap-2 text-xs break-all">
                    {workflowDetail.knowledgeBaseId != null ? (
                      <span className="font-mono">{workflowDetail.knowledgeBaseId}</span>
                    ) : (
                      <>
                        <span className="font-medium text-red-500 dark:text-red-400">未配置</span>
                        <button
                          type="button"
                          disabled={supplementBusy}
                          className={`text-xs font-semibold underline underline-offset-2 ${isDark ? 'text-sky-400 hover:text-sky-300' : 'text-blue-600 hover:text-blue-700'}`}
                          onClick={() => {
                            setSupplementKbError(null);
                            setKbSuppFiles([]);
                            setKbSupplementOpen(true);
                          }}
                        >
                          配置
                        </button>
                      </>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className={isDark ? 'text-xs text-zinc-500' : 'text-xs text-slate-500'}>知识图谱任务 ID</dt>
                  <dd className="flex flex-wrap items-center gap-2 text-xs break-all">
                    {workflowDetail.semanticSeoTaskId != null && String(workflowDetail.semanticSeoTaskId).trim() !== '' ? (
                      <span className="font-mono">{workflowDetail.semanticSeoTaskId}</span>
                    ) : (
                      <>
                        <span className="font-medium text-red-500 dark:text-red-400">未配置</span>
                        <button
                          type="button"
                          disabled={supplementBusy || workflowDetail.knowledgeBaseId == null}
                          title={workflowDetail.knowledgeBaseId == null ? '请先配置知识库' : undefined}
                          className={`text-xs font-semibold underline underline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${isDark ? 'text-sky-400 hover:text-sky-300' : 'text-blue-600 hover:text-blue-700'}`}
                          onClick={() => {
                            setSupplementKgError(null);
                            setKgSuppKeyword(brandForKg);
                            setKgSupplementOpen(true);
                          }}
                        >
                          配置
                        </button>
                      </>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className={isDark ? 'text-xs text-zinc-500' : 'text-xs text-slate-500'}>词包提取任务 ID</dt>
                  <dd className="font-mono text-xs break-all">{workflowDetail.extractionTaskId ?? '—'}</dd>
                </div>
                <div>
                  <dt className={isDark ? 'text-xs text-zinc-500' : 'text-xs text-slate-500'}>核心词</dt>
                  <dd className="mt-1 break-words">
                    {(workflowDetail.coreKeywords && workflowDetail.coreKeywords.length > 0
                      ? workflowDetail.coreKeywords
                      : []
                    ).join('、') || '—'}
                  </dd>
                </div>
              </dl>
            </div>
          ) : artifactStep === 1 ? (
            <div className={`space-y-4 text-sm ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
              <p className={subCls}>现状分析阶段：诊断报告与基线可见度。</p>
              <dl className="space-y-2">
                <div>
                  <dt className={isDark ? 'text-xs text-zinc-500' : 'text-xs text-slate-500'}>诊断报告 ID</dt>
                  <dd className="font-mono text-xs">{workflowDetail.diagnosisReportId ?? '—'}</dd>
                </div>
                <div>
                  <dt className={isDark ? 'text-xs text-zinc-500' : 'text-xs text-slate-500'}>基线可见度</dt>
                  <dd className="text-sm">
                    {workflowDetail.baselineVisibility != null ? `${workflowDetail.baselineVisibility}%` : '—'}
                  </dd>
                </div>
              </dl>
              {workflowDetail.diagnosisReportTaskId ? (
                <button
                  type="button"
                  className={`${CORAL_BTN} w-full sm:w-auto`}
                  onClick={() => {
                    onOpenDiagnosisReport(workflowDetail.diagnosisReportTaskId!, { showOptimizeButton: true });
                  }}
                >
                  查看完整诊断报告
                </button>
              ) : workflowDetail.diagnosisReportId ? (
                <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                  报告已关联，暂无可打开的 taskId（请刷新主线或联系管理员）。
                </p>
              ) : null}
            </div>
          ) : artifactStep === 2 ? (
            <div className={`space-y-3 text-sm ${isDark ? 'text-zinc-200' : 'text-slate-800'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className={`${subCls} mb-0 min-w-0 flex-1`}>智能优化阶段：自动优化任务与轮次结果。</p>
                {workflowDetail.optimizationTaskId?.trim() ? (
                  <button
                    type="button"
                    disabled={optDetailLoading}
                    onClick={() => void loadOptimizationArtifactDetail()}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:pointer-events-none disabled:opacity-50 ${
                      isDark ? 'border-slate-600 text-zinc-200 hover:bg-white/10' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${optDetailLoading ? 'animate-spin' : ''}`} aria-hidden />
                    刷新
                  </button>
                ) : null}
              </div>
              {optDetailLoading && !optTaskArtifact ? (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> 加载任务详情…
                </div>
              ) : null}

              <div className="space-y-2">
                <div className={optArtifactRowCls}>
                  <span className="shrink-0 font-medium">优化任务 ID</span>
                  <div className="flex min-w-0 flex-1 flex-col items-end gap-1.5 text-xs sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                    <span
                      className={
                        workflowDetail.optimizationTaskId
                          ? `max-w-full text-right font-mono break-all ${isDark ? 'text-zinc-300' : 'text-slate-700'}`
                          : isDark
                            ? 'text-zinc-500'
                            : 'text-slate-500'
                      }
                    >
                      {workflowDetail.optimizationTaskId ?? '暂无'}
                    </span>
                    {workflowDetail.optimizationTaskId ? (
                      <button
                        type="button"
                        disabled={rewindBusy || archiveOptBusy}
                        onClick={() => void handleArchiveOptimization()}
                        className="inline-flex shrink-0 items-center gap-1 font-semibold text-red-600 underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-40"
                      >
                        {archiveOptBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        )}
                        删除
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className={optArtifactRowCls}>
                  <span className="font-medium">分析报告</span>
                  <span className="text-right text-xs">
                    {workflowDetail.artifactReportTaskId ? (
                      <button
                        type="button"
                        className="font-semibold text-[#E8553F] underline-offset-2 hover:underline"
                        onClick={() =>
                          onOpenDiagnosisReport(workflowDetail.artifactReportTaskId!, { showOptimizeButton: false })
                        }
                      >
                        查看
                      </button>
                    ) : (
                      <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>暂未生成</span>
                    )}
                  </span>
                </div>
                <div className={optArtifactRowCls}>
                  <span className="font-medium">分析明细</span>
                  <span className="text-right text-xs">
                    {workflowDetail.brandName?.trim() && onOpenDataScreenAll ? (
                      <button
                        type="button"
                        className="font-semibold text-[#E8553F] underline-offset-2 hover:underline"
                        onClick={() =>
                          onOpenDataScreenAll(workflowDetail.brandName!.trim(), {
                            geoWizardBack: geoQuickStartDataScreenBack === true,
                          })
                        }
                      >
                        查看
                      </button>
                    ) : (
                      <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>暂未生成</span>
                    )}
                  </span>
                </div>
                <div className={optArtifactRowCls}>
                  <span className="font-medium">内容是否生成</span>
                  <span className="text-right text-xs">
                    {workflowDetail.optimizationTaskId && onOpenGenerateListForOptimizationTask ? (
                      optHasContentTasks ? (
                        <button
                          type="button"
                          className="font-semibold text-[#E8553F] underline-offset-2 hover:underline"
                          onClick={() => {
                            onClose();
                            onOpenGenerateListForOptimizationTask(workflowDetail.optimizationTaskId!);
                          }}
                        >
                          进入内容生成
                        </button>
                      ) : (
                        <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>暂未生成</span>
                      )
                    ) : (
                      <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>暂未生成</span>
                    )}
                  </span>
                </div>
                <div className={optArtifactRowCls}>
                  <span className="font-medium">发布情况</span>
                  <span className="text-right text-xs">
                    {workflowDetail.optimizationTaskId && onOpenPublishRecordsForOptimizationTask ? (
                      optHasPublishRecords ? (
                        <button
                          type="button"
                          className="font-semibold text-[#E8553F] underline-offset-2 hover:underline"
                          onClick={() => {
                            onClose();
                            onOpenPublishRecordsForOptimizationTask(workflowDetail.optimizationTaskId!);
                          }}
                        >
                          进入自媒体发布
                        </button>
                      ) : (
                        <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>暂未生成</span>
                      )
                    ) : (
                      <span className={isDark ? 'text-zinc-500' : 'text-slate-500'}>暂未生成</span>
                    )}
                  </span>
                </div>
              </div>

              {(workflowDetail.phase === 'monitoring' || workflowDetail.phase === 'intelligent_optimization') &&
              (workflowDetail.monitoringBatchId ||
                workflowDetail.monitoringLegacyTaskId ||
                workflowDetail.monitoringDiagnosisReportId != null) ? (
                <div className="mt-1">
                  <button
                    type="button"
                    disabled={monitoringReportOpenBusy}
                    onClick={() => void openMonitoringDiagnosisReport()}
                    className={CORAL_BTN + ' w-full sm:w-auto'}
                  >
                    {monitoringReportOpenBusy ? (
                      <>
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
                        打开中…
                      </>
                    ) : (
                      '查看监控最新诊断报告'
                    )}
                  </button>
                  <p className={`mt-2 text-[11px] leading-snug ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>
                    与现状分析同源（BrandStats 聚合写入 diagnosis_reports）。请先在 advance 中传入{' '}
                    <code className="rounded bg-black/10 px-1">monitoring_batch_id</code> 关联批次。
                  </p>
                </div>
              ) : null}
              {!optTaskArtifact && workflowDetail.optimizationTaskId && !optDetailLoading ? (
                <p className="text-xs text-amber-600">无法加载任务详情，请稍后在「优化任务」中查看。</p>
              ) : null}
            </div>
          ) : null}

          {(() => {
            if (artifactStep === 2) {
              const hasOpt = !!workflowDetail.optimizationTaskId;
              const canCreate = !!workflowDetail.diagnosisReportId;
              return (
                <div className={'mt-5 flex flex-col gap-3 border-t pt-4 ' + (isDark ? 'border-slate-600' : 'border-slate-200')}>
                  <div className="flex flex-wrap gap-2">
                    {hasOpt ? (
                      <button
                        type="button"
                        disabled={rewindBusy}
                        onClick={() => workflowDetail.optimizationTaskId && onOptimizationEdit(workflowDetail.optimizationTaskId)}
                        className="btn-geo-primary w-full sm:w-auto"
                      >
                        编辑监控配置
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={rewindBusy || !canCreate}
                        title={!canCreate ? '请先完成诊断并关联报告' : undefined}
                        onClick={() => {
                          onClose();
                          onOptimizationCreate({
                            brandName: workflowDetail.brandName,
                            productName: workflowDetail.productName ?? null,
                            keywords: (workflowDetail.coreKeywords ?? []).map((x) => String(x).trim()).filter(Boolean),
                            sourceDiagnosisReportId: workflowDetail.diagnosisReportId,
                            baselineVisibility: workflowDetail.baselineVisibility ?? null,
                          });
                        }}
                        className="btn-geo-primary w-full sm:w-auto"
                      >
                        建立监控
                      </button>
                    )}
                  </div>
                  <p className={isDark ? 'text-[11px] leading-snug text-zinc-500' : 'text-[11px] leading-snug text-slate-500'}>
                    {hasOpt
                      ? '进入表单可修改调度与达标规则（任务须为运行中或已暂停方可保存）。'
                      : '进入与侧栏一致的创建流程，关联当前诊断与核心词。'}
                  </p>
                </div>
              );
            }

            if (artifactStep === 3) {
              return (
                <div className={'mt-5 flex flex-col gap-3 border-t pt-4 ' + (isDark ? 'border-slate-600' : 'border-slate-200')}>
                  {workflowDetail.phase !== 'completed' && workflowDetail.phase !== 'completion' ? (
                    <>
                      <button
                        type="button"
                        disabled={completeWorkflowBusy}
                        onClick={() => void handleMarkWorkflowComplete()}
                        className="btn-geo-primary w-full sm:flex-none"
                      >
                        {completeWorkflowBusy ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            处理中…
                          </>
                        ) : (
                          '将主线标为已完成'
                        )}
                      </button>
                      <p className={isDark ? 'text-[11px] leading-snug text-zinc-500' : 'text-[11px] leading-snug text-slate-500'}>
                        任意阶段均可手动结束主线；结束后与「手动关闭」类原因一致，可在列表与详情中查看。
                      </p>
                    </>
                  ) : (
                    <p className={isDark ? 'text-[11px] leading-snug text-zinc-500' : 'text-[11px] leading-snug text-slate-500'}>
                      上方已展示验收结论。若需再次进入监控，请使用侧栏「优化任务」或回退阶段后重跑。
                    </p>
                  )}
                </div>
              );
            }

            const rt = artifactStepToRewindTarget(artifactStep);
            const canRewind =
              !!workflowId &&
              !!rt &&
              (rt === 'brand_analysis' ||
                (rt === 'diagnosis' &&
                  !!(workflowDetail.extractionTaskId || (workflowDetail.coreKeywords && workflowDetail.coreKeywords.length > 0))) ||
                (rt === 'monitoring' && !!workflowDetail.diagnosisReportId));
            return (
              <div className={'mt-5 flex flex-col gap-3 border-t pt-4 ' + (isDark ? 'border-slate-600' : 'border-slate-200')}>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={rewindBusy || !canRewind}
                    title={
                      !canRewind
                        ? rt === 'diagnosis'
                          ? '需先有解析品牌产出'
                          : rt === 'monitoring'
                            ? '需先有关联的诊断报告'
                            : undefined
                        : undefined
                    }
                    onClick={() => void handleRewindArtifactStage()}
                    className="btn-geo-secondary w-full sm:w-auto"
                  >
                    {rewindBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <RefreshCw className="h-4 w-4" aria-hidden />
                    )}
                    重新执行本阶段
                  </button>
                </div>
                <p className={isDark ? 'text-[11px] leading-snug text-zinc-500' : 'text-[11px] leading-snug text-slate-500'}>
                  重新执行将清空本阶段及之后的产出，便于从该阶段重跑。
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      {kbSupplementOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="关闭"
            onClick={() => !supplementBusy && setKbSupplementOpen(false)}
          />
          <div
            className={
              'relative z-10 w-full max-w-md rounded-2xl border p-5 shadow-2xl ' +
              (isDark ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-white')
            }
          >
            <h3 className={titleCls}>补录知识库</h3>
            <p className={`mt-2 text-sm ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              上传至少一个文档，将写入知识库并关联到当前 GEO 主线。补录后不会自动更新词包。
            </p>
            <input
              ref={kbSuppInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(e) => {
                const list = e.target.files ? Array.from(e.target.files) : [];
                setKbSuppFiles(list);
                setSupplementKbError(null);
              }}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={supplementBusy}
                onClick={() => kbSuppInputRef.current?.click()}
                className={
                  'rounded-lg border px-3 py-2 text-sm font-medium ' +
                  (isDark
                    ? 'border-slate-600 bg-slate-800 text-zinc-200 hover:bg-slate-700'
                    : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50')
                }
              >
                选择文件
              </button>
              {kbSuppFiles.length > 0 ? (
                <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>已选 {kbSuppFiles.length} 个文件</span>
              ) : null}
            </div>
            {kbSuppFiles.length > 0 ? (
              <ul className={`mt-2 max-h-28 overflow-y-auto text-xs ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                {kbSuppFiles.map((f) => (
                  <li key={f.name + f.size} className="truncate">
                    {f.name}
                  </li>
                ))}
              </ul>
            ) : null}
            {supplementKbError ? <p className="mt-2 text-sm text-red-500">{supplementKbError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={supplementBusy} className="btn-geo-secondary" onClick={() => setKbSupplementOpen(false)}>
                取消
              </button>
              <button
                type="button"
                disabled={supplementBusy || kbSuppFiles.length === 0}
                className="btn-geo-primary disabled:opacity-50"
                onClick={() => void submitKbSupplement()}
              >
                {supplementBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> 上传中…
                  </>
                ) : (
                  '上传并关联'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {kgSupplementOpen ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="关闭"
            onClick={() => !supplementBusy && setKgSupplementOpen(false)}
          />
          <div
            className={
              'relative z-10 w-full max-w-md rounded-2xl border p-5 shadow-2xl ' +
              (isDark ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-white')
            }
          >
            <h3 className={titleCls}>补录知识图谱</h3>
            <p className={`mt-2 text-sm ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              将创建语义下钻任务并关联到主线（消耗积分）。留空关键词则使用主线品牌名。补录后不会自动更新词包。
            </p>
            <label className={`mt-4 block text-xs font-medium ${isDark ? 'text-zinc-500' : 'text-slate-500'}`}>主题关键词（可选）</label>
            <input
              type="text"
              value={kgSuppKeyword}
              onChange={(e) => setKgSuppKeyword(e.target.value)}
              placeholder="默认：品牌名"
              disabled={supplementBusy}
              className={
                'mt-1 w-full rounded-xl border px-3 py-2 text-sm ' +
                (isDark ? 'border-slate-600 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-900')
              }
            />
            {supplementKgError ? <p className="mt-2 text-sm text-red-500">{supplementKgError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={supplementBusy} className="btn-geo-secondary" onClick={() => setKgSupplementOpen(false)}>
                取消
              </button>
              <button
                type="button"
                disabled={supplementBusy}
                className="btn-geo-primary disabled:opacity-50"
                onClick={() => void submitKgSupplement()}
              >
                {supplementBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> 处理中…
                  </>
                ) : (
                  '创建并等待生成'
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default GeoWorkflowArtifactModal;
