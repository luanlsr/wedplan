import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Globe2, Search, X } from 'lucide-react';
import { Badge, Card, Input } from '../ui';
import { supabase } from '../../lib/supabase';

type DomainRequest = {
  id: string;
  requested_domain: string;
  status: string;
  billing_status: string;
  setup_fee: number;
  annual_fee: number;
  availability_provider: string | null;
  provider_order_id: string | null;
  created_at: string;
  wedding_sites: {
    slug: string;
    title: string | null;
  } | null;
};

const domainStatuses = ['requested', 'checking', 'available', 'unavailable', 'awaiting_payment', 'purchased', 'configured', 'failed', 'canceled'];
const billingStatuses = ['not_charged', 'pending', 'paid', 'failed', 'refunded'];

const statusVariant = (status: string) => {
  if (status === 'available' || status === 'purchased' || status === 'configured' || status === 'paid') return 'success';
  if (status === 'requested' || status === 'checking' || status === 'awaiting_payment' || status === 'pending') return 'warning';
  if (status === 'unavailable' || status === 'failed' || status === 'canceled') return 'error';
  return 'outline';
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

export const AdminDomainRequests = () => {
  const [requests, setRequests] = useState<DomainRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('domain_requests')
        .select(`
          id,
          requested_domain,
          status,
          billing_status,
          setup_fee,
          annual_fee,
          availability_provider,
          provider_order_id,
          created_at,
          wedding_sites (
            slug,
            title
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data || []) as any);
    } catch (error) {
      console.error('[AdminDomainRequests] Erro ao carregar domínios:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return requests;

    return requests.filter((request) =>
      request.requested_domain.toLowerCase().includes(normalizedSearch) ||
      request.status.toLowerCase().includes(normalizedSearch) ||
      request.billing_status.toLowerCase().includes(normalizedSearch) ||
      (request.wedding_sites?.title || '').toLowerCase().includes(normalizedSearch) ||
      (request.wedding_sites?.slug || '').toLowerCase().includes(normalizedSearch)
    );
  }, [requests, search]);

  const updateRequest = async (id: string, payload: Partial<DomainRequest>) => {
    setRequests((current) => current.map((request) => request.id === id ? { ...request, ...payload } : request));

    const { error } = await supabase
      .from('domain_requests')
      .update(payload)
      .eq('id', id);

    if (error) {
      console.error('[AdminDomainRequests] Erro ao atualizar domínio:', error);
      await loadRequests();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/20 rounded-xl text-primary">
            <Globe2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest leading-none pt-2">Domínios</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Pedidos de domínio personalizado</p>
          </div>
        </div>
      </div>

      <Card className="p-4 border-border/50 bg-secondary/20">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            className="rounded-xl border-border/50 bg-background pl-10 pr-10"
            placeholder="Buscar domínio, status ou casal..."
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden border-border/50 bg-secondary/20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50 text-left">
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Domínio</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Site</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Valor</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Status</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Cobrança</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Pedido</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando pedidos...</td></tr>
              ) : filteredRequests.map((request) => {
                const publicUrl = `${window.location.origin}/casamento/${request.wedding_sites?.slug || ''}`;
                return (
                  <tr key={request.id} className="border-b border-border/20 bg-card/30 transition-colors hover:bg-accent/40">
                    <td className="p-4">
                      <div className="font-black">{request.requested_domain}</div>
                      <div className="text-xs text-muted-foreground">{request.availability_provider || 'manual'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold">{request.wedding_sites?.title || 'Site do casal'}</div>
                      {request.wedding_sites?.slug && (
                        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary">
                          /casamento/{request.wedding_sites.slug} <ExternalLink size={12} />
                        </a>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-black">{formatMoney(Number(request.setup_fee) + Number(request.annual_fee))}</div>
                      <div className="text-xs text-muted-foreground">setup + anual</div>
                    </td>
                    <td className="p-4">
                      <SelectCell
                        value={request.status}
                        options={domainStatuses}
                        onChange={(status) => updateRequest(request.id, { status })}
                      />
                      <Badge variant={statusVariant(request.status) as any} className="mt-2">{request.status}</Badge>
                    </td>
                    <td className="p-4">
                      <SelectCell
                        value={request.billing_status}
                        options={billingStatuses}
                        onChange={(billing_status) => updateRequest(request.id, { billing_status })}
                      />
                      <Badge variant={statusVariant(request.billing_status) as any} className="mt-2">{request.billing_status}</Badge>
                    </td>
                    <td className="p-4 text-xs font-bold text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nenhum pedido de domínio encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const SelectCell = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => (
  <select
    value={value}
    onChange={(event) => onChange(event.target.value)}
    className="h-10 w-full min-w-40 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
  >
    {options.map((option) => (
      <option key={option} value={option} className="bg-background text-foreground">
        {option}
      </option>
    ))}
  </select>
);
