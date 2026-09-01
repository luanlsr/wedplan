import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutList,
  ListChecks,
  Plus,
  Trash2,
} from "lucide-react";
import { Button, Card, Input, useConfirm } from "../ui";
import { WeddingCountdown } from "./WeddingCountdown";
import { cn } from "../../lib/utils";
import { sortByLabelPtBr, sortTextPtBr } from "../../utils/sorting";
import type { TimelineCategory, TimelineItem } from "../../types";

interface TimelineViewProps {
  categories: TimelineCategory[];
  weddingDate?: string;
  onAddCategory: (category: Omit<TimelineCategory, "id" | "itens" | "wedding_id">) => void | Promise<void>;
  onUpdateCategory: (id: string, category: Partial<TimelineCategory>) => void | Promise<void>;
  onDeleteCategory: (id: string) => void | Promise<void>;
  onAddItem: (categoryId: string, item: Omit<TimelineItem, "id" | "categoryId">) => void | Promise<void>;
  onUpdateItem: (categoryId: string, itemId: string, item: Partial<TimelineItem>) => void | Promise<void>;
  onDeleteItem: (categoryId: string, itemId: string) => void | Promise<void>;
}

type ViewMode = "timeline" | "calendar" | "overview";

const STATUS_LABELS = {
  pendente: "Pendente",
  em_progresso: "Em andamento",
  concluido: "Concluído",
};

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>)
  .sort((a, b) => sortTextPtBr(STATUS_LABELS[a], STATUS_LABELS[b]));

const toDate = (date?: string) => {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDate = (date?: string) => {
  const parsed = toDate(date);
  if (!parsed) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(parsed);
};

const getDayDistance = (date?: string) => {
  const parsed = toDate(date);
  if (!parsed) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((parsed.getTime() - today.getTime()) / 86400000);
};

export const TimelineView = ({
  categories,
  weddingDate,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}: TimelineViewProps) => {
  const { confirm, toast } = useConfirm();
  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.ordem - b.ordem || sortTextPtBr(a.nome, b.nome)),
    [categories]
  );
  const categoriesForSelect = useMemo(
    () => sortByLabelPtBr(categories, (category) => category.nome),
    [categories]
  );

  const [activeView, setActiveView] = useState<ViewMode>("timeline");
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, { nome: string; cor: string }>>({});
  const [newCategory, setNewCategory] = useState({ nome: "", cor: "#d8757c" });
  const [newItem, setNewItem] = useState({
    categoryId: "",
    titulo: "",
    descricao: "",
    data: "",
  });
  const [calendarMonth, setCalendarMonth] = useState(() => toDate(weddingDate) || new Date());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCategoryDrafts(
      sortedCategories.reduce<Record<string, { nome: string; cor: string }>>((acc, category) => {
        acc[category.id] = { nome: category.nome, cor: category.cor };
        return acc;
      }, {})
    );
  }, [sortedCategories]);

  useEffect(() => {
    if (!newItem.categoryId && categoriesForSelect[0]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNewItem(prev => ({ ...prev, categoryId: categoriesForSelect[0].id }));
    }
  }, [categoriesForSelect, newItem.categoryId]);

  const flatItems = useMemo(() => (
    sortedCategories.flatMap((category) => (
      category.itens.map((item) => ({ ...item, category }))
    )).sort((a, b) => a.data.localeCompare(b.data) || a.ordem - b.ordem)
  ), [sortedCategories]);

  const stats = useMemo(() => {
    const total = flatItems.length;
    const completed = flatItems.filter((item) => item.status === "concluido").length;
    const overdue = flatItems.filter((item) => item.status !== "concluido" && getDayDistance(item.data) < 0).length;
    const upcoming = flatItems
      .filter((item) => item.status !== "concluido" && getDayDistance(item.data) >= 0)
      .slice(0, 5);

    return {
      total,
      completed,
      pending: total - completed,
      overdue,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      upcoming,
    };
  }, [flatItems]);

  const handleAddCategory = async (event: FormEvent) => {
    event.preventDefault();
    const nome = newCategory.nome.trim();
    if (!nome) return;

    await onAddCategory({
      nome,
      cor: newCategory.cor,
      ordem: sortedCategories.length,
    });
    setNewCategory({ nome: "", cor: "#d8757c" });
  };

  const handleAddItem = async (event: FormEvent) => {
    event.preventDefault();
    const titulo = newItem.titulo.trim();
    if (!titulo || !newItem.categoryId || !newItem.data) return;

    const selectedCategory = sortedCategories.find((category) => category.id === newItem.categoryId);
    await onAddItem(newItem.categoryId, {
      titulo,
      descricao: newItem.descricao.trim(),
      data: newItem.data,
      status: "pendente",
      ordem: selectedCategory?.itens.length || 0,
    });
    setNewItem(prev => ({ ...prev, titulo: "", descricao: "", data: "" }));
  };

  const handleDeleteCategory = async (category: TimelineCategory) => {
    const isConfirmed = await confirm({
      title: "Excluir categoria?",
      description: `Remover "${category.nome}" e todos os itens dentro dela?`,
      type: "danger",
    });
    if (isConfirmed) {
      await onDeleteCategory(category.id);
      toast({
        title: "Categoria removida",
        description: `"${category.nome}" saiu do cronograma.`,
        type: "success",
      });
    }
  };

  const viewTabs = [
    { id: "timeline", label: "Linha do tempo", icon: LayoutList },
    { id: "calendar", label: "Calendário", icon: CalendarDays },
    { id: "overview", label: "Visão geral", icon: ListChecks },
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <WeddingCountdown weddingDate={weddingDate} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-6">
          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">Cronograma do casamento</p>
                <h2 className="text-xl font-extrabold text-foreground">Tudo antes do grande dia</h2>
              </div>

              <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-secondary/30 p-1">
                {viewTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveView(tab.id)}
                    className={cn(
                      "flex h-10 items-center justify-center gap-2 rounded-lg px-2 text-[10px] font-extrabold uppercase tracking-wide transition-all",
                      activeView === tab.id ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <tab.icon size={15} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {activeView === "timeline" && (
              <TimelineMode
                categories={sortedCategories}
                weddingDate={weddingDate}
                onUpdateItem={onUpdateItem}
                onDeleteItem={onDeleteItem}
                onItemDeleted={(item) => toast({
                  title: "Item removido",
                  description: `"${item.titulo}" saiu do cronograma.`,
                  type: "success",
                })}
              />
            )}

            {activeView === "calendar" && (
              <CalendarMode
                calendarMonth={calendarMonth}
                setCalendarMonth={setCalendarMonth}
                flatItems={flatItems}
                weddingDate={weddingDate}
              />
            )}

            {activeView === "overview" && (
              <OverviewMode categories={sortedCategories} stats={stats} />
            )}
          </Card>
        </section>

        <aside className="space-y-6">
          <Card className="p-4 sm:p-5">
            <div className="mb-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">Novo item</p>
              <h3 className="text-base font-extrabold text-foreground">Adicionar ao cronograma</h3>
            </div>
            <form className="space-y-3" onSubmit={handleAddItem}>
              <Input
                value={newItem.titulo}
                onChange={(event) => setNewItem(prev => ({ ...prev, titulo: event.target.value }))}
                placeholder="Ex: Definir data da cerimônia"
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <select
                  className="h-11 w-full rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10"
                  value={newItem.categoryId}
                  onChange={(event) => setNewItem(prev => ({ ...prev, categoryId: event.target.value }))}
                >
                  {categoriesForSelect.map((category) => (
                    <option key={category.id} value={category.id}>{category.nome}</option>
                  ))}
                </select>
                <Input
                  type="date"
                  value={newItem.data}
                  max={weddingDate || undefined}
                  onChange={(event) => setNewItem(prev => ({ ...prev, data: event.target.value }))}
                />
              </div>
              <textarea
                className="min-h-24 w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/10"
                value={newItem.descricao}
                onChange={(event) => setNewItem(prev => ({ ...prev, descricao: event.target.value }))}
                placeholder="Observações, links, decisões ou responsáveis"
              />
              <Button type="submit" className="h-11 w-full" disabled={!newItem.titulo.trim() || !newItem.data || !newItem.categoryId}>
                <Plus size={18} />
                Criar item
              </Button>
            </form>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">Categorias</p>
              <h3 className="text-base font-extrabold text-foreground">Cores e etapas</h3>
            </div>

            <form className="mb-4 flex gap-2" onSubmit={handleAddCategory}>
              <Input
                value={newCategory.nome}
                onChange={(event) => setNewCategory(prev => ({ ...prev, nome: event.target.value }))}
                placeholder="Nova categoria"
              />
              <input
                type="color"
                aria-label="Cor da nova categoria"
                value={newCategory.cor}
                onChange={(event) => setNewCategory(prev => ({ ...prev, cor: event.target.value }))}
                className="h-11 w-12 shrink-0 rounded-xl border border-border bg-card p-1"
              />
              <Button type="submit" size="icon" disabled={!newCategory.nome.trim()}>
                <Plus size={18} />
              </Button>
            </form>

            <div className="space-y-2">
              {sortedCategories.map((category) => (
                <div key={category.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-border bg-secondary/20 p-2">
                  <input
                    type="color"
                    aria-label={`Cor da categoria ${category.nome}`}
                    value={categoryDrafts[category.id]?.cor ?? category.cor}
                    onChange={(event) => {
                      const cor = event.target.value;
                      setCategoryDrafts(prev => ({ ...prev, [category.id]: { nome: prev[category.id]?.nome || category.nome, cor } }));
                      void onUpdateCategory(category.id, { cor });
                    }}
                    className="h-9 w-10 rounded-lg border border-border bg-card p-1"
                  />
                  <input
                    className="h-9 min-w-0 rounded-lg border border-transparent bg-transparent px-2 text-sm font-bold text-foreground focus:border-border focus:bg-card focus:outline-none"
                    value={categoryDrafts[category.id]?.nome ?? category.nome}
                    onChange={(event) => setCategoryDrafts(prev => ({
                      ...prev,
                      [category.id]: { nome: event.target.value, cor: prev[category.id]?.cor || category.cor }
                    }))}
                    onBlur={(event) => {
                      const nome = event.target.value.trim();
                      if (nome && nome !== category.nome) void onUpdateCategory(category.id, { nome });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleDeleteCategory(category)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Excluir categoria ${category.nome}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
};

const TimelineMode = ({
  categories,
  weddingDate,
  onUpdateItem,
  onDeleteItem,
  onItemDeleted,
}: {
  categories: TimelineCategory[];
  weddingDate?: string;
  onUpdateItem: TimelineViewProps["onUpdateItem"];
  onDeleteItem: TimelineViewProps["onDeleteItem"];
  onItemDeleted: (item: TimelineItem) => void;
}) => (
  <div className="relative mt-6 space-y-6">
    <div className="absolute bottom-8 left-4 top-3 w-px bg-border sm:left-5" />
    {categories.map((category) => {
      const sortedItems = [...category.itens].sort((a, b) => a.data.localeCompare(b.data) || a.ordem - b.ordem);
      return (
        <div key={category.id} className="relative grid gap-4 pl-12 sm:pl-16">
          <div
            className="absolute left-[0.55rem] top-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-card shadow-sm sm:left-[0.85rem]"
            style={{ backgroundColor: category.cor }}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h3 className="text-lg font-extrabold text-foreground">{category.nome}</h3>
              <p className="text-xs font-bold text-muted-foreground">{category.itens.length} itens planejados</p>
            </div>
            <span
              className="inline-flex w-fit items-center justify-center rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-extrabold uppercase leading-none tracking-[0.08em]"
              style={{ color: category.cor }}
            >
              {category.itens.filter((item) => item.status === "concluido").length}/{category.itens.length} concluídos
            </span>
          </div>

          <div className="grid gap-3">
            {sortedItems.length > 0 ? (
              sortedItems.map((item) => (
                <TimelineItemCard
                  key={item.id}
                  item={item}
                  category={category}
                  onUpdateItem={onUpdateItem}
                  onDeleteItem={onDeleteItem}
                  onDeleted={() => onItemDeleted(item)}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-sm font-semibold text-muted-foreground">
                Nenhum item criado nesta etapa.
              </div>
            )}
          </div>
        </div>
      );
    })}

    <div className="relative pl-12 sm:pl-16">
      <div className="absolute left-[0.55rem] top-1 flex h-7 w-7 items-center justify-center rounded-full border-4 border-card bg-primary text-white shadow-sm sm:left-[0.85rem]">
        <CheckCircle2 size={14} />
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">Ponto final</p>
        <h3 className="text-lg font-extrabold text-foreground">Grande dia</h3>
        <p className="text-sm font-semibold text-muted-foreground">{formatDate(weddingDate)}</p>
      </div>
    </div>
  </div>
);

const TimelineItemCard = ({
  item,
  category,
  onUpdateItem,
  onDeleteItem,
  onDeleted,
}: {
  item: TimelineItem;
  category: TimelineCategory;
  onUpdateItem: TimelineViewProps["onUpdateItem"];
  onDeleteItem: TimelineViewProps["onDeleteItem"];
  onDeleted: () => void;
}) => {
  const distance = getDayDistance(item.data);
  const isOverdue = distance < 0 && item.status !== "concluido";

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <button
          type="button"
          onClick={() => void onUpdateItem(category.id, item.id, { status: item.status === "concluido" ? "pendente" : "concluido" })}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 transition-all active:scale-95",
            item.status === "concluido" ? "border-emerald-500 bg-emerald-500 text-white" : "border-primary/20 bg-primary/5 text-primary"
          )}
          aria-label={item.status === "concluido" ? "Marcar como pendente" : "Marcar como concluído"}
        >
          {item.status === "concluido" ? <CheckCircle2 size={18} /> : <Clock3 size={17} />}
        </button>

        <div className="min-w-0 flex-1">
          <input
            key={`${item.id}-${item.titulo}`}
            defaultValue={item.titulo}
            onBlur={(event) => {
              const titulo = event.target.value.trim();
              if (titulo && titulo !== item.titulo) void onUpdateItem(category.id, item.id, { titulo });
            }}
            className={cn(
              "w-full rounded-lg border border-transparent bg-transparent px-1 text-sm font-extrabold text-foreground outline-none focus:border-border focus:bg-secondary/20",
              item.status === "concluido" && "line-through opacity-60"
            )}
          />
          {item.descricao && (
            <p className="mt-1 line-clamp-2 text-xs font-medium text-muted-foreground">{item.descricao}</p>
          )}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 lg:w-[390px]">
          <Input
            type="date"
            value={item.data}
            onChange={(event) => void onUpdateItem(category.id, item.id, { data: event.target.value })}
            className="h-9 px-2 text-xs"
          />
          <select
            value={item.status}
            onChange={(event) => void onUpdateItem(category.id, item.id, { status: event.target.value as TimelineItem["status"] })}
            className="h-9 min-w-0 rounded-xl border border-border bg-card px-2 text-xs font-bold text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={async () => {
              await onDeleteItem(category.id, item.id);
              onDeleted();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Excluir item ${item.titulo}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-extrabold uppercase tracking-wide">
        <span className="rounded-lg px-2 py-1 text-white" style={{ backgroundColor: category.cor }}>{category.nome}</span>
        <span className={cn("rounded-lg bg-secondary px-2 py-1 text-muted-foreground", isOverdue && "bg-red-500/10 text-red-500")}>
          {isOverdue ? `${Math.abs(distance)} dias atrasado` : distance === 0 ? "Hoje" : `Faltam ${distance} dias`}
        </span>
      </div>
    </div>
  );
};

const CalendarMode = ({
  calendarMonth,
  setCalendarMonth,
  flatItems,
  weddingDate,
}: {
  calendarMonth: Date;
  setCalendarMonth: Dispatch<SetStateAction<Date>>;
  flatItems: Array<TimelineItem & { category: TimelineCategory }>;
  weddingDate?: string;
}) => {
  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const leadingDays = monthStart.getDay();
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const weddingKey = weddingDate || "";
  const itemsByDate = flatItems.reduce<Map<string, Array<TimelineItem & { category: TimelineCategory }>>>((acc, item) => {
    const dateItems = acc.get(item.data) || [];
    dateItems.push(item);
    acc.set(item.data, dateItems);
    return acc;
  }, new Map());

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          className="h-10 w-10"
        >
          <ChevronLeft size={18} />
        </Button>
        <h3 className="text-center text-lg font-extrabold text-foreground">
          {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(calendarMonth)}
        </h3>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          className="h-10 w-10"
        >
          <ChevronRight size={18} />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((day) => <div key={day} className="py-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: totalCells }).map((_, index) => {
          const dayNumber = index - leadingDays + 1;
          const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
          const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), Math.max(dayNumber, 1));
          const dateKey = isCurrentMonth ? toDateKey(date) : "";
          const items = itemsByDate.get(dateKey) || [];
          const isWeddingDay = dateKey === weddingKey;

          return (
            <div
              key={`${calendarMonth.getMonth()}-${index}`}
              className={cn(
                "min-h-24 rounded-xl border border-border bg-secondary/15 p-2 text-left",
                !isCurrentMonth && "opacity-35",
                isWeddingDay && "border-primary bg-primary/10"
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className={cn("text-xs font-extrabold text-foreground", isWeddingDay && "text-primary")}>
                  {isCurrentMonth ? dayNumber : ""}
                </span>
                {isWeddingDay && <CalendarDays size={14} className="text-primary" />}
              </div>
              <div className="space-y-1">
                {items.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="truncate rounded-md px-2 py-1 text-[10px] font-bold text-white"
                    style={{ backgroundColor: item.category.cor }}
                    title={item.titulo}
                  >
                    {item.titulo}
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="text-[10px] font-bold text-muted-foreground">+{items.length - 3} itens</p>
                )}
                {isWeddingDay && (
                  <div className="truncate rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-white">
                    Grande dia
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OverviewMode = ({
  categories,
  stats,
}: {
  categories: TimelineCategory[];
  stats: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    progress: number;
    upcoming: Array<TimelineItem & { category: TimelineCategory }>;
  };
}) => (
  <div className="mt-6 space-y-6">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Metric label="Itens" value={stats.total} />
      <Metric label="Concluídos" value={stats.completed} className="text-emerald-600" />
      <Metric label="Pendentes" value={stats.pending} className="text-amber-600" />
      <Metric label="Atrasados" value={stats.overdue} className="text-red-500" />
    </div>

    <div className="rounded-xl border border-border bg-secondary/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-extrabold text-foreground">Progresso geral</h3>
        <span className="text-sm font-extrabold text-primary">{stats.progress}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-background">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats.progress}%` }} />
      </div>
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-3">
        <h3 className="text-base font-extrabold text-foreground">Por categoria</h3>
        {categories.map((category) => {
          const done = category.itens.filter((item) => item.status === "concluido").length;
          const progress = category.itens.length > 0 ? Math.round((done / category.itens.length) * 100) : 0;
          return (
            <div key={category.id} className="rounded-xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.cor }} />
                  <span className="truncate text-sm font-extrabold text-foreground">{category.nome}</span>
                </div>
                <span className="shrink-0 text-xs font-bold text-muted-foreground">{done}/{category.itens.length}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: category.cor }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-extrabold text-foreground">Próximos passos</h3>
        {stats.upcoming.length > 0 ? (
          stats.upcoming.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-foreground">{item.titulo}</p>
                  <p className="text-xs font-semibold text-muted-foreground">{item.category.nome}</p>
                </div>
                <span className="shrink-0 rounded-lg bg-secondary px-2 py-1 text-[10px] font-extrabold uppercase text-muted-foreground">
                  {formatDate(item.data)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm font-bold text-muted-foreground">
            Nenhum próximo passo pendente.
          </div>
        )}
      </div>
    </div>
  </div>
);

const Metric = ({ label, value, className }: { label: string; value: number; className?: string }) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={cn("mt-1 text-2xl font-extrabold text-foreground", className)}>{value}</p>
  </div>
);
