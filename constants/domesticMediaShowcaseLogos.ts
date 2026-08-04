import type { MediaTier } from './mediaPublishTier';

/** 媒体发布页 logo 墙：本地静态资源，展示合作媒体覆盖实力 */
export interface MediaShowcaseLogo {
  name: string;
  src: string;
  /** 图标容器背景（Tailwind class） */
  bgClass: string;
  /** 图片内边距，横版 logo 可缩小 padding */
  imagePad?: string;
}

export const DOMESTIC_MEDIA_SHOWCASE_LOGOS: MediaShowcaseLogo[] = [
  { name: '搜狐', src: '/imgs/media-outlets/sohu.png', bgClass: 'bg-[#FFCC00]' },
  { name: '新浪', src: '/imgs/media-outlets/sina-weibo.png', bgClass: 'bg-[#E6162D]' },
  { name: '腾讯', src: '/imgs/media-outlets/tencent.png', bgClass: 'bg-[#2B66FF]' },
  { name: '今日头条', src: '/imgs/media-outlets/toutiao.png', bgClass: 'bg-[#F04142]' },
  { name: '百度', src: '/imgs/media-outlets/baidu.png', bgClass: 'bg-[#2B66FF]' },
  { name: '网易', src: '/imgs/media-outlets/netease.png', bgClass: 'bg-[#DE2B1D]' },
  { name: '知乎', src: '/imgs/media-outlets/zhihu.png', bgClass: 'bg-[#0084FF]' },
  { name: '一点资讯', src: '/imgs/media-outlets/yidian.png', bgClass: 'bg-[#E32525]' },
  { name: '大鱼号', src: '/imgs/media-outlets/dayu.png', bgClass: 'bg-[#FF8B1A]' },
  { name: '微信', src: '/imgs/media-outlets/wechat.png', bgClass: 'bg-[#07C160]' },
  { name: 'CSDN', src: '/imgs/media-outlets/csdn.png', bgClass: 'bg-[#FC5531]' },
  { name: '哔哩哔哩', src: '/imgs/media-outlets/bilibili.png', bgClass: 'bg-[#FB7299]' },
  { name: '汽车之家', src: '/imgs/media-outlets/autohome.png', bgClass: 'bg-[#1E4D9C]' },
  { name: '易车', src: '/imgs/media-outlets/yiche.png', bgClass: 'bg-[#2B66FF]' },
  { name: '美团', src: '/imgs/media-outlets/meituan-color.png', bgClass: 'bg-white' },
  { name: '携程', src: '/imgs/media-outlets/ctrip.svg', bgClass: 'bg-white', imagePad: 'p-0.5' },
  // 权威媒体（用户补充 webp）
  {
    name: '人民网',
    src: '/imgs/media-outlets/people.webp',
    bgClass: 'bg-white',
    imagePad: 'p-0.5',
  },
  {
    name: '新华网',
    src: '/imgs/media-outlets/xinhua.webp',
    bgClass: 'bg-white',
    imagePad: 'p-0.5',
  },
  {
    name: '光明网',
    src: '/imgs/media-outlets/guangming.webp',
    bgClass: 'bg-white',
    imagePad: 'p-0.5',
  },
  {
    name: '中国网',
    src: '/imgs/media-outlets/china.webp',
    bgClass: 'bg-white',
    imagePad: 'p-0.5',
  },
  {
    name: '环球网',
    src: '/imgs/media-outlets/huanqiu.webp',
    bgClass: 'bg-white',
    imagePad: 'p-0.5',
  },
  {
    name: '千龙网',
    src: '/imgs/media-outlets/qianlong.webp',
    bgClass: 'bg-white',
    imagePad: 'p-0.5',
  },
  {
    name: '南方网',
    src: '/imgs/media-outlets/southcn.webp',
    bgClass: 'bg-white',
    imagePad: 'p-0.5',
  },
];

const LOGO_BY_NAME = new Map(DOMESTIC_MEDIA_SHOWCASE_LOGOS.map((l) => [l.name, l]));

/** 各媒体档示例 logo（与 logo 墙同源，按档位归类） */
const MEDIA_TIER_LOGO_NAMES: Record<MediaTier, string[]> = {
  standard: [
    '网易',
    '搜狐',
    '今日头条',
    '腾讯',
    '百度',
    '新浪',
    '知乎',
    '一点资讯',
    '大鱼号',
    '微信',
    'CSDN',
    '哔哩哔哩',
  ],
  premium: ['汽车之家', '易车', '美团', '携程'],
  authority: ['新华网', '人民网', '光明网', '中国网', '环球网', '千龙网', '南方网'],
};

export const MEDIA_TIER_SHOWCASE_LOGOS: Record<MediaTier, MediaShowcaseLogo[]> = {
  standard: MEDIA_TIER_LOGO_NAMES.standard
    .map((n) => LOGO_BY_NAME.get(n))
    .filter((l): l is MediaShowcaseLogo => Boolean(l)),
  premium: MEDIA_TIER_LOGO_NAMES.premium
    .map((n) => LOGO_BY_NAME.get(n))
    .filter((l): l is MediaShowcaseLogo => Boolean(l)),
  authority: MEDIA_TIER_LOGO_NAMES.authority
    .map((n) => LOGO_BY_NAME.get(n))
    .filter((l): l is MediaShowcaseLogo => Boolean(l)),
};

/** @deprecated use MEDIA_TIER_SHOWCASE_LOGOS + i18n summary */
export const MEDIA_TIER_SHOWCASE_HINTS: Record<
  MediaTier,
  { summary: string; logos: MediaShowcaseLogo[] }
> = {
  standard: {
    summary: '主流自媒体与综合内容平台，如网易、搜狐、今日头条等',
    logos: MEDIA_TIER_SHOWCASE_LOGOS.standard,
  },
  premium: {
    summary: '垂直领域精选媒体，如汽车之家、易车等行业头部平台',
    logos: MEDIA_TIER_SHOWCASE_LOGOS.premium,
  },
  authority: {
    summary: '国家级权威媒体，如新华网、人民网等党媒央媒',
    logos: MEDIA_TIER_SHOWCASE_LOGOS.authority,
  },
};
