import { CheckCircle2, Plus, Trash2, GripVertical, Calendar, Tag, Edit2 } from 'lucide-react';
import { Card, Button } from '../ui';
import type { Task } from '../../types';
import { cn } from '../../lib/utils';
import { useState } from 'react';

interface TasksListProps {
  tasks: Task[];
  onAdd: () => void;
  onEdit: (task: Task) => void;
  onUpdate: (id: string, task: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

export const TasksList = ({ tasks, onAdd, onEdit, onUpdate, onDelete }: TasksListProps) => {
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'pendente' | 'em_progresso' | 'concluido'>('Todos');

  const filteredTasks = tasks.filter(t => filterStatus === 'Todos' || t.status === filterStatus);

  const stats = {
    total: tasks.length,
    concluidas: tasks.filter(t => t.status === 'concluido').length,
    pendentes: tasks.filter(t => t.status !== 'concluido').length,
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-card border-none shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase">Tarefas Totais</p>
            <p className="text-2xl font-black">{stats.total}</p>
          </div>
        </Card>
        <Card className="p-6 bg-card border-none shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase">Concluídas</p>
            <p className="text-2xl font-black text-green-600">{stats.concluidas}</p>
          </div>
        </Card>
        <Card className="p-6 bg-card border-none shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase">Pendentes</p>
            <p className="text-2xl font-black text-amber-600">{stats.pendentes}</p>
          </div>
        </Card>
      </div>

      <div className="flex justify-between items-center bg-card p-4 rounded-2xl shadow-sm border">
        <div className="flex gap-2">
          {(['Todos', 'pendente', 'em_progresso', 'concluido'] as const).map(status => (
            <Button
              key={status}
              variant={filterStatus === status ? "primary" : "outline"}
              className="rounded-full px-4 font-bold h-10 capitalize"
              onClick={() => setFilterStatus(status)}
            >
              {status === 'pendente' ? 'Pendentes' : 
               status === 'em_progresso' ? 'Em Progresso' :
               status === 'concluido' ? 'Concluídas' : 'Todas'}
            </Button>
          ))}
        </div>
        <Button className="gap-2 h-10 px-6 rounded-xl font-bold shadow-lg shadow-primary/20" onClick={onAdd}>
          <Plus size={18} />
          Nova Tarefa
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filteredTasks.map((task) => (
          <Card key={task.id} className={cn(
            "p-4 border-none shadow-md transition-all hover:shadow-lg group flex items-center gap-4",
            task.status === 'concluido' ? "bg-muted/50 opacity-75" : "bg-card"
          )}>
            <div className="cursor-grab text-muted-foreground opacity-30 group-hover:opacity-100 transition-opacity">
               <GripVertical size={20} />
            </div>
            
            <button 
              onClick={() => onUpdate(task.id, { status: task.status === 'concluido' ? 'pendente' : 'concluido' })}
              className={cn(
                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                task.status === 'concluido' ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground/30 hover:border-primary"
              )}
            >
              {task.status === 'concluido' && <CheckCircle2 size={14} />}
            </button>

            <div className="flex-1">
              <h4 className={cn("font-bold text-lg", task.status === 'concluido' && "line-through text-muted-foreground")}>
                {task.titulo}
              </h4>
              <div className="flex gap-3 items-center mt-1">
                <div className="flex items-center gap-1 text-[10px] uppercase font-black text-muted-foreground">
                   <Tag size={12} />
                   {task.categoria}
                </div>
                {task.dataLimite && (
                  <div className="flex items-center gap-1 text-[10px] uppercase font-black text-amber-600">
                     <Calendar size={12} />
                     {new Date(task.dataLimite).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
               <Button variant="ghost" className="h-8 w-8 p-0 text-primary" onClick={() => onEdit(task)}>
                 <Edit2 size={14} />
               </Button>
               <Button variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => {
                  if (window.confirm('Excluir tarefa?')) onDelete(task.id);
               }}>
                 <Trash2 size={14} />
               </Button>
            </div>
          </Card>
        ))}
        {filteredTasks.length === 0 && (
          <div className="p-20 text-center border-2 border-dashed rounded-3xl">
             <p className="text-muted-foreground font-bold">Nenhuma tarefa encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};
