import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, Send, Sparkles } from 'lucide-react';
import { geoOrchestratorAPI } from '../../api/geoOrchestrator';
import type { BaseRichItem } from './richMedia/types';
import EventRouter from './richMedia/EventRouter';
import TextBubble from './richMedia/cards/TextBubble';
import type { WorkbenchStage } from './types';
import type { ModuleType } from '../../types';
import { useModuleI18n } from '../../i18n/hooks';

export interface RichStreamProps {
  richItems: BaseRichItem[];
  lastSeq: number;
  sendChat: (opts: {
    message: string;
    phaseHint?: WorkbenchStage;
    formPayload?: Record<string, unknown>;
  }) => Promise<{
    ok?: boolean;
    reply?: string;
    lastSeq?: number;
    threadId?: string;
    completed?: boolean;
  }>;
  streamLoading: boolean;
  threadId: string | null;
}

interface Props {
  stage: WorkbenchStage;
  brandName?: string | null;
  /** 阶段对应的智能体提示语（首次进入阶段时自动追加） */
  stageHint?: string;
  /** 当前 GEO workflow；无则走「引导创建/列表」bootstrap 子图 */
  workflowId?: string | null;
  /** 若绑定 workflow 则使用父级注入的流式 + 富媒体；否则回退为单次 HTTP /chat */
  stream?: RichStreamProps | null;
  onOpenModule?: (m: ModuleType, opts: { reportId?: number; taskId?: string; workflowId?: string }) => void;
  /** sidebar：工作台右侧窄栏；main：开启新对话页顶部大对话 */
  variant?: 'sidebar' | 'main';
}

const STAGE_HINT_KEYS: Record<WorkbenchStage, `agentPanel.stageHints.${WorkbenchStage}`> = {
  brand_input: 'agentPanel.stageHints.brand_input',
  brand_parse: 'agentPanel.stageHints.brand_parse',
  report_generation: 'agentPanel.stageHints.report_generation',
  intelligent_optimization: 'agentPanel.stageHints.intelligent_optimization',
  completion: 'agentPanel.stageHints.completion',
};

type Turn = {
  id: string;
  userText: string;
  uSort: number;
  agentText?: string;
  aSort?: number;
};

const AgentSidePanel: React.FC<Props> = ({
  stage,
  brandName,
  stageHint,
  workflowId,
  stream,
  onOpenModule,
  variant = 'sidebar',
}) => {
  const { t } = useModuleI18n('optimization');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const lastStageRef = useRef<WorkbenchStage | null>(null);
  const threadIdRef = useRef<string | null>(stream?.threadId ?? null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [hintPushed, setHintPushed] = useState(false);

  const richItems = stream?.richItems ?? [];
  const useStream = Boolean(workflowId?.trim() && stream);

  useEffect(() => {
    threadIdRef.current = stream?.threadId ?? null;
  }, [stream?.threadId]);

  useEffect(() => {
    if (lastStageRef.current === stage) return;
    lastStageRef.current = stage;
    setHintPushed(true);
  }, [stage, stageHint, brandName]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns, richItems.length, loading, stream?.streamLoading]);

  const maxSeqBase = useMemo(() => {
    const fromRich = Math.max(0, ...richItems.map((i) => Number(i.seq) || 0));
    return Math.max(stream?.lastSeq ?? 0, fromRich);
  }, [richItems, stream?.lastSeq]);

  const timeline = useMemo(() => {
    const localUserTexts = new Set(turns.map((t) => t.userText.trim()).filter(Boolean));
    const visibleRichItems =
      useStream && localUserTexts.size > 0
        ? richItems.filter((it) => {
            if (it.kind !== 'user_chat') return true;
            const content = String((it.data as { content?: string } | undefined)?.content ?? '').trim();
            return !content || !localUserTexts.has(content);
          })
        : richItems;

    const rows: Array<
      { sort: number; t: 'rich'; item: BaseRichItem } | { sort: number; t: 'user'; id: string; text: string } | { sort: number; t: 'agent'; id: string; text: string }
    > = visibleRichItems.map((it) => ({ sort: Number(it.seq) || 0, t: 'rich' as const, item: it }));
    for (const tr of turns) {
      rows.push({ sort: tr.uSort, t: 'user', id: tr.id, text: tr.userText });
      if (tr.aSort != null && tr.agentText) {
        rows.push({ sort: tr.aSort, t: 'agent', id: `${tr.id}-a`, text: tr.agentText });
      }
    }
    rows.sort((a, b) => a.sort - b.sort);
    return rows;
  }, [richItems, turns, useStream]);

  const stageHintText = stageHint?.trim() || t(STAGE_HINT_KEYS[stage]);

  const handleFormSubmit = async (message: string, formPayload: Record<string, unknown>) => {
    if (!useStream || !stream) {
      throw new Error(t('agentPanel.noStreamContext'));
    }
    await stream.sendChat({
      message,
      phaseHint: stage,
      formPayload,
    });
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    if (useStream && stream) {
      const uSort = maxSeqBase + 0.01;
      const turnId = `u-${Date.now()}`;
      setTurns((prev) => [...prev, { id: turnId, userText: text, uSort }]);
      setLoading(true);
      try {
        await stream.sendChat({ message: text, phaseHint: stage });
      } catch (e: unknown) {
        const errText = (e as Error)?.message || String(e);
        const aSort = uSort + 0.02;
        setTurns((prev) =>
          prev.map((turn) =>
            turn.id === turnId
              ? { ...turn, agentText: t('agentPanel.requestFailed', { error: errText }), aSort }
              : turn
          )
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    const uSort = maxSeqBase + 0.01;
    const turnId = `u-${Date.now()}`;
    setTurns((prev) => [...prev, { id: turnId, userText: text, uSort }]);
    setLoading(true);

    try {
      const res = await geoOrchestratorAPI.chat({
        message: text,
        threadId: threadIdRef.current,
        workflowId: workflowId ?? null,
        phaseHint: stage,
      });
      if (res.threadId) threadIdRef.current = res.threadId;
      const aSort = maxSeqBase + 0.02;
      const reply =
        (typeof res.reply === 'string' && res.reply.trim()) ||
        (res.completed ? t('agentPanel.workflowEnded') : JSON.stringify(res, null, 2));
      setTurns((prev) => {
        const n = prev.map((turn) => (turn.id === turnId ? { ...turn, agentText: reply, aSort } : turn));
        return n;
      });
    } catch (e: unknown) {
      const errText = (e as Error)?.message || String(e);
      const aSort = maxSeqBase + 0.02;
      setTurns((prev) => {
        const n = prev.map((turn) =>
          turn.id === turnId
            ? { ...turn, agentText: t('agentPanel.requestFailed', { error: errText }), aSort }
            : turn
        );
        return n;
      });
    } finally {
      setLoading(false);
    }
  };

  const isMain = variant === 'main';

  const sidebarSubtitle = brandName
    ? `${t('agentPanel.currentBrand', { brandName })}${
        workflowId ? ` · ${workflowId}` : ` · ${t('agentPanel.workflowUnbound')}`
      }`
    : `${t('agentPanel.subtitleWorkbenchGuide')}${
        workflowId ? ` · ${workflowId}` : ` · ${t('agentPanel.workflowUnbound')}`
      }`;

  return (
    <aside
      className={`h-full w-full flex flex-col bg-white ${
        isMain ? 'rounded-2xl border border-gray-200 shadow-sm' : 'border-l border-gray-200'
      }`}
    >
      <header
        className={`border-b border-gray-200 bg-gradient-to-r from-[#FFF6F2] to-white shrink-0 ${
          isMain ? 'px-6 py-4' : 'px-4 py-3'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`rounded-lg bg-[#E8553F]/10 flex items-center justify-center shrink-0 ${
              isMain ? 'w-9 h-9' : 'w-7 h-7'
            }`}
          >
            <Bot className={`text-[#E8553F] ${isMain ? 'w-5 h-5' : 'w-4 h-4'}`} />
          </div>
          <div>
            <div className={`font-semibold text-gray-900 ${isMain ? 'text-base' : 'text-sm'}`}>
              {isMain ? t('agentPanel.titleMain') : t('agentPanel.titleSidebar')}
            </div>
            <div className={`text-gray-400 ${isMain ? 'text-xs' : 'text-[11px]'}`}>
              {isMain ? t('agentPanel.subtitleMain') : sidebarSubtitle}
            </div>
          </div>
        </div>
      </header>

      <div
        ref={listRef}
        className={`flex-1 overflow-y-auto space-y-6 ${isMain ? 'px-6 py-5' : 'px-3 py-3'}`}
      >
        {(!workflowId || !richItems.length) && !turns.length && (
          <div
            className={`rounded-xl bg-gray-50 text-gray-500 leading-relaxed ${
              isMain ? 'px-4 py-4 text-sm' : 'px-3 py-3 text-xs'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[#E8553F] font-semibold mb-1">
              <Sparkles className={isMain ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
              <span>{t('agentPanel.welcome')}</span>
            </div>
            {isMain ? t('agentPanel.emptyMain') : t('agentPanel.emptySidebar')}
          </div>
        )}
        {hintPushed && (
          <TextBubble
            content={
              brandName
                ? `${t('agentPanel.brandHintPrefix', { brandName })} ${stageHintText}`
                : stageHintText
            }
            role="agent"
          />
        )}
        {timeline.map((row) => {
          if (row.t === 'rich') {
            return (
              <div key={`r-${row.item.seq}-${row.item.kind}`} className="w-full min-w-0">
                <EventRouter
                  item={row.item}
                  onFormSubmit={handleFormSubmit}
                  onOpenModule={onOpenModule}
                  workflowId={workflowId}
                />
              </div>
            );
          }
          if (row.t === 'user') {
            return <TextBubble key={row.id} content={row.text} role="user" />;
          }
          return <TextBubble key={row.id} content={row.text} role="agent" />;
        })}
        {(loading || stream?.streamLoading) && (
          <div className="flex items-center gap-2 text-[15px] text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            {t('agentPanel.thinking')}
          </div>
        )}
      </div>

      <div className={`border-t border-gray-200 bg-white shrink-0 ${isMain ? 'p-4' : 'p-3'}`}>
        <div className={`flex items-end gap-2 ${isMain ? 'max-w-4xl mx-auto w-full' : ''}`}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={isMain ? 3 : 2}
            placeholder={isMain ? t('agentPanel.placeholderMain') : t('agentPanel.placeholderSidebar')}
            className={`flex-1 resize-none rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 focus:border-[#E8553F]/50 ${
              isMain ? 'text-sm px-4 py-3' : 'text-xs px-2.5 py-2'
            }`}
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!input.trim() || loading}
            className={`shrink-0 inline-flex items-center justify-center rounded-lg bg-[#E8553F] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 ${
              isMain ? 'w-11 h-11' : 'w-9 h-9'
            }`}
          >
            <Send className={isMain ? 'w-5 h-5' : 'w-4 h-4'} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AgentSidePanel;
