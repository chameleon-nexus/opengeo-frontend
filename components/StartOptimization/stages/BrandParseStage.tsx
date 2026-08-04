import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  FileText,
  HelpCircle,
  Loader2,
  Network,
  Pencil,
  Plus,
  Sparkles,
  X,
} from 'lucide-react';
import {
  geoWorkflowAPI,
  type GeoDiagnosisQuestionDTO,
  type GeoWorkflowDTO,
} from '../../../api/geoWorkflow';
import { GEO_QUESTION_INTENT } from '../types';
import type { BrandIntakeConfig, SelectedBrand, WorkbenchStage } from '../types';
import {
  mergeGroupKeywords,
  readCoreKeywordGroupsFromWorkflow,
  readDiagnosisRegionWords,
} from '../types';
import { useBrandParseFlow } from '../hooks/useBrandParseFlow';
import { ModuleType } from '../../../types';
import { resolveUserSubjectCategories, resolveUserSubjectCategory } from '../../../utils/resolveUserSubjectCategory';
import { ensureInferPlaceholderGroups } from '../../../utils/coreKeywordGroups';
import IndustryKeywordGroupsEditor, {
  editorRowsToGroups,
  groupsToEditorRows,
  type IndustryKeywordGroupRow,
} from '../shared/IndustryKeywordGroupsEditor';
import StringTagsInput from '../shared/StringTagsInput';
import {
  composeDiagnosisQuestion,
  industryWordFromSubjectCategory,
  signatureFromGroups,
  splitDiagnosisQuestion,
  type DiagnosisQuestionParts,
} from '../../../utils/diagnosisQuestionParts';
import {
  downloadExcelHtmlTable,
  sanitizeExportFilenamePart,
} from '../../../utils/downloadSpreadsheet';
import { expandGeoKeywordsForExport } from '../../../utils/geoKeywordExpand';
import { useModuleI18n } from '../../../i18n/hooks';
import { formatThrownError } from '../../../lib/formatApiError';
import { canSelectOverseasOptimizationMarket } from '../../../utils/optimizationMarketAccess';
import type { UserRole } from '../../../types';
import OptimizationMarketModal, {
  type OptimizationMarketSelection,
} from '../shared/OptimizationMarketModal';

interface CompetitorItem {
  id: string;
  text: string;
}

function initGroupRows(wf: GeoWorkflowDTO, intake: BrandIntakeConfig | null): IndustryKeywordGroupRow[] {
  const fromWf = readCoreKeywordGroupsFromWorkflow(wf);
  if (fromWf.some((g) => g.keywords.length > 0)) {
    return groupsToEditorRows(fromWf);
  }
  const cats = resolveUserSubjectCategories(intake, wf);
  if (cats.length) {
    return cats.map((industry) => ({ industry, keywords: [] }));
  }
  return [{ industry: '', keywords: [] }];
}

type BrandParseSubStep = 'word_pack' | 'questions_ready' | 'competitors_ready';

function competitorNamesFromWorkflow(wf: GeoWorkflowDTO): string[] {
  return (wf.configuredCompetitors ?? []).map((s) => String(s).trim()).filter(Boolean);
}

function competitorItemsFromNames(names: string[]): CompetitorItem[] {
  return names.map((text, i) => ({
    id: `cmp-${i}-${text}`,
    text,
  }));
}

interface Props {
  brand: SelectedBrand;
  workflow: GeoWorkflowDTO;
  /** 第一步收集的配置；从「最新优化」入口直接进入时为 null（用 workflow.aiPlatforms 兜底） */
  intake: BrandIntakeConfig | null;
  onAdvanced: (
    wf: GeoWorkflowDTO,
    opts?: { preferStage?: WorkbenchStage; forceSkip?: boolean; kickoffDiagnosis?: boolean }
  ) => void;
  /** 挂载拉取最新 workflow 后回写父级（对齐后台完成的 advance / semanticSeoTaskId） */
  onWorkflowSynced?: (wf: GeoWorkflowDTO) => void;
  /** 跳转优化工具：知识库 / 知识图谱（须带 workflowId，与驾驶舱按主线隔离一致） */
  onJumpModule?: (
    m: ModuleType,
    opts?: { workflowId?: string; knowledgeBaseId?: number; taskId?: string }
  ) => void;
  userRole?: UserRole | null;
}

/** 导出按钮旁问号说明（hover / focus 显示） */
function ExportTipBubble({ text }: { text: string }) {
  return (
    <span className="relative inline-flex shrink-0 group/tip">
      <span
        tabIndex={0}
        role="img"
        aria-label={text}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:text-[#E8553F] cursor-help outline-none focus-visible:ring-2 focus-visible:ring-[#E8553F]/25"
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+8px)] right-0 z-30 w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[11px] leading-relaxed text-slate-600 shadow-md opacity-0 transition-opacity group-hover/tip:opacity-100 group-focus-within/tip:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

function ExportLinkWithTip({
  label,
  tip,
  disabled,
  onClick,
}: {
  label: string;
  tip: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="border-0 bg-transparent p-0 text-xs font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
      >
        {label}
      </button>
      <ExportTipBubble text={tip} />
    </span>
  );
}

const BrandParseStage: React.FC<Props> = ({
  brand,
  workflow,
  intake,
  onAdvanced,
  onWorkflowSynced,
  onJumpModule,
  userRole = null,
}) => {
  const { t: tr } = useModuleI18n('optimization');
  const canSelectOverseas = canSelectOverseasOptimizationMarket(userRole);
  const [groupRows, setGroupRows] = useState<IndustryKeywordGroupRow[]>(() => initGroupRows(workflow, intake));
  const [error, setError] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [buildingQuestions, setBuildingQuestions] = useState(false);
  const [rebuildingQuestions, setRebuildingQuestions] = useState(false);
  const [subStep, setSubStep] = useState<BrandParseSubStep>('word_pack');
  const [diagnosisQuestions, setDiagnosisQuestions] = useState<GeoDiagnosisQuestionDTO[]>([]);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [editQuestionParts, setEditQuestionParts] = useState<DiagnosisQuestionParts | null>(null);
  const [editQuestionCategory, setEditQuestionCategory] = useState('');
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [competitorItems, setCompetitorItems] = useState<CompetitorItem[]>([]);
  const [competitorDraft, setCompetitorDraft] = useState('');
  const [enteringCompetitors, setEnteringCompetitors] = useState(false);
  const [marketModalOpen, setMarketModalOpen] = useState(false);
  const [regionWords, setRegionWords] = useState<string[]>(() => readDiagnosisRegionWords(workflow));
  const [parsingIndustryIndex, setParsingIndustryIndex] = useState<number | null>(null);
  const builtInputSigRef = useRef<string | null>(null);
  const regionWordsDirtyRef = useRef(false);
  /** 用户已本地增删竞品时，勿被 workflow 恢复逻辑用服务端列表覆盖 */
  const competitorsDirtyRef = useRef(false);
  const diagnosisQuestionsRef = useRef<GeoDiagnosisQuestionDTO[]>([]);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistGroupsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rebuildQuestionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 用户主动返回词包编辑时，勿被 workflow 恢复逻辑拉回问句/竞品子步 */
  const subStepRestoreSuppressedRef = useRef(false);
  const lastParseIndustryRef = useRef<number | null>(null);
  const mountInitDoneForRef = useRef<string | null>(null);

  const parseFlow = useBrandParseFlow();
  const autoParseOnceRef = useRef(false);
  const onWorkflowSyncedRef = useRef(onWorkflowSynced);
  const runRef = useRef(parseFlow.run);
  const resumeRef = useRef(parseFlow.resumeFromWorkflow);
  const runFullRef = useRef(parseFlow.runFullWordPackPipeline);
  runRef.current = parseFlow.run;
  resumeRef.current = parseFlow.resumeFromWorkflow;
  runFullRef.current = parseFlow.runFullWordPackPipeline;
  onWorkflowSyncedRef.current = onWorkflowSynced;

  useEffect(() => {
    diagnosisQuestionsRef.current = diagnosisQuestions;
  }, [diagnosisQuestions]);

  useEffect(() => {
    regionWordsDirtyRef.current = false;
    competitorsDirtyRef.current = false;
    subStepRestoreSuppressedRef.current = false;
  }, [workflow.workflowId]);

  useEffect(() => {
    if (regionWordsDirtyRef.current) return;
    setRegionWords(readDiagnosisRegionWords(workflow));
  }, [workflow.workflowId, workflow.diagnosisRegionWords, workflow.diagnosisRegionWord]);

  const handleRegionWordsChange = useCallback((tags: string[]) => {
    regionWordsDirtyRef.current = true;
    setRegionWords(tags);
  }, []);

  const schedulePersistQuestions = useCallback(
    (qs: GeoDiagnosisQuestionDTO[], regions: string[]) => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      persistTimerRef.current = setTimeout(() => {
        void geoWorkflowAPI
          .patchDiagnosisQuestions(workflow.workflowId, qs, {
            region_words: regions,
          })
          .then((wf) => onWorkflowSynced?.(wf))
          .catch(() => {
            /* 静默失败，用户可再次编辑触发保存 */
          });
      }, 600);
    },
    [workflow.workflowId, onWorkflowSynced]
  );

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      if (persistGroupsTimerRef.current) clearTimeout(persistGroupsTimerRef.current);
      if (rebuildQuestionsTimerRef.current) clearTimeout(rebuildQuestionsTimerRef.current);
    };
  }, []);

  const scheduleServerRebuildQuestions = useCallback(
    (groups: ReturnType<typeof editorRowsToGroups>, regions: string[]) => {
      if (rebuildQuestionsTimerRef.current) clearTimeout(rebuildQuestionsTimerRef.current);
      rebuildQuestionsTimerRef.current = setTimeout(() => {
        void (async () => {
          if (builtInputSigRef.current === null) return;
          setRebuildingQuestions(true);
          setError(null);
          try {
            const wf = await geoWorkflowAPI.buildDiagnosisQuestions(workflow.workflowId, {
              core_keyword_groups: groups,
              question_intent: GEO_QUESTION_INTENT,
              region_words: regions.length ? regions : null,
            });
            const qs = wf.diagnosisQuestions ?? [];
            if (!qs.length) {
              throw new Error(tr('stages.brandParse.errors.generateQuestionsFailed'));
            }
            setDiagnosisQuestions(qs);
            builtInputSigRef.current = signatureFromGroups(groups, regions);
            regionWordsDirtyRef.current = false;
            onWorkflowSynced?.(wf);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg || tr('stages.brandParse.errors.buildQuestionsFailed'));
          } finally {
            setRebuildingQuestions(false);
          }
        })();
      }, 500);
    },
    [workflow.workflowId, onWorkflowSynced, tr]
  );

  useEffect(() => {
    autoParseOnceRef.current = false;
    mountInitDoneForRef.current = null;
    setGroupRows(initGroupRows(workflow, intake));
  }, [workflow.workflowId]);

  const schedulePersistGroups = useCallback(
    (rows: IndustryKeywordGroupRow[]) => {
      if (persistGroupsTimerRef.current) clearTimeout(persistGroupsTimerRef.current);
      persistGroupsTimerRef.current = setTimeout(() => {
        const groups = editorRowsToGroups(rows);
        const industries = groups.map((g) => g.industry).filter(Boolean);
        const flat = groups.flatMap((g) => g.keywords);
        const extId =
          parseFlow.result?.extractionTaskId?.trim() ||
          workflow.extractionTaskId?.trim() ||
          undefined;
        const payload: Parameters<typeof geoWorkflowAPI.advance>[1] = {};
        if (industries.length) {
          payload.subject_categories = industries;
          payload.subject_category = industries[0];
        }
        if (flat.length > 0 && groups.length > 0) {
          payload.persist_word_pack_only = true;
          payload.core_keyword_groups = groups;
          payload.core_keywords = flat;
          if (extId) payload.extraction_task_id = extId;
        }
        if (regionWords.length > 0) {
          payload.region_words = regionWords;
        }
        if (!payload.subject_categories && !payload.persist_word_pack_only) return;
        void geoWorkflowAPI
          .advance(workflow.workflowId, payload)
          .then((wf) => onWorkflowSyncedRef.current?.(wf))
          .catch(() => {
            /* 本地编辑仍保留，用户可重试解析或下一步 */
          });
      }, 600);
    },
    [workflow.workflowId, workflow.extractionTaskId, parseFlow.result?.extractionTaskId, regionWords]
  );

  const handleGroupRowsChange = useCallback(
    (rows: IndustryKeywordGroupRow[]) => {
      setGroupRows(rows);
      schedulePersistGroups(rows);
    },
    [schedulePersistGroups]
  );

  const intakeFilesSig = useMemo(
    () =>
      (intake?.files ?? [])
        .map((f) => `${f.name}:${f.size}`)
        .join('|'),
    [intake?.files]
  );

  const parseFinalizeCtx = useMemo(
    () => ({
      industries: resolveUserSubjectCategories(intake, workflow, brand),
      industry: resolveUserSubjectCategory(intake, workflow, brand),
      inferCategoriesByAi: Boolean(
        intake?.subjectCategoriesInferByAi ?? workflow.subjectCategoriesInferByAi
      ),
      workflowSubjectCategory: (workflow.subjectCategory ?? '').trim() || undefined,
      productName: (intake?.productName ?? workflow.productName ?? '').trim() || undefined,
      questionIntent: GEO_QUESTION_INTENT,
    }),
    [
      intake?.subjectCategories,
      intake?.subjectCategory,
      intake?.subjectCategoriesInferByAi,
      intake?.brand?.category,
      workflow.subjectCategory,
      workflow.subjectCategories,
      workflow.subjectCategoriesInferByAi,
      workflow.productName,
      brand.category,
      intake?.productName,
    ]
  );

  const currentGroups = useMemo(() => editorRowsToGroups(groupRows), [groupRows]);

  const effectiveGroups = useMemo(
    () =>
      ensureInferPlaceholderGroups(
        currentGroups,
        parseFinalizeCtx.industries,
        parseFinalizeCtx.inferCategoriesByAi
      ),
    [currentGroups, parseFinalizeCtx.industries, parseFinalizeCtx.inferCategoriesByAi]
  );

  const currentKeywords = useMemo(
    () => currentGroups.flatMap((g) => g.keywords),
    [currentGroups]
  );

  const effectiveKeywords = useMemo(
    () => effectiveGroups.flatMap((g) => g.keywords),
    [effectiveGroups]
  );


  const running =
    parseFlow.status === 'starting' ||
    parseFlow.status === 'polling_seo' ||
    parseFlow.status === 'finalizing' ||
    parseFlow.status === 'advancing';

  const parseLoading =
    !parseFlow.error &&
    (running || (effectiveKeywords.length === 0 && parseFlow.status !== 'done'));

  const applyParseResultToGroups = useCallback(
    (result: NonNullable<typeof parseFlow.result>, _targetIndex: number | null) => {
      const { coreKeywordGroups, coreKeywords } = result;
      const normalized =
        coreKeywordGroups.length > 0
          ? coreKeywordGroups
          : mergeGroupKeywords([], parseFinalizeCtx.industry ?? '该品类', coreKeywords);
      setGroupRows(groupsToEditorRows(normalized));
      setSubStep('word_pack');
      setDiagnosisQuestions([]);
      builtInputSigRef.current = null;
    },
    [parseFinalizeCtx.industry]
  );

  // hook 跑完后 sync 到本地 groupRows
  useEffect(() => {
    if (parseFlow.status === 'done' && parseFlow.result) {
      const idx = lastParseIndustryRef.current;
      lastParseIndustryRef.current = null;
      applyParseResultToGroups(parseFlow.result, idx);
      setParsingIndustryIndex(null);
    }
  }, [parseFlow.status, parseFlow.result, applyParseResultToGroups]);

  useEffect(() => {
    if (parseFlow.status === 'done' && parseFlow.result?.workflow) {
      onWorkflowSyncedRef.current?.(parseFlow.result.workflow);
    }
  }, [parseFlow.status, parseFlow.result]);

  /**
   * 每个 workflow 仅初始化一次：GET 对齐 DB，必要时自动解析词包。
   * 勿把 workflow.subjectCategories 等放入 deps，否则 sync 后会反复 GET 并重置本地编辑。
   */
  useEffect(() => {
    const wid = workflow.workflowId;
    if (!wid || mountInitDoneForRef.current === wid) return;
    mountInitDoneForRef.current = wid;
    let cancelled = false;

    void (async () => {
      try {
        const fresh = await geoWorkflowAPI.get(wid);
        if (cancelled) return;
        onWorkflowSyncedRef.current?.(fresh);
        const wfGroups = readCoreKeywordGroupsFromWorkflow(fresh);
        if (wfGroups.some((g) => g.keywords.length > 0)) {
          setGroupRows(groupsToEditorRows(wfGroups));
        }

        const kws = fresh.coreKeywords ?? [];
        if (autoParseOnceRef.current) return;
        const inWordPack =
          fresh.phase === 'brand_parse' || fresh.phase === 'brand_analysis';
        if (!inWordPack || kws.length > 0) return;

        autoParseOnceRef.current = true;

        const needResumeSeo =
          !!fresh.semanticSeoTaskId?.trim() && !fresh.extractionTaskId?.trim();

        if (needResumeSeo) {
          await parseFlow.pollSemanticSeo(fresh.semanticSeoTaskId);
        }

        const industriesForParse =
          fresh.subjectCategories?.map((x) => x.trim()).filter(Boolean) ??
          resolveUserSubjectCategories(intake, fresh, brand);

        await runFullRef.current({
          workflowId: wid,
          brandName: brand.name,
          files: needResumeSeo ? [] : (intake?.files ?? []),
          enableKnowledgeGraph: needResumeSeo ? false : (intake?.enableKnowledgeGraph ?? false),
          existingKnowledgeBaseId: fresh.knowledgeBaseId ?? null,
          existingSemanticSeoTaskId: fresh.semanticSeoTaskId ?? null,
          industry: resolveUserSubjectCategory(intake, fresh, brand),
          workflowSubjectCategory: (fresh.subjectCategory ?? '').trim() || undefined,
          productName: (intake?.productName ?? fresh.productName ?? '').trim() || undefined,
          questionIntent: GEO_QUESTION_INTENT,
          inferCategoriesByAi: Boolean(
            intake?.subjectCategoriesInferByAi ?? fresh.subjectCategoriesInferByAi
          ),
          industries: industriesForParse,
        });
      } catch (e: unknown) {
        const msg = formatThrownError(e, tr('stages.brandParse.errors.generateWordPackFailed'));
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workflow.workflowId, brand.name, intake, intakeFilesSig]);

  const invalidateQuestionsPreview = () => {
    setSubStep('word_pack');
    setDiagnosisQuestions([]);
    setEditingQuestionIndex(null);
    setEditQuestionParts(null);
    setEditQuestionCategory('');
    builtInputSigRef.current = null;
  };

  const tryRestoreQuestionsPreview = useCallback(
    (wf: GeoWorkflowDTO, groups: ReturnType<typeof editorRowsToGroups>) => {
      const qs = wf.diagnosisQuestions ?? [];
      const regions = readDiagnosisRegionWords(wf);
      const sig = signatureFromGroups(groups, regionWords.length ? regionWords : regions);
      const wfSig = signatureFromGroups(readCoreKeywordGroupsFromWorkflow(wf), regions);
      if (qs.length > 0 && effectiveKeywords.length > 0 && sig === wfSig) {
        setDiagnosisQuestions(qs);
        if (!regionWordsDirtyRef.current) {
          setRegionWords(regions);
        }
        builtInputSigRef.current = sig;
        if (subStepRestoreSuppressedRef.current) {
          return;
        }
        if (wf.configuredCompetitors !== null && wf.configuredCompetitors !== undefined) {
          if (!competitorsDirtyRef.current) {
            setCompetitorItems(competitorItemsFromNames(competitorNamesFromWorkflow(wf)));
          }
          setSubStep('competitors_ready');
        } else {
          setSubStep('questions_ready');
        }
      }
    },
    [effectiveKeywords.length, regionWords]
  );

  useEffect(() => {
    if (builtInputSigRef.current === null) return;
    const groupsForPreview = parseFinalizeCtx.inferCategoriesByAi ? effectiveGroups : currentGroups;
    const sig = signatureFromGroups(groupsForPreview, regionWords);
    if (sig === builtInputSigRef.current) return;

    if (currentKeywords.length === 0 && !parseFinalizeCtx.inferCategoriesByAi) {
      invalidateQuestionsPreview();
      return;
    }

    scheduleServerRebuildQuestions(groupsForPreview, regionWords);
  }, [
    currentGroups,
    effectiveGroups,
    currentKeywords.length,
    parseFinalizeCtx.inferCategoriesByAi,
    regionWords,
    scheduleServerRebuildQuestions,
  ]);

  useEffect(() => {
    if (workflow.workflowId && (workflow.diagnosisQuestions?.length ?? 0) > 0) {
      tryRestoreQuestionsPreview(workflow, currentGroups);
    }
  }, [
    workflow.workflowId,
    workflow.diagnosisQuestions,
    workflow.diagnosisRegionWords,
    workflow.diagnosisRegionWord,
    workflow.configuredCompetitors,
    workflow.coreKeywordGroups,
    workflow.coreKeywords,
    currentGroups,
    tryRestoreQuestionsPreview,
  ]);

  const runParseForIndustry = async (industry: string, groupIndex: number) => {
    setError(null);
    setParsingIndustryIndex(groupIndex);
    lastParseIndustryRef.current = groupIndex;
    try {
      const industryTrimmed = industry.trim();
      await parseFlow.parseKeywordsBatch({
        workflowId: workflow.workflowId,
        brandName: brand.name,
        industries: [industryTrimmed],
        knowledgeBaseId: workflow.knowledgeBaseId ?? null,
        productName: parseFinalizeCtx.productName,
        questionIntent: parseFinalizeCtx.questionIntent,
        inferCategoriesByAi: parseFinalizeCtx.inferCategoriesByAi,
      });
    } catch (e: unknown) {
      lastParseIndustryRef.current = null;
      setParsingIndustryIndex(null);
      setError(e instanceof Error ? e.message : tr('stages.brandParse.errors.generateWordPackFailed'));
    }
  };

  const handleStartParse = async () => {
    setError(null);
    lastParseIndustryRef.current = null;
    const industries =
      groupRows.map((g) => g.industry.trim()).filter(Boolean);
    const industriesForParse = industries.length ? industries : parseFinalizeCtx.industries;
    try {
      await parseFlow.runFullWordPackPipeline({
        workflowId: workflow.workflowId,
        brandName: brand.name,
        files: intake?.files ?? [],
        enableKnowledgeGraph: intake?.enableKnowledgeGraph ?? false,
        existingKnowledgeBaseId: workflow.knowledgeBaseId ?? null,
        existingSemanticSeoTaskId: workflow.semanticSeoTaskId ?? null,
        industry: parseFinalizeCtx.industry,
        workflowSubjectCategory: parseFinalizeCtx.workflowSubjectCategory,
        productName: parseFinalizeCtx.productName,
        questionIntent: parseFinalizeCtx.questionIntent,
        inferCategoriesByAi: parseFinalizeCtx.inferCategoriesByAi,
        industries: industriesForParse,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tr('stages.brandParse.errors.generateWordPackFailed'));
    }
  };

  const extractionTaskId = useMemo(
    () =>
      parseFlow.result?.extractionTaskId?.trim() ||
      workflow.extractionTaskId?.trim() ||
      '',
    [parseFlow.result?.extractionTaskId, workflow.extractionTaskId]
  );

  const brandParseDone = extractionTaskId.length > 0 && effectiveKeywords.length > 0;
  const wordPackNextDisabled = advancing || parseLoading || buildingQuestions || rebuildingQuestions || !brandParseDone;
  const wordPackNextDisabledTitle = parseLoading
    ? tr('stages.brandParse.parsingInProgress')
    : effectiveKeywords.length === 0
      ? tr('stages.brandParse.addKeywordsFirst')
      : !extractionTaskId
        ? tr('stages.brandParse.completeParseFirst')
        : '';

  const showDiagnosisQuestions = diagnosisQuestions.length > 0 && subStep !== 'word_pack';

  const questionsStepActive = subStep === 'questions_ready' && showDiagnosisQuestions;
  const competitorsStepActive = subStep === 'competitors_ready' && showDiagnosisQuestions;

  const questionEditing = editingQuestionIndex !== null;
  const questionsNextDisabled =
    advancing ||
    parseLoading ||
    buildingQuestions ||
    rebuildingQuestions ||
    savingQuestion ||
    questionEditing ||
    enteringCompetitors ||
    !questionsStepActive;

  const competitorNames = useMemo(
    () => competitorItems.map((x) => x.text.trim()).filter(Boolean),
    [competitorItems]
  );

  const exitActionsDisabled =
    advancing ||
    parseLoading ||
    buildingQuestions ||
    rebuildingQuestions ||
    savingQuestion ||
    questionEditing ||
    enteringCompetitors ||
    !competitorsStepActive;

  const editIndustryWord = useMemo(
    () => industryWordFromSubjectCategory(editQuestionCategory || parseFinalizeCtx.industry || ''),
    [editQuestionCategory, parseFinalizeCtx.industry]
  );

  const handleStartEditQuestion = (index: number) => {
    const q = diagnosisQuestions[index];
    if (!q) return;
    const core = (q.base_keyword ?? '').trim();
    const qCategory = (q.subject_category ?? parseFinalizeCtx.industry ?? '').trim();
    const qRegion = (q.region_word ?? regionWords[0] ?? '').trim();
    const parsed = splitDiagnosisQuestion(q.text, core, qCategory, qRegion);
    const parts: DiagnosisQuestionParts = {
      region: parsed.region || qRegion,
      core,
      industry: industryWordFromSubjectCategory(qCategory),
      suffix: parsed.suffix,
      parseOk: parsed.parseOk,
    };
    setEditingQuestionIndex(index);
    setEditQuestionParts(parts);
    setEditQuestionCategory(qCategory);
    setError(parts.parseOk ? null : tr('stages.brandParse.errors.parseSuffixFailed'));
  };

  const handleCancelEditQuestion = () => {
    setEditingQuestionIndex(null);
    setEditQuestionParts(null);
    setEditQuestionCategory('');
  };

  const updateEditQuestionSuffix = (value: string) => {
    setEditQuestionParts((prev) => (prev ? { ...prev, suffix: value } : prev));
  };

  const handleSaveEditQuestion = async () => {
    if (editingQuestionIndex === null || !editQuestionParts) return;
    const { core, suffix } = editQuestionParts;
    if (!suffix.trim()) {
      setError(tr('stages.brandParse.errors.suffixRequired'));
      return;
    }
    const trimmed = composeDiagnosisQuestion({
      region: editQuestionParts.region || (diagnosisQuestions[editingQuestionIndex]?.region_word ?? regionWords[0] ?? '').trim(),
      core,
      industry: editIndustryWord,
      suffix,
    });
    if (!core || !trimmed.includes(core)) {
      setError(tr('stages.brandParse.errors.questionMustIncludeKeyword'));
      return;
    }
    const next = diagnosisQuestions.map((q, i) =>
      i === editingQuestionIndex ? { ...q, text: trimmed } : q
    );
    setSavingQuestion(true);
    setError(null);
    try {
      const wf = await geoWorkflowAPI.patchDiagnosisQuestions(workflow.workflowId, next, {
        region_words: regionWords,
      });
      const qs = wf.diagnosisQuestions ?? next;
      setDiagnosisQuestions(qs);
      setEditingQuestionIndex(null);
      setEditQuestionParts(null);
      setEditQuestionCategory('');
      onWorkflowSynced?.(wf);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || tr('stages.brandParse.errors.saveQuestionFailed'));
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleBackToWordPack = () => {
    if (rebuildQuestionsTimerRef.current) {
      clearTimeout(rebuildQuestionsTimerRef.current);
      rebuildQuestionsTimerRef.current = null;
    }
    subStepRestoreSuppressedRef.current = true;
    setRebuildingQuestions(false);
    setSubStep('word_pack');
    setEditingQuestionIndex(null);
    setEditQuestionParts(null);
    setEditQuestionCategory('');
    setError(null);
  };

  const handleBuildQuestions = async () => {
    if (wordPackNextDisabled) {
      const hint =
        wordPackNextDisabledTitle || tr('stages.brandParse.errors.completeParseFirst');
      if (hint) setError(hint);
      return;
    }
    subStepRestoreSuppressedRef.current = false;
    setError(null);
    const final = effectiveKeywords;
    const groups = effectiveGroups;
    if (final.length === 0) {
      setError(tr('stages.brandParse.errors.minOneKeyword'));
      return;
    }
    if (!extractionTaskId) {
      setError(tr('stages.brandParse.errors.completeParseFirst'));
      return;
    }

    setBuildingQuestions(true);
    try {
      const wf = await geoWorkflowAPI.buildDiagnosisQuestions(workflow.workflowId, {
        core_keyword_groups: groups,
        question_intent: GEO_QUESTION_INTENT,
        region_words: regionWords.length ? regionWords : null,
      });
      const qs = wf.diagnosisQuestions ?? [];
      if (!qs.length) {
        throw new Error(tr('stages.brandParse.errors.generateQuestionsFailed'));
      }
      setDiagnosisQuestions(qs);
      setSubStep('questions_ready');
      builtInputSigRef.current = signatureFromGroups(groups, regionWords);
      regionWordsDirtyRef.current = false;
      onWorkflowSynced?.(wf);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || tr('stages.brandParse.errors.buildQuestionsFailed'));
    } finally {
      setBuildingQuestions(false);
    }
  };

  const persistCompetitors = async (): Promise<GeoWorkflowDTO> => {
    const wf = await geoWorkflowAPI.patchConfiguredCompetitors(workflow.workflowId, competitorNames);
    competitorsDirtyRef.current = false;
    return wf;
  };

  const handleGoToCompetitors = async () => {
    if (questionsNextDisabled) return;
    subStepRestoreSuppressedRef.current = false;
    competitorsDirtyRef.current = false;
    setError(null);
    setEnteringCompetitors(true);
    try {
      const wf = await geoWorkflowAPI.patchConfiguredCompetitors(workflow.workflowId, []);
      setCompetitorItems([]);
      setCompetitorDraft('');
      setSubStep('competitors_ready');
      onWorkflowSynced?.(wf);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || tr('stages.brandParse.errors.enterCompetitorsFailed'));
    } finally {
      setEnteringCompetitors(false);
    }
  };

  const addCompetitor = () => {
    const t = competitorDraft.trim();
    if (!t) return;
    const brandKey = brand.name.trim().toLowerCase().replace(/\s+/g, '');
    const tKey = t.toLowerCase().replace(/\s+/g, '');
    if (tKey === brandKey) {
      setError(tr('stages.brandParse.errors.competitorSameAsBrand'));
      return;
    }
    const dup = competitorItems.some((c) => c.text.toLowerCase().replace(/\s+/g, '') === tKey);
    if (dup) {
      setCompetitorDraft('');
      return;
    }
    competitorsDirtyRef.current = true;
    setCompetitorItems((prev) => [
      ...prev,
      { id: `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: t },
    ]);
    setCompetitorDraft('');
    setError(null);
  };

  const removeCompetitor = (id: string) => {
    competitorsDirtyRef.current = true;
    setCompetitorItems((prev) => prev.filter((x) => x.id !== id));
  };

  const handleSkipToOptimization = () => {
    if (exitActionsDisabled || advancing) return;
    setError(null);
    const final = effectiveKeywords;
    if (final.length === 0) {
      setError(tr('stages.brandParse.errors.minOneKeyword'));
      return;
    }
    if (!extractionTaskId) {
      setError(tr('stages.brandParse.errors.realWordPackRequired'));
      return;
    }
    setMarketModalOpen(true);
  };

  const handleConfirmSkipToOptimization = async (selection: OptimizationMarketSelection) => {
    if (advancing) return;
    setError(null);
    const final = effectiveKeywords;
    const groups = effectiveGroups;
    const taskId = extractionTaskId || undefined;
    if (final.length === 0 || !taskId) return;

    setAdvancing(true);
    try {
      await persistCompetitors();
      const payload: Parameters<typeof geoWorkflowAPI.advance>[1] = {
        core_keyword_groups: groups,
        core_keywords: final,
        skip_report_generation: true,
        extraction_task_id: taskId,
        knowledge_base_id: brand.knowledge_base_id ?? null,
        optimization_market: selection.optimizationMarket,
      };
      if (selection.optimizationMarket === 'overseas') {
        payload.overseas_writing_language = selection.overseasWritingLanguage;
      }
      const wf = await geoWorkflowAPI.advance(workflow.workflowId, payload);
      setMarketModalOpen(false);
      onAdvanced(wf, { forceSkip: true });
      onWorkflowSynced?.(wf);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tr('stages.brandParse.errors.skipFailed'));
    } finally {
      setAdvancing(false);
    }
  };

  const handleAdvance = async () => {
    if (exitActionsDisabled) return;
    setError(null);
    const final = effectiveKeywords;
    const groups = effectiveGroups;
    if (final.length === 0) {
      setError(tr('stages.brandParse.errors.minOneKeyword'));
      return;
    }

    setAdvancing(true);
    try {
      const taskId = extractionTaskId || undefined;
      if (!taskId) {
        setError(running ? tr('stages.brandParse.errors.wordPackGenerating') : tr('stages.brandParse.errors.wordPackNotReady'));
        return;
      }

      await persistCompetitors();
      const nextWf = await geoWorkflowAPI.advance(workflow.workflowId, {
        extraction_task_id: taskId,
        core_keyword_groups: groups,
        core_keywords: final,
        knowledge_base_id: brand.knowledge_base_id ?? null,
      });
      onAdvanced(nextWf, { kickoffDiagnosis: true });
    } catch (e: any) {
      setError(e?.message || tr('stages.brandParse.errors.advanceFailed'));
    } finally {
      setAdvancing(false);
    }
  };

  const uploadedMaterialNames = useMemo(
    () => (intake?.files ?? []).map((f) => f.name).filter(Boolean),
    [intake?.files]
  );

  /** 与品牌解析建库、主线回写一致，用于跳转「优化工具 · 知识库」 */
  const workflowKbId = useMemo(() => {
    const w = workflow.knowledgeBaseId ?? brand.knowledge_base_id;
    if (w == null || (typeof w === 'string' && w.trim() === '')) return null;
    const n = typeof w === 'number' ? w : Number(w);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [workflow.knowledgeBaseId, brand.knowledge_base_id]);

  const semanticSeoTid = useMemo(
    () => (workflow.semanticSeoTaskId ?? '').trim(),
    [workflow.semanticSeoTaskId]
  );

  const diagnosisExportRows = useMemo((): string[][] => {
    return diagnosisQuestions.map((q, i) => [
      String(i + 1),
      (q.region_word ?? regionWords[0] ?? '').trim(),
      (q.subject_category ?? '').trim(),
      (q.base_keyword ?? '').trim(),
      (q.text ?? '').trim(),
    ]);
  }, [diagnosisQuestions, regionWords]);

  const diagnosisExportFilenameBase = useMemo(() => {
    const brandPart = sanitizeExportFilenamePart(brand.name, tr('stages.brandParse.export.brandFallback'));
    const datePart = new Date().toISOString().slice(0, 10);
    return `${tr('stages.brandParse.export.diagnosisSheet')}_${brandPart}_${datePart}`;
  }, [brand.name]);

  const handleExportDiagnosisExcel = () => {
    if (diagnosisExportRows.length === 0) return;
    downloadExcelHtmlTable(
      `${diagnosisExportFilenameBase}.xls`,
      [
        tr('stages.brandParse.export.columns.index'),
        tr('stages.brandParse.export.columns.region'),
        tr('stages.brandParse.export.columns.industry'),
        tr('stages.brandParse.export.columns.keyword'),
        tr('stages.brandParse.export.columns.question'),
      ],
      diagnosisExportRows
    );
  };

  const expandedKeywordRows = useMemo((): string[][] => {
    return expandGeoKeywordsForExport({
      coreKeywordGroups: currentGroups,
      regionWords: regionWords,
    }).map((row) => [row.industry ?? '', row.core, row.phrase]);
  }, [currentGroups, regionWords]);

  const handleExportExpandedKeywords = () => {
    if (expandedKeywordRows.length === 0) return;
    const brandPart = sanitizeExportFilenamePart(brand.name, tr('stages.brandParse.export.brandFallback'));
    const datePart = new Date().toISOString().slice(0, 10);
    downloadExcelHtmlTable(
      `${tr('stages.brandParse.export.columns.expanded')}_${brandPart}_${datePart}.xls`,
      [
        tr('stages.brandParse.export.columns.keyword'),
        tr('stages.brandParse.export.columns.expanded'),
      ],
      expandedKeywordRows
    );
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4 px-2 py-2">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{tr('stages.brandParse.title')}</h2>
          </div>
          {parseFlow.status === 'error' ? (
            <button
              type="button"
              onClick={handleStartParse}
              disabled={running}
              className="btn-geo-secondary"
            >
              <Sparkles className="w-4 h-4" />
              {tr('stages.brandParse.regenerateWordPack')}
            </button>
          ) : null}
        </div>

        {uploadedMaterialNames.length > 0 ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-[#f8f9fb] px-3 py-2.5">
            <div className="mb-1.5 text-xs font-semibold text-[#374151]">
              {tr('stages.brandParse.uploadedMaterials', { count: uploadedMaterialNames.length })}
            </div>
            <ul className="space-y-1.5">
              {uploadedMaterialNames.map((name, i) => (
                <li key={`${name}-${i}`} className="flex items-start gap-2 text-xs text-[#111827]">
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                  <span className="min-w-0 break-all leading-snug">{name}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-relaxed text-[#64748b]">
              {tr('stages.brandParse.uploadedMaterialsHint')}
            </p>
          </div>
        ) : null}

        {onJumpModule ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#374151] transition-colors hover:border-[#E8553F]/35 hover:bg-[#FFF9F6]"
              onClick={() =>
                onJumpModule(ModuleType.KNOWLEDGE_BASE, {
                  workflowId: workflow.workflowId,
                  knowledgeBaseId: workflowKbId ?? undefined,
                })
              }
            >
              <Database className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
              {tr('stages.brandParse.viewKnowledgeBase')}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#374151] transition-colors hover:border-[#E8553F]/35 hover:bg-[#FFF9F6]"
              onClick={() =>
                onJumpModule(ModuleType.SEMANTIC_SEO, {
                  workflowId: workflow.workflowId,
                  taskId: semanticSeoTid || undefined,
                })
              }
            >
              <Network className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
              {tr('stages.brandParse.viewKnowledgeGraph')}
            </button>
          </div>
        ) : null}

        {/* 错误提示 */}
        {parseFlow.error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
            {tr('stages.brandParse.parseFailed', { error: parseFlow.error })}
          </div>
        )}

        <div className="mt-5">
          {parseLoading && currentKeywords.length === 0 ? (
            <div className="mb-4 text-center text-xs text-gray-400 py-4 border border-dashed border-gray-200 rounded-xl">
              <span className="inline-flex items-center justify-center gap-1.5 text-orange-700">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {tr('stages.brandParse.generatingWordPack')}
              </span>
            </div>
          ) : null}
          <IndustryKeywordGroupsEditor
            groups={groupRows}
            onChange={handleGroupRowsChange}
            onParseIndustry={(industry, idx) => void runParseForIndustry(industry, idx)}
            parsingIndustryIndex={parsingIndustryIndex}
            disabled={running || buildingQuestions || rebuildingQuestions}
            showParseButtons
          />
        </div>

        <div className="mt-4">
          <label className="mb-2 block text-xs font-semibold text-slate-500">
            {tr('stages.brandParse.regionWords')}
          </label>
          <StringTagsInput
            tags={regionWords}
            onChange={handleRegionWordsChange}
            placeholder={tr('stages.brandParse.regionWordPlaceholder')}
            addLabel={tr('stages.brandParse.add')}
            maxLength={40}
            disabled={rebuildingQuestions}
          />
          {showDiagnosisQuestions ? (
            <p className="mt-1.5 text-[11px] text-slate-500">
              {rebuildingQuestions ? (
                <span className="inline-flex items-center gap-1 text-orange-700">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {tr('stages.brandParse.rebuildingQuestionsFromInput')}
                </span>
              ) : (
                tr('stages.brandParse.regionWordsRebuildHint')
              )}
            </p>
          ) : null}
        </div>

        {showDiagnosisQuestions ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-[#f8f9fb] px-4 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-gray-900">{tr('stages.brandParse.diagnosisQuestionsTitle')}</div>
                <p className="mt-0.5 text-xs text-slate-500">{tr('stages.brandParse.diagnosisQuestionsCount', { count: diagnosisQuestions.length })}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <ExportLinkWithTip
                  label={tr('stages.brandParse.exportExpanded')}
                  tip={tr('stages.brandParse.exportExpandedTip')}
                  disabled={expandedKeywordRows.length === 0 || questionEditing}
                  onClick={handleExportExpandedKeywords}
                />
                <ExportLinkWithTip
                  label={tr('stages.brandParse.exportCore')}
                  tip={tr('stages.brandParse.exportCoreTip')}
                  disabled={diagnosisExportRows.length === 0 || questionEditing}
                  onClick={handleExportDiagnosisExcel}
                />
              </div>
            </div>
            <ul className="space-y-3">
              {diagnosisQuestions.map((q, i) => {
                const isEditing = editingQuestionIndex === i;
                return (
                  <li
                    key={`${q.base_keyword ?? 'q'}-${i}`}
                    className="rounded-lg border border-white bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm"
                  >
                    {isEditing && editQuestionParts ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {editQuestionParts.region ? (
                            <>
                              <span className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                                {editQuestionParts.region}
                              </span>
                              <span className="select-none text-base font-medium text-slate-300">+</span>
                            </>
                          ) : null}
                          <span className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            {editQuestionParts.core}
                          </span>
                          <span className="select-none text-base font-medium text-slate-300">+</span>
                          <span className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            {editIndustryWord}
                          </span>
                          <span className="select-none text-base font-medium text-slate-300">+</span>
                          <input
                            type="text"
                            value={editQuestionParts.suffix}
                            onChange={(e) => updateEditQuestionSuffix(e.target.value)}
                            placeholder={tr('stages.brandParse.suffixPlaceholder')}
                            className="min-w-[7rem] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50 sm:flex-none sm:w-40"
                            disabled={savingQuestion}
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEditQuestion}
                            disabled={savingQuestion}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-[#374151] hover:bg-slate-50 disabled:opacity-50"
                          >
                            {tr('common.cancel')}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSaveEditQuestion()}
                            disabled={savingQuestion || !editQuestionParts.suffix.trim()}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#E8553F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#d94a36] disabled:opacity-50"
                          >
                            {savingQuestion ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            {tr('common.save')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 leading-snug">{q.text}</p>
                          <button
                            type="button"
                            onClick={() => handleStartEditQuestion(i)}
                            disabled={savingQuestion || questionEditing}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-[#374151] transition hover:border-[#E8553F]/35 hover:bg-[#FFF9F6] disabled:opacity-50"
                            title={tr('stages.brandParse.editQuestion')}
                          >
                            <Pencil className="h-3 w-3" />
                            {tr('stages.brandParse.editQuestion')}
                          </button>
                        </div>
                        {q.base_keyword ? (
                          <p className="mt-1 text-[11px] text-slate-500">
                            {q.subject_category ? `${q.subject_category} · ` : ''}
                            {tr('stages.brandParse.fromKeyword', { keyword: q.base_keyword })}
                          </p>
                        ) : null}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {competitorsStepActive ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-[#f8f9fb] px-4 py-4">
            <div className="mb-1 text-sm font-semibold text-gray-900">{tr('stages.brandParse.competitorsTitle')}</div>
            <p className="mb-3 text-xs leading-relaxed text-slate-500">
              {tr('stages.brandParse.competitorsHint')}
            </p>
            {competitorItems.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {competitorItems.map((cmp) => (
                  <div
                    key={cmp.id}
                    className="relative inline-flex max-w-[min(100%,280px)] min-w-[72px] flex-col rounded-xl border border-violet-200 bg-violet-50 px-3 pb-2.5 pt-1.5 text-left text-violet-950 shadow-sm"
                  >
                    <div className="mb-1 flex items-start justify-between gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-700/90">
                        {tr('stages.brandParse.competitorTag')}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCompetitor(cmp.id)}
                        className="-mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-black/5 hover:text-slate-800 transition"
                        aria-label={tr('stages.brandParse.removeCompetitor', { name: cmp.text })}
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                    <span className="break-words text-sm font-medium leading-snug">{cmp.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-400">
                {tr('stages.brandParse.noCompetitors')}
              </div>
            )}
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={competitorDraft}
                onChange={(e) => setCompetitorDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCompetitor();
                  }
                }}
                placeholder={tr('stages.brandParse.competitorPlaceholder')}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50"
              />
              <button
                type="button"
                onClick={addCompetitor}
                disabled={!competitorDraft.trim()}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#374151] hover:border-orange-200 hover:bg-orange-50/50 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {tr('stages.brandParse.add')}
              </button>
            </div>
          </div>
        ) : null}

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        {subStep === 'word_pack' && diagnosisQuestions.length > 0 ? (
          <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {tr('stages.brandParse.backToWordPackHint')}
          </div>
        ) : null}

        {subStep === 'word_pack' ? (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => void handleBuildQuestions()}
              disabled={wordPackNextDisabled}
              className="btn-geo-primary"
              title={wordPackNextDisabledTitle}
            >
              {buildingQuestions ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {tr('stages.brandParse.buildingQuestions')}
                </>
              ) : (
                <>
                  {tr('common.next')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : subStep === 'questions_ready' ? (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleBackToWordPack}
              disabled={advancing || buildingQuestions || rebuildingQuestions || savingQuestion}
              className="btn-geo-secondary inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              {tr('stages.brandParse.backToWordPack')}
            </button>
            <button
              type="button"
              onClick={() => void handleGoToCompetitors()}
              disabled={questionsNextDisabled}
              className="btn-geo-primary"
              title={questionsNextDisabled ? tr('stages.brandParse.completeQuestionsFirst') : ''}
            >
              {enteringCompetitors ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {tr('brandList.loading')}
                </>
              ) : (
                <>
                  {tr('common.next')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleBackToWordPack}
              disabled={exitActionsDisabled || advancing}
              className="btn-geo-secondary inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              {tr('stages.brandParse.backToWordPack')}
            </button>
            <button
              type="button"
              onClick={handleSkipToOptimization}
              disabled={exitActionsDisabled || advancing}
              className="btn-geo-secondary"
              title={exitActionsDisabled ? tr('stages.brandParse.completeCompetitorsFirst') : ''}
            >
              {advancing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {tr('stages.brandParse.enteringOptimization')}
                </>
              ) : (
                tr('stages.brandParse.skipToOptimization')
              )}
            </button>
            <button
              type="button"
              onClick={() => void handleAdvance()}
              disabled={exitActionsDisabled || advancing}
              className="btn-geo-primary"
              title={exitActionsDisabled ? tr('stages.brandParse.completeCompetitorsFirst') : ''}
            >
              {advancing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {tr('stages.brandParse.advancing')}
                </>
              ) : (
                <>
                  {tr('stages.brandParse.enterReportGeneration')}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <OptimizationMarketModal
        open={marketModalOpen}
        onClose={() => setMarketModalOpen(false)}
        onConfirm={handleConfirmSkipToOptimization}
        busy={advancing}
        canSelectOverseas={canSelectOverseas}
      />
    </div>
  );
};

export default BrandParseStage;
