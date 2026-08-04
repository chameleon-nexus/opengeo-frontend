/**
 * 出海 AI 平台多选（与「国内 AI 平台」同级；与国内至少选其一，出海本身可空）
 */
import React, { useEffect } from 'react';
import {
  OVERSEAS_AI_NOT_OPEN_HINT,
  OVERSEAS_AI_OPEN,
} from '../../../constants/overseasAiOpen';

/** 聊天/搜索型出海 AI（不含 Grok、Rufus、Meta AI 等 App 内嵌类；联网诊断尚未接入） */
export const OVERSEAS_PLATFORM_OPTIONS = [
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    icon: '/imgs/ai-icons/overseas/chatgpt.png',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    icon: '/imgs/ai-icons/overseas/gemini.png',
  },
  {
    id: 'google_ai_mode',
    label: 'Google AI',
    icon: '/imgs/ai-icons/overseas/google-ai-mode.png',
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    icon: '/imgs/ai-icons/overseas/perplexity.png',
  },
  {
    id: 'copilot',
    label: 'Copilot',
    icon: '/imgs/ai-icons/overseas/copilot.png',
  },
] as const;

export const ALL_OVERSEAS_PLATFORM_IDS = OVERSEAS_PLATFORM_OPTIONS.map((o) => o.id) as readonly string[];

const OVERSEAS_LABEL_BY_ID = Object.fromEntries(
  OVERSEAS_PLATFORM_OPTIONS.map((o) => [o.id, o.label])
) as Record<string, string>;

export function formatOverseasPlatformIds(ids: string[] | null | undefined): string {
  const list = ids ?? [];
  if (list.length === 0) return '—';
  return list.map((id) => OVERSEAS_LABEL_BY_ID[id] ?? id).join(' / ');
}

interface Props {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** 标签前缀，默认「出海 AI 平台」 */
  label?: string;
  /** 未开放时点击提示（可选） */
  onOverseasNotOpenHint?: () => void;
  /** 未开放说明文案，默认使用全局常量 */
  notOpenHint?: string;
}

const OverseasPlatformPicker: React.FC<Props> = ({
  selected,
  onChange,
  label = '出海 AI 平台',
  onOverseasNotOpenHint,
  notOpenHint = OVERSEAS_AI_NOT_OPEN_HINT,
}) => {
  const overseasClosed = !OVERSEAS_AI_OPEN;

  useEffect(() => {
    if (overseasClosed && selected.size > 0) {
      onChange(new Set());
    }
    // 仅随开关变化清空误选，不依赖 selected/onChange 避免循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overseasClosed]);

  const allSelected = ALL_OVERSEAS_PLATFORM_IDS.every((id) => selected.has(id));
  const notifyBlocked = () => {
    if (overseasClosed) onOverseasNotOpenHint?.();
  };
  const toggle = (id: string) => {
    if (overseasClosed) {
      notifyBlocked();
      return;
    }
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    onChange(n);
  };
  const toggleAll = () => {
    if (overseasClosed) {
      notifyBlocked();
      return;
    }
    if (allSelected) onChange(new Set());
    else onChange(new Set(ALL_OVERSEAS_PLATFORM_IDS));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-semibold text-[#374151]">{label}</span>
        {!overseasClosed ? (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-slate-400 text-[#E8553F] focus:ring-[#E8553F]"
            />
            <span className="text-slate-700">全选</span>
          </label>
        ) : null}
      </div>
      {overseasClosed ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
          {notOpenHint}
        </p>
      ) : null}
      <div className={'grid grid-cols-4 gap-2' + (overseasClosed ? ' opacity-60' : '')} aria-disabled={overseasClosed}>
        {OVERSEAS_PLATFORM_OPTIONS.map((p) => {
          const checked = overseasClosed ? false : selected.has(p.id);
          return (
            <label
              key={p.id}
              className={
                'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ' +
                (overseasClosed
                  ? 'cursor-not-allowed border-slate-200 bg-slate-50'
                  : checked
                    ? 'cursor-pointer border-orange-200 bg-orange-50/80'
                    : 'cursor-pointer border-slate-200 bg-white hover:border-slate-300')
              }
              onClick={(e) => {
                if (!overseasClosed) return;
                e.preventDefault();
                notifyBlocked();
              }}
            >
              <img src={p.icon} alt="" className="h-8 w-8 shrink-0 rounded-md object-contain" />
              <span className="min-w-0 flex-1 font-medium leading-tight">{p.label}</span>
              <input
                type="checkbox"
                checked={checked}
                disabled={overseasClosed}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 shrink-0 rounded border-slate-400 text-[#E8553F] focus:ring-[#E8553F] disabled:cursor-not-allowed"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default OverseasPlatformPicker;
