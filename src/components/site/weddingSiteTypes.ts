export type WeddingSiteStatus = 'draft' | 'published' | 'archived';
export type WeddingSiteImageRole = 'hero' | 'gallery';
export type WeddingEventType = 'ceremony' | 'party';

export type WeddingSite = {
  id: string;
  wedding_id: string;
  slug: string;
  status: WeddingSiteStatus;
  title: string | null;
  subtitle: string | null;
  welcome_message: string | null;
  cover_image_url: string | null;
  custom_domain: string | null;
  custom_domain_status: 'not_requested' | 'checking' | 'available' | 'reserved' | 'configured' | 'failed';
  rsvp_enabled: boolean;
  gift_list_enabled: boolean;
  messages_enabled: boolean;
  hero_layout: 'editorial' | 'classic' | 'minimal';
  party_same_as_ceremony: boolean;
  font_primary: string;
  font_secondary: string;
  color_primary: string;
  color_secondary: string;
  background_primary: string;
  background_secondary: string;
  gift_intro: string | null;
  gift_delivery_name: string | null;
  gift_delivery_address: string | null;
  gift_delivery_city: string | null;
  gift_delivery_state: string | null;
  gift_delivery_zip: string | null;
  gift_delivery_notes: string | null;
};

export type SiteImage = {
  id: string;
  wedding_site_id?: string;
  wedding_id?: string;
  image_url: string;
  image_path?: string | null;
  image_role: WeddingSiteImageRole;
  alt_text?: string | null;
  sort_order: number;
};

export type StoryItem = {
  id: string;
  wedding_site_id?: string;
  wedding_id?: string;
  title: string;
  body: string | null;
  icon: string;
  image_url?: string | null;
  event_date?: string | null;
  sort_order: number;
};

export type SiteEvent = {
  id: string;
  wedding_site_id?: string;
  wedding_id?: string;
  event_type: WeddingEventType;
  title: string;
  address: string | null;
  event_date: string | null;
  event_time: string | null;
  maps_query: string | null;
  sort_order: number;
};

export type GiftCategory = {
  id: string;
  wedding_id?: string;
  name: string;
  active?: boolean;
};

export type GiftItem = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  price: number | null;
  buy_url: string | null;
  wedding_id?: string;
  brand: string | null;
  is_featured: boolean;
  is_bought: boolean;
  bought_by: string | null;
  category: string | null;
  created_at?: string;
};

export const tempId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const isTempId = (id: string) => id.includes('-') && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export const formatPublicDate = (date?: string | null) => {
  if (!date) return '';
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
};

export const formatMoney = (value?: number | null) => {
  if (value === null || value === undefined) return 'Valor livre';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
};

export const mapsQuery = (event: Pick<SiteEvent, 'maps_query' | 'address' | 'title'>) =>
  (event.maps_query || event.address || event.title || '').trim();

export const googleMapsUrl = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const googleMapsEmbedUrl = (query: string) => `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=pt-BR&z=15&output=embed`;
