/** 自动生成 brand_id slug：拼音/英文/数字 + 时间戳片段 */
export function genBrandSlug(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/[\u4e00-\u9fa5]/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  const stamp = Date.now().toString(36).slice(-6);
  return base ? `${base}-${stamp}` : `brand-${stamp}`;
}
