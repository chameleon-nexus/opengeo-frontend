/** 对话入口占位品牌/产品名；侧栏未完成采集时展示「待定」 */
export const DRAFT_WORKFLOW_BRAND_NAME = '待定';
export const DRAFT_WORKFLOW_PRODUCT_NAME = '待定';

export const RECENT_WORKFLOWS_REFRESH_EVENT = 'geo:recent-workflows-refresh';

export function invalidateRecentWorkflowsCache(): void {
  window.dispatchEvent(new CustomEvent(RECENT_WORKFLOWS_REFRESH_EVENT));
}
