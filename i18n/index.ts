export { default as i18n } from './config';
export {
  DEFAULT_LANGUAGE,
  PLATFORM_LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  getSavedLanguage,
  detectBrowserLanguage,
  saveLanguage,
  resolveSupportedLanguage,
  isSupportedLanguage,
  type SupportedLanguage,
} from './languages';
export { I18nNamespace } from './types';
export { useModuleI18n, type RegisteredNamespace } from './hooks';
export { changeLanguage, ensureNamespaces, loadNamespacesForLanguage } from './loader';
export { changeAppLanguage, getModuleNamespaces, preloadModuleI18n } from './module-preload';
export { translateTpStatus, translatePublishKey } from './translateStatus';
export { LanguageSwitcher } from './LanguageSwitcher';
