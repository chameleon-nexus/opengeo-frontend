import React, { useEffect, useState } from 'react';
import { ArrowLeft, Globe, Loader2 } from 'lucide-react';
import { Theme } from '../types';
import { sitesAPI, type SiteRow } from '../api/sites';
import { SiteProvider } from '../context/SiteContext';
import AIEOWebsite from './AIEOWebsite';
import { useModuleI18n } from '../i18n/hooks';

interface Props {
  theme: Theme;
  onOpenSiteWorkbench?: (siteId: number) => void;
}

/** 独立「AIEO官网」入口：先选模板站，再按 site_id 配置 */
const TemplateSiteAIEOEntry: React.FC<Props> = ({ theme, onOpenSiteWorkbench }) => {
  const { t } = useModuleI18n('merchant');
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedSite, setSelectedSite] = useState<SiteRow | null>(null);

  useEffect(() => {
    sitesAPI
      .listMine()
      .then((payload) => {
        const templateSites = (payload.sites || []).filter((s) => s.site_kind === 'template');
        setSites(templateSites);
        if (templateSites.length === 1) {
          setSelectedId(templateSites[0].id);
        }
      })
      .catch(() => setSites([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setSelectedSite(null);
      return;
    }
    sitesAPI.get(selectedId).then(setSelectedSite).catch(() => setSelectedSite(null));
  }, [selectedId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-8 ${isDark ? 'text-white' : 'text-slate-700'}`}>
        <Globe className="w-12 h-12 opacity-40 mb-4" />
        <p className="text-lg font-medium mb-2">{t('templateSiteAIEO.noSites')}</p>
        <p className="text-sm opacity-70 text-center max-w-md">
          {t('templateSiteAIEO.noSitesHint')}
        </p>
      </div>
    );
  }

  if (selectedId == null) {
    return (
      <div className={`h-full overflow-y-auto p-8 ${isDark ? 'bg-[#1A1A1A] text-white' : 'bg-slate-50 text-slate-900'}`}>
        <h2 className="text-xl font-semibold mb-2">{t('templateSiteAIEO.selectSiteTitle')}</h2>
        <p className="text-sm opacity-70 mb-6">{t('templateSiteAIEO.selectSiteHint')}</p>
        <ul className="space-y-3 max-w-lg">
          {sites.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  isDark
                    ? 'border-white/10 bg-[#262626] hover:border-blue-500/50'
                    : 'border-slate-200 bg-white hover:border-blue-400 shadow-sm'
                }`}
              >
                <div className="font-medium">{s.display_name}</div>
                <div className="text-xs opacity-60 mt-1">{s.primary_host || t('templateSiteAIEO.noDomain')}</div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={`shrink-0 px-6 py-3 flex items-center gap-3 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="inline-flex items-center gap-1 text-sm opacity-80 hover:opacity-100"
        >
          <ArrowLeft className="w-4 h-4" /> {t('templateSiteAIEO.switchSite')}
        </button>
        <span className="text-sm font-medium truncate">{selectedSite?.display_name}</span>
        {onOpenSiteWorkbench && (
          <button
            type="button"
            onClick={() => onOpenSiteWorkbench(selectedId)}
            className="ml-auto text-xs text-blue-600 hover:underline"
          >
            {t('templateSiteAIEO.openInWorkbench')}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        <SiteProvider siteId={selectedId} site={selectedSite}>
          <AIEOWebsite
            theme={theme}
            siteId={selectedId}
            site={selectedSite}
            onSiteUpdated={() => sitesAPI.get(selectedId).then(setSelectedSite).catch(() => {})}
          />
        </SiteProvider>
      </div>
    </div>
  );
};

export default TemplateSiteAIEOEntry;
