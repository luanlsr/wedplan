import { Users, UserPlus, Trash2, Edit2, Search, ArrowUp, ArrowDown, ChevronDown, Filter, Briefcase } from 'lucide-react';
import { Card, Button, Input, Badge, useConfirm } from '../ui';
import type { Guest } from '../../types';
import { useState, useMemo } from 'react';

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
  const [sortConfig, setSortConfig] = useState<{ key: keyof Guest | 'total_pessoas', direction: 'asc' | 'desc' } | null>(null);

  const categories = ['Todos', 'Noivos', 'Família Noiva', 'Família Noivo', 'Amigos Noiva', 'Amigos Noivo', 'Padrinhos', 'Staff', 'Outros'];
  const statuses = ['Todos', 'confirmado', 'pendente', 'recusado'];

  const requestSort = (key: keyof Guest | 'total_pessoas') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredGuests = useMemo(() => {
    let items = guests.filter(g => {
      const matchesSearch = g.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'Todos' || g.categoria === filterCategory;
      const matchesStatus = filterStatus === 'Todos' || g.status === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });

    if (sortConfig) {
      items.sort((a, b) => {
        let valA: any = a[sortConfig.key as keyof Guest];
        let valB: any = b[sortConfig.key as keyof Guest];

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

  const totals = {
    total: guests.length,
    confirmados: guests.filter(g => g.status === 'confirmado').length,
    pendentes: guests.filter(g => g.status === 'pendente').length,
    adultos: guests.reduce((acc, g) => acc + (g.adultos || 0), 0),
    criancas: guests.reduce((acc, g) => acc + (g.criancas || 0), 0)
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-primary/10 border-none">
          <p className="text-xs font-bold text-primary uppercase">Total Convidados</p>
          <p className="text-2xl font-black">{totals.adultos + totals.criancas}</p>
          <p className="text-[10px] text-muted-foreground uppercase font-bold">{totals.total} grupos/famílias</p>
        </Card>
        <Card className="p-4 bg-green-500/10 border-none">
          <p className="text-xs font-bold text-green-600 uppercase">Confirmados</p>
          <p className="text-2xl font-black">{totals.confirmados}</p>
        </Card>
        <Card className="p-4 bg-amber-500/10 border-none">
          <p className="text-xs font-bold text-amber-600 uppercase">Pendentes</p>
          <p className="text-2xl font-black">{totals.pendentes}</p>
        </Card>
        <Card className="p-4 bg-blue-500/10 border-none">
          <p className="text-xs font-bold text-blue-600 uppercase">Adultos/Crianças</p>
          <p className="text-2xl font-black">{totals.adultos} <span className="text-sm font-medium">/ {totals.criancas}</span></p>
        </Card>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-card p-4 rounded-2xl shadow-sm border">
        <div className="flex flex-col md:flex-row flex-1 gap-4 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Buscar convidado..." 
              className="pl-10 h-11 rounded-xl w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <FilterSelect 
              value={filterCategory} 
              onChange={setFilterCategory} 
              options={categories} 
              icon={<Briefcase size={16} />} 
              label="Categoria"
            />
            <FilterSelect 
              value={filterStatus} 
              onChange={setFilterStatus} 
              options={statuses} 
              icon={<Filter size={16} />} 
              label="Status"
              isStatus
            />
          </div>
        </div>
        <Button className="gap-2 h-11 px-6 rounded-xl font-bold shadow-lg shadow-primary/20 w-full lg:w-auto mt-4 lg:mt-0" onClick={onAdd}>
          <UserPlus size={18} />
          Novo Convidado
        </Button>
      </div>

      <Card className="border-none shadow-xl overflow-hidden rounded-3xl">
        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-border">
          {sortedAndFilteredGuests.map((guest) => (
            <div key={guest.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-lg">{guest.nome}</p>
                  <p className="text-xs font-bold text-primary uppercase">{guest.categoria}</p>
                </div>
                <button 
                  onClick={() => {
                    const statusMap: Record<string, "confirmado" | "pendente" | "recusado"> = {
                      'pendente': 'confirmado',
                      'confirmado': 'recusado',
                      'recusado': 'pendente'
                    };
                    onUpdate(guest.id, { status: statusMap[guest.status] });
                  }}
                >
                  {guest.status === 'confirmado' ? <Badge variant="success">Confirmado</Badge> :
                   guest.status === 'pendente' ? <Badge variant="warning">Pendente</Badge> :
                   <Badge variant="error">Recusado</Badge>}
                </button>
              </div>
              
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <div className="flex gap-2 text-sm font-bold">
                     <span className="bg-secondary px-2 py-0.5 rounded text-xs leading-relaxed">{guest.adultos} Adultos</span>
                     {guest.criancas > 0 && <span className="bg-secondary px-2 py-0.5 rounded text-xs leading-relaxed">{guest.criancas} Crianças</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{guest.telefone || 'Sem telefone'}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="outline" className="h-10 w-10 p-0 text-primary border-primary/20" onClick={() => onEdit(guest)}>
                    <Edit2 size={16} />
                  </Button>
                    <Button variant="outline" className="h-10 w-10 p-0 text-destructive border-destructive/20" onClick={async () => {
                       const isConfirmed = await confirm({
                         title: "Excluir Convidado?",
                         description: `Tem certeza que deseja remover este convidado da lista?`,
                         type: "danger",
                         confirmLabel: "Excluir",
                         cancelLabel: "Cancelar"
                       });
                       if (isConfirmed) onDelete(guest.id);
                    }}>
                      <Trash2 size={16} />
                    </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-4">
                  <button onClick={() => requestSort('nome')} className="flex items-center gap-1 text-xs font-black uppercase tracking-wider hover:text-primary transition-colors">
                    Convidado {sortConfig?.key === 'nome' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button onClick={() => requestSort('categoria')} className="flex items-center gap-1 text-xs font-black uppercase tracking-wider hover:text-primary transition-colors">
                    Categoria {sortConfig?.key === 'categoria' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button onClick={() => requestSort('total_pessoas')} className="flex items-center gap-1 text-xs font-black uppercase tracking-wider hover:text-primary transition-colors">
                    Pessoas {sortConfig?.key === 'total_pessoas' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </button>
                </th>
                <th className="px-6 py-4">
                  <button onClick={() => requestSort('status')} className="flex items-center gap-1 text-xs font-black uppercase tracking-wider hover:text-primary transition-colors">
                    Status {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                  </button>
                </th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider">Contato</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedAndFilteredGuests.map((guest) => (
                <tr key={guest.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4 font-bold">{guest.nome}</td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="font-bold border-primary/20 text-primary">{guest.categoria}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 text-sm font-bold">
                       <span>{guest.adultos} A</span>
                       {guest.criancas > 0 && <span className="text-muted-foreground">{guest.criancas} C</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => {
                        const statusMap: Record<string, "confirmado" | "pendente" | "recusado"> = {
                          'pendente': 'confirmado',
                          'confirmado': 'recusado',
                          'recusado': 'pendente'
                        };
                        onUpdate(guest.id, { status: statusMap[guest.status] });
                      }}
                    >
                      {guest.status === 'confirmado' ? <Badge variant="success">Confirmado</Badge> :
                       guest.status === 'pendente' ? <Badge variant="warning">Pendente</Badge> :
                       <Badge variant="error">Recusado</Badge>}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-muted-foreground">{guest.telefone || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" className="h-8 w-8 p-0 text-primary" onClick={() => onEdit(guest)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={async () => {
                         const isConfirmed = await confirm({
                           title: "Excluir Convidado?",
                           description: `Tem certeza que deseja remover "${guest.nome}"?`,
                           type: "danger",
                           confirmLabel: "Excluir",
                           cancelLabel: "Cancelar"
                         });
                         if (isConfirmed) onDelete(guest.id);
                      }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedAndFilteredGuests.length === 0 && (
            <div className="p-20 text-center space-y-4">
               <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                  <Users size={40} />
               </div>
               <p className="font-bold text-muted-foreground">Nenhum convidado encontrado.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

const FilterSelect = ({ value, onChange, options, icon, isStatus, label }: any) => (
  <div className="relative w-full md:w-52">
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
          {o === "Todos" ? `Todas ${label}s` : (isStatus ? (o === "confirmado" ? "Confirmados" : o === "pendente" ? "Pendentes" : "Recusados") : o)}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
  </div>
);
