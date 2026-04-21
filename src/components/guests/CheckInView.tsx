import { useState, useMemo } from 'react';
import { Card, Button, Input, Badge } from '../ui';
import { Briefcase, Search, UserCheck, UserMinus, Users, CheckCircle2, Circle, PartyPopper } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Guest, Supplier } from '../../types';

interface CheckInViewProps {
  guests: Guest[];
  suppliers: Supplier[];
  onTogglePresence: (id: string, updated: Partial<Guest>) => void;
}

export const CheckInView = ({ guests, suppliers, onTogglePresence }: CheckInViewProps) => {
  const [activeTab, setActiveTab] = useState<'guests' | 'suppliers'>('guests');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'todos' | 'presentes' | 'ausentes'>('todos');

  const filteredGuests = useMemo(() => {
    return guests.filter(g => {
      const matchesSearch = g.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = 
        filter === 'todos' ? true :
        filter === 'presentes' ? g.is_present : !g.is_present;
      return matchesSearch && matchesFilter;
    });
  }, [guests, searchTerm, filter]);

  const filteredSuppliers = useMemo(() => {
    return (suppliers || []).filter(s => 
      s.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.staff_names?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [suppliers, searchTerm]);

  const stats = {
    total: guests.length,
    presentes: guests.filter(g => g.is_present).length,
    ausentes: guests.filter(g => !g.is_present).length,
    porcentagem: guests.length > 0 ? (guests.filter(g => g.is_present).length / guests.length) * 100 : 0
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header Statístico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-primary/10 border-none flex items-center gap-4">
          <div className="p-3 bg-primary/20 rounded-2xl text-primary">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-primary uppercase tracking-wider">Total</p>
            <p className="text-3xl font-black">{stats.total}</p>
          </div>
        </Card>
        <Card className="p-6 bg-green-500/10 border-none flex items-center gap-4">
          <div className="p-3 bg-green-500/20 rounded-2xl text-green-600">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-green-600 uppercase tracking-wider">Presentes</p>
            <p className="text-3xl font-black">{stats.presentes}</p>
          </div>
        </Card>
        <Card className="p-6 bg-secondary/10 border-none flex items-center gap-4 overflow-hidden relative">
          <div className="p-3 bg-secondary/20 rounded-2xl text-foreground">
            <PartyPopper size={24} />
          </div>
          <div>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">Progresso</p>
            <p className="text-3xl font-black">{Math.round(stats.porcentagem)}%</p>
          </div>
          <div className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-1000" style={{ width: `${stats.porcentagem}%` }} />
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex bg-card p-1 rounded-2xl border">
        <button
          onClick={() => setActiveTab('guests')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-black uppercase tracking-wider transition-all",
            activeTab === 'guests' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-secondary"
          )}
        >
          <Users size={18} /> Convidados
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-sm font-black uppercase tracking-wider transition-all",
            activeTab === 'suppliers' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-secondary"
          )}
        >
          <Briefcase size={18} /> Equipe Fornecedores
        </button>
      </div>

      {/* Busca e Filtros */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-3xl border shadow-sm sticky top-20 z-10">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input 
            placeholder={activeTab === 'guests' ? "Buscar nome do convidado..." : "Buscar fornecedor ou funcionário..."}
            className="pl-12 h-14 bg-secondary/20 border-none focus:bg-card transition-all text-lg"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {activeTab === 'guests' && (
          <div className="flex bg-secondary/30 p-1 rounded-2xl w-full md:w-auto">
            {(['todos', 'presentes', 'ausentes'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "flex-1 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter transition-all",
                  filter === f ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:bg-white/10"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Listas */}
      <div className="grid gap-3">
        {activeTab === 'guests' ? (
          <>
            {filteredGuests.map(guest => (
              <Card 
                key={guest.id} 
                className={cn(
                  "p-4 border-none transition-all duration-500 flex items-center justify-between group",
                  guest.is_present ? "bg-green-500/5 ring-1 ring-green-500/20" : "bg-card hover:bg-secondary/10"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                    guest.is_present ? "bg-green-500 text-white" : "bg-secondary text-muted-foreground"
                  )}>
                    {guest.is_present ? <UserCheck size={24} /> : <UserMinus size={24} />}
                  </div>
                  <div>
                    <h4 className={cn("text-lg font-black transition-colors", guest.is_present ? "text-green-700" : "text-foreground")}>
                      {guest.nome}
                    </h4>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="bg-secondary/50 text-[10px] uppercase font-bold p-0 px-2">
                        {guest.categoria}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {guest.adultos} AD + {guest.criancas} CR
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => onTogglePresence(guest.id, { is_present: !guest.is_present })}
                  className={cn(
                    "h-14 px-8 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                    guest.is_present 
                      ? "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20" 
                      : "bg-primary hover:bg-primary/90 text-white"
                  )}
                >
                  {guest.is_present ? (
                    <>
                      <CheckCircle2 className="mr-2" size={18} /> Presente
                    </>
                  ) : (
                    <>
                      <Circle className="mr-2" size={18} /> Marcar Presença
                    </>
                  )}
                </Button>
              </Card>
            ))}
            {filteredGuests.length === 0 && (
              <div className="py-20 text-center opacity-50">
                <Users size={48} className="mx-auto mb-4" />
                <p className="font-bold">Nenhum convidado encontrado.</p>
              </div>
            )}
          </>
        ) : (
          <>
            {filteredSuppliers.map(supplier => (
              <Card key={supplier.id} className="p-6 bg-card border-none hover:shadow-md transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-primary">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black">{supplier.fornecedor}</h4>
                    <Badge variant="outline" className="bg-primary/10 text-primary text-[10px] uppercase font-bold p-0 px-2">
                      {supplier.categoria}
                    </Badge>
                  </div>
                </div>
                
                <div className="bg-secondary/30 rounded-2xl p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">Equipe Confirmada</p>
                  <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">
                    {supplier.staff_names || "Nenhum funcionário cadastrado."}
                  </p>
                </div>
              </Card>
            ))}
            {filteredSuppliers.length === 0 && (
              <div className="py-20 text-center opacity-50">
                <Briefcase size={48} className="mx-auto mb-4" />
                <p className="font-bold">Nenhum fornecedor encontrado.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
