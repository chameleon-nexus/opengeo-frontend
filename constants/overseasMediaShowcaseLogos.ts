import type { MediaTier } from './mediaPublishTier';
import type { MediaShowcaseLogo } from './domesticMediaShowcaseLogos';
import { MEDIA_TIER_SHOWCASE_LOGOS } from './domesticMediaShowcaseLogos';

const OVERSEAS_LOGO_BASE = '/imgs/media-outlets-overseas';

/** 出海三方媒体发布页 logo 墙（本地静态资源） */
export const OVERSEAS_MEDIA_SHOWCASE_LOGOS: MediaShowcaseLogo[] = [
  { name: 'Reuters', src: `${OVERSEAS_LOGO_BASE}/reuters.svg`, bgClass: 'bg-white', imagePad: 'p-0' },
  { name: 'Bloomberg', src: `${OVERSEAS_LOGO_BASE}/bloomberg.svg`, bgClass: 'bg-white', imagePad: 'p-0' },
  { name: 'AP News', src: `${OVERSEAS_LOGO_BASE}/ap-news.svg`, bgClass: 'bg-white', imagePad: 'p-0' },
  { name: 'BBC', src: `${OVERSEAS_LOGO_BASE}/bbc.svg`, bgClass: 'bg-white', imagePad: 'p-0' },
  { name: 'CNN', src: `${OVERSEAS_LOGO_BASE}/cnn.svg`, bgClass: 'bg-white', imagePad: 'p-0' },
  { name: 'Forbes', src: `${OVERSEAS_LOGO_BASE}/forbes.svg`, bgClass: 'bg-white', imagePad: 'p-0' },
  { name: 'TechCrunch', src: `${OVERSEAS_LOGO_BASE}/techcrunch.svg`, bgClass: 'bg-white', imagePad: 'p-0' },
  { name: 'Medium', src: `${OVERSEAS_LOGO_BASE}/medium.svg`, bgClass: 'bg-white', imagePad: 'p-0' },
  { name: 'Yahoo', src: `${OVERSEAS_LOGO_BASE}/yahoo.svg`, bgClass: 'bg-white', imagePad: 'p-0' },
  { name: 'MSN', src: `${OVERSEAS_LOGO_BASE}/msn.svg`, bgClass: 'bg-white', imagePad: 'p-0' },
  {
    name: 'Business Insider',
    src: `${OVERSEAS_LOGO_BASE}/business-insider.svg`,
    bgClass: 'bg-white',
    imagePad: 'p-0',
  },
  { name: 'Entrepreneur', src: `${OVERSEAS_LOGO_BASE}/entrepreneur.svg`, bgClass: 'bg-white', imagePad: 'p-0' },
  { name: 'HubSpot', src: `${OVERSEAS_LOGO_BASE}/hubspot.svg`, bgClass: 'bg-white', imagePad: 'p-0' },
  { name: 'MarketWatch', src: `${OVERSEAS_LOGO_BASE}/marketwatch.svg`, bgClass: 'bg-white', imagePad: 'p-0' },
  { name: 'PR Newswire', src: `${OVERSEAS_LOGO_BASE}/pr-newswire.svg`, bgClass: 'bg-white', imagePad: 'p-0' },
  {
    name: 'GlobeNewswire',
    src: `${OVERSEAS_LOGO_BASE}/globenewswire.svg`,
    bgClass: 'bg-white',
    imagePad: 'p-0',
  },
];

const LOGO_BY_NAME = new Map(OVERSEAS_MEDIA_SHOWCASE_LOGOS.map((l) => [l.name, l]));

/** 各出海媒体档示例 logo（与 logo 墙同源，按档位归类） */
const OVERSEAS_MEDIA_TIER_LOGO_NAMES: Record<MediaTier, string[]> = {
  standard: ['Yahoo', 'MSN', 'Medium', 'TechCrunch', 'Business Insider', 'Entrepreneur', 'HubSpot', 'MarketWatch'],
  premium: ['Forbes', 'CNN', 'BBC'],
  authority: ['Reuters', 'Bloomberg', 'AP News', 'PR Newswire', 'GlobeNewswire'],
};

export const OVERSEAS_MEDIA_TIER_SHOWCASE_LOGOS: Record<MediaTier, MediaShowcaseLogo[]> = {
  standard: OVERSEAS_MEDIA_TIER_LOGO_NAMES.standard
    .map((n) => LOGO_BY_NAME.get(n))
    .filter((l): l is MediaShowcaseLogo => Boolean(l)),
  premium: OVERSEAS_MEDIA_TIER_LOGO_NAMES.premium
    .map((n) => LOGO_BY_NAME.get(n))
    .filter((l): l is MediaShowcaseLogo => Boolean(l)),
  authority: OVERSEAS_MEDIA_TIER_LOGO_NAMES.authority
    .map((n) => LOGO_BY_NAME.get(n))
    .filter((l): l is MediaShowcaseLogo => Boolean(l)),
};

export type PublishMarket = 'domestic' | 'overseas';

export function mediaTierShowcaseLogosForMarket(
  market: PublishMarket,
  tier: MediaTier,
): MediaShowcaseLogo[] {
  if (market === 'overseas') {
    return OVERSEAS_MEDIA_TIER_SHOWCASE_LOGOS[tier];
  }
  return MEDIA_TIER_SHOWCASE_LOGOS[tier];
}
