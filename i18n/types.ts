import type { SupportedLanguage } from './languages';

export type { SupportedLanguage } from './languages';

export enum I18nNamespace {
  Common = 'common',
  Menu = 'menu',
  Login = 'login',
  Dashboard = 'dashboard',
  Optimization = 'optimization',
  Settings = 'settings',
  Admin = 'admin',
  Knowledge = 'knowledge',
  SemanticSeo = 'semanticSeo',
  Extract = 'extract',
  Generate = 'generate',
  Publish = 'publish',
  Report = 'report',
  DataScreen = 'dataScreen',
  Merchant = 'merchant',
  Site = 'site',
  Conversation = 'conversation',
  Agent = 'agent',
  Guides = 'guides',
}

export type NamespaceCacheKey = `${SupportedLanguage}:${I18nNamespace}`;

export const MODULE_CONFIG: Record<
  I18nNamespace,
  {
    path: string;
    fileName: string;
  }
> = {
  [I18nNamespace.Common]: { path: 'i18n/locales', fileName: 'common' },
  [I18nNamespace.Menu]: { path: 'i18n/locales', fileName: 'menu' },
  [I18nNamespace.Login]: { path: 'i18n/locales', fileName: 'login' },
  [I18nNamespace.Dashboard]: { path: 'i18n/locales', fileName: 'dashboard' },
  [I18nNamespace.Optimization]: { path: 'i18n/locales', fileName: 'optimization' },
  [I18nNamespace.Settings]: { path: 'i18n/locales', fileName: 'settings' },
  [I18nNamespace.Admin]: { path: 'i18n/locales', fileName: 'admin' },
  [I18nNamespace.Knowledge]: { path: 'i18n/locales', fileName: 'knowledge' },
  [I18nNamespace.SemanticSeo]: { path: 'i18n/locales', fileName: 'semanticSeo' },
  [I18nNamespace.Extract]: { path: 'i18n/locales', fileName: 'extract' },
  [I18nNamespace.Generate]: { path: 'i18n/locales', fileName: 'generate' },
  [I18nNamespace.Publish]: { path: 'i18n/locales', fileName: 'publish' },
  [I18nNamespace.Report]: { path: 'i18n/locales', fileName: 'report' },
  [I18nNamespace.DataScreen]: { path: 'i18n/locales', fileName: 'dataScreen' },
  [I18nNamespace.Merchant]: { path: 'i18n/locales', fileName: 'merchant' },
  [I18nNamespace.Site]: { path: 'i18n/locales', fileName: 'site' },
  [I18nNamespace.Conversation]: { path: 'i18n/locales', fileName: 'conversation' },
  [I18nNamespace.Agent]: { path: 'i18n/locales', fileName: 'agent' },
  [I18nNamespace.Guides]: { path: 'i18n/locales', fileName: 'guides' },
};
