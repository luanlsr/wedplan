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

export const CheckInView = ({ guests, onTogglePresence }: Omit<CheckInViewProps, 'suppliers'>) => {
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

  const staffGuests = useMemo(() => {
    return (guests || []).filter(g => 
      g.categoria.toLowerCase() === 'staff' &&
      g.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [guests, searchTerm]);

  const stats = {
    total: guests.length,
    presentes: guests.filter(g => g.is_present).length,
    ausentes: guests.filter(g => !g.is_present).length,
    porcentagem: guests.length > 0 ? (guests.filter(g => g.is_present).length / guests.length) * 100 : 0
  };

  return (
    <div className="space-y-6 max-w-full mx-auto pb-20">
      {/* Header Statístico */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
        <Card className="p-2 sm:p-6 bg-primary/10 border-none flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-4">
          <div className="p-1.5 sm:p-3 bg-primary/20 rounded-xl sm:rounded-2xl text-primary shrink-0 transition-colors">
            <Users size={16} className="sm:w-[24px] sm:h-[24px]" />
          </div>
          <div className="min-w-0">
            <p className="text-[7px] sm:text-xs font-black text-primary uppercase tracking-wider truncate">Total</p>
            <p className="text-lg sm:text-3xl font-black truncate leading-tight">{stats.total}</p>
          </div>
        </Card>
        <Card className="p-2 sm:p-6 bg-green-500/10 border-none flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-4 transition-all">
          <div className="p-1.5 sm:p-3 bg-green-500/20 rounded-xl sm:rounded-2xl text-green-600 shrink-0 transition-colors">
            <UserCheck size={16} className="sm:w-[24px] sm:h-[24px]" />
          </div>
          <div className="min-w-0">
            <p className="text-[7px] sm:text-xs font-black text-green-600 uppercase tracking-wider truncate">Pres.</p>
            <p className="text-lg sm:text-3xl font-black truncate leading-tight">{stats.presentes}</p>
          </div>
        </Card>
        <Card className="p-2 sm:p-6 bg-secondary/10 border-none flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1 sm:gap-4 overflow-hidden relative transition-all">
          <div className="p-1.5 sm:p-3 bg-secondary/20 rounded-xl sm:rounded-2xl text-foreground shrink-0 transition-colors">
            <PartyPopper size={16} className="sm:w-[24px] sm:h-[24px]" />
          </div>
          <div className="min-w-0">
            <p className="text-[7px] sm:text-xs font-black text-muted-foreground uppercase tracking-wider truncate">Prog.</p>
            <p className="text-lg sm:text-3xl font-black truncate leading-tight">{Math.round(stats.porcentagem)}%</p>
          </div>
          <div className="absolute bottom-0 left-0 h-0.5 sm:h-1 bg-green-500 transition-all duration-1000" style={{ width: `${stats.porcentagem}%` }} />
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex bg-card p-1 rounded-2xl border">
        <button
          onClick={() => setActiveTab('guests')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'guests' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-secondary"
          )}
        >
          <Users size={16} className="shrink-0" /> <span className="truncate">Convidados</span>
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'suppliers' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-secondary"
          )}
        >
          <Briefcase size={16} className="shrink-0" /> <span className="truncate">Fornecedores</span>
        </button>
      </div>

      {/* Busca e Filtros */}
      <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-center bg-card/60 backdrop-blur-xl p-3 sm:p-4 rounded-3xl border border-white/5 shadow-lg sticky top-[0px] lg:top-20 z-20">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
          <Input 
            placeholder={activeTab === 'guests' ? "Buscar convidado..." : "Buscar fornecedor..."}
            className="pl-12 h-12 sm:h-14 bg-secondary/20 border-none focus:bg-card transition-all text-base sm:text-lg"
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
                  "flex-1 px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-xs font-black uppercase tracking-tighter transition-all",
                  filter === f ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/10"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

        {/* Listas */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {activeTab === 'guests' ? (
            <>
              {filteredGuests.map(guest => (
                <Card 
                  key={guest.id} 
                  className={cn(
                    "p-4 border-none transition-all duration-500 flex flex-col xs:flex-row items-center justify-between gap-4 group",
                    guest.is_present ? "bg-green-500/5 ring-1 ring-green-500/20" : "bg-card hover:bg-secondary/10"
                  )}
                >
                  <div className="flex items-center gap-4 w-full xs:w-auto">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                      guest.is_present ? "bg-green-500 text-white" : "bg-secondary text-muted-foreground"
                    )}>
                      {guest.is_present ? <UserCheck size={22} /> : <UserMinus size={22} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className={cn("text-base sm:text-lg font-black truncate transition-colors", guest.is_present ? "text-green-700" : "text-foreground")}>
                        {guest.nome}
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-0.5">
                        <Badge variant="outline" className="bg-secondary/50 text-[9px] sm:text-[10px] uppercase font-black p-0 px-2 leading-tight">
                          {guest.categoria}
                        </Badge>
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                          {guest.adultos} AD + {guest.criancas} CR
                        </span>
                      </div>
                    </div>
                  </div>
  
                  <Button
                    onClick={() => onTogglePresence(guest.id, { is_present: !guest.is_present })}
                    className={cn(
                      "h-12 xs:h-14 w-full xs:w-auto px-6 xs:px-8 rounded-2xl text-[10px] xs:text-xs font-black uppercase tracking-widest transition-all shrink-0",
                      guest.is_present 
                        ? "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20" 
                        : "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/10"
                    )}
                  >
                    {guest.is_present ? (
                      <><CheckCircle2 className="mr-2" size={16} /> Presente</>
                    ) : (
                      <><Circle className="mr-2" size={16} /> Marcar</>
                    )}
                  </Button>
                </Card>
              ))}
            {filteredGuests.length === 0 && (
              <div className="col-span-full py-20 text-center opacity-50">
                <Users size={48} className="mx-auto mb-4" />
                <p className="font-bold">Nenhum convidado encontrado.</p>
              </div>
            )}
          </>
        ) : (
          <>
            {staffGuests.map(guest => (
              <Card 
                key={guest.id} 
                className={cn(
                  "p-4 border-none transition-all duration-500 flex flex-col xs:flex-row items-center justify-between gap-4 group",
                  guest.is_present ? "bg-green-500/5 ring-1 ring-green-500/20" : "bg-card hover:bg-secondary/10"
                )}
              >
                <div className="flex items-center gap-4 w-full xs:w-auto">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                    guest.is_present ? "bg-green-500 text-white" : "bg-secondary text-muted-foreground"
                  )}>
                    {guest.is_present ? <UserCheck size={22} /> : <UserMinus size={22} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={cn("text-base sm:text-lg font-black truncate transition-colors", guest.is_present ? "text-green-700" : "text-foreground")}>
                      {guest.nome}
                    </h4>
                    <div className="flex items-center gap-1 mt-0.5">
                       <span className="text-[9px] sm:text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                        Staff Oficial
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => onTogglePresence(guest.id, { is_present: !guest.is_present })}
                  className={cn(
                    "h-12 xs:h-14 w-full xs:w-auto px-6 xs:px-8 rounded-2xl text-[10px] xs:text-xs font-black uppercase tracking-widest transition-all shrink-0",
                    guest.is_present 
                      ? "bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/20" 
                      : "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/10"
                  )}
                >
                  {guest.is_present ? "Presente" : "Marcar"}
                </Button>
              </Card>
            ))}
            {staffGuests.length === 0 && (
              <div className="col-span-full py-20 text-center opacity-50">
                <Briefcase size={48} className="mx-auto mb-4" />
                <p className="font-bold">Nenhum staff encontrado nos convidados.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
