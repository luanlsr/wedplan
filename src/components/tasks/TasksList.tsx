import { CheckCircle2, Plus, Trash2, GripVertical, Calendar, Tag, Edit2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, Button, useConfirm } from '../ui';
import type { Task } from '../../types';
import { cn } from '../../lib/utils';
import { useState, useMemo, useEffect } from 'react';

interface TasksListProps {
  tasks: Task[];
  onAdd: () => void;
  onEdit: (task: Task) => void;
  onUpdate: (id: string, task: Partial<Task>) => void;
  onDelete: (id: string) => void;
}

type SortOption = 'titulo' | 'categoria' | 'dataLimite' | 'status';

export const TasksList = ({ tasks, onAdd, onEdit, onUpdate, onDelete }: TasksListProps) => {
  const { confirm } = useConfirm();
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'pendente' | 'em_progresso' | 'concluido'>('Todos');
  const [sortBy, setSortBy] = useState<SortOption>('dataLimite');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, sortBy, sortDirection]);

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(option);
      setSortDirection('asc');
    }
  };

  const sortedTasks = useMemo(() => {
    let result = tasks.filter(t => filterStatus === 'Todos' || t.status === filterStatus);
    
    result.sort((a, b) => {
      let valA: any = a[sortBy] || '';
      let valB: any = b[sortBy] || '';

      if (sortBy === 'status') {
         const statusOrder = { pendente: 0, em_progresso: 1, concluido: 2 };
         valA = statusOrder[a.status as keyof typeof statusOrder] ?? 0;
         valB = statusOrder[b.status as keyof typeof statusOrder] ?? 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [tasks, filterStatus, sortBy, sortDirection]);

  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);
  const paginatedTasks = sortedTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const stats = {
    total: tasks.length,
    concluidas: tasks.filter(t => t.status === 'concluido').length,
    pendentes: tasks.filter(t => t.status !== 'concluido').length,
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stats Cards - Remains Same */}
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

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center bg-card p-4 rounded-2xl shadow-sm border gap-4">
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
            {(['Todos', 'pendente', 'em_progresso', 'concluido'] as const).map(status => (
              <Button
                key={status}
                variant={filterStatus === status ? "primary" : "outline"}
                className="rounded-full px-4 font-bold h-10 capitalize shrink-0"
                onClick={() => setFilterStatus(status)}
              >
                {status === 'pendente' ? 'Pendentes' : 
                 status === 'em_progresso' ? 'Em Progresso' :
                 status === 'concluido' ? 'Concluídas' : 'Todas'}
              </Button>
            ))}
          </div>
          <Button className="gap-2 h-10 px-6 rounded-xl font-bold shadow-lg shadow-primary/20 w-full md:w-auto" onClick={onAdd}>
            <Plus size={18} />
            Nova Tarefa
          </Button>
        </div>

        {/* Sorting Bar */}
        <div className="flex items-center gap-2 p-2 px-4 bg-secondary/10 rounded-xl overflow-x-auto no-scrollbar border border-white/5">
           <span className="text-[10px] font-black uppercase text-muted-foreground whitespace-nowrap mr-2">Ordenar por:</span>
           <div className="flex gap-2">
             <SortTab active={sortBy === 'titulo'} onClick={() => handleSort('titulo')} label="Título" direction={sortBy === 'titulo' ? sortDirection : null} />
             <SortTab active={sortBy === 'categoria'} onClick={() => handleSort('categoria')} label="Categoria" direction={sortBy === 'categoria' ? sortDirection : null} />
             <SortTab active={sortBy === 'dataLimite'} onClick={() => handleSort('dataLimite')} label="Data" direction={sortBy === 'dataLimite' ? sortDirection : null} />
             <SortTab active={sortBy === 'status'} onClick={() => handleSort('status')} label="Status" direction={sortBy === 'status' ? sortDirection : null} />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {paginatedTasks.map((task) => (
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
               <Button variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={async () => {
                  const isConfirmed = await confirm({
                    title: "Excluir Tarefa?",
                    description: `Deseja realmente remover esta tarefa?`,
                    type: "danger",
                    confirmLabel: "Remover",
                    cancelLabel: "Cancelar"
                  });
                  if (isConfirmed) onDelete(task.id);
               }}>
                 <Trash2 size={14} />
               </Button>
            </div>
          </Card>
        ))}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-6 bg-secondary/5 rounded-2xl border border-white/5 mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Mostrando <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span>-
              <span className="text-foreground">{Math.min(currentPage * itemsPerPage, sortedTasks.length)}</span> de 
              <span className="text-foreground">{sortedTasks.length}</span> tarefas
            </p>
            <div className="flex items-center gap-1.5">
              <Button 
                variant="outline" 
                className="h-9 w-9 p-0 rounded-lg border-white/10" 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} className="-mr-1.5" /><ChevronLeft size={16} />
              </Button>
              <Button 
                variant="outline" 
                className="h-9 w-9 p-0 rounded-lg border-white/10" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </Button>
              
              <div className="flex items-center gap-1 mx-2">
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1;
                  if (totalPages > 5 && Math.abs(page - currentPage) > 1 && page !== 1 && page !== totalPages) {
                    if (page === 2 || page === totalPages - 1) return <span key={page} className="text-muted-foreground opacity-30">•</span>;
                    return null;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs font-black transition-all",
                        currentPage === page ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5"
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <Button 
                variant="outline" 
                className="h-9 w-9 p-0 rounded-lg border-white/10" 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </Button>
              <Button 
                variant="outline" 
                className="h-9 w-9 p-0 rounded-lg border-white/10" 
                onClick={() => setCurrentPage(totalPages)} 
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} /><ChevronRight size={16} className="-ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {sortedTasks.length === 0 && (
          <div className="p-20 text-center border-2 border-dashed rounded-3xl">
             <p className="text-muted-foreground font-bold">Nenhuma tarefa encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SortTab = ({ active, onClick, label, direction }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
      active ? "bg-primary text-white" : "bg-card text-muted-foreground border border-white/5 hover:bg-secondary"
    )}
  >
    {label}
    {!direction ? <ArrowUpDown size={10} className="opacity-30" /> : 
     direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
  </button>
);
