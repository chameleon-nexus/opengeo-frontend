/**
 * Admin 积分定价 API
 */

import apiClient from './client';

export interface PointsPricingItem {
  actionKey: string;
  label: string;
  unit: string;
  group: string;
  groupLabel: string;
  domestic: number;
  overseas: number;
}

export interface PointsPricingPayload {
  version: number;
  items: PointsPricingItem[];
}

export const pointsPricingAPI = {
  get: async (): Promise<PointsPricingPayload> => {
    const data = await apiClient.get<any>('/api/admin/points-pricing');
    const raw = data?.items ?? [];
    return {
      version: data?.version ?? 1,
      items: raw.map((r: any) => ({
        actionKey: r.actionKey ?? r.action_key ?? '',
        label: r.label ?? '',
        unit: r.unit ?? '',
        group: r.group ?? '',
        groupLabel: r.groupLabel ?? r.group_label ?? '',
        domestic: Number(r.domestic ?? 0),
        overseas: Number(r.overseas ?? 0),
      })),
    };
  },

  update: async (items: PointsPricingItem[]): Promise<PointsPricingPayload> => {
    const data = await apiClient.put<any>('/api/admin/points-pricing', {
      items: items.map((i) => ({
        actionKey: i.actionKey,
        domestic: i.domestic,
        overseas: i.overseas,
      })),
    });
    const raw = data?.items ?? [];
    return {
      version: data?.version ?? 1,
      items: raw.map((r: any) => ({
        actionKey: r.actionKey ?? r.action_key ?? '',
        label: r.label ?? '',
        unit: r.unit ?? '',
        group: r.group ?? '',
        groupLabel: r.groupLabel ?? r.group_label ?? '',
        domestic: Number(r.domestic ?? 0),
        overseas: Number(r.overseas ?? 0),
      })),
    };
  },
};
