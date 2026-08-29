import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CakeSlice,
  CalendarCheck2,
  Calculator,
  ChevronRight,
  Hotel,
  Plus,
  Trash2,
  Users,
  Utensils,
  Wine,
} from 'lucide-react';
import { Button, Card, Input, cn } from '../ui';
import { setPageMetadata } from '../../utils/meta';

type ToolId = 'custo-casamento' | 'checklist' | 'bebidas' | 'buffet' | 'convidados' | 'lua-de-mel' | 'doces-bolo';

const tools: Array<{ id: ToolId; title: string; subtitle: string; icon: typeof Calculator; meta: string }> = [
  { id: 'custo-casamento', title: 'Calculadora de casamento', subtitle: 'Estimativa rápida por convidados e orçamento.', icon: Calculator, meta: 'Descubra quanto pode custar seu casamento e veja como controlar o orçamento.' },
  { id: 'checklist', title: 'Checklist por data', subtitle: 'Cronograma automático até o grande dia.', icon: CalendarCheck2, meta: 'Informe a data do casamento e gere um checklist personalizado.' },
  { id: 'bebidas', title: 'Calculadora de bebidas', subtitle: 'Cerveja, vinho, espumante, água e refrigerante.', icon: Wine, meta: 'Calcule quantidades aproximadas de bebidas para a festa.' },
  { id: 'buffet', title: 'Calculadora de buffet', subtitle: 'Estimativa de comida por número de convidados.', icon: Utensils, meta: 'Tenha uma base de buffet para almoço, jantar ou coquetel.' },
  { id: 'convidados', title: 'Lista de convidados gratuita', subtitle: 'Comece a organizar nomes e categorias agora.', icon: Users, meta: 'Monte uma primeira lista de convidados antes de criar sua conta.' },
  { id: 'lua-de-mel', title: 'Calculadora de lua de mel', subtitle: 'Viagem, hospedagem e gastos por casal.', icon: Hotel, meta: 'Estime o orçamento da lua de mel por destino e duração.' },
  { id: 'doces-bolo', title: 'Doces, bolo e bem-casados', subtitle: 'Quantidade ideal para a festa.', icon: CakeSlice, meta: 'Calcule bolo, doces finos e bem-casados para seus convidados.' },
];

const getTool = (id?: string) => tools.find((tool) => tool.id === id) || tools[0];
const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
const number = (value: number) => new Intl.NumberFormat('pt-BR').format(Math.max(0, Math.round(value)));
const positive = (value: string, fallback = 0) => Math.max(0, Number(value) || fallback);

export const FreeWeddingTools = () => {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const activeTool = getTool(toolId);
  const ActiveIcon = activeTool.icon;

  useEffect(() => {
    setPageMetadata({
      title: `${activeTool.title} grátis | WedPlan`,
      description: activeTool.meta,
      image: '/image/wedplan_logo.png',
      url: window.location.href,
    });
  }, [activeTool]);

  const startCheckout = () => {
    navigate(`/checkout/dados-pessoais?source=ferramenta-gratuita&tool=${activeTool.id}`);
  };

  return (
    <div className="min-h-screen bg-[#fdfaf4] text-[#263317]">
      <header className="sticky top-0 z-30 border-b border-[#2d3820]/10 bg-[#fdfaf4]/88 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Link to="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2d3820] text-sm font-black text-white">W</span>
            <div>
              <p className="text-sm font-black">WedPlan</p>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c5a059]">Ferramentas gratuitas</p>
            </div>
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/')} className="h-10 rounded-xl border-[#2d3820]/15 bg-white px-4 text-xs">
              Ver sistema
            </Button>
            <Button onClick={startCheckout} className="h-10 rounded-xl bg-[#2d3820] px-4 text-xs">
              Criar meu casamento grátis
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[310px_1fr]">
        <aside className="h-fit rounded-2xl border border-[#2d3820]/10 bg-white p-3 shadow-sm">
          <p className="px-2 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#8a7b60]">Escolha uma ferramenta</p>
          <div className="grid gap-2">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const active = tool.id === activeTool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => navigate(`/ferramentas/${tool.id}`)}
                  className={cn('flex items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[#f7f0e4]', active && 'bg-[#2d3820] text-white hover:bg-[#2d3820]')}
                >
                  <Icon size={18} className={active ? 'text-[#c5a059]' : 'text-[#8a7b60]'} />
                  <span className="min-w-0">
                    <span className="block text-sm font-black">{tool.title}</span>
                    <span className={cn('block text-xs font-medium', active ? 'text-white/65' : 'text-[#6a6a60]')}>{tool.subtitle}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] bg-[#2d3820] text-white shadow-xl">
            <div className="grid gap-8 p-6 lg:grid-cols-[1fr_auto] lg:p-9">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#c5a059]">Planeje antes de assinar</p>
                <h1 className="mt-3 text-4xl font-black leading-none sm:text-5xl">{activeTool.title}</h1>
                <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-white/70">{activeTool.meta}</p>
              </div>
              <div className="flex h-24 w-24 items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/10">
                <ActiveIcon size={42} className="text-[#c5a059]" />
              </div>
            </div>
          </div>

          <ToolContent toolId={activeTool.id} onStart={startCheckout} />
        </section>
      </main>
    </div>
  );
};

const ToolContent = ({ toolId, onStart }: { toolId: ToolId; onStart: () => void }) => {
  if (toolId === 'checklist') return <ChecklistTool onStart={onStart} />;
  if (toolId === 'bebidas') return <DrinksTool onStart={onStart} />;
  if (toolId === 'buffet') return <BuffetTool onStart={onStart} />;
  if (toolId === 'convidados') return <GuestListTool onStart={onStart} />;
  if (toolId === 'lua-de-mel') return <HoneymoonTool onStart={onStart} />;
  if (toolId === 'doces-bolo') return <SweetsTool onStart={onStart} />;
  return <BudgetTool onStart={onStart} />;
};

const ResultCard = ({ title, value, helper }: { title: string; value: string; helper?: string }) => (
  <div className="rounded-2xl border border-[#2d3820]/10 bg-white p-4 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a7b60]">{title}</p>
    <p className="mt-2 text-2xl font-black text-[#2d3820]">{value}</p>
    {helper && <p className="mt-2 text-xs font-medium leading-5 text-[#6a6a60]">{helper}</p>}
  </div>
);

const LeadCta = ({ onStart, children }: { onStart: () => void; children: string }) => (
  <Card className="border-[#c5a059]/25 bg-[#2d3820] p-5 text-white">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#c5a059]">Próximo passo</p>
        <p className="mt-2 text-lg font-black">{children}</p>
      </div>
      <Button onClick={onStart} className="h-12 rounded-xl bg-white px-5 text-[#2d3820] hover:bg-[#f8f1e6]">
        Criar meu casamento grátis <ChevronRight size={16} />
      </Button>
    </div>
  </Card>
);

const BudgetTool = ({ onStart }: { onStart: () => void }) => {
  const [guests, setGuests] = useState('150');
  const [budget, setBudget] = useState('60000');
  const guestCount = positive(guests, 150);
  const plannedBudget = positive(budget, 0);
  const estimate = useMemo(() => {
    const base = guestCount * 360 + 18000;
    return {
      lean: base * 0.78,
      expected: base,
      premium: base * 1.48,
      perGuest: base / Math.max(guestCount, 1),
      gap: plannedBudget ? plannedBudget - base : 0,
    };
  }, [guestCount, plannedBudget]);

  return (
    <div className="space-y-5">
      <Card className="grid gap-4 p-5 md:grid-cols-2">
        <Field label="Quantidade de convidados">
          <Input value={guests} onChange={(event) => setGuests(event.target.value)} inputMode="numeric" />
        </Field>
        <Field label="Orçamento disponível">
          <Input value={budget} onChange={(event) => setBudget(event.target.value)} inputMode="numeric" />
        </Field>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        <ResultCard title="Enxuto" value={currency(estimate.lean)} />
        <ResultCard title="Provável" value={currency(estimate.expected)} helper={`${currency(estimate.perGuest)} por convidado`} />
        <ResultCard title="Premium" value={currency(estimate.premium)} />
        <ResultCard title="Diferença" value={currency(estimate.gap)} helper={estimate.gap >= 0 ? 'Seu orçamento cobre a estimativa provável.' : 'Vale controlar cada contrato de perto.'} />
      </div>
      <LeadCta onStart={onStart}>Quer controlar esse orçamento por fornecedor, parcelas e pagamentos reais?</LeadCta>
    </div>
  );
};

const ChecklistTool = ({ onStart }: { onStart: () => void }) => {
  const [date, setDate] = useState('2027-11-07');
  const monthsLeft = useMemo(() => {
    const target = new Date(`${date}T12:00:00`);
    const now = new Date();
    return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  }, [date]);
  const items = [
    { when: '12+ meses', task: 'Definir orçamento, estilo do casamento e lista inicial de convidados.' },
    { when: '10 meses', task: 'Reservar espaço, cerimônia, buffet e fotografia.' },
    { when: '8 meses', task: 'Escolher vestido/traje, identidade visual e fornecedores principais.' },
    { when: '6 meses', task: 'Enviar save the date, montar site do casal e iniciar presentes.' },
    { when: '4 meses', task: 'Fechar decoração, música, doces, bolo e bebidas.' },
    { when: '2 meses', task: 'Confirmar presenças, ajustar layout de mesas e revisar contratos.' },
    { when: '30 dias', task: 'Conferir pagamentos, roteiro do dia e detalhes finais.' },
  ];

  return (
    <div className="space-y-5">
      <Card className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-end">
        <Field label="Data do casamento">
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <ResultCard title="Tempo restante" value={`${monthsLeft} meses`} />
      </Card>
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.when} className="flex gap-4 rounded-2xl border border-[#2d3820]/10 bg-white p-4">
            <span className="flex h-11 w-24 shrink-0 items-center justify-center rounded-xl bg-[#f7f0e4] text-xs font-black text-[#8a6b2d]">{item.when}</span>
            <p className="text-sm font-bold leading-6 text-[#2d3820]">{item.task}</p>
          </div>
        ))}
      </div>
      <LeadCta onStart={onStart}>No WedPlan, esse cronograma vira tarefas reais com responsáveis e status.</LeadCta>
    </div>
  );
};

const DrinksTool = ({ onStart }: { onStart: () => void }) => {
  const [guests, setGuests] = useState('150');
  const [hours, setHours] = useState('5');
  const guestCount = positive(guests, 150);
  const duration = positive(hours, 5);
  const factor = duration / 5;

  return (
    <CalculatorShell guests={guests} setGuests={setGuests} extra={<Field label="Duração da festa em horas"><Input value={hours} onChange={(event) => setHours(event.target.value)} inputMode="numeric" /></Field>} onStart={onStart}>
      <ResultCard title="Cerveja long neck" value={`${number(guestCount * 2.4 * factor)} un.`} />
      <ResultCard title="Vinho" value={`${number(guestCount / 6)} garrafas`} />
      <ResultCard title="Espumante" value={`${number(guestCount / 8)} garrafas`} />
      <ResultCard title="Água + refri" value={`${number(guestCount * 0.9 * factor)} litros`} />
    </CalculatorShell>
  );
};

const BuffetTool = ({ onStart }: { onStart: () => void }) => {
  const [guests, setGuests] = useState('150');
  const guestCount = positive(guests, 150);
  return (
    <CalculatorShell guests={guests} setGuests={setGuests} onStart={onStart}>
      <ResultCard title="Prato principal" value={`${number(guestCount * 0.45)} kg`} helper="Base combinada de proteínas e massas." />
      <ResultCard title="Entradas" value={`${number(guestCount * 8)} un.`} />
      <ResultCard title="Guarnições" value={`${number(guestCount * 0.18)} kg`} />
      <ResultCard title="Equipe sugerida" value={`${number(Math.max(4, guestCount / 25))} pessoas`} />
    </CalculatorShell>
  );
};

const HoneymoonTool = ({ onStart }: { onStart: () => void }) => {
  const [nights, setNights] = useState('7');
  const [daily, setDaily] = useState('900');
  const [tickets, setTickets] = useState('2500');
  const total = positive(nights, 7) * positive(daily, 900) + positive(tickets, 2500);
  return (
    <div className="space-y-5">
      <Card className="grid gap-4 p-5 md:grid-cols-3">
        <Field label="Noites"><Input value={nights} onChange={(event) => setNights(event.target.value)} inputMode="numeric" /></Field>
        <Field label="Gasto diário do casal"><Input value={daily} onChange={(event) => setDaily(event.target.value)} inputMode="numeric" /></Field>
        <Field label="Passagens/transporte"><Input value={tickets} onChange={(event) => setTickets(event.target.value)} inputMode="numeric" /></Field>
      </Card>
      <ResultCard title="Estimativa da lua de mel" value={currency(total)} helper="Inclui diária média do casal e transporte." />
      <LeadCta onStart={onStart}>Transforme lua de mel, presentes e orçamento em um único planejamento.</LeadCta>
    </div>
  );
};

const SweetsTool = ({ onStart }: { onStart: () => void }) => {
  const [guests, setGuests] = useState('150');
  const guestCount = positive(guests, 150);
  return (
    <CalculatorShell guests={guests} setGuests={setGuests} onStart={onStart}>
      <ResultCard title="Doces finos" value={`${number(guestCount * 6)} un.`} />
      <ResultCard title="Bem-casados" value={`${number(guestCount * 1.25)} un.`} />
      <ResultCard title="Bolo" value={`${number(guestCount * 0.1)} kg`} />
      <ResultCard title="Sobremesa extra" value={`${number(guestCount * 0.7)} porções`} />
    </CalculatorShell>
  );
};

const CalculatorShell = ({ guests, setGuests, extra, children, onStart }: { guests: string; setGuests: (value: string) => void; extra?: ReactNode; children: ReactNode; onStart: () => void }) => (
  <div className="space-y-5">
    <Card className="grid gap-4 p-5 md:grid-cols-2">
      <Field label="Quantidade de convidados">
        <Input value={guests} onChange={(event) => setGuests(event.target.value)} inputMode="numeric" />
      </Field>
      {extra || <div className="rounded-2xl border border-dashed border-[#2d3820]/10 bg-[#f8f1e6] p-4 text-sm font-bold text-[#6a6a60]">Use como ponto de partida e valide com seu fornecedor.</div>}
    </Card>
    <div className="grid gap-4 md:grid-cols-4">{children}</div>
    <LeadCta onStart={onStart}>Salve estes números e acompanhe fornecedores, pagamentos e convidados no WedPlan.</LeadCta>
  </div>
);

const GuestListTool = ({ onStart }: { onStart: () => void }) => {
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
      <Card className="grid gap-3 p-5 md:grid-cols-[1fr_170px_auto]">
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome do convidado" />
        <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="h-11 rounded-xl border border-border bg-card px-3 text-sm font-bold outline-none">
          <option value="adulto">Adulto</option>
          <option value="crianca">Criança</option>
          <option value="staff">Staff</option>
        </select>
        <Button onClick={addGuest} className="h-11 rounded-xl bg-[#2d3820]">
          <Plus size={16} /> Adicionar
        </Button>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        <ResultCard title="Total" value={String(counts.total)} />
        <ResultCard title="Adultos" value={String(counts.adults)} />
        <ResultCard title="Crianças" value={String(counts.children)} />
        <ResultCard title="Staff" value={String(counts.staff)} />
      </div>
      <Card className="p-4">
        {guests.length === 0 ? (
          <p className="text-center text-sm font-medium text-[#6a6a60]">Adicione alguns convidados para começar.</p>
        ) : (
          <div className="grid gap-2">
            {guests.map((guest) => (
              <div key={guest.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#2d3820]/10 bg-[#fdfaf4] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#2d3820]">{guest.name}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a7b60]">{guest.type}</p>
                </div>
                <button onClick={() => setGuests((current) => current.filter((item) => item.id !== guest.id))} className="flex h-9 w-9 items-center justify-center rounded-xl text-red-600 hover:bg-red-50">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
      <LeadCta onStart={onStart}>Crie sua conta para importar essa lógica para RSVP, check-in e dashboard de convidados.</LeadCta>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="space-y-2">
    <span className="ml-1 block text-[10px] font-black uppercase tracking-[0.18em] text-[#8a7b60]">{label}</span>
    {children}
  </label>
);
