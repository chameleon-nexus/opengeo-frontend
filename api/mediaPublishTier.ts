import { apiClient } from './client';
import type { MediaTierOption } from '../constants/mediaPublishTier';

export async function getMediaPublishTierOptions(
  market: 'domestic' | 'overseas' = 'domestic',
): Promise<MediaTierOption[]> {
  const data = await apiClient.get<{ items?: MediaTierOption[] }>('/api/third-party/media-tiers', {
    params: { market },
  });
  return data?.items ?? [];
}
