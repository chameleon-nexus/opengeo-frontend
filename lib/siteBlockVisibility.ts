export type SiteBlockVisibilityKey =
  | 'hero'
  | 'business_intro'
  | 'company_sections'
  | 'articles'
  | 'article_directory'
  | 'customers'
  | 'contact_form'
  | 'faq'
  | 'footer';

export type SiteBlockVisibility = Record<SiteBlockVisibilityKey, boolean>;

export const DEFAULT_BLOCK_VISIBILITY: SiteBlockVisibility = {
  hero: true,
  business_intro: true,
  company_sections: true,
  articles: true,
  article_directory: true,
  customers: true,
  contact_form: true,
  faq: true,
  footer: true,
};

export const BLOCK_VISIBILITY_KEYS: SiteBlockVisibilityKey[] = [
  'hero',
  'business_intro',
  'company_sections',
  'articles',
  'article_directory',
  'customers',
  'contact_form',
  'faq',
  'footer',
];

export function parseBlockVisibility(
  raw: unknown,
  legacyShowContactForm?: boolean | null,
): SiteBlockVisibility {
  const out = { ...DEFAULT_BLOCK_VISIBILITY };
  if (raw && typeof raw === 'object') {
    const row = raw as Record<string, unknown>;
    for (const key of BLOCK_VISIBILITY_KEYS) {
      if (key in row) {
        out[key] = Boolean(row[key]);
      }
    }
  }
  if (
    (!raw || typeof raw !== 'object' || !('contact_form' in (raw as object))) &&
    legacyShowContactForm != null
  ) {
    out.contact_form = Boolean(legacyShowContactForm);
  }
  return out;
}

export function blockVisibilityForTemplate(
  templateId: string,
): SiteBlockVisibilityKey[] {
  if (templateId === 'corporate') {
    return BLOCK_VISIBILITY_KEYS;
  }
  if (templateId === 'editorial') {
    return BLOCK_VISIBILITY_KEYS.filter(
      (k) => k !== 'company_sections' && k !== 'customers',
    );
  }
  if (templateId === 'tech') {
    return BLOCK_VISIBILITY_KEYS.filter((k) => k !== 'company_sections');
  }
  return BLOCK_VISIBILITY_KEYS.filter((k) => k !== 'company_sections');
}
