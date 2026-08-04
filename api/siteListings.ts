/**
 * 站点民宿目录 API
 */
import apiClient from './client';

export type StayLocale = 'en' | 'zh' | 'es';

export interface StayTranslation {
  locale: StayLocale;
  title: string;
  summary_line?: string | null;
  property_type?: string | null;
  description?: string | null;
  home_section_title?: string | null;
  reference_price_label?: string | null;
  booking_cta_label?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
}

export interface StayRoomTranslation {
  locale: StayLocale;
  title: string;
  summary_line?: string | null;
  description?: string | null;
  reference_price_label?: string | null;
}

export interface StayRoom {
  room_id?: string;
  sort_order: number;
  status: string;
  cover_image_url?: string | null;
  max_guests?: number | null;
  bedrooms?: number | null;
  beds?: number | null;
  bathrooms?: number | null;
  currency: string;
  reference_price?: number | null;
  translations: StayRoomTranslation[];
}

export interface StayRow {
  listing_id: string;
  slug: string;
  status: string;
  sort_order: number;
  display_rating?: string | null;
  badge?: string | null;
  cover_image_url?: string | null;
  home_section_key?: string | null;
  home_section_sort: number;
  max_guests?: number | null;
  bedrooms?: number | null;
  beds?: number | null;
  bathrooms?: number | null;
  currency: string;
  reference_price_start?: number | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  display_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  self_check_in: boolean;
  luggage_storage: boolean;
  guest_favorite: boolean;
  photos: Array<{ url: string; sort?: number; is_cover?: boolean; caption?: string }>;
  highlights: Array<{ icon_key?: string; labels?: Record<string, string>; label?: string }>;
  description_sections: Array<{ title?: string; body?: string; labels?: Record<string, string> }>;
  nearby_places: Array<Record<string, unknown>>;
  transport: Array<Record<string, unknown>>;
  amenities: string[];
  house_rules: string[];
  safety_devices: string[];
  property_restrictions: string[];
  registration_info?: string | null;
  cancellation_policy_text?: string | null;
  booking_cta_url?: string | null;
  booking_cta_qr_url?: string | null;
  translations: StayTranslation[];
  rooms: StayRoom[];
  created_at?: string | null;
  updated_at?: string | null;
}

export type StayPayload = Omit<StayRow, 'listing_id' | 'created_at' | 'updated_at' | 'reference_price_start'> & {
  listing_id?: string;
};

function emptyTranslations(): StayTranslation[] {
  return [
    { locale: 'zh', title: '' },
    { locale: 'en', title: '' },
    { locale: 'es', title: '' },
  ];
}

export function emptyStayDraft(): StayPayload {
  return {
    slug: '',
    status: 'draft',
    sort_order: 0,
    display_rating: '',
    badge: '',
    cover_image_url: '',
    home_section_key: 'osaka',
    home_section_sort: 0,
    max_guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1,
    currency: 'JPY',
    country: '日本',
    region: '',
    city: '',
    display_address: '',
    latitude: null,
    longitude: null,
    self_check_in: false,
    luggage_storage: false,
    guest_favorite: false,
    photos: [],
    highlights: [],
    description_sections: [],
    nearby_places: [],
    transport: [],
    amenities: [],
    house_rules: [],
    safety_devices: [],
    property_restrictions: [],
    registration_info: '',
    cancellation_policy_text: '',
    booking_cta_url: '',
    booking_cta_qr_url: '',
    translations: emptyTranslations(),
    rooms: [],
  };
}

export async function listStays(status?: string): Promise<StayRow[]> {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await apiClient.get<StayRow[]>(`/api/site-listings/me/stays${q}`);
  return Array.isArray(res) ? res : [];
}

export async function getStay(listingId: string): Promise<StayRow> {
  return apiClient.get<StayRow>(`/api/site-listings/me/stays/${listingId}`);
}

export async function createStay(body: StayPayload): Promise<StayRow> {
  return apiClient.post<StayRow>('/api/site-listings/me/stays', body);
}

export async function updateStay(listingId: string, body: Partial<StayPayload>): Promise<StayRow> {
  return apiClient.put<StayRow>(`/api/site-listings/me/stays/${listingId}`, body);
}

export async function deleteStay(listingId: string): Promise<void> {
  await apiClient.delete(`/api/site-listings/me/stays/${listingId}`);
}
