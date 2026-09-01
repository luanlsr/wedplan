import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Gift, Heart, Loader2, MapPin, Search, ShoppingBag, SlidersHorizontal, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { setPageMetadata } from '../../utils/meta';
import { Button, Input, useConfirm } from '../ui';
import { cn } from '../../lib/utils';
import { sortByLabelPtBr, sortTextPtBr, uniqueSortedTextPtBr } from '../../utils/sorting';
import { formatMoney, getWeddingSiteTemplate, type GiftCategory, type GiftItem, type WeddingSite } from './weddingSiteTypes';

const priceRanges = [
  { id: 'all', label: 'Todos os valores' },
  { id: 'under200', label: 'Até R$ 200' },
  { id: '200-500', label: 'R$ 200 a R$ 500' },
  { id: 'over500', label: 'Acima de R$ 500' },
] as const;

type PriceRange = typeof priceRanges[number]['id'];
type SortOrder = 'latest' | 'low-high' | 'high-low' | 'az';

const PUBLIC_GIFTS_PAGE_SIZE = 12;

export const WeddingGiftsPublic = () => {
  const { slug } = useParams();
  const { alert: customAlert } = useConfirm();
  const [site, setSite] = useState<WeddingSite | null>(null);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [categories, setCategories] = useState<GiftCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [brand, setBrand] = useState('all');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
  const [mobileFilters, setMobileFilters] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [guestName, setGuestName] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PUBLIC_GIFTS_PAGE_SIZE);

  async function loadGifts() {
    if (!slug) return;
    setLoading(true);
    try {
      const { data: siteData, error: siteError } = await supabase
        .from('wedding_sites')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .eq('gift_list_enabled', true)
        .maybeSingle();

      if (siteError) throw siteError;
      if (!siteData) {
        setSite(null);
        return;
      }

      const currentSite = siteData as WeddingSite;
      setSite(currentSite);

      const [giftsResult, categoriesResult] = await Promise.all([
        supabase
          .from('lista_presentes')
          .select('id, title, subtitle, image_url, price, buy_url, wedding_id, brand, is_featured, is_bought, bought_by, category, created_at')
          .eq('wedding_id', currentSite.wedding_id)
          .order('is_bought', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase
          .from('categorias_presentes')
          .select('id, wedding_id, name, active')
          .eq('wedding_id', currentSite.wedding_id)
          .eq('active', true)
          .order('name', { ascending: true }),
      ]);

      if (giftsResult.error) throw giftsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;

      setGifts((giftsResult.data || []) as GiftItem[]);
      setCategories((categoriesResult.data || []) as GiftCategory[]);
    } catch (error) {
      console.error('[WeddingGiftsPublic] Erro ao carregar presentes:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadGifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!site) return;

    const title = `Lista de presentes de ${site.title || 'um casal especial'} | WedPlan`;
    const description = (site.gift_intro || `Veja a lista de presentes preparada por ${site.title || 'este casal'} e escolha uma sugestão com carinho.`).replace(/\s+/g, ' ').trim();
    const image = gifts.find((gift) => gift.image_url)?.image_url || site.cover_image_url || '/image/wedplan_logo.png';

    setPageMetadata({
      title,
      description: description.slice(0, 180),
      image,
      url: window.location.href,
    });
  }, [gifts, site]);

  const categoryById = useMemo(() => new Map(categories.map((item) => [item.id, item.name])), [categories]);
  const sortedCategories = useMemo(() => sortByLabelPtBr(categories, (item) => item.name), [categories]);
  const brands = useMemo(() => ['all', ...uniqueSortedTextPtBr(gifts.map((gift) => gift.brand).filter(Boolean) as string[])], [gifts]);
  const deliveryAddress = useMemo(() => {
    if (!site) return '';
    return [
      site.gift_delivery_name,
      site.gift_delivery_address,
      [site.gift_delivery_city, site.gift_delivery_state].filter(Boolean).join(' - '),
      site.gift_delivery_zip ? `CEP: ${site.gift_delivery_zip}` : '',
      site.gift_delivery_notes,
    ].filter(Boolean).join('\n');
  }, [site]);

  const filteredGifts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const result = gifts.filter((gift) => {
      if (normalized) {
        const haystack = [gift.title, gift.subtitle, gift.brand, gift.bought_by, categoryById.get(gift.category || '')].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(normalized)) return false;
      }
      if (category !== 'all' && gift.category !== category) return false;
      if (brand !== 'all' && gift.brand !== brand) return false;
      if (priceRange === 'under200' && Number(gift.price || 0) > 200) return false;
      if (priceRange === '200-500' && (Number(gift.price || 0) <= 200 || Number(gift.price || 0) > 500)) return false;
      if (priceRange === 'over500' && Number(gift.price || 0) <= 500) return false;
      return true;
    });

    result.sort((a, b) => {
      if (a.is_bought !== b.is_bought) return a.is_bought ? 1 : -1;
      if (sortOrder === 'low-high') return Number(a.price || 0) - Number(b.price || 0);
      if (sortOrder === 'high-low') return Number(b.price || 0) - Number(a.price || 0);
      if (sortOrder === 'az') return sortTextPtBr(a.title, b.title);
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return result;
  }, [brand, category, categoryById, gifts, priceRange, search, sortOrder]);

  const visibleGifts = useMemo(() => filteredGifts.slice(0, visibleCount), [filteredGifts, visibleCount]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(PUBLIC_GIFTS_PAGE_SIZE);
  }, [brand, category, gifts.length, priceRange, search, sortOrder]);

  const template = site ? getWeddingSiteTemplate(site.template_id) : null;
  const themeStyle = site && template ? {
    '--wedsite-font-primary': `'${site.font_primary || 'Playfair Display'}', serif`,
    '--wedsite-font-secondary': `'${site.font_secondary || 'Manrope'}', sans-serif`,
    '--wedsite-color-primary': site.color_primary || '#8b6f43',
    '--wedsite-color-secondary': site.color_secondary || '#2f3829',
    '--wedsite-bg-primary': site.background_primary || '#fbfaf7',
    '--wedsite-bg-secondary': site.background_secondary || '#ffffff',
    '--wedsite-text': template.textColor,
    '--wedsite-muted': template.mutedColor,
    '--wedsite-border': template.borderColor,
  } as CSSProperties : undefined;

  const copyAddress = async () => {
    await navigator.clipboard.writeText(deliveryAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reserveGift = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedGift || guestName.trim().length < 4) return;
    setSubmitting(true);

    const { data, error } = await supabase.rpc('reserve_wedding_gift', {
      p_gift_id: selectedGift.id,
      p_guest_name: guestName.trim(),
    });

    setSubmitting(false);

    if (error) {
      await customAlert({
        title: 'Presente indisponível',
        description: 'Esse presente não está mais disponível. Escolha outra opção.',
        type: 'warning',
        confirmLabel: 'Entendi',
      });
      setSelectedGift(null);
      setGuestName('');
      await loadGifts();
      return;
    }

    const buyUrl = Array.isArray(data) ? data[0]?.buy_url : selectedGift.buy_url;
    setGifts((current) => current.map((gift) => gift.id === selectedGift.id ? { ...gift, is_bought: true, bought_by: guestName.trim() } : gift));
    setSelectedGift(null);
    setGuestName('');
    if (buyUrl) window.open(buyUrl, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7]">
        <Loader2 className="animate-spin text-[#8b6f43]" size={36} />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fbfaf7] px-4 text-center">
        <div>
          <Gift className="mx-auto mb-4 text-[#8b6f43]" size={40} />
          <h1 className="text-3xl font-black text-[#202018] [font-family:'Outfit',sans-serif]">Lista não encontrada</h1>
          <Link to={`/casamento/${slug || ''}`} className="mt-4 inline-flex text-sm font-black text-[#8b6f43]">Voltar ao site</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={themeStyle} className={cn('min-h-screen bg-[var(--wedsite-bg-primary)] text-[var(--wedsite-text)] [font-family:var(--wedsite-font-secondary)]', template && `wedsite-template-${template.id}`)}>
      <header className="sticky top-0 z-30 border-b border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-primary)]/85 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/casamento/${site.slug}`} className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-secondary)]">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--wedsite-color-primary)]">{site.title}</p>
              <h1 className="text-2xl font-black [font-family:var(--wedsite-font-primary)]">Lista de presentes</h1>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9b958c]" size={17} />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar presente, marca..." className="h-11 border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-secondary)] pl-10 pr-10" />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#9b958c] hover:bg-[#f0ebe3]">
                  <X size={15} />
                </button>
              )}
            </div>
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)} className="h-11 rounded-xl border border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-secondary)] px-3 text-sm font-bold outline-none">
              <option value="latest">Mais recentes</option>
              <option value="low-high">Menor preço</option>
              <option value="high-low">Maior preço</option>
              <option value="az">Ordem alfabética</option>
            </select>
            <button onClick={() => setMobileFilters(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-secondary)] px-4 text-sm font-black lg:hidden">
              <SlidersHorizontal size={16} /> Filtros
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[260px_1fr]">
        <Filters
          categories={sortedCategories}
          brands={brands}
          category={category}
          brand={brand}
          priceRange={priceRange}
          setCategory={setCategory}
          setBrand={setBrand}
          setPriceRange={setPriceRange}
          className="hidden lg:block"
        />

        <main>
          {site.gift_intro && <p className="mb-6 max-w-3xl text-sm font-medium leading-6 text-[var(--wedsite-muted)]">{site.gift_intro}</p>}

          {filteredGifts.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-secondary)] text-center">
              <Gift className="mb-3 text-[var(--wedsite-color-primary)]" size={36} />
              <p className="font-black">Nenhum presente encontrado</p>
              <button onClick={() => { setSearch(''); setCategory('all'); setBrand('all'); setPriceRange('all'); }} className="mt-3 text-sm font-black text-[var(--wedsite-color-primary)]">Limpar filtros</button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visibleGifts.map((gift) => (
                  <article key={gift.id} className={cn('overflow-hidden rounded-2xl border border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-secondary)] shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10', gift.is_bought && 'opacity-70')}>
                    <div className="relative flex h-56 items-center justify-center bg-[#f0ebe3]">
                      {gift.image_url ? <img src={gift.image_url} alt={gift.title} className="h-full w-full object-cover" loading="lazy" /> : <Gift className="text-[var(--wedsite-color-primary)]" size={42} />}
                      {gift.is_featured && <span className="absolute left-3 top-3 rounded-full bg-[var(--wedsite-color-secondary)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">Sugestão</span>}
                    </div>
                    <div className="p-5">
                      <h2 className="text-lg font-black leading-tight">{gift.title}</h2>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--wedsite-color-primary)]">
                        {gift.category && <span>{categoryById.get(gift.category)}</span>}
                        {gift.brand && <span>{gift.brand}</span>}
                      </div>
                      {gift.subtitle && <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-[var(--wedsite-muted)]">{gift.subtitle}</p>}
                      <div className="mt-5 flex items-center justify-between gap-3">
                        <span className="text-lg font-black text-[var(--wedsite-color-primary)]">{formatMoney(gift.price)}</span>
                        {gift.is_bought ? (
                          <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                            <Check size={14} /> {gift.bought_by || 'Reservado'}
                          </span>
                        ) : (
                          <button onClick={() => setSelectedGift(gift)} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--wedsite-color-secondary)] px-4 text-xs font-black uppercase text-white">
                            <ShoppingBag size={15} /> Presentear
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {visibleCount < filteredGifts.length && (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-secondary)] p-5 text-center sm:flex-row sm:justify-between sm:text-left">
                  <p className="text-sm font-bold text-[var(--wedsite-muted)]">
                    Exibindo {visibleGifts.length} de {filteredGifts.length} presentes.
                  </p>
                  <button onClick={() => setVisibleCount((current) => current + PUBLIC_GIFTS_PAGE_SIZE)} className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--wedsite-color-secondary)] px-5 text-xs font-black uppercase text-white">
                    Carregar mais presentes
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {mobileFilters && (
          <motion.div className="fixed inset-0 z-50 bg-black/45 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileFilters(false)}>
            <motion.div className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-y-auto rounded-t-[1.5rem] bg-[var(--wedsite-bg-primary)] p-4" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={(event) => event.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-black [font-family:'Outfit',sans-serif]">Filtros</h2>
                <button onClick={() => setMobileFilters(false)}><X size={22} /></button>
              </div>
              <Filters categories={sortedCategories} brands={brands} category={category} brand={brand} priceRange={priceRange} setCategory={setCategory} setBrand={setBrand} setPriceRange={setPriceRange} />
              <Button onClick={() => setMobileFilters(false)} className="mt-5 h-12 w-full rounded-xl bg-[var(--wedsite-color-secondary)]">Aplicar filtros</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedGift && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedGift(null)}>
            <motion.div className="w-full max-w-lg rounded-2xl border border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-secondary)] p-5 shadow-2xl" initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }} onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--wedsite-color-primary)]">Confirmar presente</p>
                  <h2 className="mt-1 text-2xl font-black [font-family:var(--wedsite-font-primary)]">{selectedGift.title}</h2>
                </div>
                <button onClick={() => setSelectedGift(null)} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-[var(--wedsite-bg-primary)]"><X size={18} /></button>
              </div>

              <div className="mt-5 rounded-2xl border border-dashed border-[color:var(--wedsite-color-primary)] bg-[var(--wedsite-bg-primary)] p-4">
                <div className="flex gap-3">
                    <MapPin className="mt-1 shrink-0 text-[var(--wedsite-color-primary)]" size={20} />
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--wedsite-color-primary)]">Endereço de entrega</p>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-6 text-[var(--wedsite-muted)] [font-family:inherit]">{deliveryAddress || 'O casal ainda não configurou o endereço de entrega.'}</pre>
                  </div>
                </div>
                {deliveryAddress && (
                  <button onClick={copyAddress} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-secondary)] text-xs font-black uppercase text-[var(--wedsite-color-primary)]">
                    <Copy size={15} /> {copied ? 'Endereço copiado' : 'Copiar endereço'}
                  </button>
                )}
              </div>

              <form onSubmit={reserveGift} className="mt-5 space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[var(--wedsite-muted)]">Seu nome</label>
                  <Input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Digite seu nome" className="h-12 border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-primary)]" />
                  <p className="mt-2 text-xs font-medium text-[var(--wedsite-muted)]">O link do produto será liberado após informar pelo menos 4 letras.</p>
                </div>
                <Button type="submit" disabled={submitting || guestName.trim().length < 4} className="h-12 w-full rounded-xl bg-[var(--wedsite-color-secondary)]">
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <ShoppingBag size={16} />}
                  Confirmar e ver link do produto
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="px-5 py-8 text-center text-[10px] font-black uppercase tracking-[0.2em] text-[var(--wedsite-muted)]">
        <Heart className="mx-auto mb-2 text-[var(--wedsite-color-primary)]" size={16} />
        Criado com WedPlan
      </footer>
    </div>
  );
};

const Filters = ({
  categories,
  brands,
  category,
  brand,
  priceRange,
  setCategory,
  setBrand,
  setPriceRange,
  className,
}: {
  categories: GiftCategory[];
  brands: string[];
  category: string;
  brand: string;
  priceRange: PriceRange;
  setCategory: (value: string) => void;
  setBrand: (value: string) => void;
  setPriceRange: (value: PriceRange) => void;
  className?: string;
}) => (
  <aside className={cn('h-fit rounded-2xl border border-[color:var(--wedsite-border)] bg-[var(--wedsite-bg-secondary)] p-4 shadow-sm', className)}>
    <FilterGroup title="Categorias">
      <FilterButton active={category === 'all'} onClick={() => setCategory('all')}>Todas</FilterButton>
      {categories.map((item) => (
        <FilterButton key={item.id} active={category === item.id} onClick={() => setCategory(item.id)}>{item.name}</FilterButton>
      ))}
    </FilterGroup>

    <FilterGroup title="Marcas">
      {brands.map((item) => (
        <FilterButton key={item} active={brand === item} onClick={() => setBrand(item)}>{item === 'all' ? 'Todas' : item}</FilterButton>
      ))}
    </FilterGroup>

    <FilterGroup title="Preço">
      {priceRanges.map((item) => (
        <FilterButton key={item.id} active={priceRange === item.id} onClick={() => setPriceRange(item.id)}>{item.label}</FilterButton>
      ))}
    </FilterGroup>
  </aside>
);

const FilterGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="border-b border-[color:var(--wedsite-border)] py-4 first:pt-0 last:border-b-0 last:pb-0">
    <h3 className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--wedsite-color-primary)]">{title}</h3>
    <div className="grid gap-1">{children}</div>
  </div>
);

const FilterButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={cn('rounded-xl px-3 py-2 text-left text-sm font-bold text-[var(--wedsite-muted)] transition hover:bg-[var(--wedsite-bg-primary)]', active && 'bg-[var(--wedsite-color-secondary)] text-white hover:bg-[var(--wedsite-color-secondary)]')}>
    {children}
  </button>
);
