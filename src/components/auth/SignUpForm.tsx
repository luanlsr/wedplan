import { useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthLayout } from './AuthLayout';
import { Button, Input } from '../ui';
import { ArrowRight, CheckCircle2, CreditCard, Loader2, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SignUpFormProps {
  onSuccess?: () => void;
  onNavigateToLogin: () => void;
}

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  sort_order: number;
};

type BillingInterval = 'monthly' | 'yearly';

const fallbackPlans: Plan[] = [
  {
    id: 'premium',
    code: 'premium',
    name: 'Premium',
    description: 'Gestão completa de convidados, fornecedores, tarefas e financeiro.',
    price_monthly: 24.9,
    price_yearly: 249,
    sort_order: 20,
  },
  {
    id: 'pro_couple',
    code: 'pro_couple',
    name: 'Pro Casal',
    description: 'Inclui site público do casal, RSVP, mensagens e lista de presentes.',
    price_monthly: 39.9,
    price_yearly: 399,
    sort_order: 30,
  },
];

const planHighlights: Record<string, string[]> = {
  essential: ['Até 150 convidados', 'Tarefas e fornecedores', 'Organização essencial'],
  premium: ['Até 500 convidados', 'Financeiro completo', 'Check-in público seguro'],
  pro_couple: ['Site do casal', 'Lista de presentes', 'RSVP e mensagens'],
  pro_agency: ['Múltiplos casamentos', 'Recursos Pro', 'Base para assessorias'],
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const SignUpForm = ({ onNavigateToLogin }: SignUpFormProps) => {
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
  const [planCode, setPlanCode] = useState('pro_couple');
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [successPlan, setSuccessPlan] = useState<string | null>(null);
  const [successValue, setSuccessValue] = useState<number | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      setPlansLoading(true);
      const { data, error: plansError } = await supabase
        .from('plans')
        .select('id, code, name, description, price_monthly, price_yearly, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!plansError && data?.length) {
        setPlans(data as Plan[]);
        if (!data.some((plan: Plan) => plan.code === 'pro_couple')) {
          setPlanCode(data[0].code);
        }
      }

      setPlansLoading(false);
    };

    loadPlans();
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === planCode) || plans[0],
    [plans, planCode]
  );

  const selectedValue = useMemo(() => {
    if (!selectedPlan) return 0;
    if (billingInterval === 'yearly') return selectedPlan.price_yearly || selectedPlan.price_monthly * 12;
    return selectedPlan.price_monthly;
  }, [billingInterval, selectedPlan]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subscription-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          cpfCnpj,
          planCode,
          billingInterval,
          acceptedTerms,
          acceptedPrivacy,
          marketingConsent,
          source: 'signup',
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Não foi possível iniciar o checkout');

      setPaymentUrl(result.paymentUrl || null);
      setSuccessPlan(result.planName || selectedPlan?.name || null);
      setSuccessValue(Number(result.paymentValue || selectedValue));
    } catch (err: any) {
      setError(err.message || 'Não foi possível iniciar o checkout');
    } finally {
      setLoading(false);
    }
  };

  if (successPlan) {
    return (
      <AuthLayout
        title="Checkout iniciado"
        subtitle="Sua conta será criada e liberada automaticamente após a confirmação do primeiro pagamento."
      >
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-6 animate-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-primary/10 text-primary">
            <Mail size={40} />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground font-medium">
              Plano <strong className="text-foreground">{successPlan}</strong> para{' '}
              <strong className="text-foreground">{email}</strong>
            </p>
            {successValue && (
              <p className="text-sm text-muted-foreground">
                Valor da assinatura: <strong className="text-foreground">{formatMoney(successValue)}</strong>{' '}
                {billingInterval === 'yearly' ? 'por ano' : 'por mês'}.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Depois da confirmação do pagamento, enviaremos um e-mail seguro para ativar a conta e definir a senha.
            </p>
          </div>

          {paymentUrl ? (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transition-all"
            >
              Ir para pagamento <ArrowRight size={18} />
            </a>
          ) : (
            <div className="w-full rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm font-bold text-muted-foreground">
              Checkout criado. Se o link de pagamento não aparecer em alguns instantes, entre em contato com o suporte.
            </div>
          )}

          <Button onClick={onNavigateToLogin} variant="outline" className="w-full h-14 rounded-2xl">
            Voltar para o Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Assinar WedPlan"
      subtitle="Escolha seu plano, informe os dados de cobrança e finalize o pagamento com segurança."
    >
      <form onSubmit={handleCheckout} className="space-y-5">
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Plano</label>
            {plansLoading && <Loader2 className="animate-spin text-muted-foreground" size={14} />}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((plan) => {
              const isSelected = plan.code === planCode;
              const value = billingInterval === 'yearly' ? plan.price_yearly || plan.price_monthly * 12 : plan.price_monthly;
              return (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => setPlanCode(plan.code)}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-all',
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                      : 'border-border bg-secondary/30 hover:border-primary/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-foreground">{plan.name}</p>
                      <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">{plan.description}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="shrink-0 text-primary" size={18} />}
                  </div>
                  <p className="mt-4 text-2xl font-black text-foreground">{formatMoney(value)}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {billingInterval === 'yearly' ? 'por ano' : 'por mês'}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 rounded-2xl border border-border bg-secondary/30 p-1">
            <button
              type="button"
              onClick={() => setBillingInterval('monthly')}
              className={cn('h-11 rounded-xl text-xs font-black uppercase tracking-widest', billingInterval === 'monthly' && 'bg-background text-primary shadow-sm')}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval('yearly')}
              className={cn('h-11 rounded-xl text-xs font-black uppercase tracking-widest', billingInterval === 'yearly' && 'bg-background text-primary shadow-sm')}
            >
              Anual
            </button>
          </div>

          {selectedPlan && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <div className="grid gap-2 text-xs font-bold text-muted-foreground">
                {(planHighlights[selectedPlan.code] || []).map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-primary" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <Field label="Nome completo" icon={User}>
          <Input
            type="text"
            placeholder="Ex: Maria Oliveira"
            className="pl-12 h-14 bg-secondary/50 border-white/5 focus:border-primary/50 transition-all rounded-2xl"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </Field>

        <Field label="E-mail" icon={Mail}>
          <Input
            type="email"
            placeholder="exemplo@email.com"
            className="pl-12 h-14 bg-secondary/50 border-white/5 focus:border-primary/50 transition-all rounded-2xl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefone" icon={Phone}>
            <Input
              type="tel"
              placeholder="(00) 00000-0000"
              className="pl-12 h-14 bg-secondary/50 border-white/5 focus:border-primary/50 transition-all rounded-2xl"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </Field>

          <Field label="CPF/CNPJ" icon={CreditCard}>
            <Input
              type="text"
              placeholder="Documento do titular"
              className="pl-12 h-14 bg-secondary/50 border-white/5 focus:border-primary/50 transition-all rounded-2xl"
              value={cpfCnpj}
              onChange={(e) => setCpfCnpj(e.target.value)}
              required
            />
          </Field>
        </div>

        <div className="space-y-3">
          <Checkbox checked={acceptedTerms} onChange={setAcceptedTerms}>
            Li e aceito os Termos de Uso do WedPlan.
          </Checkbox>
          <Checkbox checked={acceptedPrivacy} onChange={setAcceptedPrivacy}>
            Li e aceito a Política de Privacidade e autorizo o tratamento dos dados para criação da assinatura.
          </Checkbox>
          <Checkbox checked={marketingConsent} onChange={setMarketingConsent}>
            Quero receber novidades e ofertas do WedPlan por e-mail.
          </Checkbox>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !acceptedTerms || !acceptedPrivacy}
          className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 group"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <span className="flex items-center gap-2">
              Ir para checkout seguro <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </Button>

        <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
          <span className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/20 px-3 py-2">
            <ShieldCheck size={14} className="text-emerald-600" />
            LGPD
          </span>
          <span className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/20 px-3 py-2">
            <CreditCard size={14} className="text-primary" />
            Asaas
          </span>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Já tem uma conta?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="text-primary font-black hover:underline underline-offset-4"
          >
            Fazer Login
          </button>
        </p>
      </form>
    </AuthLayout>
  );
};

const Field = ({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: ElementType;
  children: ReactNode;
}) => (
  <div className="space-y-2">
    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">{label}</label>
    <div className="relative group">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
      {children}
    </div>
  </div>
);

const Checkbox = ({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) => (
  <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/30 p-4 text-xs font-bold text-muted-foreground">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
    />
    <span>{children}</span>
  </label>
);
