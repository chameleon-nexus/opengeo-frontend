import { AI_PLATFORM_OPTIONS } from './AiPlatformPicker';
import { formatOverseasPlatformIds } from './OverseasPlatformPicker';

const DOMESTIC_LABEL_BY_ID = Object.fromEntries(
  AI_PLATFORM_OPTIONS.map((o) => [o.id, o.label])
) as Record<string, string>;

export function formatDomesticPlatformIds(ids: string[] | null | undefined): string {
  const list = ids ?? [];
  if (list.length === 0) return '—';
  return list.map((id) => DOMESTIC_LABEL_BY_ID[id] ?? id).join(' / ');
}

export { formatOverseasPlatformIds };

export function validatePlatformSelection(domestic: string[], overseas: string[]): string | null {
  if (domestic.length + overseas.length < 1) {
    return '请至少选择一个国内或出海 AI 平台';
  }
  return null;
}

/** 工作台/报告页展示已选平台覆盖范围 */
export function formatWorkflowPlatformCoverage(
  domestic?: string[] | null,
  overseas?: string[] | null
): string | null {
  const d = domestic ?? [];
  const o = overseas ?? [];
  if (d.length === 0 && o.length === 0) return null;
  const parts: string[] = [];
  if (d.length > 0) parts.push(`国内 ${formatDomesticPlatformIds(d)}`);
  if (o.length > 0) parts.push(`出海 ${formatOverseasPlatformIds(o)}`);
  return parts.join(' · ');
}
