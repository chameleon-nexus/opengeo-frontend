import apiClient from './client';

export type CatalogLocale = 'en' | 'zh' | 'es';

export type ServiceCategoryKey =
  | 'private_guide'
  | 'photography'
  | 'transfer'
  | 'private_chef'
  | 'concierge'
  | 'other';

export type DeliveryMode = 'mobile' | 'at_accommodation' | 'fixed_meet' | 'hybrid' | '';

export interface ServiceTranslation {
  locale: CatalogLocale;
  title: string;
  summary_line?: string | null;
  category_label?: string | null;
  description?: string | null;
  service_area_label?: string | null;
  duration_label?: string | null;
  participant_requirements_text?: string | null;
  customization_hint?: string | null;
  home_section_title?: string | null;
  reference_price_label?: string | null;
  booking_cta_label?: string | null;
}

export interface ServicePackageTranslation {
  locale: CatalogLocale;
  title: string;
  summary_line?: string | null;
  description?: string | null;
  reference_price_label?: string | null;
  duration_label?: string | null;
  meeting_point_label?: string | null;
}

export interface ServicePackageRow {
  package_id?: string;
  sort_order: number;
  status: string;
  is_featured: boolean;
  duration_minutes?: number | null;
  currency: string;
  reference_price?: number | null;
  min_booking_amount?: number | null;
  price_unit: string;
  max_group_size?: number | null;
  cover_image_url?: string | null;
  includes: string[];
  excludes: string[];
  notes: string[];
  meeting_point_hint?: string | null;
  itinerary_highlights: Array<Record<string, unknown>>;
  translations: ServicePackageTranslation[];
}

export interface ServiceRow {
  service_id: string;
  slug: string;
  status: string;
  sort_order: number;
  display_rating?: string | null;
  badge?: string | null;
  cover_image_url?: string | null;
  home_section_key?: string | null;
  home_section_sort: number;
  category_key: ServiceCategoryKey;
  guest_favorite: boolean;
  portfolio_photos: Array<{ url: string }>;
  currency: string;
  reference_price?: number | null;
  price_unit: string;
  min_booking_amount?: number | null;
  delivery_mode?: DeliveryMode | null;
  service_area?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  display_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  offered_languages: string[];
  min_age?: number | null;
  max_group_size?: number | null;
  photos: Array<{ url: string }>;
  highlights: Array<Record<string, unknown>>;
  includes: string[];
  service_notes: string[];
  service_attributes: Record<string, unknown>;
  cancellation_policy_text?: string | null;
  accessibility_note?: string | null;
  customization_hint?: string | null;
  booking_cta_url?: string | null;
  booking_cta_qr_url?: string | null;
  translations: ServiceTranslation[];
  packages: ServicePackageRow[];
}

export type ServicePayload = Omit<ServiceRow, 'service_id'>;

const LOCALES: CatalogLocale[] = ['zh', 'en', 'es'];

export const CATEGORY_OPTIONS: { value: ServiceCategoryKey; label: string }[] = [
  { value: 'private_guide', label: '私人导游' },
  { value: 'photography', label: '旅拍摄影' },
  { value: 'transfer', label: '接送/用车' },
  { value: 'private_chef', label: '上门私厨' },
  { value: 'concierge', label: '礼宾代办' },
  { value: 'other', label: '其他' },
];

export const DELIVERY_OPTIONS: { value: DeliveryMode; label: string }[] = [
  { value: '', label: '未指定' },
  { value: 'mobile', label: '上门服务' },
  { value: 'at_accommodation', label: '在住处提供' },
  { value: 'fixed_meet', label: '固定集合点' },
  { value: 'hybrid', label: '上门或集合' },
];

export function emptyServiceDraft(): ServicePayload {
  return {
    slug: '',
    status: 'draft',
    sort_order: 0,
    display_rating: '',
    badge: '',
    cover_image_url: '',
    home_section_key: 'default',
    home_section_sort: 0,
    category_key: 'other',
    guest_favorite: false,
    portfolio_photos: [],
    currency: 'JPY',
    reference_price: null,
    price_unit: 'from',
    min_booking_amount: null,
    delivery_mode: '',
    service_area: '',
    country: '日本',
    region: '',
    city: '',
    display_address: '',
    latitude: null,
    longitude: null,
    offered_languages: [],
    min_age: null,
    max_group_size: null,
    photos: [],
    highlights: [],
    includes: [],
    service_notes: [],
    service_attributes: {},
    cancellation_policy_text: '',
    accessibility_note: '',
    customization_hint: '',
    booking_cta_url: '',
    booking_cta_qr_url: '',
    translations: LOCALES.map((locale) => ({ locale, title: '' })),
    packages: [],
  };
}

export async function listServices(status?: string): Promise<ServiceRow[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await apiClient.get<ServiceRow[]>(`/api/site-services/me/services${q}`);
  return Array.isArray(res) ? res : [];
}

export async function createService(body: ServicePayload): Promise<ServiceRow> {
  return apiClient.post<ServiceRow>('/api/site-services/me/services', body);
}

export async function updateService(serviceId: string, body: Partial<ServicePayload>): Promise<ServiceRow> {
  return apiClient.put<ServiceRow>(`/api/site-services/me/services/${serviceId}`, body);
}

export async function deleteService(serviceId: string): Promise<void> {
  await apiClient.delete(`/api/site-services/me/services/${serviceId}`);
}
