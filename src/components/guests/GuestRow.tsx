import { Edit2, Trash2, Check, X, Clock, Send, ChevronDown, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, Badge } from '../ui';
import type { Guest } from '../../types';

interface GuestRowProps {
  guest: Guest;
  onEdit: (guest: Guest) => void;
  onUpdate: (id: string, guest: Partial<Guest>) => void;
  onDelete: (id: string) => void;
  confirm: (options: any) => Promise<boolean>;
}

export const GuestRow = ({ guest, onEdit, onUpdate, onDelete, confirm }: GuestRowProps) => {
  const getStatusColor = () => {
    switch (guest.status) {
      case 'confirmado': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'recusado': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
    }
  };

  return (
    <tr className="hover:bg-muted/30 transition-colors group border-b border-border/50">
      <td className="px-8 py-5">
        <div className="flex flex-col">
          <span className={cn("font-black text-xl tracking-tight mb-1", guest.status === 'recusado' && "opacity-40 line-through")}>{guest.nome}</span>
          <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            <div className="flex items-center gap-1.5 shrink-0">
              <Users size={14} className="text-primary/30" />
              <span className="text-foreground/80">{(guest.adultos || 0) + (guest.criancas || 0)}</span>
            </div>
            <Badge variant="outline">
              {guest.categoria}
            </Badge>
          </div>
          {guest.children_names && <span className="text-[10px] text-muted-foreground italic truncate max-w-[200px] mt-1">({guest.children_names})</span>}
        </div>
      </td>
      {/* Coluna A/C removida pois a info agora está sob o nome */}
      <td className="px-8 py-5">
        <div className="relative w-fit">
          <select
            value={guest.status}
            onChange={(e) => onUpdate(guest.id, { status: e.target.value as any })}
            className={cn(
              "h-10 pl-4 pr-10 rounded-xl border font-black text-xs uppercase tracking-tight shadow-sm appearance-none cursor-pointer outline-none transition-all active:scale-95",
              getStatusColor()
            )}
          >
            <option value="confirmado">Confirmado</option>
            <option value="pendente">Pendente</option>
            <option value="recusado">Recusado</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" size={14} />
        </div>
      </td>
      <td className="px-8 py-5">
        <button
          onClick={() => onUpdate(guest.id, { invitation_sent: !guest.invitation_sent })}
          className={cn(
            "flex items-center gap-3 px-3 py-1.5 rounded-xl border transition-all active:scale-95",
            guest.invitation_sent ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/30 border-border text-muted-foreground"
          )}
        >
          <Send size={14} className={cn(guest.invitation_sent ? "opacity-100" : "opacity-40")} />
          <span className="text-[10px] font-black uppercase tracking-widest">{guest.invitation_sent ? 'Enviado' : 'Pendente'}</span>
        </button>
      </td>
      <td className="px-8 py-5 text-base font-black text-foreground/80 font-mono tracking-tighter">{guest.telefone || '-'}</td>
      <td className="px-8 py-5 text-right">
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" className="h-10 w-10 p-0 text-primary hover:bg-primary/10 rounded-xl" onClick={() => onEdit(guest)}>
            <Edit2 size={18} />
          </Button>
          <Button variant="ghost" className="h-10 w-10 p-0 text-destructive hover:bg-destructive/10 rounded-xl" onClick={async () => {
            const isConfirmed = await confirm({
              title: "Excluir?",
              description: `Remover ${guest.nome}?`,
              type: "danger",
            });
            if (isConfirmed) onDelete(guest.id);
          }}>
            <Trash2 size={18} />
          </Button>
        </div>
      </td>
    </tr>
  );
};
