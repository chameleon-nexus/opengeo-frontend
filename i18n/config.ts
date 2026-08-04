import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nNamespace } from './types';
import {
  DEFAULT_LANGUAGE,
  PLATFORM_LANGUAGES,
  getSavedLanguage,
} from './languages';

const commonResourceModules = import.meta.glob<{ default: Record<string, unknown> }>(
  './locales/*/common.json',
  { eager: true },
);

const commonResources = Object.fromEntries(
  PLATFORM_LANGUAGES.map((language) => {
    const module = commonResourceModules[`./locales/${language.key}/common.json`];
    if (!module) {
      throw new Error(`Missing common i18n resource for language: ${language.key}`);
    }
    return [language.key, { [I18nNamespace.Common]: module.default }];
  }),
);

i18n.use(initReactI18next).init({
  resources: commonResources,
  ns: [I18nNamespace.Common],
  defaultNS: I18nNamespace.Common,
  lng: getSavedLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  fallbackNS: I18nNamespace.Common,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

i18n.on('failedLoading', (lng, ns, msg) => {
  console.error('[i18n] Failed loading:', { language: lng, namespace: ns, message: msg });
});

export default i18n;
