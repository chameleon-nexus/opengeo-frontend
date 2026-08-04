import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchRichMedia,
  chatStream,
  type GeoOrchestratorChatRequest,
} from '../../../api/geoOrchestrator';
import type { BaseRichItem } from './types';
import type { WorkbenchStage } from '../types';

const PLATFORM_USER_LABEL: Record<string, string> = {
  doubao: '豆包',
  kimi: 'Kimi',
  wenxin: '文心',
  qianwen: '千问',
  yuanbao: '元宝',
};

function platformLabelsFromPayload(formPayload: Record<string, unknown>): string[] {
  const raw = formPayload.ai_platforms;
  if (!Array.isArray(raw) || !raw.length) return [];
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const id of raw) {
    const key = String(id).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    labels.push(PLATFORM_USER_LABEL[key] ?? String(id));
  }
  return labels;
}

function brandIntakeFormDisplay(formPayload: Record<string, unknown>): string {
  const parts: string[] = [];
  const brand = String(formPayload.brand_name ?? '').trim();
  if (brand && brand !== '待定' && brand !== '新优化') {
    parts.push(`品牌：${brand}`);
  }
  const product = String(formPayload.product_name ?? '').trim();
  if (product && product !== '待定' && product !== '新优化' && product !== brand) {
    parts.push(`产品：${product}`);
  }
  const intro = String(formPayload.brand_introduction ?? '').trim();
  if (intro) parts.push(`介绍：${intro.slice(0, 40)}${intro.length > 40 ? '…' : ''}`);
  const category = String(formPayload.subject_category ?? '').trim();
  const catsRaw = formPayload.subject_categories;
  const cats = Array.isArray(catsRaw)
    ? catsRaw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : [];
  if (cats.length) parts.push(`行业：${cats.join('、')}`);
  else if (category) parts.push(`行业：${category}`);
  if (formPayload.subject_categories_infer_by_ai) {
    parts.push('行业：AI 分析');
  }
  const platLabels = platformLabelsFromPayload(formPayload);
  if (platLabels.length) parts.push(`平台：${platLabels.join('、')}`);
  return parts.length ? parts.join('；') : '已提交品牌优化信息';
}

function formSubmitUserDisplay(
  message: string,
  formPayload?: Record<string, unknown>
): string {
  const msg = message.trim();
  if (!msg.startsWith('form_submit:') || !formPayload) return message;
  const formId = msg.split('form_submit:', 1)[1]?.trim() ?? '';
  if (formId === 'brand_input_form') {
    return brandIntakeFormDisplay(formPayload);
  }
  if (formId === 'ai_platform_picker_form') {
    const labels = platformLabelsFromPayload(formPayload);
    return labels.length ? labels.join('、') : '已选择 AI 平台';
  }
  return '已提交表单';
}

function maxItemSeq(items: BaseRichItem[]): number {
  return items.reduce((m, it) => Math.max(m, Number(it.seq) || 0), 0);
}

function localChatItem(
  kind: 'user_chat' | 'assistant_chat',
  content: string,
  seq: number
): BaseRichItem {
  return {
    seq,
    kind,
    render: 'text',
    data: { content, localBootstrap: true },
  };
}

function mergeBySeq(
  existing: BaseRichItem[],
  incoming: BaseRichItem[]
): BaseRichItem[] {
  const m = new Map<number, BaseRichItem>();
  for (const it of existing) {
    const s = it.seq;
    if (s != null) m.set(Number(s), it);
  }
  for (const it of incoming) {
    const s = it.seq;
    if (s != null) m.set(Number(s), { ...m.get(Number(s)), ...it });
  }
  return Array.from(m.values()).sort(
    (a, b) => (a.seq ?? 0) - (b.seq ?? 0)
  );
}

export function useRichMediaStream(
  workflowId: string | null | undefined
) {
  const [items, setItems] = useState<BaseRichItem[]>([]);
  const [lastSeq, setLastSeq] = useState(0);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const lastSeqRef = useRef(0);
  /** 已分配的本地乐观 seq 上界，保证多条待发消息排在已有记录之后 */
  const pendingSeqRef = useRef(0);

  const allocLocalSeq = useCallback((prev: BaseRichItem[]): number => {
    const base = Math.max(
      lastSeqRef.current,
      pendingSeqRef.current,
      maxItemSeq(prev)
    );
    const next = base + 1;
    pendingSeqRef.current = next;
    return next;
  }, []);

  const loadInitial = useCallback(async (wid: string) => {
    const res = await fetchRichMedia(wid, 0, 200);
    const its = (res.items ?? []) as BaseRichItem[];
    setItems((prev) => mergeBySeq(prev, its));
    const ls = res.lastSeq ?? 0;
    setLastSeq((prev) => Math.max(prev, ls));
    lastSeqRef.current = Math.max(lastSeqRef.current, ls);
    pendingSeqRef.current = Math.max(pendingSeqRef.current, ls);
  }, []);

  useEffect(() => {
    const wid = (workflowId || '').trim();
    if (!wid) {
      return;
    }
    pendingSeqRef.current = 0;
    void loadInitial(wid);
  }, [workflowId, loadInitial]);

  const sendChat = useCallback(
    async (opts: {
      message: string;
      phaseHint?: WorkbenchStage;
      formPayload?: Record<string, unknown>;
      onDelta?: (text: string) => void;
      /** 首条消息刚创建 workflow 时，hook 的 workflowId 可能尚未更新 */
      workflowIdOverride?: string | null;
      /** 无 workflowId 时走 bootstrap（开启新对话） */
      allowBootstrap?: boolean;
    }) => {
      const override =
        opts.workflowIdOverride !== undefined && opts.workflowIdOverride !== null
          ? String(opts.workflowIdOverride).trim()
          : null;
      const wid =
        override !== null
          ? override
          : (workflowId || '').trim();
      const allowBootstrap = opts.allowBootstrap === true;
      const isBootstrap = allowBootstrap && !wid;
      const hasWf = Boolean(wid);

      if (hasWf || isBootstrap) {
        const userDisplay = formSubmitUserDisplay(opts.message, opts.formPayload);
        setItems((prev) => {
          const seq = allocLocalSeq(prev);
          return mergeBySeq(prev, [localChatItem('user_chat', userDisplay, seq)]);
        });
      }
      setLoading(true);
      try {
        const body: GeoOrchestratorChatRequest = {
          message: opts.message,
          threadId: threadId,
          workflowId: wid || undefined,
          phaseHint: opts.phaseHint ?? null,
          formPayload: opts.formPayload,
        };
        if (!wid && !allowBootstrap) {
          throw new Error('需要 workflowId');
        }
        let assistantAppended = false;
        let assistantFromStream = false;
        const appendLocalAssistant = (reply: string) => {
          const text = reply.trim();
          if (!text || assistantAppended) return;
          assistantAppended = true;
          setItems((prev) => {
            const seq = allocLocalSeq(prev);
            return mergeBySeq(prev, [localChatItem('assistant_chat', text, seq)]);
          });
        };
        const markAssistantFromStream = (its: BaseRichItem[]) => {
          if (its.some((it) => it.kind === 'assistant_chat')) {
            assistantFromStream = true;
          }
        };
        const out = await chatStream(
          body,
          (obj: Record<string, unknown>) => {
            if (obj.type === 'event' && (obj as { name?: string }).name === 'rich_media') {
              const its = (obj as { items?: BaseRichItem[] }).items;
              if (its?.length) {
                markAssistantFromStream(its);
                setItems((prev) => {
                  const stripped = prev.filter(
                    (it) =>
                      !(
                        it.data?.localBootstrap === true &&
                        it.kind === 'user_chat'
                      )
                  );
                  return mergeBySeq(stripped, its);
                });
                for (const it of its) {
                  if (it.seq != null)
                    lastSeqRef.current = Math.max(
                      lastSeqRef.current,
                      Number(it.seq)
                    );
                }
                pendingSeqRef.current = Math.max(
                  pendingSeqRef.current,
                  lastSeqRef.current
                );
                setLastSeq(lastSeqRef.current);
              }
            }
            if (obj.type === 'text' && typeof (obj as { text?: string }).text === 'string') {
              opts.onDelta?.((obj as { text: string }).text);
            }
            if (obj.type === 'stream_end' && typeof (obj as { threadId?: string }).threadId === 'string') {
              setThreadId((obj as { threadId: string }).threadId);
            }
            if (obj.type === 'done' && (obj as { data?: unknown }).data) {
              const d = (obj as {
                data: {
                  threadId?: string;
                  lastSeq?: number;
                  reply?: string;
                  richMedia?: BaseRichItem[];
                };
              }).data;
              if (d.threadId) setThreadId(d.threadId);
              if (d.lastSeq != null) {
                setLastSeq(d.lastSeq);
                lastSeqRef.current = d.lastSeq;
                pendingSeqRef.current = Math.max(pendingSeqRef.current, d.lastSeq);
              }
              if (isBootstrap && typeof d.reply === 'string' && !assistantFromStream) {
                appendLocalAssistant(d.reply);
              }
              if (Array.isArray(d.richMedia) && d.richMedia.length) {
                markAssistantFromStream(d.richMedia as BaseRichItem[]);
                setItems((prev) => {
                  const stripped = prev.filter(
                    (it) =>
                      !(
                        it.data?.localBootstrap === true &&
                        it.kind === 'user_chat'
                      )
                  );
                  return mergeBySeq(stripped, d.richMedia as BaseRichItem[]);
                });
              }
            }
          }
        );
        if (out.threadId) setThreadId(out.threadId);
        if (out.lastSeq != null) {
          setLastSeq(out.lastSeq);
          lastSeqRef.current = out.lastSeq;
          pendingSeqRef.current = Math.max(pendingSeqRef.current, out.lastSeq);
        }
        if (
          typeof out.reply === 'string' &&
          out.reply.trim() &&
          !assistantAppended &&
          !assistantFromStream
        ) {
          appendLocalAssistant(out.reply);
        }
        return out;
      } catch (e: unknown) {
        const errText =
          (e as Error)?.message?.trim() || '请求失败，请稍后重试';
        setItems((prev) => {
          const seq = allocLocalSeq(prev);
          return mergeBySeq(prev, [
            localChatItem('assistant_chat', `请求失败：${errText}`, seq),
          ]);
        });
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [threadId, workflowId, allocLocalSeq]
  );

  return {
    richItems: items,
    lastSeq,
    threadId,
    loading,
    loadInitial: () => {
      const wid = (workflowId || '').trim();
      if (wid) return loadInitial(wid);
      return Promise.resolve();
    },
    sendChat,
  };
}
