/**
 * 「凭证」新开页：用 localStorage 传递数据（同源下跨标签页可读；sessionStorage 不共享新标签）。
 * 仅存 JSON，不写过期时间；内容由用户或浏览器在本机按需清理。
 */

import { resolvePlatformColumn } from './miniReportEnrich';

export const AI_CREDENTIAL_STORAGE_PREFIX = 'ai_credential_v1__';

export type AiCredentialStored = {
  brandName?: string;
  platform?: string;
  question: string;
  aiAnswer?: string;
  externalLink?: string;
};

/** 与 DataScreen 报表明细行 `row.platform` 一致；键经 normalizeCredentialPlatformLookup 规整后匹配 */
const PLATFORM_ICON_BY_ROW_PLATFORM: Record<string, string> = Object.fromEntries(
  Object.entries({
    '豆包（PC）': '/imgs/ai-icons/doubao.png',
    '豆包（移动）': '/imgs/ai-icons/doubao.png',
    'DeepSeek（PC）': '/imgs/ai-icons/deepseek.png',
    'DeepSeek（移动）': '/imgs/ai-icons/deepseek.png',
    '文心一言（PC）': '/imgs/ai-icons/wenxin.png',
    '文心一言（移动）': '/imgs/ai-icons/wenxin.png',
    '千问（PC）': '/imgs/ai-icons/tongyi.png',
    '千问（移动）': '/imgs/ai-icons/tongyi.png',
    '元宝（PC）': '/imgs/ai-icons/yuanbao.png',
    '元宝（移动）': '/imgs/ai-icons/yuanbao.png',
    'Kimi（PC）': '/imgs/ai-icons/kimi.png',
    'Kimi（移动）': '/imgs/ai-icons/kimi.png',
    '夸克（PC）': '/imgs/ai-icons/quark.png',
    '夸克（移动）': '/imgs/ai-icons/quark.png',
    '纳米（PC）': '/imgs/ai-icons/nami.png',
    '纳米（移动）': '/imgs/ai-icons/nami.png',
    '讯飞星火（PC）': '/imgs/ai-icons/xunfei.png',
    '讯飞星火（移动）': '/imgs/ai-icons/xunfei.png',
    '智谱（PC）': '/imgs/ai-icons/zhipu.png',
    '智谱（移动）': '/imgs/ai-icons/zhipu.png',
  }).map(([k, v]) => [normalizeCredentialPlatformLookup(k), v]),
);

function normalizeCredentialPlatformLookup(raw: string): string {
  return raw
    .trim()
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, '')
    .replace(/\uff08/g, '(')
    .replace(/\uff09/g, ')')
    .toLowerCase();
}

/** 凭证页左上角等平台展示用：支持英文 slug（如 doubao）与明细行全称（如 豆包（PC）） */
export function credentialPlatformIconUrl(platform: string | undefined | null): string {
  const raw = String(platform ?? '').trim();
  if (!raw) return '';

  const norm = normalizeCredentialPlatformLookup(raw);
  const fromRow = PLATFORM_ICON_BY_ROW_PLATFORM[norm];
  if (fromRow) return fromRow;

  const { icon } = resolvePlatformColumn(raw);
  if (icon) return icon;

  return '';
}

export function openAiCredentialInNewTab(payload: AiCredentialStored): void {
  if (typeof window === 'undefined') return;
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `k_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

  try {
    localStorage.setItem(AI_CREDENTIAL_STORAGE_PREFIX + id, JSON.stringify(payload));
  } catch (e) {
    console.warn('[credential] localStorage failed', e);
    return;
  }

  const url = `${window.location.origin}/credential?k=${encodeURIComponent(id)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
