import { MoreVertical, Users, Send, Edit2, Trash2, ChevronDown } from 'lucide-react';
import { Button, Badge, useConfirm, type ConfirmOptions } from '../ui';
import type { Guest } from '../../types';
import { cn } from '../../lib/utils';
import { useState } from 'react';
import { sortTextPtBr } from '../../utils/sorting';

interface GuestCardProps {
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

export const GuestCard = ({ guest, onEdit, onUpdate, onDelete, confirm }: GuestCardProps) => {
  const { toast } = useConfirm();
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = () => {
    switch (guest.status) {
      case 'confirmado': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'recusado': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-amber-600 bg-amber-500/10 border-amber-500/20';
    }
  };

  return (
    <div className="relative border-b border-border/40 bg-transparent py-4 px-2 last:border-0">
      <div className="flex items-center gap-3 relative">
        {/* Lado Esquerdo: Info Principal */}
        <div className="flex-1 min-w-0 pr-12" onClick={() => onEdit(guest)}>
          <div className="mb-1">
            <h4 className={cn(
              "text-[15px] font-bold text-foreground leading-tight tracking-tight",
              guest.status === 'recusado' && "opacity-40 line-through"
            )}>
              {guest.nome}
            </h4>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0">
              <Users size={13} className="text-primary/30" />
              <span className="text-foreground/80">{guest.adultos + guest.criancas}</span>
            </div>
            
            <Badge variant="outline">
              {guest.categoria}
            </Badge>

            {guest.telefone && (
              <>
                <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                <span className="truncate">{guest.telefone}</span>
              </>
            )}
          </div>
        </div>

        {/* Lado Direito: Status (Select) e Ações - Absoluto */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 shrink-0">
          {/* Select de Status */}
          <div className="relative group hidden sm:block">
            <select
              value={guest.status}
              onChange={(e) => onUpdate(guest.id, { status: e.target.value as Guest['status'] })}
              className={cn(
                "h-10 pl-3 pr-8 rounded-2xl border font-black text-[10px] uppercase tracking-widest appearance-none transition-all cursor-pointer outline-none focus:ring-2 focus:ring-primary/20 shadow-sm",
                getStatusColor()
              )}
            >
              {guestStatusOptions.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" size={14} />
          </div>

          {/* Menu de Ações */}
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-10 w-10 rounded-2xl bg-secondary/20", showActions && "bg-primary text-white shadow-lg shadow-primary/30")}
              onClick={() => setShowActions(!showActions)}
            >
              <MoreVertical size={20} />
            </Button>

            {showActions && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border shadow-[0_10px_40px_rgba(0,0,0,0.3)] rounded-[1.5rem] p-2 z-[70] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="text-[9px] font-black text-muted-foreground/80 uppercase tracking-widest px-3 py-2">Administrar</div>
                  
                  <button 
                    onClick={() => {
                      onUpdate(guest.id, { invitation_sent: !guest.invitation_sent });
                      setShowActions(false);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Send size={16} className={guest.invitation_sent ? "text-primary" : "text-muted-foreground"} />
                      <span>{guest.invitation_sent ? 'Enviado' : 'Enviar'}</span>
                    </div>
                    {guest.invitation_sent && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>

                  <button 
                    onClick={() => {
                      onEdit(guest);
                      setShowActions(false);
                    }}
                    className="w-full flex items-center gap-2 p-3 rounded-xl hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-widest transition-colors"
                  >
                    <Edit2 size={16} className="text-primary" />
                    Editar Convidado
                  </button>

                  <div className="h-px bg-border/50 my-1 mx-2" />

                  <button 
                    onClick={async () => {
                      setShowActions(false);
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
                    }}
                    className="w-full flex items-center gap-2 p-3 rounded-xl hover:bg-red-500/10 text-red-500 text-[11px] font-bold uppercase tracking-widest transition-colors"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
