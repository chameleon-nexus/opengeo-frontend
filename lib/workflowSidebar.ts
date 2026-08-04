import type { GeoWorkflowDTO } from '../api/geoWorkflow';
import {
  DRAFT_WORKFLOW_BRAND_NAME,
  DRAFT_WORKFLOW_PRODUCT_NAME,
} from '../constants/geoWorkflow';

const LEGACY_PLACEHOLDER = '新优化';

function isPlaceholderName(v: string): boolean {
  return !v || v === DRAFT_WORKFLOW_BRAND_NAME || v === LEGACY_PLACEHOLDER;
}

export function workflowSidebarTitle(wf: GeoWorkflowDTO): string {
  const alias = wf.sidebarTitle?.trim();
  if (alias) return alias;
  const brand = wf.brandName?.trim() || '';
  const product = wf.productName?.trim() || '';
  if (isPlaceholderName(brand)) {
    if (product && !isPlaceholderName(product) && product !== DRAFT_WORKFLOW_PRODUCT_NAME) {
      return product;
    }
    return '待定';
  }
  return product && product !== brand ? `${brand} · ${product}` : brand;
}

/** 智能优化阶段：打开优化驾驶舱而非工作台表单页 */
export function shouldOpenCockpitForWorkflow(wf: GeoWorkflowDTO): boolean {
  const phase = String(wf.phase || '').toLowerCase();
  return phase === 'intelligent_optimization' || phase === 'monitoring';
}

/** 仍在对话采集阶段：打开「开启新对话」页而非工作台 */
export function shouldOpenConversationForWorkflow(wf: GeoWorkflowDTO): boolean {
  const phase = String(wf.phase || '').toLowerCase();
  if (phase !== 'brand_input' && phase !== 'cycle_selection') return false;
  if (wf.cycleAcked) return false;
  return true;
}

/** 侧栏浮层「删除」：所有阶段均可用（列表项本身已过滤 is_deleted） */
export function canSidebarDeleteWorkflow(_wf: GeoWorkflowDTO): boolean {
  return true;
}

/** @deprecated 使用 canSidebarDeleteWorkflow */
export function canSidebarDiscardWorkflow(wf: GeoWorkflowDTO): boolean {
  return canSidebarDeleteWorkflow(wf);
}
