import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../../../api/geoWorkflow';
import { GEO_QUESTION_INTENT } from '../types';
import type { BrandIntakeConfig, SelectedBrand } from '../types';
import { flattenCoreKeywordsFromWorkflow, readCoreKeywordGroupsFromWorkflow } from '../types';
import { useDiagnosisFlow } from '../hooks/useDiagnosisFlow';
import { resolveUserSubjectCategories, resolveUserSubjectCategory } from '../../../utils/resolveUserSubjectCategory';
import {
  formatDomesticPlatformIds,
  formatOverseasPlatformIds,
} from '../shared/platformLabels';
import { diagnosisReportAPI } from '../../../api/diagnosisReport';
import type { DiagnosisReportData } from '../../../api/diagnosisReport';
import { resolveDisplayBaselineVisibility } from '../../../utils/miniReportEnrich';
import { useModuleI18n } from '../../../i18n/hooks';
import type { UserRole } from '../../../types';
import { canSelectOverseasOptimizationMarket } from '../../../utils/optimizationMarketAccess';
import OptimizationMarketModal, {
  type OptimizationMarketSelection,
} from '../shared/OptimizationMarketModal';

const GeoBrandReportMiniLayout = lazy(() => import('../../GeoBrandReportMiniLayout'));

interface Props {
  brand: SelectedBrand;
  workflow: GeoWorkflowDTO;
  intake: BrandIntakeConfig | null;
  /** 由解析品牌页「进入现状分析」触发，本页只展示进度与结果 */
  kickoffDiagnosis?: boolean;
  onKickoffDiagnosisConsumed?: () => void;
  onAdvanced: (wf: GeoWorkflowDTO) => void;
  /** 拉取到最新 workflow 后回写父级，用于展示已生成报告等 */
  onWorkflowSynced?: (wf: GeoWorkflowDTO) => void;
  userRole?: UserRole | null;
}

const ReportGenerationStage: React.FC<Props> = ({
  brand,
  workflow,
  intake,
  kickoffDiagnosis = false,
  onKickoffDiagnosisConsumed,
  onAdvanced,
  onWorkflowSynced,
  userRole = null,
}) => {
  const { t } = useModuleI18n('optimization');
  const canSelectOverseas = canSelectOverseasOptimizationMarket(userRole);
  const diagnosis = useDiagnosisFlow();
  const autoRunToken = useRef(0);
  const [enterOptBusy, setEnterOptBusy] = useState(false);
  const [marketModalOpen, setMarketModalOpen] = useState(false);
  const [reportForOverride, setReportForOverride] = useState<DiagnosisReportData | null>(null);

  const keywords = useMemo(() => flattenCoreKeywordsFromWorkflow(workflow), [workflow]);
  const keywordGroups = useMemo(() => readCoreKeywordGroupsFromWorkflow(workflow), [workflow]);
  const displaySubjectCategories = useMemo(
    () => resolveUserSubjectCategories(intake, workflow, brand),
    [intake, workflow, brand]
  );
  const reportId = diagnosis.result?.reportId ?? workflow.diagnosisReportId ?? null;
  const reportTaskIdForView =
    diagnosis.result?.reportTaskId ?? workflow.diagnosisReportTaskId ?? null;
  const workflowBaseline = diagnosis.result?.baselineVisibility ?? workflow.baselineVisibility ?? null;
  const visibility = resolveDisplayBaselineVisibility(reportForOverride, workflowBaseline);

  useEffect(() => {
    const tid = (reportTaskIdForView || '').trim();
    if (!tid) {
      setReportForOverride(null);
      return;
    }
    let cancelled = false;
    void diagnosisReportAPI.getByTask(tid).then((r) => {
      if (!cancelled) setReportForOverride(r);
    });
    return () => {
      cancelled = true;
    };
  }, [reportTaskIdForView, reportId]);

  const aiPlatforms =
    intake?.aiPlatforms?.length ? intake.aiPlatforms : workflow.aiPlatforms ?? [];
  const overseasPlatforms =
    intake?.overseasPlatforms?.length
      ? intake.overseasPlatforms
      : workflow.overseasAiPlatforms ?? [];
  const canRunDomesticDiagnosis = aiPlatforms.length > 0;
  const overseasOnlySelected = aiPlatforms.length === 0 && overseasPlatforms.length > 0;

  const displaySubjectCategory = useMemo(
    () => resolveUserSubjectCategory(intake, workflow, brand),
    [intake, workflow, brand]
  );

  const keywordDisplayText = useMemo(() => {
    if (!keywordGroups.length) return keywords.join(' / ');
    return keywordGroups
      .filter((g) => g.keywords.length)
      .map((g) => `${g.industry}：${g.keywords.join('、')}`)
      .join(' · ');
  }, [keywordGroups, keywords]);

  const running =
    diagnosis.status === 'starting' ||
    diagnosis.status === 'analyzing' ||
    diagnosis.status === 'advancing';

  const buildRunParams = useCallback(
    (wf: GeoWorkflowDTO) => ({
      workflowId: wf.workflowId,
      brandName: brand.name,
      industry: resolveUserSubjectCategory(intake, wf, brand),
      brandIntroduction: brand.brand_introduction || undefined,
      coreKeywords: wf.coreKeywords ?? [],
      aiPlatforms: (intake?.aiPlatforms?.length ? intake.aiPlatforms : wf.aiPlatforms) ?? [],
      productName: (intake?.productName ?? wf.productName ?? '').trim() || undefined,
      questionIntent: GEO_QUESTION_INTENT,
    }),
    [
      brand.name,
      brand.category,
      brand.brand_introduction,
      intake?.subjectCategory,
      intake?.aiPlatforms,
      intake?.productName,
    ]
  );

  const runDiagnosis = useCallback(
    async (wf: GeoWorkflowDTO) => {
      const res = await diagnosis.run(buildRunParams(wf));
      onAdvanced(res.workflow);
    },
    [diagnosis, buildRunParams, onAdvanced]
  );

  const handleEnterIntelligentOptimization = async (selection: OptimizationMarketSelection) => {
    const wid = workflow.workflowId?.trim();
    if (!wid) return;
    setEnterOptBusy(true);
    try {
      const payload: Parameters<typeof geoWorkflowAPI.advance>[1] = {
        enter_intelligent_optimization: true,
        optimization_market: selection.optimizationMarket,
      };
      if (selection.optimizationMarket === 'overseas') {
        payload.overseas_writing_language = selection.overseasWritingLanguage;
      }
      const wf = await geoWorkflowAPI.advance(wid, payload);
      setMarketModalOpen(false);
      onAdvanced(wf);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(msg || t('stages.reportGeneration.enterOptimizationFailed'));
    } finally {
      setEnterOptBusy(false);
    }
  };

  /**
   * 本页不主动「开始」：由上一页按钮 kickoff，或列表重进时自动续跑。
   */
  useEffect(() => {
    const wid = (workflow?.workflowId || '').trim();
    if (!wid) return;

    const token = ++autoRunToken.current;
    let cancelled = false;

    void (async () => {
      try {
        const fresh = await geoWorkflowAPI.get(wid);
        if (cancelled || token !== autoRunToken.current) return;
        onWorkflowSynced?.(fresh);

        if (fresh.diagnosisReportId) {
          console.info('[ReportGenerationStage] autoRun_skip', {
            workflowId: wid,
            reason: '已有 diagnosisReportId',
            diagnosisReportId: fresh.diagnosisReportId,
          });
          return;
        }

        const kws = fresh.coreKeywords ?? [];
        const plats = (intake?.aiPlatforms?.length ? intake.aiPlatforms : fresh.aiPlatforms) ?? [];
        if (kws.length === 0 || plats.length === 0) {
          console.warn('[ReportGenerationStage] autoRun_skip', {
            workflowId: wid,
            reason: '缺少核心词或 AI 平台',
            coreKeywordsCount: kws.length,
            aiPlatformsCount: plats.length,
            intakePlatforms: intake?.aiPlatforms,
            freshPlatforms: fresh.aiPlatforms,
          });
          return;
        }

        const ph = (fresh.phase || '').toLowerCase();
        if (ph !== 'report_generation' && ph !== 'diagnosis') {
          console.info('[ReportGenerationStage] autoRun_skip', {
            workflowId: wid,
            reason: 'phase 非 report_generation/diagnosis',
            phase: fresh.phase,
          });
          return;
        }

        const shouldRun = kickoffDiagnosis || diagnosis.status === 'idle' || diagnosis.status === 'error';
        if (!shouldRun) {
          console.info('[ReportGenerationStage] autoRun_skip', {
            workflowId: wid,
            reason: '诊断状态不允许自动续跑',
            kickoffDiagnosis,
            diagnosisStatus: diagnosis.status,
            phaseStatus: fresh.phaseStatus,
          });
          return;
        }

        console.info('[ReportGenerationStage] autoRun_start', {
          workflowId: wid,
          phase: fresh.phase,
          phaseStatus: fresh.phaseStatus,
          kickoffDiagnosis,
          diagnosisStatus: diagnosis.status,
        });
        await runDiagnosis(fresh);
        if (cancelled || token !== autoRunToken.current) return;
        if (kickoffDiagnosis) onKickoffDiagnosisConsumed?.();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[ReportGenerationStage] autoRun_failed', {
          workflowId: wid,
          error: msg,
          kickoffDiagnosis,
        });
        if (kickoffDiagnosis) onKickoffDiagnosisConsumed?.();
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow.workflowId, kickoffDiagnosis]);

  const showInlineReport = Boolean(reportTaskIdForView) && !running;
  const showRegenerating = Boolean(reportId) && running;
  const showBottomBar = Boolean(reportId) && !running;

  const bottomBarCls =
    'shrink-0 border-t border-slate-200/90 bg-white/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/90 ' +
    'shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.12)] z-20 -mx-2 mt-auto px-3 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]';

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-2">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900">{t('stages.reportGeneration.title')}</h2>
        {reportId != null && !running ? (
          <p className="mt-2 text-xs text-emerald-700">
            {t('stages.reportGeneration.reportGenerated', { reportId })}
            {visibility != null
              ? t('stages.reportGeneration.baselineVisibility', { value: visibility.toFixed(2) })
              : ''}
          </p>
        ) : running ? (
          <p className="mt-2 text-xs text-orange-700 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {diagnosis.statusHint || t('stages.reportGeneration.generatingReport')}
          </p>
        ) : null}
      </div>

      {!reportId ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="rounded-xl bg-[#FFF6F2] border border-[#E8553F]/15 px-4 py-3 text-xs text-gray-600 leading-relaxed">
            <div className="flex items-center gap-1.5 text-[#E8553F] font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              {t('stages.reportGeneration.diagnosisTaskInfo')}
            </div>
            <div>
              {t('stages.reportGeneration.brand')}
              <span className="text-gray-900 font-semibold">{brand.name}</span>
              {displaySubjectCategories.length ? (
                <>（{displaySubjectCategories.join(' / ')}）</>
              ) : displaySubjectCategory ? (
                <>（{displaySubjectCategory}）</>
              ) : null}
            </div>
            {((intake?.productName ?? workflow.productName) || '').trim() ? (
              <div className="mt-1">
                {t('stages.reportGeneration.product')}
                <span className="text-gray-900 font-semibold">
                  {(intake?.productName ?? workflow.productName ?? '').trim()}
                </span>
              </div>
            ) : null}
            <div className="mt-1">
              {t('stages.reportGeneration.keywords')}
              {keywords.length === 0 ? (
                <span className="text-red-500">{t('stages.reportGeneration.noKeywords')}</span>
              ) : (
                keywordDisplayText
              )}
            </div>
            <div className="mt-1">
              {t('stages.reportGeneration.domesticPlatforms')}{formatDomesticPlatformIds(aiPlatforms)}
            </div>
            <div className="mt-1">
              {t('stages.reportGeneration.overseasPlatforms')}{formatOverseasPlatformIds(overseasPlatforms)}
            </div>
            {overseasOnlySelected ? (
              <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                {t('stages.reportGeneration.overseasOnlyHint')}
              </div>
            ) : null}
            {brand.brand_introduction && (
              <div className="mt-1 line-clamp-2">
                {t('stages.reportGeneration.introduction', { text: brand.brand_introduction })}
              </div>
            )}
          </div>

          {running && diagnosis.statusHint && (
            <div className="mt-4 rounded-lg border border-orange-100 bg-orange-50/60 px-3 py-2 text-xs text-orange-700 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {diagnosis.statusHint}
            </div>
          )}

          {!running && !diagnosis.error && (
            <div className="mt-4 text-xs text-gray-500">{t('stages.reportGeneration.waitingDiagnosis')}</div>
          )}

          {diagnosis.error && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
                {diagnosis.error}
              </div>
              <button
                type="button"
                onClick={() => void runDiagnosis(workflow)}
                disabled={keywords.length === 0 || !canRunDomesticDiagnosis}
                className="btn-geo-secondary"
              >
                {t('stages.reportGeneration.regenerateReport')}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {reportId ? (
        <>
          {showRegenerating ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 flex flex-col items-center justify-center text-sm text-slate-600 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#E8553F]" />
              <span>{t('stages.reportGeneration.regeneratingReport')}</span>
            </div>
          ) : null}

          {showInlineReport ? (
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 min-h-[200px]">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    {t('stages.reportGeneration.loadingReportContent')}
                  </div>
                }
              >
                <GeoBrandReportMiniLayout
                  theme="light"
                  taskId={reportTaskIdForView!}
                  onBack={() => undefined}
                  hideTopBar
                  backButtonLabel=""
                />
              </Suspense>
            </div>
          ) : reportId && !running && !reportTaskIdForView ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
              {t('stages.reportGeneration.missingTaskId')}
            </div>
          ) : null}

          {diagnosis.error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
              {diagnosis.error}
            </div>
          )}
        </>
      ) : null}
      </div>

      {showBottomBar ? (
        <div className={bottomBarCls}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => void runDiagnosis(workflow)}
              disabled={keywords.length === 0 || !canRunDomesticDiagnosis || running}
              className="btn-geo-secondary"
            >
              {t('stages.reportGeneration.regenerateReport')}
            </button>
            <button
              type="button"
              onClick={() => setMarketModalOpen(true)}
              disabled={enterOptBusy}
              className="btn-geo-primary disabled:opacity-60"
            >
              {enterOptBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('stages.reportGeneration.entering')}
                </>
              ) : (
                <>
                  {t('stages.reportGeneration.enterIntelligentOptimization')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}

      <OptimizationMarketModal
        open={marketModalOpen}
        onClose={() => setMarketModalOpen(false)}
        onConfirm={handleEnterIntelligentOptimization}
        busy={enterOptBusy}
        canSelectOverseas={canSelectOverseas}
      />
    </div>
  );
};

export default ReportGenerationStage;
