import { useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CakeSlice,
  CalendarCheck2,
  Calculator,
  CheckCircle2,
  Crown,
  DollarSign,
  Hotel,
  LockKeyhole,
  Plus,
  TrendingUp,
  Trash2,
  Users,
  Utensils,
  Wine,
} from 'lucide-react';
import { differenceInDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';
import { logEvent } from '../../utils/observability';
import { Badge, Button, Card, Input, cn } from '../ui';
import type { Supplier, Task, WeddingData } from '../../types';

type LoggedWeddingToolsProps = {
  data: WeddingData;
};

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const number = (value: number) =>
  new Intl.NumberFormat('pt-BR').format(Math.max(0, Math.round(value || 0)));

const getMonthKey = (date: string) => {
  try {
    return format(parseISO(date), 'MMM/yy', { locale: ptBR });
  } catch {
    return 'Sem data';
  }
};

const isActiveSubscriber = (data: WeddingData) =>
  ['active', 'trialing'].includes(String(data.plan_status || data.account_status || ''));

const getExpectedPeople = (data: WeddingData) =>
  (data.convidados || []).reduce((total, guest) => total + Number(guest.adultos || 0) + Number(guest.criancas || 0), 0);

const routeToToolId = (toolId?: string) => {
  const map: Record<string, string> = {
    'custo-casamento': 'quick_budget',
    checklist: 'quick_checklist',
    bebidas: 'quick_drinks',
    buffet: 'quick_buffet',
    convidados: 'quick_guests',
    'doces-bolo': 'quick_sweets',
    'lua-de-mel': 'quick_honeymoon',
    orcamento: 'budget',
    pagamentos: 'cashflow',
    'raio-x-convidados': 'guests',
    'plano-acao': 'timeline',
  };

  return toolId ? map[toolId] || 'quick_budget' : 'quick_budget';
};

export const LoggedWeddingTools = ({ data }: LoggedWeddingToolsProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toolId } = useParams();
  const { subscription, hasFeature } = usePlanFeatures();
  const pathToolId = location.pathname.split('/ferramentas/')[1]?.split('/')[0];
  const activeTool = routeToToolId(toolId || pathToolId);
  const subscriber = isActiveSubscriber(data) || Boolean(subscription);
  const premiumEnabled = subscriber && (hasFeature('premium_tools') || Boolean(subscription));
  const advancedEnabled = subscriber && (hasFeature('advanced_tools') || subscription?.plan?.code !== 'essential');

  const tools = [
    {
      id: 'quick_budget',
      routeId: 'custo-casamento',
      title: 'Calculadora de custo',
      subtitle: 'Estimativa rápida por convidados.',
      icon: Calculator,
      premium: false,
      enabled: true,
    },
    {
      id: 'quick_checklist',
      routeId: 'checklist',
      title: 'Checklist por data',
      subtitle: 'Cronograma automático até o grande dia.',
      icon: CalendarCheck2,
      premium: false,
      enabled: true,
    },
    {
      id: 'quick_drinks',
      routeId: 'bebidas',
      title: 'Calculadora de bebidas',
      subtitle: 'Quantidade por duração da festa.',
      icon: Wine,
      premium: false,
      enabled: true,
    },
    {
      id: 'quick_buffet',
      routeId: 'buffet',
      title: 'Calculadora de buffet',
      subtitle: 'Estimativa simples de comida.',
      icon: Utensils,
      premium: false,
      enabled: true,
    },
    {
      id: 'quick_guests',
      routeId: 'convidados',
      title: 'Lista de convidados',
      subtitle: 'Rascunho rápido antes do RSVP.',
      icon: Users,
      premium: false,
      enabled: true,
    },
    {
      id: 'quick_sweets',
      routeId: 'doces-bolo',
      title: 'Doces, bolo e bem-casados',
      subtitle: 'Quantidades rápidas para a festa.',
      icon: CakeSlice,
      premium: false,
      enabled: true,
    },
    {
      id: 'quick_honeymoon',
      routeId: 'lua-de-mel',
      title: 'Lua de mel',
      subtitle: 'Estimativa simples da viagem.',
      icon: Hotel,
      premium: false,
      enabled: true,
    },
    {
      id: 'budget',
      routeId: 'orcamento',
      title: 'Saúde do orçamento',
      subtitle: 'Contratado, pago e saldo.',
      icon: DollarSign,
      premium: true,
      enabled: premiumEnabled,
    },
    {
      id: 'cashflow',
      routeId: 'pagamentos',
      title: 'Fluxo de pagamentos',
      subtitle: 'Próximos vencimentos por mês.',
      icon: TrendingUp,
      premium: true,
      enabled: premiumEnabled,
    },
    {
      id: 'guests',
      routeId: 'raio-x-convidados',
      title: 'Raio-x de convidados',
      subtitle: 'Confirmados, pendentes e meia.',
      icon: Users,
      premium: true,
      enabled: premiumEnabled,
    },
    {
      id: 'timeline',
      routeId: 'plano-acao',
      title: 'Plano de ação',
      subtitle: 'Prioridades até o casamento.',
      icon: CalendarCheck2,
      premium: true,
      enabled: advancedEnabled,
    },
  ];

  const selectedTool = tools.find((tool) => tool.id === activeTool) || tools[0];
  const SelectedIcon = selectedTool.icon;

  const selectTool = (nextToolId: string, routeId: string) => {
    navigate(`/ferramentas/${routeId}`);
    void logEvent({
      eventName: 'tools.logged_tool_selected',
      metadata: { toolId: nextToolId, weddingId: data.id },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-primary">
            <Calculator size={14} />
            Central de ferramentas
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Ferramentas do casamento</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
            Use os dados já cadastrados para tomar decisões melhores sobre orçamento, convidados, pagamentos e próximos passos.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit rounded-2xl border border-border bg-card p-3 shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100dvh-12rem)] lg:overflow-hidden">
          <p className="px-2 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Ferramentas</p>
          <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1 custom-scrollbar lg:max-h-[calc(100dvh-18rem)]">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const active = tool.id === selectedTool.id;

              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => selectTool(tool.id, tool.routeId)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-accent',
                    active && 'bg-primary text-white hover:bg-primary'
                  )}
                >
                  <Icon size={18} className={active ? 'text-white' : 'text-primary'} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-black">
                      {tool.title}
                      {tool.premium && <Crown size={13} className={active ? 'text-white' : 'text-amber-500'} />}
                    </span>
                    <span className={cn('block text-xs font-medium', active ? 'text-white/75' : 'text-muted-foreground')}>{tool.subtitle}</span>
                  </span>
                  {!tool.enabled && <LockKeyhole size={15} className={active ? 'text-white/80' : 'text-muted-foreground'} />}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3 text-xs font-medium leading-5 text-muted-foreground">
            As ferramentas gratuitas fazem estimativas rápidas. As premium usam os dados reais já cadastrados no casamento.
          </div>
        </aside>

        <section className="min-w-0">
          <Card className="flex max-h-[72vh] flex-col overflow-hidden border-border bg-card lg:max-h-[calc(100dvh-12rem)]">
            <div className="shrink-0 border-b border-border bg-secondary/30 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <SelectedIcon size={22} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground">{selectedTool.title}</h2>
                    <p className="text-sm font-medium text-muted-foreground">{selectedTool.subtitle}</p>
                  </div>
                </div>
                <Badge variant={selectedTool.enabled ? 'success' : 'warning'}>
                  {selectedTool.enabled ? 'Liberado' : 'Premium'}
                </Badge>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 custom-scrollbar">
              {!selectedTool.enabled ? (
                <LockedTool planCode={subscription?.plan?.code} />
              ) : activeTool === 'quick_budget' ? (
                <QuickBudgetTool data={data} />
              ) : activeTool === 'quick_checklist' ? (
                <QuickChecklistTool data={data} />
              ) : activeTool === 'quick_drinks' ? (
                <QuickDrinksTool data={data} />
              ) : activeTool === 'quick_buffet' ? (
                <QuickBuffetTool data={data} />
              ) : activeTool === 'quick_guests' ? (
                <QuickGuestListTool />
              ) : activeTool === 'quick_sweets' ? (
                <QuickSweetsTool data={data} />
              ) : activeTool === 'quick_honeymoon' ? (
                <QuickHoneymoonTool />
              ) : activeTool === 'budget' ? (
                <BudgetHealthTool data={data} />
              ) : activeTool === 'cashflow' ? (
                <CashflowTool suppliers={data.fornecedores || []} />
              ) : activeTool === 'guests' ? (
                <GuestInsightsTool data={data} />
              ) : (
                <TimelineTool data={data} />
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
};

const QuickBudgetTool = ({ data }: { data: WeddingData }) => {
  const [guests, setGuests] = useState(String(getExpectedPeople(data) || 150));
  const guestCount = Math.max(0, Number(guests) || 0);
  const base = guestCount * 360 + 18000;

  return (
    <div className="space-y-5">
      <Card className="grid gap-4 border-border bg-secondary/20 p-5 md:grid-cols-[1fr_auto] md:items-end">
        <Field label="Pessoas previstas">
          <Input value={guests} onChange={(event) => setGuests(event.target.value)} inputMode="numeric" className="rounded-xl bg-background" />
        </Field>
        <Link to="/financeiro" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-black uppercase tracking-widest text-white">
          Abrir financeiro
          <ArrowRight size={15} />
        </Link>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Enxuto" value={money(base * 0.78)} />
        <Metric label="Provável" value={money(base)} />
        <Metric label="Premium" value={money(base * 1.48)} />
      </div>
      <p className="rounded-2xl border border-border bg-secondary/20 p-4 text-sm font-medium leading-6 text-muted-foreground">
        Estimativa comercial para começar a conversa. Para gestão real, use a ferramenta premium de saúde do orçamento com os fornecedores cadastrados.
      </p>
    </div>
  );
};

const QuickChecklistTool = ({ data }: { data: WeddingData }) => {
  const initialDate = data.casal.data || '2027-11-07';
  const [date, setDate] = useState(initialDate);
  const monthsLeft = useMemo(() => {
    const target = new Date(`${date}T12:00:00`);
    const now = new Date();
    return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  }, [date]);
  const items = [
    { when: '12+ meses', task: 'Definir orçamento, estilo do casamento e lista inicial de convidados.' },
    { when: '10 meses', task: 'Reservar espaço, cerimônia, buffet e fotografia.' },
    { when: '8 meses', task: 'Escolher vestido ou traje, identidade visual e fornecedores principais.' },
    { when: '6 meses', task: 'Enviar save the date, montar site do casal e iniciar lista de presentes.' },
    { when: '4 meses', task: 'Fechar decoração, música, doces, bolo e bebidas.' },
    { when: '2 meses', task: 'Confirmar presenças, revisar contratos e ajustar layout de mesas.' },
    { when: '30 dias', task: 'Conferir pagamentos, roteiro do dia e detalhes finais.' },
  ];

  return (
    <div className="space-y-5">
      <Card className="grid gap-4 border-border bg-secondary/20 p-5 md:grid-cols-[1fr_auto] md:items-end">
        <Field label="Data do casamento">
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-xl bg-background" />
        </Field>
        <Metric label="Tempo restante" value={`${number(monthsLeft)} meses`} />
      </Card>
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.when} className="flex gap-4 rounded-2xl border border-border bg-secondary/20 p-4">
            <span className="flex h-11 w-24 shrink-0 items-center justify-center rounded-xl bg-background text-xs font-black text-primary">{item.when}</span>
            <p className="text-sm font-bold leading-6 text-foreground">{item.task}</p>
          </div>
        ))}
      </div>
      <p className="rounded-2xl border border-border bg-secondary/20 p-4 text-sm font-medium leading-6 text-muted-foreground">
        No painel completo, transforme esses marcos em tarefas reais com status, categorias e datas de vencimento.
      </p>
    </div>
  );
};

const QuickDrinksTool = ({ data }: { data: WeddingData }) => {
  const [guests, setGuests] = useState(String(getExpectedPeople(data) || 150));
  const [hours, setHours] = useState('5');
  const guestCount = Math.max(0, Number(guests) || 0);
  const duration = Math.max(1, Number(hours) || 1);

  return (
    <div className="space-y-5">
      <Card className="grid gap-4 border-border bg-secondary/20 p-5 md:grid-cols-2">
        <Field label="Pessoas previstas">
          <Input value={guests} onChange={(event) => setGuests(event.target.value)} inputMode="numeric" className="rounded-xl bg-background" />
        </Field>
        <Field label="Duração da festa em horas">
          <Input value={hours} onChange={(event) => setHours(event.target.value)} inputMode="numeric" className="rounded-xl bg-background" />
        </Field>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Cerveja" value={`${number(guestCount * duration * 0.55)} long necks`} />
        <Metric label="Vinho" value={`${number(guestCount / 6)} garrafas`} />
        <Metric label="Espumante" value={`${number(guestCount / 8)} garrafas`} />
        <Metric label="Água/refri" value={`${number(guestCount * duration * 0.45)} unidades`} />
      </div>
    </div>
  );
};

const QuickBuffetTool = ({ data }: { data: WeddingData }) => {
  const [guests, setGuests] = useState(String(getExpectedPeople(data) || 150));
  const guestCount = Math.max(0, Number(guests) || 0);

  return (
    <div className="space-y-5">
      <Card className="border-border bg-secondary/20 p-5">
        <Field label="Pessoas previstas">
          <Input value={guests} onChange={(event) => setGuests(event.target.value)} inputMode="numeric" className="max-w-sm rounded-xl bg-background" />
        </Field>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Entradas" value={`${number(guestCount * 8)} un.`} />
        <Metric label="Prato principal" value={`${number(guestCount * 0.55)} kg`} />
        <Metric label="Guarnições" value={`${number(guestCount * 0.35)} kg`} />
        <Metric label="Equipe" value={`${number(Math.ceil(guestCount / 25))} pessoas`} />
      </div>
    </div>
  );
};

const QuickGuestListTool = () => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'adulto' | 'crianca' | 'staff'>('adulto');
  const [guests, setGuests] = useState<Array<{ id: string; name: string; type: 'adulto' | 'crianca' | 'staff' }>>([]);
  const addGuest = () => {
    if (name.trim().length < 2) return;
    setGuests((current) => [...current, { id: crypto.randomUUID(), name: name.trim(), type }]);
    setName('');
  };
  const counts = {
    total: guests.length,
    adults: guests.filter((guest) => guest.type === 'adulto').length,
    children: guests.filter((guest) => guest.type === 'crianca').length,
    staff: guests.filter((guest) => guest.type === 'staff').length,
  };

  return (
    <div className="space-y-5">
      <Card className="grid gap-3 border-border bg-secondary/20 p-5 md:grid-cols-[1fr_170px_auto]">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do convidado" className="rounded-xl bg-background" />
        <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="h-11 rounded-xl border border-border bg-background px-3 text-sm font-bold outline-none">
          <option value="adulto">Adulto</option>
          <option value="crianca">Criança</option>
          <option value="staff">Staff</option>
        </select>
        <Button onClick={addGuest} className="h-11 rounded-xl">
          <Plus size={16} /> Adicionar
        </Button>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Total" value={String(counts.total)} />
        <Metric label="Adultos" value={String(counts.adults)} />
        <Metric label="Crianças" value={String(counts.children)} />
        <Metric label="Staff" value={String(counts.staff)} />
      </div>
      <Card className="border-border bg-secondary/20 p-4">
        {guests.length === 0 ? (
          <EmptyState text="Adicione alguns convidados para começar." />
        ) : (
          <div className="grid gap-2">
            {guests.map((guest) => (
              <div key={guest.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-foreground">{guest.name}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{guest.type}</p>
                </div>
                <button onClick={() => setGuests((current) => current.filter((item) => item.id !== guest.id))} className="flex h-9 w-9 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Link to="/convidados" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-black uppercase tracking-widest text-white">
        Abrir lista completa
        <ArrowRight size={15} />
      </Link>
    </div>
  );
};

const QuickSweetsTool = ({ data }: { data: WeddingData }) => {
  const [guests, setGuests] = useState(String(getExpectedPeople(data) || 150));
  const guestCount = Math.max(0, Number(guests) || 0);

  return (
    <div className="space-y-5">
      <Card className="border-border bg-secondary/20 p-5">
        <Field label="Pessoas previstas">
          <Input value={guests} onChange={(event) => setGuests(event.target.value)} inputMode="numeric" className="max-w-sm rounded-xl bg-background" />
        </Field>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Doces finos" value={`${number(guestCount * 5)} un.`} />
        <Metric label="Bem-casados" value={`${number(guestCount * 1.3)} un.`} />
        <Metric label="Bolo" value={`${number(guestCount * 0.1)} kg`} />
        <Metric label="Sobremesa" value={`${number(guestCount * 0.8)} porções`} />
      </div>
    </div>
  );
};

const QuickHoneymoonTool = () => {
  const [nights, setNights] = useState('6');
  const [daily, setDaily] = useState('650');
  const [tickets, setTickets] = useState('2500');
  const total = Math.max(0, Number(nights) || 0) * Math.max(0, Number(daily) || 0) + Math.max(0, Number(tickets) || 0);

  return (
    <div className="space-y-5">
      <Card className="grid gap-4 border-border bg-secondary/20 p-5 md:grid-cols-3">
        <Field label="Noites">
          <Input value={nights} onChange={(event) => setNights(event.target.value)} inputMode="numeric" className="rounded-xl bg-background" />
        </Field>
        <Field label="Gasto médio por dia">
          <Input value={daily} onChange={(event) => setDaily(event.target.value)} inputMode="numeric" className="rounded-xl bg-background" />
        </Field>
        <Field label="Passagens/transporte">
          <Input value={tickets} onChange={(event) => setTickets(event.target.value)} inputMode="numeric" className="rounded-xl bg-background" />
        </Field>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Hospedagem e dias" value={money(Number(nights || 0) * Number(daily || 0))} />
        <Metric label="Transporte" value={money(Number(tickets || 0))} />
        <Metric label="Estimativa total" value={money(total)} />
      </div>
    </div>
  );
};

const BudgetHealthTool = ({ data }: { data: WeddingData }) => {
  const suppliers = data.fornecedores || [];
  const budget = data.configuracoes.orcamentoTotal || 0;
  const contracted = suppliers.reduce((total, supplier) => total + Number(supplier.valorTotal || 0), 0);
  const paid = suppliers.reduce((total, supplier) => (
    total + supplier.parcelas.reduce((subtotal, installment) => subtotal + (installment.status === 'pago' ? Number(installment.valor || 0) : 0), 0)
  ), 0);
  const pending = Math.max(contracted - paid, 0);
  const remainingBudget = budget - contracted;
  const usage = budget ? Math.min((contracted / budget) * 100, 140) : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Orçamento" value={money(budget)} />
        <Metric label="Contratado" value={money(contracted)} />
        <Metric label="Pago" value={money(paid)} />
        <Metric label="A pagar" value={money(pending)} />
      </div>
      <div className="rounded-2xl border border-border bg-secondary/20 p-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-black text-foreground">Uso do orçamento</p>
          <p className={cn('text-sm font-black', remainingBudget >= 0 ? 'text-emerald-600' : 'text-destructive')}>
            {remainingBudget >= 0 ? `${money(remainingBudget)} livres` : `${money(Math.abs(remainingBudget))} acima`}
          </p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-background">
          <div className={cn('h-full rounded-full', usage > 100 ? 'bg-destructive' : 'bg-primary')} style={{ width: `${Math.min(usage, 100)}%` }} />
        </div>
        <p className="mt-4 text-sm font-medium leading-6 text-muted-foreground">
          {usage > 100
            ? 'O orçamento já foi ultrapassado. Revise categorias com maior peso ou ajuste o orçamento real do evento.'
            : usage > 80
              ? 'O orçamento está bem comprometido. Novos contratos precisam entrar com bastante critério.'
              : 'Ainda existe margem para novas decisões sem pressionar tanto o orçamento.'}
        </p>
      </div>
    </div>
  );
};

const CashflowTool = ({ suppliers }: { suppliers: Supplier[] }) => {
  const rows = useMemo(() => {
    const byMonth = new Map<string, number>();
    suppliers.forEach((supplier) => {
      supplier.parcelas
        .filter((installment) => installment.status !== 'pago')
        .forEach((installment) => {
          const key = getMonthKey(installment.dataVencimento);
          byMonth.set(key, (byMonth.get(key) || 0) + Number(installment.valor || 0));
        });
    });

    return Array.from(byMonth.entries())
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [suppliers]);

  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.month} className="rounded-2xl border border-border bg-secondary/20 p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-black capitalize text-foreground">{row.month}</p>
            <p className="text-sm font-black text-primary">{money(row.value)}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
      {rows.length === 0 && <EmptyState text="Nenhuma parcela pendente encontrada." />}
    </div>
  );
};

const GuestInsightsTool = ({ data }: { data: WeddingData }) => {
  const guests = data.convidados || [];
  const confirmed = guests.filter((guest) => guest.status === 'confirmado').length;
  const pending = guests.filter((guest) => guest.status === 'pendente').length;
  const adults = guests.reduce((total, guest) => total + Number(guest.adultos || 0), 0);
  const children = guests.reduce((total, guest) => total + Number(guest.criancas || 0), 0);
  const staff = guests.filter((guest) => guest.categoria?.toLowerCase() === 'staff').length;
  const halfCount = children + staff;
  const expectedPeople = guests.reduce((total, guest) => total + Number(guest.adultos || 0) + Number(guest.criancas || 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Convidados" value={number(guests.length)} />
        <Metric label="Pessoas previstas" value={number(expectedPeople)} />
        <Metric label="Confirmados" value={number(confirmed)} />
        <Metric label="Meia" value={number(halfCount)} />
      </div>
      <div className="rounded-2xl border border-border bg-secondary/20 p-5">
        <p className="text-sm font-black text-foreground">Leitura rápida</p>
        <ul className="mt-4 grid gap-3 text-sm font-medium text-muted-foreground md:grid-cols-2">
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={16} /> {number(adults)} adultos previstos para buffet.</li>
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={16} /> {number(children)} crianças entram no total e na lista de meia.</li>
          <li className="flex gap-2"><AlertTriangle className="mt-0.5 shrink-0 text-amber-500" size={16} /> {number(pending)} convites ainda pendentes de resposta.</li>
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={16} /> {number(staff)} registros classificados como staff.</li>
        </ul>
      </div>
    </div>
  );
};

const TimelineTool = ({ data }: { data: WeddingData }) => {
  const tasks = data.tarefas || [];
  const today = new Date();
  const weddingDate = data.casal.data ? parseISO(data.casal.data) : null;
  const daysUntil = weddingDate ? differenceInDays(weddingDate, today) : null;
  const overdue = tasks.filter((task) => task.status !== 'concluido' && task.dataLimite && differenceInDays(parseISO(task.dataLimite), today) < 0);
  const upcoming = tasks
    .filter((task) => task.status !== 'concluido' && task.dataLimite && differenceInDays(parseISO(task.dataLimite), today) >= 0)
    .sort((a, b) => String(a.dataLimite).localeCompare(String(b.dataLimite)))
    .slice(0, 5);
  const completion = tasks.length ? (tasks.filter((task) => task.status === 'concluido').length / tasks.length) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Faltam" value={daysUntil === null ? '-' : `${number(daysUntil)} dias`} />
        <Metric label="Progresso" value={`${number(completion)}%`} />
        <Metric label="Atrasadas" value={number(overdue.length)} />
      </div>
      <TaskList title="Próximas prioridades" tasks={upcoming} empty="Nenhuma tarefa futura cadastrada." />
      <TaskList title="Atenção imediata" tasks={overdue.slice(0, 5)} empty="Nenhuma tarefa atrasada. Bonito de ver." tone="warning" />
    </div>
  );
};

const TaskList = ({ title, tasks, empty, tone = 'default' }: { title: string; tasks: Task[]; empty: string; tone?: 'default' | 'warning' }) => (
  <div className="rounded-2xl border border-border bg-secondary/20 p-5">
    <p className="text-sm font-black text-foreground">{title}</p>
    <div className="mt-4 grid gap-3">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center justify-between gap-4 rounded-xl bg-background p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-foreground">{task.titulo}</p>
            <p className="text-xs font-bold text-muted-foreground">{task.categoria}</p>
          </div>
          <Badge variant={tone === 'warning' ? 'warning' : 'outline'}>{task.dataLimite ? new Date(task.dataLimite).toLocaleDateString('pt-BR') : 'Sem data'}</Badge>
        </div>
      ))}
      {tasks.length === 0 && <EmptyState text={empty} />}
    </div>
  </div>
);

const LockedTool = ({ planCode }: { planCode?: string }) => (
  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6">
    <div className="flex items-start gap-4">
      <div className="rounded-xl bg-amber-500/15 p-3 text-amber-600">
        <LockKeyhole size={22} />
      </div>
      <div>
        <h3 className="text-lg font-black text-foreground">Ferramenta premium</h3>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">
          {planCode === 'essential'
            ? 'Esta ferramenta faz parte dos recursos avançados. Faça upgrade para Premium ou Pro Casal para liberar análises mais completas.'
            : 'Ative uma assinatura para liberar ferramentas inteligentes baseadas nos dados do seu casamento.'}
        </p>
        <Link to="/configuracoes" className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-black uppercase tracking-widest text-white">
          Ver upgrade
          <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  </div>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-border bg-secondary/20 p-4">
    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <div className="rounded-xl border border-dashed border-border bg-background p-5 text-center text-sm font-bold text-muted-foreground">
    {text}
  </div>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="grid gap-2">
    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
    {children}
  </label>
);
