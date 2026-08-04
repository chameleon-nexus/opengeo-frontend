import i18n from './config';
import { saveLanguage } from './languages';
import { I18nNamespace, MODULE_CONFIG, type NamespaceCacheKey, type SupportedLanguage } from './types';

const i18nGlob = import.meta.glob<{ default: Record<string, unknown> }>(['./locales/**/*.json']);

function normalizeGlobKey(path: string): string {
  return path.replace(/\\/g, '/');
}

const loadedNamespaces = new Set<NamespaceCacheKey>(
  Object.entries(i18n.store.data).flatMap(([language, resources]) =>
    Object.keys(resources).map((namespace) => `${language}:${namespace}` as NamespaceCacheKey),
  ),
);

const loadingPromises = new Map<NamespaceCacheKey, Promise<void>>();

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

async function loadTranslationFile(path: string): Promise<Record<string, unknown>> {
  const key = normalizeGlobKey(path);
  const loader = i18nGlob[key];
  if (loader) {
    const module = await loader();
    return module.default ?? (module as Record<string, unknown>);
  }
  throw new Error(`[i18n] Translation file not found: ${path}`);
}

async function loadTranslationFileWithRetry(path: string, attempt = 0): Promise<Record<string, unknown>> {
  try {
    return await loadTranslationFile(path);
  } catch (error) {
    if (attempt >= RETRY_CONFIG.maxRetries) {
      throw error;
    }
    const delay = Math.min(RETRY_CONFIG.baseDelay * 2 ** attempt, RETRY_CONFIG.maxDelay);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return loadTranslationFileWithRetry(path, attempt + 1);
  }
}

function getModulePath(ns: I18nNamespace, lng: SupportedLanguage): string {
  const config = MODULE_CONFIG[ns];
  if (!config) {
    throw new Error(`No configuration found for namespace: ${ns}`);
  }
  return `./locales/${lng}/${config.fileName}.json`;
}

async function loadNamespaceForLanguage(ns: I18nNamespace, lng: SupportedLanguage): Promise<void> {
  const cacheKey: NamespaceCacheKey = `${lng}:${ns}`;

  if (loadedNamespaces.has(cacheKey)) {
    return;
  }

  const inFlight = loadingPromises.get(cacheKey);
  if (inFlight) {
    await inFlight;
    return;
  }

  const loadPromise = (async () => {
    try {
      const modulePath = getModulePath(ns, lng);
      const resources = await loadTranslationFileWithRetry(modulePath);
      i18n.addResourceBundle(lng, ns, resources, true, true);
      loadedNamespaces.add(cacheKey);
    } finally {
      loadingPromises.delete(cacheKey);
    }
  })();

  loadingPromises.set(cacheKey, loadPromise);
  await loadPromise;
}

export async function loadNamespacesForLanguage(
  namespaces: I18nNamespace[],
  lng: SupportedLanguage,
): Promise<void> {
  await Promise.all(namespaces.map((namespace) => loadNamespaceForLanguage(namespace, lng)));
}

export async function changeLanguage(lng: SupportedLanguage, namespaces: I18nNamespace[]): Promise<void> {
  await loadNamespacesForLanguage(namespaces, lng);
  await i18n.changeLanguage(lng);
  saveLanguage(lng);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng === 'zh' ? 'zh-CN' : 'en-US';
  }
}

export async function ensureNamespaces(namespaces: I18nNamespace[]): Promise<void> {
  const lng = i18n.language as SupportedLanguage;
  await loadNamespacesForLanguage(namespaces, lng);
}
