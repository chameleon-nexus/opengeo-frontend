/** 本地日期 YYYY-MM-DD（不含时区偏移） */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setHours(0, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 含今天在内的近 n 天 */
export function lastNDaysRange(n: number): { from: string; to: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today);
  from.setDate(from.getDate() - Math.max(0, n - 1));
  return { from: toIsoDate(from), to: toIsoDate(today) };
}

export function isValidIsoRange(from: string, to: string): boolean {
  if (!from || !to) return false;
  return from <= to;
}
