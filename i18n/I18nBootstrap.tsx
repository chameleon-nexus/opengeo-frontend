import React, { useEffect, useState } from 'react';
import { I18nNamespace } from './types';
import { ensureNamespaces } from './loader';
import { getSavedLanguage, getLanguageConfig } from './languages';
import { getPublicShareI18nNamespaces } from './module-preload';

interface I18nBootstrapProps {
  children: React.ReactNode;
}

const CORE_BOOTSTRAP_NAMESPACES: I18nNamespace[] = [
  I18nNamespace.Menu,
  I18nNamespace.Login,
  I18nNamespace.Dashboard,
  I18nNamespace.Optimization,
  I18nNamespace.Settings,
  I18nNamespace.Admin,
];

/**
 * Loads core namespaces before first paint, sets document lang.
 */
export const I18nBootstrap: React.FC<I18nBootstrapProps> = ({ children }) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const namespaces = Array.from(
        new Set([...CORE_BOOTSTRAP_NAMESPACES, ...getPublicShareI18nNamespaces()]),
      );
      await ensureNamespaces(namespaces);
      if (!cancelled) {
        const lang = getSavedLanguage();
        document.documentElement.lang = getLanguageConfig(lang).htmlLang;
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
};

export default I18nBootstrap;
