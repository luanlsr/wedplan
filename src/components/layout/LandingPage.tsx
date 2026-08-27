import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck2,
  Check,
  ChevronRight,
  ClipboardList,
  Heart,
  LayoutDashboard,
  LockKeyhole,
  PieChart,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "../ui";
import { cn } from "../../lib/utils";

type LandingPageProps = {
  onLogin: () => void;
  onGetStarted: () => void;
};

const metrics = [
  { value: "R$ 84k", label: "orçamento rastreado" },
  { value: "126", label: "convidados organizados" },
  { value: "18", label: "contratos em dia" },
];

const productCards = [
  {
    icon: Wallet,
    label: "Financeiro",
    value: "74%",
    caption: "do orçamento pago",
    color: "bg-emerald-500/15 text-emerald-600",
  },
  {
    icon: Users,
    label: "Convidados",
    value: "92",
    caption: "confirmados",
    color: "bg-sky-500/15 text-sky-600",
  },
  {
    icon: CalendarCheck2,
    label: "Tarefas",
    value: "31",
    caption: "concluídas",
    color: "bg-amber-500/15 text-amber-600",
  },
];

const features = [
  {
    icon: Users,
    title: "Lista de convidados sem planilha solta",
    description: "RSVP, acompanhantes, crianças, grupos e check-in do dia em uma visão única.",
  },
  {
    icon: Wallet,
    title: "Controle financeiro que conversa com fornecedores",
    description: "Parcelas, vencimentos, valores pagos e saldo restante sempre conectados ao contrato.",
  },
  {
    icon: ClipboardList,
    title: "Checklist para cada fase do casamento",
    description: "Tarefas por prioridade para transformar ansiedade em próximas ações claras.",
  },
];

const includedItems = [
  "Casamento, convidados e fornecedores ilimitados",
  "Painel financeiro com pagamentos e vencimentos",
  "Checklist, planejamento e dashboard do casal",
  "Acesso para o casal e equipe do evento",
  "Compra segura e ativação imediata",
];

export const LandingPage = ({ onLogin, onGetStarted }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-[#fbfaf8] text-slate-950 overflow-x-hidden [font-family:'Manrope',sans-serif]">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-[#fbfaf8]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={onLogin}
            className="flex items-center gap-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 sm:gap-0"
            aria-label="Ir para login do WedPlan"
          >
            <img src="/image/favicon.png" alt="" className="h-9 w-9 object-contain sm:hidden" />
            <img src="/image/wedplan_logo.png" alt="WedPlan" className="hidden h-14 w-auto object-contain sm:block" />
            <span className="text-xl font-extrabold tracking-normal text-slate-950 sm:hidden">WedPlan</span>
          </button>

          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-600 lg:flex">
            <a href="#recursos" className="hover:text-primary">Recursos</a>
            <a href="#preco" className="hover:text-primary">Preço</a>
            <a href="#garantia" className="hover:text-primary">Segurança</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onLogin}
              className="h-10 px-3 text-sm font-extrabold text-slate-700 hover:text-primary"
            >
              Entrar
            </Button>
            <Button
              onClick={onGetStarted}
              className="h-10 rounded-lg px-4 text-sm font-extrabold"
            >
              Criar conta
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(105deg,#fbfaf8_0%,#fbfaf8_42%,#f6e7e2_42%,#f6e7e2_100%)]">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-[0.94fr_1.06fr] lg:px-8 lg:py-16">
            <div className="relative z-10 max-w-2xl">
              <Badge className="mb-5 border-primary/20 bg-white text-primary shadow-sm">
                <Sparkles size={13} />
                Planejamento premium para casais
              </Badge>

              <h1 className="max-w-3xl text-6xl font-bold leading-[0.9] tracking-normal text-slate-950 [font-family:'Cormorant_Garamond',serif] sm:text-7xl lg:text-8xl">
                Seu casamento inteiro sob controle.
              </h1>

              <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-slate-700 sm:text-xl">
                WedPlan organiza fornecedores, convidados, tarefas e pagamentos em um painel simples para o casal decidir com calma e acompanhar tudo sem retrabalho.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={onGetStarted}
                className="h-14 rounded-lg px-6 text-base font-extrabold shadow-xl shadow-primary/20"
                >
                  Começar planejamento
                  <ArrowRight size={18} />
                </Button>
                <Button
                  variant="outline"
                  onClick={onLogin}
                  className="h-14 rounded-lg border-slate-300 bg-white px-6 text-base font-extrabold text-slate-900 hover:bg-slate-50"
                >
                  Acessar demonstrativo
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-slate-600">
                <span className="inline-flex items-center gap-2"><ShieldCheck size={17} className="text-emerald-600" /> Compra segura</span>
                <span className="inline-flex items-center gap-2"><LockKeyhole size={17} className="text-sky-600" /> Dados protegidos</span>
                <span className="inline-flex items-center gap-2"><BadgeCheck size={17} className="text-primary" /> Acesso imediato</span>
              </div>
            </div>

            <ProductPreview />
          </div>

          <div className="mx-auto grid max-w-7xl gap-3 px-4 pb-8 sm:grid-cols-3 sm:px-6 lg:px-8">
            {metrics.map((metric) => (
              <div key={metric.label} className="flex items-end justify-between rounded-lg border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
                <span className="text-2xl font-black text-slate-950">{metric.value}</span>
                <span className="max-w-28 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-500">{metric.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="recursos" className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <Badge className="mb-4 border-slate-200 bg-slate-50 text-slate-700">
                <LayoutDashboard size={13} />
                Operação do casamento
              </Badge>
              <h2 className="text-4xl font-bold leading-[0.95] text-slate-950 [font-family:'Cormorant_Garamond',serif] sm:text-6xl">
                Menos abas abertas. Mais decisao boa.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-lg border border-slate-200 bg-[#fbfaf8] p-6 shadow-sm">
                  <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon size={22} />
                  </div>
                  <h3 className="text-2xl font-bold leading-tight text-slate-950 [font-family:'Cormorant_Garamond',serif]">{feature.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="preco" className="border-y border-slate-200 bg-slate-950 py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div className="self-center">
              <Badge className="mb-5 border-white/10 bg-white/10 text-white">
                <PieChart size={13} />
                Plano único
              </Badge>
              <h2 className="text-5xl font-bold leading-[0.95] [font-family:'Cormorant_Garamond',serif] sm:text-6xl">
                Comece hoje e acompanhe tudo ate o grande dia.
              </h2>
              <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-300">
                Um pagamento único para organizar o planejamento completo, sem mensalidade escondida no meio do caminho.
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-white p-6 text-slate-950 shadow-2xl sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-primary">Oferta de lancamento</p>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="mb-2 text-2xl font-black">R$</span>
                    <span className="text-7xl font-bold leading-none [font-family:'Cormorant_Garamond',serif]">197</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-500">Pagamento único</p>
                </div>
                <div id="garantia" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                  <ShieldCheck className="mb-2" size={20} />
                  Compra segura via Asaas
                </div>
              </div>

              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {includedItems.map((item) => (
                  <li key={item} className="flex gap-3 text-sm font-bold text-slate-700">
                    <Check className="mt-0.5 shrink-0 text-primary" size={17} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={onGetStarted}
                className="mt-8 h-14 w-full rounded-lg text-base font-extrabold"
              >
                Garantir meu acesso
                <ChevronRight size={19} />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#fbfaf8] px-4 py-8 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        WedPlan 2026. Planejamento do casamento, sem caos.
      </footer>
    </div>
  );
};

const ProductPreview = () => (
  <div className="relative z-10">
    <div className="rounded-lg border border-white/70 bg-slate-950 p-3 shadow-2xl shadow-slate-900/25">
      <div className="rounded-md bg-[#f8fafc] p-4 sm:p-5">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
              <Heart size={19} fill="currentColor" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Dashboard</p>
              <p className="text-base font-black text-slate-950">Marina & Lucas</p>
            </div>
          </div>
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Em dia</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {productCards.map((card) => (
            <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className={cn("mb-4 flex h-9 w-9 items-center justify-center rounded-lg", card.color)}>
                <card.icon size={18} />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{card.label}</p>
              <p className="mt-1 text-3xl font-black text-slate-950">{card.value}</p>
              <p className="text-xs font-bold text-slate-500">{card.caption}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-black text-slate-950">Pagamentos por categoria</p>
              <span className="text-xs font-black text-primary">R$ 84.200</span>
            </div>
            <div className="flex h-40 items-end gap-3">
              {[44, 72, 55, 88, 63, 36].map((height, index) => (
                <div key={height} className="flex h-full flex-1 flex-col justify-end gap-2">
                  <div
                    className={cn(
                      "rounded-t-md",
                      index % 3 === 0 && "bg-primary",
                      index % 3 === 1 && "bg-sky-500",
                      index % 3 === 2 && "bg-emerald-500"
                    )}
                    style={{ height: `${height}%` }}
                  />
                  <span className="h-2 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-4 text-sm font-black text-slate-950">Próximos passos</p>
            <div className="space-y-3">
              {["Confirmar buffet", "Revisar lista VIP", "Pagar decoração"].map((task, index) => (
                <div key={task} className="flex items-center gap-3">
                  <span className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black",
                    index === 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold text-slate-700">{task}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn(
    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-[0.14em]",
    className
  )}>
    {children}
  </span>
);
