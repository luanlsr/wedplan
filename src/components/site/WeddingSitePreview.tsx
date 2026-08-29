import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { CalendarDays, Camera, Gift, Heart, MapPin, MessageSquareHeart, Navigation, Send } from 'lucide-react';
import heroImage from '../../assets/hero.png';
import { cn } from '../../lib/utils';
import {
  formatMoney,
  formatPublicDate,
  getWeddingSiteTemplate,
  googleMapsEmbedUrl,
  googleMapsUrl,
  mapsQuery,
  type GiftCategory,
  type GiftItem,
  type SiteEvent,
  type SiteImage,
  type StoryItem,
  type WeddingSite,
} from './weddingSiteTypes';

type PreviewProps = {
  site: Partial<WeddingSite>;
  heroImages: SiteImage[];
  galleryImages: SiteImage[];
  storyItems: StoryItem[];
  events: SiteEvent[];
  gifts?: GiftItem[];
  categories?: GiftCategory[];
  compact?: boolean;
  showRsvpPreview?: boolean;
  giftHref?: string;
};

const storyIcons: Record<string, typeof Heart> = {
  heart: Heart,
  calendar: CalendarDays,
  camera: Camera,
  message: MessageSquareHeart,
  gift: Gift,
};

export const WeddingSitePreview = ({
  site,
  heroImages,
  galleryImages,
  storyItems,
  events,
  gifts = [],
  categories = [],
  compact = false,
  showRsvpPreview = true,
  giftHref = '#presentes',
}: PreviewProps) => {
  const orderedHeroImages = heroImages.length > 0 ? heroImages : [{
    id: 'fallback',
    image_url: site.cover_image_url || heroImage,
    image_role: 'hero' as const,
    sort_order: 0,
  }];
  const coupleTitle = site.title || 'Nosso grande dia';
  const featuredGifts = gifts.slice(0, compact ? 3 : 6);
  const categoryById = new Map(categories.map((category) => [category.id, category.name]));
  const template = getWeddingSiteTemplate(site.template_id);
  const visibleEvents = site.party_same_as_ceremony
    ? events.filter((event) => event.event_type === 'ceremony').slice(0, 1)
    : events;
  const eventWithDate = visibleEvents.find((event) => event.event_date) || events.find((event) => event.event_date);
  const dateLabel = eventWithDate?.event_date;
  const dateParts = dateLabel ? (() => {
    const parsed = new Date(`${dateLabel}T12:00:00`);
    return {
      month: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(parsed).replace('.', '').toUpperCase(),
      day: new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(parsed),
      year: new Intl.DateTimeFormat('pt-BR', { year: 'numeric' }).format(parsed),
      weekday: new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(parsed).toUpperCase(),
    };
  })() : null;
  const eventTime = eventWithDate?.event_time?.slice(0, 5);
  const initials = coupleTitle
    .split(/&| e /i)
    .map((name) => name.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join(' & ') || 'W';
  const themeStyle = {
    '--wedsite-font-primary': `'${site.font_primary || 'Playfair Display'}', serif`,
    '--wedsite-font-secondary': `'${site.font_secondary || 'Manrope'}', sans-serif`,
    '--wedsite-color-primary': site.color_primary || '#8b6f43',
    '--wedsite-color-secondary': site.color_secondary || '#2f3829',
    '--wedsite-bg-primary': site.background_primary || '#fbfaf7',
    '--wedsite-bg-secondary': site.background_secondary || '#ffffff',
    '--wedsite-text': template.textColor,
    '--wedsite-muted': template.mutedColor,
    '--wedsite-border': template.borderColor,
    '--wedsite-hero-overlay': template.heroOverlay,
  } as CSSProperties;
  const heroToneClass = template.heroTone === 'dark' ? 'text-[var(--wedsite-text)]' : 'text-white';
  const heroCopyClass = cn(
    'wedsite-hero-copy mx-auto max-w-3xl text-center',
    heroToneClass,
    template.heroTone === 'boxed' && 'rounded-[2rem] border border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-secondary)]/90 p-7 text-[var(--wedsite-text)] shadow-2xl backdrop-blur sm:p-10',
    template.id === 'modern-minimal' && 'max-w-2xl',
    template.id === 'classic-invitation' && 'max-w-4xl',
    template.id === 'black-tie' && 'border border-[color:var(--wedsite-color-primary)]/40 bg-black/18 px-6 py-8 backdrop-blur'
  );
  const cardClass = cn(
    'overflow-hidden border border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-secondary)] shadow-sm',
    template.sectionStyle === 'clean' ? 'rounded-xl' : 'rounded-2xl',
    template.sectionStyle === 'organic' && 'rounded-[1.8rem]',
    template.sectionStyle === 'luxury' && 'shadow-2xl shadow-black/20'
  );

  return (
    <div style={themeStyle} className={cn('wedsite-preview min-h-full overflow-hidden rounded-[1.5rem] bg-[var(--wedsite-bg-primary)] text-[var(--wedsite-text)] shadow-2xl shadow-black/10 [font-family:var(--wedsite-font-secondary)]', `wedsite-template-${template.id}`)}>
      <section className={cn('wedsite-site-hero', compact ? 'relative min-h-[520px] overflow-hidden' : 'relative min-h-screen overflow-hidden')}>
        {!compact && (
          <header className="wedsite-portal-nav">
            <div className="wedsite-portal-nav-inner">
              <a href="#topo" className="wedsite-portal-logo">
                {initials}
              </a>
              <nav className="wedsite-portal-links">
                {storyItems.length > 0 && <a href="#historia">História</a>}
                {visibleEvents.length > 0 && <a href="#cerimonia">Cerimônia</a>}
                {site.rsvp_enabled !== false && <a href="#rsvp-form">Participar</a>}
                {site.gift_list_enabled !== false && <a href={giftHref}>Presentes</a>}
              </nav>
            </div>
          </header>
        )}

        <div id="topo" className="absolute inset-0 bg-black">
          <motion.div
            className="wedsite-hero-mosaic-track"
            animate={orderedHeroImages.length > 1 && !compact ? { x: ['0%', '-50%'] } : undefined}
            transition={orderedHeroImages.length > 1 && !compact ? { duration: 220, repeat: Infinity, ease: 'linear' } : undefined}
          >
            {[...orderedHeroImages, ...orderedHeroImages].map((image, index) => (
              <img key={`${image.id}-${index}`} src={image.image_url} alt="" className="wedsite-hero-mosaic-img" />
            ))}
          </motion.div>
        </div>
        <div className="absolute inset-0 bg-[image:var(--wedsite-hero-overlay)]" />

        {orderedHeroImages.length > 1 && (
          <div className="absolute right-4 top-24 z-10 hidden w-28 gap-2 sm:grid">
            {orderedHeroImages.slice(0, 3).map((image) => (
              <img key={image.id} src={image.image_url} alt="" className="h-16 rounded-xl border border-white/30 object-cover shadow-lg" />
            ))}
          </div>
        )}

        <div className={cn('relative z-10 mx-auto flex max-w-6xl flex-col items-center justify-center px-5 py-20 sm:px-8', compact ? 'min-h-[520px]' : 'min-h-screen')}>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55 }}
            className={heroCopyClass}
          >
            <p className="wedsite-hero-sup mb-5 inline-flex text-[10px] font-black uppercase tracking-[0.42em] text-[var(--wedsite-color-primary)]">
              {site.subtitle || 'Save the date'}
            </p>
            <h1 className={`${compact ? 'text-6xl sm:text-8xl' : 'text-7xl sm:text-9xl'} font-normal leading-[0.82] tracking-normal [font-family:var(--wedsite-font-primary)]`}>
              {coupleTitle}
            </h1>
            {dateParts && (
              <div className="wedsite-date-portal">
                <div className="wedsite-date-top">
                  <span>{dateParts.month}</span>
                  <span className="wedsite-date-sep">|</span>
                  <span className="wedsite-date-day">{dateParts.day}</span>
                  <span className="wedsite-date-sep">|</span>
                  <span>{dateParts.year}</span>
                </div>
                <p className="wedsite-date-sub">
                  {dateParts.weekday}{eventTime ? ` AS ${eventTime}H` : ''}
                </p>
              </div>
            )}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {site.rsvp_enabled !== false && (
                <a href="#rsvp-form" className="wedsite-inv-cta">
                  Responder convite <Send size={16} />
                </a>
              )}
              {site.gift_list_enabled !== false && (
                <a href={giftHref} className="wedsite-inv-cta wedsite-inv-cta-outline">
                  Lista de presentes <Gift size={16} />
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <main className={cn('wedsite-site-main mx-auto max-w-6xl bg-[var(--wedsite-bg-primary)] sm:px-8', compact ? 'space-y-12 px-5 py-10' : 'space-y-20 px-5 py-16')}>
        {(site.welcome_message || dateLabel) && (
          <section className="wedsite-quote-section">
            <div className="wedsite-quote-mark" />
            <p>
              {site.welcome_message || 'Queremos te convidar para celebrar esse dia tão especial ao nosso lado.'}
            </p>
          </section>
        )}

        {storyItems.length > 0 && (
          <section id="historia" className="wedsite-section-block">
            <SectionIntro eyebrow="Nossa história" title="Alguns capítulos até aqui" />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {storyItems.map((item, index) => {
                const Icon = storyIcons[item.icon] || Heart;
                return (
                  <motion.article
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.25 }}
                    transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.2) }}
                    className={cardClass}
                  >
                    {item.image_url && <img src={item.image_url} alt="" className="h-44 w-full object-cover" />}
                    <div className="p-5">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--wedsite-color-primary)]/10 text-[var(--wedsite-color-primary)]">
                        <Icon size={20} />
                      </div>
                      {item.event_date && <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--wedsite-color-primary)]">{formatPublicDate(item.event_date)}</p>}
                      <h3 className="text-xl font-black [font-family:var(--wedsite-font-primary)]">{item.title}</h3>
                      {item.body && <p className="mt-3 text-sm font-medium leading-6 text-[var(--wedsite-muted)]">{item.body}</p>}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </section>
        )}

        {galleryImages.length > 0 && (
          <section className="wedsite-section-block">
            <SectionIntro eyebrow="Galeria" title="Momentos que contam por imagem" />
            <div className="mt-8 grid auto-rows-[180px] grid-cols-2 gap-3 md:grid-cols-4">
              {galleryImages.slice(0, compact ? 6 : 10).map((image, index) => (
                <motion.img
                  key={image.id}
                  src={image.image_url}
                  alt=""
                  initial={{ opacity: 0, scale: 0.96 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35 }}
                  className={`${index === 0 || index === 5 ? 'md:col-span-2 md:row-span-2' : ''} h-full w-full rounded-2xl object-cover`}
                />
              ))}
            </div>
          </section>
        )}

        {visibleEvents.length > 0 && (
          <section id="cerimonia" className="wedsite-section-block">
            <SectionIntro eyebrow="Quando e onde" title="Cerimônia e festa" />
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {visibleEvents.map((event) => {
                const query = mapsQuery(event);
                return (
                  <article key={event.id} className={cardClass}>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--wedsite-color-primary)]">
                            {site.party_same_as_ceremony ? 'Cerimônia e festa' : event.event_type === 'ceremony' ? 'Cerimônia' : 'Festa'}
                          </p>
                          <h3 className="mt-1 text-2xl font-black [font-family:var(--wedsite-font-primary)]">{event.title}</h3>
                        </div>
                        <MapPin className="text-[var(--wedsite-color-primary)]" size={22} />
                      </div>
                      <p className="mt-4 text-sm font-medium leading-6 text-[var(--wedsite-muted)]">
                        {[formatPublicDate(event.event_date), event.event_time?.slice(0, 5)].filter(Boolean).join(' as ')}
                        {event.address ? <><br />{event.address}</> : null}
                      </p>
                    </div>
                    {query && (
                      <>
                        <iframe
                          src={googleMapsEmbedUrl(query)}
                          title={`Mapa ${event.title}`}
                          className="h-52 w-full border-0"
                          loading="lazy"
                          allowFullScreen
                        />
                        <div className="border-t border-[color:var(--wedsite-border)] p-4">
                          <a href={googleMapsUrl(query)} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--wedsite-color-secondary)] px-4 text-sm font-black text-white">
                            Como chegar <Navigation size={16} />
                          </a>
                        </div>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {showRsvpPreview && site.rsvp_enabled !== false && (
          <section id="rsvp-form" className="rounded-[1.5rem] bg-[var(--wedsite-color-secondary)] p-7 text-white sm:p-10">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/55">RSVP</p>
                <h2 className="mt-2 text-4xl font-black leading-none [font-family:var(--wedsite-font-primary)]">Confirme sua presença</h2>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="h-12 rounded-xl bg-white/15" />
                  <div className="h-12 rounded-xl bg-white/15" />
                  <div className="h-12 rounded-xl bg-white/15 sm:col-span-2" />
                </div>
                <div className="mt-4 h-12 rounded-xl bg-white text-[#202018]" />
              </div>
            </div>
          </section>
        )}

        {site.gift_list_enabled !== false && (
          <section id="presentes" className="wedsite-section-block">
            <SectionIntro eyebrow="Presentes" title="Lista preparada pelo casal" />
            {site.gift_intro && <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[var(--wedsite-muted)]">{site.gift_intro}</p>}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredGifts.length === 0 ? (
                <p className="text-sm font-medium text-[var(--wedsite-muted)]">A lista de presentes aparecerá aqui.</p>
              ) : featuredGifts.map((gift) => (
                <article key={gift.id} className={cardClass}>
                  {gift.image_url ? <img src={gift.image_url} alt="" className="h-44 w-full object-cover" /> : <div className="flex h-44 items-center justify-center bg-[var(--wedsite-color-primary)]/10 text-[var(--wedsite-color-primary)]"><Gift size={36} /></div>}
                  <div className="p-5">
                    <p className="text-lg font-black">{gift.title}</p>
                    {gift.category && <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--wedsite-color-primary)]">{categoryById.get(gift.category)}</p>}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="font-black text-[var(--wedsite-color-primary)]">{formatMoney(gift.price)}</span>
                      <span className="rounded-xl bg-[var(--wedsite-color-secondary)] px-4 py-2 text-xs font-black text-white">Presentear</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-secondary)] px-5 py-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[var(--wedsite-muted)]">
        Criado com WedPlan
      </footer>
    </div>
  );
};

const SectionIntro = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--wedsite-color-primary)]">{eyebrow}</p>
    <h2 className="mt-2 max-w-2xl text-4xl font-black leading-none [font-family:var(--wedsite-font-primary)] sm:text-5xl">{title}</h2>
  </div>
);
