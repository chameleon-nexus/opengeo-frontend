import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { brandsAPI, type Brand } from '../../api/brands';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../../api/geoWorkflow';
import { ModuleType, type UserRole } from '../../types';
import { useRichMediaStream } from './richMedia/useRichMediaStream';
import WorkbenchHeader from './WorkbenchHeader';
import AgentSidePanel from './AgentSidePanel';
import BrandInputStage from './stages/BrandInputStage';
import BrandParseStage from './stages/BrandParseStage';
import ReportGenerationStage from './stages/ReportGenerationStage';
import IntelligentOptimizationStage from './stages/IntelligentOptimizationStage';
import IntelligentOptimizationHub from './stages/IntelligentOptimizationHub';
import CompletionStage from './stages/CompletionStage';
import type { BrandIntakeConfig, SelectedBrand, WorkbenchStage } from './types';
import { GEO_QUESTION_INTENT, maxNavigableWorkbenchIndexFromWorkflow, maxProgressWorkbenchIndexFromWorkflow, phaseToStage, WORKBENCH_STAGES } from './types';
import { brandWithSubjectCategory,
  isPersistableBrandSlug,
  resolveUserSubjectCategory,
} from '../../utils/resolveUserSubjectCategory';
import { subjectCategoriesFromWorkflow } from './types';
import { useModuleI18n } from '../../i18n/hooks';
import i18n from '../../i18n/config';

const GeoBrandReportMiniLayout = lazy(() => import('../GeoBrandReportMiniLayout'));

function brandRecordToSelected(b: Brand): SelectedBrand {
  return {
    id: b.id,
    brand_id: b.brand_id,
    name: b.name,
    category: b.category,
    brand_introduction: b.brand_introduction ?? null,
    knowledge_base_id: b.knowledge_base_id ?? null,
  };
}

/** 「最新优化」等入口仅有 workflow 详情、无 SelectedBrand；先占位再按需拉 brands 表 */
function fallbackSelectedBrandFromWorkflow(wf: GeoWorkflowDTO): SelectedBrand {
  const wid = (wf.workflowId || 'wf').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48);
  return {
    id: wf.brandId ?? 0,
    brand_id: wf.brandId != null ? `id-${wf.brandId}` : `wf-${wid}`,
    name: (wf.brandName && wf.brandName.trim()) || i18n.t('workbench.unnamedBrand', { ns: 'optimization', defaultValue: '未命名品牌' }),
    category: '',
    brand_introduction: null,
    knowledge_base_id: wf.knowledgeBaseId ?? null,
  };
}

function buildFallbackIntake(
  brand: SelectedBrand,
  workflow: GeoWorkflowDTO | null,
  prev?: BrandIntakeConfig | null
): BrandIntakeConfig {
  const fromPrev = (prev?.subjectCategories ?? []).map((x) => x.trim()).filter(Boolean);
  const fromWf = workflow ? subjectCategoriesFromWorkflow(workflow) : [];
  const legacy =
    (prev?.subjectCategory ?? workflow?.subjectCategory ?? brand.category ?? '').trim() || undefined;
  const subjectCategories =
    fromPrev.length > 0 ? fromPrev : fromWf.length > 0 ? fromWf : legacy ? [legacy] : [];
  const primaryCategory = subjectCategories[0];
  return {
    brand: primaryCategory && brand.category !== primaryCategory
      ? { ...brand, category: primaryCategory }
      : brand,
    productName: (prev?.productName ?? workflow?.productName ?? brand.name) || brand.name,
    subjectCategories,
    subjectCategory: primaryCategory,
    questionIntent: prev?.questionIntent ?? GEO_QUESTION_INTENT,
    aiPlatforms:
      prev?.aiPlatforms?.length
        ? prev.aiPlatforms
        : workflow?.aiPlatforms?.length
          ? [...workflow.aiPlatforms]
          : ['doubao'],
    overseasPlatforms:
      prev?.overseasPlatforms?.length
        ? prev.overseasPlatforms
        : workflow?.overseasAiPlatforms?.length
          ? [...workflow.overseasAiPlatforms]
          : [],
    enableKnowledgeGraph:
      prev?.enableKnowledgeGraph ??
      Boolean(workflow?.semanticSeoTaskId?.trim()),
    files: prev?.files ?? [],
  };
}

interface Props {
  /** 进入工作台时已确定的品牌（可空：全周期从 0 开始时为 null） */
  initialBrand?: SelectedBrand | null;
  /** 进入工作台时已确定的 workflow（点击「最新优化」列表进入时存在） */
  initialWorkflowId?: string | null;
  /** 进入工作台时的初始阶段（例如从列表进入且已越过首屏时设为 brand_parse） */
  initialStage?: WorkbenchStage;
  /** 进入工作台时已收集的 AI 平台 / 知识图谱配置（已有品牌路径下传入） */
  initialIntake?: BrandIntakeConfig | null;
  /** 从驾驶舱返回：停留在智能优化 Hub，不自动进入驾驶舱 */
  skipAutoCockpit?: boolean;
  /** 退出工作台返回上层（品牌列表 / 最新优化列表） */
  onExit: () => void;
  /** 进入智能优化阶段时转交 App 打开优化驾驶舱 */
  onEnterCockpit?: (workflowId: string) => void;
  /** 跳转到任意 ModuleType（用于查看报告 / 优化任务详情等） */
  onJumpModule?: (
    m: ModuleType,
    opts?: {
      workflowId?: string;
      reportId?: number;
      taskId?: string;
      /** 优化工具 · 知识库：打开并选中指定知识库（展示文件列表） */
      knowledgeBaseId?: number;
      /** 打开内容生成详情：CG-xxxx */
      contentGenerationTaskId?: string;
      reportTaskId?: string;
      brandName?: string;
      geoWizardBack?: boolean;
      returnTo?: ModuleType;
      backLabel?: string;
    }
  ) => void;
  onBrandQuotaRefresh?: () => void;
  userRole?: UserRole | null;
}

const OptimizationWorkbench: React.FC<Props> = ({
  initialBrand,
  initialWorkflowId,
  initialStage,
  initialIntake,
  skipAutoCockpit = false,
  onExit,
  onEnterCockpit,
  onJumpModule,
  onBrandQuotaRefresh,
  userRole = null,
}) => {
  const { t } = useModuleI18n('optimization');
  const [brand, setBrand] = useState<SelectedBrand | null>(initialBrand ?? null);
  const [intake, setIntake] = useState<BrandIntakeConfig | null>(initialIntake ?? null);
  const [workflow, setWorkflow] = useState<GeoWorkflowDTO | null>(null);
  const [cycleChosen, setCycleChosen] = useState<boolean>(Boolean(initialWorkflowId));
  const [stage, setStage] = useState<WorkbenchStage>(initialStage ?? 'brand_input');
  const [loading, setLoading] = useState<boolean>(Boolean(initialWorkflowId));
  const [bootError, setBootError] = useState<string | null>(null);
  /** 全屏内嵌诊断报告（与「快速开始」同 UI：GeoBrandReportMiniLayout） */
  const [geoReportTaskId, setGeoReportTaskId] = useState<string | null>(null);

  const {
    richItems,
    lastSeq,
    sendChat: sendChatStream,
    loading: streamLoading,
    threadId: streamThreadId,
  } = useRichMediaStream(workflow?.workflowId ?? null);

  const lastRefreshSeq = useRef(0);
  /** 用户点了「跳过现状分析」后锁定在智能优化页 */
  const [forceSkipActive, setForceSkipActive] = useState(false);
  /** 解析品牌页点「进入现状分析」后，现状分析页应自动开跑诊断 */
  const [kickoffDiagnosis, setKickoffDiagnosis] = useState(false);

  const authoritativeStage = useMemo((): WorkbenchStage => {
    if (forceSkipActive) return 'intelligent_optimization';
    if (!workflow) return 'brand_input';
    return phaseToStage(workflow, true, true);
  }, [workflow, forceSkipActive]);

  const applyForcedSkipWorkflow = (wf: GeoWorkflowDTO): GeoWorkflowDTO => ({
    ...wf,
    cycleMode: 'half',
    phase: 'intelligent_optimization',
    phaseStatus: wf.phaseStatus ?? 'pending',
  });

  const syncWorkflow = useCallback(
    (wf: GeoWorkflowDTO) => {
      if (forceSkipActive) {
        setWorkflow(applyForcedSkipWorkflow(wf));
        return;
      }
      setWorkflow(wf);
    },
    [forceSkipActive]
  );

  /** 页面始终与 workflow.phase 对齐，不允许手动切到其它阶段 */
  useEffect(() => {
    if (loading) return;
    setStage(authoritativeStage);
  }, [authoritativeStage, loading]);

  const serverInIntelligentOptimization = useMemo(() => {
    const p = (workflow?.phase || '').toLowerCase();
    return p === 'intelligent_optimization' || p === 'monitoring';
  }, [workflow?.phase]);

  /** 智能优化阶段：服务端 phase 对齐后再自动打开国内驾驶舱；从驾驶舱返回时 skipAutoCockpit 为 true */
  useEffect(() => {
    if (!onEnterCockpit || loading || !workflow?.workflowId || skipAutoCockpit) return;
    if (authoritativeStage === 'intelligent_optimization' && serverInIntelligentOptimization) {
      onEnterCockpit(workflow.workflowId);
    }
  }, [
    authoritativeStage,
    loading,
    workflow?.workflowId,
    onEnterCockpit,
    skipAutoCockpit,
    serverInIntelligentOptimization,
  ]);

  // 拉取已有 workflow（点击列表进入时）
  useEffect(() => {
    if (!initialWorkflowId) return;
    let cancelled = false;
    setLoading(true);
    setBootError(null);
    geoWorkflowAPI
      .get(initialWorkflowId)
      .then((wf) => {
        if (cancelled) return;
        setWorkflow(wf);
        setCycleChosen(true);
        setStage(phaseToStage(wf, true, true));
        if (!initialBrand) {
          const wfSc = (wf.subjectCategory ?? '').trim();
          setBrand(
            brandWithSubjectCategory(fallbackSelectedBrandFromWorkflow(wf), wfSc || undefined)
          );
          if (wf.brandId != null) {
            brandsAPI.getBrandByDbId(wf.brandId).then((b) => {
              if (cancelled || !b) return;
              const selected = brandRecordToSelected(b);
              setBrand(brandWithSubjectCategory(selected, wfSc || undefined));
            });
          }
        }
      })
      .catch((e: any) => {
        if (cancelled) return;
        setBootError(e?.message || t('workbench.loadWorkflowFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initialWorkflowId, initialBrand]);

  useEffect(() => {
    const wid = workflow?.workflowId;
    if (!wid) return;
    let maxNew = lastRefreshSeq.current;
    let hit = false;
    for (const it of richItems) {
      const seq = Number(it.seq) || 0;
      if (seq <= lastRefreshSeq.current) continue;
      if (
        it.kind === 'extraction_done' ||
        it.kind === 'diagnosis_done' ||
        it.kind === 'workflow_completed'
      ) {
        hit = true;
        maxNew = Math.max(maxNew, seq);
      }
    }
    if (hit) {
      lastRefreshSeq.current = maxNew;
      void geoWorkflowAPI.get(wid).then((wf) => {
        syncWorkflow(wf);
      });
    }
  }, [richItems, workflow?.workflowId, syncWorkflow]);

  /** 跳过成功后后端 phase 对齐时解除本地锁定 */
  useEffect(() => {
    if (forceSkipActive && workflow?.phase === 'intelligent_optimization') {
      setForceSkipActive(false);
    }
  }, [forceSkipActive, workflow?.phase]);

  const isHalf = workflow?.cycleMode === 'half';

  /** 业务真实进度上界：来自 workflow.phase，不随仅用于浏览的 `stage` 回退而缩小 */
  /** 阶段条可跳转上界（与实际 phase 对齐） */
  const maxNavigableWorkbenchIndex = useMemo(() => {
    if (workflow) {
      return maxNavigableWorkbenchIndexFromWorkflow(workflow);
    }
    const j = WORKBENCH_STAGES.findIndex((s) => s.id === stage);
    return j < 0 ? 0 : j;
  }, [workflow, stage]);

  /** 里程碑打勾：基线报告成功后「现状分析」才算到达 */
  const maxProgressWorkbenchIndex = useMemo(() => {
    if (workflow) {
      return maxProgressWorkbenchIndexFromWorkflow(workflow);
    }
    const j = WORKBENCH_STAGES.findIndex((s) => s.id === stage);
    return j < 0 ? 0 : j;
  }, [workflow, stage]);

  // 已彻底完成的阶段：严格位于「业务当前阶段」之前（与 maxProgress 一致；半周期不统计被跳过的报告节点）
  const completedSet = useMemo(() => {
    const set = new Set<WorkbenchStage>();
    for (let i = 0; i < maxProgressWorkbenchIndex; i++) {
      const sid = WORKBENCH_STAGES[i].id;
      if (isHalf && sid === 'report_generation') continue;
      set.add(sid);
    }
    if (workflow?.phase === 'completion' || (workflow as { phase?: string })?.phase === 'completed') {
      set.add('intelligent_optimization');
    }
    return set;
  }, [maxProgressWorkbenchIndex, workflow, isHalf]);

  // 半周期下，report_generation 永远是「已跳过」状态，加入 skipped 集合
  const skippedSet = useMemo(() => {
    const s = new Set<WorkbenchStage>();
    if (isHalf) s.add('report_generation');
    return s;
  }, [isHalf]);

  const handleIntakeComplete = (wf: GeoWorkflowDTO, cfg: BrandIntakeConfig) => {
    const sc = (cfg.subjectCategory ?? cfg.brand.category ?? '').trim();
    setBrand(sc ? brandWithSubjectCategory(cfg.brand, sc) : cfg.brand);
    setIntake(cfg);
    setWorkflow(wf);
    setCycleChosen(true);
    setForceSkipActive(false);
    if (sc) lastSyncedCategoryRef.current = null;
  };

  const patchIntake = useCallback(
    (patch: Partial<BrandIntakeConfig>) => {
      if (!brand) return;
      setIntake((prev) => {
        const base = prev ?? buildFallbackIntake(brand, workflow);
        return { ...base, ...patch };
      });
    },
    [brand, workflow]
  );

  const effectiveIntake = useMemo((): BrandIntakeConfig | null => {
    if (intake) return intake;
    if (!brand) return null;
    return buildFallbackIntake(brand, workflow);
  }, [intake, brand, workflow]);

  /** 展示与诊断：用户填写的行业覆盖品牌库历史 category */
  const effectiveBrand = useMemo((): SelectedBrand | null => {
    if (!brand) return null;
    const sc = resolveUserSubjectCategory(effectiveIntake, workflow, brand);
    return brandWithSubjectCategory(brand, sc);
  }, [brand, effectiveIntake, workflow]);

  const lastSyncedCategoryRef = useRef<string | null>(null);

  /** 用户行业与品牌库不一致时，回写 brands 表（本次会话内去重） */
  useEffect(() => {
    if (!brand) return;
    const sc = resolveUserSubjectCategory(effectiveIntake, workflow, brand);
    if (!sc || brand.category === sc) return;
    if (lastSyncedCategoryRef.current === sc) return;
    lastSyncedCategoryRef.current = sc;
    setBrand((prev) => (prev ? brandWithSubjectCategory(prev, sc) : prev));
    if (!isPersistableBrandSlug(brand.brand_id)) return;
    void brandsAPI
      .updateBrand(brand.brand_id, {
        name: brand.name,
        category: sc,
        brand_introduction: brand.brand_introduction ?? null,
        knowledge_base_id: brand.knowledge_base_id ?? null,
      })
      .catch(() => {
        lastSyncedCategoryRef.current = null;
      });
  }, [brand, effectiveIntake, workflow]);

  const handleAdvanced = useCallback(
    (
      wf: GeoWorkflowDTO,
      opts?: { preferStage?: WorkbenchStage; forceSkip?: boolean; kickoffDiagnosis?: boolean }
    ) => {
      if (opts?.forceSkip) {
        setForceSkipActive(true);
        setWorkflow(applyForcedSkipWorkflow(wf));
        return;
      }
      setForceSkipActive(false);
      if (opts?.kickoffDiagnosis) {
        setKickoffDiagnosis(true);
      }
      setWorkflow(wf);
    },
    []
  );

  const renderStage = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <span className="text-xs">{t('workbench.loadingWorkflow')}</span>
        </div>
      );
    }
    if (bootError) {
      return (
        <div className="max-w-2xl mx-auto mt-12 rounded-2xl border border-red-100 bg-red-50/50 px-6 py-8 text-center">
          <div className="text-sm font-semibold text-red-600">{t('workbench.loadFailed')}</div>
          <div className="mt-2 text-xs text-red-500">{bootError}</div>
          <button type="button" onClick={onExit} className="mt-4 btn-geo-secondary">
            <ArrowLeft className="w-4 h-4" />
            {t('navigation.back')}
          </button>
        </div>
      );
    }

    switch (authoritativeStage) {
      case 'brand_input':
        return (
          <BrandInputStage
            initialBrand={brand}
            initialConfig={intake}
            onIntakeComplete={handleIntakeComplete}
            onBrandCreated={onBrandQuotaRefresh}
          />
        );
      case 'brand_parse':
        if (!effectiveBrand || !workflow) return null;
        return (
          <BrandParseStage
            brand={effectiveBrand}
            workflow={workflow}
            intake={effectiveIntake}
            userRole={userRole}
            onAdvanced={handleAdvanced}
            onWorkflowSynced={syncWorkflow}
            onJumpModule={onJumpModule}
          />
        );
      case 'report_generation':
        if (!effectiveBrand || !workflow) return null;
        // 半周期不应进入此分支（phaseToStage 已跳过），保险兜底
        if (isHalf) {
          return null;
        }
        return (
          <ReportGenerationStage
            brand={effectiveBrand}
            workflow={workflow}
            intake={effectiveIntake}
            userRole={userRole}
            kickoffDiagnosis={kickoffDiagnosis}
            onKickoffDiagnosisConsumed={() => setKickoffDiagnosis(false)}
            onAdvanced={handleAdvanced}
            onWorkflowSynced={setWorkflow}
          />
        );
      case 'intelligent_optimization':
        if (!effectiveBrand || !workflow) return null;
        if (skipAutoCockpit) {
          return (
            <IntelligentOptimizationHub
              brand={effectiveBrand}
              workflow={workflow}
              onEnterCockpit={() => onEnterCockpit?.(workflow.workflowId)}
              onAdvanced={handleAdvanced}
            />
          );
        }
        if (onEnterCockpit && serverInIntelligentOptimization) {
          const enteringKey =
            workflow.optimizationMarket === 'overseas'
              ? 'workbench.enteringCockpitOverseas'
              : 'workbench.enteringCockpit';
          return (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-xs">{t(enteringKey)}</span>
            </div>
          );
        }
        return (
          <IntelligentOptimizationStage
            brand={effectiveBrand}
            workflow={workflow}
            intake={effectiveIntake}
            onPatchIntake={patchIntake}
            onAdvanced={handleAdvanced}
            onJumpModule={onJumpModule}
          />
        );
      case 'completion':
        if (!effectiveBrand || !workflow) return null;
        return (
          <CompletionStage
            brand={effectiveBrand}
            workflow={workflow}
            onCreateNew={onExit}
            onOpenReport={(taskId) => setGeoReportTaskId(taskId)}
            onOpenOptimizationTask={(tid) =>
              onJumpModule?.(ModuleType.OPTIMIZATION_BOT, { workflowId: workflow.workflowId, taskId: tid })
            }
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col bg-[#F5F5F7]">
      <WorkbenchHeader
        brand={effectiveBrand ?? brand}
        workflow={workflow}
        currentStage={authoritativeStage}
        completedStages={completedSet}
        maxNavigableWorkbenchIndex={maxNavigableWorkbenchIndex}
        skippedStages={skippedSet}
        onExit={onExit}
        onBrandRenamed={(next) => setBrand(next)}
      />

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden px-6 py-6 lg:w-3/5">
          <div
            className={
              authoritativeStage === 'brand_input'
                ? 'flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden'
                : 'flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto'
            }
          >
            {renderStage()}
          </div>
        </main>
        <div className="h-72 shrink-0 lg:min-h-0 lg:h-auto lg:w-2/5 lg:min-w-[320px]">
          <AgentSidePanel
            stage={authoritativeStage}
            brandName={brand?.name ?? null}
            workflowId={workflow?.workflowId ?? null}
            onOpenModule={onJumpModule}
            stream={
              workflow?.workflowId
                ? {
                    richItems,
                    lastSeq,
                    sendChat: sendChatStream,
                    streamLoading,
                    threadId: streamThreadId,
                  }
                : null
            }
          />
        </div>
      </div>

      {geoReportTaskId ? (
        <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-[#F5F5F7]">
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            }
          >
            <GeoBrandReportMiniLayout
              theme="light"
              taskId={geoReportTaskId}
              onBack={() => setGeoReportTaskId(null)}
              backButtonLabel={t('workbench.backToWorkflow')}
            />
          </Suspense>
        </div>
      ) : null}
    </div>
  );
};

export default OptimizationWorkbench;
