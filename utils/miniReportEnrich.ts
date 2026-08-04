/**
 * 与小程序 mini/pages/report/report.js 中 normalizeReport + enrichForView 对齐，
 * 将 diagnosis API 返回的报告转为 PC 报表展示用视图模型。
 */

import type { DiagnosisReportData } from '../api/diagnosisReport';

export const AI_PLATFORM_DESC =
  '展示词包核心词中品牌排名最优的前 3 个强势场景在各 AI 平台下的竞争占位。';

export const DISPLAY_TOP_KEYWORD_ROWS = 3;

export const CITATION_PREF_DESC =
  '揭示不同AI模型在生成答案时，对特定渠道或内容类型的抓取倾向与依赖程度。';

const FS_SUMMARY_FOOT = 'PK竞品选取方式：基于 AI 对话数据智能识别';

/** 与快速开始 / 分析明细中 AI 平台资源一致 */
const PLATFORM_LABEL_AND_ICON: Record<string, { name: string; icon: string }> = {
  doubao: { name: '豆包', icon: '/imgs/ai-icons/doubao.png' },
  deepseek: { name: 'DeepSeek', icon: '/imgs/ai-icons/deepseek.png' },
  wenxin: { name: '文心一言', icon: '/imgs/ai-icons/wenxin.png' },
  qianwen: { name: '通义千问', icon: '/imgs/ai-icons/tongyi.png' },
  yuanbao: { name: '腾讯元宝', icon: '/imgs/ai-icons/yuanbao.png' },
  kimi: { name: 'Kimi', icon: '/imgs/ai-icons/kimi.png' },
  quark: { name: '夸克', icon: '/imgs/ai-icons/quark.png' },
  nami: { name: '纳米', icon: '/imgs/ai-icons/nami.png' },
  xunfei: { name: '讯飞星火', icon: '/imgs/ai-icons/xunfei.png' },
  zhipu: { name: '智谱', icon: '/imgs/ai-icons/zhipu.png' },
};

export function resolvePlatformColumn(pid: string): { id: string; name: string; icon: string } {
  const id = String(pid || '')
    .toLowerCase()
    .trim();
  const key = id || 'doubao';
  const m = PLATFORM_LABEL_AND_ICON[key];
  if (m) return { id: key, name: m.name, icon: m.icon };
  return { id: key, name: key, icon: '' };
}

export function parsePct(s: string | undefined | null): number {
  const n = parseFloat(String(s == null ? '' : s).replace(/%/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatReportDateTime(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function circleBrandText(name: string | undefined): string {
  const s = String(name || '').trim();
  if (!s) return '品牌';
  return s.length <= 4 ? s : s.slice(0, 4);
}

function normRankForRadar(rank: number): number {
  const maxR = 5;
  const r = Number(rank);
  if (!Number.isFinite(r) || r <= 0) return 0;
  return Math.max(0, Math.min(1, (maxR - r) / (maxR - 1)));
}

function normMentionCount(n: number, denom: number): number {
  const d = Math.max(1, denom);
  return Math.max(0, Math.min(1, Number(n) / d));
}

function rankToNumber(rank: string): number | null {
  const r = String(rank || '').toLowerCase().trim();
  const m = /^top(\d)$/.exec(r);
  if (m) return parseInt(m[1]!, 10);
  return null;
}

function resolvePlatformRank(
  pid: string,
  item: QAItem,
  primaryPid: string
): string {
  const ranks = item.brandRanks || {};
  let r = String(
    ranks[pid] || (pid === primaryPid ? item.brandRank : 'none') || 'none'
  ).toLowerCase();
  if (!['top1', 'top2', 'top3', 'top4', 'top5'].includes(r)) r = 'none';
  return r;
}

function brandRankSortKey(rank: string): number {
  const n = rankToNumber(rank);
  return n ?? 999;
}

/** 该题是否在任一平台有品牌提及（top1~top5） */
function hasBrandMentionOnAnyPlatform(
  item: QAItem,
  platformIds: string[],
  primaryPid: string
): boolean {
  const pids = platformIds.length ? platformIds : [primaryPid];
  return pids.some((pid) => resolvePlatformRank(pid, item, primaryPid) !== 'none');
}

/** 全平台最优排名（用于排序，越小越强） */
function bestBrandRankSortKey(item: QAItem, platformIds: string[], primaryPid: string): number {
  const pids = platformIds.length ? platformIds : [primaryPid];
  const keys = pids.map((pid) => brandRankSortKey(resolvePlatformRank(pid, item, primaryPid)));
  return Math.min(...keys);
}

/** 从全部语义词诊断结果中取「至少有一平台有提及」且排名最优的前 N 条 */
export function selectTopQuestionAnalysisByBrandRank(
  questionAnalysis: QAItem[],
  primaryPid: string,
  limit = DISPLAY_TOP_KEYWORD_ROWS,
  platformIds?: string[]
): QAItem[] {
  const qa = Array.isArray(questionAnalysis) ? questionAnalysis : [];
  if (!qa.length) return [];
  const pids = platformIds?.length ? platformIds : [primaryPid];
  const mentioned = qa.filter((item) => hasBrandMentionOnAnyPlatform(item, pids, primaryPid));
  const sorted = [...mentioned].sort((a, b) => {
    const ra = bestBrandRankSortKey(a, pids, primaryPid);
    const rb = bestBrandRankSortKey(b, pids, primaryPid);
    if (ra !== rb) return ra - rb;
    const ia = typeof a.questionIndex === 'number' ? a.questionIndex : 0;
    const ib = typeof b.questionIndex === 'number' ? b.questionIndex : 0;
    return ia - ib;
  });
  return sorted.slice(0, Math.max(0, limit));
}

function computeAvgBrandRank(
  questionAnalysis: QAItem[],
  primaryPid: string
): { avg: number | null; display: string } {
  const nums: number[] = [];
  for (const item of questionAnalysis) {
    const r = resolvePlatformRank(primaryPid, item, primaryPid);
    const n = rankToNumber(r);
    if (n != null) nums.push(n);
  }
  if (!nums.length) return { avg: null, display: '未上榜' };
  const avg = +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
  return { avg, display: String(avg) };
}

type CompetitorRow = NonNullable<DiagnosisReportData['competitors']>[number];

export function pickTopRival(
  comps: DiagnosisReportData['competitors'],
  brandName: string
): CompetitorRow | null {
  const brandLower = String(brandName || '').toLowerCase().trim();
  const rivals = (comps || []).filter((c) => {
    const name = String(c.name || '').toLowerCase().trim();
    if (name && name === brandLower) return false;
    const t = String(c.type || '');
    if (t.includes('客户')) return false;
    return true;
  });
  if (!rivals.length) return null;
  return [...rivals].sort((a, b) => parsePct(b.visibility) - parsePct(a.visibility))[0]!;
}

export type PkLeaderboardRow = {
  rank: number;
  name: string;
  score: number;
  isSelf: boolean;
};

/** PK 上方品牌评分榜：Top5；本品不在 Top5 时追加本品真实名次 */
function buildPkLeaderboard(
  comps: DiagnosisReportData['competitors'],
  brandName: string,
  brandScore: number,
): { rows: PkLeaderboardRow[]; showEllipsis: boolean } {
  const bn = (brandName || '').trim();
  const rivalScores = new Map<string, number>();
  for (const c of comps || []) {
    if (String(c.type || '').includes('客户')) continue;
    const name = String(c.name || '').trim();
    if (!name || brandNameMatchesEntry(bn, name)) continue;
    const score = Math.min(100, Math.round(parsePct(c.visibility)));
    const prev = rivalScores.get(name);
    if (prev == null || score > prev) rivalScores.set(name, score);
  }

  const entries = [
    ...[...rivalScores.entries()].map(([name, score]) => ({
      name,
      score,
      isSelf: false,
    })),
    {
      name: bn || '本品牌',
      score: brandScore,
      isSelf: true,
    },
  ].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // 分数相同时优化本品牌排第一
    if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
    return a.name.localeCompare(b.name, 'zh-CN');
  });

  const ranked: PkLeaderboardRow[] = entries.map((row, i) => ({
    ...row,
    rank: i + 1,
  }));

  if (ranked.length === 0) {
    return { rows: [], showEllipsis: false };
  }

  const top5 = ranked.slice(0, 5);
  if (top5.some((r) => r.isSelf)) {
    return { rows: top5, showEllipsis: false };
  }

  const selfRow = ranked.find((r) => r.isSelf);
  if (!selfRow) {
    return { rows: top5, showEllipsis: false };
  }

  return {
    rows: [...top5, selfRow],
    showEllipsis: selfRow.rank > 6,
  };
}

function findCompetitorByName(
  comps: DiagnosisReportData['competitors'],
  brandName: string,
  rivalName: string,
): CompetitorRow | null {
  const target = (rivalName || '').trim();
  if (!target) return null;
  const rivals = (comps || []).filter((c) => {
    if (String(c.type || '').includes('客户')) return false;
    const name = String(c.name || '').trim();
    if (!name || brandNameMatchesEntry(brandName, name)) return false;
    return true;
  });
  return (
    rivals.find((c) => {
      const name = String(c.name || '').trim();
      return name === target || brandNameMatchesEntry(name, target);
    }) ?? null
  );
}

function buildPkCompareBars(
  hasRival: boolean,
  selfMention: number,
  selfCnt: number,
  rivalMention: number,
  rivalCnt: number,
  pkSentimentPct: number,
): EnrichedGeoReport['_compareBars'] {
  const sumM = Math.max(0.01, selfMention + rivalMention);
  const mentionLeftPct = Math.min(100, Math.max(0, Math.round((selfMention / sumM) * 100)));
  const sumC = Math.max(0, selfCnt + rivalCnt);
  const countLeftPct =
    sumC > 0 ? Math.min(100, Math.max(0, Math.round((selfCnt / sumC) * 100))) : 0;

  return [
    {
      label: '品牌提及率',
      leftText: `${Math.round(selfMention)}%`,
      rightText: hasRival ? `${Math.round(rivalMention)}%` : '—',
      leftPercent: mentionLeftPct,
    },
    {
      label: '品牌提及次数',
      leftText: String(selfCnt),
      rightText: hasRival ? String(rivalCnt) : '—',
      leftPercent: countLeftPct,
    },
    {
      label: '评价情感倾向',
      leftText: `${pkSentimentPct}%`,
      rightText: hasRival ? `${DEFAULT_PK_SENTIMENT_PERCENT}%` : '—',
      leftPercent:
        hasRival && pkSentimentPct !== DEFAULT_PK_SENTIMENT_PERCENT
          ? Math.min(
              100,
              Math.max(
                0,
                Math.round((pkSentimentPct / (pkSentimentPct + DEFAULT_PK_SENTIMENT_PERCENT)) * 100),
              ),
            )
          : 50,
    },
  ];
}

function resolvePkRivalBadge(
  comps: DiagnosisReportData['competitors'],
  brandName: string,
  compName: string,
  hasRival: boolean,
  leaderboard: PkLeaderboardRow[],
): string | null {
  if (!hasRival) return null;
  const defaultTop = pickTopRival(comps, brandName);
  const defaultTopName = String(defaultTop?.name || '').trim();
  if (
    defaultTopName
    && (compName === defaultTopName || brandNameMatchesEntry(compName, defaultTopName))
  ) {
    return '竞品TOP 1';
  }
  const lbRow = leaderboard.find(
    (r) => !r.isSelf && (r.name === compName || brandNameMatchesEntry(r.name, compName)),
  );
  return lbRow ? `第${lbRow.rank}名` : null;
}

export type InteractivePkView = {
  selectedRivalName: string;
  compName: string;
  compScore: number;
  hasRival: boolean;
  rivalBadge: string | null;
  compareBars: EnrichedGeoReport['_compareBars'];
  fsSummaryLine1: string;
  fsSummaryLine2: string;
};

/** 排行榜点击切换 PK 竞品；未指定或与默认 TOP1 一致时回落 enrich 默认值 */
export function buildInteractivePkView(
  report: DiagnosisReportData,
  enriched: EnrichedGeoReport,
  selectedRivalName: string | null,
): InteractivePkView {
  const comps = report.competitors || [];
  const defaultName = (enriched._defaultPkRivalName || enriched._compName || '').trim();
  const targetName = (selectedRivalName || defaultName).trim();
  const isDefaultSelection =
    !selectedRivalName
    || !targetName
    || targetName === defaultName
    || brandNameMatchesEntry(targetName, defaultName);

  if (isDefaultSelection) {
    return {
      selectedRivalName: defaultName,
      compName: enriched._compName,
      compScore: enriched._compScore,
      hasRival: enriched._hasRival,
      rivalBadge: resolvePkRivalBadge(comps, report.brandName, enriched._compName, enriched._hasRival, enriched._pkLeaderboard),
      compareBars: enriched._compareBars,
      fsSummaryLine1: enriched._fsSummaryLine1,
      fsSummaryLine2: enriched._fsSummaryLine2,
    };
  }

  const rivalRow = findCompetitorByName(comps, report.brandName, targetName);
  const hasRival = rivalRow != null;
  const compName = hasRival ? String(rivalRow!.name || targetName) : enriched._compName;
  const compScore = hasRival
    ? Math.min(100, Math.round(parsePct(rivalRow!.visibility)))
    : enriched._compScore;
  const brandScore = enriched._brandScore;
  const selfMention = enriched._pkSelfMention;
  const selfCnt = enriched._pkSelfCnt;
  const pkSentimentPct = enriched._pkSentimentPct;

  let rivalMention = hasRival ? parsePct(rivalRow!.visibility) : 0;
  const totalAns = Number(report.totalAnswers) || 0;
  const rivalCnt =
    hasRival && rivalRow!.count != null && rivalRow!.count !== ''
      ? Math.max(0, Math.round(Number(rivalRow!.count)))
      : totalAns > 0
        ? Math.max(0, Math.round((totalAns * rivalMention) / 100))
        : 0;

  const brandAhead = hasRival ? brandScore >= compScore : brandScore > 0;
  const fsSum = buildFirstScreenSummaryLines(
    report.brandName,
    brandScore,
    compName,
    compScore,
    brandAhead,
    hasRival,
  );

  return {
    selectedRivalName: compName,
    compName,
    compScore,
    hasRival,
    rivalBadge: resolvePkRivalBadge(comps, report.brandName, compName, hasRival, enriched._pkLeaderboard),
    compareBars: buildPkCompareBars(hasRival, selfMention, selfCnt, rivalMention, rivalCnt, pkSentimentPct),
    fsSummaryLine1: fsSum.line1,
    fsSummaryLine2: fsSum.line2,
  };
}

function resolveSelfMetrics(
  report: DiagnosisReportData,
  comps: DiagnosisReportData['competitors']
): { selfMention: number; selfCnt: number } {
  const selfCustomer = (comps || []).find((c) => String(c.type || '').includes('客户'));
  const selfMention = parsePct(report.visibility);
  const totalAns = Number(report.totalAnswers) || 0;
  if (selfCustomer?.count != null && selfCustomer.count !== '') {
    return {
      selfMention,
      selfCnt: Math.max(0, Math.round(Number(selfCustomer.count))),
    };
  }
  const selfCnt =
    totalAns > 0 ? Math.max(0, Math.round((totalAns * selfMention) / 100)) : 0;
  return { selfMention, selfCnt };
}

/** PK 对比条：提及情感默认视为正向 */
const DEFAULT_PK_SENTIMENT_PERCENT = 100;

/**
 * 展示覆盖层（存于 indicator_data.display_overrides）：
 * enabled 为 true 时，报告页（SaaS/分享页）展示覆盖值；关闭或字段为空时回落到真实计算值。
 */
export type ReportDisplayOverrides = {
  enabled?: boolean;
  /** 品牌得分（0-100，首屏大数字 / 可见性卡片 / 雷达） */
  brand_score?: number | string;
  /** PK 竞品名称 */
  rival_name?: string;
  /** PK 竞品得分（0-100） */
  rival_score?: number | string;
  /** 品牌提及率 %（0-100） */
  mention_rate?: number | string;
  /** 品牌提及次数 */
  mention_count?: number | string;
  /** 竞品提及率 %（0-100） */
  rival_mention_rate?: number | string;
  /** 竞品提及次数 */
  rival_mention_count?: number | string;
  /** 平均提及排名展示值，如 "1"、"2.5"、"未上榜" */
  avg_rank?: string;
  sentiment?: { positive?: number | string; neutral?: number | string };
  fs_summary?: { line1?: string; line2?: string };
  visibility_summary?: { line1?: string; line2?: string };
  /** AI 平台竞争力分析总结（矩阵下方两行） */
  ai_platform_summary?: { line1?: string; line2?: string };
  ai_ranking_summary?: { line1?: string; line2?: string };
  /** AI 提及排行榜副标题，如「识别品牌得分前5名（Top5）占位情况」 */
  ai_ranking_subtitle?: string;
  /** 平台id -> 5 个品牌名（第1~5名），空串表示该格用真实值 */
  ai_ranking_table?: Record<string, string[]>;
  /** 优化建议列表（按条覆盖，字段留空回落真实值） */
  optimization_suggestions?: OptimizationSuggestionOverride[];
  /** 现状分析页「基线可见度」展示值（%） */
  baseline_visibility?: number | string;
  /** AI 平台竞争力矩阵，固定 3 槽位按索引覆盖（核心词 × 平台 有提及/未提及） */
  ai_platform_matrix?: AiPlatformMatrixRowOverride[];
};

/** 矩阵单格：mentioned=有提及，none=未提及；字段留空则用真实值 */
export type AiPlatformMatrixCellOverride = 'mentioned' | 'none';

export type AiPlatformMatrixRowOverride = {
  keyword?: string;
  cells?: Record<string, AiPlatformMatrixCellOverride | string>;
};

export type OptimizationSuggestionOverride = {
  title?: string;
  platform?: string;
  trigger?: string;
  output?: string;
  howLines?: string[] | string;
  intentType?: string;
  metrics?: string;
};

export const AI_RANKING_DEFAULT_SUBTITLE =
  '各平台 Top5 推荐名单中，各品牌（含本品牌）出现次数排名（前5）';

export function extractDisplayOverrides(
  indicatorData: unknown
): ReportDisplayOverrides | null {
  if (!indicatorData || typeof indicatorData !== 'object' || Array.isArray(indicatorData)) return null;
  const raw = (indicatorData as { display_overrides?: unknown }).display_overrides;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as ReportDisplayOverrides;
}

function ovPct(v: number | string | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function ovText(v: string | undefined): string {
  return v != null ? String(v).trim() : '';
}

function ovCount(v: number | string | undefined): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n));
}

function ovHowLines(v: string[] | string | undefined): string[] | null {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const lines = v.map((s) => String(s).trim()).filter(Boolean);
    return lines.length ? lines : null;
  }
  const lines = String(v)
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return lines.length ? lines : null;
}

function optimizationOverrideHasContent(o: OptimizationSuggestionOverride | undefined): boolean {
  if (!o) return false;
  return Boolean(
    (o.title != null && String(o.title).trim()) ||
      (o.platform != null && String(o.platform).trim()) ||
      (o.trigger != null && String(o.trigger).trim()) ||
      (o.output != null && String(o.output).trim()) ||
      (o.intentType != null && String(o.intentType).trim()) ||
      (o.metrics != null && String(o.metrics).trim()) ||
      ovHowLines(o.howLines)
  );
}

/** 按索引合并：ovList[i] 只覆盖第 i+1 条建议，空槽位保持真实值 */
function mergeOptimizationSuggestions(
  real: Array<Record<string, unknown>>,
  ovList: OptimizationSuggestionOverride[] | undefined
): Array<Record<string, unknown>> {
  if (!ovList?.length || !ovList.some(optimizationOverrideHasContent)) return real;
  const maxLen = Math.max(real.length, ovList.length);
  const out: Array<Record<string, unknown>> = [];
  for (let i = 0; i < maxLen; i++) {
    const base =
      real[i] && typeof real[i] === 'object' ? ({ ...real[i] } as Record<string, unknown>) : null;
    const o = ovList[i];
    if (!optimizationOverrideHasContent(o)) {
      if (base) out.push(base);
      continue;
    }
    const merged: Record<string, unknown> = base ? { ...base } : {};
    const pick = (key: keyof OptimizationSuggestionOverride) => {
      const v = o![key];
      if (v != null && String(v).trim()) merged[key] = String(v).trim();
    };
    pick('title');
    pick('platform');
    pick('trigger');
    pick('output');
    pick('intentType');
    pick('metrics');
    const hl = ovHowLines(o!.howLines);
    if (hl) merged.howLines = hl;
    merged.id = merged.id ?? `opt-${i + 1}`;
    merged.num = merged.num ?? String(i + 1);
    out.push(merged);
  }
  return out.length ? out : real;
}

/** 现状分析页基线可见度：覆盖开启且字段有值时优先，否则 workflow → 报告 visibility */
export function resolveDisplayBaselineVisibility(
  report: DiagnosisReportData | null | undefined,
  workflowBaseline: number | null | undefined
): number | null {
  const ov = report ? extractDisplayOverrides(report.indicatorData) : null;
  if (ov?.enabled) {
    const n = ovPct(ov.baseline_visibility);
    if (n != null) return n;
  }
  if (workflowBaseline != null && Number.isFinite(workflowBaseline)) return workflowBaseline;
  if (report?.visibility) {
    const n = parsePct(report.visibility);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** 正面 + 中性 = 100%（无真实情感字段时的占位，按 reportId 稳定） */
function placeholderSentimentPair(seed: number): { positive: number; neutral: number } {
  const positive = 55 + (Math.abs(seed) % 31);
  return { positive, neutral: 100 - positive };
}

const VIS_RADAR_LABELS = [
  '品牌得分',
  '品牌提及率',
  '品牌提及次数',
  '平均提及排名',
  '正面提及倾向',
  '中性提及倾向',
];

export type RadarRow = { subject: string; brand: number; industry: number };

function buildVisibilityAnalysis(
  brandScore: number,
  selfMention: number,
  selfCnt: number,
  avgRank: number | null,
  totalAnswers: number,
  posPct: number,
  neuPct: number
): {
  radarRows: RadarRow[];
  visibilityCards: Array<{
    title: string;
    value: string;
    unit: string;
    cmpGrey: string;
    cmpPurple: string;
  }>;
} {
  const rankForRadar = avgRank ?? 5;
  const rankDisplay = avgRank != null ? String(avgRank) : '未上榜';
  const countDenom = Math.max(totalAnswers, selfCnt, 1);

  const brandSeries = [
    Math.max(0, Math.min(1, brandScore / 100)),
    Math.max(0, Math.min(1, selfMention / 100)),
    normMentionCount(selfCnt, countDenom),
    avgRank != null ? normRankForRadar(rankForRadar) : 0,
    Math.max(0, Math.min(1, posPct / 100)),
    Math.max(0, Math.min(1, neuPct / 100)),
  ];

  const radarRows: RadarRow[] = VIS_RADAR_LABELS.map((subject, i) => ({
    subject,
    brand: Math.round(brandSeries[i]! * 100),
    industry: 0,
  }));

  const noBenchmark = { cmpGrey: '行业基准', cmpPurple: '暂无数据' };

  const visibilityCards = [
    {
      title: '品牌得分',
      value: String(brandScore),
      unit: '分',
      ...noBenchmark,
    },
    {
      title: '品牌提及率',
      value: String(Math.round(selfMention)),
      unit: '%',
      ...noBenchmark,
    },
    {
      title: '品牌提及次数',
      value: String(selfCnt),
      unit: '次',
      ...noBenchmark,
    },
    {
      title: '平均提及排名',
      value: rankDisplay,
      unit: avgRank != null ? '名次' : '',
      ...noBenchmark,
    },
    {
      title: '正面提及倾向',
      value: String(posPct),
      unit: '%',
      ...noBenchmark,
    },
    {
      title: '中性提及倾向',
      value: String(neuPct),
      unit: '%',
      ...noBenchmark,
    },
  ];

  return { radarRows, visibilityCards };
}

function buildFirstScreenSummaryLines(
  brandName: string,
  brandScore: number,
  compName: string,
  compScore: number,
  brandAhead: boolean,
  hasRival: boolean
): { line1: string; line2: string } {
  const name = (brandName || '本品牌').trim() || '本品牌';
  const comp = (compName || '抽样竞品').trim() || '抽样竞品';

  if (brandScore === 0) {
    return {
      line1: `${name}暂未进入 AI 推荐列表（0分）`,
      line2: hasRival
        ? `抽样竞品 ${comp}（${compScore}分）已在相关场景中被推荐，建议加强内容布局与信源曝光。`
        : '建议针对核心问句补充可被 AI 引用的结构化内容。',
    };
  }

  if (!hasRival) {
    return {
      line1: `${name}品牌可见度为 ${brandScore} 分`,
      line2: '当前暂无可用抽样竞品对比，建议持续监测核心词下的 AI 推荐表现。',
    };
  }

  if (brandAhead) {
    return {
      line1: `${name}位列 GEO 领先（${brandScore}分），相对 ${comp}（${compScore}分）`,
      line2: '在提及率、提及次数与平均提及排名上整体更优，建议持续巩固可见度优势。',
    };
  }
  return {
    line1: `${name}（${brandScore}分）相对领先竞品 ${comp}（${compScore}分）仍有差距`,
    line2: '提及率、提及次数、平均提及排名仍需突破。',
  };
}

function sectionBrandLabel(brandName: string | undefined): string {
  const s = String(brandName || '').trim();
  return s || '本品牌';
}

function buildVisibilitySectionSummary(brandName: string | undefined) {
  const n = sectionBrandLabel(brandName);
  return {
    line1: `${n}在六维雷达上展示得分、提及率、提及次数、平均排名与情感倾向结构。`,
    line2: '前四维来自本次诊断问答实测；正/中性提及占比为占位估算（二者合计 100%）。',
    foot: '说明：行业均值与负面情感待接入行业基准及情感分析后展示。',
  };
}

function buildAiPlatformSectionSummary(brandName: string | undefined) {
  const n = sectionBrandLabel(brandName);
  return {
    line1: `各 AI 平台核心词下的 Top 排名/未提及分布，反映 ${n} 在不同模型场景下的竞争占位差异。`,
    line2: '对长期「未提及」或弱势的核心词，可针对对应模型补充问答素材与可抓取的结构化内容。',
    foot: '',
  };
}

const RANK_TO_SLOT_INDEX: Record<string, number> = {
  top1: 0,
  top2: 1,
  top3: 2,
  top4: 3,
  top5: 4,
};

function brandNameMatchesEntry(brandName: string, entry: string): boolean {
  const bn = (brandName || '').trim().toLowerCase();
  const en = (entry || '').trim().toLowerCase();
  if (!bn || !en) return false;
  if (bn === en) return true;
  return bn.includes(en) || en.includes(bn);
}

/** brandRanks 有名次但 topBrands 缺本品牌时，展示层按名次补回（兼容历史报告） */
function ensureSelfBrandInTopList(
  brandName: string,
  names: string[],
  rank: string,
  limit = 5
): string[] {
  const rv = String(rank || 'none').toLowerCase();
  if (!(rv in RANK_TO_SLOT_INDEX)) return names.slice(0, limit);
  const bn = (brandName || '').trim();
  if (!bn) return names.slice(0, limit);
  if (names.some((n) => brandNameMatchesEntry(bn, n))) return names.slice(0, limit);
  const idx = RANK_TO_SLOT_INDEX[rv]!;
  const out = names.filter((n) => !brandNameMatchesEntry(bn, n));
  if (idx >= out.length) out.push(bn);
  else out.splice(idx, 0, bn);
  return out.slice(0, limit);
}

function isSelfBrandInRankingCell(cellText: string, brandName: string | undefined): boolean {
  const t = String(cellText || '').trim().toLowerCase();
  const b = String(brandName || '').trim().toLowerCase();
  if (!t || t === '-' || !b) return false;
  return brandNameMatchesEntry(b, t);
}

function buildAiRankingSectionSummary(brandName: string | undefined) {
  const n = sectionBrandLabel(brandName);
  return {
    line1: `各平台 Top5 推荐名单中，各品牌（含 ${n}）出现次数构成排行榜，反映 AI 回答中的集中推荐程度。`,
    line2: '可对照本品牌与各竞品的上榜频次，复盘内容表达与信源特征并优化跨模型曝光。',
    foot: '',
  };
}

type QAItem = {
  keyword?: string;
  brandRank?: string;
  brandRanks?: Record<string, string>;
  topBrands?: string[];
  topBrandsByPlatform?: Record<string, string[]>;
  questionIndex?: number;
};

/** 排行榜聚合时过滤解析噪声（如 Markdown ---、小节标题） */
function isGarbageRankingBrand(name: string): boolean {
  const t = String(name || '').trim();
  if (!t || t === '-') return true;
  if (/^-{2,}$/.test(t)) return true;
  if (/^[-—–_=~*`#|:\\/.·•\s]{2,}$/.test(t)) return true;
  if (/^\d+\.?$/.test(t)) return true;
  if (/[?？]$/.test(t)) return true;
  if (/^(为什么|如何|怎么|哪些|什么|是否)/.test(t)) return true;
  return false;
}

function filterRankingBrands(names: string[]): string[] {
  return names.map((x) => String(x).trim()).filter((x) => x && !isGarbageRankingBrand(x));
}

function topBrandsForPlatform(
  item: QAItem,
  pid: string,
  primaryPid: string,
  brandName?: string
): string[] {
  const byPlat = item.topBrandsByPlatform;
  let list: string[] = [];
  if (byPlat && typeof byPlat === 'object') {
    const raw = byPlat[pid];
    if (Array.isArray(raw) && raw.length) {
      list = filterRankingBrands(raw);
    }
  }
  if (!list.length && pid === primaryPid && Array.isArray(item.topBrands) && item.topBrands.length) {
    list = filterRankingBrands(item.topBrands);
  }
  if (brandName) {
    const rank = resolvePlatformRank(pid, item, primaryPid);
    if (rank !== 'none') {
      list = ensureSelfBrandInTopList(brandName, list, rank);
    }
  }
  return list;
}

function resolvePlatformIdsForMatrix(
  indicatorData: Record<string, unknown>,
  questionAnalysis: QAItem[]
): string[] {
  const rm = (
    indicatorData as {
      reportMeta?: { requestedAiPlatforms?: string[]; executedAiPlatforms?: string[] };
    }
  ).reportMeta;
  const req = rm?.requestedAiPlatforms;
  const exe = rm?.executedAiPlatforms;
  if (Array.isArray(req) && req.length) {
    return [...new Set(req.map((x) => String(x).toLowerCase().trim()).filter(Boolean))];
  }
  if (Array.isArray(exe) && exe.length) {
    return [...new Set(exe.map((x) => String(x).toLowerCase().trim()).filter(Boolean))];
  }
  const first = questionAnalysis[0];
  const br = first?.brandRanks;
  if (br && typeof br === 'object' && Object.keys(br).length) {
    return Object.keys(br).sort();
  }
  return ['doubao', 'qianwen', 'yuanbao'];
}

export type AiPlatformMatrixRow = {
  rowId: string;
  keyword: string;
  platforms: string[];
};

function buildAiPlatformFromApi(questionAnalysis: QAItem[], platformIds: string[]): {
  cols: ReturnType<typeof resolvePlatformColumn>[];
  rows: AiPlatformMatrixRow[];
} {
  const qa = Array.isArray(questionAnalysis) ? questionAnalysis : [];
  const pids = platformIds.length ? platformIds : ['doubao'];
  const primaryPid = pids[0] || 'doubao';
  const cols = pids.map((pid) => resolvePlatformColumn(pid));
  const rows = qa.map((item, idx) => {
    const platforms = pids.map((pid) => resolvePlatformRank(pid, item, primaryPid));
    const qIdx = typeof item.questionIndex === 'number' ? item.questionIndex : idx;
    return {
      rowId: `kw-${qIdx}-${item.keyword || idx}`,
      keyword: item.keyword || '未知',
      platforms,
    };
  });
  return { cols, rows };
}

/** 平台排名码 -> 报告页「有提及 / 未提及」文案 */
export function platformRankToMentionLabel(rank: string): '有提及' | '未提及' {
  const r = String(rank || '').toLowerCase();
  if (r === 'none') return '未提及';
  if (['top1', 'top2', 'top3', 'top4', 'top5'].includes(r)) return '有提及';
  return '未提及';
}

function normalizeMatrixCellOverride(v: unknown): AiPlatformMatrixCellOverride | null {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return null;
  if (s === 'mentioned' || s === '有提及' || s === 'mention') return 'mentioned';
  if (s === 'none' || s === '未提及') return 'none';
  return null;
}

function matrixRowHasOverride(slot: AiPlatformMatrixRowOverride | undefined): boolean {
  if (!slot) return false;
  if (ovText(slot.keyword)) return true;
  if (slot.cells && typeof slot.cells === 'object') {
    return Object.values(slot.cells).some((v) => normalizeMatrixCellOverride(v) != null);
  }
  return false;
}

/** 合并 AI 平台竞争力矩阵展示覆盖（enabled 时由 enrich 调用） */
export function applyAiPlatformMatrixOverrides(
  rows: AiPlatformMatrixRow[],
  platformIds: string[],
  overrides: AiPlatformMatrixRowOverride[] | undefined,
  limit = DISPLAY_TOP_KEYWORD_ROWS
): AiPlatformMatrixRow[] {
  const pids = platformIds.length ? platformIds : ['doubao'];
  const emptyRow = (i: number): AiPlatformMatrixRow => ({
    rowId: `kw-slot-${i}`,
    keyword: '',
    platforms: pids.map(() => 'none'),
  });

  if (!overrides?.length) {
    return rows.slice(0, limit);
  }

  const result: AiPlatformMatrixRow[] = [];
  for (let i = 0; i < limit; i++) {
    const real = rows[i];
    const slot = overrides[i];
    if (slot && matrixRowHasOverride(slot)) {
      const base = real ?? emptyRow(i);
      const keyword = ovText(slot.keyword) || base.keyword;
      const platforms = pids.map((pid, colIdx) => {
        const ovCell =
          slot.cells && typeof slot.cells === 'object'
            ? normalizeMatrixCellOverride(slot.cells[pid])
            : null;
        if (ovCell === 'mentioned') return 'top1';
        if (ovCell === 'none') return 'none';
        return base.platforms[colIdx] || 'none';
      });
      if (keyword || real) {
        result.push({
          ...base,
          keyword: keyword || '未知',
          platforms,
        });
      }
    } else if (real) {
      result.push(real);
    }
  }
  return result.length ? result : rows.slice(0, limit);
}

/** 单平台：摊平各题 topBrands，按出现次数降序取前 5（每品牌只占一行） */
function topBrandsByOccurrenceForPlatform(
  questionAnalysis: QAItem[],
  pid: string,
  primaryPid: string,
  brandName: string | undefined,
  limit = 5,
): string[] {
  const freq: Record<string, number> = {};
  const firstSeen: string[] = [];
  for (const item of questionAnalysis) {
    for (const raw of topBrandsForPlatform(item, pid, primaryPid, brandName)) {
      const b = String(raw || '').trim();
      if (!b) continue;
      if (freq[b] == null) {
        freq[b] = 0;
        firstSeen.push(b);
      }
      freq[b]! += 1;
    }
  }
  return [...firstSeen]
    .sort((a, b) => {
      const diff = (freq[b] ?? 0) - (freq[a] ?? 0);
      if (diff !== 0) return diff;
      return a.localeCompare(b, 'zh-CN');
    })
    .slice(0, limit);
}

function buildAiRankingFromApi(questionAnalysis: QAItem[], brandName: string | undefined, platformIds: string[]) {
  const qa = Array.isArray(questionAnalysis) ? questionAnalysis : [];
  const pids = platformIds.length ? platformIds : ['doubao'];
  const primaryPid = pids[0] || 'doubao';
  const rankKeys = ['gold', 'silver', 'bronze', 'label', 'label'] as const;
  const rankLabels = ['', '', '', '第4名', '第5名'];

  const topByPlatform: Record<string, string[]> = {};
  pids.forEach((pid) => {
    topByPlatform[pid] = topBrandsByOccurrenceForPlatform(qa, pid, primaryPid, brandName, 5);
  });

  const rows: Array<{
    rowId: string;
    rankKey: string;
    rankLabel?: string;
    cells: Array<{ text: string; highlight: boolean }>;
  }> = [];

  for (let rank = 0; rank < 5; rank++) {
    const cells = pids.map((pid) => {
      const brandText = topByPlatform[pid]?.[rank] || '-';
      const truncated = brandText.length > 8 ? `${brandText.slice(0, 7)}…` : brandText;
      const isHl = isSelfBrandInRankingCell(brandText, brandName);
      return { text: truncated, highlight: isHl };
    });
    const row: (typeof rows)[0] = {
      rowId: `rk-${rank + 1}`,
      rankKey: rankKeys[rank]!,
      cells,
    };
    if (rankLabels[rank]) row.rankLabel = rankLabels[rank];
    rows.push(row);
  }

  return { subtitle: AI_RANKING_DEFAULT_SUBTITLE, rows };
}

function assignWordCloudCls(index: number, total: number): string {
  const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];
  const purples = [
    'text-violet-700',
    'text-violet-600',
    'text-fuchsia-600',
    'text-purple-600',
    'text-indigo-600',
  ];
  const sizeIdx = total <= 5 ? 0 : index < 3 ? 0 : index < 8 ? 1 : 2;
  return `${sizes[Math.min(sizeIdx, sizes.length - 1)]!} ${purples[index % purples.length]!} font-semibold`;
}

function buildPositiveWordsFromApi(keywords: string[]) {
  const kw = Array.isArray(keywords) ? keywords : [];
  return kw.map((text, i) => ({
    id: `pw-${i + 1}`,
    text: String(text),
    wcCls: assignWordCloudCls(i, kw.length),
  }));
}

type CitationPref = { platform?: string; name?: string; sources?: Array<{ name?: string; pct?: string; rank?: number }> };

/** 信源展示名：历史数据「无」→「未知」 */
export function formatCitationSiteName(name: string | undefined | null): string {
  const s = String(name ?? '').trim();
  if (!s || s === '无') return '未知';
  return s;
}

function buildCitationPlatformsFromApi(citationPref: CitationPref[]) {
  const prefs = Array.isArray(citationPref) ? citationPref.slice() : [];
  const ICONS = ['🥇', '🥈', '🥉'];
  return prefs.map((p) => {
    const base = resolvePlatformColumn(p.platform || '');
    const meta = {
      id: base.id,
      name: (p.name && String(p.name).trim()) || base.name,
      icon: base.icon,
    };
    let sources = Array.isArray(p.sources) ? p.sources.slice() : [];
    while (sources.length < 10) sources.push({ rank: sources.length + 1, name: '-', pct: '0%' });
    const cells = sources.slice(0, 10).map((s, i) => ({
      rankNum: i + 1,
      icon: i < 3 ? ICONS[i] : '',
      name: s.name ? formatCitationSiteName(s.name) : '-',
      pct: s.pct || '0%',
    }));
    const pairRows = [];
    for (let i = 0; i < 5; i++) {
      pairRows.push({
        rowId: `cr-${i}`,
        left: cells[i]!,
        right: cells[i + 5]!,
      });
    }
    return { id: `cite-${meta.id}`, name: meta.name, icon: meta.icon, pairRows };
  });
}

export type EnrichedGeoReport = DiagnosisReportData & {
  industry?: string;
  mvpSummary?: string | null;
  _dateTimeFull: string;
  _brandScore: number;
  _compScore: number;
  _compName: string;
  _hasRival: boolean;
  _showIndustryBenchmark: boolean;
  _brandCircleText: string;
  _rivalCircleText: string;
  _pkLeaderboard: PkLeaderboardRow[];
  _pkLeaderboardShowEllipsis: boolean;
  _defaultPkRivalName: string;
  _pkSelfMention: number;
  _pkSelfCnt: number;
  _pkSentimentPct: number;
  _compareBars: Array<{
    label: string;
    leftText: string;
    rightText: string;
    leftPercent: number;
  }>;
  _fsSummaryLine1: string;
  _fsSummaryLine2: string;
  _fsSummaryFoot: string;
  radarRows: RadarRow[];
  visibilityCards: ReturnType<typeof buildVisibilityAnalysis>['visibilityCards'];
  _visibilitySummaryLine1: string;
  _visibilitySummaryLine2: string;
  _visibilitySummaryFoot: string;
  _aiPlatformDesc: string;
  _aiPlatformCols: ReturnType<typeof buildAiPlatformFromApi>['cols'];
  _aiPlatformRows: ReturnType<typeof buildAiPlatformFromApi>['rows'];
  _aiPlatformSummaryLine1: string;
  _aiPlatformSummaryLine2: string;
  _aiPlatformSummaryFoot: string;
  _aiRankingSubtitle: string;
  _aiRankingRows: ReturnType<typeof buildAiRankingFromApi>['rows'];
  _aiRankingSummaryLine1: string;
  _aiRankingSummaryLine2: string;
  _aiRankingSummaryFoot: string;
  _positiveWords: ReturnType<typeof buildPositiveWordsFromApi>;
  _citationPrefDesc: string;
  _citationPlatforms: ReturnType<typeof buildCitationPlatformsFromApi>;
  _optimizationSuggestions: Array<Record<string, unknown>>;
};

function getIndustry(r: DiagnosisReportData): string {
  const ind = r.indicatorData;
  if (ind && !Array.isArray(ind) && typeof ind === 'object') {
    const rm = (ind as { reportMeta?: { industry?: string } }).reportMeta;
    if (rm?.industry) return String(rm.industry);
  }
  return (r as { industry?: string }).industry || '';
}

export function enrichGeoReportForView(report: DiagnosisReportData | null): EnrichedGeoReport | null {
  if (!report) return null;

  let indicatorData =
    report.indicatorData && typeof report.indicatorData === 'object' && !Array.isArray(report.indicatorData)
      ? { ...(report.indicatorData as Record<string, unknown>) }
      : {};

  const questionAnalysis = (Array.isArray((indicatorData as { questionAnalysis?: QAItem[] }).questionAnalysis)
    ? (indicatorData as { questionAnalysis: QAItem[] }).questionAnalysis
    : []) as QAItem[];

  const ovRaw = extractDisplayOverrides(indicatorData);
  const ov = ovRaw && ovRaw.enabled === true ? ovRaw : null;

  const comps = report.competitors || [];
  const rival = pickTopRival(comps, report.brandName);
  const ovRivalName = ov ? ovText(ov.rival_name) : '';
  const hasRival = rival != null || ovRivalName.length > 0;
  const rivalName = ovRivalName || (rival && rival.name) || '';

  let brandScore = Math.min(100, Math.round(parsePct(report.visibility)));
  const ovBrandScore = ov ? ovPct(ov.brand_score) : null;
  if (ovBrandScore != null) brandScore = ovBrandScore;

  let compScore = rival ? Math.min(100, Math.round(parsePct(rival.visibility))) : 0;
  const ovRivalScore = ov ? ovPct(ov.rival_score) : null;
  if (ovRivalScore != null) compScore = ovRivalScore;

  let { selfMention, selfCnt } = resolveSelfMetrics(report, comps);
  const ovMentionRate = ov ? ovPct(ov.mention_rate) : null;
  if (ovMentionRate != null) selfMention = ovMentionRate;
  const ovMentionCnt = ov ? ovCount(ov.mention_count) : null;
  if (ovMentionCnt != null) selfCnt = ovMentionCnt;

  let rivalMention = rival ? parsePct(rival.visibility) : 0;
  const ovRivalMentionRate = ov ? ovPct(ov.rival_mention_rate) : null;
  if (ovRivalMentionRate != null) rivalMention = ovRivalMentionRate;
  const totalAns = Number(report.totalAnswers) || 0;
  let rivalCnt =
    rival != null && rival.count != null && rival.count !== ''
      ? Math.max(0, Math.round(Number(rival.count)))
      : totalAns > 0
        ? Math.max(0, Math.round((totalAns * rivalMention) / 100))
        : 0;
  const ovRivalCnt = ov ? ovCount(ov.rival_mention_count) : null;
  if (ovRivalCnt != null) rivalCnt = ovRivalCnt;

  const platformIds = resolvePlatformIdsForMatrix(indicatorData as Record<string, unknown>, questionAnalysis);
  const primaryPid = platformIds[0] || 'doubao';
  let { avg: avgRank, display: avgRankDisplay } = computeAvgBrandRank(questionAnalysis, primaryPid);

  const ovRankText = ov ? ovText(ov.avg_rank) : '';
  if (ovRankText) {
    avgRankDisplay = ovRankText;
    const n = parseFloat(ovRankText);
    avgRank = Number.isFinite(n) && n > 0 ? n : null;
  }

  const brandAhead = hasRival ? brandScore >= compScore : brandScore > 0;

  const fsSum = buildFirstScreenSummaryLines(
    report.brandName,
    brandScore,
    rivalName,
    compScore,
    brandAhead,
    hasRival
  );
  if (ov?.fs_summary) {
    const l1 = ovText(ov.fs_summary.line1);
    const l2 = ovText(ov.fs_summary.line2);
    if (l1) fsSum.line1 = l1;
    if (l2) fsSum.line2 = l2;
  }

  let { positive: posPct, neutral: neuPct } = placeholderSentimentPair(Number(report.id) || 0);
  if (ov?.sentiment) {
    const p = ovPct(ov.sentiment.positive);
    const nn = ovPct(ov.sentiment.neutral);
    if (p != null) {
      posPct = p;
      neuPct = nn != null ? nn : 100 - p;
    } else if (nn != null) {
      neuPct = nn;
      posPct = 100 - nn;
    }
  }
  const pkSentimentPct = ov?.sentiment && ovPct(ov.sentiment.positive) != null
    ? posPct
    : DEFAULT_PK_SENTIMENT_PERCENT;

  const { radarRows, visibilityCards } = buildVisibilityAnalysis(
    brandScore,
    selfMention,
    selfCnt,
    avgRank,
    totalAns,
    posPct,
    neuPct
  );
  if (ovRankText) {
    const rankCard = visibilityCards.find((c) => c.title === '平均提及排名');
    if (rankCard) {
      rankCard.value = avgRankDisplay;
      rankCard.unit = avgRank != null ? '名次' : '';
    }
  }

  const aiSummaries =
    (indicatorData as { sectionSummaries?: Record<string, { line1?: string; line2?: string; foot?: string }> })
      .sectionSummaries || {};
  const visSecSum = {
    ...(aiSummaries.visibility?.line1 ? aiSummaries.visibility : buildVisibilitySectionSummary(report.brandName)),
  };
  const aiPlatSecSum =
    aiSummaries.aiPlatform?.line1 ? aiSummaries.aiPlatform : buildAiPlatformSectionSummary(report.brandName);
  const aiRankSecSum = {
    ...(aiSummaries.aiRanking?.line1 ? aiSummaries.aiRanking : buildAiRankingSectionSummary(report.brandName)),
  };
  if (ov?.visibility_summary) {
    const l1 = ovText(ov.visibility_summary.line1);
    const l2 = ovText(ov.visibility_summary.line2);
    if (l1) visSecSum.line1 = l1;
    if (l2) visSecSum.line2 = l2;
  }
  if (ov?.ai_platform_summary) {
    const l1 = ovText(ov.ai_platform_summary.line1);
    const l2 = ovText(ov.ai_platform_summary.line2);
    if (l1) aiPlatSecSum.line1 = l1;
    if (l2) aiPlatSecSum.line2 = l2;
  }
  if (ov?.ai_ranking_summary) {
    const l1 = ovText(ov.ai_ranking_summary.line1);
    const l2 = ovText(ov.ai_ranking_summary.line2);
    if (l1) aiRankSecSum.line1 = l1;
    if (l2) aiRankSecSum.line2 = l2;
  }

  const displayQuestionAnalysis = selectTopQuestionAnalysisByBrandRank(
    questionAnalysis,
    primaryPid,
    DISPLAY_TOP_KEYWORD_ROWS,
    platformIds
  );
  let aiPlatData = buildAiPlatformFromApi(displayQuestionAnalysis, platformIds);
  if (ov?.ai_platform_matrix?.length) {
    aiPlatData = {
      ...aiPlatData,
      rows: applyAiPlatformMatrixOverrides(
        aiPlatData.rows,
        platformIds,
        ov.ai_platform_matrix,
        DISPLAY_TOP_KEYWORD_ROWS
      ),
    };
  }
  const aiRankData = buildAiRankingFromApi(questionAnalysis, report.brandName, platformIds);
  if (ov?.ai_ranking_table && typeof ov.ai_ranking_table === 'object') {
    const ovTable = ov.ai_ranking_table;
    const brandLower = String(report.brandName || '').toLowerCase();
    const pids = platformIds.length ? platformIds : ['doubao'];
    aiRankData.rows = aiRankData.rows.map((row, rankIdx) => ({
      ...row,
      cells: row.cells.map((cell, colIdx) => {
        const pid = pids[colIdx] || '';
        const arr = ovTable[pid];
        const txt = Array.isArray(arr) ? ovText(arr[rankIdx] as string | undefined) : '';
        if (!txt) return cell;
        return {
          text: txt.length > 8 ? `${txt.slice(0, 7)}…` : txt,
          highlight: brandLower.length > 0 && txt.toLowerCase().includes(brandLower),
        };
      }),
    }));
  }
  if (ov?.ai_ranking_subtitle) {
    const sub = ovText(ov.ai_ranking_subtitle);
    if (sub) aiRankData.subtitle = sub;
  }

  const positiveKeywords = Array.isArray((indicatorData as { positiveKeywords?: string[] }).positiveKeywords)
    ? (indicatorData as { positiveKeywords: string[] }).positiveKeywords
    : [];
  const positiveWords = buildPositiveWordsFromApi(positiveKeywords);

  const citationPref = Array.isArray((indicatorData as { citationPreference?: CitationPref[] }).citationPreference)
    ? (indicatorData as { citationPreference: CitationPref[] }).citationPreference
    : [];
  const citationPlatforms = buildCitationPlatformsFromApi(citationPref);

  const optSuggestionsReal = Array.isArray(
    (indicatorData as { optimizationSuggestions?: Array<Record<string, unknown>> }).optimizationSuggestions
  )
    ? (indicatorData as { optimizationSuggestions: Array<Record<string, unknown>> }).optimizationSuggestions
    : [];
  const optSuggestions = mergeOptimizationSuggestions(
    optSuggestionsReal,
    ov?.optimization_suggestions
  );

  const compareBars = buildPkCompareBars(
    hasRival,
    selfMention,
    selfCnt,
    rivalMention,
    rivalCnt,
    pkSentimentPct,
  );

  const pkLeaderboard = buildPkLeaderboard(comps, report.brandName, brandScore);
  const defaultPkRivalName = rivalName || pickTopRival(comps, report.brandName)?.name || '';

  return {
    ...report,
    industry: getIndustry(report),
    mvpSummary: (report as { mvpSummary?: string }).mvpSummary,
    _dateTimeFull: formatReportDateTime(report.createdAt),
    _brandScore: brandScore,
    _compScore: compScore,
    _compName: rivalName || '暂无抽样竞品',
    _hasRival: hasRival,
    _showIndustryBenchmark: false,
    _brandCircleText: circleBrandText(report.brandName),
    _rivalCircleText: circleBrandText(rivalName || '竞品'),
    _pkLeaderboard: pkLeaderboard.rows,
    _pkLeaderboardShowEllipsis: pkLeaderboard.showEllipsis,
    _defaultPkRivalName: defaultPkRivalName,
    _pkSelfMention: selfMention,
    _pkSelfCnt: selfCnt,
    _pkSentimentPct: pkSentimentPct,
    _compareBars: compareBars,
    _fsSummaryLine1: fsSum.line1,
    _fsSummaryLine2: fsSum.line2,
    _fsSummaryFoot: FS_SUMMARY_FOOT,
    radarRows,
    visibilityCards,
    _visibilitySummaryLine1: visSecSum.line1 || '',
    _visibilitySummaryLine2: visSecSum.line2 || '',
    _visibilitySummaryFoot: visSecSum.foot || '',
    _aiPlatformDesc: AI_PLATFORM_DESC,
    _aiPlatformCols: aiPlatData.cols,
    _aiPlatformRows: aiPlatData.rows,
    _aiPlatformSummaryLine1: aiPlatSecSum.line1 || '',
    _aiPlatformSummaryLine2: aiPlatSecSum.line2 || '',
    _aiPlatformSummaryFoot: aiPlatSecSum.foot || '',
    _aiRankingSubtitle: aiRankData.subtitle,
    _aiRankingRows: aiRankData.rows,
    _aiRankingSummaryLine1: aiRankSecSum.line1 || '',
    _aiRankingSummaryLine2: aiRankSecSum.line2 || '',
    _aiRankingSummaryFoot: aiRankSecSum.foot || '',
    _positiveWords: positiveWords,
    _citationPrefDesc: CITATION_PREF_DESC,
    _citationPlatforms: citationPlatforms,
    _optimizationSuggestions: optSuggestions,
  };
}
