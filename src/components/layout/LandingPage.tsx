import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  CalendarCheck2,
  Check,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LockKeyhole,
  MessageCircleHeart,
  PieChart,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Wine,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../ui";
import { cn } from "../../lib/utils";
import { BrandLogo } from "./BrandLogo";
import { setDefaultPageMetadata } from "../../utils/meta";

type LandingPageProps = {
  onLogin: () => void;
  onGetStarted: (options?: { plan?: string; billing?: "monthly" | "yearly" }) => void;
};

const revealViewport = { once: true, amount: 0.22 } as const;

const chaosItems = [
  "Uma planilha para orçamento",
  "Outra lista para convidados",
  "Valores perdidos no WhatsApp",
  "Contratos espalhados no email",
  "Pagamentos anotados em vários lugares",
  "A sensação de estar esquecendo algo",
];

const metrics = [
  { value: "R$ 84k", label: "exemplo de orçamento" },
  { value: "126", label: "exemplo de convidados" },
  { value: "18", label: "exemplo de contratos" },
];

const freeToolCards = [
  {
    icon: Calculator,
    title: "Quanto vai custar?",
    text: "Estimativa por convidados e orçamento.",
    href: "/ferramentas/custo-casamento",
  },
  {
    icon: CalendarCheck2,
    title: "O que fazer agora?",
    text: "Checklist automático pela data.",
    href: "/ferramentas/checklist",
  },
  {
    icon: Wine,
    title: "Quantas bebidas?",
    text: "Cálculo por convidados e duração.",
    href: "/ferramentas/bebidas",
  },
  {
    icon: Users,
    title: "Começar lista",
    text: "Organize convidados antes da conta.",
    href: "/ferramentas/convidados",
  },
];

const partnerCards = [
  {
    title: "Acompanhamento profissional",
    text: "Profissionais podem organizar casamentos com mais clareza e menos retrabalho operacional.",
  },
  {
    title: "Experiência para o casal",
    text: "O casal acompanha decisões, prazos e informações importantes em um ambiente centralizado.",
  },
  {
    title: "Parceria com o ecossistema",
    text: "Assessores, espaços e fornecedores podem conversar conosco sobre uso profissional do WedPlan.",
  },
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

const connectedFlow = [
  {
    icon: Wallet,
    title: "Orçamento",
    text: "Valores contratados, parcelas, pagos e próximos vencimentos.",
  },
  {
    icon: Users,
    title: "Convidados",
    text: "RSVP, acompanhantes, crianças, grupos, staff e confirmação.",
  },
  {
    icon: ClipboardList,
    title: "Tarefas",
    text: "Checklist por prioridade para saber o que precisa acontecer agora.",
  },
  {
    icon: FileText,
    title: "Fornecedores",
    text: "Contratos, contatos, observações e pagamentos em um cadastro só.",
  },
];

const featureSections = [
  {
    icon: Wallet,
    eyebrow: "Financeiro",
    title: "Saiba quanto já foi contratado, pago e o que ainda vai vencer.",
    description:
      "O orçamento deixa de ser uma conta manual. Cada fornecedor e parcela entra no planejamento para o casal acompanhar o compromisso real do evento.",
    bullets: ["Pagamentos por status", "Categorias de gasto", "Próximos vencimentos"],
  },
  {
    icon: Users,
    eyebrow: "Convidados",
    title: "Veja quem foi convidado, quem confirmou e quem ainda precisa responder.",
    description:
      "A lista fica preparada para RSVP, acompanhantes, crianças, staff e organização do dia. Tudo com leitura rápida para o casal tomar decisão sem duplicidade.",
    bullets: ["RSVP e confirmação", "Crianças e meia entrada", "Staff separado"],
  },
  {
    icon: CalendarCheck2,
    eyebrow: "Rotina",
    title: "Transforme ansiedade em próximas ações claras.",
    description:
      "Em vez de carregar tudo na cabeça, o WedPlan mostra tarefas, prioridades e prazos para que a organização evolua semana a semana.",
    bullets: ["Checklist por fase", "Prazos visíveis", "Progresso do casamento"],
  },
  {
    icon: MessageCircleHeart,
    eyebrow: "Pro Casal",
    title: "Um site personalizado para o casal receber confirmações e mensagens.",
    description:
      "No plano Pro, o casal ganha uma landing page própria com RSVP, lista de presentes, mensagens e integração com os convidados do sistema.",
    bullets: ["Site do casal", "Lista de presentes", "Domínio como extra"],
  },
];

const oldWay = [
  "5 ferramentas diferentes",
  "Informações duplicadas",
  "Contas manuais",
  "Mensagens perdidas",
  "Tarefas esquecidas",
];

const wedPlanWay = [
  "Um painel central",
  "Orçamento atualizado",
  "Fornecedores conectados",
  "Convidados organizados",
  "Próximas ações claras",
];

const pricingPlans = [
  {
    code: "essential",
    name: "Essencial",
    price: "14,90",
    caption: "para começar sem planilhas",
    audience: "Ideal para casais que querem sair do improviso.",
    features: ["Até 150 convidados", "Fornecedores e tarefas", "Painel do casal"],
  },
  {
    code: "premium",
    name: "Premium",
    price: "24,90",
    caption: "gestão completa do evento",
    audience: "Melhor equilíbrio para a maioria dos casamentos.",
    features: ["Até 500 convidados", "Financeiro completo", "Check-in público seguro"],
    highlight: "Recomendado",
    recommended: true,
  },
  {
    code: "pro_couple",
    name: "Pro Casal",
    price: "39,90",
    caption: "site, RSVP e presentes",
    audience: "Para transformar o planejamento em experiência para os convidados.",
    features: ["Landing page do casal", "Lista de presentes integrada", "Mensagens e RSVP"],
    highlight: "Pro",
  },
];

const objections = [
  {
    title: "Já temos uma planilha.",
    text: "Perfeito para começar. O WedPlan entra quando vocês querem conectar orçamento, fornecedores, convidados, tarefas e pagamentos sem atualizar tudo manualmente.",
  },
  {
    title: "Nosso casamento ainda está longe.",
    text: "Melhor ainda. Quanto antes as informações ficam organizadas, mais fácil acompanhar decisões, contratos e vencimentos ao longo dos meses.",
  },
  {
    title: "Já começamos a organizar.",
    text: "Vocês podem trazer o que já decidiram para o WedPlan e continuar dali, sem perder o histórico do planejamento.",
  },
  {
    title: "Não quero pagar por mais uma assinatura.",
    text: "A ideia é cobrar pouco para o WedPlan acompanhar o casamento por meses, reduzindo retrabalho e centralizando decisões importantes.",
  },
];

const faqs = [
  {
    question: "Quando a conta é criada?",
    answer:
      "A compra passa pelo Asaas. Depois que o pagamento é confirmado, o sistema libera a criação da conta e envia o acesso inicial por email.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Sim. A proposta do WedPlan é assinatura mensal, sem prender o casal em uma cobrança longa antes de perceber valor.",
  },
  {
    question: "Funciona pelo celular?",
    answer:
      "Sim. A interface foi pensada para consulta rápida no celular e para gestão mais completa no computador.",
  },
  {
    question: "Meu parceiro pode acompanhar?",
    answer:
      "Sim. O planejamento foi pensado para o casal acompanhar junto, com dados centralizados em um único casamento.",
  },
  {
    question: "Meus dados ficam protegidos?",
    answer:
      "O acesso é separado por usuário e casamento, com políticas de banco para impedir que um cliente visualize dados de outro.",
  },
  {
    question: "O plano Pro inclui domínio próprio?",
    answer:
      "O plano Pro inclui o site do casal. O domínio personalizado pode ser contratado como adicional após consulta de disponibilidade.",
  },
];

const finalValue = [
  "Saber quanto já gastaram",
  "Acompanhar próximos pagamentos",
  "Organizar convidados e RSVP",
  "Centralizar fornecedores",
  "Ver o que fazer agora",
  "Acompanhar o progresso juntos",
];

export const LandingPage = ({ onLogin, onGetStarted }: LandingPageProps) => {
  useEffect(() => {
    setDefaultPageMetadata();
  }, []);

  return (
    <div className="wedplan-landing relative isolate min-h-screen overflow-x-hidden bg-[#fbfaf8] text-slate-950 [font-family:'Manrope',sans-serif]">
      <div className="pointer-events-none fixed inset-0 z-0 wedplan-soft-grid opacity-40" />
      <div className="pointer-events-none fixed inset-0 z-0 wedplan-noise-layer" />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/70 bg-white/75 shadow-sm shadow-slate-900/5 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            onClick={onLogin}
            className="rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label="Ir para login do WedPlan"
          >
            <BrandLogo size="md" />
          </button>

          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-600 lg:flex">
            <a href="#problema" className="hover:text-primary">Problema</a>
            <a href="#produto" className="hover:text-primary">Produto</a>
            <Link to="/ferramentas/custo-casamento" className="hover:text-primary">Ferramentas grátis</Link>
            <a href="#preco" className="hover:text-primary">Planos</a>
            <a href="#duvidas" className="hover:text-primary">Dúvidas</a>
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
              onClick={() => onGetStarted()}
              className="h-10 rounded-lg px-4 text-sm font-extrabold"
            >
              Começar
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 pt-16">
        <section className="wedplan-hero-surface relative overflow-hidden border-b border-slate-200">
          <div className="pointer-events-none absolute inset-0 wedplan-aurora-field" />
          <div className="pointer-events-none absolute inset-0 wedplan-hero-lines opacity-70" />
          <div className="pointer-events-none absolute inset-0 wedplan-radial-vignette" />
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-[0.94fr_1.06fr] lg:px-8 lg:py-16">
            <Reveal className="relative z-10 max-w-2xl">
              <Badge className="mb-5 border-primary/20 bg-white text-primary shadow-sm">
                <Sparkles size={13} />
                Planejamento premium para casais
              </Badge>

              <h1 className="wedplan-gradient-text max-w-3xl text-6xl font-bold leading-[0.9] tracking-normal [font-family:'Outfit',sans-serif] sm:text-7xl lg:text-8xl">
                Seu casamento inteiro organizado.
              </h1>

              <p className="mt-6 max-w-xl text-lg font-medium leading-8 text-slate-700 sm:text-xl">
                Controle orçamento, convidados, fornecedores, tarefas, pagamentos e prazos em um planejamento feito para acompanhar vocês até o grande dia.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => onGetStarted()}
                  className="h-14 rounded-lg px-6 text-base font-extrabold shadow-xl shadow-primary/20"
                >
                  Começar meu planejamento
                  <ArrowRight size={18} />
                </Button>
                <Link
                  to="/ferramentas/custo-casamento"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 text-base font-extrabold text-slate-900 transition hover:bg-slate-50"
                >
                  Calcular custo grátis
                  <ChevronRight size={18} />
                </Link>
              </div>

              <p className="mt-4 text-sm font-bold text-slate-500">
                Leva menos de 2 minutos para começar. A assinatura é mensal e o pagamento é seguro.
              </p>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-slate-600">
                <span className="inline-flex items-center gap-2"><ShieldCheck size={17} className="text-emerald-600" /> Compra segura</span>
                <span className="inline-flex items-center gap-2"><LockKeyhole size={17} className="text-sky-600" /> Dados protegidos</span>
                <span className="inline-flex items-center gap-2"><BadgeCheck size={17} className="text-primary" /> Assinatura mensal</span>
              </div>
            </Reveal>

            <ProductPreview />
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={revealViewport}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08 } },
            }}
            className="mx-auto grid max-w-7xl gap-3 px-4 pb-8 sm:grid-cols-3 sm:px-6 lg:px-8"
          >
            {metrics.map((metric) => (
              <motion.div
                key={metric.label}
                variants={{
                  hidden: { opacity: 0, y: 18 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                data-landing-card
                className="flex items-end justify-between rounded-lg border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur"
              >
                <span className="text-2xl font-black text-slate-950">{metric.value}</span>
                <span className="max-w-28 text-right text-xs font-black uppercase tracking-[0.12em] text-slate-500">{metric.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="bg-white py-12">
          <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge className="mb-4 border-primary/20 bg-[#fbfaf8] text-primary">
                  <Sparkles size={13} />
                  Ferramentas grátis
                </Badge>
                <h2 className="max-w-2xl text-4xl font-bold leading-[0.95] text-slate-950 [font-family:'Outfit',sans-serif] sm:text-5xl">
                  Primeiro ajude. Depois convide para organizar tudo.
                </h2>
              </div>
              <Link to="/ferramentas" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50">
                Ver todas as ferramentas
                <ChevronRight size={17} />
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {freeToolCards.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link key={tool.href} to={tool.href} data-landing-card className="rounded-lg border border-slate-200 bg-[#fbfaf8] p-5">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon size={19} />
                    </span>
                    <p className="mt-5 text-lg font-black text-slate-950">{tool.title}</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{tool.text}</p>
                  </Link>
                );
              })}
            </div>
          </Reveal>
        </section>

        <section className="wedplan-section-mesh border-y border-slate-200 bg-[#fbfaf8] py-14 sm:py-16">
          <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <Badge className="mb-4 border-primary/20 bg-white text-primary">
                  <Users size={13} />
                  Para profissionais
                </Badge>
                <h2 className="text-4xl font-bold leading-[0.95] text-slate-950 [font-family:'Outfit',sans-serif] sm:text-5xl">
                  Também funciona para quem organiza casamentos com clientes.
                </h2>
                <p className="mt-5 text-base font-medium leading-7 text-slate-600">
                  Se você é assessor, cerimonialista, espaço ou fornecedor e quer usar o WedPlan de forma profissional, podemos conversar sobre um fluxo pensado para acompanhar mais de um casal com organização e segurança.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Button onClick={() => onGetStarted({ plan: "partner" })} className="h-12 rounded-lg px-5 text-sm font-extrabold">
                    Quero falar sobre parceria
                    <ArrowRight size={17} />
                  </Button>
                  <Link to="/ferramentas/convidados" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 text-sm font-extrabold text-slate-900 transition hover:bg-slate-50">
                    Ver ferramentas gratuitas
                    <ChevronRight size={17} />
                  </Link>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="rounded-lg bg-slate-950 p-5 text-white">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Organização profissional</p>
                  <div className="mt-5 grid gap-2">
                    {["Planejamento centralizado", "Dados separados por casamento", "Acompanhamento do casal", "Rotina mais previsível"].map((item, index) => (
                      <div key={item} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/10 px-4 py-3">
                        <span className="text-sm font-black">{item}</span>
                        <span className="rounded-full bg-primary/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-primary">
                          {index === 0 ? "Pro" : "Em breve"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {partnerCards.map((card) => (
                    <article key={card.title} className="rounded-lg border border-slate-200 bg-[#fbfaf8] p-4">
                      <p className="text-sm font-black leading-5 text-slate-950">{card.title}</p>
                      <p className="mt-2 text-xs font-medium leading-5 text-slate-600">{card.text}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        <section id="problema" className="wedplan-section-mesh bg-white py-16 sm:py-20">
          <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <Badge className="mb-4 border-slate-200 bg-slate-50 text-slate-700">
                  <HelpCircle size={13} />
                  Isso acontece com vocês?
                </Badge>
                <h2 className="text-4xl font-bold leading-[0.95] text-slate-950 [font-family:'Outfit',sans-serif] sm:text-6xl">
                  Organizar casamento não deveria parecer um segundo emprego.
                </h2>
                <p className="mt-5 text-base font-medium leading-7 text-slate-600">
                  O problema não é ter muita coisa para organizar. É não saber onde cada coisa está, quanto já foi pago e qual decisão precisa ser tomada agora.
                </p>
                <Button onClick={() => onGetStarted()} className="mt-7 h-12 rounded-lg px-5 text-sm font-extrabold">
                  Quero colocar tudo em ordem
                  <ArrowRight size={17} />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {chaosItems.map((item) => (
                  <div key={item} className="flex min-h-20 items-center gap-3 rounded-lg border border-slate-200 bg-[#fbfaf8] p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-primary">
                      <X size={16} />
                    </span>
                    <span className="text-sm font-extrabold leading-5 text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <section className="wedplan-dark-mesh bg-slate-950 py-16 text-white sm:py-20">
          <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <Badge className="mb-5 border-white/10 bg-white/10 text-white">
                  <PieChart size={13} />
                  Antes e depois
                </Badge>
                <h2 className="text-5xl font-bold leading-[0.95] [font-family:'Outfit',sans-serif] sm:text-6xl">
                  Vocês podem continuar juntando peças soltas. Ou podem centralizar tudo.
                </h2>
              </div>
              <p className="text-base font-medium leading-7 text-slate-300">
                A transformação que o WedPlan vende é simples: sair de planilhas, mensagens e memória para um painel onde o casal entende o planejamento de verdade.
              </p>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              <CompareCard title="Planejar sem WedPlan" items={oldWay} tone="old" />
              <CompareCard title="Planejar com WedPlan" items={wedPlanWay} tone="new" />
            </div>
          </Reveal>
        </section>

        <section id="produto" className="wedplan-section-mesh bg-[#fbfaf8] py-16 sm:py-20">
          <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
              <div>
                <Badge className="mb-4 border-primary/20 bg-white text-primary">
                  <LayoutDashboard size={13} />
                  O casamento conectado
                </Badge>
                <h2 className="text-4xl font-bold leading-[0.95] text-slate-950 [font-family:'Outfit',sans-serif] sm:text-6xl">
                  Não são várias ferramentas dentro de um app. É um planejamento que conversa.
                </h2>
                <p className="mt-5 text-base font-medium leading-7 text-slate-600">
                  Quando um fornecedor entra, o orçamento entende. Quando uma parcela vence, a rotina mostra. Quando um convidado confirma, a lista muda. O painel deixa a próxima decisão mais clara.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {connectedFlow.map((item) => (
                  <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <item.icon size={21} />
                    </div>
                    <h3 className="text-2xl font-bold leading-tight text-slate-950 [font-family:'Outfit',sans-serif]">{item.title}</h3>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{item.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <section id="recursos" className="wedplan-section-mesh bg-white py-16 sm:py-20">
          <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-2xl">
                <Badge className="mb-4 border-slate-200 bg-slate-50 text-slate-700">
                  <Sparkles size={13} />
                  Demonstração de valor
                </Badge>
                <h2 className="text-4xl font-bold leading-[0.95] text-slate-950 [font-family:'Outfit',sans-serif] sm:text-6xl">
                  O WedPlan mostra o que antes ficava escondido.
                </h2>
              </div>
              <Button onClick={() => onGetStarted()} className="h-12 rounded-lg px-5 text-sm font-extrabold">
                Quero um WedPlan assim
                <ArrowRight size={17} />
              </Button>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-2">
              {featureSections.map((feature) => (
                <article key={feature.title} className="rounded-lg border border-slate-200 bg-[#fbfaf8] p-6 shadow-sm">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <feature.icon size={22} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-primary">{feature.eyebrow}</span>
                  </div>
                  <h3 className="text-3xl font-bold leading-none text-slate-950 [font-family:'Outfit',sans-serif]">{feature.title}</h3>
                  <p className="mt-4 text-sm font-medium leading-6 text-slate-600">{feature.description}</p>
                  <ul className="mt-5 grid gap-2 sm:grid-cols-3">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex gap-2 text-xs font-extrabold text-slate-700">
                        <Check className="mt-0.5 shrink-0 text-primary" size={15} />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="wedplan-section-mesh border-y border-slate-200 bg-[#fbfaf8] py-16 sm:py-20">
          <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <Badge className="mb-4 border-primary/20 bg-white text-primary">
                  <CreditCard size={13} />
                  Começo fluido
                </Badge>
                <h2 className="text-4xl font-bold leading-[0.95] text-slate-950 [font-family:'Outfit',sans-serif] sm:text-6xl">
                  Seu WedPlan começa antes do pagamento parecer complicado.
                </h2>
                <p className="mt-5 text-base font-medium leading-7 text-slate-600">
                  O checkout pede os dados essenciais, monta o casamento, escolhe o plano e só libera a conta após a confirmação do pagamento.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                {["Dados pessoais", "Dados do casamento", "Escolha do plano", "Pagamento seguro", "Onboarding inicial"].map((step, index) => (
                  <div key={step} className="flex gap-4 border-b border-slate-100 py-4 last:border-b-0">
                    <span className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black",
                      index < 3 ? "bg-primary text-white" : "bg-slate-100 text-slate-600"
                    )}>
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-slate-950">{step}</h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        {index === 0 && "Nome, email e telefone para iniciar o cadastro."}
                        {index === 1 && "Nome do casal e data para personalizar o planejamento."}
                        {index === 2 && "Escolha o nível ideal para a fase do casamento."}
                        {index === 3 && "Cobrança via Asaas com liberação após confirmação."}
                        {index === 4 && "Primeiras ações para o usuário perceber valor rápido."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <section id="preco" className="wedplan-dark-mesh bg-slate-950 py-16 text-white sm:py-20">
          <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <Badge className="mb-5 border-white/10 bg-white/10 text-white">
                  <PieChart size={13} />
                  Assinatura mensal
                </Badge>
                <h2 className="text-5xl font-bold leading-[0.95] [font-family:'Outfit',sans-serif] sm:text-6xl">
                  Um plano para cada fase do casamento.
                </h2>
                <p className="mt-5 max-w-xl text-base font-medium leading-7 text-slate-300">
                  Preços baixos para crescer com muitos casais, sem cobrar caro antes de provar valor.
                </p>
              </div>

              <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm font-black text-emerald-100">
                <ShieldCheck className="mb-2" size={20} />
                Pagamento seguro via Asaas. A conta só é liberada depois do pagamento confirmado.
              </div>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {pricingPlans.map((plan) => (
                <article
                  key={plan.name}
                  className={cn(
                    "relative isolate flex h-full flex-col rounded-lg border bg-white p-6 text-slate-950 shadow-2xl",
                    plan.recommended
                      ? "wedplan-premium-card border-transparent lg:-translate-y-3"
                      : "border-white/10"
                  )}
                >
                  <div className="mb-4 min-h-6">
                    {plan.highlight && (
                      <span className={cn(
                        "inline-flex rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]",
                        plan.recommended ? "bg-slate-950 text-white" : "bg-primary text-white"
                      )}>
                        {plan.highlight}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-primary">{plan.name}</p>
                  <p className="mt-2 min-h-10 text-sm font-bold leading-5 text-slate-500">{plan.audience}</p>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="mb-2 text-2xl font-black">R$</span>
                    <span className="text-6xl font-bold leading-none [font-family:'Outfit',sans-serif]">{plan.price}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-500">por mês, {plan.caption}</p>

                  <ul className="mt-6 grid gap-3">
                    {plan.features.map((item) => (
                      <li key={item} className="flex gap-3 text-sm font-bold text-slate-700">
                        <Check className="mt-0.5 shrink-0 text-primary" size={17} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-7">
                    <Button
                      onClick={() => onGetStarted({ plan: plan.code, billing: "monthly" })}
                      className="h-12 w-full rounded-lg text-sm font-extrabold"
                      variant={plan.recommended ? "primary" : "outline"}
                    >
                      Assinar {plan.name}
                      <ChevronRight size={18} />
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 rounded-lg border border-white/10 bg-white/10 p-5">
              <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-white">Extra Pro: domínio personalizado</p>
                  <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-300">
                    O casal pode solicitar um domínio como mariaejoao.com.br. A compra e configuração entram como adicional anual após consulta de disponibilidade.
                  </p>
                </div>
                <Button onClick={() => onGetStarted({ plan: "pro_couple", billing: "monthly" })} className="h-12 rounded-lg px-5 text-sm font-extrabold">
                  Quero o Pro
                  <ArrowRight size={17} />
                </Button>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="wedplan-section-mesh bg-white py-16 sm:py-20">
          <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <Badge className="mb-4 border-slate-200 bg-slate-50 text-slate-700">
                <HelpCircle size={13} />
                Talvez você esteja pensando
              </Badge>
              <h2 className="text-4xl font-bold leading-[0.95] text-slate-950 [font-family:'Outfit',sans-serif] sm:text-6xl">
                As dúvidas normais antes de assinar.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {objections.map((item) => (
                <article key={item.title} className="rounded-lg border border-slate-200 bg-[#fbfaf8] p-5">
                  <h3 className="text-lg font-black text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{item.text}</p>
                </article>
              ))}
            </div>
          </Reveal>
        </section>

        <section id="duvidas" className="wedplan-section-mesh border-y border-slate-200 bg-[#fbfaf8] py-16 sm:py-20">
          <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <Badge className="mb-4 border-primary/20 bg-white text-primary">
                  <ShieldCheck size={13} />
                  Segurança e clareza
                </Badge>
                <h2 className="text-4xl font-bold leading-[0.95] text-slate-950 [font-family:'Outfit',sans-serif] sm:text-6xl">
                  Antes de começar, tire as dúvidas principais.
                </h2>
              </div>

              <div className="grid gap-3">
                {faqs.map((faq) => (
                  <details key={faq.question} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black text-slate-950">
                      {faq.question}
                      <ChevronRight className="shrink-0 transition group-open:rotate-90" size={18} />
                    </summary>
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <section className="wedplan-dark-mesh bg-slate-950 px-4 py-16 text-white sm:py-20">
          <Reveal className="mx-auto max-w-5xl text-center">
            <Badge className="mb-5 border-white/10 bg-white/10 text-white">
              <Heart size={13} />
              O casamento já tem data
            </Badge>
            <h2 className="text-5xl font-bold leading-[0.95] [font-family:'Outfit',sans-serif] sm:text-7xl">
              Agora ele pode ter um plano.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-7 text-slate-300">
              Com o WedPlan, vocês centralizam o que importa e chegam ao grande dia com mais clareza, menos retrabalho e decisões melhor acompanhadas.
            </p>
            <ul className="mx-auto mt-8 grid max-w-3xl gap-3 text-left text-sm font-bold text-slate-300 sm:grid-cols-2">
              {finalValue.map((item) => (
                <li key={item} className="flex gap-3">
                  <Check className="mt-0.5 shrink-0 text-primary" size={17} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button onClick={() => onGetStarted()} className="mx-auto mt-9 h-14 rounded-lg px-7 text-base font-extrabold">
              Criar meu WedPlan
              <ArrowRight size={18} />
            </Button>
            <p className="mt-4 text-sm font-bold text-slate-400">Comece em poucos minutos. Cancele quando quiser.</p>
          </Reveal>
        </section>
      </main>

      <footer className="bg-[#fbfaf8] px-4 py-8 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <span>WedPlan 2026. Planejamento do casamento, sem caos.</span>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <a href="/termos-de-uso" className="hover:text-primary">Termos</a>
          <a href="/politica-de-privacidade" className="hover:text-primary">Privacidade</a>
        </div>
      </footer>
    </div>
  );
};

const Reveal = ({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={revealViewport}
    transition={{ duration: 0.68, ease: "easeOut", delay }}
    className={className}
  >
    {children}
  </motion.div>
);

const ProductPreview = () => (
  <motion.div
    initial={{ opacity: 0, x: 34, scale: 0.98 }}
    animate={{ opacity: 1, x: 0, scale: 1 }}
    transition={{ duration: 0.75, ease: "easeOut", delay: 0.12 }}
    className="relative z-10"
  >
    <div className="wedplan-float-card wedplan-shine rounded-lg border border-white/70 bg-slate-950 p-3 shadow-2xl shadow-slate-900/25">
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
            <div key={card.label} data-landing-card className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
                      "wedplan-animated-bar rounded-t-md",
                      index % 3 === 0 && "bg-primary",
                      index % 3 === 1 && "bg-sky-500",
                      index % 3 === 2 && "bg-emerald-500"
                    )}
                    style={{ height: `${height}%`, animationDelay: `${index * 90}ms` }}
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
  </motion.div>
);

const CompareCard = ({ title, items, tone }: { title: string; items: string[]; tone: "old" | "new" }) => (
  <article className={cn(
    "rounded-lg border p-6",
    tone === "old" ? "border-white/10 bg-white/5" : "border-primary/30 bg-primary/15"
  )}>
    <h3 className="text-3xl font-bold leading-none [font-family:'Outfit',sans-serif]">{title}</h3>
    <ul className="mt-6 grid gap-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm font-bold text-slate-200">
          {tone === "old" ? (
            <X className="mt-0.5 shrink-0 text-rose-300" size={17} />
          ) : (
            <Check className="mt-0.5 shrink-0 text-emerald-300" size={17} />
          )}
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </article>
);

const Badge = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={cn(
    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-[0.14em]",
    className
  )}>
    {children}
  </span>
);
