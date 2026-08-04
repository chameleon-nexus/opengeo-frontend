/**
 * GEO 主线：行业 × 核心词分组 helper（与后端 core_keyword_groups.py 对齐）
 */

import type { GeoWorkflowDTO } from '../api/geoWorkflow';

export interface GeoCoreKeywordGroup {
  industry: string;
  keywords: string[];
}

const DEFAULT_INDUSTRY = '该品类';

/** AI 推断行业模式：每行业核心词生成上限（与后端 INFER_CORE_KEYWORD_MAX 对齐） */
export const INFER_CORE_KEYWORD_MAX = 10;

/** 无核心词时占位造句的正面评价词 */
export const INFER_PLACEHOLDER_CORE_KEYWORDS = ['最好', '靠谱', '优质'] as const;

export function inferPlaceholderCoreKeyword(industryIndex = 0): string {
  const pool = INFER_PLACEHOLDER_CORE_KEYWORDS;
  return pool[industryIndex % pool.length] ?? pool[0];
}

/** AI 推断行业模式：为空行业组注入占位核心词 */
export function ensureInferPlaceholderGroups(
  groups: GeoCoreKeywordGroup[],
  subjectCategories: string[],
  inferByAi: boolean
): GeoCoreKeywordGroup[] {
  if (!inferByAi) return normalizeCoreKeywordGroups(groups);

  const base = normalizeCoreKeywordGroups(groups);
  const byIndustry = new Map(base.map((g) => [g.industry, g]));

  const cats: string[] = [];
  const seen = new Set<string>();
  for (const c of subjectCategories) {
    const ind = cleanIndustry(c);
    if (ind && !seen.has(ind)) {
      seen.add(ind);
      cats.push(ind);
    }
  }
  for (const g of base) {
    if (g.industry && !seen.has(g.industry)) {
      seen.add(g.industry);
      cats.push(g.industry);
    }
  }
  if (!cats.length) return base;

  const out: GeoCoreKeywordGroup[] = [];
  cats.forEach((ind, idx) => {
    const existing = byIndustry.get(ind);
    const kws = existing?.keywords?.length
      ? [...existing.keywords]
      : [inferPlaceholderCoreKeyword(idx)];
    out.push({ industry: ind, keywords: kws });
  });
  return normalizeCoreKeywordGroups(out);
}

function cleanIndustry(raw: unknown): string {
  return String(raw ?? '').trim();
}

function cleanKeyword(raw: unknown): string {
  return String(raw ?? '').trim();
}

/** 归一化分组结构 */
export function normalizeCoreKeywordGroups(
  raw: unknown,
  defaultIndustry?: string
): GeoCoreKeywordGroup[] {
  const fallback = cleanIndustry(defaultIndustry) || DEFAULT_INDUSTRY;
  if (raw == null) return [];

  if (Array.isArray(raw) && raw.length > 0 && raw.every((x) => typeof x === 'string')) {
    const kws = raw.map(cleanKeyword).filter(Boolean);
    if (!kws.length) return [];
    return [{ industry: fallback, keywords: kws }];
  }

  if (!Array.isArray(raw)) return [];

  const out: GeoCoreKeywordGroup[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const kw = cleanKeyword(item);
      if (!kw) continue;
      const last = out[out.length - 1];
      if (last && last.industry === fallback) {
        if (!last.keywords.includes(kw)) last.keywords.push(kw);
      } else {
        out.push({ industry: fallback, keywords: [kw] });
      }
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const ind =
      cleanIndustry(rec.industry ?? rec.subjectCategory ?? rec.subject_category) || fallback;
    const rawKws = (rec.keywords ?? rec.coreKeywords ?? rec.core_keywords) as unknown;
    const kws = Array.isArray(rawKws)
      ? rawKws.map(cleanKeyword).filter(Boolean)
      : [];
    if (!kws.length) continue;
    const existing = out.find((g) => g.industry === ind);
    if (existing) {
      for (const k of kws) {
        if (!existing.keywords.includes(k)) existing.keywords.push(k);
      }
    } else {
      out.push({ industry: ind, keywords: [...kws] });
    }
  }
  return out;
}

/** 从 workflow DTO 读取分组 */
export function readCoreKeywordGroupsFromWorkflow(wf: GeoWorkflowDTO | null | undefined): GeoCoreKeywordGroup[] {
  if (!wf) return [];
  if (wf.coreKeywordGroups?.length) {
    return normalizeCoreKeywordGroups(wf.coreKeywordGroups);
  }
  const legacy = wf.coreKeywords ?? [];
  const industry =
    cleanIndustry(wf.subjectCategory) ||
    cleanIndustry(wf.subjectCategories?.[0]) ||
    DEFAULT_INDUSTRY;
  return normalizeCoreKeywordGroups(legacy, industry);
}

/** 去重保序 flatten */
export function flattenCoreKeywords(
  groups: GeoCoreKeywordGroup[] | null | undefined,
  legacy?: string[] | null
): string[] {
  const normalized = groups?.length
    ? normalizeCoreKeywordGroups(groups)
    : normalizeCoreKeywordGroups(legacy ?? []);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const g of normalized) {
    for (const k of g.keywords) {
      if (k && !seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
  }
  return out;
}

export function flattenCoreKeywordsFromWorkflow(wf: GeoWorkflowDTO | null | undefined): string[] {
  return flattenCoreKeywords(readCoreKeywordGroupsFromWorkflow(wf));
}

export function subjectCategoriesFromGroups(groups: GeoCoreKeywordGroup[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const g of normalizeCoreKeywordGroups(groups)) {
    const ind = cleanIndustry(g.industry);
    if (ind && !seen.has(ind)) {
      seen.add(ind);
      out.push(ind);
    }
  }
  return out;
}

export function subjectCategoriesFromWorkflow(wf: GeoWorkflowDTO | null | undefined): string[] {
  if (!wf) return [];
  if (wf.subjectCategories?.length) {
    return wf.subjectCategories.map(cleanIndustry).filter(Boolean);
  }
  const sc = cleanIndustry(wf.subjectCategory);
  if (sc) return [sc];
  return subjectCategoriesFromGroups(readCoreKeywordGroupsFromWorkflow(wf));
}

export function primarySubjectCategory(wf: GeoWorkflowDTO | null | undefined): string | undefined {
  const cats = subjectCategoriesFromWorkflow(wf);
  return cats[0] || undefined;
}

export function keywordIndustryMap(wf: GeoWorkflowDTO | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of readCoreKeywordGroupsFromWorkflow(wf)) {
    const ind = cleanIndustry(g.industry) || DEFAULT_INDUSTRY;
    for (const k of g.keywords) {
      if (k) out[k] = ind;
    }
  }
  return out;
}

export function readDiagnosisRegionWords(wf: GeoWorkflowDTO | null | undefined): string[] {
  if (!wf) return [];
  if (wf.diagnosisRegionWords?.length) {
    return wf.diagnosisRegionWords.map((x) => String(x).trim()).filter(Boolean);
  }
  const legacy = (wf.diagnosisRegionWord ?? '').trim();
  if (legacy) return [legacy];
  const qs = wf.diagnosisQuestions;
  if (qs?.length) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const q of qs) {
      const rw = String((q as { region_word?: string }).region_word ?? '').trim();
      if (rw && !seen.has(rw)) {
        seen.add(rw);
        out.push(rw);
      }
    }
    if (out.length) return out;
  }
  return [];
}

/** 主线词包优先；无则回落优化任务快照（历史任务可能只在 task 上存地域词） */
export function resolveDiagnosisRegionWords(
  wf: GeoWorkflowDTO | null | undefined,
  taskRegionWords?: string[] | null
): string[] {
  const fromWf = readDiagnosisRegionWords(wf);
  if (fromWf.length) return fromWf;
  if (taskRegionWords?.length) {
    return taskRegionWords.map((x) => String(x).trim()).filter(Boolean);
  }
  return [];
}

/** 成稿场景数：无地域词 = 核心词数；有 N 个地域词 = 核心词 × N */
export function countOptimizationScenarioKeywords(
  coreKeywordCount: number,
  regionWords?: string[] | null
): number {
  const nCore = Math.max(0, coreKeywordCount);
  if (!nCore) return 0;
  const nRegion = (regionWords ?? []).map((x) => String(x).trim()).filter(Boolean).length;
  return nRegion > 0 ? nCore * nRegion : nCore;
}

export function mergeGroupKeywords(
  existing: GeoCoreKeywordGroup[],
  industry: string,
  keywords: string[]
): GeoCoreKeywordGroup[] {
  const ind = cleanIndustry(industry) || DEFAULT_INDUSTRY;
  const base = normalizeCoreKeywordGroups(existing);
  const newKws = keywords.map(cleanKeyword).filter(Boolean);
  if (!newKws.length) return base;
  const found = base.find((g) => g.industry === ind);
  if (found) {
    for (const k of newKws) {
      if (!found.keywords.includes(k)) found.keywords.push(k);
    }
  } else {
    base.push({ industry: ind, keywords: [...newKws] });
  }
  return normalizeCoreKeywordGroups(base);
}
