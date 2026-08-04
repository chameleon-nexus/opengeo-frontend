/**
 * 编辑分析报告 - 展示覆盖编辑
 * 只编辑 indicator_data.display_overrides（报告页展示层），不改任何原始/聚合数据。
 * 开关开启时 SaaS 报告页与分享页展示覆盖值，关闭立即恢复真实计算值；留空字段始终用真实值。
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Loader2, Save } from 'lucide-react';
import { Theme } from '../types';
import { diagnosisReportAPI, DiagnosisReportData } from '../api/diagnosisReport';
import {
  AI_RANKING_DEFAULT_SUBTITLE,
  DISPLAY_TOP_KEYWORD_ROWS,
  enrichGeoReportForView,
  OptimizationSuggestionOverride,
  platformRankToMentionLabel,
  ReportDisplayOverrides,
  type AiPlatformMatrixCellOverride,
} from '../utils/miniReportEnrich';

interface OptSuggestionFormItem {
  title: string;
  platform: string;
  trigger: string;
  output: string;
  howLinesText: string;
  intentType: string;
  metrics: string;
}

const EMPTY_OPT_ITEM: OptSuggestionFormItem = {
  title: '',
  platform: '',
  trigger: '',
  output: '',
  howLinesText: '',
  intentType: '',
  metrics: '',
};

/** AI 平台竞争力矩阵单槽（3 个强势场景） */
interface PlatformMatrixSlot {
  keyword: string;
  cells: Record<string, '' | AiPlatformMatrixCellOverride>;
}

const EMPTY_MATRIX_SLOT: PlatformMatrixSlot = { keyword: '', cells: {} };

function emptyPlatformMatrixSlots(): PlatformMatrixSlot[] {
  return Array.from({ length: DISPLAY_TOP_KEYWORD_ROWS }, () => ({
    keyword: '',
    cells: {},
  }));
}

/** 展示覆盖编辑态（扁平字符串，便于输入框绑定） */
interface OverridesState {
  enabled: boolean;
  brand_score: string;
  rival_name: string;
  rival_score: string;
  mention_rate: string;
  mention_count: string;
  rival_mention_rate: string;
  rival_mention_count: string;
  avg_rank: string;
  baseline_visibility: string;
  sentiment_positive: string;
  sentiment_neutral: string;
  fs_line1: string;
  fs_line2: string;
  vis_line1: string;
  vis_line2: string;
  ai_plat_line1: string;
  ai_plat_line2: string;
  rank_line1: string;
  rank_line2: string;
  ai_ranking_subtitle: string;
  platform_matrix: PlatformMatrixSlot[];
  opt_suggestions: OptSuggestionFormItem[];
  /** 平台id -> 5 个品牌名（第1~5名） */
  table: Record<string, string[]>;
}

const EMPTY_OVERRIDES: OverridesState = {
  enabled: false,
  brand_score: '',
  rival_name: '',
  rival_score: '',
  mention_rate: '',
  mention_count: '',
  rival_mention_rate: '',
  rival_mention_count: '',
  avg_rank: '',
  baseline_visibility: '',
  sentiment_positive: '',
  sentiment_neutral: '',
  fs_line1: '',
  fs_line2: '',
  vis_line1: '',
  vis_line2: '',
  ai_plat_line1: '',
  ai_plat_line2: '',
  rank_line1: '',
  rank_line2: '',
  ai_ranking_subtitle: '',
  platform_matrix: emptyPlatformMatrixSlots(),
  opt_suggestions: [{ ...EMPTY_OPT_ITEM }, { ...EMPTY_OPT_ITEM }, { ...EMPTY_OPT_ITEM }],
  table: {},
};

function str(v: unknown): string {
  return v != null && v !== '' ? String(v) : '';
}

function howLinesToText(v: unknown): string {
  if (!Array.isArray(v)) return '';
  return v.map((s) => String(s).trim()).filter(Boolean).join('\n');
}

function optItemFromStored(raw: OptimizationSuggestionOverride | undefined): OptSuggestionFormItem {
  if (!raw) return { ...EMPTY_OPT_ITEM };
  return {
    title: str(raw.title),
    platform: str(raw.platform),
    trigger: str(raw.trigger),
    output: str(raw.output),
    howLinesText: Array.isArray(raw.howLines) ? howLinesToText(raw.howLines) : str(raw.howLines),
    intentType: str(raw.intentType),
    metrics: str(raw.metrics),
  };
}

function optItemHasContent(item: OptSuggestionFormItem): boolean {
  return Boolean(
    item.title.trim() ||
      item.platform.trim() ||
      item.trigger.trim() ||
      item.output.trim() ||
      item.howLinesText.trim() ||
      item.intentType.trim() ||
      item.metrics.trim()
  );
}

function platformMatrixFromStored(raw: unknown): PlatformMatrixSlot[] {
  const slots = emptyPlatformMatrixSlots();
  if (!raw || !Array.isArray(raw)) return slots;
  raw.slice(0, DISPLAY_TOP_KEYWORD_ROWS).forEach((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return;
    const row = item as { keyword?: unknown; cells?: Record<string, unknown> };
    const cells: Record<string, '' | AiPlatformMatrixCellOverride> = {};
    if (row.cells && typeof row.cells === 'object') {
      Object.entries(row.cells).forEach(([pid, val]) => {
        if (val === 'mentioned' || val === 'none') cells[pid] = val;
      });
    }
    slots[i] = { keyword: str(row.keyword), cells };
  });
  return slots;
}

function overridesStateFromStored(raw: unknown): OverridesState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...EMPTY_OVERRIDES, table: {}, platform_matrix: emptyPlatformMatrixSlots() };
  }
  const o = raw as ReportDisplayOverrides;
  const table: Record<string, string[]> = {};
  if (o.ai_ranking_table && typeof o.ai_ranking_table === 'object') {
    Object.entries(o.ai_ranking_table).forEach(([pid, arr]) => {
      if (Array.isArray(arr)) {
        table[pid] = [0, 1, 2, 3, 4].map((i) => (arr[i] != null ? String(arr[i]) : ''));
      }
    });
  }
  return {
    enabled: o.enabled === true,
    brand_score: str(o.brand_score),
    rival_name: str(o.rival_name),
    rival_score: str(o.rival_score),
    mention_rate: str(o.mention_rate),
    mention_count: str(o.mention_count),
    rival_mention_rate: str(o.rival_mention_rate),
    rival_mention_count: str(o.rival_mention_count),
    avg_rank: str(o.avg_rank),
    sentiment_positive: str(o.sentiment?.positive),
    sentiment_neutral: str(o.sentiment?.neutral),
    fs_line1: o.fs_summary?.line1 ?? '',
    fs_line2: o.fs_summary?.line2 ?? '',
    vis_line1: o.visibility_summary?.line1 ?? '',
    vis_line2: o.visibility_summary?.line2 ?? '',
    ai_plat_line1: o.ai_platform_summary?.line1 ?? '',
    ai_plat_line2: o.ai_platform_summary?.line2 ?? '',
    rank_line1: o.ai_ranking_summary?.line1 ?? '',
    rank_line2: o.ai_ranking_summary?.line2 ?? '',
    ai_ranking_subtitle: str(o.ai_ranking_subtitle),
    baseline_visibility: str(o.baseline_visibility),
    platform_matrix: platformMatrixFromStored(o.ai_platform_matrix),
    opt_suggestions: [0, 1, 2].map((i) => optItemFromStored(o.optimization_suggestions?.[i])),
    table,
  };
}

function overridesPayloadFromState(o: OverridesState): ReportDisplayOverrides {
  const payload: ReportDisplayOverrides = { enabled: o.enabled };
  const put = (key: keyof ReportDisplayOverrides, val: string) => {
    const v = val.trim();
    if (v) (payload as Record<string, unknown>)[key] = v;
  };
  put('brand_score', o.brand_score);
  put('rival_name', o.rival_name);
  put('rival_score', o.rival_score);
  put('mention_rate', o.mention_rate);
  put('mention_count', o.mention_count);
  put('rival_mention_rate', o.rival_mention_rate);
  put('rival_mention_count', o.rival_mention_count);
  put('avg_rank', o.avg_rank);
  const pos = o.sentiment_positive.trim();
  const neu = o.sentiment_neutral.trim();
  if (pos || neu) {
    payload.sentiment = {};
    if (pos) payload.sentiment.positive = pos;
    if (neu) payload.sentiment.neutral = neu;
  }
  if (o.fs_line1.trim() || o.fs_line2.trim()) {
    payload.fs_summary = { line1: o.fs_line1.trim(), line2: o.fs_line2.trim() };
  }
  if (o.vis_line1.trim() || o.vis_line2.trim()) {
    payload.visibility_summary = { line1: o.vis_line1.trim(), line2: o.vis_line2.trim() };
  }
  if (o.ai_plat_line1.trim() || o.ai_plat_line2.trim()) {
    payload.ai_platform_summary = { line1: o.ai_plat_line1.trim(), line2: o.ai_plat_line2.trim() };
  }
  if (o.rank_line1.trim() || o.rank_line2.trim()) {
    payload.ai_ranking_summary = { line1: o.rank_line1.trim(), line2: o.rank_line2.trim() };
  }
  put('ai_ranking_subtitle', o.ai_ranking_subtitle);
  put('baseline_visibility', o.baseline_visibility);
  // 固定 3 槽位按索引保存，避免只改第 2 条时覆盖到第 1 条
  const optPayload = o.opt_suggestions.map((item) => {
    if (!optItemHasContent(item)) return {};
    const row: OptimizationSuggestionOverride = {};
    if (item.title.trim()) row.title = item.title.trim();
    if (item.platform.trim()) row.platform = item.platform.trim();
    if (item.trigger.trim()) row.trigger = item.trigger.trim();
    if (item.output.trim()) row.output = item.output.trim();
    if (item.intentType.trim()) row.intentType = item.intentType.trim();
    if (item.metrics.trim()) row.metrics = item.metrics.trim();
    const lines = item.howLinesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length) row.howLines = lines;
    return row;
  });
  if (optPayload.some((slot) => Object.keys(slot).length > 0)) {
    payload.optimization_suggestions = optPayload;
  }
  const table: Record<string, string[]> = {};
  Object.entries(o.table).forEach(([pid, arr]) => {
    const cleaned = (arr || []).map((s) => (s || '').trim());
    if (cleaned.some((s) => s)) table[pid] = cleaned;
  });
  if (Object.keys(table).length > 0) payload.ai_ranking_table = table;
  const matrixPayload = o.platform_matrix.map((slot) => {
    const row: NonNullable<ReportDisplayOverrides['ai_platform_matrix']>[number] = {};
    if (slot.keyword.trim()) row.keyword = slot.keyword.trim();
    const cells: Record<string, AiPlatformMatrixCellOverride> = {};
    Object.entries(slot.cells).forEach(([pid, val]) => {
      if (val === 'mentioned' || val === 'none') cells[pid] = val;
    });
    if (Object.keys(cells).length) row.cells = cells;
    return row;
  });
  if (matrixPayload.some((slot) => Object.keys(slot).length > 0)) {
    payload.ai_platform_matrix = matrixPayload;
  }
  return payload;
}

/** 「字段 + 真实值参考」单元 */
const OverrideField: React.FC<{
  label: string;
  refVal?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputCls: string;
  labelCls: string;
}> = ({ label, refVal, value, onChange, placeholder, inputCls, labelCls }) => (
  <div>
    <label className={labelCls}>
      {label}
      {refVal != null && <span className="font-normal">（真实值：{refVal}）</span>}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || '留空用真实值'}
      className={inputCls}
    />
  </div>
);

interface EditAnalysisFormProps {
  theme: Theme;
  reportId: number;
  onBack: () => void;
}

const EditAnalysisForm: React.FC<EditAnalysisFormProps> = ({ theme, reportId, onBack }) => {
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [report, setReport] = useState<DiagnosisReportData | null>(null);
  const [displayOverrides, setDisplayOverrides] = useState<OverridesState>(EMPTY_OVERRIDES);

  /** 去掉覆盖层后的真实计算视图，作为各覆盖字段的参考值 / placeholder */
  const enrichedReal = useMemo(() => {
    if (!report) return null;
    const ind =
      report.indicatorData && typeof report.indicatorData === 'object' && !Array.isArray(report.indicatorData)
        ? (() => {
            const copy = { ...(report.indicatorData as Record<string, unknown>) };
            delete copy.display_overrides;
            return copy;
          })()
        : report.indicatorData;
    return enrichGeoReportForView({ ...report, indicatorData: ind } as DiagnosisReportData);
  }, [report]);

  const realOptSuggestions = useMemo(() => {
    const ind = report?.indicatorData;
    if (!ind || Array.isArray(ind) || typeof ind !== 'object') return [] as Array<Record<string, unknown>>;
    const arr = (ind as { optimizationSuggestions?: unknown }).optimizationSuggestions;
    return Array.isArray(arr) ? (arr as Array<Record<string, unknown>>) : [];
  }, [report]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await diagnosisReportAPI.getById(reportId);
        if (data) {
          setReport(data);
          const ind = data.indicatorData && !Array.isArray(data.indicatorData) ? data.indicatorData : {};
          setDisplayOverrides(overridesStateFromStored((ind as Record<string, unknown>).display_overrides));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reportId]);

  const handleSave = async () => {
    if (!report) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const overridesPayload = overridesPayloadFromState(displayOverrides);
      const indData =
        report.indicatorData && typeof report.indicatorData === 'object' && !Array.isArray(report.indicatorData)
          ? { ...(report.indicatorData as Record<string, unknown>), display_overrides: overridesPayload }
          : { display_overrides: overridesPayload };
      await diagnosisReportAPI.update(reportId, { indicator_data: indData });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const patchOverrides = (patch: Partial<OverridesState>) => {
    setDisplayOverrides((s) => ({ ...s, ...patch }));
  };
  const patchOptSuggestion = (index: number, patch: Partial<OptSuggestionFormItem>) => {
    setDisplayOverrides((s) => {
      const next = [...s.opt_suggestions];
      next[index] = { ...(next[index] ?? EMPTY_OPT_ITEM), ...patch };
      return { ...s, opt_suggestions: next };
    });
  };
  const updateOverrideTableCell = (pid: string, rankIdx: number, val: string) => {
    setDisplayOverrides((s) => {
      const arr = s.table[pid] ? [...s.table[pid]] : ['', '', '', '', ''];
      arr[rankIdx] = val;
      return { ...s, table: { ...s.table, [pid]: arr } };
    });
  };
  const patchPlatformMatrixKeyword = (rowIdx: number, keyword: string) => {
    setDisplayOverrides((s) => {
      const next = [...s.platform_matrix];
      next[rowIdx] = { ...(next[rowIdx] ?? EMPTY_MATRIX_SLOT), keyword };
      return { ...s, platform_matrix: next };
    });
  };
  const patchPlatformMatrixCell = (rowIdx: number, pid: string, val: '' | AiPlatformMatrixCellOverride) => {
    setDisplayOverrides((s) => {
      const next = [...s.platform_matrix];
      const slot = next[rowIdx] ?? { ...EMPTY_MATRIX_SLOT };
      next[rowIdx] = {
        ...slot,
        cells: { ...slot.cells, [pid]: val },
      };
      return { ...s, platform_matrix: next };
    });
  };

  const matrixCols = enrichedReal?._aiPlatformCols ?? [];
  const matrixRealRows = enrichedReal?._aiPlatformRows ?? [];

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-[#FF9B85]' : 'text-[#E8553F]'}`} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className={`p-6 rounded-xl ${isDark ? 'bg-zinc-900/50' : 'bg-white'}`}>
        <p className={isDark ? 'text-red-400' : 'text-red-600'}>加载失败</p>
        <button
          onClick={onBack}
          className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-slate-100 text-slate-700'}`}
        >
          <ChevronLeft className="w-4 h-4" /> 返回列表
        </button>
      </div>
    );
  }

  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm ${
    isDark ? 'bg-zinc-800 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
  }`;
  const labelCls = `block text-xs font-semibold mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`;
  const sectionTitleCls = `text-sm font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`;

  const bars = enrichedReal?._compareBars ?? [];
  const mentionBar = bars.find((b) => b.label === '品牌提及率');
  const countBar = bars.find((b) => b.label === '品牌提及次数');
  const realAvgRank = enrichedReal?.visibilityCards?.find((c) => c.title === '平均提及排名');
  const realPos = enrichedReal?.visibilityCards?.find((c) => c.title === '正面提及倾向')?.value ?? '—';
  const realNeu = enrichedReal?.visibilityCards?.find((c) => c.title === '中性提及倾向')?.value ?? '—';
  const realBaselineVis = report?.visibility != null ? String(report.visibility) : '—';

  const fieldCommon = { inputCls, labelCls };
  const textareaCls = `${inputCls} min-h-[72px] resize-y`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            isDark ? 'text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ChevronLeft className="w-4 h-4" /> 返回列表
        </button>
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          编辑分析报告 · {report.brandName || report.brandId} · {report.batchId || report.taskId}
        </h2>
      </div>

      {error && (
        <div className={`p-4 rounded-xl ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
          {error}
        </div>
      )}
      {success && (
        <div className={`p-4 rounded-xl ${isDark ? 'bg-green-900/20 text-green-400' : 'bg-green-50 text-green-700'}`}>
          保存成功
        </div>
      )}

      <div className={`rounded-2xl border p-6 space-y-8 ${isDark ? 'bg-zinc-900/50 border-white/10' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-between items-start">
          <div>
            <h3 className={sectionTitleCls}>展示覆盖（报告页展示层）</h3>
            <p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              只影响 SaaS 报告页与分享页的展示，不修改任何原始/聚合数据。开关关闭立即恢复真实计算值；留空字段始终用真实值。
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0">
            <span className={`text-xs font-semibold ${displayOverrides.enabled ? (isDark ? 'text-[#FF9B85]' : 'text-[#E8553F]') : isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              {displayOverrides.enabled ? '已开启覆盖' : '展示真实值'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={displayOverrides.enabled}
              onClick={() => patchOverrides({ enabled: !displayOverrides.enabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                displayOverrides.enabled ? 'bg-[#E8553F]' : isDark ? 'bg-zinc-700' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  displayOverrides.enabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </label>
        </div>

        <div className={`space-y-8 ${displayOverrides.enabled ? '' : 'opacity-60'}`}>
          <section>
            <h4 className={`${sectionTitleCls} mb-3`}>首屏 PK（品牌得分 / 竞品对比）</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <OverrideField
                {...fieldCommon}
                label="品牌得分（0-100）"
                refVal={String(enrichedReal?._brandScore ?? '—')}
                value={displayOverrides.brand_score}
                onChange={(v) => patchOverrides({ brand_score: v })}
              />
              <OverrideField
                {...fieldCommon}
                label="PK 竞品名称"
                refVal={enrichedReal?._compName ?? '—'}
                value={displayOverrides.rival_name}
                onChange={(v) => patchOverrides({ rival_name: v })}
              />
              <OverrideField
                {...fieldCommon}
                label="竞品得分（0-100）"
                refVal={String(enrichedReal?._compScore ?? '—')}
                value={displayOverrides.rival_score}
                onChange={(v) => patchOverrides({ rival_score: v })}
              />
              <OverrideField
                {...fieldCommon}
                label="品牌提及率 %"
                refVal={mentionBar?.leftText ?? '—'}
                value={displayOverrides.mention_rate}
                onChange={(v) => patchOverrides({ mention_rate: v })}
              />
              <OverrideField
                {...fieldCommon}
                label="品牌提及次数"
                refVal={countBar?.leftText ?? '—'}
                value={displayOverrides.mention_count}
                onChange={(v) => patchOverrides({ mention_count: v })}
              />
              <OverrideField
                {...fieldCommon}
                label="平均提及排名（雷达图）"
                refVal={
                  realAvgRank
                    ? `${realAvgRank.value}${realAvgRank.unit ? ` ${realAvgRank.unit}` : ''}`
                    : '—'
                }
                value={displayOverrides.avg_rank}
                onChange={(v) => patchOverrides({ avg_rank: v })}
                placeholder="如 1、2.5、未上榜"
              />
              <OverrideField
                {...fieldCommon}
                label="竞品提及率 %"
                refVal={mentionBar?.rightText ?? '—'}
                value={displayOverrides.rival_mention_rate}
                onChange={(v) => patchOverrides({ rival_mention_rate: v })}
              />
              <OverrideField
                {...fieldCommon}
                label="竞品提及次数"
                refVal={countBar?.rightText ?? '—'}
                value={displayOverrides.rival_mention_count}
                onChange={(v) => patchOverrides({ rival_mention_count: v })}
              />
            </div>
          </section>

          <section>
            <h4 className={`${sectionTitleCls} mb-3`}>现状分析（工作流页）</h4>
            <p className={`text-xs mb-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              覆盖「已生成基线诊断报告 · 基线可见度：X%」中的可见度数字，不影响 workflow 表原始值。
            </p>
            <OverrideField
              {...fieldCommon}
              label="基线可见度 %"
              refVal={realBaselineVis}
              value={displayOverrides.baseline_visibility}
              onChange={(v) => patchOverrides({ baseline_visibility: v })}
              placeholder="如 42"
            />
          </section>

          <section>
            <h4 className={`${sectionTitleCls} mb-3`}>情感倾向（可见性卡片 / 雷达 / 首屏情感条）</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <OverrideField
                {...fieldCommon}
                label="正面提及倾向 %"
                refVal={realPos}
                value={displayOverrides.sentiment_positive}
                onChange={(v) => patchOverrides({ sentiment_positive: v })}
                placeholder="0-100，留空用真实值"
              />
              <OverrideField
                {...fieldCommon}
                label="中性提及倾向 %"
                refVal={realNeu}
                value={displayOverrides.sentiment_neutral}
                onChange={(v) => patchOverrides({ sentiment_neutral: v })}
                placeholder="留空 = 100 - 正面"
              />
            </div>
          </section>

          <section>
            <h4 className={`${sectionTitleCls} mb-3`}>区块总结文案</h4>
            <div className="space-y-5">
              {[
                {
                  title: '首屏 PK 总结（对比卡下方两行）',
                  l1Key: 'fs_line1' as const,
                  l2Key: 'fs_line2' as const,
                  ref1: enrichedReal?._fsSummaryLine1,
                  ref2: enrichedReal?._fsSummaryLine2,
                },
                {
                  title: '可见性分析总结',
                  l1Key: 'vis_line1' as const,
                  l2Key: 'vis_line2' as const,
                  ref1: enrichedReal?._visibilitySummaryLine1,
                  ref2: enrichedReal?._visibilitySummaryLine2,
                },
                {
                  title: 'AI 提及排行榜总结',
                  l1Key: 'rank_line1' as const,
                  l2Key: 'rank_line2' as const,
                  ref1: enrichedReal?._aiRankingSummaryLine1,
                  ref2: enrichedReal?._aiRankingSummaryLine2,
                },
              ].map((blk) => (
                <div key={blk.title}>
                  <label className={labelCls}>{blk.title}</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={displayOverrides[blk.l1Key]}
                      onChange={(e) => patchOverrides({ [blk.l1Key]: e.target.value } as Partial<OverridesState>)}
                      placeholder={blk.ref1 ? `第一行，真实值：${blk.ref1}` : '第一行，留空用真实值'}
                      className={inputCls}
                    />
                    <input
                      type="text"
                      value={displayOverrides[blk.l2Key]}
                      onChange={(e) => patchOverrides({ [blk.l2Key]: e.target.value } as Partial<OverridesState>)}
                      placeholder={blk.ref2 ? `第二行，真实值：${blk.ref2}` : '第二行，留空用真实值'}
                      className={inputCls}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h4 className={`${sectionTitleCls} mb-3`}>AI 平台竞争力分析（强势场景矩阵）</h4>
            <p className={`text-xs mb-4 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              报告页仅展示排名最优的前 {DISPLAY_TOP_KEYWORD_ROWS} 个强势场景。可按槽位覆盖核心词与各平台「有提及 / 未提及」；留空则用真实值。
            </p>
            {matrixCols.length > 0 ? (
              <div className="space-y-6">
                {Array.from({ length: DISPLAY_TOP_KEYWORD_ROWS }, (_, rowIdx) => {
                  const realRow = matrixRealRows[rowIdx];
                  const slot = displayOverrides.platform_matrix[rowIdx] ?? EMPTY_MATRIX_SLOT;
                  return (
                    <div
                      key={rowIdx}
                      className={`rounded-xl border p-4 space-y-3 ${isDark ? 'border-white/10 bg-zinc-800/40' : 'border-slate-200 bg-slate-50'}`}
                    >
                      <div className={`text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                        强势场景 {rowIdx + 1}
                      </div>
                      <OverrideField
                        {...fieldCommon}
                        label="核心词"
                        refVal={realRow?.keyword || '—'}
                        value={slot.keyword}
                        onChange={(v) => patchPlatformMatrixKeyword(rowIdx, v)}
                      />
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[480px]">
                          <thead>
                            <tr className={isDark ? 'text-zinc-500' : 'text-slate-400'}>
                              {matrixCols.map((col) => (
                                <th key={col.id} className="text-left py-2 pr-2 font-semibold">
                                  {col.name}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              {matrixCols.map((col, colIdx) => {
                                const realLabel = realRow
                                  ? platformRankToMentionLabel(realRow.platforms[colIdx] || 'none')
                                  : '—';
                                const cellVal = slot.cells[col.id] ?? '';
                                return (
                                  <td key={col.id} className="py-2 pr-2">
                                    <select
                                      value={cellVal}
                                      onChange={(e) => {
                                        const v = e.target.value as '' | AiPlatformMatrixCellOverride;
                                        patchPlatformMatrixCell(rowIdx, col.id, v);
                                      }}
                                      className={inputCls}
                                    >
                                      <option value="">用真实值（{realLabel}）</option>
                                      <option value="mentioned">有提及</option>
                                      <option value="none">未提及</option>
                                    </select>
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={`text-sm py-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                暂无平台数据，无法编辑竞争力矩阵覆盖
              </p>
            )}
            <div
              className={`mt-6 rounded-xl border p-4 space-y-3 ${isDark ? 'border-white/10 bg-zinc-800/40' : 'border-slate-200 bg-slate-50'}`}
            >
              <div className={`text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                矩阵下方总结文案（报告页 AI 平台竞争力分析区块底部两行）
              </div>
              <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                对应报告中的强势/弱势核心词分析与优化建议，留空则用 LLM 真实总结。
              </p>
              <div>
                <label className={labelCls}>
                  第一行
                  {enrichedReal?._aiPlatformSummaryLine1 ? (
                    <span className="font-normal">（真实值：{enrichedReal._aiPlatformSummaryLine1}）</span>
                  ) : null}
                </label>
                <textarea
                  value={displayOverrides.ai_plat_line1}
                  onChange={(e) => patchOverrides({ ai_plat_line1: e.target.value })}
                  placeholder={
                    enrichedReal?._aiPlatformSummaryLine1
                      ? `留空用真实值；示例：${enrichedReal._aiPlatformSummaryLine1.slice(0, 40)}…`
                      : '如：品牌在「高管一对一演讲」等核心词占位较强，但在「演讲逻辑框架」等词上缺失'
                  }
                  className={textareaCls}
                  rows={3}
                />
              </div>
              <div>
                <label className={labelCls}>
                  第二行
                  {enrichedReal?._aiPlatformSummaryLine2 ? (
                    <span className="font-normal">（真实值：{enrichedReal._aiPlatformSummaryLine2}）</span>
                  ) : null}
                </label>
                <textarea
                  value={displayOverrides.ai_plat_line2}
                  onChange={(e) => patchOverrides({ ai_plat_line2: e.target.value })}
                  placeholder={
                    enrichedReal?._aiPlatformSummaryLine2
                      ? `留空用真实值；示例：${enrichedReal._aiPlatformSummaryLine2.slice(0, 40)}…`
                      : '如：针对弱势核心词需补充课程内容到各平台，尤其强化豆包平台的核心词覆盖'
                  }
                  className={textareaCls}
                  rows={2}
                />
              </div>
            </div>
          </section>

          <section>
            <h4 className={`${sectionTitleCls} mb-3`}>AI 提及排行榜</h4>
            <OverrideField
              {...fieldCommon}
              label="副标题（Top5 占位说明）"
              refVal={enrichedReal?._aiRankingSubtitle ?? AI_RANKING_DEFAULT_SUBTITLE}
              value={displayOverrides.ai_ranking_subtitle}
              onChange={(v) => patchOverrides({ ai_ranking_subtitle: v })}
            />
            <p className={`text-xs mt-4 mb-3 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              表格第1~5名，留空格子用真实值；填写内容命中品牌名时会自动高亮。
            </p>
            {(enrichedReal?._aiPlatformCols?.length ?? 0) > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={isDark ? 'text-zinc-500' : 'text-slate-400'}>
                      <th className="text-left py-2 pr-2 w-16 font-semibold">排名</th>
                      {enrichedReal!._aiPlatformCols.map((col) => (
                        <th key={col.id} className="text-left py-2 pr-2 font-semibold">{col.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 1, 2, 3, 4].map((rankIdx) => (
                      <tr key={rankIdx} className={isDark ? 'border-t border-white/5' : 'border-t border-slate-100'}>
                        <td className={`py-2 pr-2 text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>第{rankIdx + 1}名</td>
                        {enrichedReal!._aiPlatformCols.map((col, colIdx) => {
                          const realText = enrichedReal?._aiRankingRows?.[rankIdx]?.cells?.[colIdx]?.text ?? '-';
                          return (
                            <td key={col.id} className="py-2 pr-2">
                              <input
                                type="text"
                                value={displayOverrides.table[col.id]?.[rankIdx] ?? ''}
                                onChange={(e) => updateOverrideTableCell(col.id, rankIdx, e.target.value)}
                                placeholder={realText}
                                className={inputCls}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={`text-sm py-2 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>暂无平台数据，无法编辑排行榜覆盖</p>
            )}
          </section>

          <section>
            <h4 className={`${sectionTitleCls} mb-3`}>优化建议</h4>
            <p className={`text-xs mb-4 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              最多 3 条，按条覆盖；单字段留空则用 LLM 真实值。
            </p>
            <div className="space-y-6">
              {displayOverrides.opt_suggestions.map((item, idx) => {
                const real = (realOptSuggestions[idx] || {}) as Record<string, unknown>;
                const realHow = howLinesToText(real.howLines);
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border p-4 space-y-3 ${isDark ? 'border-white/10 bg-zinc-800/40' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <div className={`text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>建议 {idx + 1}</div>
                    <OverrideField
                      {...fieldCommon}
                      label="标题"
                      refVal={str(real.title) || '—'}
                      value={item.title}
                      onChange={(v) => patchOptSuggestion(idx, { title: v })}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <OverrideField
                        {...fieldCommon}
                        label="优先优化平台"
                        refVal={str(real.platform) || '—'}
                        value={item.platform}
                        onChange={(v) => patchOptSuggestion(idx, { platform: v })}
                      />
                      <OverrideField
                        {...fieldCommon}
                        label="覆盖的意图类型"
                        refVal={str(real.intentType) || '—'}
                        value={item.intentType}
                        onChange={(v) => patchOptSuggestion(idx, { intentType: v })}
                      />
                    </div>
                    <OverrideField
                      {...fieldCommon}
                      label="触发点"
                      refVal={str(real.trigger) || '—'}
                      value={item.trigger}
                      onChange={(v) => patchOptSuggestion(idx, { trigger: v })}
                    />
                    <div>
                      <label className={labelCls}>
                        要产出
                        <span className="font-normal">（真实值：{str(real.output) || '—'}）</span>
                      </label>
                      <textarea
                        value={item.output}
                        onChange={(e) => patchOptSuggestion(idx, { output: e.target.value })}
                        placeholder="留空用真实值"
                        className={textareaCls}
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>
                        怎么写（每行一条）
                        <span className="font-normal">（真实值见 placeholder）</span>
                      </label>
                      <textarea
                        value={item.howLinesText}
                        onChange={(e) => patchOptSuggestion(idx, { howLinesText: e.target.value })}
                        placeholder={realHow || '留空用真实值'}
                        className={textareaCls}
                        rows={3}
                      />
                    </div>
                    <OverrideField
                      {...fieldCommon}
                      label="预期提升指标"
                      refVal={str(real.metrics) || '—'}
                      value={item.metrics}
                      onChange={(v) => patchOptSuggestion(idx, { metrics: v })}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              saving ? 'opacity-60 cursor-not-allowed' : ''
            } bg-gradient-coral text-white shadow-coral hover:opacity-95`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditAnalysisForm;
