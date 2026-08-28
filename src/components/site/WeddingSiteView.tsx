import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Gift,
  Globe2,
  ImagePlus,
  Loader2,
  MapPin,
  MessageSquareHeart,
  Palette,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { Badge, Button, Card, Input, cn } from '../ui';
import { supabase } from '../../lib/supabase';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';
import type { WeddingData } from '../../types';
import { WeddingSitePreview } from './WeddingSitePreview';
import {
  formatMoney,
  isTempId,
  tempId,
  type GiftCategory,
  type GiftItem,
  type SiteEvent,
  type SiteImage,
  type StoryItem,
  type WeddingSite,
  type WeddingSiteStatus,
} from './weddingSiteTypes';

type DomainRequest = {
  id: string;
  requested_domain: string;
  status: string;
  setup_fee: number;
  annual_fee: number;
  billing_status: string;
  created_at: string;
};

type GuestMessage = {
  id: string;
  author_name: string;
  author_email: string | null;
  message: string;
  status: 'pending' | 'approved' | 'hidden';
  created_at: string;
};

type WeddingSiteViewProps = {
  data: WeddingData;
};

const steps = [
  { id: 'identity', label: 'Identidade' },
  { id: 'photos', label: 'Fotos' },
  { id: 'story', label: 'História' },
  { id: 'events', label: 'Locais' },
  { id: 'gifts', label: 'Presentes' },
  { id: 'publish', label: 'Publicar' },
] as const;

type StepId = typeof steps[number]['id'];

const fontOptions = [
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
  { value: 'Lora', label: 'Lora' },
  { value: 'Outfit', label: 'Outfit' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Manrope', label: 'Manrope' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Great Vibes', label: 'Great Vibes' },
];

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

const defaultSlug = (data: WeddingData) => {
  const names = [data.casal.nome1, data.casal.nome2].filter(Boolean).join(' e ');
  return slugify(names || 'meu-casamento');
};

const defaultTitle = (data: WeddingData) => [data.casal.nome1, data.casal.nome2].filter(Boolean).join(' & ');

const newStoryItem = (order: number): StoryItem => ({
  id: tempId('story'),
  title: '',
  body: '',
  icon: 'heart',
  image_url: null,
  event_date: null,
  sort_order: order,
});

const newEvent = (type: 'ceremony' | 'party', order: number): SiteEvent => ({
  id: tempId(type),
  event_type: type,
  title: type === 'ceremony' ? 'Cerimônia' : 'Festa',
  address: '',
  event_date: null,
  event_time: null,
  maps_query: '',
  sort_order: order,
});

const newGift = (categoryId?: string | null): GiftItem => ({
  id: tempId('gift'),
  title: '',
  subtitle: '',
  image_url: '',
  price: null,
  buy_url: '',
  brand: '',
  is_featured: false,
  is_bought: false,
  bought_by: null,
  category: categoryId || null,
});

const getFriendlyError = (err: any, fallback: string) => {
  const message = String(err?.message || err?.error_description || err || '');
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('schema cache') ||
    lowerMessage.includes('could not find') ||
    lowerMessage.includes('pgrst204') ||
    lowerMessage.includes('column')
  ) {
    return 'Não foi possível salvar essa alteração agora. Tente novamente em instantes ou fale com o suporte.';
  }

  if (lowerMessage.includes('duplicate') || lowerMessage.includes('unique')) {
    return 'Esse endereço do site já está em uso. Escolha outro nome para o link.';
  }

  if (lowerMessage.includes('row-level security') || lowerMessage.includes('permission')) {
    return 'Você não tem permissão para alterar esses dados.';
  }

  return fallback;
};

export const WeddingSiteView = ({ data }: WeddingSiteViewProps) => {
  const { hasFeature, loading: planLoading, subscription } = usePlanFeatures();
  const [activeStep, setActiveStep] = useState<StepId>('identity');
  const [site, setSite] = useState<WeddingSite | null>(null);
  const [form, setForm] = useState({
    slug: defaultSlug(data),
    title: defaultTitle(data),
    subtitle: 'Save the date',
    welcome_message: '',
    cover_image_url: '',
    status: 'draft' as WeddingSiteStatus,
    rsvp_enabled: true,
    gift_list_enabled: true,
    messages_enabled: true,
    hero_layout: 'editorial' as WeddingSite['hero_layout'],
    party_same_as_ceremony: false,
    font_primary: 'Playfair Display',
    font_secondary: 'Manrope',
    color_primary: '#8b6f43',
    color_secondary: '#2f3829',
    background_primary: '#fbfaf7',
    background_secondary: '#ffffff',
    gift_intro: 'Preparamos algumas sugestões para quem quiser nos presentear com carinho.',
    gift_delivery_name: defaultTitle(data),
    gift_delivery_address: '',
    gift_delivery_city: '',
    gift_delivery_state: '',
    gift_delivery_zip: '',
    gift_delivery_notes: '',
  });
  const [heroImages, setHeroImages] = useState<SiteImage[]>([]);
  const [galleryImages, setGalleryImages] = useState<SiteImage[]>([]);
  const [storyItems, setStoryItems] = useState<StoryItem[]>([newStoryItem(0)]);
  const [events, setEvents] = useState<SiteEvent[]>([newEvent('ceremony', 0), newEvent('party', 1)]);
  const [categories, setCategories] = useState<GiftCategory[]>([]);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [deletedGiftIds, setDeletedGiftIds] = useState<string[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [domain, setDomain] = useState('');
  const [domainRequests, setDomainRequests] = useState<DomainRequest[]>([]);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUseSite = hasFeature('wedding_site');
  const canRequestDomain = hasFeature('custom_domain_addon');
  const publicUrl = useMemo(() => `${window.location.origin}/casamento/${form.slug}`, [form.slug]);
  const publishIssues = useMemo(() => {
    const issues: string[] = [];
    const cleanSlug = slugify(form.slug);
    const validStoryItems = storyItems.filter((item) => item.title.trim() && (item.body || '').trim());
    const eventsToValidate = form.party_same_as_ceremony
      ? events.filter((event) => event.event_type === 'ceremony')
      : events;
    const validEvents = eventsToValidate.filter((event) => event.title.trim() && (event.address || '').trim() && event.event_date && event.event_time);

    if (form.status !== 'published') issues.push('Altere o status para Publicado.');
    if (cleanSlug.length < 3) issues.push('Defina o endereço público do site.');
    if (!form.title.trim()) issues.push('Informe o nome do casal ou título do site.');
    if (!form.welcome_message.trim()) issues.push('Escreva a mensagem de boas-vindas.');
    if (!form.cover_image_url && heroImages.length === 0) issues.push('Adicione pelo menos uma foto para o hero.');
    if (validStoryItems.length === 0) issues.push('Adicione pelo menos um capítulo da história com título e texto.');
    if (validEvents.length === 0) issues.push('Configure pelo menos um local com endereço, data e horário.');
    if (!form.party_same_as_ceremony && !events.some((event) => event.event_type === 'party')) issues.push('Adicione o local da festa ou marque que será no mesmo local.');

    if (form.gift_list_enabled) {
      if (!form.gift_delivery_name.trim()) issues.push('Informe o destinatário dos presentes.');
      if (!form.gift_delivery_address.trim()) issues.push('Informe o endereço de entrega dos presentes.');
      if (!form.gift_delivery_city.trim()) issues.push('Informe a cidade de entrega dos presentes.');
      if (!form.gift_delivery_state.trim()) issues.push('Informe o estado de entrega dos presentes.');
      if (!form.gift_delivery_zip.trim()) issues.push('Informe o CEP de entrega dos presentes.');
    }

    return issues;
  }, [
    events,
    form.gift_delivery_address,
    form.gift_delivery_city,
    form.gift_delivery_name,
    form.gift_delivery_state,
    form.gift_delivery_zip,
    form.gift_list_enabled,
    form.party_same_as_ceremony,
    form.slug,
    form.status,
    form.title,
    form.welcome_message,
    form.cover_image_url,
    heroImages.length,
    storyItems,
  ]);
  const canSaveAndOpen = publishIssues.length === 0 && !saving && !uploading;
  const eventsForEditor = form.party_same_as_ceremony
    ? events.filter((event) => event.event_type === 'ceremony')
    : events;

  useEffect(() => {
    if (!data.id || planLoading || !canUseSite) {
      setLoading(false);
      return;
    }

    loadSite();
  }, [data.id, planLoading, canUseSite]);

  const loadSite = async () => {
    if (!data.id) return;
    setLoading(true);
    setError(null);

    try {
      const { data: siteData, error: siteError } = await supabase
        .from('wedding_sites')
        .select('*')
        .eq('wedding_id', data.id)
        .maybeSingle();

      if (siteError) throw siteError;

      if (siteData) {
        const currentSite = siteData as WeddingSite;
        setSite(currentSite);
        setForm({
          slug: currentSite.slug,
          title: currentSite.title || defaultTitle(data),
          subtitle: currentSite.subtitle || 'Save the date',
          welcome_message: currentSite.welcome_message || '',
          cover_image_url: currentSite.cover_image_url || '',
          status: currentSite.status,
          rsvp_enabled: currentSite.rsvp_enabled,
          gift_list_enabled: currentSite.gift_list_enabled,
          messages_enabled: currentSite.messages_enabled,
          hero_layout: currentSite.hero_layout || 'editorial',
          party_same_as_ceremony: currentSite.party_same_as_ceremony || false,
          font_primary: currentSite.font_primary || 'Playfair Display',
          font_secondary: currentSite.font_secondary || 'Manrope',
          color_primary: currentSite.color_primary || '#8b6f43',
          color_secondary: currentSite.color_secondary || '#2f3829',
          background_primary: currentSite.background_primary || '#fbfaf7',
          background_secondary: currentSite.background_secondary || '#ffffff',
          gift_intro: currentSite.gift_intro || '',
          gift_delivery_name: currentSite.gift_delivery_name || defaultTitle(data),
          gift_delivery_address: currentSite.gift_delivery_address || '',
          gift_delivery_city: currentSite.gift_delivery_city || '',
          gift_delivery_state: currentSite.gift_delivery_state || '',
          gift_delivery_zip: currentSite.gift_delivery_zip || '',
          gift_delivery_notes: currentSite.gift_delivery_notes || '',
        });

        const [imagesResult, storyResult, eventsResult, categoriesResult, giftsResult, domainResult, messagesResult] = await Promise.all([
          supabase
            .from('wedding_site_images')
            .select('*')
            .eq('wedding_site_id', currentSite.id)
            .order('sort_order', { ascending: true }),
          supabase
            .from('wedding_site_story_items')
            .select('*')
            .eq('wedding_site_id', currentSite.id)
            .order('sort_order', { ascending: true }),
          supabase
            .from('wedding_site_events')
            .select('*')
            .eq('wedding_site_id', currentSite.id)
            .order('sort_order', { ascending: true }),
          supabase
            .from('categorias_presentes')
            .select('id, wedding_id, name, active')
            .eq('wedding_id', data.id)
            .order('name', { ascending: true }),
          supabase
            .from('lista_presentes')
            .select('id, title, subtitle, image_url, price, buy_url, wedding_id, brand, is_featured, is_bought, bought_by, category, created_at')
            .eq('wedding_id', data.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('domain_requests')
            .select('id, requested_domain, status, setup_fee, annual_fee, billing_status, created_at')
            .eq('wedding_site_id', currentSite.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('guest_messages')
            .select('id, author_name, author_email, message, status, created_at')
            .eq('wedding_id', data.id)
            .order('created_at', { ascending: false }),
        ]);

        if (imagesResult.error) throw imagesResult.error;
        if (storyResult.error) throw storyResult.error;
        if (eventsResult.error) throw eventsResult.error;
        if (categoriesResult.error) throw categoriesResult.error;
        if (giftsResult.error) throw giftsResult.error;
        if (domainResult.error) throw domainResult.error;
        if (messagesResult.error) throw messagesResult.error;

        const images = (imagesResult.data || []) as SiteImage[];
        setHeroImages(images.filter((image) => image.image_role === 'hero'));
        setGalleryImages(images.filter((image) => image.image_role === 'gallery'));
        setStoryItems(((storyResult.data || []) as StoryItem[]).length > 0 ? (storyResult.data as StoryItem[]) : [newStoryItem(0)]);
        setEvents(((eventsResult.data || []) as SiteEvent[]).length > 0 ? (eventsResult.data as SiteEvent[]) : [newEvent('ceremony', 0), newEvent('party', 1)]);
        setCategories((categoriesResult.data || []) as GiftCategory[]);
        setGifts((giftsResult.data || []) as GiftItem[]);
        setDomainRequests((domainResult.data || []) as DomainRequest[]);
        setMessages((messagesResult.data || []) as GuestMessage[]);
      }
    } catch (err: any) {
      console.error('[WeddingSiteView] Erro ao carregar site:', err);
      setError(getFriendlyError(err, 'Não foi possível carregar o site do casal.'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null, role: 'hero' | 'gallery', assign?: (url: string) => void) => {
    if (!files?.length || !data.id) return;
    setUploading(true);
    setError(null);

    try {
      const uploaded: SiteImage[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 8 * 1024 * 1024) throw new Error('Cada imagem deve ter no máximo 8MB.');

        const extension = file.name.split('.').pop() || 'jpg';
        const safeName = file.name.replace(/\.[^/.]+$/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
        const filePath = `${data.id}/site/${Date.now()}-${safeName}.${extension}`;

        const { error: uploadError } = await supabase.storage.from('casamentos').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage.from('casamentos').getPublicUrl(filePath);
        if (assign) {
          assign(publicData.publicUrl);
        } else {
          uploaded.push({
            id: tempId('image'),
            image_url: publicData.publicUrl,
            image_path: filePath,
            image_role: role,
            alt_text: file.name,
            sort_order: role === 'hero' ? heroImages.length + uploaded.length : galleryImages.length + uploaded.length,
          });
        }
      }

      if (uploaded.length > 0) {
        if (role === 'hero') setHeroImages((current) => [...current, ...uploaded]);
        if (role === 'gallery') setGalleryImages((current) => [...current, ...uploaded]);
        if (!form.cover_image_url && role === 'hero') setForm((current) => ({ ...current, cover_image_url: uploaded[0].image_url }));
      }
    } catch (err: any) {
      console.error('[WeddingSiteView] Erro ao enviar imagem:', err);
      setError(getFriendlyError(err, 'Não foi possível enviar a imagem.'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (openAfterSave = false) => {
    if (!data.id) return;
    if (openAfterSave && publishIssues.length > 0) {
      setError('Complete os campos obrigatórios antes de abrir o site público.');
      setActiveStep('publish');
      return;
    }

    const cleanSlug = slugify(form.slug);
    if (!cleanSlug) {
      setError('Informe um endereço válido para o site.');
      setActiveStep('identity');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: savedSite, error: saveError } = await supabase
        .from('wedding_sites')
        .upsert({
          wedding_id: data.id,
          slug: cleanSlug,
          status: form.status,
          title: form.title || defaultTitle(data),
          subtitle: form.subtitle || null,
          welcome_message: form.welcome_message || null,
          cover_image_url: form.cover_image_url || heroImages[0]?.image_url || null,
          rsvp_enabled: form.rsvp_enabled,
          gift_list_enabled: form.gift_list_enabled,
          messages_enabled: form.messages_enabled,
          hero_layout: form.hero_layout,
          party_same_as_ceremony: form.party_same_as_ceremony,
          font_primary: form.font_primary,
          font_secondary: form.font_secondary,
          color_primary: form.color_primary,
          color_secondary: form.color_secondary,
          background_primary: form.background_primary,
          background_secondary: form.background_secondary,
          gift_intro: form.gift_intro || null,
          gift_delivery_name: form.gift_delivery_name || null,
          gift_delivery_address: form.gift_delivery_address || null,
          gift_delivery_city: form.gift_delivery_city || null,
          gift_delivery_state: form.gift_delivery_state || null,
          gift_delivery_zip: form.gift_delivery_zip || null,
          gift_delivery_notes: form.gift_delivery_notes || null,
          published_at: form.status === 'published' ? new Date().toISOString() : null,
        }, { onConflict: 'wedding_id' })
        .select()
        .single();

      if (saveError) throw saveError;
      const currentSite = savedSite as WeddingSite;
      setSite(currentSite);
      setForm((current) => ({ ...current, slug: cleanSlug }));

      await Promise.all([
        supabase.from('wedding_site_images').delete().eq('wedding_site_id', currentSite.id),
        supabase.from('wedding_site_story_items').delete().eq('wedding_site_id', currentSite.id),
        supabase.from('wedding_site_events').delete().eq('wedding_site_id', currentSite.id),
      ]);

      const imagesToInsert = [...heroImages, ...galleryImages].map((image, index) => ({
        wedding_site_id: currentSite.id,
        wedding_id: data.id,
        image_url: image.image_url,
        image_path: image.image_path || null,
        image_role: image.image_role,
        alt_text: image.alt_text || null,
        sort_order: index,
      }));

      const storyToInsert = storyItems
        .filter((item) => item.title.trim())
        .map((item, index) => ({
          wedding_site_id: currentSite.id,
          wedding_id: data.id,
          title: item.title.trim(),
          body: item.body || null,
          icon: item.icon || 'heart',
          image_url: item.image_url || null,
          event_date: item.event_date || null,
          sort_order: index,
        }));

      const eventsToSave = form.party_same_as_ceremony
        ? events.filter((event) => event.event_type === 'ceremony')
        : events;

      const eventsToInsert = eventsToSave
        .filter((event) => event.title.trim())
        .map((event, index) => ({
          wedding_site_id: currentSite.id,
          wedding_id: data.id,
          event_type: event.event_type,
          title: event.title.trim(),
          address: event.address || null,
          event_date: event.event_date || null,
          event_time: event.event_time || null,
          maps_query: event.maps_query || event.address || null,
          sort_order: index,
        }));

      const categoryMap = new Map(categories.filter((category) => !isTempId(category.id)).map((category) => [category.id, category.id]));
      for (const category of categories.filter((item) => item.name.trim())) {
        if (isTempId(category.id)) {
          const { data: insertedCategory, error: categoryError } = await supabase
            .from('categorias_presentes')
            .insert({ wedding_id: data.id, name: category.name.trim(), active: true })
            .select('id')
            .single();
          if (categoryError) throw categoryError;
          categoryMap.set(category.id, insertedCategory.id);
        } else {
          const { error: categoryError } = await supabase
            .from('categorias_presentes')
            .update({ name: category.name.trim(), active: category.active ?? true })
            .eq('id', category.id);
          if (categoryError) throw categoryError;
        }
      }

      const [imagesInsert, storyInsert, eventsInsert] = await Promise.all([
        imagesToInsert.length ? supabase.from('wedding_site_images').insert(imagesToInsert) : Promise.resolve({ error: null }),
        storyToInsert.length ? supabase.from('wedding_site_story_items').insert(storyToInsert) : Promise.resolve({ error: null }),
        eventsToInsert.length ? supabase.from('wedding_site_events').insert(eventsToInsert) : Promise.resolve({ error: null }),
      ]);

      if (imagesInsert.error) throw imagesInsert.error;
      if (storyInsert.error) throw storyInsert.error;
      if (eventsInsert.error) throw eventsInsert.error;

      if (deletedGiftIds.length > 0) {
        const { error: deleteGiftError } = await supabase.from('lista_presentes').delete().in('id', deletedGiftIds);
        if (deleteGiftError) throw deleteGiftError;
      }

      for (const gift of gifts.filter((item) => item.title.trim())) {
        const payload = {
          wedding_id: data.id,
          title: gift.title.trim(),
          subtitle: gift.subtitle || null,
          image_url: gift.image_url || null,
          price: gift.price,
          buy_url: gift.buy_url || null,
          brand: gift.brand || null,
          is_featured: gift.is_featured,
          is_bought: gift.is_bought,
          bought_by: gift.bought_by || null,
          category: gift.category ? categoryMap.get(gift.category) || gift.category : null,
        };

        if (isTempId(gift.id)) {
          const { error: giftError } = await supabase.from('lista_presentes').insert(payload);
          if (giftError) throw giftError;
        } else {
          const { error: giftError } = await supabase.from('lista_presentes').update(payload).eq('id', gift.id);
          if (giftError) throw giftError;
        }
      }

      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
      setDeletedGiftIds([]);
      await loadSite();
      if (openAfterSave) window.open(`${window.location.origin}/casamento/${cleanSlug}`, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      console.error('[WeddingSiteView] Erro ao salvar site:', err);
      setError(getFriendlyError(err, 'Não foi possível salvar o site.'));
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setCategories((current) => [...current, { id: tempId('category'), name, active: true }]);
    setNewCategoryName('');
  };

  const copyPublicUrl = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestDomain = async () => {
    if (!site) {
      setError('Salve o site antes de solicitar um domínio.');
      return;
    }

    const cleanDomain = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleanDomain.includes('.')) {
      setError('Informe um domínio válido, como mariaejoao.com.br.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sessão expirada');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-custom-domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          weddingSiteId: site.id,
          domain: cleanDomain,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Não foi possível registrar a solicitação de domínio.');

      setDomain('');
      await loadSite();
    } catch (err: any) {
      console.error('[WeddingSiteView] Erro ao solicitar domínio:', err);
      setError(getFriendlyError(err, 'Não foi possível registrar a solicitação de domínio.'));
    } finally {
      setSaving(false);
    }
  };

  const updateMessageStatus = async (messageId: string, status: GuestMessage['status']) => {
    const previousMessages = messages;
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, status } : message));

    const { error: updateError } = await supabase.from('guest_messages').update({ status }).eq('id', messageId);

    if (updateError) {
      setMessages(previousMessages);
      setError(getFriendlyError(updateError, 'Não foi possível atualizar a mensagem.'));
    }
  };

  if (planLoading || loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!canUseSite) {
    return (
      <div className="max-w-4xl space-y-6">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-8">
          <Badge variant="outline" className="mb-4">
            <Sparkles size={13} />
            Recurso Pro
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Site personalizado do casal</h2>
          <p className="mt-3 text-sm font-medium leading-6 text-muted-foreground">
            O plano Pro libera landing page pública para o casal, lista de presentes individual,
            RSVP, mensagens dos convidados e solicitação de domínio personalizado.
          </p>
          <div className="mt-5 rounded-xl border border-border bg-background/80 p-4 text-sm font-bold text-muted-foreground">
            Plano atual: {subscription?.plan?.name || 'sem assinatura Pro'}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Site do Casal</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">Construa uma landing completa com história, fotos, RSVP, presentes e locais.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyPublicUrl} className="h-11 rounded-xl px-4">
            {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
            {copied ? 'Copiado' : 'Copiar link'}
          </Button>
          <Button variant="outline" onClick={() => handleSave(true)} disabled={!canSaveAndOpen} className="h-11 rounded-xl px-4">
            <ExternalLink size={16} />
            Salvar e abrir
          </Button>
          <Button onClick={() => handleSave(false)} disabled={saving || uploading} className="h-11 rounded-xl px-4">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Salvar
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-bold text-destructive">
          {error}
        </div>
      )}

      {savedFlash && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-600">
          Site salvo com sucesso.
        </div>
      )}

      {publishIssues.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-bold text-amber-700 dark:text-amber-300">
          Complete os campos obrigatórios para liberar o botão de abrir o site público.
        </div>
      )}

      <div className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <Card className="p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={cn(
                    'h-11 rounded-xl text-xs font-black uppercase tracking-[0.08em] transition',
                    activeStep === step.id ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </Card>

          {activeStep === 'identity' && (
            <EditorPanel icon={Globe2} title="Identidade do site" description="Defina textos principais, URL e módulos visíveis.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Endereço do site">
                  <div className="flex rounded-2xl border border-border bg-secondary/30">
                    <span className="flex items-center border-r border-border px-3 text-xs font-bold text-muted-foreground">/casamento/</span>
                    <input
                      value={form.slug}
                      onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                      onBlur={() => setForm((current) => ({ ...current, slug: slugify(current.slug) }))}
                      className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-bold outline-none"
                    />
                  </div>
                </Field>

                <Field label="Status">
                  <Segmented
                    value={form.status}
                    options={[
                      { value: 'draft', label: 'Rascunho' },
                      { value: 'published', label: 'Publicado' },
                    ]}
                    onChange={(value) => setForm((current) => ({ ...current, status: value as WeddingSiteStatus }))}
                  />
                </Field>
              </div>

              <Field label="Título">
                <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="h-12 rounded-2xl bg-secondary/30" placeholder="Maria & João" />
              </Field>

              <Field label="Subtítulo">
                <Input value={form.subtitle} onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))} className="h-12 rounded-2xl bg-secondary/30" placeholder="Save the date" />
              </Field>

              <Field label="Mensagem de boas-vindas">
                <textarea
                  value={form.welcome_message}
                  onChange={(event) => setForm((current) => ({ ...current, welcome_message: event.target.value }))}
                  className="min-h-28 w-full rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-sm font-medium outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  placeholder="Estamos muito felizes em compartilhar esse momento com você."
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-3">
                <Toggle label="RSVP" checked={form.rsvp_enabled} onChange={(checked) => setForm((current) => ({ ...current, rsvp_enabled: checked }))} />
                <Toggle label="Presentes" checked={form.gift_list_enabled} onChange={(checked) => setForm((current) => ({ ...current, gift_list_enabled: checked }))} />
                <Toggle label="Mensagens" checked={form.messages_enabled} onChange={(checked) => setForm((current) => ({ ...current, messages_enabled: checked }))} />
              </div>

              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Palette size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black">Aparência do site</p>
                    <p className="text-xs font-medium text-muted-foreground">Fontes e cores aparecem na prévia em tempo real.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Fonte principal">
                    <FontSelect value={form.font_primary} onChange={(value) => setForm((current) => ({ ...current, font_primary: value }))} />
                  </Field>
                  <Field label="Fonte secundária">
                    <FontSelect value={form.font_secondary} onChange={(value) => setForm((current) => ({ ...current, font_secondary: value }))} />
                  </Field>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ColorInput label="Cor principal" value={form.color_primary} onChange={(value) => setForm((current) => ({ ...current, color_primary: value }))} />
                  <ColorInput label="Cor secundária" value={form.color_secondary} onChange={(value) => setForm((current) => ({ ...current, color_secondary: value }))} />
                  <ColorInput label="Fundo principal" value={form.background_primary} onChange={(value) => setForm((current) => ({ ...current, background_primary: value }))} />
                  <ColorInput label="Fundo secundário" value={form.background_secondary} onChange={(value) => setForm((current) => ({ ...current, background_secondary: value }))} />
                </div>
              </div>
            </EditorPanel>
          )}

          {activeStep === 'photos' && (
            <EditorPanel icon={ImagePlus} title="Fotos do site" description="Suba imagens para o hero em carrossel e para a galeria pública.">
              <UploadBox label="Fotos do hero" description="Use 2 a 5 imagens horizontais para criar carrossel visual." uploading={uploading} onFiles={(files) => handleUpload(files, 'hero')} />
              <ImageGrid images={heroImages} onRemove={(id) => setHeroImages((current) => current.filter((image) => image.id !== id))} />

              <UploadBox label="Galeria" description="Fotos extras para a seção de memórias." uploading={uploading} onFiles={(files) => handleUpload(files, 'gallery')} />
              <ImageGrid images={galleryImages} onRemove={(id) => setGalleryImages((current) => current.filter((image) => image.id !== id))} />
            </EditorPanel>
          )}

          {activeStep === 'story' && (
            <EditorPanel icon={MessageSquareHeart} title="História do casal" description="Adicione marcos como primeiro encontro, pedido, viagem e momentos especiais.">
              <div className="space-y-4">
                {storyItems.map((item, index) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-secondary/20 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Capítulo {index + 1}</p>
                      <button onClick={() => setStoryItems((current) => current.filter((story) => story.id !== item.id))} className="text-destructive">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input value={item.title} onChange={(event) => setStoryItems((current) => current.map((story) => story.id === item.id ? { ...story, title: event.target.value } : story))} placeholder="Título" className="bg-card" />
                      <Input type="date" value={item.event_date || ''} onChange={(event) => setStoryItems((current) => current.map((story) => story.id === item.id ? { ...story, event_date: event.target.value } : story))} className="bg-card" />
                    </div>
                    <textarea value={item.body || ''} onChange={(event) => setStoryItems((current) => current.map((story) => story.id === item.id ? { ...story, body: event.target.value } : story))} placeholder="Conte esse momento" className="mt-3 min-h-24 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium outline-none" />
                    <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                      <select value={item.icon} onChange={(event) => setStoryItems((current) => current.map((story) => story.id === item.id ? { ...story, icon: event.target.value } : story))} className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground outline-none">
                        <option value="heart">Coração</option>
                        <option value="calendar">Data</option>
                        <option value="camera">Foto</option>
                        <option value="message">Mensagem</option>
                        <option value="gift">Presente</option>
                      </select>
                      <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card text-xs font-black uppercase text-muted-foreground hover:bg-accent">
                        <Upload size={15} /> Foto do capítulo
                        <input type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload(event.target.files, 'gallery', (url) => setStoryItems((current) => current.map((story) => story.id === item.id ? { ...story, image_url: url } : story)))} />
                      </label>
                    </div>
                    {item.image_url && <img src={item.image_url} alt="" className="mt-3 h-36 w-full rounded-xl object-cover" />}
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={() => setStoryItems((current) => [...current, newStoryItem(current.length)])} className="h-11 rounded-xl">
                <Plus size={16} /> Adicionar capítulo
              </Button>
            </EditorPanel>
          )}

          {activeStep === 'events' && (
            <EditorPanel icon={MapPin} title="Cerimônia e festa" description="Configure locais diferentes, data, horário e busca do Google Maps.">
              <Toggle
                label="Cerimônia e festa no mesmo local"
                checked={form.party_same_as_ceremony}
                onChange={(checked) => {
                  setForm((current) => ({ ...current, party_same_as_ceremony: checked }));
                  if (!checked && !events.some((event) => event.event_type === 'party')) {
                    setEvents((current) => [...current, newEvent('party', current.length)]);
                  }
                }}
              />
              <div className="space-y-4">
                {eventsForEditor.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-border bg-secondary/20 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Tipo">
                        <Segmented
                          value={event.event_type}
                          options={[
                            { value: 'ceremony', label: 'Cerimônia' },
                            { value: 'party', label: 'Festa' },
                          ]}
                          onChange={(value) => setEvents((current) => current.map((item) => item.id === event.id ? { ...item, event_type: value as SiteEvent['event_type'] } : item))}
                        />
                      </Field>
                      <Field label="Nome do local">
                        <Input value={event.title} onChange={(input) => setEvents((current) => current.map((item) => item.id === event.id ? { ...item, title: input.target.value } : item))} className="bg-card" />
                      </Field>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field label="Data">
                        <Input type="date" value={event.event_date || ''} onChange={(input) => setEvents((current) => current.map((item) => item.id === event.id ? { ...item, event_date: input.target.value } : item))} className="bg-card" />
                      </Field>
                      <Field label="Horário">
                        <Input type="time" value={event.event_time || ''} onChange={(input) => setEvents((current) => current.map((item) => item.id === event.id ? { ...item, event_time: input.target.value } : item))} className="bg-card" />
                      </Field>
                    </div>
                    <div className="mt-3 grid gap-3">
                      <Input value={event.address || ''} onChange={(input) => setEvents((current) => current.map((item) => item.id === event.id ? { ...item, address: input.target.value } : item))} placeholder="Endereço completo" className="bg-card" />
                      <Input value={event.maps_query || ''} onChange={(input) => setEvents((current) => current.map((item) => item.id === event.id ? { ...item, maps_query: input.target.value } : item))} placeholder="Busca do Google Maps, se diferente do endereço" className="bg-card" />
                    </div>
                  </div>
                ))}
              </div>
            </EditorPanel>
          )}

          {activeStep === 'gifts' && (
            <EditorPanel icon={Gift} title="Lista de presentes" description="Controle os presentes exibidos como marketplace na página pública.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Mensagem da lista">
                  <textarea value={form.gift_intro} onChange={(event) => setForm((current) => ({ ...current, gift_intro: event.target.value }))} className="min-h-24 w-full rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm font-medium outline-none" />
                </Field>
                <Field label="Destinatário">
                  <Input value={form.gift_delivery_name} onChange={(event) => setForm((current) => ({ ...current, gift_delivery_name: event.target.value }))} className="bg-secondary/30" />
                </Field>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={form.gift_delivery_address} onChange={(event) => setForm((current) => ({ ...current, gift_delivery_address: event.target.value }))} placeholder="Endereço de entrega" className="bg-secondary/30 sm:col-span-2" />
                <Input value={form.gift_delivery_city} onChange={(event) => setForm((current) => ({ ...current, gift_delivery_city: event.target.value }))} placeholder="Cidade" className="bg-secondary/30" />
                <Input value={form.gift_delivery_state} onChange={(event) => setForm((current) => ({ ...current, gift_delivery_state: event.target.value }))} placeholder="Estado" className="bg-secondary/30" />
                <Input value={form.gift_delivery_zip} onChange={(event) => setForm((current) => ({ ...current, gift_delivery_zip: event.target.value }))} placeholder="CEP" className="bg-secondary/30" />
                <Input value={form.gift_delivery_notes} onChange={(event) => setForm((current) => ({ ...current, gift_delivery_notes: event.target.value }))} placeholder="Complemento ou instruções" className="bg-secondary/30" />
              </div>

              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="mb-3 text-xs font-black uppercase tracking-widest text-muted-foreground">Categorias</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <span key={category.id} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-black">
                      <input value={category.name} onChange={(event) => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, name: event.target.value } : item))} className="w-28 bg-transparent outline-none" />
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <Input value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="Nova categoria" className="bg-card" />
                  <Button onClick={addCategory} className="h-11 rounded-xl px-4"><Plus size={16} /> Add</Button>
                </div>
              </div>

              <div className="space-y-4">
                {gifts.map((gift) => (
                  <GiftEditor
                    key={gift.id}
                    gift={gift}
                    categories={categories}
                    onChange={(nextGift) => setGifts((current) => current.map((item) => item.id === gift.id ? nextGift : item))}
                    onRemove={() => {
                      if (!isTempId(gift.id)) setDeletedGiftIds((current) => [...current, gift.id]);
                      setGifts((current) => current.filter((item) => item.id !== gift.id));
                    }}
                  />
                ))}
              </div>
              <Button variant="outline" onClick={() => setGifts((current) => [...current, newGift(categories[0]?.id)])} className="h-11 rounded-xl">
                <Plus size={16} /> Adicionar presente
              </Button>
            </EditorPanel>
          )}

          {activeStep === 'publish' && (
            <EditorPanel icon={ShieldCheck} title="Publicação, domínio e mensagens" description="Revise o link público, solicite domínio e modere mensagens.">
              {publishIssues.length > 0 && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-sm font-black text-amber-700 dark:text-amber-300">Antes de abrir o site, falta completar:</p>
                  <ul className="mt-3 space-y-2 text-xs font-bold text-amber-700/90 dark:text-amber-300/90">
                    {publishIssues.map((issue) => (
                      <li key={issue} className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Link público</p>
                <p className="mt-2 break-all font-mono text-sm font-bold">{publicUrl}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={copyPublicUrl} className="h-10 rounded-xl px-3 text-xs">
                    {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                  <Button variant="outline" onClick={() => handleSave(true)} disabled={!canSaveAndOpen} className="h-10 rounded-xl px-3 text-xs">
                    <ExternalLink size={15} /> Abrir em nova aba
                  </Button>
                </div>
              </div>

              <div className={cn('rounded-2xl border border-border bg-secondary/20 p-4', !canRequestDomain && 'opacity-60')}>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Domínio personalizado</p>
                <div className="mt-3 flex gap-2">
                  <Input value={domain} onChange={(event) => setDomain(event.target.value)} className="h-12 rounded-2xl bg-card" placeholder="mariaejoao.com.br" />
                  <Button onClick={handleRequestDomain} disabled={saving || !site || !canRequestDomain} className="h-12 rounded-2xl px-4">
                    Solicitar
                  </Button>
                </div>
                {!canRequestDomain && <p className="mt-3 text-xs font-bold text-muted-foreground">Disponível como adicional Pro.</p>}
                <div className="mt-3 space-y-2">
                  {domainRequests.map((request) => (
                    <div key={request.id} className="rounded-xl border border-border bg-card p-3">
                      <p className="text-sm font-black">{request.requested_domain}</p>
                      <p className="mt-1 text-xs font-bold text-muted-foreground">{request.status} • {formatMoney(Number(request.setup_fee) + Number(request.annual_fee))}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Mensagens recebidas</p>
                <div className="mt-3 space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-xs font-medium text-muted-foreground">Nenhuma mensagem recebida ainda.</p>
                  ) : messages.slice(0, 5).map((message) => (
                    <div key={message.id} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black">{message.author_name}</p>
                          <p className="mt-1 line-clamp-3 text-xs font-medium text-muted-foreground">{message.message}</p>
                        </div>
                        <Badge variant={message.status === 'approved' ? 'success' : message.status === 'hidden' ? 'error' : 'warning'}>
                          {message.status}
                        </Badge>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="outline" onClick={() => updateMessageStatus(message.id, 'approved')} className="h-9 rounded-xl px-3 text-xs">Aprovar</Button>
                        <Button variant="ghost" onClick={() => updateMessageStatus(message.id, 'hidden')} className="h-9 rounded-xl px-3 text-xs">Ocultar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </EditorPanel>
          )}
        </div>

        <div className="2xl:sticky 2xl:top-6 2xl:h-[calc(100vh-3rem)]">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Pré-visualização</p>
            <Badge variant={form.status === 'published' ? 'success' : 'warning'}>{form.status === 'published' ? 'Publicado' : 'Rascunho'}</Badge>
          </div>
          <div className="h-[720px] overflow-y-auto rounded-[1.6rem] border border-border bg-secondary/30 p-2 custom-scrollbar 2xl:h-[calc(100vh-5.5rem)]">
            <WeddingSitePreview
              site={form}
              heroImages={heroImages}
              galleryImages={galleryImages}
              storyItems={storyItems.filter((item) => item.title.trim())}
              events={events.filter((event) => event.title.trim())}
              gifts={gifts.filter((gift) => gift.title.trim())}
              categories={categories}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const EditorPanel = ({ icon: Icon, title, description, children }: { icon: ElementType; title: string; description: string; children: ReactNode }) => (
  <Card className="space-y-5 p-5 sm:p-6">
    <div className="flex items-center gap-3 border-b border-border pb-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon size={20} />
      </div>
      <div>
        <h3 className="font-black uppercase tracking-tight">{title}</h3>
        <p className="text-xs font-medium text-muted-foreground">{description}</p>
      </div>
    </div>
    {children}
  </Card>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-2">
    <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</label>
    {children}
  </div>
);

const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) => (
  <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-xs font-black uppercase tracking-widest text-muted-foreground">
    <span>{label}</span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-primary" />
  </label>
);

const Segmented = ({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (value: string) => void }) => (
  <div className="grid grid-cols-2 rounded-2xl border border-border bg-secondary/30 p-1">
    {options.map((option) => (
      <button key={option.value} type="button" onClick={() => onChange(option.value)} className={cn('h-11 rounded-xl text-xs font-black uppercase tracking-widest', value === option.value && 'bg-background text-primary shadow-sm')}>
        {option.label}
      </button>
    ))}
  </div>
);

const FontSelect = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="h-12 w-full rounded-2xl border border-border bg-card px-3 text-sm font-bold text-foreground outline-none"
    style={{ fontFamily: `'${value}', sans-serif` }}
  >
    {fontOptions.map((font) => (
      <option key={font.value} value={font.value} style={{ fontFamily: `'${font.value}', sans-serif` }}>
        {font.label}
      </option>
    ))}
  </select>
);

const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => (
  <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-3">
    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</span>
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs font-bold text-muted-foreground">{value}</span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-10 rounded-lg border border-border bg-transparent p-1"
      />
    </div>
  </label>
);

const UploadBox = ({ label, description, uploading, onFiles }: { label: string; description: string; uploading: boolean; onFiles: (files: FileList | null) => void }) => (
  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/20 px-5 py-8 text-center transition hover:bg-secondary/40">
    {uploading ? <Loader2 className="mb-3 animate-spin text-primary" size={26} /> : <Upload className="mb-3 text-primary" size={26} />}
    <span className="font-black">{label}</span>
    <span className="mt-1 text-xs font-medium text-muted-foreground">{description}</span>
    <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => onFiles(event.target.files)} />
  </label>
);

const ImageGrid = ({ images, onRemove }: { images: SiteImage[]; onRemove: (id: string) => void }) => (
  <div className="grid gap-3 sm:grid-cols-3">
    {images.map((image) => (
      <div key={image.id} className="group relative overflow-hidden rounded-2xl border border-border">
        <img src={image.image_url} alt="" className="h-36 w-full object-cover" />
        <button onClick={() => onRemove(image.id)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-black/60 text-white opacity-0 transition group-hover:opacity-100">
          <Trash2 size={15} />
        </button>
      </div>
    ))}
  </div>
);

const GiftEditor = ({
  gift,
  categories,
  onChange,
  onRemove,
}: {
  gift: GiftItem;
  categories: GiftCategory[];
  onChange: (gift: GiftItem) => void;
  onRemove: () => void;
}) => (
  <div className="rounded-2xl border border-border bg-secondary/20 p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{gift.title || 'Novo presente'}</p>
      <button onClick={onRemove} className="text-destructive"><Trash2 size={16} /></button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <Input value={gift.title} onChange={(event) => onChange({ ...gift, title: event.target.value })} placeholder="Nome do presente" className="bg-card" />
      <Input value={gift.brand || ''} onChange={(event) => onChange({ ...gift, brand: event.target.value })} placeholder="Marca" className="bg-card" />
      <Input value={gift.subtitle || ''} onChange={(event) => onChange({ ...gift, subtitle: event.target.value })} placeholder="Descrição curta" className="bg-card sm:col-span-2" />
      <Input value={gift.buy_url || ''} onChange={(event) => onChange({ ...gift, buy_url: event.target.value })} placeholder="Link do produto" className="bg-card sm:col-span-2" />
      <Input value={gift.image_url || ''} onChange={(event) => onChange({ ...gift, image_url: event.target.value })} placeholder="Link da imagem do produto" className="bg-card sm:col-span-2" />
      <Input value={gift.price ?? ''} onChange={(event) => onChange({ ...gift, price: event.target.value ? Number(event.target.value.replace(',', '.')) : null })} placeholder="Preço" className="bg-card" />
      <select value={gift.category || ''} onChange={(event) => onChange({ ...gift, category: event.target.value || null })} className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-bold text-foreground outline-none">
        <option value="">Sem categoria</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>
      <Toggle label="Destaque" checked={gift.is_featured} onChange={(checked) => onChange({ ...gift, is_featured: checked })} />
    </div>
    {gift.image_url && <img src={gift.image_url} alt="" className="mt-3 h-36 w-full rounded-xl object-cover" />}
  </div>
);
