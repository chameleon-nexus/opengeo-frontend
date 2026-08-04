import React from 'react';
import {
  ChevronLeft,
  ClipboardList,
  Database,
  FileText,
  GlobeLock,
  Home,
  LayoutGrid,
  Search,
  Send,
  Share2,
  Users,
} from 'lucide-react';
import type { GeoWorkflowDTO } from '../../../api/geoWorkflow';
import { workflowSidebarTitle } from '../../../lib/workflowSidebar';
import { resolveCockpitTabIds, cockpitPublishTabLabelKey, type CockpitTab } from './types';
import { useModuleI18n } from '../../../i18n/hooks';

const TAB_ICONS: Record<CockpitTab, React.ComponentType<{ className?: string }>> = {
  basic_info: ClipboardList,
  report: FileText,
  detail: LayoutGrid,
  task: Home,
  publish: Send,
  social_accounts: Users,
  social_publish: Share2,
  wordpack: Search,
  knowledge_base: Database,
  knowledge_graph: GlobeLock,
};

interface Props {
  workflow: GeoWorkflowDTO;
  activeTab: CockpitTab;
  showBasicInfo?: boolean;
  onSelectTab: (tab: CockpitTab) => void;
  onExit: () => void;
}

const CockpitSidebar: React.FC<Props> = ({
  workflow,
  activeTab,
  showBasicInfo = false,
  onSelectTab,
  onExit,
}) => {
  const { t } = useModuleI18n('optimization');
  const title = workflowSidebarTitle(workflow);
  const industry = (workflow.subjectCategory || '').trim();
  const tabIds = resolveCockpitTabIds(workflow.optimizationMarket, { showBasicInfo });

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-slate-200/90 bg-white">
      <div className="border-b border-slate-100 px-3 py-4">
        <div className="flex items-start gap-1">
          <button
            type="button"
            onClick={onExit}
            title={t('cockpit.back')}
            aria-label={t('cockpit.backAria')}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1 pl-1">
            <div className="text-sm font-semibold text-slate-900 leading-snug truncate" title={title}>
              {title}
            </div>
            {industry ? (
              <div className="mt-1 text-xs text-slate-500 truncate" title={industry}>
                {industry}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {tabIds.map((item, index) => {
          const Icon = TAB_ICONS[item.id];
          const active = activeTab === item.id;
          const prevSection = index > 0 ? tabIds[index - 1].section : null;
          const showDivider = item.section === 'workspace' && prevSection === 'overview';
          return (
            <React.Fragment key={item.id}>
              {showDivider ? (
                <div className="my-3 px-1" aria-hidden>
                  <div className="h-px rounded-full bg-slate-100" />
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#FFF9F6] text-[#E8553F]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {item.id === 'publish'
                  ? t(`cockpit.tabs.${cockpitPublishTabLabelKey()}`)
                  : t(`cockpit.tabs.${item.id}`)}
              </button>
            </React.Fragment>
          );
        })}
      </nav>
    </aside>
  );
};

export default CockpitSidebar;
