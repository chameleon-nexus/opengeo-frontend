/** 国际/出海撰稿语言（与 backend overseas_writing_language_catalog 一致） */

export const DEFAULT_DOMESTIC_WRITING_LANGUAGE = 'zh-Hans';
export const DEFAULT_OVERSEAS_WRITING_LANGUAGE = 'en';

/** 出海驾驶舱可选：简体中文 + 英文（与内容创作任务 enabled 语言一致） */
export const OVERSEAS_WRITING_LANGUAGE_OPTIONS = [
  { code: 'zh-Hans', label: '简体中文' },
  { code: 'en', label: '英文' },
] as const;

export type OverseasWritingLanguageCode =
  (typeof OVERSEAS_WRITING_LANGUAGE_OPTIONS)[number]['code'];

const WRITING_LANGUAGE_LABELS: Record<string, string> = {
  'zh-Hans': '简体中文',
  en: '英文',
  'zh-Hant': '繁体中文',
  ja: '日文',
  es: '西班牙语',
  de: '德语',
};

export function normalizeOverseasWritingLanguage(
  code: string | null | undefined,
): OverseasWritingLanguageCode {
  const c = (code || '').trim();
  if (OVERSEAS_WRITING_LANGUAGE_OPTIONS.some((o) => o.code === c)) {
    return c as OverseasWritingLanguageCode;
  }
  return DEFAULT_OVERSEAS_WRITING_LANGUAGE;
}

export function overseasWritingLanguageLabel(code: string | null | undefined): string {
  const c = (code || DEFAULT_DOMESTIC_WRITING_LANGUAGE).trim();
  return WRITING_LANGUAGE_LABELS[c] ?? c;
}
