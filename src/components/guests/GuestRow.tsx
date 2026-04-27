import { Edit2, Trash2 } from 'lucide-react';
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
  return (
    <tr className="hover:bg-muted/30 transition-colors group">
      <td className="px-6 py-4 font-bold">{guest.nome}</td>
      <td className="px-6 py-4">
        <Badge variant="outline" className="font-bold border-primary/20 text-primary">{guest.categoria}</Badge>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col gap-0.5">
          <div className="flex gap-2 text-sm font-bold">
            <span>{guest.adultos} A</span>
            {guest.criancas > 0 && <span className="text-muted-foreground">{guest.criancas} C</span>}
          </div>
          {guest.children_names && <span className="text-[10px] text-muted-foreground italic truncate max-w-[120px]" title={guest.children_names}>({guest.children_names})</span>}
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
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onUpdate(guest.id, { invitation_sent: !guest.invitation_sent })}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              guest.invitation_sent ? "bg-primary" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                guest.invitation_sent ? "translate-x-5" : "translate-x-0.5"
              )}
            />
          </button>
          {guest.invitation_sent ? (
            <Badge variant="success" className="text-[9px] px-2 py-0">Enviado</Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] px-2 py-0 opacity-50">Pendente</Badge>
          )}
        </div>
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
  );
};
