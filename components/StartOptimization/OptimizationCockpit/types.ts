import {
  SHOW_CONTENT_AND_MEDIA_PUBLISH,
  SHOW_PUBLISH_SETTINGS,
} from '../../../constants/optimizationMode';

export type CockpitTab =
  | 'basic_info'
  | 'report'
  | 'detail'
  | 'task'
  | 'publish'
  | 'social_accounts'
  | 'social_publish'
  | 'wordpack'
  | 'knowledge_base'
  | 'knowledge_graph';

export type CockpitTabSection = 'overview' | 'workspace';

export type OptimizationMarket = 'domestic' | 'overseas';

const BASE_COCKPIT_TAB_IDS: { id: CockpitTab; section: CockpitTabSection }[] = [
  { id: 'task', section: 'workspace' },
  { id: 'basic_info', section: 'workspace' },
  { id: 'report', section: 'overview' },
  { id: 'detail', section: 'overview' },
  { id: 'wordpack', section: 'workspace' },
  ...(SHOW_PUBLISH_SETTINGS || SHOW_CONTENT_AND_MEDIA_PUBLISH
    ? [{ id: 'publish' as const, section: 'workspace' as const }]
    : []),
  { id: 'knowledge_base', section: 'workspace' },
  { id: 'knowledge_graph', section: 'workspace' },
];

const OVERSEAS_EXTRA_TABS: { id: CockpitTab; section: CockpitTabSection }[] =
  SHOW_CONTENT_AND_MEDIA_PUBLISH
    ? [
        { id: 'social_accounts', section: 'workspace' },
        { id: 'social_publish', section: 'workspace' },
      ]
    : [];

/** 国内驾驶舱 Tab 列表（默认） */
export const COCKPIT_TAB_IDS: { id: CockpitTab; section: CockpitTabSection }[] = BASE_COCKPIT_TAB_IDS;

export function resolveCockpitTabIds(
  optimizationMarket?: OptimizationMarket | string | null,
  options?: { showBasicInfo?: boolean },
): { id: CockpitTab; section: CockpitTabSection }[] {
  const showBasicInfo = options?.showBasicInfo === true;
  const base = showBasicInfo
    ? BASE_COCKPIT_TAB_IDS
    : BASE_COCKPIT_TAB_IDS.filter((t) => t.id !== 'basic_info');
  if (optimizationMarket === 'overseas') {
    const publishIdx = base.findIndex((t) => t.id === 'publish');
    if (publishIdx < 0) return [...base, ...OVERSEAS_EXTRA_TABS];
    return [
      ...base.slice(0, publishIdx + 1),
      ...OVERSEAS_EXTRA_TABS,
      ...base.slice(publishIdx + 1),
    ];
  }
  return base;
}

export function resolveCockpitPublishMarket(
  optimizationMarket?: OptimizationMarket | string | null,
): OptimizationMarket {
  return optimizationMarket === 'overseas' ? 'overseas' : 'domestic';
}

/** @deprecated Use COCKPIT_TAB_IDS + i18n cockpit.tabs.* */
export const COCKPIT_TABS: { id: CockpitTab; label: string; section: CockpitTabSection }[] = COCKPIT_TAB_IDS.map(
  (item) => ({ ...item, label: item.id }),
);

export function cockpitPublishTabLabelKey(): 'publishSettings' | 'publish' {
  return SHOW_PUBLISH_SETTINGS ? 'publishSettings' : 'publish';
}
