import { useCallback, useEffect, useMemo, useState, type ElementType, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FileText,
  Heart,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  MessageCircleHeart,
  Phone,
  ShieldCheck,
  User,
  Wallet,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthLayout } from './AuthLayout';
import { BrandLogo } from '../layout/BrandLogo';
import { Button, Input } from '../ui';
import { cn } from '../../lib/utils';
import { maskPhone } from '../../utils/masks';
import { getClientEvidence } from '../../utils/clientEvidence';
import { logError, logEvent } from '../../utils/observability';

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
type PaymentMethod = 'credit_card' | 'pix' | 'boleto';
type CheckoutStepId = 'dados-pessoais' | 'casamento' | 'plano' | 'pagamento' | 'sucesso';

type CheckoutState = {
  fullName: string;
  email: string;
  phone: string;
  partnerName: string;
  weddingName: string;
  weddingDate: string;
  weddingCity: string;
  planCode: string;
  billingInterval: BillingInterval;
  cpfCnpj: string;
  paymentMethod: PaymentMethod;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  paymentUrl: string | null;
  checkoutSessionId: string | null;
  successPlan: string | null;
  successValue: number | null;
};

const STORAGE_KEY = 'wedplan_checkout_state_v2';

const checkoutSteps: { id: CheckoutStepId; label: string; shortLabel: string }[] = [
  { id: 'dados-pessoais', label: 'Dados pessoais', shortLabel: 'Conta' },
  { id: 'casamento', label: 'Seu casamento', shortLabel: 'Casamento' },
  { id: 'plano', label: 'Plano', shortLabel: 'Plano' },
  { id: 'pagamento', label: 'Pagamento', shortLabel: 'Pagamento' },
  { id: 'sucesso', label: 'Concluído', shortLabel: 'Pronto' },
];

const fallbackPlans: Plan[] = [
  {
    id: 'essential',
    code: 'essential',
    name: 'Essencial',
    description: 'Checklist, convidados, fornecedores e orçamento para começar bem.',
    price_monthly: 14.9,
    price_yearly: 149,
    sort_order: 10,
  },
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

const initialCheckoutState: CheckoutState = {
  fullName: '',
  email: '',
  phone: '',
  partnerName: '',
  weddingName: '',
  weddingDate: '',
  weddingCity: '',
  planCode: 'pro_couple',
  billingInterval: 'monthly',
  cpfCnpj: '',
  paymentMethod: 'credit_card',
  acceptedTerms: false,
  acceptedPrivacy: false,
  paymentUrl: null,
  checkoutSessionId: null,
  successPlan: null,
  successValue: null,
};

const planHighlights: Record<string, string[]> = {
  essential: ['Checklist', 'Orçamento', 'Convidados', 'Fornecedores'],
  premium: ['Tudo do Essencial', 'Financeiro completo', 'Check-in público seguro', 'Relatórios do evento'],
  pro_couple: ['Tudo do Premium', 'Landing page do casal', 'Lista de presentes', 'RSVP e mensagens'],
  pro_agency: ['Múltiplos casamentos', 'Recursos Pro', 'Base para assessorias'],
};

const normalizePlanCode = (value: string | null) => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'pro') return 'pro_couple';
  if (normalized === 'annual') return 'yearly';
  return normalized;
};

const normalizeBilling = (value: string | null): BillingInterval | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'annual' || normalized === 'yearly' || normalized === 'anual') return 'yearly';
  if (normalized === 'monthly' || normalized === 'mensal') return 'monthly';
  return null;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDate = (value: string) => {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
};

const countDaysUntil = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  const target = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const loadStoredState = (): CheckoutState => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return initialCheckoutState;
    return { ...initialCheckoutState, ...JSON.parse(raw) };
  } catch {
    return initialCheckoutState;
  }
};

const loadInitialCheckoutState = (): CheckoutState => {
  const stored = loadStoredState();
  const params = new URLSearchParams(window.location.search);
  const plan = normalizePlanCode(params.get('plan'));
  const billing = normalizeBilling(params.get('billing'));

  return {
    ...stored,
    ...(plan && plan !== 'yearly' ? { planCode: plan } : {}),
    ...(billing ? { billingInterval: billing } : {}),
  };
};

const getFirstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || '';
const onlyDigits = (value: string) => value.replace(/\D/g, '');
const checkoutFallbackError = 'Não conseguimos iniciar o pagamento agora. Tente novamente em alguns minutos ou fale com o suporte.';

const getResultMessage = (result: unknown, fallback = checkoutFallbackError) => {
  if (!result || typeof result !== 'object') return fallback;
  const payload = result as { userMessage?: unknown; error?: unknown };
  return String(payload.userMessage || payload.error || fallback);
};

const getCheckoutErrorMessage = (result: unknown, fallback = checkoutFallbackError) => {
  const message = getResultMessage(result, fallback);
  const technicalPatterns = [
    'api',
    'asaas',
    'supabase',
    'service_role',
    'invalid key',
    'chave api',
    'not configured',
    'jwt',
    'authorization',
  ];

  if (technicalPatterns.some((pattern) => message.toLowerCase().includes(pattern))) {
    return fallback;
  }

  return message;
};

export const SignUpForm = ({ onNavigateToLogin }: SignUpFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const routeStep = (params.step || 'dados-pessoais') as CheckoutStepId;
  const [checkout, setCheckout] = useState<CheckoutState>(() => loadInitialCheckoutState());
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
  const [plansLoading, setPlansLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const currentStepIndex = Math.max(checkoutSteps.findIndex((step) => step.id === routeStep), 0);
  const progress = ((currentStepIndex + 1) / checkoutSteps.length) * 100;

  const updateCheckout = useCallback((patch: Partial<CheckoutState>) => {
    setCheckout((current) => ({ ...current, ...patch }));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const plan = normalizePlanCode(params.get('plan'));
    const billing = normalizeBilling(params.get('billing'));

    if (plan || billing) {
      navigate('/checkout/dados-pessoais', { replace: true });
    }
  }, [location.search, navigate]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(checkout));
  }, [checkout]);

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
      }

      setPlansLoading(false);
    };

    loadPlans();
  }, []);

  useEffect(() => {
    if (routeStep === 'sucesso' && checkout.paymentUrl) {
      const timer = window.setTimeout(() => {
        confetti({
          particleCount: 70,
          spread: 52,
          ticks: 120,
          origin: { y: 0.62 },
          colors: ['#c87c73', '#ffffff', '#8fc7b5', '#f1d8cf'],
        });
      }, 250);
      return () => window.clearTimeout(timer);
    }
  }, [checkout.paymentUrl, routeStep]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.code === checkout.planCode) || plans[0],
    [checkout.planCode, plans]
  );

  const selectedValue = useMemo(() => {
    if (!selectedPlan) return 0;
    if (checkout.billingInterval === 'yearly') return selectedPlan.price_yearly || selectedPlan.price_monthly * 12;
    return selectedPlan.price_monthly;
  }, [checkout.billingInterval, selectedPlan]);

  const nextBillingDate = useMemo(() => {
    const next = new Date();
    next.setMonth(next.getMonth() + (checkout.billingInterval === 'yearly' ? 12 : 1));
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(next);
  }, [checkout.billingInterval]);

  const completedSteps = useMemo(() => ({
    'dados-pessoais': isPersonalComplete(checkout),
    casamento: isWeddingComplete(checkout),
    plano: Boolean(checkout.planCode),
    pagamento: Boolean(checkout.paymentUrl || checkout.checkoutSessionId),
    sucesso: Boolean(checkout.paymentUrl),
  }), [checkout]);

  const firstIncompleteStep = useMemo(() => {
    if (!completedSteps['dados-pessoais']) return 'dados-pessoais';
    if (!completedSteps.casamento) return 'casamento';
    if (!completedSteps.plano) return 'plano';
    if (!completedSteps.pagamento) return 'pagamento';
    return 'sucesso';
  }, [completedSteps]);
  const maxAccessibleStepIndex = checkoutSteps.findIndex((step) => step.id === firstIncompleteStep);

  useEffect(() => {
    if (!loading) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [loading]);

  useEffect(() => {
    if (!checkoutSteps.some((step) => step.id === routeStep)) {
      navigate('/checkout/dados-pessoais', { replace: true });
      return;
    }

    const targetIndex = checkoutSteps.findIndex((step) => step.id === routeStep);
    const allowedIndex = checkoutSteps.findIndex((step) => step.id === firstIncompleteStep);
    if (targetIndex > allowedIndex) {
      navigate(`/checkout/${firstIncompleteStep}`, { replace: true });
    }
  }, [firstIncompleteStep, navigate, routeStep]);

  const goToStep = (step: CheckoutStepId) => {
    navigate(`/checkout/${step}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNext = () => {
    setError(null);

    if (routeStep === 'dados-pessoais') {
      const validation = validatePersonal(checkout);
      if (validation) return setError(validation);
      const partnerName = checkout.partnerName || getFirstName(checkout.fullName);
      const patch: Partial<CheckoutState> = {};
      if (!checkout.partnerName && partnerName) patch.partnerName = partnerName;
      if (!checkout.weddingName && partnerName) patch.weddingName = buildWeddingName(partnerName, '');
      if (Object.keys(patch).length) updateCheckout(patch);
      return goToStep('casamento');
    }

    if (routeStep === 'casamento') {
      const validation = validateWedding(checkout);
      if (validation) return setError(validation);
      return goToStep('plano');
    }

    if (routeStep === 'plano') {
      if (!checkout.planCode) return setError('Escolha um plano para continuar.');
      return goToStep('pagamento');
    }
  };

  const goBack = () => {
    const previous = checkoutSteps[currentStepIndex - 1];
    if (previous) goToStep(previous.id);
  };

  const startCheckout = async () => {
    setLoading(true);
    setError(null);
    const startedAt = performance.now();

    try {
      const personalValidation = validatePersonal(checkout);
      const weddingValidation = validateWedding(checkout);
      if (personalValidation) throw new Error(personalValidation);
      if (weddingValidation) throw new Error(weddingValidation);
      if (!checkout.acceptedTerms || !checkout.acceptedPrivacy) {
        throw new Error('Aceite os Termos de Uso e a Política de Privacidade para continuar.');
      }

      void logEvent({
        eventName: 'checkout.subscription.started',
        metadata: {
          planCode: checkout.planCode,
          billingInterval: checkout.billingInterval,
          paymentMethod: checkout.paymentMethod,
          source: 'checkout_multistep',
        },
      });

      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subscription-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabaseAnonKey ? { Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey } : {}),
        },
        body: JSON.stringify({
          fullName: checkout.fullName,
          email: checkout.email,
          phone: checkout.phone,
          cpfCnpj: checkout.cpfCnpj || undefined,
          planCode: checkout.planCode,
          billingInterval: checkout.billingInterval,
          acceptedTerms: checkout.acceptedTerms,
          acceptedPrivacy: checkout.acceptedPrivacy,
          clientEvidence: getClientEvidence(),
          source: 'checkout_multistep',
          weddingDraft: {
            partnerName: checkout.partnerName,
            weddingName: checkout.weddingName,
            weddingDate: checkout.weddingDate,
            weddingCity: checkout.weddingCity,
          },
          paymentMethod: checkout.paymentMethod,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(getCheckoutErrorMessage(result));

      void logEvent({
        eventName: 'checkout.subscription.created',
        entityType: 'checkout_session',
        entityId: result.checkoutSessionId || null,
        durationMs: performance.now() - startedAt,
        metadata: {
          planCode: result.planCode || checkout.planCode,
          billingInterval: result.billingInterval || checkout.billingInterval,
          hasPaymentUrl: Boolean(result.paymentUrl),
          paymentValue: Number(result.paymentValue || selectedValue),
        },
      });

      updateCheckout({
        paymentUrl: result.paymentUrl || null,
        checkoutSessionId: result.checkoutSessionId || null,
        successPlan: result.planName || selectedPlan?.name || null,
        successValue: Number(result.paymentValue || selectedValue),
      });
      goToStep('sucesso');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível iniciar o checkout';
      logError('checkout.subscription.error', err, {
        planCode: checkout.planCode,
        billingInterval: checkout.billingInterval,
        paymentMethod: checkout.paymentMethod,
        durationMs: performance.now() - startedAt,
      });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (routeStep === 'sucesso' && !checkout.paymentUrl) {
    return <Navigate to={`/checkout/${firstIncompleteStep}`} replace />;
  }

  const isPlanStep = routeStep === 'plano';

  return (
    <AuthLayout
      className="h-full max-w-[1500px]"
      contentClassName="flex h-[calc(100dvh-1rem)] max-h-[820px] flex-col overflow-hidden sm:h-[calc(100dvh-1.5rem)] lg:h-[calc(100dvh-2rem)]"
      title={checkoutSteps[currentStepIndex]?.label || 'Checkout'}
      subtitle="Um fluxo guiado para criar seu espaço, escolher o plano e iniciar a assinatura."
      compact
      hideBrand
      hideFooter
      showHeading={false}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <CheckoutProgress
          currentStepIndex={currentStepIndex}
          maxAccessibleStepIndex={maxAccessibleStepIndex}
          progress={progress}
          onStepClick={goToStep}
          onNavigateToLogin={onNavigateToLogin}
        />

        <div className="shrink-0 lg:hidden">
          <button
            type="button"
            onClick={() => setSummaryOpen((open) => !open)}
            className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-3 text-left shadow-sm"
          >
            <span>
              <span className="block text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Resumo da assinatura</span>
              <span className="mt-1 block text-lg font-black text-foreground">{formatMoney(selectedValue)}</span>
            </span>
            <ChevronDown className={cn('text-muted-foreground transition-transform', summaryOpen && 'rotate-180')} size={20} />
          </button>
          {summaryOpen && (
            <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <CheckoutSummary
                checkout={checkout}
                plan={selectedPlan}
                selectedValue={selectedValue}
                nextBillingDate={nextBillingDate}
                currentStep={routeStep}
              />
            </div>
          )}
        </div>

        <div className={cn(
          "grid min-h-0 flex-1 gap-3 lg:gap-4",
          isPlanStep ? "lg:grid-cols-1" : "lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,0.65fr)]"
        )}>
          <main className={cn(
            "flex min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:p-5",
            isPlanStep && "lg:p-4"
          )}>
            <div className="min-h-0 flex-1 overflow-hidden animate-in fade-in slide-in-from-right-3 duration-300">
              {routeStep === 'dados-pessoais' && (
                <PersonalStep checkout={checkout} updateCheckout={updateCheckout} />
              )}
              {routeStep === 'casamento' && (
                <WeddingStep checkout={checkout} updateCheckout={updateCheckout} />
              )}
              {routeStep === 'plano' && (
                <PlanStep
                  checkout={checkout}
                  plans={plans}
                  plansLoading={plansLoading}
                  updateCheckout={updateCheckout}
                />
              )}
              {routeStep === 'pagamento' && (
                <PaymentStep
                  checkout={checkout}
                  updateCheckout={updateCheckout}
                />
              )}
              {routeStep === 'sucesso' && (
                <SuccessStep checkout={checkout} selectedPlan={selectedPlan} selectedValue={selectedValue} />
              )}
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-bold text-destructive">
                {error}
              </div>
            )}

            {routeStep !== 'sucesso' && (
              <div className="mt-3 flex shrink-0 flex-col-reverse gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={currentStepIndex === 0 ? onNavigateToLogin : goBack}
                  className="h-11 rounded-xl px-5"
                  disabled={loading}
                >
                  <ArrowLeft size={17} />
                  {currentStepIndex === 0 ? 'Já possuo conta' : 'Voltar'}
                </Button>

                {routeStep === 'pagamento' ? (
                  <Button
                    type="button"
                    onClick={startCheckout}
                    disabled={loading || !checkout.acceptedTerms || !checkout.acceptedPrivacy}
                    className="h-11 rounded-xl px-5 font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Processando pagamento...
                      </>
                    ) : (
                      <>
                        Assinar WedPlan por {formatMoney(selectedValue)}
                        <ArrowRight size={17} />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={goNext}
                    className="h-11 rounded-xl px-5 font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                  >
                    {routeStep === 'casamento' ? 'Escolher meu plano' : routeStep === 'plano' ? 'Continuar para pagamento' : 'Continuar'}
                    <ArrowRight size={17} />
                  </Button>
                )}
              </div>
            )}
          </main>

          <aside className={cn("hidden min-h-0 lg:block", isPlanStep && "lg:hidden")}>
            <div className="h-full">
              <CheckoutSummary
                checkout={checkout}
                plan={selectedPlan}
                selectedValue={selectedValue}
                nextBillingDate={nextBillingDate}
                currentStep={routeStep}
              />
            </div>
          </aside>
        </div>
      </div>
    </AuthLayout>
  );
};

const PersonalStep = ({
  checkout,
  updateCheckout,
}: {
  checkout: CheckoutState;
  updateCheckout: (patch: Partial<CheckoutState>) => void;
}) => (
  <StepShell
    eyebrow="Identidade"
    title="Vamos começar por você"
    description="Crie sua conta para começar a organizar tudo em um só lugar."
    icon={User}
  >
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nome completo" icon={User} className="sm:col-span-2">
        <Input
          type="text"
          autoComplete="name"
          placeholder="Ex: Maria Oliveira"
          className="h-14 rounded-xl bg-background pl-12"
          value={checkout.fullName}
          onChange={(e) => updateCheckout({ fullName: e.target.value })}
          required
        />
      </Field>

      <Field label="E-mail" icon={Mail}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="exemplo@email.com"
          className="h-14 rounded-xl bg-background pl-12"
          value={checkout.email}
          onChange={(e) => updateCheckout({ email: e.target.value.toLowerCase() })}
          required
        />
      </Field>

      <Field label="Telefone" icon={Phone}>
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(00) 00000-0000"
          maxLength={15}
          className="h-14 rounded-xl bg-background pl-12"
          value={checkout.phone}
          onChange={(e) => updateCheckout({ phone: maskPhone(e.target.value) })}
          required
        />
      </Field>
    </div>

    <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm font-black text-foreground">Sua senha será definida com segurança após o pagamento.</p>
      <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
        Para proteger o fluxo de assinatura, a conta só é criada quando o pagamento for confirmado pelo Asaas.
      </p>
    </div>
  </StepShell>
);

const WeddingStep = ({
  checkout,
  updateCheckout,
}: {
  checkout: CheckoutState;
  updateCheckout: (patch: Partial<CheckoutState>) => void;
}) => {
  const daysUntil = countDaysUntil(checkout.weddingDate);
  const firstName = getFirstName(checkout.fullName);

  const updateNames = (patch: Partial<CheckoutState>) => {
    const next = { ...checkout, ...patch };
    const generated = buildWeddingName(next.partnerName || firstName, next.weddingName.includes('&') ? next.weddingName.split('&')[1]?.trim() || '' : '');
    updateCheckout({ ...patch, weddingName: patch.weddingName ?? (checkout.weddingName ? checkout.weddingName : generated) });
  };

  return (
    <StepShell
      eyebrow="Casamento"
      title="Conte um pouco sobre o grande dia"
      description="Essas informações ajudam o WedPlan a personalizar seu planejamento."
      icon={Heart}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Seu nome" icon={User}>
          <Input
            type="text"
            autoComplete="given-name"
            placeholder="Ex: Luan"
            className="h-14 rounded-xl bg-background pl-12"
            value={checkout.partnerName || firstName}
            onChange={(e) => updateNames({ partnerName: e.target.value })}
            required
          />
        </Field>

        <Field label="Nome do parceiro(a)" icon={Heart}>
          <Input
            type="text"
            placeholder="Ex: Laís"
            className="h-14 rounded-xl bg-background pl-12"
            value={getPartnerFromWeddingName(checkout)}
            onChange={(e) => {
              const partner = e.target.value;
              updateCheckout({
                weddingName: buildWeddingName(checkout.partnerName || firstName, partner),
              });
            }}
            required
          />
        </Field>

        <Field label="Como devemos chamar o casamento?" icon={MessageCircleHeart} className="sm:col-span-2">
          <Input
            type="text"
            placeholder="Ex: Luan & Laís"
            className="h-14 rounded-xl bg-background pl-12"
            value={checkout.weddingName}
            onChange={(e) => updateCheckout({ weddingName: e.target.value })}
            required
          />
        </Field>

        <Field label="Data do casamento" icon={Calendar}>
          <Input
            type="date"
            className="h-14 rounded-xl bg-background pl-12"
            value={checkout.weddingDate}
            onChange={(e) => updateCheckout({ weddingDate: e.target.value })}
            required
          />
        </Field>

        <Field label="Cidade" icon={MapPin}>
          <Input
            type="text"
            placeholder="Ex: Araçatuba, SP"
            className="h-14 rounded-xl bg-background pl-12"
            value={checkout.weddingCity}
            onChange={(e) => updateCheckout({ weddingCity: e.target.value })}
          />
        </Field>
      </div>

      {daysUntil !== null && (
        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
          <p className="text-sm font-black text-foreground">
            {daysUntil >= 0 ? `Faltam ${daysUntil} dias para o grande dia.` : 'Essa data já passou.'}
          </p>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Vamos preparar seu workspace com prioridades, convidados, fornecedores e financeiro.
          </p>
        </div>
      )}
    </StepShell>
  );
};

const PlanStep = ({
  checkout,
  plans,
  plansLoading,
  updateCheckout,
}: {
  checkout: CheckoutState;
  plans: Plan[];
  plansLoading: boolean;
  updateCheckout: (patch: Partial<CheckoutState>) => void;
}) => (
  <section className="flex h-full min-h-0 flex-col">
    <div className="mb-3 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Assinatura</p>
        <h2 className="mt-1 text-2xl font-black tracking-normal text-foreground sm:text-3xl">Escolha seu plano</h2>
      </div>
      <div className="grid w-full grid-cols-2 rounded-2xl border border-border bg-background p-1 sm:w-64">
        <button
          type="button"
          onClick={() => updateCheckout({ billingInterval: 'monthly' })}
          className={cn(
            'h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
            checkout.billingInterval === 'monthly' && 'bg-primary text-white shadow-sm'
          )}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => updateCheckout({ billingInterval: 'yearly' })}
          className={cn(
            'h-10 rounded-xl text-xs font-black uppercase tracking-widest transition-all',
            checkout.billingInterval === 'yearly' && 'bg-primary text-white shadow-sm'
          )}
        >
          Anual
        </button>
      </div>
      {plansLoading && (
        <span className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground">
          <Loader2 className="animate-spin" size={14} />
          Carregando planos
        </span>
      )}
    </div>

    <div className="grid min-h-0 flex-1 auto-rows-fr gap-3 [grid-template-columns:repeat(auto-fit,minmax(215px,1fr))] 2xl:[grid-template-columns:repeat(auto-fit,minmax(235px,1fr))]">
      {plans.map((plan) => {
        const isSelected = plan.code === checkout.planCode;
        const value = checkout.billingInterval === 'yearly' ? plan.price_yearly || plan.price_monthly * 12 : plan.price_monthly;
        const monthlyEquivalent = checkout.billingInterval === 'yearly' ? value / 12 : value;
        const annualSavings = plan.price_yearly ? (plan.price_monthly * 12) - plan.price_yearly : 0;
        const highlights = (planHighlights[plan.code] || []).slice(0, 3);

        return (
          <button
            key={plan.code}
            type="button"
            onClick={() => updateCheckout({ planCode: plan.code })}
            className={cn(
              'relative flex min-h-0 flex-col rounded-2xl border p-4 text-left transition-all',
              isSelected ? 'border-primary bg-primary/10 shadow-xl shadow-primary/10' : 'border-border bg-background hover:border-primary/40'
            )}
          >
            <div className="mb-2 flex min-h-6 items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">{plan.name}</p>
              {plan.code === 'pro_couple' && (
                <span className="shrink-0 rounded-lg bg-primary px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-white">
                  Pro
                </span>
              )}
            </div>

            <h3 className="text-base font-black leading-[1.35] text-foreground">
              {getPlanHeadline(plan.code, plan.name)}
            </h3>

            <div className="my-3">
              <p className="text-2xl font-black leading-none text-foreground">{formatMoney(value)}</p>
              <p className="mt-1 text-[11px] font-bold text-muted-foreground">
                {checkout.billingInterval === 'yearly' ? `${formatMoney(monthlyEquivalent)}/mês no anual` : 'por mês'}
              </p>
              {checkout.billingInterval === 'yearly' && annualSavings > 0 && (
                <p className="mt-1 text-[11px] font-black leading-4 text-emerald-600">
                  Economize {formatMoney(annualSavings)}
                </p>
              )}
            </div>

            <ul className="grid gap-1.5">
              {highlights.map((item) => (
                <li key={item} className="flex gap-2 text-xs font-bold leading-5 text-muted-foreground">
                  <Check size={15} className="mt-0.5 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <span className={cn(
              'mt-auto flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-[10px] font-black uppercase tracking-[0.1em] transition-all',
              isSelected ? 'bg-primary text-white' : 'border border-border text-foreground'
            )}>
              {isSelected ? (
                <>
                  <CheckCircle2 size={15} />
                  Selecionado
                </>
              ) : (
                'Escolher'
              )}
            </span>
          </button>
        );
      })}
    </div>

  </section>
);

const PaymentStep = ({
  checkout,
  updateCheckout,
}: {
  checkout: CheckoutState;
  updateCheckout: (patch: Partial<CheckoutState>) => void;
}) => (
  <StepShell
    eyebrow="Pagamento"
    title="Finalize sua assinatura"
    description="Você está a um passo de começar seu planejamento no WedPlan."
    icon={CreditCard}
  >
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        { id: 'credit_card', label: 'Cartão', icon: CreditCard },
        { id: 'pix', label: 'PIX', icon: Wallet },
        { id: 'boleto', label: 'Boleto', icon: FileText },
      ].map((method) => (
        <button
          key={method.id}
          type="button"
          onClick={() => updateCheckout({ paymentMethod: method.id as PaymentMethod })}
          className={cn(
            'flex h-16 items-center justify-center gap-2 rounded-2xl border text-sm font-black transition-all',
            checkout.paymentMethod === method.id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'
          )}
        >
          <method.icon size={18} />
          {method.label}
        </button>
      ))}
    </div>

    <div className="mt-5 rounded-2xl border border-border bg-background p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LockKeyhole size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-foreground">Pagamento seguro via Asaas</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
            O WedPlan não coleta número do cartão, CVV, senha bancária ou chave Pix. Ao assinar, você será direcionado para o checkout seguro do Asaas.
          </p>
        </div>
      </div>
    </div>

    <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-foreground">Teste sem risco por 7 dias</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
            Assine agora e use todos os recursos. Se dentro de 7 dias você decidir que o WedPlan não é para você, basta solicitar o cancelamento e o reembolso.
          </p>
        </div>
      </div>
    </div>

    <div className="mt-4 space-y-2.5">
      <Checkbox checked={checkout.acceptedTerms} onChange={(acceptedTerms) => updateCheckout({ acceptedTerms })}>
        Li e aceito os <LegalLink to="/termos-de-uso">Termos de Uso</LegalLink> do WedPlan.
      </Checkbox>
      <Checkbox checked={checkout.acceptedPrivacy} onChange={(acceptedPrivacy) => updateCheckout({ acceptedPrivacy })}>
        Li e aceito a <LegalLink to="/politica-de-privacidade">Política de Privacidade</LegalLink> e estou ciente do tratamento de dados necessário para cadastro, assinatura, segurança e comprovação do aceite.
      </Checkbox>
    </div>

    <p className="mt-3 text-center text-xs font-bold leading-5 text-muted-foreground">
      Ao continuar, registraremos data e hora, IP, dispositivo, navegador, versão dos documentos aceitos e início da janela de 7 dias para fins de segurança, auditoria e exercício regular de direitos.
    </p>
  </StepShell>
);

const SuccessStep = ({
  checkout,
  selectedPlan,
  selectedValue,
}: {
  checkout: CheckoutState;
  selectedPlan: Plan;
  selectedValue: number;
}) => (
  <div className="flex h-full min-h-0 flex-col items-center justify-center text-center">
    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
      <CheckCircle2 size={48} />
    </div>
    <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-primary">Checkout pronto</p>
    <h2 className="mt-2 text-4xl font-black tracking-normal text-foreground">
      Tudo pronto, {getFirstName(checkout.fullName) || 'casal'}.
    </h2>
    <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-muted-foreground">
      Seu espaço WedPlan foi preparado. Finalize o pagamento no Asaas e, após a confirmação, enviaremos o e-mail seguro para ativar a conta.
    </p>

    <div className="mt-8 grid w-full max-w-2xl gap-3 rounded-2xl border border-border bg-background p-5 text-left sm:grid-cols-2">
      <SummaryItem label="Casamento" value={checkout.weddingName || 'Não informado'} />
      <SummaryItem label="Data" value={formatDate(checkout.weddingDate) || 'Não informada'} />
      <SummaryItem label="Plano" value={checkout.successPlan || selectedPlan?.name || 'WedPlan'} />
      <SummaryItem label="Total hoje" value={formatMoney(checkout.successValue || selectedValue)} />
    </div>

    <div className="mt-8 flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
      {checkout.paymentUrl && (
        <a
          href={checkout.paymentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 transition-colors hover:bg-primary/90"
        >
          Ir para pagamento
          <ArrowRight size={18} />
        </a>
      )}
      <Link
        to="/login"
        className="flex h-14 flex-1 items-center justify-center rounded-2xl border border-border bg-card px-6 text-sm font-black uppercase tracking-widest text-foreground transition-colors hover:bg-accent"
      >
        Entrar no meu WedPlan
      </Link>
    </div>
  </div>
);

const CheckoutProgress = ({
  currentStepIndex,
  maxAccessibleStepIndex,
  progress,
  onStepClick,
  onNavigateToLogin,
}: {
  currentStepIndex: number;
  maxAccessibleStepIndex: number;
  progress: number;
  onStepClick: (step: CheckoutStepId) => void;
  onNavigateToLogin: () => void;
}) => (
  <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="flex items-center justify-between gap-3 lg:w-56 lg:shrink-0">
        <Link to="/" className="flex items-center">
          <BrandLogo size="sm" />
        </Link>
        <button
          type="button"
          onClick={onNavigateToLogin}
          className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-primary lg:hidden"
        >
          Entrar
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Etapa {currentStepIndex + 1} de 5</p>
            <h2 className="truncate text-base font-black text-foreground sm:text-lg">{checkoutSteps[currentStepIndex]?.label}</h2>
          </div>
          <span className="text-xs font-black text-muted-foreground">{Math.round(progress)}%</span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-2 hidden items-center gap-2 md:flex">
          {checkoutSteps.map((step, index) => {
            const isCurrent = index === currentStepIndex;
            const isDone = index < currentStepIndex || (index < maxAccessibleStepIndex && !isCurrent);
            const canClick = index <= maxAccessibleStepIndex;

            return (
              <div key={step.id} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  disabled={!canClick}
                  onClick={() => canClick && onStepClick(step.id)}
                  className={cn(
                    'flex min-w-0 items-center gap-2 rounded-xl px-2 py-1 text-left transition-all',
                    isCurrent && 'bg-primary/10 text-primary',
                    !isCurrent && isDone && 'text-foreground hover:bg-accent',
                    !isCurrent && !isDone && 'cursor-not-allowed text-muted-foreground/60'
                  )}
                >
                  <span className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-black',
                    isDone ? 'border-primary bg-primary text-white' : isCurrent ? 'border-primary text-primary' : 'border-border text-muted-foreground'
                  )}>
                    {isDone ? <Check size={13} /> : index + 1}
                  </span>
                  <span className="truncate text-[10px] font-black uppercase tracking-[0.1em]">{step.shortLabel}</span>
                </button>
                {index < checkoutSteps.length - 1 && <div className={cn('h-px flex-1', index < currentStepIndex ? 'bg-primary' : 'bg-border')} />}
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onNavigateToLogin}
        className="hidden h-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background px-4 text-xs font-black uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-accent lg:flex"
      >
        Já possui conta?
      </button>
    </div>
  </div>
);

const CheckoutSummary = ({
  checkout,
  plan,
  selectedValue,
  nextBillingDate,
  currentStep,
}: {
  checkout: CheckoutState;
  plan: Plan;
  selectedValue: number;
  nextBillingDate: string;
  currentStep: CheckoutStepId;
}) => {
  const daysUntil = countDaysUntil(checkout.weddingDate);

  return (
    <div className="h-full overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-primary/10 p-5">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
          {currentStep === 'dados-pessoais' ? 'Seu casamento' : currentStep === 'pagamento' ? 'Seu pedido' : 'Resumo'}
        </p>
        <h3 className="mt-2 text-xl font-black text-foreground">
          {checkout.weddingName || 'Seu casamento, organizado de verdade.'}
        </h3>
        <p className="mt-2 text-xs font-medium leading-5 text-muted-foreground">
          {checkout.weddingDate ? formatDate(checkout.weddingDate) : 'Planejamento, orçamento, convidados, fornecedores e cronograma em um só lugar.'}
        </p>
      </div>

      <div className="space-y-4 p-5">
        {currentStep === 'dados-pessoais' ? (
          <ul className="grid gap-2.5 text-sm font-bold text-muted-foreground">
            {['Planejamento', 'Orçamento', 'Convidados', 'Fornecedores', 'Cronograma'].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <CheckCircle2 size={17} className="text-primary" />
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="grid gap-3">
              <SummaryItem label="Plano" value={plan?.name || 'WedPlan'} />
              <SummaryItem label="Assinatura" value={checkout.billingInterval === 'yearly' ? 'Anual' : 'Mensal'} />
              {checkout.weddingCity && <SummaryItem label="Cidade" value={checkout.weddingCity} />}
              {daysUntil !== null && (
                <SummaryItem label="Contagem" value={daysUntil >= 0 ? `${daysUntil} dias para o casamento` : 'Data passada'} />
              )}
            </div>

            <div className="border-y border-border py-4">
              <div className="flex items-center justify-between text-sm font-bold text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatMoney(selectedValue)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm font-bold text-muted-foreground">
                <span>Desconto</span>
                <span>{formatMoney(0)}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Total hoje</p>
              <p className="mt-1 text-3xl font-black text-foreground">{formatMoney(selectedValue)}</p>
              <p className="mt-2 text-xs font-bold text-muted-foreground">Próxima cobrança: {nextBillingDate}</p>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold leading-5 text-muted-foreground">
              <ShieldCheck className="mb-2 text-emerald-600" size={18} />
              Teste sem risco por 7 dias. Solicite cancelamento e reembolso dentro desse período.
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const StepShell = ({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ElementType;
  children: ReactNode;
}) => (
  <section className="flex h-full min-h-0 flex-col">
    <div className="mb-5 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon size={23} />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-black tracking-normal text-foreground sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
    <div className="min-h-0 flex-1">
      {children}
    </div>
  </section>
);

const Field = ({
  label,
  icon: Icon,
  children,
  className,
}: {
  label: string;
  icon: ElementType;
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn('space-y-2', className)}>
    <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">{label}</label>
    <div className="relative group">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={18} />
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
  <label className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4 text-xs font-bold text-muted-foreground">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
    />
    <span>{children}</span>
  </label>
);

const LegalLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link
    to={to}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(event) => event.stopPropagation()}
    className="text-primary underline underline-offset-4 hover:text-primary/80"
  >
    {children}
  </Link>
);

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-black text-foreground">{value}</p>
  </div>
);

const validatePersonal = (checkout: CheckoutState) => {
  if (!checkout.fullName.trim()) return 'Informe seu nome completo.';
  if (!checkout.email.trim() || !checkout.email.includes('@')) return 'Informe um e-mail válido.';
  if (onlyDigits(checkout.phone).length < 10) return 'Informe um telefone válido.';
  return null;
};

const validateWedding = (checkout: CheckoutState) => {
  if (!checkout.partnerName.trim()) return 'Informe seu nome para o casamento.';
  if (!getPartnerFromWeddingName(checkout).trim()) return 'Informe o nome do parceiro(a).';
  if (!checkout.weddingName.trim()) return 'Informe como devemos chamar o casamento.';
  if (!checkout.weddingDate) return 'Informe a data do casamento.';
  return null;
};

const isPersonalComplete = (checkout: CheckoutState) => !validatePersonal(checkout);
const isWeddingComplete = (checkout: CheckoutState) => !validateWedding(checkout);

const buildWeddingName = (nameOne: string, nameTwo: string) => {
  const first = nameOne.trim();
  const second = nameTwo.trim();
  if (first && second) return `${first} & ${second}`;
  return first || second;
};

const getPartnerFromWeddingName = (checkout: CheckoutState) => {
  const parts = checkout.weddingName.split('&');
  return parts[1]?.trim() || '';
};

const getPlanHeadline = (code: string, fallback: string) => {
  const headlines: Record<string, string> = {
    essential: 'Para organizar o essencial sem planilhas soltas',
    premium: 'Para controlar toda a operação do casamento',
    pro_couple: 'Para ter site, RSVP, presentes e experiência completa',
    pro_agency: 'Para assessorias que gerenciam múltiplos eventos',
  };

  return headlines[code] || fallback;
};
