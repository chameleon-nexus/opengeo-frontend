import type { Brand as ApiBrandRecord } from '../api/brands';
import type { Brand as AppBrand } from '../types';

/** App 侧 Brand.id 必须是 brands.brand_id（slug），供 dashboard / analytics 等 API 使用 */
export function apiBrandRecordToAppBrand(b: ApiBrandRecord): AppBrand {
  return {
    id: b.brand_id,
    name: b.name,
    category: b.category,
    logoColor: b.logo_color || '#3B82F6',
    brandIntroduction: b.brand_introduction ?? null,
    knowledgeBaseId: b.knowledge_base_id ?? null,
  };
}

export function isNumericBrandLocalId(id: string | null | undefined): boolean {
  return Boolean(id && /^\d+$/.test(String(id).trim()));
}

/** 从 localStorage 的 selected_brand_id 恢复；兼容误存 brands 表主键（纯数字） */
export function resolveAppBrandFromSavedId(
  savedId: string,
  apiBrands: ApiBrandRecord[],
): AppBrand | null {
  const trimmed = savedId.trim();
  if (!trimmed) return null;
  const bySlug = apiBrands.find((b) => b.brand_id === trimmed);
  if (bySlug) return apiBrandRecordToAppBrand(bySlug);
  if (isNumericBrandLocalId(trimmed)) {
    const pk = parseInt(trimmed, 10);
    const byPk = apiBrands.find((b) => b.id === pk);
    if (byPk) return apiBrandRecordToAppBrand(byPk);
  }
  return null;
}
