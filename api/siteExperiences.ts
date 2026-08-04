import apiClient from './client';

export type CatalogLocale = 'en' | 'zh' | 'es';

export interface ExperienceTranslation {
  locale: CatalogLocale;
  title: string;
  summary_line?: string | null;
  category_label?: string | null;
  description?: string | null;
  duration_label?: string | null;
  participant_requirements_text?: string | null;
  home_section_title?: string | null;
  reference_price_label?: string | null;
  booking_cta_label?: string | null;
}

export interface ExperienceRow {
  experience_id: string;
  slug: string;
  status: string;
  sort_order: number;
  display_rating?: string | null;
  badge?: string | null;
  cover_image_url?: string | null;
  home_section_key?: string | null;
  home_section_sort: number;
  guest_favorite: boolean;
  currency: string;
  reference_price?: number | null;
  price_unit: string;
  duration_minutes?: number | null;
  min_age?: number | null;
  max_participants?: number | null;
  activity_level?: string | null;
  skill_level?: string | null;
  category_key?: string | null;
  offered_languages: string[];
  country?: string | null;
  region?: string | null;
  city?: string | null;
  venue_name?: string | null;
  display_address?: string | null;
  photos: Array<{ url: string }>;
  activity_steps: Array<{ sort?: number; titles?: Record<string, string>; bodies?: Record<string, string> }>;
  highlights: Array<Record<string, unknown>>;
  includes: string[];
  what_to_bring: string[];
  participant_notes: string[];
  cancellation_policy_text?: string | null;
  accessibility_note?: string | null;
  booking_cta_url?: string | null;
  booking_cta_qr_url?: string | null;
  translations: ExperienceTranslation[];
}

export type ExperiencePayload = Omit<ExperienceRow, 'experience_id'>;

const LOCALES: CatalogLocale[] = ['zh', 'en', 'es'];

export function emptyExperienceDraft(): ExperiencePayload {
  return {
    slug: '',
    status: 'draft',
    sort_order: 0,
    display_rating: '',
    badge: '',
    cover_image_url: '',
    home_section_key: 'default',
    home_section_sort: 0,
    guest_favorite: false,
    currency: 'JPY',
    reference_price: null,
    price_unit: 'per_guest',
    duration_minutes: 60,
    min_age: null,
    max_participants: 10,
    activity_level: 'light',
    skill_level: 'beginner',
    category_key: 'art_workshop',
    offered_languages: ['en'],
    country: '日本',
    region: '',
    city: '',
    venue_name: '',
    display_address: '',
    photos: [],
    activity_steps: [],
    highlights: [],
    includes: [],
    what_to_bring: [],
    participant_notes: [],
    cancellation_policy_text: '',
    accessibility_note: '',
    booking_cta_url: '',
    booking_cta_qr_url: '',
    translations: LOCALES.map((locale) => ({ locale, title: '' })),
  };
}

export async function listExperiences(status?: string): Promise<ExperienceRow[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await apiClient.get<ExperienceRow[]>(`/api/site-experiences/me/experiences${q}`);
  return Array.isArray(res) ? res : [];
}

export async function createExperience(body: ExperiencePayload): Promise<ExperienceRow> {
  return apiClient.post<ExperienceRow>('/api/site-experiences/me/experiences', body);
}

export async function updateExperience(experienceId: string, body: Partial<ExperiencePayload>): Promise<ExperienceRow> {
  return apiClient.put<ExperienceRow>(`/api/site-experiences/me/experiences/${experienceId}`, body);
}

export async function deleteExperience(experienceId: string): Promise<void> {
  await apiClient.delete(`/api/site-experiences/me/experiences/${experienceId}`);
}
