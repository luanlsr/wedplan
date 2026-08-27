import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDownUp, CreditCard, ExternalLink, Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Badge, Card, Input } from '../ui';

type SortKey = 'created_at' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

type AdminSubscriptionRow = {
  id: string;
  kind: 'subscription' | 'checkout';
  account_id?: string | null;
  status: string;
  billing_interval: 'monthly' | 'yearly';
  customer_id?: string | null;
  subscription_id?: string | null;
  payment_url?: string | null;
  plan_name: string;
  plan_code: string;
  amount: number;
  full_name: string;
  email: string;
  created_at: string;
};

const statusVariant = (status: string) => {
  if (status === 'active' || status === 'paid') return 'success';
  if (status === 'past_due' || status === 'payment_pending' || status === 'incomplete') return 'warning';
  if (status === 'canceled' || status === 'failed' || status === 'expired') return 'error';
  return 'outline';
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export function AdminSubscriptions() {
  const [rows, setRows] = useState<AdminSubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);

    try {
      const [subscriptionsResult, checkoutsResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select(`
            id,
            account_id,
            status,
            billing_interval,
            asaas_customer_id,
            asaas_subscription_id,
            created_at,
            plans (
              code,
              name,
              price_monthly,
              price_yearly
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('checkout_sessions')
          .select(`
            id,
            created_user_id,
            status,
            billing_interval,
            full_name,
            email,
            asaas_customer_id,
            asaas_subscription_id,
            checkout_url,
            created_at,
            plans (
              code,
              name,
              price_monthly,
              price_yearly
            )
          `)
          .in('status', ['payment_pending', 'failed', 'canceled'])
          .order('created_at', { ascending: false }),
      ]);

      if (subscriptionsResult.error) throw subscriptionsResult.error;
      if (checkoutsResult.error) throw checkoutsResult.error;

      const accountIds = ((subscriptionsResult.data || []) as any[])
        .map((sub) => sub.account_id)
        .filter(Boolean);

      const { data: profilesData, error: profilesError } = accountIds.length
        ? await supabase
            .from('profiles')
            .select('account_id, id, full_name, email')
            .in('account_id', accountIds)
        : { data: [], error: null };

      if (profilesError) throw profilesError;

      const profilesByAccount = new Map(
        ((profilesData || []) as any[]).map((profile) => [
          profile.account_id || profile.id,
          profile,
        ])
      );

      const subscriptionRows = ((subscriptionsResult.data || []) as any[]).map((sub) => {
        const plan = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
        const profile = profilesByAccount.get(sub.account_id);
        const amount = sub.billing_interval === 'yearly' ? Number(plan?.price_yearly || 0) : Number(plan?.price_monthly || 0);

        return {
          id: sub.id,
          kind: 'subscription',
          account_id: sub.account_id,
          status: sub.status,
          billing_interval: sub.billing_interval,
          customer_id: sub.asaas_customer_id,
          subscription_id: sub.asaas_subscription_id,
          plan_name: plan?.name || 'Plano',
          plan_code: plan?.code || '',
          amount,
          full_name: profile?.full_name || 'Sem nome',
          email: profile?.email || 'Sem e-mail',
          created_at: sub.created_at,
        } satisfies AdminSubscriptionRow;
      });

      const checkoutRows = ((checkoutsResult.data || []) as any[])
        .filter((checkout) => !checkout.created_user_id || checkout.status !== 'paid')
        .map((checkout) => {
          const plan = Array.isArray(checkout.plans) ? checkout.plans[0] : checkout.plans;
          const amount = checkout.billing_interval === 'yearly' ? Number(plan?.price_yearly || 0) : Number(plan?.price_monthly || 0);

          return {
            id: checkout.id,
            kind: 'checkout',
            account_id: checkout.created_user_id,
            status: checkout.status,
            billing_interval: checkout.billing_interval,
            customer_id: checkout.asaas_customer_id,
            subscription_id: checkout.asaas_subscription_id,
            payment_url: checkout.checkout_url,
            plan_name: plan?.name || 'Plano',
            plan_code: plan?.code || '',
            amount,
            full_name: checkout.full_name || 'Sem nome',
            email: checkout.email || 'Sem e-mail',
            created_at: checkout.created_at,
          } satisfies AdminSubscriptionRow;
        });

      setRows([...subscriptionRows, ...checkoutRows]);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const searched = rows.filter((row) => {
      if (!normalizedSearch) return true;
      return (
        row.full_name.toLowerCase().includes(normalizedSearch) ||
        row.email.toLowerCase().includes(normalizedSearch) ||
        row.status.toLowerCase().includes(normalizedSearch) ||
        row.plan_name.toLowerCase().includes(normalizedSearch) ||
        row.id.toLowerCase().includes(normalizedSearch)
      );
    });

    return searched.sort((a, b) => {
      const direction = sortDirection === 'asc' ? 1 : -1;
      if (sortKey === 'amount') return (a.amount - b.amount) * direction;
      if (sortKey === 'status') return a.status.localeCompare(b.status) * direction;
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
    });
  }, [rows, search, sortDirection, sortKey]);

  const toggleSort = (nextKey: SortKey) => {
    if (sortKey === nextKey) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === 'created_at' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/20 rounded-xl text-primary">
            <CreditCard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest leading-none pt-2">Assinaturas</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Planos, checkouts e pagamentos</p>
          </div>
        </div>
      </div>

      <Card className="p-4 border-border/50 bg-secondary/20">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              className="rounded-xl border-border/50 bg-background pl-10 pr-10"
              placeholder="Buscar por nome, e-mail, status ou plano..."
              value={search}
              onChange={e => setSearch(e.target.value)}
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

          <div className="flex flex-wrap gap-2">
            <SortButton active={sortKey === 'created_at'} direction={sortDirection} onClick={() => toggleSort('created_at')}>
              Cadastro
            </SortButton>
            <SortButton active={sortKey === 'amount'} direction={sortDirection} onClick={() => toggleSort('amount')}>
              Valor
            </SortButton>
            <SortButton active={sortKey === 'status'} direction={sortDirection} onClick={() => toggleSort('status')}>
              Status
            </SortButton>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border-border/50 bg-secondary/20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50 text-left">
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Cliente</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Plano</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Valor</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Status</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Tipo</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground text-right">Asaas</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando assinaturas...</td></tr>
              ) : filteredRows.map(row => (
                <tr key={`${row.kind}-${row.id}`} className="border-b border-border/20 bg-card/30 transition-colors hover:bg-accent/40">
                  <td className="p-4">
                    <div className="font-bold">{row.full_name}</div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold">{row.plan_name}</div>
                    <div className="text-xs text-muted-foreground">{row.plan_code}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-black">{formatMoney(row.amount)}</div>
                    <div className="text-xs text-muted-foreground">{row.billing_interval === 'yearly' ? 'anual' : 'mensal'}</div>
                  </td>
                  <td className="p-4">
                    <Badge variant={statusVariant(row.status) as any}>{row.status}</Badge>
                  </td>
                  <td className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {row.kind === 'checkout' ? 'checkout' : 'assinatura'}
                  </td>
                  <td className="p-4 text-right">
                    {row.payment_url ? (
                      <a href={row.payment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-end gap-2 text-xs font-bold text-primary">
                        Abrir cobrança <ExternalLink size={14} />
                      </a>
                    ) : row.customer_id ? (
                      <span className="text-xs text-muted-foreground">{row.customer_id}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Não integrado</span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nenhuma assinatura encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

const SortButton = ({
  active,
  direction,
  onClick,
  children,
}: {
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black uppercase tracking-widest transition ${
      active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:text-foreground'
    }`}
  >
    <ArrowDownUp size={14} />
    {children}
    {active && <span>{direction === 'asc' ? '↑' : '↓'}</span>}
  </button>
);
