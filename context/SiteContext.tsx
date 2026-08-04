import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { setActiveSiteId } from '../lib/activeSiteId';
import type { SiteRow } from '../api/sites';

export interface SiteContextValue {
  siteId: number;
  site: SiteRow | null;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({
  siteId,
  site,
  children,
}: {
  siteId: number;
  site: SiteRow | null;
  children: React.ReactNode;
}) {
  useEffect(() => {
    setActiveSiteId(siteId);
    return () => setActiveSiteId(null);
  }, [siteId]);

  const value = useMemo(() => ({ siteId, site }), [siteId, site]);
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSiteContext(): SiteContextValue {
  const ctx = useContext(SiteContext);
  if (!ctx) {
    throw new Error('useSiteContext 必须在 SiteProvider 内使用');
  }
  return ctx;
}

export function useOptionalSiteContext(): SiteContextValue | null {
  return useContext(SiteContext);
}
