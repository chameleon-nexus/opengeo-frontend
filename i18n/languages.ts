export interface PlatformLanguageConfig {
  key: string;
  labelKey: string;
  englishName: string;
  htmlLang: string;
  dateLocale: string;
}

export const PLATFORM_LANGUAGES = [
  {
    key: 'zh',
    labelKey: 'language.zh',
    englishName: 'Chinese',
    htmlLang: 'zh-CN',
    dateLocale: 'zh-CN',
  },
  {
    key: 'en',
    labelKey: 'language.en',
    englishName: 'English',
    htmlLang: 'en-US',
    dateLocale: 'en-US',
  },
] as const satisfies readonly PlatformLanguageConfig[];

export type SupportedLanguage = (typeof PLATFORM_LANGUAGES)[number]['key'];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh';
export const LANGUAGE_STORAGE_KEY = 'geo_lang';
export const SUPPORTED_LANGUAGE_KEYS = PLATFORM_LANGUAGES.map((l) => l.key) as SupportedLanguage[];
export const SUPPORTED_LANGUAGE_KEY_SET = new Set<SupportedLanguage>(SUPPORTED_LANGUAGE_KEYS);

export function isSupportedLanguage(value: string | null | undefined): value is SupportedLanguage {
  return typeof value === 'string' && SUPPORTED_LANGUAGE_KEY_SET.has(value as SupportedLanguage);
}

export function normalizeSupportedLanguage(value: string | null | undefined): SupportedLanguage | null {
  const normalized = value?.trim().toLowerCase();
  return isSupportedLanguage(normalized) ? normalized : null;
}

export function resolveSupportedLanguage(value: string | null | undefined): SupportedLanguage {
  const language = normalizeSupportedLanguage(value);
  if (!language) {
    return DEFAULT_LANGUAGE;
  }
  return language;
}

export function getLanguageConfig(language: SupportedLanguage): (typeof PLATFORM_LANGUAGES)[number] {
  const config = PLATFORM_LANGUAGES.find((item) => item.key === language);
  if (!config) {
    throw new Error(`Unsupported platform language: ${language}`);
  }
  return config;
}

/** 从浏览器/系统语言推断：zh* → 中文，其余 → 英文 */
export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LANGUAGE;
  }
  const candidates = [
    navigator.language,
    ...(navigator.languages ?? []),
  ].filter(Boolean) as string[];

  for (const tag of candidates) {
    const base = tag.trim().toLowerCase().split('-')[0];
    if (base === 'zh') {
      return 'zh';
    }
  }
  return 'en';
}

export function getSavedLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return DEFAULT_LANGUAGE;
  }
  try {
    const saved = normalizeSupportedLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
    if (saved) {
      return saved;
    }
    return detectBrowserLanguage();
  } catch {
    return detectBrowserLanguage();
  }
}

export function saveLanguage(lang: SupportedLanguage): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }
}
