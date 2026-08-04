import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface Props {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  disabled?: boolean;
  maxLength?: number;
  maxTags?: number;
  id?: string;
}

/** 多值标签输入（Enter / 添加按钮） */
const StringTagsInput: React.FC<Props> = ({
  tags,
  onChange,
  placeholder,
  addLabel = '添加',
  disabled = false,
  maxLength,
  maxTags,
  id,
}) => {
  const [draft, setDraft] = useState('');

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    if (maxTags != null && tags.length >= maxTags) return;
    const dup = tags.some((x) => x.toLowerCase() === t.toLowerCase());
    if (dup) {
      setDraft('');
      return;
    }
    onChange([...tags, t]);
    setDraft('');
  };

  const remove = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span
              key={`${tag}-${i}`}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm text-emerald-900"
            >
              {tag}
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={disabled}
                className="rounded p-0.5 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                aria-label={`移除 ${tag}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          disabled={disabled || (maxTags != null && tags.length >= maxTags)}
          maxLength={maxLength}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E8553F]/50 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={add}
          disabled={disabled || !draft.trim() || (maxTags != null && tags.length >= maxTags)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#374151] hover:border-orange-200 hover:bg-orange-50/50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {addLabel}
        </button>
      </div>
    </div>
  );
};

export default StringTagsInput;
