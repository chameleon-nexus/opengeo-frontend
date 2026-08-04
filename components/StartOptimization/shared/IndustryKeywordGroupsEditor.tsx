import React, { useState } from 'react';
import { Loader2, Plus, Sparkles, X } from 'lucide-react';
import {
  type GeoCoreKeywordGroup,
  inferPlaceholderCoreKeyword,
} from '../../../utils/coreKeywordGroups';
import { useModuleI18n } from '../../../i18n/hooks';

export interface IndustryKeywordChip {
  id: string;
  text: string;
  fromSystem?: boolean;
}

export interface IndustryKeywordGroupRow {
  industry: string;
  keywords: IndustryKeywordChip[];
}

export interface IndustryKeywordGroupsEditorProps {
  groups: IndustryKeywordGroupRow[];
  onChange: (groups: IndustryKeywordGroupRow[]) => void;
  /** 按行业触发联网解析词包 */
  onParseIndustry?: (industry: string, groupIndex: number) => void | Promise<void>;
  parsingIndustryIndex?: number | null;
  disabled?: boolean;
  showParseButtons?: boolean;
}

function newChip(text: string, fromSystem = false): IndustryKeywordChip {
  return {
    id: `kw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    fromSystem,
  };
}

/** 从 GeoCoreKeywordGroup[] 转为编辑器行（无 fromSystem 标记） */
export function groupsToEditorRows(groups: GeoCoreKeywordGroup[]): IndustryKeywordGroupRow[] {
  return groups.map((g, gi) => ({
    industry: g.industry,
    keywords: g.keywords.map((text, ki) => ({
      id: `wf-${gi}-${ki}-${text.slice(0, 12)}`,
      text,
      fromSystem: true,
    })),
  }));
}

/** 编辑器行 → GeoCoreKeywordGroup[] */
export function editorRowsToGroups(rows: IndustryKeywordGroupRow[]): GeoCoreKeywordGroup[] {
  return rows
    .map((r) => ({
      industry: r.industry.trim(),
      keywords: r.keywords.map((k) => k.text.trim()).filter(Boolean),
    }))
    .filter((g) => g.industry || g.keywords.length);
}

const IndustryKeywordGroupsEditor: React.FC<IndustryKeywordGroupsEditorProps> = ({
  groups,
  onChange,
  onParseIndustry,
  parsingIndustryIndex = null,
  disabled = false,
  showParseButtons = Boolean(onParseIndustry),
}) => {
  const { t } = useModuleI18n('optimization');
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const updateGroup = (index: number, patch: Partial<IndustryKeywordGroupRow>) => {
    onChange(groups.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  };

  const addIndustry = () => {
    onChange([...groups, { industry: '', keywords: [] }]);
  };

  const removeIndustry = (index: number) => {
    const next = groups.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [{ industry: '', keywords: [] }]);
  };

  const addKeyword = (index: number) => {
    const text = (drafts[index] ?? '').trim();
    if (!text) return;
    const g = groups[index];
    if (!g) return;
    const dup = g.keywords.some((k) => k.text.toLowerCase() === text.toLowerCase());
    if (dup) {
      setDrafts((prev) => ({ ...prev, [index]: '' }));
      return;
    }
    updateGroup(index, { keywords: [...g.keywords, newChip(text, false)] });
    setDrafts((prev) => ({ ...prev, [index]: '' }));
  };

  const removeKeyword = (groupIndex: number, chipId: string) => {
    const g = groups[groupIndex];
    if (!g) return;
    updateGroup(groupIndex, { keywords: g.keywords.filter((k) => k.id !== chipId) });
  };

  const generalizeKeywords = (index: number) => {
    const g = groups[index];
    if (!g || !g.industry.trim()) return;
    const placeholder = inferPlaceholderCoreKeyword(index);
    updateGroup(index, { keywords: [newChip(placeholder, true)] });
  };

  return (
    <div className="space-y-4">
      {groups.map((group, gi) => {
        const parsing = parsingIndustryIndex === gi;
        return (
          <div
            key={`industry-block-${gi}`}
            className="rounded-xl border border-slate-200 bg-[#f8f9fb] p-4"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 shrink-0">
                {t('industryKeywordGroups.industryLabel')}
              </label>
              <input
                type="text"
                value={group.industry}
                onChange={(e) => updateGroup(gi, { industry: e.target.value })}
                disabled={disabled}
                placeholder={t('industryKeywordGroups.industryPlaceholder')}
                className="min-w-[8rem] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#E8553F]/50 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 disabled:opacity-50"
              />
              {showParseButtons && onParseIndustry ? (
                <button
                  type="button"
                  onClick={() => void onParseIndustry(group.industry.trim() || t('industryKeywordGroups.defaultIndustry'), gi)}
                  disabled={disabled || parsing || !group.industry.trim()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#374151] hover:border-orange-200 hover:bg-orange-50/50 disabled:opacity-50"
                >
                  {parsing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {t('industryKeywordGroups.parseIndustry')}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => generalizeKeywords(gi)}
                disabled={disabled || parsing || !group.industry.trim()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-[#374151] hover:border-orange-200 hover:bg-orange-50/50 disabled:opacity-50"
                title={t('industryKeywordGroups.generalizeCoreKeywordsHint')}
                aria-label={t('industryKeywordGroups.generalizeCoreKeywords')}
              >
                {t('industryKeywordGroups.generalizeCoreKeywords')}
              </button>
              <button
                type="button"
                onClick={() => removeIndustry(gi)}
                disabled={disabled}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-50"
                aria-label={t('industryKeywordGroups.removeIndustry')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {group.keywords.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {group.keywords.map((kw) => {
                  const isSys = kw.fromSystem;
                  const cardTheme = isSys
                    ? 'border-orange-200/90 bg-orange-50/90 text-orange-950'
                    : 'border-sky-200 bg-sky-50 text-sky-950';
                  const labelTheme = isSys ? 'text-orange-700/90' : 'text-sky-700/90';
                  return (
                    <div
                      key={kw.id}
                      className={`relative inline-flex max-w-[min(100%,280px)] min-w-[72px] flex-col rounded-xl border px-3 pb-2.5 pt-1.5 text-left shadow-sm ${cardTheme}`}
                    >
                      <div className="mb-1 flex items-start justify-between gap-1">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${labelTheme}`}>
                          {isSys ? t('stages.brandParse.systemTag') : t('stages.brandParse.customTag')}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeKeyword(gi, kw.id)}
                          disabled={disabled}
                          className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-black/5 hover:text-slate-800 disabled:opacity-50"
                          aria-label={t('stages.brandParse.removeKeyword', { keyword: kw.text })}
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </button>
                      </div>
                      <span className="break-words text-sm font-medium leading-snug">{kw.text}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mb-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-400">
                {t('industryKeywordGroups.noKeywords')}
              </div>
            )}

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={drafts[gi] ?? ''}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [gi]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword(gi);
                  }
                }}
                disabled={disabled}
                placeholder={t('stages.brandParse.customKeywordPlaceholder')}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-[#E8553F]/50 focus:outline-none focus:ring-2 focus:ring-[#E8553F]/20 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => addKeyword(gi)}
                disabled={disabled || !(drafts[gi] ?? '').trim()}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-[#374151] hover:border-orange-200 hover:bg-orange-50/50 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {t('stages.brandParse.add')}
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addIndustry}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-[#374151] hover:border-orange-200 hover:bg-orange-50/30 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        {t('industryKeywordGroups.addIndustry')}
      </button>
    </div>
  );
};

export default IndustryKeywordGroupsEditor;
