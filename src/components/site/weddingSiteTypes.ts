export type WeddingSiteStatus = 'draft' | 'published' | 'archived';
export type WeddingSiteImageRole = 'hero' | 'gallery';
export type WeddingEventType = 'ceremony' | 'party';
export type WeddingSiteTemplateId =
  | 'romantic-editorial'
  | 'classic-invitation'
  | 'botanical-garden'
  | 'modern-minimal'
  | 'black-tie';

export type WeddingSiteTemplate = {
  id: WeddingSiteTemplateId;
  name: string;
  tagline: string;
  description: string;
  fontPrimary: string;
  fontSecondary: string;
  colorPrimary: string;
  colorSecondary: string;
  backgroundPrimary: string;
  backgroundSecondary: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  heroOverlay: string;
  heroTone: 'light' | 'dark' | 'boxed';
  sectionStyle: 'soft' | 'framed' | 'organic' | 'clean' | 'luxury';
};

export const weddingSiteTemplates: WeddingSiteTemplate[] = [
  {
    id: 'romantic-editorial',
    name: 'Portal Oliva',
    tagline: 'Assinatura WedPlan',
    description: 'Hero com mosaico fotográfico, oliva profundo e dourado suave como o convite Laís & Luan.',
    fontPrimary: 'Pinyon Script',
    fontSecondary: 'Cormorant Garamond',
    colorPrimary: '#c5a059',
    colorSecondary: '#2d3820',
    backgroundPrimary: '#fdfaf4',
    backgroundSecondary: '#ffffff',
    textColor: '#2d3820',
    mutedColor: '#6a6a60',
    borderColor: 'rgb(45 56 32 / 0.12)',
    heroOverlay: 'linear-gradient(90deg, rgb(0 0 0 / 0.46), rgb(0 0 0 / 0.28) 46%, rgb(0 0 0 / 0.58))',
    heroTone: 'light',
    sectionStyle: 'soft',
  },
  {
    id: 'classic-invitation',
    name: 'Convite Clássico',
    tagline: 'Formal e atemporal',
    description: 'Molduras finas, serifas elegantes e composição central como convite impresso premium.',
    fontPrimary: 'Cormorant Garamond',
    fontSecondary: 'Inter',
    colorPrimary: '#b99351',
    colorSecondary: '#263317',
    backgroundPrimary: '#f8f1e6',
    backgroundSecondary: '#fffaf2',
    textColor: '#263317',
    mutedColor: '#756b5c',
    borderColor: 'rgb(185 147 81 / 0.26)',
    heroOverlay: 'linear-gradient(90deg, rgb(38 51 23 / 0.56), rgb(38 51 23 / 0.2) 48%, rgb(248 241 230 / 0.88))',
    heroTone: 'boxed',
    sectionStyle: 'framed',
  },
  {
    id: 'botanical-garden',
    name: 'Jardim Botânico',
    tagline: 'Natural e leve',
    description: 'Tons vegetais, respiro visual e detalhes orgânicos para cerimônias ao ar livre.',
    fontPrimary: 'Marcellus',
    fontSecondary: 'Nunito Sans',
    colorPrimary: '#c0a35f',
    colorSecondary: '#334829',
    backgroundPrimary: '#f4f5ed',
    backgroundSecondary: '#ffffff',
    textColor: '#263317',
    mutedColor: '#657264',
    borderColor: 'rgb(51 72 41 / 0.16)',
    heroOverlay: 'linear-gradient(90deg, rgb(38 51 23 / 0.6), rgb(38 51 23 / 0.22) 48%, rgb(38 51 23 / 0.52))',
    heroTone: 'light',
    sectionStyle: 'organic',
  },
  {
    id: 'modern-minimal',
    name: 'Minimal Editorial',
    tagline: 'Limpo e sofisticado',
    description: 'A mesma base oliva/dourada, com linhas precisas, espaços amplos e texto mais objetivo.',
    fontPrimary: 'Playfair Display',
    fontSecondary: 'Inter',
    colorPrimary: '#c5a059',
    colorSecondary: '#2d3820',
    backgroundPrimary: '#f8f6f0',
    backgroundSecondary: '#ffffff',
    textColor: '#202417',
    mutedColor: '#696a60',
    borderColor: 'rgb(45 56 32 / 0.12)',
    heroOverlay: 'linear-gradient(90deg, rgb(248 246 240 / 0.96), rgb(248 246 240 / 0.78) 45%, rgb(0 0 0 / 0.2))',
    heroTone: 'dark',
    sectionStyle: 'clean',
  },
  {
    id: 'black-tie',
    name: 'Oliva Noturno',
    tagline: 'Luxo discreto',
    description: 'Versão escura com oliva profundo, textura refinada e dourado para casamentos noturnos.',
    fontPrimary: 'Bodoni Moda',
    fontSecondary: 'Montserrat',
    colorPrimary: '#c5a059',
    colorSecondary: '#263317',
    backgroundPrimary: '#11150c',
    backgroundSecondary: '#1d2415',
    textColor: '#fdfaf4',
    mutedColor: '#d5cab6',
    borderColor: 'rgb(197 160 89 / 0.2)',
    heroOverlay: 'linear-gradient(90deg, rgb(0 0 0 / 0.58), rgb(0 0 0 / 0.28) 42%, rgb(0 0 0 / 0.68))',
    heroTone: 'light',
    sectionStyle: 'luxury',
  },
];

export const defaultWeddingSiteTemplateId: WeddingSiteTemplateId = 'romantic-editorial';

export const getWeddingSiteTemplate = (id?: string | null) =>
  weddingSiteTemplates.find((template) => template.id === id) || weddingSiteTemplates[0];

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
  template_id: WeddingSiteTemplateId;
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
