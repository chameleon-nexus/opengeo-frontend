/**
 * 智能优化双模式 — 单一环境变量 VITE_OPTIMIZATION_OPS_MODE
 *
 * manual_ops（或 b）= B 默认：发布设置 + 定额扣费，隐藏站内撰文/媒体发布
 * content_publish（或 a）= A：恢复 ThirdPartyPublish / 撰文路径
 *
 * 与 backend OPTIMIZATION_OPS_MODE 保持一致；改 .env 后重启 dev 或重新 build。
 */

export type OptimizationOpsMode = 'manual_ops' | 'content_publish';

const MODE_MANUAL_OPS: OptimizationOpsMode = 'manual_ops';
const MODE_CONTENT_PUBLISH: OptimizationOpsMode = 'content_publish';
const DEFAULT_MODE: OptimizationOpsMode = MODE_MANUAL_OPS;

const ALIASES: Record<string, OptimizationOpsMode> = {
  b: MODE_MANUAL_OPS,
  manual: MODE_MANUAL_OPS,
  manual_ops: MODE_MANUAL_OPS,
  'manual-ops': MODE_MANUAL_OPS,
  ops: MODE_MANUAL_OPS,
  a: MODE_CONTENT_PUBLISH,
  content: MODE_CONTENT_PUBLISH,
  content_publish: MODE_CONTENT_PUBLISH,
  'content-publish': MODE_CONTENT_PUBLISH,
  writer: MODE_CONTENT_PUBLISH,
  publish: MODE_CONTENT_PUBLISH,
  legacy: MODE_CONTENT_PUBLISH,
};

export function normalizeOptimizationOpsMode(raw: unknown): OptimizationOpsMode {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!key) return DEFAULT_MODE;
  return ALIASES[key] ?? DEFAULT_MODE;
}

/** 当前运营模式（读 VITE_OPTIMIZATION_OPS_MODE） */
export const OPTIMIZATION_OPS_MODE = normalizeOptimizationOpsMode(
  import.meta.env.VITE_OPTIMIZATION_OPS_MODE,
);

/** @deprecated 使用 OPTIMIZATION_OPS_MODE === 'manual_ops' */
export const OPT_MODE_MANUAL_OPS = OPTIMIZATION_OPS_MODE === MODE_MANUAL_OPS;

/** 范文/仿写、ThirdPartyPublish、工作台撰文 UI */
export const SHOW_CONTENT_AND_MEDIA_PUBLISH = OPTIMIZATION_OPS_MODE === MODE_CONTENT_PUBLISH;

/** 驾驶舱「发布设置」Tab（篇数 + 媒体挡位） */
export const SHOW_PUBLISH_SETTINGS = OPTIMIZATION_OPS_MODE === MODE_MANUAL_OPS;

/** 与 SHOW_CONTENT_AND_MEDIA_PUBLISH 联动 */
export const SHOW_OPT_WRITER_PATH_OPTIONS = SHOW_CONTENT_AND_MEDIA_PUBLISH;

/** B 模式默认每周期篇数 */
export const DEFAULT_PUBLISH_SETTINGS_MAX_ARTICLES = 2;

/** 范文撰写单价展示（与 OSS content_template 默认定价一致；实际扣费以后端为准） */
export const CONTENT_TEMPLATE_POINTS_ESTIMATE = 50;
