import type { GeoWorkflowDTO } from '../api/geoWorkflow';
import type { BrandIntakeConfig, SelectedBrand } from '../components/StartOptimization/types';
import {
  primarySubjectCategory,
  subjectCategoriesFromWorkflow,
} from './coreKeywordGroups';

/**
 * 解析用户填写的行业/品类列表，优先于品牌库历史 category。
 */
export function resolveUserSubjectCategories(
  intake: BrandIntakeConfig | null | undefined,
  workflow?: GeoWorkflowDTO | null,
  brand?: SelectedBrand | null
): string[] {
  const fromIntakeArr = (intake?.subjectCategories ?? []).map((x) => x.trim()).filter(Boolean);
  if (fromIntakeArr.length) return fromIntakeArr;

  const legacyIntake = (intake?.subjectCategory ?? '').trim();
  if (legacyIntake) return [legacyIntake];

  const fromWf = subjectCategoriesFromWorkflow(workflow ?? null);
  if (fromWf.length) return fromWf;

  const fromBrand = (brand?.category ?? intake?.brand?.category ?? '').trim();
  return fromBrand ? [fromBrand] : [];
}

/**
 * 解析主行业（词包 finalize 单行业 hint 等场景的兼容入口）。
 */
export function resolveUserSubjectCategory(
  intake: BrandIntakeConfig | null | undefined,
  workflow?: GeoWorkflowDTO | null,
  brand?: SelectedBrand | null
): string | undefined {
  const cats = resolveUserSubjectCategories(intake, workflow, brand);
  if (cats.length) return cats[0];
  return primarySubjectCategory(workflow ?? null);
}

/** 写回 workflow / 品牌展示时：用户输入优先，LLM parse-brand 结果仅作兜底 */
export function pickSubjectCategoryForPersist(opts: {
  userInput?: string | null;
  workflowSubject?: string | null;
  llmSubject?: string | null;
}): string | undefined {
  const user = (opts.userInput ?? '').trim();
  if (user) return user;
  const wf = (opts.workflowSubject ?? '').trim();
  if (wf) return wf;
  const llm = (opts.llmSubject ?? '').trim();
  return llm || undefined;
}

export function pickSubjectCategoriesForPersist(opts: {
  userInputs?: string[] | null;
  workflowSubjects?: string[] | null;
  llmSubject?: string | null;
}): string[] {
  const user = (opts.userInputs ?? []).map((x) => x.trim()).filter(Boolean);
  if (user.length) return user;
  const wf = (opts.workflowSubjects ?? []).map((x) => x.trim()).filter(Boolean);
  if (wf.length) return wf;
  const llm = (opts.llmSubject ?? '').trim();
  return llm ? [llm] : [];
}

/** 将用户行业覆盖到品牌对象（仅内存展示，不访问 API） */
export function brandWithSubjectCategory(
  brand: SelectedBrand,
  subjectCategory: string | undefined
): SelectedBrand {
  const sc = (subjectCategory ?? '').trim();
  if (!sc || brand.category === sc) return brand;
  return { ...brand, category: sc };
}

/** 是否可写回 brands 表（排除 workflow 占位 id） */
export function isPersistableBrandSlug(brandId: string | undefined): boolean {
  const id = (brandId ?? '').trim();
  return !!id && !id.startsWith('wf-') && !id.startsWith('id-');
}
