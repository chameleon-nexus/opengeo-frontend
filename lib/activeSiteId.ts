/** 当前站点工作台选中的 site_id，供 API 客户端注入 X-Site-Id */
let activeSiteId: number | null = null;

export function setActiveSiteId(id: number | null): void {
  activeSiteId = id;
}

export function getActiveSiteId(): number | null {
  return activeSiteId;
}
