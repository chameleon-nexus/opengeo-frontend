/** 将 FastAPI / 业务 API 的 detail 转为可读字符串 */
export function formatApiErrorDetail(detail: unknown, fallback = '请求失败'): string {
  if (detail == null || detail === '') return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const row = item as { msg?: string; message?: string; loc?: unknown[] };
          const msg = row.msg || row.message;
          if (msg) return String(msg);
        }
        return null;
      })
      .filter(Boolean);
    if (parts.length) return parts.join('；');
  }
  if (typeof detail === 'object') {
    const obj = detail as { message?: string; msg?: string; code?: string };
    if (obj.message) return String(obj.message);
    if (obj.msg) return String(obj.msg);
    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }
  return String(detail);
}

export function formatThrownError(error: unknown, fallback = '操作失败'): string {
  if (error instanceof Error && error.message) {
    const msg = error.message.trim();
    if (msg && msg !== '[object Object]') return msg;
  }
  return fallback;
}
