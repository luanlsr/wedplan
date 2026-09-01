import { Users, UserPlus, Search, ArrowUp, ArrowDown, ChevronDown, Filter, X, Tags, Plus, Trash2 } from 'lucide-react';
import { Card, Button, Input, PaginationBar, useConfirm } from '../ui';
import type { Guest, GuestCategory } from '../../types';
import { useState, useMemo, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { sortTextPtBr, uniqueSortedTextPtBr } from '../../utils/sorting';
import { GuestStats } from './GuestStats';
import { GuestRow } from './GuestRow';
import { GuestCard } from './GuestCard';

interface GuestsListProps {
  guests: Guest[];
  categories: string[];
  customCategories: GuestCategory[];
  onAdd: () => void;
  onEdit: (guest: Guest) => void;
  onUpdate: (id: string, guest: Partial<Guest>) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onAddCategory: (name: string) => void | Promise<void>;
  onDeleteCategory: (categoryId: string, categoryName: string) => void | Promise<void>;
}

type GuestSortKey = keyof Guest | 'total_pessoas';

const guestSortOptions: GuestSortKey[] = ['total_pessoas', 'categoria', 'nome', 'status', 'invitation_sent'];

export const GuestsList = ({
  guests,
  categories,
  customCategories,
  onAdd,
  onEdit,
  onUpdate,
  onDelete,
  onAddCategory,
  onDeleteCategory
}: GuestsListProps) => {
  const { confirm, alert: customAlert, toast } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: GuestSortKey, direction: 'asc' | 'desc' } | null>({ key: 'nome', direction: 'asc' });

  const [currentPage, setCurrentPage] = useState(1);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const itemsPerPage = 15;

  const filterCategories = useMemo(() => [
    'Todos',
    ...uniqueSortedTextPtBr(['Convidados da Noiva', 'Convidados do Noivo', 'Padrinhos', 'Família', 'Amigos', ...categories]),
  ], [categories]);
  const statuses = useMemo(() => [
    'Todos',
    ...['confirmado', 'pendente', 'recusado'].sort((a, b) => sortTextPtBr(getGuestStatusLabel(a), getGuestStatusLabel(b))),
  ], []);

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    if (categories.some((category) => category.toLowerCase() === name.toLowerCase())) {
      await customAlert({
        title: 'Categoria já existe',
        description: 'Escolha outro nome para a categoria de convidados.',
        type: 'warning',
        confirmLabel: 'Entendi',
      });
      return;
    }

    setSavingCategory(true);
    try {
      await onAddCategory(name);
      setNewCategory('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar a categoria.';
      await customAlert({
        title: 'Não foi possível criar',
        description: message,
        type: 'danger',
        confirmLabel: 'Entendi',
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (category: GuestCategory) => {
    const guestsInCategory = guests.filter((guest) => guest.categoria === category.name).length;
    const isConfirmed = await confirm({
      title: 'Excluir categoria?',
      description: guestsInCategory > 0
        ? `A categoria "${category.name}" será removida e ${guestsInCategory} convidado(s) voltarão para "Outros".`
        : `A categoria "${category.name}" será removida.`,
      type: 'danger',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
    });

    if (!isConfirmed) return;

    try {
      await onDeleteCategory(category.id, category.name);
      if (filterCategory === category.name) setFilterCategory('Todos');
      toast({
        title: 'Categoria removida',
        description: `A categoria "${category.name}" foi excluída.`,
        type: 'success',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível excluir a categoria.';
      await customAlert({
        title: 'Não foi possível excluir',
        description: message,
        type: 'danger',
        confirmLabel: 'Entendi',
      });
    }
  };

  const requestSort = (key: GuestSortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStatus]);
  const sortedAndFilteredGuests = useMemo(() => {
    const items = guests.filter(g => {
      const matchesSearch = g.nome.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesCategory = false;
      if (filterCategory === 'Todos') {
        matchesCategory = true;
      } else if (filterCategory === 'Convidados da Noiva') {
        matchesCategory = g.categoria.toLocaleLowerCase().includes('noiva');
      } else if (filterCategory === 'Convidados do Noivo') {
        matchesCategory = g.categoria.toLocaleLowerCase().includes('noivo');
      } else if (filterCategory === 'Padrinhos') {
        // Filtro Geral: Pega qualquer categoria que comece ou contenha Padrinho
        matchesCategory = g.categoria.includes('Padrinho');
      } else if (filterCategory === 'Família') {
        matchesCategory = g.categoria.includes('Família');
      } else if (filterCategory === 'Amigos') {
        matchesCategory = g.categoria.includes('Amigos');
      } else {
        // Filtros Específicos (Padrinhos Noiva, Padrinhos Noivo, etc): Comparação exata
        matchesCategory = g.categoria === filterCategory;
      }

      const matchesStatus = filterStatus === 'Todos' || g.status === filterStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    if (sortConfig) {
      items.sort((a, b) => {
        let valA = a[sortConfig.key as keyof Guest] ?? '';
        let valB = b[sortConfig.key as keyof Guest] ?? '';

        if (sortConfig.key === 'total_pessoas') {
          valA = (a.adultos || 0) + (a.criancas || 0);
          valB = (b.adultos || 0) + (b.criancas || 0);
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [guests, searchTerm, filterCategory, filterStatus, sortConfig]);

  // Effect to update orderedIds only when criteria change OR guests are added/removed
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrderedIds(sortedAndFilteredGuests.map(g => g.id));
  }, [sortedAndFilteredGuests]);

  // The actual guests to display, in the frozen order, with latest data
  const displayGuests = useMemo(() => {
    return orderedIds
      .map(id => guests.find(g => g.id === id))
      .filter((g): g is Guest => !!g);
  }, [orderedIds, guests]);

  const totalPages = Math.ceil(displayGuests.length / itemsPerPage);
  const paginatedItems = displayGuests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totals = useMemo(() => ({
    total: guests.length,
    confirmados: guests.filter(g => g.status === 'confirmado').length,
    pendentes: guests.filter(g => g.status === 'pendente').length,
    convidados: guests.reduce((acc, g) => g.categoria.trim().toLowerCase() !== 'staff' ? acc + (g.adultos || 0) + (g.criancas || 0) : acc, 0),
    adultos: guests.reduce((acc, g) => acc + (g.adultos || 0), 0),
    criancas: guests.reduce((acc, g) => acc + (g.criancas || 0), 0),
    noiva: guests.reduce((acc, g) => g.categoria.includes('Noiva') ? acc + (g.adultos || 0) + (g.criancas || 0) : acc, 0),
    noivo: guests.reduce((acc, g) => g.categoria.includes('Noivo') ? acc + (g.adultos || 0) + (g.criancas || 0) : acc, 0),
    staff: guests.reduce((acc, g) => g.categoria.trim().toLowerCase() === 'staff' ? acc + (g.adultos || 0) + (g.criancas || 0) : acc, 0),
    meia: guests.reduce((acc, g) => {
      const isStaff = g.categoria.trim().toLowerCase() === 'staff';
      return acc + (isStaff ? (g.adultos || 0) + (g.criancas || 0) : 0) + (g.criancas || 0);
    }, 0),
  }), [guests]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <div className="flex items-center justify-between mb-4 sm:hidden px-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground leading-none mb-1">Convidados</p>
              <p className="text-xl font-black">{totals.convidados} <span className="text-[10px] text-muted-foreground italic">(sem staff)</span></p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary font-black uppercase text-[10px] gap-1 px-3 bg-primary/5 rounded-lg"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? 'Ocultar' : 'Detalhes'}
          </Button>
        </div>
        <div className={cn("sm:block", !showStats && "hidden sm:block")}>
          <GuestStats totals={totals} />
        </div>
      </div>

      <Card className="overflow-hidden border-border bg-card/90 shadow-sm -mx-4 rounded-none sm:mx-0 sm:rounded-xl">
        <div className="p-4 sm:p-8 border-b border-border/50 bg-muted/20 sm:bg-transparent">
          <div className="flex flex-col gap-6">
            {/* PRIMEIRA LINHA: BUSCA E AÇÕES */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              <div className="flex gap-3 w-full xl:w-[480px]">
                <div className="relative w-full group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                  <Input
                    placeholder="Buscar convidado..."
                    className="h-10 sm:h-12 pl-10 pr-10 sm:pl-12 bg-secondary/10 border-border focus:bg-secondary/20 rounded-xl sm:rounded-2xl font-bold w-full text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      aria-label="Limpar busca"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  className={cn("xl:hidden h-12 w-12 px-0 shrink-0 rounded-2xl transition-colors", showMobileFilters && "bg-primary/10 text-primary border-primary/20")}
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                >
                  <Filter size={20} />
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto mt-2 xl:mt-0">
                <Button onClick={onAdd} className="h-11 flex-1 sm:flex-none px-5 rounded-xl font-extrabold gap-2 whitespace-nowrap text-sm">
                  <UserPlus size={18} className="shrink-0" /> Adicionar Convidado
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("h-11 flex-1 sm:flex-none px-5 rounded-xl font-extrabold gap-2 whitespace-nowrap text-sm", showCategories && "border-primary/30 bg-primary/10 text-primary")}
                  onClick={() => setShowCategories(!showCategories)}
                >
                  <Tags size={18} className="shrink-0" /> Categorias
                </Button>
              </div>
            </div>

            {showCategories && (
              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Categorias de convidados</p>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      Crie grupos personalizados para filtrar a lista e organizar melhor os convites.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newCategory}
                      onChange={(event) => setNewCategory(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void handleAddCategory();
                        }
                      }}
                      placeholder="Nova categoria"
                      className="h-11 min-w-0 rounded-xl bg-background md:w-64"
                    />
                    <Button
                      type="button"
                      className="h-11 rounded-xl font-black"
                      onClick={handleAddCategory}
                      disabled={savingCategory || !newCategory.trim()}
                    >
                      <Plus size={17} /> Criar
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {customCategories.length === 0 ? (
                    <span className="rounded-full border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground">
                      Nenhuma categoria personalizada criada.
                    </span>
                  ) : customCategories.map((category) => (
                    <span key={category.id} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-xs font-black text-foreground">
                      {category.name}
                      <button
                        type="button"
                        className="text-muted-foreground transition hover:text-destructive"
                        onClick={() => void handleDeleteCategory(category)}
                        aria-label={`Excluir categoria ${category.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* SEGUNDA LINHA: FILTROS E CONTAGEM */}
            <div className={cn(
              "flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 transition-all w-full",
              showMobileFilters ? "flex" : "hidden xl:flex"
            )}>
              <div className="flex flex-col md:flex-row flex-wrap items-center gap-3 w-full xl:w-auto">
                <FilterSelect value={filterCategory} onChange={setFilterCategory} options={filterCategories} icon={<Filter size={18}/>} label="Categoria" />
                <FilterSelect value={filterStatus} onChange={setFilterStatus} options={statuses} icon={<Users size={18}/>} isStatus label="Status" />
                
                <div className="md:hidden w-full mt-2">
                  <FilterSelect 
                    value={sortConfig?.key || 'nome'} 
                    onChange={(val) => setSortConfig({ key: val as GuestSortKey, direction: 'asc' })} 
                    options={guestSortOptions} 
                    icon={<ArrowUp size={18}/>} 
                    label="Ordenar por" 
                  />
                </div>
              </div>

              <div className="px-5 py-3 h-12 bg-secondary/10 rounded-xl border border-border text-center shadow-sm w-full md:w-auto self-end xl:self-auto shrink-0 flex items-center justify-center">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-2">Encontrados:</span>
                <span className="text-sm font-black text-primary">{displayGuests.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort('nome')}>
                  <div className="flex items-center gap-2">
                    Convidado {sortConfig?.key === 'nome' && (sortConfig.direction === 'asc' ? <ArrowDown size={14}/> : <ArrowUp size={14}/>)}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort('status')}>
                  <div className="flex items-center gap-2">
                    Status {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowDown size={14}/> : <ArrowUp size={14}/>)}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort('invitation_sent')}>
                  <div className="flex items-center gap-2">
                    Convite {sortConfig?.key === 'invitation_sent' && (sortConfig.direction === 'asc' ? <ArrowDown size={14}/> : <ArrowUp size={14}/>)}
                  </div>
                </th>
                <th className="px-6 py-4 cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort('telefone')}>
                  <div className="flex items-center gap-2">
                    Contato {sortConfig?.key === 'telefone' && (sortConfig.direction === 'asc' ? <ArrowDown size={14}/> : <ArrowUp size={14}/>)}
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((guest) => (
                <GuestRow 
                  key={guest.id} 
                  guest={guest} 
                  onEdit={onEdit} 
                  onUpdate={onUpdate} 
                  onDelete={onDelete} 
                  confirm={confirm}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden">
          <div className="flex flex-col bg-background/50 backdrop-blur-sm divide-y divide-border/10">
            {paginatedItems.map((guest) => (
              <GuestCard 
                key={guest.id} 
                guest={guest} 
                onEdit={onEdit} 
                onUpdate={onUpdate} 
                onDelete={onDelete} 
                confirm={confirm}
              />
            ))}
          </div>
        </div>
          
          {sortedAndFilteredGuests.length === 0 && (
            <div className="p-20 text-center space-y-4">
               <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                  <Users size={40} />
               </div>
               <p className="font-bold text-muted-foreground">Nenhum convidado encontrado.</p>
            </div>
          )}
      </Card>

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedAndFilteredGuests.length}
        itemsPerPage={itemsPerPage}
        itemLabel="convidado"
        itemLabelPlural="convidados"
        onPageChange={setCurrentPage}
        className="mx-0"
      />
    </div>
  );
};

const FilterSelect = ({ value, onChange, options, icon, isStatus, label }: { value: string, onChange: (v: string) => void, options: string[], icon: React.ReactNode, isStatus?: boolean, label: string }) => (
  <div className="relative w-full md:min-w-[240px] md:w-fit">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-colors">
      {icon}
    </div>
    <select
      className="h-11 w-full pl-12 pr-10 rounded-xl bg-secondary/10 border border-border text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer hover:bg-secondary/20"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o: string) => (
        <option key={o} value={o}>
          {o === "Todos" ? (isStatus ? "Todos os Status" : `Todas as ${label}s`) :
           isStatus ? getGuestStatusLabel(o) :
           o === "total_pessoas" ? "Acompanhantes" :
           o === "invitation_sent" ? "Status do Convite" :
           o}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
  </div>
);

const getGuestStatusLabel = (status: string) => {
  if (status === "confirmado") return "Confirmados";
  if (status === "pendente") return "Pendentes";
  if (status === "recusado") return "Recusados";
  return status;
};
