import i18n from './config';

/** Map backend third-party publish status (Chinese values) to i18n keys */
const TP_STATUS_KEYS: Record<string, string> = {
  已生成: 'status.generated',
  待发布: 'status.pending',
  部分已发布: 'status.partial',
  已发布: 'status.published',
  generated: 'status.generated',
  pending: 'status.pending',
  partial: 'status.partial',
  published: 'status.published',
};

export function translateTpStatus(status: string, ns: 'publish' = 'publish'): string {
  const key = TP_STATUS_KEYS[status];
  if (key) {
    return i18n.t(key, { ns, defaultValue: status });
  }
  return status;
}

export function translatePublishKey(key: string, fallback?: string): string {
  return i18n.t(key, { ns: 'publish', defaultValue: fallback ?? key });
}
