/**
 * 品牌解析 / brand-parse 上传白名单，须与 backend/app/api/brand_material_parse.py ALLOWED_EXTENSIONS 一致。
 */
export const BRAND_PARSE_ALLOWED_EXTENSIONS = new Set([
  '.csv',
  '.htm',
  '.html',
  '.json',
  '.markdown',
  '.md',
  '.pdf',
  '.txt',
]);

export function getBrandParseFileExt(filename: string): string {
  const i = filename.lastIndexOf('.');
  if (i < 0) return '';
  return filename.slice(i).toLowerCase();
}

export function filterBrandParseUploadFiles(incoming: File[]): {
  accepted: File[];
  rejected: string[];
} {
  const accepted: File[] = [];
  const rejected: string[] = [];
  for (const f of incoming) {
    const ext = getBrandParseFileExt(f.name);
    if (ext && BRAND_PARSE_ALLOWED_EXTENSIONS.has(ext)) accepted.push(f);
    else rejected.push(f.name || '(未命名)');
  }
  return { accepted, rejected };
}

/** input accept：扩展名为主，部分 MIME 辅助系统筛选 */
export const BRAND_PARSE_ACCEPT_ATTR =
  '.csv,.htm,.html,.json,.markdown,.md,.pdf,.txt,text/csv,text/html,application/json,text/markdown,text/plain,application/pdf';

export function brandParseAllowedFormatsLabel(): string {
  return Array.from(BRAND_PARSE_ALLOWED_EXTENSIONS).sort().join(', ');
}
