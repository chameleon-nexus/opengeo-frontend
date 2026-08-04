/** 三方媒体发布任务状态（与后端 third_party_publish_tasks.status 一致） */
export const TP_STATUS = {
  GENERATED: '已生成',
  PENDING: '待发布',
  PARTIAL: '部分已发布',
  PUBLISHED: '已发布',
} as const;

export type TpStatus = (typeof TP_STATUS)[keyof typeof TP_STATUS];

export function tpStatusBadgeClass(status: string, isDark: boolean): string {
  const base = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border';
  switch (status) {
    case TP_STATUS.PENDING:
      return `${base} ${isDark ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-sky-50 text-sky-700 border-sky-200'}`;
    case TP_STATUS.PARTIAL:
      return `${base} ${isDark ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-orange-50 text-orange-800 border-orange-200'}`;
    case TP_STATUS.PUBLISHED:
      return `${base} ${isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`;
    case TP_STATUS.GENERATED:
    default:
      return `${base} ${isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-800 border-amber-200'}`;
  }
}
