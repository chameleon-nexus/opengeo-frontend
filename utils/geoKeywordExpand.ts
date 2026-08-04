/**
 * 解析品牌「导出扩词」：地区 + 前缀 + 核心 + 行业 + 后缀（与词条生成/造句扩词顺序一致）
 */

import type { GeoCoreKeywordGroup } from './coreKeywordGroups';
import { normalizeCoreKeywordGroups } from './coreKeywordGroups';
import { industryWordFromSubjectCategory } from './diagnosisQuestionParts';

/** 每个核心词至少导出的扩词条数 */
export const GEO_EXPAND_MIN_PER_CORE = 10;

/** GEO 推荐场景前缀（含「的」） */
export const GEO_EXPAND_PREFIX_WORDS = [
  '最靠谱的',
  '最好的',
  '口碑好的',
  '靠谱的',
  '比较好的',
  '专业的',
  '知名的',
  '评价高的',
] as const;

/** GEO 推荐场景后缀 */
export const GEO_EXPAND_SUFFIX_WORDS = [
  '推荐几个',
  '最推荐哪个',
  '推荐哪家',
  '推荐几家',
  '选哪家',
  '最推荐哪家',
  '哪家比较好',
  '怎么选',
] as const;

/** 由行业/品类生成扩词用行业词（如 口才培训 → 口才培训品牌、口才培训厂家） */
export function buildGeoExpandIndustryWords(subjectCategory: string): string[] {
  const raw = (subjectCategory || '').trim() || '该品类';
  const base = raw.replace(/品牌$/, '').replace(/厂家$/, '').trim() || raw;
  const words = new Set<string>();
  words.add(industryWordFromSubjectCategory(raw));
  if (base) {
    words.add(`${base}厂家`);
    if (!base.endsWith('品牌')) {
      words.add(`${base}品牌`);
    }
  }
  return [...words].filter(Boolean);
}

export type GeoExpandedPhrase = {
  core: string;
  phrase: string;
  industry?: string;
  region?: string;
};

/**
 * 对核心词做组合扩词：region × industryGroup × core × prefix × industryWord × suffix
 * 每个核心词至少 minPerCore 条（默认 10）
 */
export function expandGeoKeywordsForExport(params: {
  coreKeywords?: string[];
  coreKeywordGroups?: GeoCoreKeywordGroup[];
  regionWord?: string;
  regionWords?: string[];
  subjectCategory?: string;
  minPerCore?: number;
  maxPerCore?: number;
}): GeoExpandedPhrase[] {
  const groups = params.coreKeywordGroups?.length
    ? normalizeCoreKeywordGroups(params.coreKeywordGroups)
    : normalizeCoreKeywordGroups(params.coreKeywords ?? [], params.subjectCategory);

  const flatCores = groups.flatMap((g) =>
    g.keywords.map((core) => ({ core, industry: g.industry }))
  );
  if (!flatCores.length) return [];

  const minPerCore = Math.max(1, params.minPerCore ?? GEO_EXPAND_MIN_PER_CORE);
  const maxPerCore = Math.max(minPerCore, params.maxPerCore ?? 50);

  const regionList = params.regionWords?.length
    ? params.regionWords.map((s) => s.trim()).filter(Boolean)
    : params.regionWord?.trim()
      ? [params.regionWord.trim()]
      : [''];

  const prefixes = [...GEO_EXPAND_PREFIX_WORDS];
  const suffixes = [...GEO_EXPAND_SUFFIX_WORDS];

  const out: GeoExpandedPhrase[] = [];

  for (const { core, industry: groupIndustry } of flatCores) {
    const c = core.trim();
    if (!c) continue;
    const industries = buildGeoExpandIndustryWords(groupIndustry || params.subjectCategory || '');
    let count = 0;
    outer: for (const region of regionList) {
      for (const prefix of prefixes) {
        for (const industry of industries) {
          for (const suffix of suffixes) {
            if (count >= maxPerCore) break outer;
            out.push({
              core: c,
              industry: groupIndustry,
              region: region || undefined,
              phrase: `${region}${prefix}${c}${industry}${suffix}`,
            });
            count += 1;
          }
        }
      }
    }
  }

  return out;
}
