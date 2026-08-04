/** 浏览器端导出 CSV / Excel（HTML 表格，Excel 可直接打开） */

function escapeCsvCell(value: string): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCsv(filename: string, headers: string[], rows: string[][]): void {
  const lines = [headers.map(escapeCsvCell).join(','), ...rows.map((row) => row.map(escapeCsvCell).join(','))];
  const blob = new Blob(['\uFEFF', lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(filename.endsWith('.csv') ? filename : `${filename}.csv`, blob);
}

export function downloadExcelHtmlTable(filename: string, headers: string[], rows: string[][]): void {
  const th = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const trs = rows
    .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table border="1"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
  const blob = new Blob(['\uFEFF', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const name = filename.endsWith('.xls') || filename.endsWith('.xlsx') ? filename : `${filename}.xls`;
  triggerDownload(name, blob);
}

export function sanitizeExportFilenamePart(raw: string, fallback = 'export'): string {
  const s = (raw || '').trim().replace(/[^\w\u4e00-\u9fff-]+/g, '_').replace(/^_+|_+$/g, '');
  return (s || fallback).slice(0, 48);
}
