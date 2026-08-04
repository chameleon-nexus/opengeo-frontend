import type { TFunction } from 'i18next';
import type { MediaTier } from '../constants/mediaPublishTier';

const TIER_LABEL_KEYS: Record<MediaTier, `mediaTier.tiers.${MediaTier}.label`> = {
  standard: 'mediaTier.tiers.standard.label',
  premium: 'mediaTier.tiers.premium.label',
  authority: 'mediaTier.tiers.authority.label',
};

/** 后端中文档名 -> tier（英文界面回退解析） */
const ZH_LABEL_TO_TIER: Record<string, MediaTier> = {
  普通媒体: 'standard',
  精选媒体: 'premium',
  权威媒体: 'authority',
};

export function resolveMediaTierFromLabel(label: string | null | undefined): MediaTier | null {
  if (!label) return null;
  const trimmed = label.trim();
  return ZH_LABEL_TO_TIER[trimmed] ?? null;
}

export function localizeMediaTierLabel(
  tier: MediaTier | null | undefined,
  t: TFunction<'publish'>,
  fallbackLabel?: string | null,
): string {
  if (tier && TIER_LABEL_KEYS[tier]) {
    return t(TIER_LABEL_KEYS[tier]);
  }
  const fromLabel = resolveMediaTierFromLabel(fallbackLabel);
  if (fromLabel) {
    return t(TIER_LABEL_KEYS[fromLabel]);
  }
  return (fallbackLabel || '').trim() || t('batchPanel.defaultTier');
}

export function formatMediaTierDisplay(
  info: { media_tier?: MediaTier | null; media_tier_label?: string | null },
  t: TFunction<'publish'>,
): string {
  return localizeMediaTierLabel(info.media_tier ?? undefined, t, info.media_tier_label);
}
