import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { Theme } from '../types';
import { SiteProvider } from '../context/SiteContext';
import { sitesAPI, siteHasTravelComponent, siteHasContactLegalCms, type SiteRow } from '../api/sites';
import { webMainContentTaskAPI } from '../api/webMainContentTask';
import WebMainSettings from './WebMainSettings';
import CategoryManagement from './CategoryManagement';
import ColumnManagement from './ColumnManagement';
import BlogManagement from './BlogManagement';
import FAQConfig from './FAQConfig';
import BusinessIntroConfig from './BusinessIntroConfig';
import SiteCompanySectionsConfig from './SiteCompanySectionsConfig';
import SiteCustomersConfig from './SiteCustomersConfig';
import ContactSubmissions from './ContactSubmissions';
import StayManagement from './StayManagement';
import ExperienceManagement from './ExperienceManagement';
import ServiceManagement from './ServiceManagement';
import CustomSiteLegalSettings from './CustomSiteLegalSettings';
import { useModuleI18n } from '../i18n/hooks';

type TabId =
  | 'contact_legal'
  | 'settings'
  | 'articles'
  | 'category'
  | 'column'
  | 'faq'
  | 'stays'
  | 'experiences'
  | 'services'
  | 'business_intro'
  | 'company_sections'
  | 'customers'
  | 'contact_submissions';

interface Props {
  theme: Theme;
  siteId: number;
  initialTab?: TabId;
  onBack: () => void;
  onOpenContentTasks: (siteId: number) => void;
  currentBrand?: import('../types').Brand | null;
  /** 站点管理员门户等场景隐藏「内容任务」入口 */
  showContentTasksEntry?: boolean;
}

const TRAVEL_TABS: TabId[] = ['stays', 'experiences', 'services'];

const TEMPLATE_ONLY_TABS: TabId[] = ['settings', 'faq', 'business_intro', 'company_sections', 'customers'];
const CUSTOM_ONLY_TABS: TabId[] = ['contact_legal'];

function resolveEntryTab(site: SiteRow, preferred?: TabId): TabId {
  const isTemplate = site.site_kind === 'template';
  const customFallback: TabId = siteHasContactLegalCms(site) ? 'contact_legal' : 'articles';
  const fallback: TabId = isTemplate ? 'settings' : customFallback;
  if (!preferred) return fallback;
  if (!isTemplate && TEMPLATE_ONLY_TABS.includes(preferred)) return customFallback;
  if (isTemplate && CUSTOM_ONLY_TABS.includes(preferred)) return 'settings';
  if (!isTemplate && preferred === 'contact_legal' && !siteHasContactLegalCms(site)) return customFallback;
  return preferred;
}

const TAB_IDS: TabId[] = [
  'contact_legal',
  'settings',
  'articles',
  'category',
  'column',
  'faq',
  'stays',
  'experiences',
  'services',
  'business_intro',
  'company_sections',
  'customers',
  'contact_submissions',
];

const SiteWorkbench: React.FC<Props> = ({
  theme,
  siteId,
  initialTab,
  onBack,
  onOpenContentTasks,
  currentBrand: _currentBrand,
  showContentTasksEntry = true,
}) => {
  void _currentBrand;
  const { t } = useModuleI18n('site');
  const [site, setSite] = useState<SiteRow | null>(null);
  const [tab, setTab] = useState<TabId>(initialTab ?? 'settings');
  const [loading, setLoading] = useState(true);
  const [runningTasks, setRunningTasks] = useState(0);

  const loadSite = useCallback(async () => {
    setLoading(true);
    try {
      const row = await sitesAPI.get(siteId);
      setSite(row);
    } catch {
      setSite(null);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  const loadTaskBadge = useCallback(async () => {
    try {
      const tasks = await webMainContentTaskAPI.list({ site_id: siteId, status: 'running' });
      setRunningTasks(tasks.filter((t) => t.status === 'running').length);
    } catch {
      setRunningTasks(0);
    }
  }, [siteId]);

  useEffect(() => {
    void loadSite();
  }, [loadSite]);

  useEffect(() => {
    void loadTaskBadge();
  }, [loadTaskBadge]);

  const isTemplateSite = site?.site_kind === 'template';
  const hasTravelComponent = siteHasTravelComponent(site);
  const hasContactLegalCms = siteHasContactLegalCms(site);

  useEffect(() => {
    if (!site || site.id !== siteId) return;
    setTab(resolveEntryTab(site, initialTab));
  }, [siteId, site?.id, site?.site_kind, initialTab]);

  useEffect(() => {
    if (tab === 'company_sections' && site?.template_id !== 'corporate') {
      setTab(isTemplateSite ? 'settings' : (hasContactLegalCms ? 'contact_legal' : 'articles'));
    }
  }, [site?.template_id, tab, isTemplateSite, hasContactLegalCms]);

  useEffect(() => {
    if (site && !hasTravelComponent && TRAVEL_TABS.includes(tab)) {
      setTab(isTemplateSite ? 'settings' : (hasContactLegalCms ? 'contact_legal' : 'articles'));
    }
  }, [hasTravelComponent, tab, site, isTemplateSite, hasContactLegalCms]);

  useEffect(() => {
    if (site && !hasContactLegalCms && tab === 'contact_legal') {
      setTab('articles');
    }
  }, [hasContactLegalCms, tab, site]);

  if (loading && !site) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const visibleTabs = TAB_IDS.filter((id) => {
    if (TRAVEL_TABS.includes(id) && !hasTravelComponent) return false;
    if (!isTemplateSite) {
      if (id === 'contact_legal') return hasContactLegalCms;
      return !['settings', 'faq', 'business_intro', 'company_sections', 'customers'].includes(id);
    }
    if (CUSTOM_ONLY_TABS.includes(id)) return false;
    if (id === 'company_sections' && site.template_id !== 'corporate') return false;
    return true;
  }).map((id) => ({ id, label: t(`siteWorkbench.tabs.${id}`) }));

  return (
    <SiteProvider siteId={siteId} site={site}>
      <div className="h-full flex flex-col bg-white">
        <div className="shrink-0 border-b border-slate-200 px-6 py-4 flex flex-wrap items-center gap-4">
          <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" /> {t('siteWorkbench.backToList')}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold text-slate-900 truncate">{site?.display_name || t('siteWorkbench.siteFallback', { id: siteId })}</h1>
            {site?.primary_host && (
              <a
                href={`https://${site.primary_host}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                {site.primary_host} <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          {showContentTasksEntry && (
          <button
            type="button"
            onClick={() => onOpenContentTasks(siteId)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            <Sparkles className="w-4 h-4" />
            {t('siteWorkbench.contentTasks')}
            {runningTasks > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-xs">{runningTasks}</span>
            )}
          </button>
          )}
        </div>

        <div className="shrink-0 flex gap-1 px-6 border-b border-slate-100 overflow-x-auto">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {tab === 'contact_legal' && !isTemplateSite && hasContactLegalCms && (
            <CustomSiteLegalSettings theme={theme} />
          )}
          {tab === 'settings' && <WebMainSettings theme={theme} onSiteUpdated={loadSite} />}
          {tab === 'articles' && <BlogManagement theme={theme} siteScope="web_main" />}
          {tab === 'category' && <CategoryManagement theme={theme} siteScope="web_main" />}
          {tab === 'column' && <ColumnManagement theme={theme} siteScope="web_main" />}
          {tab === 'faq' && <FAQConfig theme={theme} siteScope="web_main" />}
          {tab === 'stays' && hasTravelComponent && <StayManagement theme={theme} />}
          {tab === 'experiences' && hasTravelComponent && <ExperienceManagement theme={theme} />}
          {tab === 'services' && hasTravelComponent && <ServiceManagement theme={theme} />}
          {tab === 'business_intro' && isTemplateSite && <BusinessIntroConfig theme={theme} />}
          {tab === 'company_sections' && isTemplateSite && site?.template_id === 'corporate' && (
            <SiteCompanySectionsConfig theme={theme} onSiteUpdated={loadSite} />
          )}
          {tab === 'customers' && isTemplateSite && (
            <SiteCustomersConfig theme={theme} onSiteUpdated={loadSite} />
          )}
          {tab === 'contact_submissions' && (
            <ContactSubmissions theme={theme} siteId={siteId} embedded />
          )}
        </div>
      </div>
    </SiteProvider>
  );
};

export default SiteWorkbench;
