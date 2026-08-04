/** 品牌解析 / 知识图谱 / finalize-result 轮询（与「快速开始」「优化工作台」同源） */
export const BRAND_PARSE_POLL_MS = 30_000;
/** 工作流 / 优化任务详情等通用轮询间隔 */
export const GEO_WORKFLOW_POLL_MS = 30_000;
/** 单次会话最大轮询次数；间隔 30s 时上限约 100 分钟 */
export const BRAND_PARSE_MAX_POLLS = 200;
