export type MediaTier = 'standard' | 'premium' | 'authority';

export type MediaTierSource = 'article' | 'batch' | 'workflow' | 'default';

export const MEDIA_TIER_SOURCE_LABELS: Record<MediaTierSource, string> = {
  article: '本篇文章',
  batch: '批次默认',
  workflow: '工作流默认',
  default: '系统默认',
};

export interface MediaTierOption {
  tier: MediaTier;
  label: string;
  points: number;
}

export interface ArticleMediaTierInfo {
  media_tier?: MediaTier;
  media_tier_label?: string;
  media_tier_source?: MediaTierSource;
  media_tier_override?: MediaTier | null;
  price_points?: number;
}
