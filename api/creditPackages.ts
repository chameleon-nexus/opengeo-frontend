import apiClient from './client';

export interface CreditPackageAdmin {
  id: number;
  productId: string;
  title: string;
  description: string;
  featuresTitle?: string;
  features: string[];
  amount: number;
  currency: string;
  priceDisplay?: string;
  originalPriceDisplay?: string;
  unit?: string;
  credits: number;
  validMonths: number;
  trialDays?: number;
  billingGroup: string;
  kind: string;
  tierLevel: number;
  sortOrder: number;
  isFeatured: boolean;
  enabled: boolean;
  tip?: string;
  label?: string;
}

function mapPkg(r: any): CreditPackageAdmin {
  return {
    id: r.id,
    productId: r.productId ?? r.product_id ?? '',
    title: r.title ?? '',
    description: r.description ?? '',
    featuresTitle: r.featuresTitle ?? r.features_title,
    features: r.features ?? [],
    amount: Number(r.amount ?? 0),
    currency: r.currency ?? 'CNY',
    priceDisplay: r.priceDisplay ?? r.price_display,
    originalPriceDisplay: r.originalPriceDisplay ?? r.original_price_display,
    unit: r.unit,
    credits: Number(r.credits ?? 0),
    validMonths: Number(r.validMonths ?? r.valid_months ?? 1),
    trialDays: r.trialDays ?? r.trial_days,
    billingGroup: r.billingGroup ?? r.billing_group ?? 'one-time',
    kind: r.kind ?? 'paid',
    tierLevel: Number(r.tierLevel ?? r.tier_level ?? 0),
    sortOrder: Number(r.sortOrder ?? r.sort_order ?? 0),
    isFeatured: Boolean(r.isFeatured ?? r.is_featured),
    enabled: Boolean(r.enabled),
    tip: r.tip,
    label: r.label,
  };
}

export type PackageChannel = 'saas' | 'mini';

export const creditPackagesAPI = {
  listPublic: async (locale = 'zh') => {
    return apiClient.get<any>(`/api/credit-packages?locale=${locale}`);
  },

  listForMe: async (locale = 'zh') => {
    return apiClient.get<{
      tiers: Array<Record<string, unknown>>;
      access?: Record<string, unknown>;
      activeValidMonths?: number;
      currentPlanTitle?: string;
      accessExpiresAt?: string | null;
      agentPermanentAccess?: boolean;
    }>(`/api/credit-packages/me?locale=${locale}`);
  },

  adminList: async (channel: PackageChannel = 'saas'): Promise<CreditPackageAdmin[]> => {
    const rows = await apiClient.get<any[]>(`/api/admin/credit-packages?channel=${channel}`);
    return (rows ?? []).map(mapPkg);
  },

  adminCreate: async (
    body: Partial<CreditPackageAdmin> & { productId: string; title: string },
    channel: PackageChannel = 'saas',
  ) => {
    const data = await apiClient.post<any>(`/api/admin/credit-packages?channel=${channel}`, body);
    return mapPkg(data);
  },

  adminUpdate: async (
    id: number,
    body: Partial<CreditPackageAdmin> & { productId: string; title: string },
    channel: PackageChannel = 'saas',
  ) => {
    const data = await apiClient.put<any>(`/api/admin/credit-packages/${id}?channel=${channel}`, body);
    return mapPkg(data);
  },

  adminDelete: async (id: number, channel: PackageChannel = 'saas') => {
    return apiClient.delete(`/api/admin/credit-packages/${id}?channel=${channel}`);
  },
};
