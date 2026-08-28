import { useEffect, useMemo, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Gift, Heart, Loader2, Mail, MessageSquareHeart, Phone, Send, User } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button, Input } from '../ui';
import { supabase } from '../../lib/supabase';
import { maskPhone } from '../../utils/masks';
import { WeddingSitePreview } from './WeddingSitePreview';
import type { GiftCategory, GiftItem, SiteEvent, SiteImage, StoryItem, WeddingSite } from './weddingSiteTypes';

export const WeddingSitePublic = () => {
  const { slug } = useParams();
  const [site, setSite] = useState<WeddingSite | null>(null);
  const [heroImages, setHeroImages] = useState<SiteImage[]>([]);
  const [galleryImages, setGalleryImages] = useState<SiteImage[]>([]);
  const [storyItems, setStoryItems] = useState<StoryItem[]>([]);
  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [categories, setCategories] = useState<GiftCategory[]>([]);
  const [messages, setMessages] = useState<{ id: string; author_name: string; message: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpSent, setRsvpSent] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
  const [submittingRsvp, setSubmittingRsvp] = useState(false);
  const [rsvpForm, setRsvpForm] = useState({ full_name: '', phone: '', email: '', is_attending: true });
  const [messageForm, setMessageForm] = useState({ author_name: '', author_email: '', message: '' });

  useEffect(() => {
    loadSite();
  }, [slug]);

  const loadSite = async () => {
    if (!slug) return;
    setLoading(true);

    try {
      const { data: siteData, error: siteError } = await supabase
        .from('wedding_sites')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (siteError) throw siteError;
      if (!siteData) {
        setSite(null);
        return;
      }

      const currentSite = siteData as WeddingSite;
      setSite(currentSite);

      const [imagesResult, storyResult, eventsResult, giftsResult, categoriesResult, messagesResult] = await Promise.all([
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
        currentSite.gift_list_enabled
          ? supabase
              .from('lista_presentes')
              .select('id, title, subtitle, image_url, price, buy_url, wedding_id, brand, is_featured, is_bought, bought_by, category, created_at')
              .eq('wedding_id', currentSite.wedding_id)
              .order('is_bought', { ascending: true })
              .order('is_featured', { ascending: false })
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        currentSite.gift_list_enabled
          ? supabase
              .from('categorias_presentes')
              .select('id, wedding_id, name, active')
              .eq('wedding_id', currentSite.wedding_id)
              .eq('active', true)
              .order('name', { ascending: true })
          : Promise.resolve({ data: [], error: null }),
        currentSite.messages_enabled
          ? supabase
              .from('guest_messages')
              .select('id, author_name, message')
              .eq('wedding_id', currentSite.wedding_id)
              .eq('status', 'approved')
              .order('created_at', { ascending: false })
              .limit(12)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (imagesResult.error) throw imagesResult.error;
      if (storyResult.error) throw storyResult.error;
      if (eventsResult.error) throw eventsResult.error;
      if (giftsResult.error) throw giftsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      if (messagesResult.error) throw messagesResult.error;

      const images = (imagesResult.data || []) as SiteImage[];
      setHeroImages(images.filter((image) => image.image_role === 'hero'));
      setGalleryImages(images.filter((image) => image.image_role === 'gallery'));
      setStoryItems((storyResult.data || []) as StoryItem[]);
      setEvents((eventsResult.data || []) as SiteEvent[]);
      setGifts((giftsResult.data || []) as GiftItem[]);
      setCategories((categoriesResult.data || []) as GiftCategory[]);
      setMessages((messagesResult.data || []) as { id: string; author_name: string; message: string }[]);
    } catch (error) {
      console.error('[WeddingSitePublic] Erro ao carregar site:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitRsvp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!site || !slug) return;
    setSubmittingRsvp(true);

    const { error } = await supabase.rpc('submit_wedding_site_rsvp', {
      p_slug: slug,
      p_full_name: rsvpForm.full_name,
      p_phone: rsvpForm.phone || null,
      p_email: rsvpForm.email || null,
      p_is_attending: rsvpForm.is_attending,
      p_children: [],
    });

    setSubmittingRsvp(false);

    if (!error) {
      setRsvpSent(true);
      setRsvpForm({ full_name: '', phone: '', email: '', is_attending: true });
      if (rsvpForm.is_attending) {
        confetti({ particleCount: 120, spread: 70, origin: { y: 0.65 }, colors: ['#2f3829', '#c7a76b', '#fbfaf7'] });
      }
    }
  };

  const submitMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!site) return;

    const { error } = await supabase.from('guest_messages').insert({
      wedding_id: site.wedding_id,
      author_name: messageForm.author_name,
      author_email: messageForm.author_email || null,
      message: messageForm.message,
      status: 'pending',
    });

    if (!error) {
      setMessageSent(true);
      setMessageForm({ author_name: '', author_email: '', message: '' });
    }
  };

  const hasPublicContent = useMemo(() => {
    return storyItems.length > 0 || galleryImages.length > 0 || events.length > 0 || gifts.length > 0;
  }, [storyItems.length, galleryImages.length, events.length, gifts.length]);
  const themeStyle = site ? {
    '--wedsite-font-primary': `'${site.font_primary || 'Playfair Display'}', serif`,
    '--wedsite-font-secondary': `'${site.font_secondary || 'Manrope'}', sans-serif`,
    '--wedsite-color-primary': site.color_primary || '#8b6f43',
    '--wedsite-color-secondary': site.color_secondary || '#2f3829',
    '--wedsite-bg-primary': site.background_primary || '#fbfaf7',
    '--wedsite-bg-secondary': site.background_secondary || '#ffffff',
  } as CSSProperties : undefined;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7]">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-4 text-center">
        <div>
          <Heart className="mx-auto mb-4 text-primary" size={40} />
          <h1 className="text-3xl font-bold text-slate-950 [font-family:'Outfit',sans-serif]">Site não encontrado</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">Confira o endereço enviado pelo casal.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={themeStyle} className="bg-[var(--wedsite-bg-primary)] [font-family:var(--wedsite-font-secondary)]">
      <WeddingSitePreview
        site={site}
        heroImages={heroImages}
        galleryImages={galleryImages}
        storyItems={storyItems}
        events={events}
        gifts={gifts}
        categories={categories}
        showRsvpPreview={false}
        giftHref={`/casamento/${site.slug}/presentes`}
      />

      {!hasPublicContent && (
        <div className="mx-auto max-w-4xl px-5 py-12 text-center text-sm font-medium text-[#69645d]">
          O casal ainda está preparando os detalhes dessa página.
        </div>
      )}

      {site.rsvp_enabled && (
        <section id="rsvp-form" className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
          <div className="grid gap-8 rounded-[1.5rem] border border-black/10 bg-[var(--wedsite-bg-secondary)] p-6 shadow-sm lg:grid-cols-[0.8fr_1.2fr] lg:p-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--wedsite-color-primary)]">RSVP</p>
              <h2 className="mt-2 text-4xl font-black leading-none text-[#202018] [font-family:var(--wedsite-font-primary)]">Confirmação de presença</h2>
              <p className="mt-4 text-sm font-medium leading-6 text-[#69645d]">Sua resposta atualiza a lista do casal automaticamente quando o nome estiver cadastrado.</p>
            </div>
            <form onSubmit={submitRsvp}>
              {rsvpSent ? (
                <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl bg-[#eef5ed] text-center">
                  <CheckCircle2 className="mb-3 text-emerald-700" size={40} />
                  <p className="text-lg font-black text-[#202018]">Resposta recebida</p>
                  <button type="button" onClick={() => setRsvpSent(false)} className="mt-4 text-sm font-black text-[var(--wedsite-color-primary)]">
                    Confirmar outra pessoa
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  <InputBlock icon={User}>
                    <Input required value={rsvpForm.full_name} onChange={(event) => setRsvpForm((current) => ({ ...current, full_name: event.target.value }))} placeholder="Seu nome completo" className="h-12 border-[#ded8cf] bg-[#fbfaf7] pl-11" />
                  </InputBlock>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputBlock icon={Phone}>
                      <Input value={rsvpForm.phone} onChange={(event) => setRsvpForm((current) => ({ ...current, phone: maskPhone(event.target.value) }))} placeholder="Telefone" className="h-12 border-[#ded8cf] bg-[#fbfaf7] pl-11" />
                    </InputBlock>
                    <InputBlock icon={Mail}>
                      <Input type="email" value={rsvpForm.email} onChange={(event) => setRsvpForm((current) => ({ ...current, email: event.target.value }))} placeholder="E-mail" className="h-12 border-[#ded8cf] bg-[#fbfaf7] pl-11" />
                    </InputBlock>
                  </div>
                  <div className="grid grid-cols-2 rounded-xl border border-[#ded8cf] bg-[#fbfaf7] p-1">
                    <button type="button" onClick={() => setRsvpForm((current) => ({ ...current, is_attending: true }))} className={`h-11 rounded-lg text-xs font-black uppercase ${rsvpForm.is_attending ? 'bg-white text-[var(--wedsite-color-primary)] shadow-sm' : 'text-[#69645d]'}`}>
                      Vou
                    </button>
                    <button type="button" onClick={() => setRsvpForm((current) => ({ ...current, is_attending: false }))} className={`h-11 rounded-lg text-xs font-black uppercase ${!rsvpForm.is_attending ? 'bg-white text-[var(--wedsite-color-primary)] shadow-sm' : 'text-[#69645d]'}`}>
                      Não vou
                    </button>
                  </div>
                  <Button type="submit" disabled={submittingRsvp || rsvpForm.full_name.trim().length < 4} className="h-12 rounded-xl bg-[var(--wedsite-color-secondary)]">
                    {submittingRsvp ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                    Enviar confirmação
                  </Button>
                </div>
              )}
            </form>
          </div>
        </section>
      )}

      {site.gift_list_enabled && (
        <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8">
          <div className="rounded-[1.5rem] bg-[var(--wedsite-color-secondary)] p-7 text-white sm:p-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">Lista de presentes</p>
                <h2 className="mt-2 text-4xl font-black leading-none [font-family:var(--wedsite-font-primary)]">Escolha com carinho</h2>
              </div>
              <Link to={`/casamento/${site.slug}/presentes`} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-black text-[#202018]">
                Ver lista completa <Gift size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {site.messages_enabled && (
        <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-20 sm:px-8 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--wedsite-color-primary)]">Mensagens</p>
            <h2 className="mt-2 text-4xl font-black leading-none text-[#202018] [font-family:var(--wedsite-font-primary)]">Deixe seu carinho</h2>
            <div className="mt-6 grid gap-3">
              {messages.length === 0 ? (
                <p className="text-sm font-medium text-[#69645d]">As mensagens aprovadas aparecerão aqui.</p>
              ) : messages.map((message) => (
                <div key={message.id} className="rounded-2xl border border-[#ded8cf] bg-white p-4 shadow-sm">
                  <p className="text-sm font-black text-[#202018]">{message.author_name}</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-[#69645d]">{message.message}</p>
                </div>
              ))}
            </div>
          </div>
          <form onSubmit={submitMessage} className="h-fit rounded-2xl border border-[#ded8cf] bg-white p-5 shadow-sm">
            {messageSent ? (
              <div className="flex min-h-48 flex-col items-center justify-center text-center">
                <MessageSquareHeart className="mb-3 text-[var(--wedsite-color-primary)]" size={38} />
                <p className="text-lg font-black text-[#202018]">Mensagem enviada</p>
                <p className="mt-1 text-sm font-medium text-[#69645d]">Ela aparecerá após aprovação do casal.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                <Input required value={messageForm.author_name} onChange={(event) => setMessageForm((current) => ({ ...current, author_name: event.target.value }))} placeholder="Seu nome" className="h-12 border-[#ded8cf] bg-[#fbfaf7]" />
                <Input type="email" value={messageForm.author_email} onChange={(event) => setMessageForm((current) => ({ ...current, author_email: event.target.value }))} placeholder="Seu e-mail" className="h-12 border-[#ded8cf] bg-[#fbfaf7]" />
                <textarea
                  required
                  value={messageForm.message}
                  onChange={(event) => setMessageForm((current) => ({ ...current, message: event.target.value }))}
                  placeholder="Escreva sua mensagem"
                  className="min-h-32 rounded-xl border border-[#ded8cf] bg-[#fbfaf7] px-4 py-3 text-sm font-medium outline-none transition focus:border-[#9b865f] focus:ring-4 focus:ring-[#9b865f]/10"
                />
                <Button type="submit" className="h-12 rounded-xl bg-[var(--wedsite-color-secondary)]">
                  Enviar mensagem <Send size={16} />
                </Button>
              </div>
            )}
          </form>
        </section>
      )}
    </div>
  );
};

const InputBlock = ({ icon: Icon, children }: { icon: ElementType; children: ReactNode }) => (
  <div className="relative">
    <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9b958c]" size={17} />
    {children}
  </div>
);
