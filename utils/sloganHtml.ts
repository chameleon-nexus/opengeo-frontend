/** 标语 HTML 工具（与 web 端 normalizeSloganHtml 逻辑一致） */

const GRADIENT_CLASS = 'hero-slogan-gradient';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function isSloganHtml(value: string): boolean {
  return /<\s*(br|span)\b/i.test(value);
}

export function normalizeSloganHtml(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (isSloganHtml(trimmed)) return trimmed;

  const lines = trimmed.split(/\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return '';
  if (lines.length === 1) {
    return `<span style="color:#1a1a1a">${escapeHtml(lines[0])}</span>`;
  }
  return `<span style="color:#1a1a1a">${escapeHtml(lines[0])}</span><br><span class="${GRADIENT_CLASS}">${escapeHtml(lines[1])}</span>`;
}

export { GRADIENT_CLASS };
