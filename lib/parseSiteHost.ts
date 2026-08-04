const metaEnv = ((import.meta as any).env || {}) as Record<string, unknown>;
export const SUBDOMAIN_BASE = (metaEnv.VITE_SUBDOMAIN_BASE || 'gaobobo.cn')
  .toString()
  .replace(/^https?:\/\//, '')
  .split('/')[0]
  .toLowerCase();

export type DomainMode = 'subdomain' | 'custom';

export function parseHostToDomainFields(host: string): {
  domainMode: DomainMode;
  subdomainSlug: string;
  customDomain: string;
} {
  const d = (host || '').toLowerCase();
  const escaped = SUBDOMAIN_BASE.replace(/\./g, '\\.');
  const slugMatch = d.match(new RegExp(`^([a-z0-9-]+)\\.${escaped}$`));
  if (slugMatch) {
    return { domainMode: 'subdomain', subdomainSlug: slugMatch[1], customDomain: '' };
  }
  if (d) {
    return { domainMode: 'custom', subdomainSlug: '', customDomain: d };
  }
  return { domainMode: 'subdomain', subdomainSlug: '', customDomain: '' };
}

export function buildEffectiveDomain(
  domainMode: DomainMode,
  subdomainSlug: string,
  customDomain: string,
): string {
  if (domainMode === 'subdomain') {
    const slug = subdomainSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    return slug ? `${slug}.${SUBDOMAIN_BASE}` : '';
  }
  return customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0] || '';
}
