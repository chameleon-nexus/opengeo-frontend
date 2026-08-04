/** 进入智能优化时的 optimization_market：出海仅 admin 可选 */
export function canSelectOverseasOptimizationMarket(role?: string | null): boolean {
  return (role || '').trim().toLowerCase() === 'admin';
}
