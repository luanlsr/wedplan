import { Edit2, Trash2, Send, ChevronDown, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, Badge, useConfirm, type ConfirmOptions } from '../ui';
import type { Guest } from '../../types';
import { sortTextPtBr } from '../../utils/sorting';

interface GuestRowProps {
  guest: Guest;
  onEdit: (guest: Guest) => void;
  onUpdate: (id: string, guest: Partial<Guest>) => void;
  onDelete: (id: string) => void | Promise<void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const guestStatusOptions = [
  { value: 'confirmado' as const, label: 'Confirmado' },
  { value: 'recusado' as const, label: 'Não poderá ir' },
  { value: 'pendente' as const, label: 'Pendente' },
].sort((a, b) => sortTextPtBr(a.label, b.label));

export const GuestRow = ({ guest, onEdit, onUpdate, onDelete, confirm }: GuestRowProps) => {
  const { toast } = useConfirm();
  const getStatusColor = () => {
    switch (guest.status) {
      case 'confirmado': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'recusado': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
    }
  };

  return (
    <tr className="group transition-colors">
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className={cn("mb-1 font-semibold text-foreground", guest.status === 'recusado' && "opacity-40 line-through")}>{guest.nome}</span>
          <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
            <div className="flex items-center gap-1.5 shrink-0">
              <Users size={14} className="text-primary/30" />
              <span className="text-foreground/80">{(guest.adultos || 0) + (guest.criancas || 0)}</span>
            </div>
            <Badge variant="outline">
              {guest.categoria}
            </Badge>
          </div>
          {guest.children_names && <span className="mt-1 max-w-[200px] truncate text-xs text-muted-foreground">({guest.children_names})</span>}
        </div>
      </td>
      {/* Coluna A/C removida pois a info agora está sob o nome */}
      <td className="px-6 py-4">
        <div className="relative w-fit">
          <select
            value={guest.status}
            onChange={(e) => onUpdate(guest.id, { status: e.target.value as Guest['status'] })}
            className={cn(
              "h-9 pl-3 pr-9 rounded-lg border font-extrabold text-[11px] uppercase tracking-wide shadow-sm appearance-none cursor-pointer outline-none transition-all active:scale-95",
              getStatusColor()
            )}
          >
            {guestStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" size={14} />
        </div>
      </td>
      <td className="px-6 py-4">
        <button
          onClick={() => onUpdate(guest.id, { invitation_sent: !guest.invitation_sent })}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all active:scale-95",
            guest.invitation_sent ? "bg-primary/10 border-primary/20 text-primary" : "bg-muted/30 border-border text-muted-foreground"
          )}
        >
          <Send size={14} className={cn(guest.invitation_sent ? "opacity-100" : "opacity-40")} />
          <span className="text-[10px] font-extrabold uppercase tracking-wide">{guest.invitation_sent ? 'Enviado' : 'Pendente'}</span>
        </button>
      </td>
      <td className="px-6 py-4 font-mono text-sm font-semibold text-foreground/80">{guest.telefone || '-'}</td>
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-2 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100">
          <Button variant="ghost" className="h-10 w-10 p-0 text-primary hover:bg-primary/10 rounded-xl" onClick={() => onEdit(guest)}>
            <Edit2 size={18} />
          </Button>
          <Button variant="ghost" className="h-10 w-10 p-0 text-destructive hover:bg-destructive/10 rounded-xl" onClick={async () => {
            const isConfirmed = await confirm({
              title: "Excluir?",
              description: `Remover ${guest.nome}?`,
              type: "danger",
            });
            if (isConfirmed) {
              await onDelete(guest.id);
              toast({
                title: 'Convidado removido',
                description: `${guest.nome} saiu da lista.`,
                type: 'success',
              });
            }
          }}>
            <Trash2 size={18} />
          </Button>
        </div>
      </td>
    </tr>
  );
};
