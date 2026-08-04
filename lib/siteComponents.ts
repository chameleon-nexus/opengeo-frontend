/**
 * 自定义站组件契约（site_settings.components）
 *
 * - news: 资讯 CMS（custom 默认 true）
 * - contact_legal: off | build | api — 基础信息维护
 * - travel: 旅游组件（民宿/体验/服务）
 */
import type { SiteRow } from '../api/sites';

export type ContactLegalMode = 'off' | 'build' | 'api';

export interface SiteComponents {
  news: boolean;
  contact_legal: ContactLegalMode;
  travel: boolean;
}

const DEFAULT_CUSTOM: SiteComponents = {
  news: true,
  contact_legal: 'build',
  travel: false,
};

export function getSiteComponents(site: SiteRow | null | undefined): SiteComponents {
  if (!site || site.site_kind !== 'custom') {
    return { news: false, contact_legal: 'off', travel: false };
  }
  const st = site.site_settings ?? {};
  const raw = st.components;
  const comp = raw && typeof raw === 'object' ? (raw as Partial<SiteComponents>) : {};

  const travel = comp.travel === true || st.travel_component === true;

  let contactLegal: ContactLegalMode = DEFAULT_CUSTOM.contact_legal;
  if (comp.contact_legal === 'off' || comp.contact_legal === 'build' || comp.contact_legal === 'api') {
    contactLegal = comp.contact_legal;
  }

  return {
    news: true,
    contact_legal: contactLegal,
    travel,
  };
}

/** @deprecated 请用 getSiteComponents(site).travel */
export function siteHasTravelComponent(site: SiteRow | null | undefined): boolean {
  return getSiteComponents(site).travel;
}

/** 自定义站是否启用基础信息组件（工作台 Tab + build 时 manifest） */
export function siteHasContactLegalComponent(site: SiteRow | null | undefined): boolean {
  return getSiteComponents(site).contact_legal === 'build';
}

/** @deprecated 请用 siteHasContactLegalComponent */
export function siteHasContactLegalCms(site: SiteRow | null | undefined): boolean {
  return siteHasContactLegalComponent(site);
}

export function buildCustomSiteSettings(components: SiteComponents): Record<string, unknown> {
  return {
    components: {
      news: true,
      contact_legal: components.contact_legal,
      travel: components.travel,
    },
    travel_component: components.travel,
  };
}
