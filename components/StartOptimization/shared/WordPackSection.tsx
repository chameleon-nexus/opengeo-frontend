import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, RefreshCcw } from 'lucide-react';
import { geoWorkflowAPI, type GeoWorkflowDTO } from '../../../api/geoWorkflow';
import {
  GEO_QUESTION_INTENT,
  mergeGroupKeywords,
  readCoreKeywordGroupsFromWorkflow,
} from '../types';
import { optimizationTaskAPI } from '../../../api/optimizationTask';
import { useBrandParseFlow } from '../hooks/useBrandParseFlow';
import type { BrandIntakeConfig, SelectedBrand } from '../types';
import { resolveUserSubjectCategories, resolveUserSubjectCategory } from '../../../utils/resolveUserSubjectCategory';
import IndustryKeywordGroupsEditor, {
  editorRowsToGroups,
  groupsToEditorRows,
  type IndustryKeywordGroupRow,
} from './IndustryKeywordGroupsEditor';
import StringTagsInput from './StringTagsInput';
import { resolveDiagnosisRegionWords } from '../../../utils/coreKeywordGroups';
import { useModuleI18n } from '../../../i18n/hooks';

export interface WordPackSectionProps {
  brand: SelectedBrand;
  workflow: GeoWorkflowDTO;
  intake: BrandIntakeConfig | null;
  /** 当前生效的核心词（workflow 或 optimization task） */
  keywords: string[];
  extractionTaskId?: string | null;
  optimizationTaskId?: string | null;
  onKeywordsChange: (keywords: string[], extractionTaskId: string | null) => void;
  onWorkflowUpdated: (wf: GeoWorkflowDTO) => void;
  /** 任务详情刷新（应用词包到已创建任务后） */
  onTaskUpdated?: () => void;
  /** 智能优化页默认折叠，需要编辑时再展开 */
  defaultCollapsed?: boolean;
  /** 优化任务上的地域词快照（主线无地域词时回显） */
  taskDiagnosisRegionWords?: string[] | null;
}

function initGroupRows(wf: GeoWorkflowDTO, intake: BrandIntakeConfig | null): IndustryKeywordGroupRow[] {
  const fromWf = readCoreKeywordGroupsFromWorkflow(wf);
  if (fromWf.some((g) => g.keywords.length > 0)) {
    return groupsToEditorRows(fromWf);
  }
  const cats = resolveUserSubjectCategories(intake, wf, null);
  if (cats.length) {
    return cats.map((industry) => ({ industry, keywords: [] }));
  }
  return [{ industry: '', keywords: [] }];
}

const WordPackSection: React.FC<WordPackSectionProps> = ({
  brand,
  workflow,
  intake,
  keywords,
  extractionTaskId,
  optimizationTaskId,
  onKeywordsChange,
  onWorkflowUpdated,
  onTaskUpdated,
  defaultCollapsed = false,
  taskDiagnosisRegionWords,
}) => {
  const { t } = useModuleI18n('optimization');
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const [groupRows, setGroupRows] = useState<IndustryKeywordGroupRow[]>(() => initGroupRows(workflow, intake));
  const [regionWords, setRegionWords] = useState<string[]>(() =>
    resolveDiagnosisRegionWords(workflow, taskDiagnosisRegionWords)
  );
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [parsingIndustryIndex, setParsingIndustryIndex] = useState<number | null>(null);
  const [localExtractionId, setLocalExtractionId] = useState<string | null>(
    extractionTaskId?.trim() || workflow.extractionTaskId?.trim() || null
  );

  const parseFlow = useBrandParseFlow();

  const currentGroups = useMemo(() => editorRowsToGroups(groupRows), [groupRows]);
  const flatKeywords = useMemo(() => currentGroups.flatMap((g) => g.keywords), [currentGroups]);

  const parseFinalizeCtx = useMemo(
    () => ({
      industry: resolveUserSubjectCategory(intake, workflow, brand),
      workflowSubjectCategory: (workflow.subjectCategory ?? '').trim() || undefined,
      productName: (intake?.productName ?? workflow.productName ?? '').trim() || undefined,
      questionIntent: GEO_QUESTION_INTENT,
    }),
    [
      intake?.subjectCategories,
      intake?.subjectCategory,
      intake?.brand?.category,
      workflow.subjectCategory,
      brand.category,
      intake?.productName,
      workflow.productName,
    ]
  );

  useEffect(() => {
    setGroupRows(initGroupRows(workflow, intake));
  }, [workflow.workflowId, workflow.coreKeywordGroups, workflow.coreKeywords]);

  useEffect(() => {
    setRegionWords(resolveDiagnosisRegionWords(workflow, taskDiagnosisRegionWords));
  }, [
    workflow.workflowId,
    workflow.diagnosisRegionWords,
    workflow.diagnosisRegionWord,
    taskDiagnosisRegionWords,
  ]);

  useEffect(() => {
    setLocalExtractionId(extractionTaskId?.trim() || workflow.extractionTaskId?.trim() || null);
  }, [extractionTaskId, workflow.extractionTaskId]);

  useEffect(() => {
    if (parseFlow.status !== 'done' || !parseFlow.result) return;
    const { coreKeywordGroups, coreKeywords, extractionTaskId: extId, workflow: wf } = parseFlow.result;
    const normalized =
      coreKeywordGroups.length > 0
        ? coreKeywordGroups
        : mergeGroupKeywords([], parseFinalizeCtx.industry ?? '该品类', coreKeywords);
    setGroupRows(groupsToEditorRows(normalized));
    const kws = normalized.flatMap((g) => g.keywords);
    setLocalExtractionId(extId || null);
    onKeywordsChange(kws, extId || null);
    onWorkflowUpdated(wf);

    const tid = optimizationTaskId?.trim();
    if (tid) {
      void optimizationTaskAPI
        .patch(tid, {
          core_keywords: kws,
          extraction_task_id: extId || null,
        })
        .then(() => onTaskUpdated?.())
        .catch(() => {
          /* 用户可手动点「应用词包」重试 */
        });
    }
    setParsingIndustryIndex(null);
  }, [
    parseFlow.status,
    parseFlow.result,
    optimizationTaskId,
    onKeywordsChange,
    onWorkflowUpdated,
    onTaskUpdated,
    parseFinalizeCtx.industry,
  ]);

  const running =
    parseFlow.status === 'starting' ||
    parseFlow.status === 'polling_seo' ||
    parseFlow.status === 'finalizing' ||
    parseFlow.status === 'advancing';

  const hasLocalEdits = useMemo(() => {
    const a = flatKeywords;
    const b = keywords.map((k) => k.trim()).filter(Boolean);
    return a.length !== b.length || a.some((k, i) => k !== b[i]);
  }, [flatKeywords, keywords]);

  const keywordSummary = useMemo(() => {
    const regionPart =
      regionWords.length > 0
        ? t('wordpack.regionSummary', { count: regionWords.length, regions: regionWords.join('、') })
        : '';
    if (flatKeywords.length === 0) return regionPart || t('wordpack.noKeywords');
    const groupLabels = currentGroups
      .filter((g) => g.keywords.length)
      .map((g) => `${g.industry}(${g.keywords.length})`);
    const base =
      groupLabels.length <= 2 ? groupLabels.join('、') || flatKeywords.slice(0, 3).join('、') : t('wordpack.keywordSummaryMore', {
          preview: groupLabels.slice(0, 2).join('、'),
          count: flatKeywords.length,
        });
    if (!regionPart) return base;
    return `${base} · ${regionPart}`;
  }, [flatKeywords, currentGroups, regionWords, t]);

  useEffect(() => {
    if (!defaultCollapsed) return;
    const onOpen = () => setExpanded(true);
    window.addEventListener('workbench-open-word-pack', onOpen);
    return () => window.removeEventListener('workbench-open-word-pack', onOpen);
  }, [defaultCollapsed]);

  useEffect(() => {
    if (!defaultCollapsed) return;
    if (running || parseFlow.error || error) {
      setExpanded(true);
    }
  }, [defaultCollapsed, running, parseFlow.error, error]);

  const runParseForIndustry = async (industry: string, groupIndex: number) => {
    setError(null);
    setParsingIndustryIndex(groupIndex);
    const industryTrimmed = industry.trim();
    try {
      const seo = workflow.semanticSeoTaskId?.trim();
      const ext = workflow.extractionTaskId?.trim();
      if (seo && !ext) {
        await parseFlow.resumeFromWorkflow({
          workflowId: workflow.workflowId,
          brandName: brand.name,
          semanticSeoTaskId: workflow.semanticSeoTaskId ?? null,
          knowledgeBaseId: workflow.knowledgeBaseId ?? null,
          industry: industryTrimmed,
          workflowSubjectCategory: industryTrimmed,
          ...parseFinalizeCtx,
        });
      } else {
        await parseFlow.run({
          workflowId: workflow.workflowId,
          brandName: brand.name,
          files: intake?.files ?? [],
          enableKnowledgeGraph: intake?.enableKnowledgeGraph ?? false,
          industry: industryTrimmed,
          workflowSubjectCategory: industryTrimmed,
          ...parseFinalizeCtx,
        });
      }
    } catch (e: unknown) {
      setParsingIndustryIndex(null);
      setError(e instanceof Error ? e.message : t('wordpack.regenerateFailed'));
    }
  };

  const handleRegenerate = async () => {
    const first = groupRows.find((g) => g.industry.trim())?.industry.trim() || parseFinalizeCtx.industry || '';
    await runParseForIndustry(first, 0);
  };

  const applyWordPack = useCallback(async () => {
    setError(null);
    const groups = editorRowsToGroups(groupRows);
    const final = groups.flatMap((g) => g.keywords);
    if (final.length === 0) {
      setError(t('wordpack.minOneKeyword'));
      return;
    }
    setApplying(true);
    try {
      const wf = await geoWorkflowAPI.advance(workflow.workflowId, {
        core_keyword_groups: groups,
        core_keywords: final,
        extraction_task_id: localExtractionId || undefined,
        persist_word_pack_only: true,
        region_words: regionWords,
      });
      onWorkflowUpdated(wf);
      onKeywordsChange(final, localExtractionId);

      const tid = optimizationTaskId?.trim();
      if (tid) {
        await optimizationTaskAPI.patch(tid, {
          core_keywords: final,
          extraction_task_id: localExtractionId,
          diagnosis_region_words: regionWords.length ? regionWords : null,
        });
        onTaskUpdated?.();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('wordpack.applyFailed'));
    } finally {
      setApplying(false);
    }
  }, [
    groupRows,
    localExtractionId,
    regionWords,
    workflow.workflowId,
    optimizationTaskId,
    onWorkflowUpdated,
    onKeywordsChange,
    onTaskUpdated,
    t,
  ]);

  if (defaultCollapsed && !expanded) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title={t('wordpack.expandEdit')}
          aria-label={t('wordpack.expandEditAria')}
          className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-50/80"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-[#111827]">{t('wordpack.title')}</h3>
              {running ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-orange-700">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('wordpack.generating')}
                </span>
              ) : null}
              {hasLocalEdits ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                  {t('wordpack.pendingEdits')}
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs text-[#64748b]">
              {flatKeywords.length > 0
                ? t('wordpack.keywordCount', { count: flatKeywords.length, summary: keywordSummary })
                : keywordSummary}
            </p>
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
          <h3 className="text-base font-semibold text-[#111827]">{t('wordpack.title')}</h3>
          <p className="mt-1 text-xs text-[#64748b]">
            {t('wordpack.hint', {
              taskSuffix: optimizationTaskId ? t('wordpack.taskSuffix') : '',
            })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRegenerate()}
            disabled={running || applying}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-[#111827] shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${running ? 'animate-spin' : ''}`} aria-hidden />
            {running ? t('wordpack.generating') : t('wordpack.regenerate')}
          </button>
          {defaultCollapsed ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              title={t('wordpack.collapse')}
              aria-label={t('wordpack.collapseAria')}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-[#64748b] shadow-sm transition-colors hover:bg-slate-50"
            >
              <ChevronUp className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {running && parseFlow.statusHint ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-orange-100 bg-orange-50/60 px-3 py-2 text-xs text-orange-700">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {parseFlow.statusHint}
        </div>
      ) : null}
      {parseFlow.error ? (
        <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
          {parseFlow.error}
        </div>
      ) : null}

      <div className="mt-4">
        <IndustryKeywordGroupsEditor
          groups={groupRows}
          onChange={setGroupRows}
          onParseIndustry={(industry, idx) => void runParseForIndustry(industry, idx)}
          parsingIndustryIndex={parsingIndustryIndex}
          disabled={running || applying}
          showParseButtons
        />
      </div>

      <div className="mt-4">
        <label className="mb-2 block text-xs font-semibold text-slate-500">
          {t('stages.brandParse.regionWords')}
        </label>
        <StringTagsInput
          tags={regionWords}
          onChange={setRegionWords}
          placeholder={t('stages.brandParse.regionWordPlaceholder')}
          addLabel={t('stages.brandParse.add')}
          maxLength={40}
          disabled={running || applying}
        />
        {regionWords.length > 0 && flatKeywords.length > 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            {t('wordpack.regionScenarioHint', {
              core: flatKeywords.length,
              region: regionWords.length,
              total: flatKeywords.length * regionWords.length,
            })}
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={() => void applyWordPack()}
          disabled={applying || running || flatKeywords.length === 0}
          className="btn-geo-secondary"
        >
          {applying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('wordpack.applying')}
            </>
          ) : (
            t('wordpack.apply')
          )}
        </button>
      </div>
    </div>
  );
};

export default WordPackSection;
