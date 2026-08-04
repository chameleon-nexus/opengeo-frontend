import { ALL_AI_PLATFORM_IDS } from './AiPlatformPicker';
import { ALL_OVERSEAS_PLATFORM_IDS } from './OverseasPlatformPicker';
import { validatePlatformSelection } from './platformLabels';

export interface BrandIntakeFormValues {
  brandName: string;
  productName: string;
  subjectCategories: string[];
  inferCategoriesByAi: boolean;
  brandIntroduction: string;
  aiPlatforms: Set<string>;
  overseasPlatforms: Set<string>;
  enableKnowledgeGraph: boolean;
  files: File[];
}

export interface BrandIntakeFormValidateOptions {
  requireBrandName?: boolean;
  /** 仅工作台 BrandInputStage 为 true */
  includeOverseas?: boolean;
  messages?: {
    brandNameRequired?: string;
    categoryRequired?: string;
    kbRequiredForAiInfer?: string;
    domesticPlatformRequired?: string;
    platformRequired?: string;
  };
}

const DEFAULT_MESSAGES = {
  brandNameRequired: '请填写优化对象名称',
  categoryRequired: '请填写行业词',
  kbRequiredForAiInfer: 'AI 分析行业须先创建知识库：请上传材料',
  domesticPlatformRequired: '请至少选择一个国内 AI 平台',
  platformRequired: '请至少选择一个国内或出海 AI 平台',
};

export function filterDomesticPlatformIds(selected: Set<string>): string[] {
  const allowed = new Set<string>([...ALL_AI_PLATFORM_IDS]);
  return [...selected].filter((id) => allowed.has(id));
}

export function filterOverseasPlatformIds(selected: Set<string>): string[] {
  const allowed = new Set<string>([...ALL_OVERSEAS_PLATFORM_IDS]);
  return [...selected].filter((id) => allowed.has(id));
}

export function validateBrandIntakeForm(
  values: BrandIntakeFormValues,
  opts: BrandIntakeFormValidateOptions = {}
): string | null {
  const msg = { ...DEFAULT_MESSAGES, ...opts.messages };
  const requireBrand = opts.requireBrandName !== false;
  if (requireBrand && !values.brandName.trim()) {
    return msg.brandNameRequired;
  }
  const categories = values.subjectCategories.map((x) => x.trim()).filter(Boolean);
  if (categories.length === 0 && !values.inferCategoriesByAi) {
    return msg.categoryRequired;
  }
  if (values.inferCategoriesByAi && values.files.length === 0) {
    return msg.kbRequiredForAiInfer;
  }
  const domestic = filterDomesticPlatformIds(values.aiPlatforms);
  if (opts.includeOverseas) {
    const overseas = filterOverseasPlatformIds(values.overseasPlatforms);
    return validatePlatformSelection(domestic, overseas);
  }
  if (domestic.length < 1) {
    return msg.domesticPlatformRequired;
  }
  return null;
}

/** 从 IM 后端 form_request.fields 预填 */
export function brandIntakeValuesFromFormFields(
  fields: Array<Record<string, unknown>>
): Partial<BrandIntakeFormValues> {
  const byName = new Map(fields.map((f) => [String(f.name ?? ''), f]));
  const brandField = byName.get('brand_name');
  const productField = byName.get('product_name');
  const inferField = byName.get('subject_categories_infer_by_ai');
  const catsField = byName.get('subject_categories');
  const introField = byName.get('brand_introduction');
  const platField = byName.get('ai_platforms');

  const defaultCats: string[] = [];
  const rawCats = catsField?.defaultValues;
  if (Array.isArray(rawCats)) {
    for (const x of rawCats) {
      const s = String(x).trim();
      if (s) defaultCats.push(s);
    }
  }
  const singleCat = String(catsField?.defaultValue ?? '').trim();
  if (singleCat && !defaultCats.includes(singleCat)) {
    defaultCats.unshift(singleCat);
  }

  const plats: string[] = [];
  const rawPlats = platField?.defaultValues;
  if (Array.isArray(rawPlats)) {
    for (const x of rawPlats) {
      const s = String(x).trim();
      if (s) plats.push(s);
    }
  }

  return {
    brandName: String(brandField?.defaultValue ?? '').trim(),
    productName: String(productField?.defaultValue ?? '').trim(),
    subjectCategories: defaultCats,
    inferCategoriesByAi: Boolean(inferField?.defaultValue),
    brandIntroduction: String(introField?.defaultValue ?? '').trim(),
    aiPlatforms: new Set(plats.length ? plats : ['doubao']),
  };
}

export function brandIntakeFormPayloadFromValues(
  values: BrandIntakeFormValues
): Record<string, unknown> {
  const categories = values.subjectCategories.map((x) => x.trim()).filter(Boolean);
  const domestic = filterDomesticPlatformIds(values.aiPlatforms);
  const effectiveProduct = values.productName.trim() || values.brandName.trim();
  return {
    brand_name: values.brandName.trim(),
    product_name: effectiveProduct,
    brand_introduction: values.brandIntroduction.trim() || undefined,
    subject_categories: values.inferCategoriesByAi ? [] : categories,
    subject_category: values.inferCategoriesByAi ? undefined : categories[0],
    subject_categories_infer_by_ai: values.inferCategoriesByAi,
    ai_platforms: domestic,
  };
}
