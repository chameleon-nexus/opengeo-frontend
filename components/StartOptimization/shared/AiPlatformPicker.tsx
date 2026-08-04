/**
 * AI 平台多选
 * （开始优化 / 创建优化工作流）与快速开始可展示的端对齐：
 * 暂不在 UI 展示 夸克 / 纳米 / 讯飞星火 / 智谱；DeepSeek 暂不展示（未对接联网诊断）。
 */
import React from 'react';

export const AI_PLATFORM_OPTIONS = [
  { id: 'doubao', label: '豆包', icon: '/imgs/ai-icons/doubao.png' },
  // DeepSeek：后端 call_networked_search 接入联网后可取消下行注释并插回豆包之后
  // { id: 'deepseek', label: 'DeepSeek', icon: '/imgs/ai-icons/deepseek.png' },
  { id: 'wenxin', label: '文心一言', icon: '/imgs/ai-icons/wenxin.png' },
  { id: 'qianwen', label: '通义千问', icon: '/imgs/ai-icons/tongyi.png' },
  { id: 'yuanbao', label: '腾讯元宝', icon: '/imgs/ai-icons/yuanbao.png' },
  { id: 'kimi', label: 'Kimi', icon: '/imgs/ai-icons/kimi.png' },
] as const;

export const ALL_AI_PLATFORM_IDS = AI_PLATFORM_OPTIONS.map((o) => o.id) as readonly string[];

interface Props {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  /** 标签前缀，默认 "AI 平台" */
  label?: string;
}

const AiPlatformPicker: React.FC<Props> = ({
  selected,
  onChange,
  label = 'AI 平台',
}) => {
  const allSelected = ALL_AI_PLATFORM_IDS.every((id) => selected.has(id));
  const toggle = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    onChange(n);
  };
  const toggleAll = () => {
    if (allSelected) onChange(new Set());
    else onChange(new Set(ALL_AI_PLATFORM_IDS));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-semibold text-[#374151]">{label}</span>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-slate-400 text-[#E8553F] focus:ring-[#E8553F]"
          />
          <span className="text-slate-700">全选</span>
        </label>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {AI_PLATFORM_OPTIONS.map((p) => {
          const checked = selected.has(p.id);
          return (
            <label
              key={p.id}
              className={
                'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ' +
                (checked
                  ? 'border-orange-200 bg-orange-50/80'
                  : 'border-slate-200 bg-white hover:border-slate-300')
              }
            >
              <img src={p.icon} alt="" className="h-8 w-8 shrink-0 rounded-md object-contain" />
              <span className="min-w-0 flex-1 font-medium">{p.label}</span>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 shrink-0 rounded border-slate-400 text-[#E8553F] focus:ring-[#E8553F]"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default AiPlatformPicker;
