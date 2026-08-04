import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Check, ChevronRight, Loader2, Plus } from 'lucide-react';
import { geoWorkflowAPI } from '../../api/geoWorkflow';
import {
  DRAFT_WORKFLOW_BRAND_NAME,
  DRAFT_WORKFLOW_PRODUCT_NAME,
  invalidateRecentWorkflowsCache,
} from '../../constants/geoWorkflow';
import type { GeoWorkflowDTO } from '../../api/geoWorkflow';
import TextBubble from './richMedia/cards/TextBubble';
import EventRouter from './richMedia/EventRouter';
import type { BaseRichItem } from './richMedia/types';
import { useRichMediaStream } from './richMedia/useRichMediaStream';
import KnowledgeBaseMaterialsUploadModal from './shared/KnowledgeBaseMaterialsUploadModal';
import { shouldOpenConversationForWorkflow } from '../../lib/workflowSidebar';
import { peekImIntakeFiles } from './shared/imIntakeFilesCache';
import type { BrandIntakeConfig, SelectedBrand, WorkbenchOpenParams, WorkbenchStage } from './types';
import { GEO_QUESTION_INTENT } from './types';
import { useModuleI18n } from '../../i18n/hooks';

type JumpItem = { id: string; workflowId: string; brandName: string };

interface Props {
  workflowId?: string | null;
  onJumpToWorkbench?: (params: WorkbenchOpenParams) => void;
  onConversationStarted?: () => void;
  onWorkflowUpdated?: () => void;
  onWorkflowIdAssigned?: (workflowId: string) => void;
  /** 跳过对话，直接进入工作台「新建优化」表单 */
  onDirectStartOptimization?: () => void;
}

function WorkflowJumpCard({
  brandName,
  workflowId,
  onJump,
  disabled,
}: {
  brandName: string;
  workflowId: string;
  onJump: () => void;
  disabled?: boolean;
}) {
  const { t } = useModuleI18n('conversation');
  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white px-4 py-3 text-left shadow-sm">
      <div className="flex items-start gap-2">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">
            {t('jumpCard.created', { brandName })}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {t('jumpCard.workflowHint', { workflowId })}
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={onJump}
            className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#E8553F] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {t('jumpCard.enterWorkbench')}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function mapOrchestratorPhaseToStage(phase?: string | null): WorkbenchStage {
  const p = (phase || '').trim();
  if (p === 'brand_parse' || p === 'brand_analysis') return 'brand_parse';
  if (p === 'report_generation' || p === 'diagnosis') return 'report_generation';
  if (p === 'intelligent_optimization' || p === 'monitoring') return 'intelligent_optimization';
  if (p === 'completion' || p === 'completed') return 'completion';
  return 'brand_parse';
}

/** IM 采集完成信号：仅 intake_complete / cycle_acked 或 phase 已进入解析品牌 */
function isIntakeReadyForWorkbenchJump(
  items: BaseRichItem[],
  phase?: string | null,
): boolean {
  const phaseNorm = (phase || '').toLowerCase();
  if (phaseNorm === 'brand_parse' || phaseNorm === 'brand_analysis') return true;
  return items.some(
    (it) => it.kind === 'cycle_acked' || it.kind === 'intake_complete',
  );
}

function brandFromRichItem(item: BaseRichItem): SelectedBrand | null {
  const d = item.data || {};
  const dbId = d.brandDbId ?? d.id;
  const slug = String(d.brandId ?? d.brand_id ?? '').trim();
  const name = String(d.brandName ?? d.name ?? '').trim();
  if (!name && !slug) return null;
  const numericId = typeof dbId === 'number' ? dbId : Number(dbId);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    if (!slug) return null;
    return {
      id: 0,
      brand_id: slug,
      name: name || slug,
      category: String(d.category ?? ''),
      brand_introduction:
        typeof d.brandIntroduction === 'string'
          ? d.brandIntroduction
          : typeof d.brand_introduction === 'string'
            ? d.brand_introduction
            : null,
      knowledge_base_id:
        typeof d.knowledgeBaseId === 'number'
          ? d.knowledgeBaseId
          : typeof d.knowledge_base_id === 'number'
            ? d.knowledge_base_id
            : null,
    };
  }
  return {
    id: numericId,
    brand_id: slug || String(numericId),
    name: name || slug,
    category: String(d.category ?? ''),
    brand_introduction:
      typeof d.brandIntroduction === 'string'
        ? d.brandIntroduction
        : typeof d.brand_introduction === 'string'
          ? d.brand_introduction
          : null,
    knowledge_base_id:
      typeof d.knowledgeBaseId === 'number'
        ? d.knowledgeBaseId
        : typeof d.knowledge_base_id === 'number'
          ? d.knowledge_base_id
          : null,
  };
}

const PLACEHOLDER_NAMES = new Set([
  DRAFT_WORKFLOW_BRAND_NAME,
  DRAFT_WORKFLOW_PRODUCT_NAME,
  '新优化',
]);

function isRealBrandName(name: string): boolean {
  const n = name.trim();
  return Boolean(n) && !PLACEHOLDER_NAMES.has(n);
}

function brandFromCycleAcked(item: BaseRichItem): SelectedBrand | null {
  const d = item.data || {};
  const name = String(d.brandName ?? d.brand_name ?? '').trim();
  if (!isRealBrandName(name)) return null;
  return {
    id: typeof d.brandDbId === 'number' ? d.brandDbId : typeof d.brandId === 'number' ? d.brandId : 0,
    brand_id: String(d.brandId ?? d.brand_id ?? name),
    name,
    category: String(d.subjectCategory ?? d.subject_category ?? ''),
    brand_introduction: null,
    knowledge_base_id: null,
  };
}

function productNameFromRichItems(items: BaseRichItem[]): string {
  for (const item of items) {
    const d = item.data || {};
    const p = String(d.productName ?? d.product_name ?? '').trim();
    if (p && !PLACEHOLDER_NAMES.has(p)) return p;
  }
  return '';
}

function subjectCategoriesFromRichItems(items: BaseRichItem[]): string[] {
  for (const item of items) {
    const d = item.data || {};
    const raw = d.subjectCategories ?? d.subject_categories;
    if (Array.isArray(raw)) {
      const cats = raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      if (cats.length) return cats;
    }
    const sc = String(d.subjectCategory ?? d.subject_category ?? '').trim();
    if (sc) return [sc];
  }
  return [];
}

function subjectCategoryFromRichItems(items: BaseRichItem[]): string {
  const cats = subjectCategoriesFromRichItems(items);
  return cats[0] ?? '';
}

function brandFromWorkflowDto(wf: GeoWorkflowDTO): SelectedBrand | null {
  const name = (wf.brandName || '').trim();
  if (!isRealBrandName(name)) return null;
  const dbId = wf.brandId;
  return {
    id: typeof dbId === 'number' && dbId > 0 ? dbId : 0,
    brand_id: typeof dbId === 'number' && dbId > 0 ? String(dbId) : name,
    name,
    category:
      (wf.subjectCategories && wf.subjectCategories[0]) ||
      (wf.subjectCategory || '').trim(),
    brand_introduction: null,
    knowledge_base_id: wf.knowledgeBaseId ?? null,
  };
}

function extractAiPlatformsFromRich(items: BaseRichItem[]): string[] {
  for (const item of items) {
    const raw = item.data?.aiPlatforms ?? item.data?.ai_platforms;
    if (Array.isArray(raw)) {
      return raw.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
    }
  }
  return [];
}

/**
 * 「开启新对话」页：与工作台右侧助手共用 useRichMediaStream / rich_media_log。
 */
const NewConversationPanel: React.FC<Props> = ({
  workflowId: initialWorkflowId,
  onJumpToWorkbench,
  onConversationStarted,
  onWorkflowUpdated,
  onWorkflowIdAssigned,
  onDirectStartOptimization,
}) => {
  const { t } = useModuleI18n('conversation');
  const [boundWorkflowId, setBoundWorkflowId] = useState<string | null>(
    initialWorkflowId?.trim() || null
  );
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [jumped, setJumped] = useState(false);
  const [jumpCards, setJumpCards] = useState<JumpItem[]>([]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const activeWorkflowIdRef = useRef<string | null>(initialWorkflowId?.trim() || null);
  const brandRef = useRef<SelectedBrand | null>(null);
  const pendingWorkbenchRef = useRef<WorkbenchOpenParams | null>(null);
  const autoJumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpedRef = useRef(false);
  const conversationStartedRef = useRef(false);

  const { richItems, sendChat, loading: streamLoading } = useRichMediaStream(boundWorkflowId);

  useEffect(() => {
    const id = initialWorkflowId?.trim() || null;
    if (id) {
      activeWorkflowIdRef.current = id;
      setBoundWorkflowId(id);
    }
  }, [initialWorkflowId]);

  const loading = streamLoading;
  const hasMessages = richItems.length > 0 || jumpCards.length > 0;
  const inputDisabled = loading || jumped;
  const filesSummary =
    files.length > 0 ? t('filesSelected', { count: files.length }) : null;

  const sortedRichItems = useMemo(
    () => [...richItems].sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0)),
    [richItems]
  );

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sortedRichItems, jumpCards, loading]);

  useEffect(() => {
    return () => {
      if (autoJumpTimerRef.current) clearTimeout(autoJumpTimerRef.current);
    };
  }, []);

  const focusInput = useCallback(() => {
    if (inputDisabled) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [inputDisabled]);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    if (!loading) focusInput();
  }, [loading, focusInput]);

  useEffect(() => {
    if (hasMessages) focusInput();
  }, [hasMessages, focusInput]);

  const notifyConversationStarted = () => {
    if (conversationStartedRef.current) return;
    conversationStartedRef.current = true;
    onConversationStarted?.();
  };

  const doJump = useCallback(() => {
    const params = pendingWorkbenchRef.current;
    if (!params || jumpedRef.current || !onJumpToWorkbench) return;
    if (autoJumpTimerRef.current) {
      clearTimeout(autoJumpTimerRef.current);
      autoJumpTimerRef.current = null;
    }
    jumpedRef.current = true;
    setJumped(true);
    onJumpToWorkbench(params);
  }, [onJumpToWorkbench]);

  const scheduleAutoJump = useCallback(
    (params: WorkbenchOpenParams) => {
      pendingWorkbenchRef.current = params;
      if (autoJumpTimerRef.current) clearTimeout(autoJumpTimerRef.current);
      autoJumpTimerRef.current = setTimeout(() => doJump(), 1500);
    },
    [doJump]
  );

  const maybeScheduleWorkbenchJump = useCallback(
    async (wfId: string, items: BaseRichItem[], phase?: string | null) => {
      if (jumpedRef.current || !wfId) return;
      if (!isIntakeReadyForWorkbenchJump(items, phase)) return;

      let wf: GeoWorkflowDTO;
      try {
        wf = await geoWorkflowAPI.get(wfId);
      } catch {
        return;
      }
      if (shouldOpenConversationForWorkflow(wf)) return;

      let brand = brandRef.current;
      for (const item of items) {
        if (item.kind === 'cycle_acked' || item.kind === 'intake_complete') {
          const fromAck = brandFromCycleAcked(item);
          if (fromAck) brand = fromAck;
        }
      }
      if (!brand) {
        const fromDb = brandFromWorkflowDto(wf);
        if (fromDb) brand = fromDb;
      }
      if (!brand) return;
      brandRef.current = brand;

      const richAiPlatforms = extractAiPlatformsFromRich(items);
      const aiPlatforms =
        richAiPlatforms.length > 0
          ? richAiPlatforms
          : (wf.aiPlatforms || []).filter((p) => typeof p === 'string' && p.trim());
      let overseas: string[] = [];
      for (const item of items) {
        const raw = item.data?.overseasAiPlatforms ?? item.data?.overseas_ai_platforms;
        if (Array.isArray(raw)) {
          overseas = raw.filter((p): p is string => typeof p === 'string' && p.trim().length > 0);
          break;
        }
      }
      if (!overseas.length && Array.isArray(wf.overseasAiPlatforms)) {
        overseas = wf.overseasAiPlatforms.filter((p) => typeof p === 'string' && p.trim());
      }
      const productName =
        productNameFromRichItems(items) ||
        String(wf.productName ?? '').trim();
      const subjectCategories =
        subjectCategoriesFromRichItems(items).length > 0
          ? subjectCategoriesFromRichItems(items)
          : wf.subjectCategories?.filter((c) => c?.trim()) ||
            (wf.subjectCategory ? [wf.subjectCategory.trim()] : []);
      const subjectCategory = subjectCategories[0] ?? '';
      const imFiles = peekImIntakeFiles(wfId);
      const mergedFiles = imFiles.length > 0 ? imFiles : files;
      const intake: BrandIntakeConfig = {
        brand,
        productName,
        subjectCategory: subjectCategory || undefined,
        subjectCategories: subjectCategories.length ? subjectCategories : undefined,
        questionIntent: GEO_QUESTION_INTENT,
        aiPlatforms: aiPlatforms.length ? aiPlatforms : [],
        overseasPlatforms: overseas,
        enableKnowledgeGraph: mergedFiles.length > 0,
        files: mergedFiles,
      };
      const brandName = brand.name || t('defaultBrandName');
      setJumpCards((prev) => {
        if (prev.some((j) => j.workflowId === wfId)) return prev;
        return [...prev, { id: `j-${Date.now()}`, workflowId: wfId, brandName }];
      });
      scheduleAutoJump({
        brand,
        workflowId: wfId,
        initialStage: mapOrchestratorPhaseToStage(wf.phase ?? phase),
        intake,
      });
      onWorkflowUpdated?.();
    },
    [files, onWorkflowUpdated, scheduleAutoJump]
  );

  /** 回放：从 rich_media 恢复 brandRef，不自动跳转工作台 */
  useEffect(() => {
    for (const item of sortedRichItems) {
      if (item.kind === 'brand_linked') {
        const linked = brandFromRichItem(item);
        if (linked) brandRef.current = linked;
      }
      if (item.kind === 'cycle_acked' || item.kind === 'intake_complete') {
        const fromAck = brandFromCycleAcked(item);
        if (fromAck) brandRef.current = fromAck;
      }
    }
  }, [sortedRichItems]);

  const ensureDraftWorkflow = useCallback(async (): Promise<string> => {
    const existing = activeWorkflowIdRef.current?.trim();
    if (existing) return existing;
    const wf = await geoWorkflowAPI.create({
      brand_name: DRAFT_WORKFLOW_BRAND_NAME,
      product_name: DRAFT_WORKFLOW_PRODUCT_NAME,
    });
    const id = (wf.workflowId || '').trim();
    if (!id) throw new Error(t('errors.createWorkflowFailed'));
    activeWorkflowIdRef.current = id;
    invalidateRecentWorkflowsCache();
    return id;
  }, []);

  const sendToOrchestrator = useCallback(
    async (message: string, formPayload?: Record<string, unknown>) => {
      notifyConversationStarted();
      const wid = await ensureDraftWorkflow();
      try {
        const out = await sendChat({
          message,
          workflowIdOverride: wid,
          formPayload: formPayload ?? undefined,
        });
        const wfId = (out.workflowId || wid).trim();
        if (wfId) {
          activeWorkflowIdRef.current = wfId;
          if (!boundWorkflowId) setBoundWorkflowId(wfId);
          onWorkflowIdAssigned?.(wfId);
        }
        onWorkflowUpdated?.();
        const phase = out.phase ?? out.currentStage ?? out.reactStage;
        const delta = (Array.isArray(out.richMedia) ? out.richMedia : []) as BaseRichItem[];
        for (const item of delta) {
          if (item.kind === 'brand_linked') {
            const linked = brandFromRichItem(item);
            if (linked) brandRef.current = linked;
          }
          if (item.kind === 'cycle_acked' || item.kind === 'intake_complete') {
            const fromAck = brandFromCycleAcked(item);
            if (fromAck) brandRef.current = fromAck;
          }
        }
        if (wfId && isIntakeReadyForWorkbenchJump(delta, phase)) {
          await maybeScheduleWorkbenchJump(wfId, delta, phase);
        }
      } catch (e: unknown) {
        throw e;
      }
    },
    [
      boundWorkflowId,
      ensureDraftWorkflow,
      maybeScheduleWorkbenchJump,
      onWorkflowIdAssigned,
      onWorkflowUpdated,
      sendChat,
    ]
  );

  const handleFormSubmit = useCallback(
    async (message: string, payload: Record<string, unknown>) => {
      await sendToOrchestrator(message, payload);
    },
    [sendToOrchestrator]
  );

  const handleSend = async () => {
    const text = input.trim();
    if (!text || inputDisabled) return;
    setInput('');
    try {
      await sendToOrchestrator(text);
    } catch (e: unknown) {
      setInput(text);
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[NewConversationPanel] send failed:', e);
      if (
        msg.includes('品牌创建已达上限') ||
        msg.includes('已达上限') ||
        msg.includes('积分不足') ||
        msg.includes('未关联商户')
      ) {
        window.alert(msg);
      }
    } finally {
      focusInput();
    }
  };

  const inputBox = (
    <div
      className={`w-full rounded-2xl border border-gray-200 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] ${
        hasMessages
          ? 'px-4 py-3'
          : 'max-w-[52rem] px-6 py-5 shadow-[0_2px_16px_rgba(0,0,0,0.07)] rounded-[2rem]'
      }`}
    >
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
          }
        }}
        rows={hasMessages ? 2 : 4}
        disabled={inputDisabled}
        placeholder={
          jumped ? t('subtitleNavigated') : t('subtitle')
        }
        className={`w-full resize-none border-0 bg-transparent leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 disabled:opacity-60 ${
          hasMessages ? 'min-h-[2.75rem] text-sm' : 'min-h-[6.5rem] text-base'
        }`}
      />
      {filesSummary ? <p className="mt-1 text-xs text-[#64748b]">{filesSummary}</p> : null}
      <div className={`flex items-center justify-between gap-3 ${hasMessages ? 'mt-2' : 'mt-4'}`}>
        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          disabled={inputDisabled}
          className={`relative inline-flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50 ${
            hasMessages ? 'h-8 w-8' : 'h-10 w-10'
          }`}
          title={t('actions.uploadMaterials')}
          aria-label={t('actions.uploadMaterialsAria')}
        >
          <Plus className={hasMessages ? 'h-4 w-4' : 'h-5 w-5'} />
          {files.length > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E8553F] px-1 text-[10px] font-semibold text-white">
              {files.length}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void handleSend()}
          disabled={!input.trim() || inputDisabled}
          className={`inline-flex items-center justify-center rounded-full bg-gray-900 text-white transition-opacity disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed hover:opacity-90 ${
            hasMessages ? 'h-9 w-9' : 'h-11 w-11'
          }`}
          aria-label={t('actions.send')}
        >
          {loading ? (
            <Loader2 className={hasMessages ? 'h-4 w-4 animate-spin' : 'h-5 w-5 animate-spin'} />
          ) : (
            <ArrowUp className={hasMessages ? 'h-4 w-4' : 'h-5 w-5'} />
          )}
        </button>
      </div>
    </div>
  );

  const inputSection = (
    <div className={`w-full ${hasMessages ? '' : 'max-w-[52rem]'}`}>
      {inputBox}
      {onDirectStartOptimization && !jumped ? (
        <p className={`text-center ${hasMessages ? 'mt-2' : 'mt-3'}`}>
          <button
            type="button"
            onClick={onDirectStartOptimization}
            disabled={inputDisabled}
            className="text-sm text-[#E8553F] underline underline-offset-2 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('directStart')}
          </button>
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div
        ref={hasMessages ? listRef : undefined}
        className={`min-h-0 flex-1 overflow-y-auto ${
          hasMessages ? 'px-6 py-6' : 'flex flex-col items-center justify-center px-6'
        }`}
      >
        {!hasMessages ? (
          <>
            <h1 className="mb-10 text-[2.75rem] font-bold tracking-tight text-gray-900">{t('heroTitle')}</h1>
            <div className="flex w-full justify-center">{inputSection}</div>
          </>
        ) : (
          <div className="mx-auto w-full max-w-[52rem] space-y-6">
            {sortedRichItems.map((item) => (
              <div key={`r-${item.seq}-${item.kind}`} className="w-full min-w-0">
                {item.render === 'text' &&
                (item.kind === 'user_chat' || item.kind === 'assistant_chat') ? (
                  <TextBubble
                    content={String((item.data as { content?: string })?.content ?? '')}
                    role={item.kind === 'user_chat' ? 'user' : 'agent'}
                  />
                ) : (
                  <EventRouter
                    item={item}
                    onFormSubmit={handleFormSubmit}
                    workflowId={boundWorkflowId || activeWorkflowIdRef.current}
                  />
                )}
              </div>
            ))}
            {jumpCards.map((row) => (
              <WorkflowJumpCard
                key={row.id}
                brandName={row.brandName}
                workflowId={row.workflowId}
                onJump={doJump}
                disabled={jumped || !onJumpToWorkbench}
              />
            ))}
            {loading ? (
              <div className="flex items-center gap-2 text-[15px] text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('thinking')}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {hasMessages ? (
        <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-3">
          <div className="mx-auto w-full max-w-[52rem]">{inputSection}</div>
        </div>
      ) : null}

      <KnowledgeBaseMaterialsUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        files={files}
        onChangeFiles={setFiles}
        inputId="new-conversation-kb-files"
      />
    </div>
  );
};

export default NewConversationPanel;
