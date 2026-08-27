import { useEffect, useState, type ElementType, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Gift, Heart, Loader2, Mail, MessageSquareHeart, Phone, Send, User } from 'lucide-react';
import { Button, Input } from '../ui';
import { supabase } from '../../lib/supabase';
import heroImage from '../../assets/hero.png';

type PublicSite = {
  id: string;
  wedding_id: string;
  slug: string;
  title: string | null;
  welcome_message: string | null;
  cover_image_url: string | null;
  rsvp_enabled: boolean;
  gift_list_enabled: boolean;
  messages_enabled: boolean;
};

type GiftItem = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  price: number | null;
  buy_url: string | null;
  is_bought: boolean;
};

type GuestMessage = {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
};

const formatMoney = (value?: number | null) => {
  if (!value) return null;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const WeddingSitePublic = () => {
  const { slug } = useParams();
  const [site, setSite] = useState<PublicSite | null>(null);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [rsvpSent, setRsvpSent] = useState(false);
  const [messageSent, setMessageSent] = useState(false);
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
        .select('id, wedding_id, slug, title, welcome_message, cover_image_url, rsvp_enabled, gift_list_enabled, messages_enabled')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (siteError) throw siteError;
      setSite(siteData as PublicSite | null);

      if (!siteData) return;

      const [giftsResult, messagesResult] = await Promise.all([
        siteData.gift_list_enabled
          ? supabase
              .from('lista_presentes')
              .select('id, title, subtitle, image_url, price, buy_url, is_bought')
              .eq('wedding_id', siteData.wedding_id)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        siteData.messages_enabled
          ? supabase
              .from('guest_messages')
              .select('id, author_name, message, created_at')
              .eq('wedding_id', siteData.wedding_id)
              .eq('status', 'approved')
              .order('created_at', { ascending: false })
              .limit(12)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (giftsResult.error) throw giftsResult.error;
      if (messagesResult.error) throw messagesResult.error;

      setGifts((giftsResult.data || []) as GiftItem[]);
      setMessages((messagesResult.data || []) as GuestMessage[]);
    } catch (error) {
      console.error('[WeddingSitePublic] Erro ao carregar site:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitRsvp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!site) return;

    const { error } = await supabase.from('confirmacoes').insert({
      wedding_id: site.wedding_id,
      full_name: rsvpForm.full_name,
      phone: rsvpForm.phone || null,
      email: rsvpForm.email || null,
      is_attending: rsvpForm.is_attending,
    });

    if (!error) {
      setRsvpSent(true);
      setRsvpForm({ full_name: '', phone: '', email: '', is_attending: true });
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf8]">
        <Loader2 className="animate-spin text-primary" size={36} />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf8] px-4 text-center">
        <div>
          <Heart className="mx-auto mb-4 text-primary" size={40} />
          <h1 className="text-3xl font-bold text-slate-950 [font-family:'Cormorant_Garamond',serif]">Site não encontrado</h1>
          <p className="mt-2 text-sm font-medium text-slate-600">Confira o endereço enviado pelo casal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-slate-950 [font-family:'Manrope',sans-serif]">
      <section className="relative min-h-[92vh] overflow-hidden">
        <img
          src={site.cover_image_url || heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-[#fbfaf8]" />

        <div className="relative mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-end px-4 pb-14 pt-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl text-white">
            <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/15 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] backdrop-blur">
              <CalendarDays size={14} />
              Nosso casamento
            </div>
            <h1 className="text-6xl font-bold leading-[0.9] [font-family:'Cormorant_Garamond',serif] sm:text-8xl">
              {site.title || 'Nosso grande dia'}
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-white/90">
              {site.welcome_message || 'Estamos muito felizes em compartilhar esse momento com você.'}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {site.rsvp_enabled && (
                <a href="#rsvp" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-black text-white shadow-xl shadow-black/20">
                  Confirmar presença <Send size={16} />
                </a>
              )}
              {site.gift_list_enabled && (
                <a href="#presentes" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/15 px-5 text-sm font-black text-white backdrop-blur">
                  Ver presentes <Gift size={16} />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:px-6 lg:px-8">
        {site.rsvp_enabled && (
          <section id="rsvp" className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">RSVP</p>
              <h2 className="mt-2 text-5xl font-bold leading-none [font-family:'Cormorant_Garamond',serif]">Confirme sua presença</h2>
              <p className="mt-4 text-sm font-medium leading-6 text-slate-600">Sua resposta ajuda o casal a organizar cada detalhe com carinho.</p>
            </div>

            <form onSubmit={submitRsvp} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              {rsvpSent ? (
                <div className="flex min-h-48 flex-col items-center justify-center text-center">
                  <CheckCircle2 className="mb-3 text-emerald-600" size={38} />
                  <p className="text-lg font-black">Resposta recebida</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">Obrigado por confirmar.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  <InputBlock icon={User}>
                    <Input required value={rsvpForm.full_name} onChange={(event) => setRsvpForm((current) => ({ ...current, full_name: event.target.value }))} placeholder="Seu nome completo" className="h-12 border-slate-200 bg-slate-50 pl-11" />
                  </InputBlock>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputBlock icon={Phone}>
                      <Input value={rsvpForm.phone} onChange={(event) => setRsvpForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Telefone" className="h-12 border-slate-200 bg-slate-50 pl-11" />
                    </InputBlock>
                    <InputBlock icon={Mail}>
                      <Input type="email" value={rsvpForm.email} onChange={(event) => setRsvpForm((current) => ({ ...current, email: event.target.value }))} placeholder="E-mail" className="h-12 border-slate-200 bg-slate-50 pl-11" />
                    </InputBlock>
                  </div>
                  <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
                    <button type="button" onClick={() => setRsvpForm((current) => ({ ...current, is_attending: true }))} className={`h-11 rounded-md text-xs font-black uppercase ${rsvpForm.is_attending ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>
                      Vou
                    </button>
                    <button type="button" onClick={() => setRsvpForm((current) => ({ ...current, is_attending: false }))} className={`h-11 rounded-md text-xs font-black uppercase ${!rsvpForm.is_attending ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>
                      Não vou
                    </button>
                  </div>
                  <Button type="submit" className="h-12 rounded-lg">
                    Enviar confirmação <Send size={16} />
                  </Button>
                </div>
              )}
            </form>
          </section>
        )}

        {site.gift_list_enabled && (
          <section id="presentes">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Lista de presentes</p>
                <h2 className="mt-2 text-5xl font-bold leading-none [font-family:'Cormorant_Garamond',serif]">Escolha um presente</h2>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gifts.length === 0 ? (
                <p className="text-sm font-medium text-slate-600">A lista de presentes ainda está sendo preparada.</p>
              ) : gifts.map((gift) => (
                <article key={gift.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  {gift.image_url && <img src={gift.image_url} alt="" className="h-44 w-full object-cover" />}
                  <div className="p-5">
                    <p className="text-lg font-black">{gift.title}</p>
                    {gift.subtitle && <p className="mt-1 text-sm font-medium text-slate-600">{gift.subtitle}</p>}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="text-sm font-black text-primary">{formatMoney(gift.price) || 'Valor livre'}</span>
                      {gift.buy_url && !gift.is_bought && (
                        <a href={gift.buy_url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-black uppercase text-white">
                          Presentear
                        </a>
                      )}
                      {gift.is_bought && <span className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black uppercase text-emerald-700">Reservado</span>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {site.messages_enabled && (
          <section className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Mensagens</p>
              <h2 className="mt-2 text-5xl font-bold leading-none [font-family:'Cormorant_Garamond',serif]">Deixe seu carinho</h2>
              <div className="mt-6 grid gap-3">
                {messages.length === 0 ? (
                  <p className="text-sm font-medium text-slate-600">As mensagens aprovadas aparecerão aqui.</p>
                ) : messages.map((message) => (
                  <div key={message.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-black">{message.author_name}</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{message.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={submitMessage} className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              {messageSent ? (
                <div className="flex min-h-48 flex-col items-center justify-center text-center">
                  <MessageSquareHeart className="mb-3 text-primary" size={38} />
                  <p className="text-lg font-black">Mensagem enviada</p>
                  <p className="mt-1 text-sm font-medium text-slate-600">Ela aparecerá após aprovação do casal.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  <Input required value={messageForm.author_name} onChange={(event) => setMessageForm((current) => ({ ...current, author_name: event.target.value }))} placeholder="Seu nome" className="h-12 border-slate-200 bg-slate-50" />
                  <Input type="email" value={messageForm.author_email} onChange={(event) => setMessageForm((current) => ({ ...current, author_email: event.target.value }))} placeholder="Seu e-mail" className="h-12 border-slate-200 bg-slate-50" />
                  <textarea
                    required
                    value={messageForm.message}
                    onChange={(event) => setMessageForm((current) => ({ ...current, message: event.target.value }))}
                    placeholder="Escreva sua mensagem"
                    className="min-h-32 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  />
                  <Button type="submit" className="h-12 rounded-lg">
                    Enviar mensagem <Send size={16} />
                  </Button>
                </div>
              )}
            </form>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 px-4 py-8 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        Criado com WedPlan
      </footer>
    </div>
  );
};

const InputBlock = ({ icon: Icon, children }: { icon: ElementType; children: ReactNode }) => (
  <div className="relative">
    <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
    {children}
  </div>
);
