import { Edit2, Trash2, Send, Check, Users, Phone, MapPin } from 'lucide-react';
import { Button, Badge, Card } from '../ui';
import type { Guest } from '../../types';
import { cn } from '../../lib/utils';

interface GuestCardProps {
  guest: Guest;
  onEdit: (guest: Guest) => void;
  onUpdate: (id: string, guest: Partial<Guest>) => void;
  onDelete: (id: string) => void;
  confirm: (options: any) => Promise<boolean>;
}

export const GuestCard = ({ guest, onEdit, onUpdate, onDelete, confirm }: GuestCardProps) => {
  return (
    <Card className="p-5 space-y-4 relative overflow-hidden group">
      {/* Categoria Badge */}
      <div className="flex justify-between items-start">
        <Badge variant="outline" className="font-bold border-primary/20 text-primary bg-primary/5">
          {guest.categoria}
        </Badge>
        
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => onEdit(guest)}>
            <Edit2 size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => {
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
      </div>

      {/* Nome e Info Principal */}
      <div>
        <h4 className="text-lg font-black text-foreground leading-tight">{guest.nome}</h4>
        <div className="flex items-center gap-3 mt-1 text-muted-foreground font-bold text-xs uppercase tracking-widest">
            <div className="flex items-center gap-1">
                <Users size={12} className="text-primary" />
                <span>{guest.adultos} Adultos</span>
            </div>
            {guest.criancas > 0 && (
                <div className="flex items-center gap-1">
                    <span className="text-muted-foreground/30">•</span>
                    <span>{guest.criancas} Crianças</span>
                </div>
            )}
        </div>
        {guest.children_names && (
             <p className="text-[10px] text-muted-foreground italic mt-1">({guest.children_names})</p>
        )}
      </div>

      {/* Status Toggles Section */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="space-y-1.5">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Presença</p>
            <button 
                onClick={() => {
                    const statusMap: Record<string, "confirmado" | "pendente" | "recusado"> = {
                    'pendente': 'confirmado',
                    'confirmado': 'recusado',
                    'recusado': 'pendente'
                    };
                    onUpdate(guest.id, { status: statusMap[guest.status] });
                }}
                className="w-full"
            >
                {guest.status === 'confirmado' ? <Badge variant="success" className="w-full justify-center py-1.5">Confirmado</Badge> :
                guest.status === 'pendente' ? <Badge variant="warning" className="w-full justify-center py-1.5">Pendente</Badge> :
                <Badge variant="error" className="w-full justify-center py-1.5">Recusado</Badge>}
            </button>
        </div>

        <div className="space-y-1.5">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">Convite</p>
            <div className="flex items-center gap-3 h-8 px-3 bg-muted/20 rounded-xl border border-border/50">
                <button
                    onClick={() => onUpdate(guest.id, { invitation_sent: !guest.invitation_sent })}
                    className={cn(
                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none",
                        guest.invitation_sent ? "bg-primary" : "bg-muted"
                    )}
                >
                    <span
                        className={cn(
                            "pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform",
                            guest.invitation_sent ? "translate-x-5" : "translate-x-0.5"
                        )}
                    />
                </button>
                {guest.invitation_sent ? (
                    <Badge variant="success" className="text-[8px] px-2 py-0 border-none bg-transparent">Enviado</Badge>
                ) : (
                    <Badge variant="outline" className="text-[8px] px-2 py-0 border-none bg-transparent opacity-50">Pendente</Badge>
                )}
            </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-border flex items-center justify-between text-[10px] font-bold text-muted-foreground">
        <div className="flex items-center gap-1.5">
            <Phone size={12} className="opacity-50" />
            <span>{guest.telefone || 'Sem telefone'}</span>
        </div>
        {guest.observacoes && (
            <div className="flex items-center gap-1 text-primary">
                <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-primary/30">Obs</Badge>
            </div>
        )}
      </div>
    </Card>
  );
};
