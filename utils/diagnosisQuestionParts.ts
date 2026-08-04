/** 诊断问句拼装：{地域词}{核心词}的{行业词}{后缀}，行业词 = subjectCategory + 「品牌」 */

import type { GeoDiagnosisQuestionDTO } from '../api/geoWorkflow';
import type { GeoWorkflowQuestionIntent } from '../api/geoWorkflow';
import type { GeoCoreKeywordGroup } from './coreKeywordGroups';
import { normalizeCoreKeywordGroups } from './coreKeywordGroups';

export const DIAGNOSIS_RECOMMENDATION_SUFFIX_WORDS = [
  '推荐哪家',
  '推荐几个',
  '推荐几家',
  '选哪家',
] as const;

export const DIAGNOSIS_EVALUATION_SUFFIX_WORDS = [
  '评测哪家更专业',
  '怎么选',
  '推荐几家靠谱的',
  '值得买吗',
] as const;

export function industryWordFromSubjectCategory(subjectCategory: string): string {
  const s = (subjectCategory || '').trim() || '该品类';
  if (s.endsWith('品牌')) return s;
  return `${s}品牌`;
}

export interface DiagnosisQuestionParts {
  region: string;
  core: string;
  industry: string;
  suffix: string;
  parseOk: boolean;
}

export function splitDiagnosisQuestion(
  text: string,
  core: string,
  subjectCategory: string,
  regionWord?: string
): DiagnosisQuestionParts {
  const c = (core || '').trim();
  const regionHint = (regionWord || '').trim();
  const defaultIndustry = industryWordFromSubjectCategory(subjectCategory);
  const defaults: DiagnosisQuestionParts = {
    region: regionHint,
    core: c,
    industry: defaultIndustry,
    suffix: DIAGNOSIS_RECOMMENDATION_SUFFIX_WORDS[0],
    parseOk: false,
  };
  if (!c) return defaults;

  let t = (text || '').trim().replace(/[？?]+$/, '');
  let region = regionHint;
  if (region && t.startsWith(region)) {
    t = t.slice(region.length);
  } else if (!region) {
    const idxCore = t.indexOf(c);
    if (idxCore > 0) {
      region = t.slice(0, idxCore);
      t = t.slice(idxCore);
    }
  }

  const idx = t.indexOf(c);
  if (idx < 0 || idx > 0) return defaults;

  let rest = t.slice(c.length);
  if (rest.startsWith('的')) rest = rest.slice(1);

  const industryCandidates = [defaultIndustry];
  const bare = defaultIndustry.endsWith('品牌') ? defaultIndustry.slice(0, -2) : defaultIndustry;
  if (bare && bare !== defaultIndustry) industryCandidates.push(bare);

  let industry = defaultIndustry;
  for (const cand of industryCandidates.sort((a, b) => b.length - a.length)) {
    if (cand && rest.startsWith(cand)) {
      industry = cand;
      rest = rest.slice(cand.length);
      break;
    }
  }

  const suffix = rest.trim() || defaults.suffix;
  return { region, core: c, industry, suffix, parseOk: true };
}

export function composeDiagnosisQuestion(parts: {
  region?: string;
  core: string;
  industry: string;
  suffix: string;
}): string {
  const region = (parts.region || '').trim();
  const c = (parts.core || '').trim();
  const ind = (parts.industry || '').trim();
  const suf = (parts.suffix || '').trim();
  const connector = c.endsWith('的') ? '' : '的';
  let s = `${region}${c}${connector}${ind}${suf}`.trim();
  if (!s.endsWith('？') && !s.endsWith('?')) s += '？';
  return s;
}

/** 行业 × 核心词复合键（与后端对齐） */
export function groupCoreKey(industry: string, core: string): string {
  const cat = (industry || '').trim().toLowerCase() || '该品类';
  const c = (core || '').trim().toLowerCase();
  return `${cat}::${c}`;
}

/** 分组 + 多地域签名，用于问句预览缓存对齐 */
export function signatureFromGroups(
  groups: GeoCoreKeywordGroup[] | null | undefined,
  regionWords: string[] | null | undefined
): string {
  const normalized = normalizeCoreKeywordGroups(groups ?? []);
  const parts: string[] = [];
  for (const g of normalized) {
    const ind = (g.industry || '').trim().toLowerCase() || '该品类';
    for (const kw of g.keywords) {
      const k = (kw || '').trim().toLowerCase();
      if (k) parts.push(`${ind}::${k}`);
    }
  }
  parts.sort();
  const regions = (regionWords ?? [])
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean)
    .sort();
  return `${parts.join('|')}@@${regions.join('|')}`;
}

/** 地域 × 行业 × 核心词笛卡尔积重建问句；保留已有 category::core 的后缀 */
export function rebuildDiagnosisQuestionsFromGroups(
  groups: GeoCoreKeywordGroup[],
  regionWords: string[],
  existing: GeoDiagnosisQuestionDTO[],
  questionIntent: GeoWorkflowQuestionIntent = 'recommendation'
): GeoDiagnosisQuestionDTO[] {
  const normalized = normalizeCoreKeywordGroups(groups);
  const regions = (regionWords ?? []).map((r) => r.trim()).filter(Boolean);
  const regionList = regions.length ? regions : [''];

  const suffixPool =
    questionIntent === 'evaluation'
      ? DIAGNOSIS_EVALUATION_SUFFIX_WORDS
      : DIAGNOSIS_RECOMMENDATION_SUFFIX_WORDS;

  const existingByKey = new Map<string, GeoDiagnosisQuestionDTO>();
  for (const q of existing) {
    const core = (q.base_keyword ?? '').trim();
    if (!core) continue;
    const cat = (q.subject_category ?? '').trim();
    existingByKey.set(groupCoreKey(cat, core), q);
    if (!existingByKey.has(core.toLowerCase())) {
      existingByKey.set(core.toLowerCase(), q);
    }
  }

  const out: GeoDiagnosisQuestionDTO[] = [];
  let idx = 0;
  for (const region of regionList) {
    for (const g of normalized) {
      const industryWord = industryWordFromSubjectCategory(g.industry);
      for (const kw of g.keywords) {
        const core = (kw || '').trim();
        if (!core) continue;
        const key = groupCoreKey(g.industry, core);
        const prev = existingByKey.get(key) ?? existingByKey.get(core.toLowerCase());
        let suffix: string;
        if (prev) {
          const parsed = splitDiagnosisQuestion(prev.text, core, g.industry, region);
          suffix = parsed.suffix;
        } else {
          suffix = suffixPool[idx % suffixPool.length];
        }
        out.push({
          text: composeDiagnosisQuestion({ region, core, industry: industryWord, suffix }),
          base_keyword: core,
          subject_category: g.industry,
          region_word: region || undefined,
          dimension: prev?.dimension ?? 'core_keyword',
          score: prev?.score ?? 95 - Math.min(idx, 10),
        });
        idx += 1;
      }
    }
  }
  return out;
}

/** @deprecated 使用 signatureFromGroups */
export function diagnosisInputSignature(keywords: string[], regionWord: string): string {
  return signatureFromGroups([{ industry: '该品类', keywords }], regionWord ? [regionWord] : []);
}

/** @deprecated 使用 rebuildDiagnosisQuestionsFromGroups */
export function rebuildDiagnosisQuestionsFromKeywords(
  keywords: string[],
  regionWord: string,
  subjectCategory: string,
  existing: GeoDiagnosisQuestionDTO[],
  questionIntent: GeoWorkflowQuestionIntent = 'recommendation'
): GeoDiagnosisQuestionDTO[] {
  return rebuildDiagnosisQuestionsFromGroups(
    [{ industry: subjectCategory, keywords }],
    regionWord ? [regionWord] : [],
    existing,
    questionIntent
  );
}
