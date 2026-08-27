import { useEffect, useMemo, useState, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CreditCard, Crown, Hourglass, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Badge, Card } from '../ui';

type AdminSubscription = {
  id: string;
  account_id: string;
  status: string;
  billing_interval: 'monthly' | 'yearly';
  created_at: string;
  plans: any;
};

type Profile = {
  account_id: string;
  id: string;
  full_name: string;
  email: string;
};

type PendingCheckout = {
  id: string;
  status: string;
};

const monthlyValue = (subscription: AdminSubscription) => {
  const plan = Array.isArray(subscription.plans) ? subscription.plans[0] : subscription.plans;
  const monthly = Number(plan?.price_monthly || 0);
  const yearly = Number(plan?.price_yearly || 0);
  return subscription.billing_interval === 'yearly' ? yearly / 12 : monthly;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export function AdminDashboard() {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [pendingCheckouts, setPendingCheckouts] = useState<PendingCheckout[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
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
            created_at,
            plans (
              name,
              code,
              price_monthly,
              price_yearly
            )
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('checkout_sessions')
          .select('id, status')
          .eq('status', 'payment_pending'),
      ]);

      if (subscriptionsResult.error) throw subscriptionsResult.error;
      if (checkoutsResult.error) throw checkoutsResult.error;

      const subRows = ((subscriptionsResult.data || []) as any[]) as AdminSubscription[];
      setSubscriptions(subRows);
      setPendingCheckouts((checkoutsResult.data || []) as PendingCheckout[]);

      const accountIds = subRows.map((subscription) => subscription.account_id).filter(Boolean);
      const { data: profilesData, error: profilesError } = accountIds.length
        ? await supabase
            .from('profiles')
            .select('account_id, id, full_name, email')
            .in('account_id', accountIds)
        : { data: [], error: null };

      if (profilesError) throw profilesError;

      setProfiles(new Map(
        ((profilesData || []) as Profile[]).map((profile) => [
          profile.account_id || profile.id,
          profile,
        ])
      ));
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => subscription.status === 'active' || subscription.status === 'trialing'),
    [subscriptions]
  );

  const mrr = useMemo(
    () => activeSubscriptions.reduce((total, subscription) => total + monthlyValue(subscription), 0),
    [activeSubscriptions]
  );

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Crown className="text-yellow-500" size={32} />
        <h1 className="text-2xl font-black uppercase tracking-widest">Master Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          icon={Users}
          label="Assinantes ativos"
          value={String(activeSubscriptions.length)}
          tone="primary"
          onClick={() => navigate('/assinaturas')}
        />
        <MetricCard
          icon={CreditCard}
          label="MRR projetado"
          value={formatMoney(mrr)}
          tone="blue"
          onClick={() => navigate('/assinaturas')}
        />
        <MetricCard
          icon={Hourglass}
          label="Checkouts pendentes"
          value={String(pendingCheckouts.length)}
          tone="amber"
          onClick={() => navigate('/assinaturas')}
        />
      </div>

      <Card className="overflow-hidden border-border/50 bg-secondary/20">
        <div className="p-4 border-b border-border/50 bg-background/50">
          <h2 className="font-bold tracking-widest uppercase text-sm">Assinaturas recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50 text-left">
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Cliente</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Plano</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Status</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.slice(0, 6).map((subscription) => {
                const profile = profiles.get(subscription.account_id);
                const plan = Array.isArray(subscription.plans) ? subscription.plans[0] : subscription.plans;
                return (
                  <tr key={subscription.id} className="border-b border-border/20 bg-card/30 transition-colors hover:bg-accent/40">
                    <td className="p-4">
                      <div className="font-bold">{profile?.full_name || 'Sem nome'}</div>
                      <div className="text-xs text-muted-foreground">{profile?.email || 'Sem e-mail'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold">{plan?.name || 'Plano'}</div>
                      <div className="text-xs text-muted-foreground">{formatMoney(monthlyValue(subscription))}/mês</div>
                    </td>
                    <td className="p-4">
                      <Badge variant={subscription.status === 'active' ? 'success' : subscription.status === 'past_due' ? 'warning' : 'outline'}>
                        {subscription.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {new Date(subscription.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
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

const MetricCard = ({
  icon: Icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: ElementType;
  label: string;
  value: string;
  tone: 'primary' | 'blue' | 'amber';
  onClick: () => void;
}) => {
  const tones = {
    primary: 'from-primary/20 border-primary/20 text-primary',
    blue: 'from-blue-500/20 border-blue-500/20 text-blue-500',
    amber: 'from-amber-500/20 border-amber-500/20 text-amber-500',
  };

  return (
    <Card
      className={`p-6 bg-gradient-to-br ${tones[tone]} to-transparent cursor-pointer hover:scale-[1.02] transition-transform`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-current/10 rounded-xl">
            <Icon className="text-current" size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-black">{value}</p>
          </div>
        </div>
        <ArrowRight size={20} className="text-muted-foreground" />
      </div>
    </Card>
  );
};
