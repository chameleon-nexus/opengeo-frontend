import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { brandsAPI, type Brand as BrandRecord } from '../../../api/brands';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../../../api/geoWorkflow';
import { optimizationTaskAPI, type OptimizationTaskDTO } from '../../../api/optimizationTask';
import { UserRole, type Brand, type Theme } from '../../../types';
import { resolveArtifactReportTaskId } from '../../geoWorkflowShared';
import CockpitSidebar from './CockpitSidebar';
import BasicInfoPanel from './BasicInfoPanel';
import { resolveCockpitPublishMarket, type CockpitTab } from './types';
import { SHOW_CONTENT_AND_MEDIA_PUBLISH, SHOW_PUBLISH_SETTINGS } from '../../../constants/optimizationMode';
import { useModuleI18n } from '../../../i18n/hooks';
import OptimizationTaskFormBlock from '../shared/OptimizationTaskFormBlock';
import DiagnosisQuestionsSection from '../shared/DiagnosisQuestionsSection';
import KnowledgeBase from '../../KnowledgeBase';
import SemanticSEOList from '../../SemanticSEOList';
import {
  GEO_QUESTION_INTENT,
  flattenCoreKeywordsFromWorkflow,
  subjectCategoriesFromWorkflow,
  type BrandIntakeConfig,
  type SelectedBrand,
} from '../types';
import { brandWithSubjectCategory } from '../../../utils/resolveUserSubjectCategory';
import { resolveDiagnosisRegionWords } from '../../../utils/coreKeywordGroups';
import { apiBrandRecordToAppBrand } from '../../../utils/appBrand';
import i18n from '../../../i18n/config';

const GeoBrandReportMiniLayout = lazy(() => import('../../GeoBrandReportMiniLayout'));
const DataScreen = lazy(() => import('../../DataScreen'));
const ThirdPartyPublish = lazy(() => import('../../ThirdPartyPublish'));
const PublishSettingsPanel = lazy(() => import('./PublishSettingsPanel'));
const SemanticSEO = lazy(() => import('../../SemanticSEO'));
const SocialMediaAccounts = lazy(() => import('../../SocialMediaAccounts'));
const PublishRecords = lazy(() => import('../../PublishRecords'));

function brandRecordToSelected(b: BrandRecord): SelectedBrand {
  return {
    id: b.id,
    brand_id: b.brand_id,
    name: b.name,
    category: b.category,
    brand_introduction: b.brand_introduction ?? null,
    knowledge_base_id: b.knowledge_base_id ?? null,
  };
}

function fallbackSelectedBrandFromWorkflow(wf: GeoWorkflowDTO): SelectedBrand {
  const wid = (wf.workflowId || 'wf').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48);
  return {
    id: wf.brandId ?? 0,
    brand_id: wf.brandId != null ? `id-${wf.brandId}` : `wf-${wid}`,
    name: (wf.brandName && wf.brandName.trim()) || i18n.t('cockpit.unnamedBrand', { ns: 'optimization', defaultValue: '未命名品牌' }),
    category: (wf.subjectCategory ?? '').trim(),
    brand_introduction: null,
    knowledge_base_id: wf.knowledgeBaseId ?? null,
  };
}

interface Props {
  workflowId: string;
  initialTab?: CockpitTab;
  theme?: Theme;
  currentBrand: Brand | null;
  userRole?: UserRole | null;
  onBrandResolved?: (brand: Brand) => void;
  onExit: () => void;
  /** 打开「智能优化自动化部署指南」 */
  onOpenDeployGuide?: () => void;
}

/** 任务 Tab 内「最新轮次 · 查看」：不切换侧栏，栈式进入报告/明细 */
type CockpitTaskDrill = 'report' | 'detail' | null;

const OptimizationCockpit: React.FC<Props> = ({
  workflowId,
  initialTab = 'task',
  theme = 'light',
  currentBrand,
  userRole = null,
  onBrandResolved,
  onExit,
  onOpenDeployGuide,
}) => {
  const { t } = useModuleI18n('optimization');
  const showBasicInfo = userRole === UserRole.ADMIN;
  const [workflow, setWorkflow] = useState<GeoWorkflowDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CockpitTab>(() => {
    if (initialTab === 'basic_info' && userRole !== UserRole.ADMIN) return 'task';
    return initialTab ?? 'task';
  });
  const [cockpitBrand, setCockpitBrand] = useState<Brand | null>(currentBrand);
  const [selectedBrand, setSelectedBrand] = useState<SelectedBrand | null>(null);
  const [cockpitIntake, setCockpitIntake] = useState<BrandIntakeConfig | null>(null);
  const [coreKeywords, setCoreKeywords] = useState<string[]>([]);
  const [extractionTaskId, setExtractionTaskId] = useState<string | null>(null);
  const [optTaskSnapshot, setOptTaskSnapshot] = useState<OptimizationTaskDTO | null>(null);
  const [cockpitSemanticTaskId, setCockpitSemanticTaskId] = useState<string | null>(null);
  const [cockpitTaskDrill, setCockpitTaskDrill] = useState<CockpitTaskDrill>(null);
  const cockpitBrandResolvedRef = useRef(false);

  const syncBrandFromWorkflow = useCallback((wf: GeoWorkflowDTO) => {
    const cats = subjectCategoriesFromWorkflow(wf);
    const wfSc = cats[0] || (wf.subjectCategory ?? '').trim();
    const fallback = brandWithSubjectCategory(fallbackSelectedBrandFromWorkflow(wf), wfSc || undefined);
    setSelectedBrand(fallback);

    if (wf.brandId != null) {
      void brandsAPI.getBrandByDbId(wf.brandId).then((b) => {
        if (!b) return;
        const next = brandWithSubjectCategory(brandRecordToSelected(b), wfSc || undefined);
        setSelectedBrand(next);
      });
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const wf = await geoWorkflowAPI.get(workflowId);
      const tid = wf.optimizationTaskId?.trim();
      const optTask = tid ? await optimizationTaskAPI.get(tid).catch(() => null) : null;
      setWorkflow(wf);
      setOptTaskSnapshot(optTask);
      setCoreKeywords(flattenCoreKeywordsFromWorkflow(wf));
      setExtractionTaskId(wf.extractionTaskId?.trim() || null);
      syncBrandFromWorkflow(wf);

      if (!cockpitBrandResolvedRef.current) {
        const bn = (wf.brandName || '').trim().toLowerCase();
        const match =
          bn && currentBrand && (currentBrand.name || '').trim().toLowerCase() === bn
            ? currentBrand
            : null;
        if (match) {
          setCockpitBrand(match);
          cockpitBrandResolvedRef.current = true;
        } else if (wf.brandId != null) {
          const b = await brandsAPI.getBrandByDbId(wf.brandId);
          if (b) {
            const resolved = apiBrandRecordToAppBrand(b);
            setCockpitBrand(resolved);
            onBrandResolved?.(resolved);
            cockpitBrandResolvedRef.current = true;
          }
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [workflowId, currentBrand, onBrandResolved, syncBrandFromWorkflow]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (showBasicInfo) return;
    if (activeTab === 'basic_info') {
      setActiveTab('task');
    }
  }, [showBasicInfo, activeTab]);

  useEffect(() => {
    if (!workflow || !selectedBrand) return;
    setCockpitIntake((prev) => ({
      brand: selectedBrand,
      productName: (prev?.productName ?? workflow.productName ?? selectedBrand.name) || selectedBrand.name,
      subjectCategories: subjectCategoriesFromWorkflow(workflow),
      subjectCategory:
        subjectCategoriesFromWorkflow(workflow)[0] ||
        (prev?.subjectCategory ?? workflow.subjectCategory ?? selectedBrand.category ?? '').trim() ||
        undefined,
      questionIntent: GEO_QUESTION_INTENT,
      aiPlatforms:
        prev?.aiPlatforms?.length
          ? prev.aiPlatforms
          : workflow.aiPlatforms?.length
            ? [...workflow.aiPlatforms]
            : ['doubao'],
      overseasPlatforms:
        prev?.overseasPlatforms?.length
          ? prev.overseasPlatforms
          : workflow.overseasAiPlatforms?.length
            ? [...workflow.overseasAiPlatforms]
            : [],
      enableKnowledgeGraph:
        prev?.enableKnowledgeGraph ?? Boolean(workflow.semanticSeoTaskId?.trim()),
      files: prev?.files ?? [],
    }));
  }, [workflow, selectedBrand]);

  useEffect(() => {
    if (!workflow) return;
    const market = resolveCockpitPublishMarket(workflow.optimizationMarket);
    if (market === 'overseas') return;
    if (activeTab === 'social_accounts' || activeTab === 'social_publish') {
      setActiveTab('task');
    }
  }, [workflow, activeTab]);

  useEffect(() => {
    if (activeTab !== 'knowledge_base' && activeTab !== 'knowledge_graph') return;
    void geoWorkflowAPI.get(workflowId).then((wf) => {
      setWorkflow(wf);
      setCoreKeywords(flattenCoreKeywordsFromWorkflow(wf));
      setExtractionTaskId(wf.extractionTaskId?.trim() || null);
    }).catch(() => {
      /* 忽略：用户可手动刷新 */
    });
  }, [activeTab, workflowId]);

  const reportTaskId = useMemo(() => {
    if (!workflow) return undefined;
    return (
      resolveArtifactReportTaskId(workflow, optTaskSnapshot) ||
      workflow.diagnosisReportTaskId ||
      undefined
    );
  }, [workflow, optTaskSnapshot]);

  const productLabel = (workflow?.productName || workflow?.brandName || '').trim();

  const handleWorkflowUpdated = useCallback((wf: GeoWorkflowDTO) => {
    setWorkflow(wf);
    setCoreKeywords(flattenCoreKeywordsFromWorkflow(wf));
    setExtractionTaskId(wf.extractionTaskId?.trim() || null);
    if (wf.semanticSeoTaskId?.trim()) {
      setCockpitIntake((prev) =>
        prev ? { ...prev, enableKnowledgeGraph: true } : prev,
      );
    }
  }, []);

  const refreshOptTaskSnapshot = useCallback(() => {
    return geoWorkflowAPI
      .get(workflowId)
      .then((wf) => {
        handleWorkflowUpdated(wf);
        const tid = wf.optimizationTaskId?.trim();
        if (!tid) return;
        return optimizationTaskAPI.get(tid).then(setOptTaskSnapshot);
      })
      .catch(() => {
        /* 仍进入 drill，侧栏任务页可稍后刷新 */
      });
  }, [workflowId, handleWorkflowUpdated]);

  const openTaskDrillReport = useCallback(() => {
    void refreshOptTaskSnapshot().finally(() => setCockpitTaskDrill('report'));
  }, [refreshOptTaskSnapshot]);

  const openTaskDrillDetail = useCallback(() => {
    void refreshOptTaskSnapshot().finally(() => setCockpitTaskDrill('detail'));
  }, [refreshOptTaskSnapshot]);

  const handleSelectTab = useCallback((tab: CockpitTab) => {
    setCockpitTaskDrill(null);
    setActiveTab(tab);
  }, []);

  const tabFallback = (
    <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      {t('cockpit.tabFallback')}
    </div>
  );

  if (loading && !workflow) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-500">
        <Loader2 className="mb-2 h-8 w-8 animate-spin" />
        <span className="text-sm">{t('cockpit.loading')}</span>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-sm text-red-600">{error || t('cockpit.loadError')}</p>
        <button type="button" onClick={onExit} className="mt-4 btn-geo-secondary text-sm">
          {t('cockpit.back')}
        </button>
      </div>
    );
  }

  const diagnosisRegionWords = resolveDiagnosisRegionWords(
    workflow,
    optTaskSnapshot?.diagnosisRegionWords
  );
  const publishMarket = resolveCockpitPublishMarket(workflow.optimizationMarket);
  const isOverseasCockpit = publishMarket === 'overseas';

  return (
    <div className="flex h-full min-h-0 w-full bg-[#F5F5F7]">
      <CockpitSidebar
        workflow={workflow}
        activeTab={activeTab}
        showBasicInfo={showBasicInfo}
        onSelectTab={handleSelectTab}
        onExit={onExit}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-slate-200/80 bg-white/80 px-6 py-4 backdrop-blur-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            {productLabel
              ? t('cockpit.greeting', { product: productLabel })
              : t('cockpit.greetingNoProduct')}
          </h1>
          <p className="mt-1 text-xs text-slate-500">{t('cockpit.statusInProgress')}</p>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden flex flex-col">
          {activeTab === 'report' ? (
            <div className="h-full min-h-0 overflow-hidden">
              {reportTaskId ? (
                <Suspense fallback={tabFallback}>
                  <GeoBrandReportMiniLayout
                    theme={theme}
                    taskId={reportTaskId}
                    onBack={() => undefined}
                    hideTopBar
                    backButtonLabel=""
                    embedded
                  />
                </Suspense>
              ) : (
                <div className="flex h-full min-h-0 items-center justify-center px-6 py-16 text-center text-sm text-slate-500">
                  {t('cockpit.noReport')}
                </div>
              )}
            </div>
          ) : null}

          {activeTab === 'detail' ? (
            <div className="h-full min-h-0 overflow-hidden">
              <Suspense fallback={tabFallback}>
                <DataScreen
                  theme={theme}
                  currentBrand={cockpitBrand ?? currentBrand}
                  taskId={reportTaskId}
                  workflowId={workflow.workflowId}
                  embedded
                />
              </Suspense>
            </div>
          ) : null}

          {activeTab === 'task' ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              {cockpitTaskDrill === 'report' ? (
                <div className="h-full min-h-0 overflow-hidden">
                  {reportTaskId ? (
                    <Suspense fallback={tabFallback}>
                      <GeoBrandReportMiniLayout
                        theme={theme}
                        taskId={reportTaskId}
                        onBack={() => setCockpitTaskDrill(null)}
                        backButtonLabel={t('cockpit.backToTask')}
                        embedded
                      />
                    </Suspense>
                  ) : (
                    <div className="flex h-full min-h-0 items-center justify-center px-6 py-16 text-center text-sm text-slate-500">
                      {t('cockpit.noReport')}
                    </div>
                  )}
                </div>
              ) : cockpitTaskDrill === 'detail' ? (
                <div className="h-full min-h-0 overflow-hidden">
                  <Suspense fallback={tabFallback}>
                    <DataScreen
                      theme={theme}
                      currentBrand={cockpitBrand ?? currentBrand}
                      taskId={reportTaskId}
                      workflowId={workflow.workflowId}
                      embedded
                      geoWizardNav={{
                        onBack: () => setCockpitTaskDrill(null),
                        backLabel: t('cockpit.backToTask'),
                      }}
                    />
                  </Suspense>
                </div>
              ) : (
                <div className="h-full min-h-0 overflow-y-auto px-4 md:px-6 py-6">
                  <OptimizationTaskFormBlock
                    workflowId={workflow.workflowId}
                    brandName={workflow.brandName}
                    defaultProductName={workflow.productName}
                    coreKeywords={coreKeywords}
                    coreKeywordGroups={workflow.coreKeywordGroups ?? null}
                    diagnosisRegionWords={diagnosisRegionWords}
                    subjectCategories={subjectCategoriesFromWorkflow(workflow)}
                    extractionTaskId={extractionTaskId}
                    knowledgeBaseId={workflow.knowledgeBaseId}
                    sourceDiagnosisReportId={workflow.diagnosisReportId}
                    baselineVisibility={workflow.baselineVisibility}
                    existingTaskId={workflow.optimizationTaskId}
                    optimizationMarket={workflow.optimizationMarket}
                    onTaskUpserted={(task, wf) => {
                      if (task) setOptTaskSnapshot(task);
                      if (wf) handleWorkflowUpdated(wf);
                    }}
                    onNavigateToDeployGuide={onOpenDeployGuide}
                    onOpenAnalysisReport={openTaskDrillReport}
                    onOpenAnalysisDetail={openTaskDrillDetail}
                  />
                </div>
              )}
            </div>
          ) : null}

          {activeTab === 'publish' ? (
            <div className="h-full min-h-0 overflow-hidden">
              <Suspense fallback={tabFallback}>
                {SHOW_PUBLISH_SETTINGS ? (
                  <PublishSettingsPanel
                    theme={theme}
                    optimizationTaskId={workflow.optimizationTaskId}
                    optimizationMarket={workflow.optimizationMarket}
                    onTaskUpdated={setOptTaskSnapshot}
                  />
                ) : SHOW_CONTENT_AND_MEDIA_PUBLISH ? (
                  <ThirdPartyPublish
                    theme={theme}
                    portal="cockpitEmbed"
                    market={publishMarket}
                    workflowIdFilter={workflow.workflowId}
                    optimizationTaskId={workflow.optimizationTaskId}
                    listRefreshKey={activeTab === 'publish' ? `${workflow.workflowId}-publish` : undefined}
                  />
                ) : null}
              </Suspense>
            </div>
          ) : null}

          {isOverseasCockpit && activeTab === 'social_accounts' ? (
            <div className="h-full min-h-0 overflow-y-auto">
              <Suspense fallback={tabFallback}>
                <SocialMediaAccounts theme={theme} currentBrand={cockpitBrand ?? currentBrand} />
              </Suspense>
            </div>
          ) : null}

          {isOverseasCockpit && activeTab === 'social_publish' ? (
            <div className="h-full min-h-0 overflow-hidden">
              <Suspense fallback={tabFallback}>
                <PublishRecords
                  theme={theme}
                  currentBrand={cockpitBrand ?? currentBrand}
                  initialOptimizationTaskIdFilter={workflow.optimizationTaskId ?? null}
                />
              </Suspense>
            </div>
          ) : null}

          {showBasicInfo && activeTab === 'basic_info' ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <BasicInfoPanel
                workflow={workflow}
                intake={cockpitIntake}
                selectedBrand={selectedBrand}
                onWorkflowUpdated={handleWorkflowUpdated}
                onBrandUpdated={(next) => {
                  setSelectedBrand(next);
                  if (cockpitBrand) {
                    setCockpitBrand({
                      ...cockpitBrand,
                      name: next.name,
                      category: next.category,
                    });
                  }
                }}
                onTaskSnapshotRefresh={() => {
                  const tid = workflow.optimizationTaskId?.trim();
                  if (!tid) return;
                  void optimizationTaskAPI
                    .get(tid)
                    .then(setOptTaskSnapshot)
                    .catch(() => {
                      /* 忽略 */
                    });
                }}
              />
            </div>
          ) : null}

          {activeTab === 'wordpack' ? (
            <div className="h-full min-h-0 overflow-y-auto px-4 md:px-6 py-6">
              <DiagnosisQuestionsSection
                workflow={workflow}
                onWorkflowUpdated={handleWorkflowUpdated}
              />
            </div>
          ) : null}

          {activeTab === 'knowledge_base' ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <KnowledgeBase
                theme={theme}
                currentBrand={cockpitBrand ?? currentBrand}
                initialSelectedKnowledgeBaseId={workflow.knowledgeBaseId ?? null}
                scopeWorkflowId={workflow.workflowId}
                bindGeoWorkflowId={workflow.workflowId}
                onGeoWorkflowUpdated={() => void load()}
              />
            </div>
          ) : null}

          {activeTab === 'knowledge_graph' ? (
            <div className="h-full min-h-0 overflow-hidden">
              {cockpitSemanticTaskId ? (
                <Suspense fallback={tabFallback}>
                  <SemanticSEO
                    theme={theme}
                    taskId={cockpitSemanticTaskId}
                    embedded
                    onBack={() => setCockpitSemanticTaskId(null)}
                  />
                </Suspense>
              ) : (
                <SemanticSEOList
                  theme={theme}
                  currentBrand={cockpitBrand ?? currentBrand}
                  scopeWorkflowId={workflow.workflowId}
                  pinnedSemanticSeoTaskId={workflow.semanticSeoTaskId ?? null}
                  pinnedKnowledgeBaseId={workflow.knowledgeBaseId ?? null}
                  bindGeoWorkflowId={workflow.workflowId}
                  embedded
                  onGeoWorkflowUpdated={() => void load()}
                  onTaskSelect={setCockpitSemanticTaskId}
                />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default OptimizationCockpit;
