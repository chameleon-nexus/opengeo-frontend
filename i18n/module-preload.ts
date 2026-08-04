import { ModuleType } from '../types';
import { changeLanguage, loadNamespacesForLanguage } from './loader';
import { I18nNamespace } from './types';
import type { SupportedLanguage } from './languages';
import { resolveSupportedLanguage } from './languages';
import i18n from './config';

const COCKPIT_NAMESPACES: I18nNamespace[] = [
  I18nNamespace.Optimization,
  I18nNamespace.Report,
  I18nNamespace.DataScreen,
  I18nNamespace.Knowledge,
  I18nNamespace.Publish,
  I18nNamespace.SemanticSeo,
];

const MODULE_I18N_MAP: Partial<Record<ModuleType, I18nNamespace[]>> = {
  [ModuleType.LATEST_OPTIMIZATION]: [I18nNamespace.Conversation, I18nNamespace.Optimization],
  [ModuleType.START_OPTIMIZATION]: [I18nNamespace.Optimization],
  [ModuleType.OPTIMIZATION_WORKBENCH]: [I18nNamespace.Optimization, I18nNamespace.Report],
  [ModuleType.OPTIMIZATION_COCKPIT]: COCKPIT_NAMESPACES,
  [ModuleType.KNOWLEDGE_BASE]: [I18nNamespace.Knowledge],
  [ModuleType.SEMANTIC_SEO]: [I18nNamespace.SemanticSeo],
  [ModuleType.EXTRACT]: [I18nNamespace.Extract],
  [ModuleType.GENERATE]: [I18nNamespace.Generate],
  [ModuleType.SOURCE_HUB]: [I18nNamespace.Publish],
  [ModuleType.THIRD_PARTY_PUBLISH]: [I18nNamespace.Publish],
  [ModuleType.OVERSEAS_THIRD_PARTY_PUBLISH]: [I18nNamespace.Publish],
  [ModuleType.SOCIAL_MEDIA_ACCOUNTS]: [I18nNamespace.Publish],
  [ModuleType.PUBLISH_RECORDS]: [I18nNamespace.Publish],
  [ModuleType.DIAGNOSIS_REPORT]: [I18nNamespace.Report],
  [ModuleType.DATA_SCREEN]: [I18nNamespace.DataScreen],
  [ModuleType.MERCHANT_PROFILE]: [I18nNamespace.Merchant],
  [ModuleType.BUSINESS_INTRO]: [I18nNamespace.Merchant],
  [ModuleType.CONTACT_SUBMISSIONS]: [I18nNamespace.Merchant],
  [ModuleType.BRAND_MANAGEMENT]: [I18nNamespace.Merchant],
  [ModuleType.AIEO_WEBSITE]: [I18nNamespace.Merchant],
  [ModuleType.MERCHANT_HUB]: [I18nNamespace.Merchant],
  [ModuleType.SITE_LIST]: [I18nNamespace.Site],
  [ModuleType.SITE_WORKBENCH]: [I18nNamespace.Site, I18nNamespace.Merchant],
  [ModuleType.CONTENT_TASKS]: [I18nNamespace.Site],
  [ModuleType.WEB_MAIN_CONTENT_TASKS]: [I18nNamespace.Site],
  [ModuleType.SITE_HUB]: [I18nNamespace.Site],
  [ModuleType.OPTIMIZATION_AGENT]: [I18nNamespace.Agent],
  [ModuleType.OPTIMIZATION_BOT]: [I18nNamespace.Agent],
  [ModuleType.INTELLIGENT_OPTIMIZATION_DEPLOY_GUIDE]: [I18nNamespace.Guides],
  [ModuleType.QCLAW_INSTALL_GUIDE]: [I18nNamespace.Guides],
  [ModuleType.AUTOMATION_LOBSTER_INSTALL_GUIDE]: [I18nNamespace.Guides],
  [ModuleType.MASS_PUBLISH_ASSISTANT_GUIDE]: [I18nNamespace.Guides],
  [ModuleType.PERSONAL_CENTER]: [I18nNamespace.Admin],
  [ModuleType.MERCHANT_MANAGEMENT]: [I18nNamespace.Admin],
  [ModuleType.WORKFLOW_TRANSFER]: [I18nNamespace.Admin],
  [ModuleType.SITE_CONFIGURATION]: [I18nNamespace.Admin],
  [ModuleType.ROLE_MANAGEMENT]: [I18nNamespace.Admin],
  [ModuleType.TOOLBOX]: [I18nNamespace.Admin],
  [ModuleType.GENERAL_SETTINGS]: [I18nNamespace.Settings, I18nNamespace.Admin],
  [ModuleType.LLM_CHANNELS]: [I18nNamespace.Admin],
  [ModuleType.SEARCH_CONFIG]: [I18nNamespace.Admin],
  [ModuleType.POINTS_PRICING]: [I18nNamespace.Admin],
  [ModuleType.PAYMENT_CHANNEL_SETTINGS]: [I18nNamespace.Admin],
  [ModuleType.CREDIT_PACKAGES]: [I18nNamespace.Admin],
  [ModuleType.PAYMENT_ORDERS]: [I18nNamespace.Admin],
  [ModuleType.PURCHASE_ORDERS]: [I18nNamespace.Admin],
  [ModuleType.USER_PACKAGE_MANAGEMENT]: [I18nNamespace.Admin],
  [ModuleType.GEO_STAGE_FIELD_GUIDES]: [I18nNamespace.Admin],
  [ModuleType.GEO_REPORT_ADMIN]: [I18nNamespace.Admin],
  [ModuleType.PUBLISH_TODO]: [I18nNamespace.Publish, I18nNamespace.Admin],
  [ModuleType.ARTICLE_TEMPLATES]: [I18nNamespace.Admin],
  [ModuleType.DASHBOARD]: [I18nNamespace.Dashboard],
  [ModuleType.KEY_SETTINGS]: [I18nNamespace.Settings],
};

const BASE_NAMESPACES: I18nNamespace[] = [I18nNamespace.Menu];

const CORE_APP_NAMESPACES: I18nNamespace[] = [
  I18nNamespace.Menu,
  I18nNamespace.Optimization,
  I18nNamespace.Admin,
  I18nNamespace.Common,
];

export function getModuleNamespaces(moduleType: ModuleType): I18nNamespace[] {
  const extra = MODULE_I18N_MAP[moduleType] ?? [];
  return Array.from(new Set([...BASE_NAMESPACES, ...extra]));
}

/** 公开分享页（免登录）按路径预加载对应文案包 */
export function getPublicShareI18nNamespaces(pathname?: string): I18nNamespace[] {
  const p = (pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '')).replace(/\/$/, '') || '/';
  if (p.endsWith('/diagnosis-report')) return [I18nNamespace.Report];
  if (p.endsWith('/data-screen')) return [I18nNamespace.DataScreen];
  return [];
}

export async function preloadModuleI18n(moduleType: ModuleType, language?: SupportedLanguage): Promise<void> {
  const lng = language ?? resolveSupportedLanguage(i18n.language);
  await loadNamespacesForLanguage(getModuleNamespaces(moduleType), lng);
}

export async function changeAppLanguage(language: SupportedLanguage, activeModule?: ModuleType): Promise<void> {
  const moduleNamespaces = activeModule
    ? getModuleNamespaces(activeModule)
    : [I18nNamespace.Menu, I18nNamespace.Login];
  const namespaces = Array.from(
    new Set([I18nNamespace.Common, ...CORE_APP_NAMESPACES, ...moduleNamespaces]),
  );
  await changeLanguage(language, namespaces);
}
