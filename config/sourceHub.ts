/**
 * 信源库 Hub：国内 / 出海分区与入口映射
 */

import { Globe, Newspaper, Send, Share2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ModuleType } from '../types';

export type SourceHubMarket = 'domestic' | 'overseas';

export interface SourceHubEntry {
  moduleId: ModuleType;
  labelKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  market: SourceHubMarket;
}

export interface SourceHubSection {
  market: SourceHubMarket;
  titleKey: string;
  hintKey?: string;
  entries: SourceHubEntry[];
}

export const SOURCE_HUB_SECTIONS: SourceHubSection[] = [
  {
    market: 'domestic',
    titleKey: 'sourceHub.sections.domestic',
    entries: [
      {
        market: 'domestic',
        moduleId: ModuleType.THIRD_PARTY_PUBLISH,
        labelKey: 'sourceHub.entries.thirdPartyPublish.label',
        descriptionKey: 'sourceHub.entries.thirdPartyPublish.description',
        icon: Newspaper,
      },
    ],
  },
  {
    market: 'overseas',
    titleKey: 'sourceHub.sections.overseas',
    entries: [
      {
        market: 'overseas',
        moduleId: ModuleType.SOCIAL_MEDIA_ACCOUNTS,
        labelKey: 'sourceHub.entries.socialMediaAccounts.label',
        descriptionKey: 'sourceHub.entries.socialMediaAccounts.description',
        icon: Share2,
      },
      {
        market: 'overseas',
        moduleId: ModuleType.PUBLISH_RECORDS,
        labelKey: 'sourceHub.entries.publishRecords.label',
        descriptionKey: 'sourceHub.entries.publishRecords.description',
        icon: Send,
      },
      {
        market: 'overseas',
        moduleId: ModuleType.OVERSEAS_THIRD_PARTY_PUBLISH,
        labelKey: 'sourceHub.entries.overseasThirdPartyPublish.label',
        descriptionKey: 'sourceHub.entries.overseasThirdPartyPublish.description',
        icon: Globe,
      },
    ],
  },
];

/** 信源库 Hub 全部可跳转模块（国内 1 + 出海 3） */
export const SOURCE_HUB_NAV_MODULE_IDS: ModuleType[] = SOURCE_HUB_SECTIONS.flatMap((s) =>
  s.entries.map((e) => e.moduleId),
);
