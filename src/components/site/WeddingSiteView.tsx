import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, Copy, ExternalLink, Globe2, Loader2, MessageSquareHeart, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { Badge, Button, Card, Input, cn } from '../ui';
import { supabase } from '../../lib/supabase';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';
import type { WeddingData } from '../../types';

type WeddingSite = {
  id: string;
  wedding_id: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  title: string | null;
  welcome_message: string | null;
  cover_image_url: string | null;
  custom_domain: string | null;
  custom_domain_status: 'not_requested' | 'checking' | 'available' | 'reserved' | 'configured' | 'failed';
  rsvp_enabled: boolean;
  gift_list_enabled: boolean;
  messages_enabled: boolean;
};

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

export const WeddingSiteView = ({ data }: WeddingSiteViewProps) => {
  const { hasFeature, loading: planLoading, subscription } = usePlanFeatures();
  const [site, setSite] = useState<WeddingSite | null>(null);
  const [form, setForm] = useState({
    slug: defaultSlug(data),
    title: '',
    welcome_message: '',
    cover_image_url: '',
    status: 'draft' as WeddingSite['status'],
    rsvp_enabled: true,
    gift_list_enabled: true,
    messages_enabled: true,
  });
  const [domain, setDomain] = useState('');
  const [domainRequests, setDomainRequests] = useState<DomainRequest[]>([]);
  const [messages, setMessages] = useState<GuestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUseSite = hasFeature('wedding_site');
  const canRequestDomain = hasFeature('custom_domain_addon');
  const publicUrl = useMemo(() => `${window.location.origin}/casamento/${form.slug}`, [form.slug]);

  useEffect(() => {
    setForm((current) => {
      if (site) return current;
      return {
        ...current,
        slug: defaultSlug(data),
        title: [data.casal.nome1, data.casal.nome2].filter(Boolean).join(' & '),
      };
    });
  }, [data, site]);

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
        setSite(siteData as WeddingSite);
        setForm({
          slug: siteData.slug,
          title: siteData.title || '',
          welcome_message: siteData.welcome_message || '',
          cover_image_url: siteData.cover_image_url || '',
          status: siteData.status,
          rsvp_enabled: siteData.rsvp_enabled,
          gift_list_enabled: siteData.gift_list_enabled,
          messages_enabled: siteData.messages_enabled,
        });

        const [domainResult, messagesResult] = await Promise.all([
          supabase
            .from('domain_requests')
            .select('id, requested_domain, status, setup_fee, annual_fee, billing_status, created_at')
            .eq('wedding_site_id', siteData.id)
            .order('created_at', { ascending: false }),
          supabase
            .from('guest_messages')
            .select('id, author_name, author_email, message, status, created_at')
            .eq('wedding_id', data.id)
            .order('created_at', { ascending: false }),
        ]);

        if (domainResult.error) throw domainResult.error;
        if (messagesResult.error) throw messagesResult.error;

        setDomainRequests((domainResult.data || []) as DomainRequest[]);
        setMessages((messagesResult.data || []) as GuestMessage[]);
      }
    } catch (err: any) {
      console.error('[WeddingSiteView] Erro ao carregar site:', err);
      setError(err.message || 'Não foi possível carregar o site do casal');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!data.id) return;
    const cleanSlug = slugify(form.slug);
    if (!cleanSlug) {
      setError('Informe um endereço válido para o site.');
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
          title: form.title || [data.casal.nome1, data.casal.nome2].filter(Boolean).join(' & '),
          welcome_message: form.welcome_message || null,
          cover_image_url: form.cover_image_url || null,
          rsvp_enabled: form.rsvp_enabled,
          gift_list_enabled: form.gift_list_enabled,
          messages_enabled: form.messages_enabled,
        }, { onConflict: 'wedding_id' })
        .select()
        .single();

      if (saveError) throw saveError;
      setSite(savedSite as WeddingSite);
      setForm((current) => ({ ...current, slug: cleanSlug }));
      await loadSite();
    } catch (err: any) {
      console.error('[WeddingSiteView] Erro ao salvar site:', err);
      setError(err.message || 'Não foi possível salvar o site.');
    } finally {
      setSaving(false);
    }
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
      setError(err.message || 'Não foi possível registrar a solicitação de domínio.');
    } finally {
      setSaving(false);
    }
  };

  const updateMessageStatus = async (messageId: string, status: GuestMessage['status']) => {
    const previousMessages = messages;
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, status } : message));

    const { error: updateError } = await supabase
      .from('guest_messages')
      .update({ status })
      .eq('id', messageId);

    if (updateError) {
      setMessages(previousMessages);
      setError(updateError.message);
    }
  };

  const copyPublicUrl = async () => {
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <Badge variant="outline" className="mb-4">
                <Sparkles size={13} />
                Recurso Pro
              </Badge>
              <h2 className="text-3xl font-black tracking-tight text-foreground">Site personalizado do casal</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-muted-foreground">
                O plano Pro libera landing page pública para o casal, lista de presentes individual,
                RSVP, mensagens dos convidados e solicitação de domínio personalizado.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-background/80 p-4 text-sm font-bold text-muted-foreground">
              Plano atual: {subscription?.plan?.name || 'sem assinatura Pro'}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">Site do Casal</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">Landing page, RSVP, presentes e mensagens do plano Pro.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {site?.status === 'published' && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold transition hover:bg-accent"
            >
              Abrir site <ExternalLink size={16} />
            </a>
          )}
          <Button onClick={handleSave} disabled={saving} className="h-11 rounded-xl px-4">
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Salvar site
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-bold text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-6 p-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Globe2 size={20} />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tight">Página pública</h3>
              <p className="text-xs font-medium text-muted-foreground">Configure o endereço e os textos principais.</p>
            </div>
          </div>

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
              <div className="grid grid-cols-2 rounded-2xl border border-border bg-secondary/30 p-1">
                {(['draft', 'published'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, status }))}
                    className={cn(
                      'h-11 rounded-xl text-xs font-black uppercase tracking-widest',
                      form.status === status && 'bg-background text-primary shadow-sm'
                    )}
                  >
                    {status === 'draft' ? 'Rascunho' : 'Publicado'}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Título">
            <Input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="h-12 rounded-2xl bg-secondary/30"
              placeholder="Maria & João"
            />
          </Field>

          <Field label="Mensagem de boas-vindas">
            <textarea
              value={form.welcome_message}
              onChange={(event) => setForm((current) => ({ ...current, welcome_message: event.target.value }))}
              className="min-h-28 w-full rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-sm font-medium outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              placeholder="Estamos muito felizes em compartilhar esse momento com você."
            />
          </Field>

          <Field label="Imagem de capa">
            <Input
              value={form.cover_image_url}
              onChange={(event) => setForm((current) => ({ ...current, cover_image_url: event.target.value }))}
              className="h-12 rounded-2xl bg-secondary/30"
              placeholder="https://..."
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Toggle label="RSVP" checked={form.rsvp_enabled} onChange={(checked) => setForm((current) => ({ ...current, rsvp_enabled: checked }))} />
            <Toggle label="Presentes" checked={form.gift_list_enabled} onChange={(checked) => setForm((current) => ({ ...current, gift_list_enabled: checked }))} />
            <Toggle label="Mensagens" checked={form.messages_enabled} onChange={(checked) => setForm((current) => ({ ...current, messages_enabled: checked }))} />
          </div>

          <div className="rounded-2xl border border-border bg-secondary/20 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Link público</p>
                <p className="mt-1 truncate font-mono text-sm font-bold text-foreground">{publicUrl}</p>
              </div>
              <Button variant="outline" onClick={copyPublicUrl} className="h-10 rounded-xl px-3 text-xs">
                {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tight">Domínio personalizado</h3>
                <p className="text-xs text-muted-foreground">Consulta e compra entram como adicional Pro.</p>
              </div>
            </div>

            <div className={cn(!canRequestDomain && 'pointer-events-none opacity-50')}>
              <div className="flex gap-2">
                <Input
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  className="h-12 rounded-2xl bg-secondary/30"
                  placeholder="mariaejoao.com.br"
                />
                <Button onClick={handleRequestDomain} disabled={saving || !site} className="h-12 rounded-2xl px-4">
                  Solicitar
                </Button>
              </div>
            </div>

            {!canRequestDomain && (
              <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-bold text-amber-700 dark:text-amber-300">
                Domínio personalizado está disponível como adicional dos planos Pro.
              </p>
            )}

            <div className="space-y-2">
              {domainRequests.length === 0 ? (
                <p className="text-xs font-medium text-muted-foreground">Nenhuma solicitação registrada.</p>
              ) : domainRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-border bg-secondary/20 p-3">
                  <p className="text-sm font-black">{request.requested_domain}</p>
                  <p className="mt-1 text-xs font-bold text-muted-foreground">
                    {request.status} • adicional R$ {(Number(request.setup_fee) + Number(request.annual_fee)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MessageSquareHeart size={20} />
              </div>
              <div>
                <h3 className="font-black uppercase tracking-tight">Mensagens</h3>
                <p className="text-xs text-muted-foreground">Moderação das mensagens recebidas no site.</p>
              </div>
            </div>

            <div className="space-y-3">
              {messages.length === 0 ? (
                <p className="text-xs font-medium text-muted-foreground">Nenhuma mensagem recebida ainda.</p>
              ) : messages.slice(0, 5).map((message) => (
                <div key={message.id} className="rounded-2xl border border-border bg-secondary/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black">{message.author_name}</p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground line-clamp-3">{message.message}</p>
                    </div>
                    <Badge variant={message.status === 'approved' ? 'success' : message.status === 'hidden' ? 'error' : 'warning'}>
                      {message.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" onClick={() => updateMessageStatus(message.id, 'approved')} className="h-9 rounded-xl px-3 text-xs">
                      Aprovar
                    </Button>
                    <Button variant="ghost" onClick={() => updateMessageStatus(message.id, 'hidden')} className="h-9 rounded-xl px-3 text-xs">
                      Ocultar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-2">
    <label className="ml-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</label>
    {children}
  </div>
);

const Toggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-xs font-black uppercase tracking-widest text-muted-foreground">
    <span>{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="h-4 w-4 accent-primary"
    />
  </label>
);
