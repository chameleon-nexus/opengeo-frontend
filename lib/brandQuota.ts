import type { BrandQuota, UserInfo } from '../types';

export function getBrandQuotaFromUser(user: UserInfo | null | undefined): BrandQuota | null {
  return user?.brand_quota ?? null;
}

export function canCreateBrand(quota: BrandQuota | null | undefined): boolean {
  if (!quota) return true;
  return quota.can_create !== false;
}

export function brandQuotaBlockedMessage(quota: BrandQuota | null | undefined): string {
  if (!quota || quota.max == null) return '品牌创建已达上限';
  return `品牌创建已达上限（${quota.used}/${quota.max}）`;
}

/** 进入「新建品牌」工作台前是否需要拦截 */
export function shouldBlockNewBrandWorkbench(
  params: { brand: unknown | null; initialStage?: string },
  quota: BrandQuota | null | undefined,
): boolean {
  const stage = params.initialStage ?? 'brand_input';
  if (params.brand != null) return false;
  if (stage !== 'brand_input') return false;
  return !canCreateBrand(quota);
}
