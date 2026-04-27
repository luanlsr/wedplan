import { Users, UserPlus, Search, ArrowUp, ArrowDown, ChevronDown, Filter, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { Card, Button, Input, useConfirm } from '../ui';
import type { Guest } from '../../types';
import { useState, useMemo, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { GuestStats } from './GuestStats';
import { GuestRow } from './GuestRow';
import { GuestCard } from './GuestCard';

interface GuestsListProps {
  guests: Guest[];
  onAdd: () => void;
  onEdit: (guest: Guest) => void;
  onUpdate: (id: string, guest: Partial<Guest>) => void;
  onDelete: (id: string) => void;
}

export const GuestsList = ({ guests, onAdd, onEdit, onUpdate, onDelete }: GuestsListProps) => {
  const { confirm } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterInvitation, setFilterInvitation] = useState('Todos');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Guest | 'total_pessoas', direction: 'asc' | 'desc' } | null>({ key: 'nome', direction: 'asc' });

  const [currentPage, setCurrentPage] = useState(1);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const itemsPerPage = 15;

  const categories = [
    'Todos', 
    'Convidados da Noiva', 
    'Convidados do Noivo', 
    'Padrinhos Noiva', 
    'Padrinhos Noivo',
    'Família Noiva', 
    'Família Noivo', 
    'Amigos Noiva', 
    'Amigos Noivo',
    'Padrinhos', 
    'Staff', 
    'Outros'
  ];
  const statuses = ['Todos', 'confirmado', 'pendente', 'recusado'];

  const requestSort = (key: keyof Guest | 'total_pessoas') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterStatus, filterInvitation]);
  const sortedAndFilteredGuests = useMemo(() => {
    let items = guests.filter(g => {
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
      
      const matchesInvitation = filterInvitation === 'Todos' || 
        (filterInvitation === 'Enviados' ? g.invitation_sent === true : g.invitation_sent === false);

      return matchesSearch && matchesCategory && matchesStatus && matchesInvitation;
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
  }, [guests, searchTerm, filterCategory, filterStatus, filterInvitation, sortConfig]);

  // Effect to update orderedIds only when criteria change OR guests are added/removed
  useEffect(() => {
    setOrderedIds(sortedAndFilteredGuests.map(g => g.id));
  }, [searchTerm, filterCategory, filterStatus, filterInvitation, sortConfig, guests.length]);

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
    adultos: guests.reduce((acc, g) => acc + (g.adultos || 0), 0),
    criancas: guests.reduce((acc, g) => acc + (g.criancas || 0), 0),
    noiva: guests.reduce((acc, g) => g.categoria.includes('Noiva') ? acc + (g.adultos || 0) + (g.criancas || 0) : acc, 0),
    noivo: guests.reduce((acc, g) => g.categoria.includes('Noivo') ? acc + (g.adultos || 0) + (g.criancas || 0) : acc, 0),
    convitesEnviados: guests.filter(g => g.invitation_sent).length,
  }), [guests]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <GuestStats totals={totals} />

      <Card className="border-none shadow-2xl overflow-hidden bg-card/60 backdrop-blur-xl rounded-[2rem]">
        <div className="p-6 sm:p-8 border-b border-border bg-muted/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-4 flex-1">
              <div className="relative w-full md:w-96 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                <Input
                  placeholder="Buscar convidado..."
                  className="h-12 pl-12 bg-secondary/10 border-border focus:bg-secondary/20 rounded-2xl font-bold"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex flex-col w-full gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <Button 
                      variant="outline" 
                      className={cn("md:hidden h-12 flex-1 rounded-2xl font-bold gap-2", showMobileFilters && "bg-primary/10 text-primary border-primary/20")}
                      onClick={() => setShowMobileFilters(!showMobileFilters)}
                    >
                      <Filter size={18} /> {showMobileFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                    </Button>
                     <div className="px-4 py-2 bg-secondary/10 rounded-xl border border-border shrink-0">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-2 hidden sm:inline">Encontrados:</span>
                        <span className="text-xs font-black text-primary">{displayGuests.length}</span>
                     </div>
                  </div>

                  <div className={cn(
                    "md:flex flex-col md:flex-row items-center gap-4 w-full md:w-auto",
                    showMobileFilters ? "flex animate-in slide-in-from-top-2 pt-4 md:pt-0 border-t md:border-none border-border" : "hidden"
                  )}>
                    <FilterSelect value={filterCategory} onChange={setFilterCategory} options={categories} icon={<Filter size={18}/>} label="Categoria" />
                    <FilterSelect value={filterStatus} onChange={setFilterStatus} options={statuses} icon={<Users size={18}/>} isStatus label="Status" />
                    <FilterSelect value={filterInvitation} onChange={setFilterInvitation} options={['Todos', 'Enviados', 'Pendentes']} icon={<Send size={18}/>} label="Convite" />
                    
                    {/* Sort Selector for Mobile */}
                    <div className="md:hidden w-full">
                      <FilterSelect 
                        value={sortConfig?.key || 'nome'} 
                        onChange={(val) => setSortConfig({ key: val as any, direction: 'asc' })} 
                        options={['nome', 'categoria', 'status', 'total_pessoas', 'invitation_sent']} 
                        icon={<ArrowUp size={18}/>} 
                        label="Ordenar por" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={onAdd} className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest gap-2 shadow-[0_10px_20px_rgba(var(--primary-rgb),0.2)]">
              <UserPlus size={18} /> Adicionar Grupo
            </Button>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort('nome')}>
                  <div className="flex items-center gap-2">
                    NOME {sortConfig?.key === 'nome' && (sortConfig.direction === 'asc' ? <ArrowDown size={12}/> : <ArrowUp size={12}/>)}
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort('categoria')}>
                  <div className="flex items-center gap-2">
                    CATEGORIA {sortConfig?.key === 'categoria' && (sortConfig.direction === 'asc' ? <ArrowDown size={12}/> : <ArrowUp size={12}/>)}
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort('total_pessoas')}>
                  <div className="flex items-center gap-2">
                    A/C {sortConfig?.key === 'total_pessoas' && (sortConfig.direction === 'asc' ? <ArrowDown size={12}/> : <ArrowUp size={12}/>)}
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort('status')}>
                  <div className="flex items-center gap-2">
                    STATUS {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowDown size={12}/> : <ArrowUp size={12}/>)}
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort('invitation_sent')}>
                  <div className="flex items-center gap-2">
                    CONVITE {sortConfig?.key === 'invitation_sent' && (sortConfig.direction === 'asc' ? <ArrowDown size={12}/> : <ArrowUp size={12}/>)}
                  </div>
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort('telefone')}>
                  <div className="flex items-center gap-2">
                    CONTATO {sortConfig?.key === 'telefone' && (sortConfig.direction === 'asc' ? <ArrowDown size={12}/> : <ArrowUp size={12}/>)}
                  </div>
                </th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
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
          <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 bg-muted/5">
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
          
          {totalPages > 1 && (
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 bg-muted/20 border-t border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Exibindo <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="text-foreground">{Math.min(currentPage * itemsPerPage, sortedAndFilteredGuests.length)}</span> de <span className="text-foreground">{sortedAndFilteredGuests.length}</span> convidados
              </p>
              <div className="flex items-center gap-1">
                <Button variant="outline" className="h-9 w-9 p-0 rounded-lg" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                  <ChevronLeft size={16} className="-mr-1" /><ChevronLeft size={16} />
                </Button>
                <Button variant="outline" className="h-9 w-9 p-0 rounded-lg" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                  <ChevronLeft size={16} />
                </Button>
                
                <div className="flex items-center gap-1 mx-2">
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (totalPages > 5 && Math.abs(page - currentPage) > 1 && page !== 1 && page !== totalPages) {
                      if (page === 2 || page === totalPages - 1) return <span key={page} className="text-muted-foreground text-xs mx-1">...</span>;
                      return null;
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "primary" : "ghost"}
                        className={cn("h-9 w-9 p-0 rounded-lg text-sm font-bold", currentPage === page && "shadow-md")}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button variant="outline" className="h-9 w-9 p-0 rounded-lg" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight size={16} />
                </Button>
                <Button variant="outline" className="h-9 w-9 p-0 rounded-lg" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                  <ChevronRight size={16} /><ChevronRight size={16} className="-ml-1" />
                </Button>
              </div>
            </div>
          )}

          {sortedAndFilteredGuests.length === 0 && (
            <div className="p-20 text-center space-y-4">
               <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                  <Users size={40} />
               </div>
               <p className="font-bold text-muted-foreground">Nenhum convidado encontrado.</p>
            </div>
          )}
      </Card>
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
        <option key={o} value={o} className="bg-slate-900 border-none px-4 py-2 capitalize font-medium">
          {o === "Todos" ? (isStatus ? "Todos os Status" : `Todas as ${label}s`) : 
           isStatus ? (o === "confirmado" ? "Confirmados" : o === "pendente" ? "Pendentes" : "Recusados") : 
           o === "total_pessoas" ? "Acompanhantes" :
           o === "invitation_sent" ? "Status do Convite" :
           o}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
  </div>
);
