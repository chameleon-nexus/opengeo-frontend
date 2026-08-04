/**
 * 子站图片上传：工作台内走 /api/sites/{id}/upload，否则回退商户级 legacy 接口。
 */
import { getActiveSiteId } from './activeSiteId';
import { sitesAPI, type SiteAssetType } from '../api/sites';
import { uploadSiteAsset as uploadMerchantSiteAsset } from '../api/merchants';

export type { SiteAssetType };

export async function uploadSiteAsset(file: File, assetType: SiteAssetType = 'logo'): Promise<string> {
  const siteId = getActiveSiteId();
  if (siteId != null) {
    return sitesAPI.uploadAsset(siteId, file, assetType);
  }
  return uploadMerchantSiteAsset(file, assetType);
}
