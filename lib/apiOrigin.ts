/**
 * Backend API 根地址（非 OAuth 回调基域）。
 * 生产构建来自 .env.server；npm run build 会临时隐藏 .env.local，避免被 localhost 覆盖。
 */
export function getApiOrigin(): string {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (raw !== undefined && String(raw).trim() !== '') {
    return String(raw).trim().replace(/\/$/, '');
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8002';
  }
  return '';
}
