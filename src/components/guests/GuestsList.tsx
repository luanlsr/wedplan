import { Users, UserPlus, Trash2, Edit2, Search } from 'lucide-react';
import { Card, Button, Input, Badge } from '../ui';
import type { Guest } from '../../types';
import { useState } from 'react';

interface GuestsListProps {
  guests: Guest[];
  onAdd: () => void;
  onEdit: (guest: Guest) => void;
  onUpdate: (id: string, guest: Partial<Guest>) => void;
  onDelete: (id: string) => void;
}

export const GuestsList = ({ guests, onAdd, onEdit, onUpdate, onDelete }: GuestsListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todos');

  const categories = ['Todos', 'Família Noiva', 'Família Noivo', 'Amigos Noiva', 'Amigos Noivo', 'Padrinhos', 'Outros'];

  const filteredGuests = guests.filter(g => {
    const matchesSearch = g.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'Todos' || g.categoria === filterCategory;
    return matchesSearch && matchesCategory;
  });

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

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-2xl shadow-sm border">
        <div className="flex flex-1 gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Buscar convidado..." 
              className="pl-10 h-11 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={filterCategory === cat ? "primary" : "outline"}
                className="rounded-full whitespace-nowrap px-4 font-bold h-11"
                onClick={() => setFilterCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
        <Button className="gap-2 h-11 px-6 rounded-xl font-bold shadow-lg shadow-primary/20" onClick={onAdd}>
          <UserPlus size={18} />
          Novo Convidado
        </Button>
      </div>

      <Card className="border-none shadow-xl overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider">Convidado</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider">Categoria</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider">Pessoas</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider">Contato</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredGuests.map((guest) => (
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
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" className="h-8 w-8 p-0 text-primary" onClick={() => onEdit(guest)}>
                        <Edit2 size={14} />
                      </Button>
                      <Button variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => {
                         if(window.confirm('Excluir convidado?')) onDelete(guest.id);
                      }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredGuests.length === 0 && (
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
