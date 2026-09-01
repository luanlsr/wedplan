import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  Heart,
  ListChecks,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { differenceInDays, format, isValid, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FinancialStats, Guest, Task, TimelineCategory, TimelineItem, WeddingData } from "../../types";
import { Badge, Button, Card } from "../ui";
import { cn } from "../../lib/utils";
import { formatCurrency } from "../../utils/calculations";
import { WeddingCountdown } from "../timeline/WeddingCountdown";

export type DashboardAction =
  | "new_supplier"
  | "financial"
  | "settings"
  | "suppliers"
  | "guests"
  | "tasks"
  | "timeline"
  | "contracts";

interface DashboardProps {
  data: WeddingData;
  stats: FinancialStats;
  weddingDate?: string;
  onAction: (action: DashboardAction) => void;
}

type TimelineEntry = TimelineItem & {
  category: TimelineCategory;
};

const parseDate = (date?: string | null) => {
  if (!date) return null;
  const parsed = parseISO(date);
  return isValid(parsed) ? parsed : null;
};

const formatDate = (date?: string | null) => {
  const parsed = parseDate(date);
  if (!parsed) return "Sem data";
  return format(parsed, "dd MMM", { locale: ptBR });
};

const daysFromToday = (date?: string | null) => {
  const parsed = parseDate(date);
  if (!parsed) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return differenceInDays(parsed, today);
};

const peopleCount = (guest: Guest) => (guest.adultos || 0) + (guest.criancas || 0);

const statusLabel = {
  pago: "Pago",
  parcial: "Parcial",
  pendente: "Pendente",
  atrasado: "Atrasado",
};

const taskStatusLabel = {
  pendente: "Pendente",
  em_progresso: "Em andamento",
  concluido: "Concluída",
};

const EMPTY_GUESTS: Guest[] = [];
const EMPTY_TASKS: Task[] = [];
const EMPTY_TIMELINE: TimelineCategory[] = [];

export const Dashboard = ({ data, stats, weddingDate, onAction }: DashboardProps) => {
  const guests = data.convidados || EMPTY_GUESTS;
  const tasks = data.tarefas || EMPTY_TASKS;
  const timeline = data.cronograma || EMPTY_TIMELINE;

  const guestStats = useMemo(() => {
    const eligibleGuests = guests.filter((guest) => guest.categoria.trim().toLowerCase() !== "staff");
    const confirmedGuests = eligibleGuests.filter((guest) => guest.status === "confirmado");
    const pendingGuests = eligibleGuests.filter((guest) => guest.status === "pendente");
    const declinedGuests = eligibleGuests.filter((guest) => guest.status === "recusado");
    const invited = eligibleGuests.filter((guest) => guest.invitation_sent).length;

    return {
      totalGuests: eligibleGuests.length,
      totalPeople: eligibleGuests.reduce((sum, guest) => sum + peopleCount(guest), 0),
      confirmedPeople: confirmedGuests.reduce((sum, guest) => sum + peopleCount(guest), 0),
      pendingPeople: pendingGuests.reduce((sum, guest) => sum + peopleCount(guest), 0),
      declinedPeople: declinedGuests.reduce((sum, guest) => sum + peopleCount(guest), 0),
      invited,
      confirmationRate: eligibleGuests.length > 0 ? Math.round((confirmedGuests.length / eligibleGuests.length) * 100) : 0,
      inviteRate: eligibleGuests.length > 0 ? Math.round((invited / eligibleGuests.length) * 100) : 0,
    };
  }, [guests]);

  const supplierOverview = useMemo(() => {
    const suppliers = data.fornecedores || [];
    const withContracts = suppliers.filter((supplier) => supplier.contract_storage_path || supplier.contract_url).length;
    const overduePayments = stats.proximosVencimentos.filter((item) => {
      const days = daysFromToday(item.data);
      return days !== null && days < 0;
    }).length;

    return {
      total: suppliers.length,
      withContracts,
      contractRate: suppliers.length > 0 ? Math.round((withContracts / suppliers.length) * 100) : 0,
      overduePayments,
      byStatus: stats.porStatus,
    };
  }, [data.fornecedores, stats.porStatus, stats.proximosVencimentos]);

  const taskOverview = useMemo(() => {
    const openTasks = tasks.filter((task) => task.status !== "concluido");
    const overdue = openTasks.filter((task) => {
      const days = daysFromToday(task.dataLimite);
      return days !== null && days < 0;
    }).length;
    const done = tasks.filter((task) => task.status === "concluido").length;

    const nextTasks = [...openTasks]
      .sort((a, b) => {
        const aTime = parseDate(a.dataLimite)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bTime = parseDate(b.dataLimite)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aTime - bTime || a.ordem - b.ordem;
      })
      .slice(0, 5);

    return {
      total: tasks.length,
      done,
      open: openTasks.length,
      overdue,
      progress: tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0,
      nextTasks,
    };
  }, [tasks]);

  const nextTimelineItems = useMemo(() => (
    timeline
      .flatMap((category): TimelineEntry[] => category.itens.map((item) => ({ ...item, category })))
      .filter((item) => item.status !== "concluido")
      .sort((a, b) => {
        const aTime = parseDate(a.data)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bTime = parseDate(b.data)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aTime - bTime || a.ordem - b.ordem;
      })
      .slice(0, 5)
  ), [timeline]);

  const categorySpend = useMemo(() => (
    Object.entries(stats.porCategoria)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  ), [stats.porCategoria]);

  const budgetUsage = stats.totalOrcado > 0 ? Math.round((stats.totalContratado / stats.totalOrcado) * 100) : 0;
  const paidRate = stats.totalContratado > 0 ? Math.round((stats.totalPago / stats.totalContratado) * 100) : 0;
  const budgetBalance = stats.totalOrcado - stats.totalContratado;
  const weddingDays = daysFromToday(weddingDate);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <WeddingCountdown weddingDate={weddingDate} compact />

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <Card className="overflow-hidden border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Visão geral do sistema</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">
                {data.casal.nome1 || data.casal.nome2 ? `${data.casal.nome1} & ${data.casal.nome2}` : "Planejamento do casamento"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted-foreground">
                Acompanhe orçamento, pagamentos, convidados, fornecedores, tarefas e próximos eventos.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              <Metric label="Fornecedores" value={supplierOverview.total} icon={Briefcase} />
              <Metric label="Convidados" value={guestStats.totalPeople} icon={Users} />
              <Metric label="Tarefas abertas" value={taskOverview.open} icon={ListChecks} />
              <Metric label="Dias" value={weddingDays ?? "-"} icon={CalendarClock} />
            </div>
          </div>
        </Card>

        <Card className="border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Ações rápidas</p>
              <h3 className="text-lg font-black text-foreground">Continuar planejamento</h3>
            </div>
            <Button className="h-10 rounded-xl font-black" onClick={() => onAction("new_supplier")}>
              <Plus size={16} /> Fornecedor
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <QuickAction label="Convidados" icon={Heart} onClick={() => onAction("guests")} />
            <QuickAction label="Financeiro" icon={CircleDollarSign} onClick={() => onAction("financial")} />
            <QuickAction label="Tarefas" icon={CheckCircle2} onClick={() => onAction("tasks")} />
            <QuickAction label="Cronograma" icon={CalendarClock} onClick={() => onAction("timeline")} />
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InsightCard
          title="Financeiro"
          value={formatCurrency(stats.totalRestante)}
          helper={`${paidRate}% pago do contratado`}
          icon={CircleDollarSign}
          tone={stats.totalRestante > 0 ? "warning" : "success"}
          onClick={() => onAction("financial")}
        />
        <InsightCard
          title="Orçamento"
          value={budgetBalance >= 0 ? formatCurrency(budgetBalance) : `-${formatCurrency(Math.abs(budgetBalance))}`}
          helper={`${budgetUsage}% do orçamento usado`}
          icon={TrendingUp}
          tone={budgetBalance >= 0 ? "info" : "danger"}
          onClick={() => onAction("financial")}
        />
        <InsightCard
          title="Confirmações"
          value={`${guestStats.confirmationRate}%`}
          helper={`${guestStats.confirmedPeople} pessoas confirmadas`}
          icon={Users}
          tone={guestStats.confirmationRate >= 70 ? "success" : "info"}
          onClick={() => onAction("guests")}
        />
        <InsightCard
          title="Pendências"
          value={String(taskOverview.overdue + supplierOverview.overduePayments)}
          helper={`${taskOverview.overdue} tarefas e ${supplierOverview.overduePayments} pagamentos atrasados`}
          icon={AlertTriangle}
          tone={taskOverview.overdue + supplierOverview.overduePayments > 0 ? "danger" : "success"}
          onClick={() => onAction("tasks")}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border bg-card p-5 shadow-sm">
            <SectionHeader eyebrow="Financeiro" title="Próximos vencimentos" actionLabel="Ver financeiro" onAction={() => onAction("financial")} />
            <div className="mt-4 space-y-3">
              {stats.proximosVencimentos.length > 0 ? (
                stats.proximosVencimentos.map((item, index) => (
                  <PaymentItem key={`${item.fornecedor}-${item.parcela}-${index}`} item={item} />
                ))
              ) : (
                <EmptyState icon={CheckCircle2} text="Nenhum pagamento pendente." />
              )}
            </div>
          </Card>

          <Card className="border-border bg-card p-5 shadow-sm">
            <SectionHeader eyebrow="Tarefas" title="O que fazer agora" actionLabel="Ver tarefas" onAction={() => onAction("tasks")} />
            <div className="mt-4 space-y-3">
              {taskOverview.nextTasks.length > 0 ? (
                taskOverview.nextTasks.map((task) => <TaskItem key={task.id} task={task} />)
              ) : (
                <EmptyState icon={CheckCircle2} text="Nenhuma tarefa aberta." />
              )}
            </div>
          </Card>

          <Card className="border-border bg-card p-5 shadow-sm">
            <SectionHeader eyebrow="Cronograma" title="Próximas etapas" actionLabel="Ver cronograma" onAction={() => onAction("timeline")} />
            <div className="mt-4 space-y-3">
              {nextTimelineItems.length > 0 ? (
                nextTimelineItems.map((item) => <TimelineDashboardItem key={item.id} item={item} />)
              ) : (
                <EmptyState icon={CalendarClock} text="Nenhuma etapa pendente no cronograma." />
              )}
            </div>
          </Card>

          <Card className="border-border bg-card p-5 shadow-sm">
            <SectionHeader eyebrow="Fornecedores" title="Contratos e status" actionLabel="Ver fornecedores" onAction={() => onAction("suppliers")} />
            <div className="mt-4 space-y-4">
              <ProgressRow label="Contratos anexados" value={supplierOverview.contractRate} helper={`${supplierOverview.withContracts}/${supplierOverview.total || 0}`} />
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(supplierOverview.byStatus).map(([status, count]) => (
                  <div key={status} className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{statusLabel[status as keyof typeof statusLabel]}</p>
                    <p className="mt-1 text-xl font-black text-foreground">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="border-border bg-card p-5 shadow-sm">
            <SectionHeader eyebrow="Convidados" title="Status da lista" actionLabel="Ver lista" onAction={() => onAction("guests")} />
            <div className="mt-4 space-y-4">
              <ProgressRow label="Convites enviados" value={guestStats.inviteRate} helper={`${guestStats.invited}/${guestStats.totalGuests}`} />
              <ProgressRow label="Confirmações" value={guestStats.confirmationRate} helper={`${guestStats.confirmedPeople} pessoas`} />
              <div className="grid grid-cols-3 gap-2">
                <SmallStat label="Confirmadas" value={guestStats.confirmedPeople} tone="success" />
                <SmallStat label="Pendentes" value={guestStats.pendingPeople} tone="warning" />
                <SmallStat label="Recusadas" value={guestStats.declinedPeople} tone="danger" />
              </div>
            </div>
          </Card>

          <Card className="border-border bg-card p-5 shadow-sm">
            <SectionHeader eyebrow="Orçamento" title="Maiores categorias" actionLabel="Contratos" onAction={() => onAction("contracts")} />
            <div className="mt-4 space-y-3">
              {categorySpend.length > 0 ? (
                categorySpend.map((item) => {
                  const percent = stats.totalContratado > 0 ? Math.round((item.value / stats.totalContratado) * 100) : 0;
                  return (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-black text-foreground">{item.name}</span>
                        <span className="shrink-0 text-xs font-black text-muted-foreground">{formatCurrency(item.value)}</span>
                      </div>
                      <ProgressBar value={percent} />
                    </div>
                  );
                })
              ) : (
                <EmptyState icon={FileText} text="Nenhum fornecedor contratado ainda." />
              )}
            </div>
          </Card>
        </aside>
      </section>
    </div>
  );
};

const Metric = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) => (
  <div className="rounded-xl border border-border bg-secondary/20 p-3">
    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
      <Icon size={16} />
    </div>
    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-black text-foreground">{value}</p>
  </div>
);

const QuickAction = ({ label, icon: Icon, onClick }: { label: string; icon: React.ElementType; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-12 items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-3 text-left text-sm font-black text-foreground transition hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
  >
    <span className="flex min-w-0 items-center gap-2">
      <Icon size={16} className="shrink-0" />
      <span className="truncate">{label}</span>
    </span>
    <ArrowRight size={14} className="shrink-0" />
  </button>
);

const toneStyles = {
  info: "bg-blue-500/10 text-blue-500",
  success: "bg-emerald-500/10 text-emerald-500",
  warning: "bg-amber-500/10 text-amber-500",
  danger: "bg-red-500/10 text-red-500",
};

const InsightCard = ({
  title,
  value,
  helper,
  icon: Icon,
  tone,
  onClick,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ElementType;
  tone: keyof typeof toneStyles;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
        <p className="mt-2 truncate text-2xl font-black text-foreground">{value}</p>
      </div>
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", toneStyles[tone])}>
        <Icon size={21} />
      </div>
    </div>
    <p className="mt-3 text-xs font-bold leading-5 text-muted-foreground">{helper}</p>
  </button>
);

const SectionHeader = ({
  eyebrow,
  title,
  actionLabel,
  onAction,
}: {
  eyebrow: string;
  title: string;
  actionLabel: string;
  onAction: () => void;
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-primary">{eyebrow}</p>
      <h3 className="mt-1 text-lg font-black text-foreground">{title}</h3>
    </div>
    <button
      type="button"
      onClick={onAction}
      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-border bg-secondary/20 px-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground transition hover:border-primary/30 hover:text-primary"
    >
      {actionLabel}
      <ArrowRight size={13} />
    </button>
  </div>
);

const PaymentItem = ({ item }: { item: FinancialStats["proximosVencimentos"][number] }) => {
  const days = daysFromToday(item.data);
  const isLate = days !== null && days < 0;

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-border bg-secondary/20 p-3">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl font-black", isLate ? "bg-red-500/10 text-red-500" : "bg-amber-500/10 text-amber-500")}>
        {parseDate(item.data)?.getDate() || "-"}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-foreground">{item.fornecedor}</p>
        <p className="text-xs font-semibold text-muted-foreground">
          Parcela {item.parcela}/{item.totalParcelas} · {formatDate(item.data)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-black text-foreground">{formatCurrency(item.valor)}</p>
        <p className={cn("text-[10px] font-black uppercase tracking-wide", isLate ? "text-red-500" : "text-amber-500")}>
          {isLate ? `${Math.abs(days || 0)}d atraso` : days === 0 ? "Hoje" : `${days}d`}
        </p>
      </div>
    </div>
  );
};

const TaskItem = ({ task }: { task: Task }) => {
  const days = daysFromToday(task.dataLimite);
  const isLate = days !== null && days < 0;

  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-foreground">{task.titulo}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">{task.categoria} · {formatDate(task.dataLimite)}</p>
        </div>
        <Badge variant={isLate ? "error" : task.status === "em_progresso" ? "warning" : "outline"}>
          {taskStatusLabel[task.status]}
        </Badge>
      </div>
    </div>
  );
};

const TimelineDashboardItem = ({ item }: { item: TimelineEntry }) => {
  const days = daysFromToday(item.data);

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-border bg-secondary/20 p-3">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.category.cor }} />
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-foreground">{item.titulo}</p>
        <p className="text-xs font-semibold text-muted-foreground">{item.category.nome} · {formatDate(item.data)}</p>
      </div>
      <span className="shrink-0 rounded-lg bg-background px-2 py-1 text-[10px] font-black uppercase text-muted-foreground">
        {days === null ? "Sem data" : days < 0 ? `${Math.abs(days)}d atraso` : days === 0 ? "Hoje" : `${days}d`}
      </span>
    </div>
  );
};

const ProgressRow = ({ label, value, helper }: { label: string; value: number; helper: string }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-black text-foreground">{label}</span>
      <span className="text-xs font-bold text-muted-foreground">{helper}</span>
    </div>
    <ProgressBar value={value} />
  </div>
);

const ProgressBar = ({ value }: { value: number }) => (
  <div className="h-2 overflow-hidden rounded-full bg-secondary">
    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
  </div>
);

const SmallStat = ({ label, value, tone }: { label: string; value: number; tone: keyof typeof toneStyles }) => (
  <div className={cn("rounded-xl p-3 text-center", toneStyles[tone])}>
    <p className="text-[10px] font-black uppercase tracking-wide">{label}</p>
    <p className="mt-1 text-xl font-black">{value}</p>
  </div>
);

const EmptyState = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/10 p-5 text-center text-sm font-bold text-muted-foreground">
    <Icon className="mb-2 opacity-50" size={24} />
    {text}
  </div>
);
