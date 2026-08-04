import React, { useEffect, useState } from 'react';
import { ArrowLeft, Layers, Loader2 } from 'lucide-react';
import { Theme } from '../types';
import { sitesAPI, type SiteRow } from '../api/sites';
import { SiteProvider } from '../context/SiteContext';
import BusinessIntroConfig from './BusinessIntroConfig';

interface Props {
  theme: Theme;
  onOpenSiteWorkbench?: (siteId: number) => void;
}

const TemplateSiteBusinessEntry: React.FC<Props> = ({ theme, onOpenSiteWorkbench }) => {
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
        if (templateSites.length === 1) setSelectedId(templateSites[0].id);
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
        <Layers className="w-12 h-12 opacity-40 mb-4" />
        <p className="text-lg font-medium mb-2">暂无模板站</p>
        <p className="text-sm opacity-70 text-center max-w-md">请先在站点管理中创建模板站。</p>
      </div>
    );
  }

  if (selectedId == null) {
    return (
      <div className={`h-full overflow-y-auto p-8 ${isDark ? 'bg-[#1A1A1A] text-white' : 'bg-slate-50 text-slate-900'}`}>
        <h2 className="text-xl font-semibold mb-2">选择站点 — 业务描述</h2>
        <ul className="space-y-3 max-w-lg">
          {sites.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border ${
                  isDark ? 'border-white/10 bg-[#262626] hover:border-blue-500/50' : 'border-slate-200 bg-white hover:border-blue-400'
                }`}
              >
                <div className="font-medium">{s.display_name}</div>
                <div className="text-xs opacity-60 mt-1">{s.primary_host || '未绑定域名'}</div>
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
        <button type="button" onClick={() => setSelectedId(null)} className="inline-flex items-center gap-1 text-sm opacity-80">
          <ArrowLeft className="w-4 h-4" /> 换站点
        </button>
        <span className="text-sm font-medium truncate">{selectedSite?.display_name}</span>
        {onOpenSiteWorkbench && (
          <button type="button" onClick={() => onOpenSiteWorkbench(selectedId)} className="ml-auto text-xs text-blue-600 hover:underline">
            在站点工作台打开
          </button>
        )}
      </div>
      <SiteProvider siteId={selectedId} site={selectedSite}>
        <BusinessIntroConfig theme={theme} />
      </SiteProvider>
    </div>
  );
};

export default TemplateSiteBusinessEntry;
