import { CheckCircle2, Plus, Trash2, GripVertical, Calendar, Tag, Edit2, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Filter, MoreVertical, X, Clock } from 'lucide-react';
import { Card, Button, useConfirm, Badge } from '../ui';
import { ChevronDown } from 'lucide-react';
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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

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
      {/* Stats Cards - Updated to be side-by-side or horizontally scrollable */}
      <div className="flex sm:grid sm:grid-cols-3 gap-3 overflow-x-auto no-scrollbar pb-2 sm:pb-0 px-0.5">
        <div className="flex-1 min-w-[110px] p-3 sm:p-6 bg-card border-none shadow-lg rounded-[1.5rem] flex flex-col items-center sm:items-start text-center sm:text-left gap-1 sm:gap-4 shrink-0 transition-all">
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-primary/10 text-primary shrink-0 transition-colors">
            <CheckCircle2 size={16} className="sm:w-[24px] sm:h-[24px]" />
          </div>
          <div>
            <p className="text-[9px] sm:text-xs font-black text-muted-foreground uppercase tracking-widest sm:tracking-wider">Totais</p>
            <p className="text-lg sm:text-2xl font-black truncate leading-tight">{stats.total}</p>
          </div>
        </div>
        <div className="flex-1 min-w-[110px] p-3 sm:p-6 bg-card border-none shadow-lg rounded-[1.5rem] flex flex-col items-center sm:items-start text-center sm:text-left gap-1 sm:gap-4 shrink-0 transition-all">
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-green-500/10 text-green-600 shrink-0 transition-colors">
            <CheckCircle2 size={16} className="sm:w-[24px] sm:h-[24px]" />
          </div>
          <div>
            <p className="text-[9px] sm:text-xs font-black text-muted-foreground uppercase tracking-widest sm:tracking-wider">Prontas</p>
            <p className="text-lg sm:text-2xl font-black text-green-600 truncate leading-tight">{stats.concluidas}</p>
          </div>
        </div>
        <div className="flex-1 min-w-[110px] p-3 sm:p-6 bg-card border-none shadow-lg rounded-[1.5rem] flex flex-col items-center sm:items-start text-center sm:text-left gap-1 sm:gap-4 shrink-0 transition-all">
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-600 shrink-0 transition-colors">
            <CheckCircle2 size={16} className="sm:w-[24px] sm:h-[24px]" />
          </div>
          <div>
            <p className="text-[9px] sm:text-xs font-black text-muted-foreground uppercase tracking-widest sm:tracking-wider">Faltam</p>
            <p className="text-lg sm:text-2xl font-black text-amber-600 truncate leading-tight">{stats.pendentes}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center bg-transparent md:bg-card p-0 md:p-4 rounded-none md:rounded-2xl shadow-none md:shadow-sm border-0 md:border gap-4">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto px-4 md:px-0">
            <div className="flex items-center justify-between w-full gap-4">
              <Button 
                variant="outline" 
                className={cn("md:hidden h-10 flex-1 rounded-xl font-bold gap-2 text-xs", showMobileFilters && "bg-primary/10 text-primary border-primary/20")}
                onClick={() => setShowMobileFilters(!showMobileFilters)}
              >
                <Filter size={18} /> {showMobileFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </Button>
              <div className="px-3 py-2 bg-secondary/10 rounded-xl border border-border shrink-0 flex items-center h-10">
                 <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mr-2 hidden xs:inline">Encontrados:</span>
                 <span className="text-xs font-black text-primary">{sortedTasks.length}</span>
              </div>
            </div>

            <div className={cn(
              "md:flex flex-col md:flex-row items-center gap-2 w-full md:w-auto",
              showMobileFilters ? "flex animate-in slide-in-from-top-2 pt-2 md:pt-0 border-t md:border-none border-border" : "hidden"
            )}>
              <FilterSelect 
                value={filterStatus} 
                onChange={(v: any) => setFilterStatus(v)} 
                options={['Todos', 'pendente', 'em_progresso', 'concluido']} 
                icon={<CheckCircle2 size={18}/>} 
                isStatus 
              />
            </div>
          </div>

          <div className="px-4 md:px-0 w-full md:w-auto">
            <Button className="gap-2 h-10 px-6 rounded-xl font-bold shadow-lg shadow-primary/20 w-full" onClick={onAdd}>
              <Plus size={18} />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Sorting Bar - Fixed Horizontal Scroll and Cutoff */}
        <div className={cn(
          "items-center gap-3 p-3 bg-secondary/10 rounded-2xl overflow-hidden border border-white/5 w-full md:w-auto mx-4 md:mx-0",
          showMobileFilters ? "flex" : "hidden md:flex"
        )}>
           <span className="text-[10px] font-black uppercase text-muted-foreground whitespace-nowrap shrink-0 opacity-60">Ordenar:</span>
           <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 w-full">
             <SortTab active={sortBy === 'titulo'} onClick={() => handleSort('titulo')} label="Título" direction={sortBy === 'titulo' ? sortDirection : null} />
             <SortTab active={sortBy === 'categoria'} onClick={() => handleSort('categoria')} label="Categoria" direction={sortBy === 'categoria' ? sortDirection : null} />
             <SortTab active={sortBy === 'dataLimite'} onClick={() => handleSort('dataLimite')} label="Data" direction={sortBy === 'dataLimite' ? sortDirection : null} />
             <SortTab active={sortBy === 'status'} onClick={() => handleSort('status')} label="Status" direction={sortBy === 'status' ? sortDirection : null} />
           </div>
        </div>
      </div>

      <div className="flex flex-col bg-background/50 backdrop-blur-sm divide-y divide-border/10 md:grid md:grid-cols-2 2xl:grid-cols-3 md:gap-4 md:bg-transparent md:backdrop-blur-none md:divide-none">
        {paginatedTasks.map((task) => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onUpdate={onUpdate} 
            onEdit={onEdit} 
            onDelete={onDelete}
            confirm={confirm}
          />
        ))}

        {sortedTasks.length === 0 && (
          <div className="p-20 text-center border-2 border-dashed rounded-[2rem] border-border/40 col-span-full">
             <p className="text-muted-foreground font-bold">Nenhuma tarefa encontrada.</p>
          </div>
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-6 bg-secondary/5 rounded-[2rem] border border-white/5 mt-4 mx-4 md:mx-0">
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
    </div>
  );
};

const TaskItem = ({ task, onUpdate, onEdit, onDelete, confirm }: any) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className={cn(
      "relative border-b border-border/40 bg-transparent py-4 px-4 last:border-0 md:border md:rounded-[1.5rem] md:mb-0 md:bg-card md:shadow-sm transition-all group",
      showActions && "z-50"
    )}>
      <div className={cn("flex items-center gap-4 relative z-10 w-full transition-opacity", task.status === 'concluido' && "opacity-60")}>
        {/* Checkbox de Status */}
        <button 
          onClick={() => onUpdate(task.id, { status: task.status === 'concluido' ? 'pendente' : 'concluido' })}
          className={cn(
            "w-8 h-8 rounded-2xl border-2 flex items-center justify-center transition-all active:scale-90 shrink-0",
            task.status === 'concluido' ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20" : "border-primary/20 bg-primary/5 text-primary hover:border-primary"
          )}
        >
          {task.status === 'concluido' ? <CheckCircle2 size={18} /> : <div className="w-2 h-2 rounded-full bg-primary/20" />}
        </button>

        {/* Info da Tarefa */}
        <div className="flex-1 min-w-0 pr-12" onClick={() => onEdit(task)}>
          <h4 className={cn(
            "text-[15px] font-bold text-foreground leading-tight tracking-tight line-clamp-2",
            task.status === 'concluido' && "line-through opacity-50"
          )}>
            {task.titulo}
          </h4>
          <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
            <span className="flex items-center gap-1.5 shrink-0">
              <Tag size={13} className="text-primary/30" />
              {task.categoria}
            </span>
            {task.dataLimite && (
              <>
                <span className="w-1 h-1 rounded-full bg-border shrink-0" />
                <span className={cn("flex items-center gap-1.5", new Date(task.dataLimite) < new Date() && task.status !== 'concluido' ? "text-red-500" : "")}>
                  <Calendar size={13} className="opacity-40" />
                  {new Date(task.dataLimite).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Menu de Ações - FORA do div de opacidade */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
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
                <div className="text-[9px] font-black text-muted-foreground/80 uppercase tracking-widest px-3 py-2">Gerenciar</div>
                
                <button 
                  onClick={() => {
                    onEdit(task);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-2 p-3 rounded-xl hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  <Edit2 size={16} className="text-primary" />
                  Editar Tarefa
                </button>

                <div className="h-px bg-border/50 my-1 mx-2" />

                <button 
                  onClick={async () => {
                    setShowActions(false);
                    const isConfirmed = await confirm({
                      title: "Excluir?",
                      description: `Remover esta tarefa?`,
                      type: "danger",
                    });
                    if (isConfirmed) onDelete(task.id);
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
  );
};

const SortTab = ({ active, onClick, label, direction }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
      active ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-card/50 text-muted-foreground border border-white/5 hover:bg-secondary/40"
    )}
  >
    {label}
    {!direction ? <ArrowUpDown size={10} className="opacity-30" /> : 
     direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
  </button>
);

const FilterSelect = ({ value, onChange, options, icon }: { value: string, onChange: (v: string) => void, options: string[], icon: React.ReactNode, isStatus?: boolean }) => (
  <div className="relative w-full md:min-w-[240px] md:w-fit">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-colors">
      {icon}
    </div>
    <select
      className="h-10 w-full pl-12 pr-10 rounded-xl bg-secondary/10 border border-border text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer hover:bg-secondary/20 shadow-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o: string) => (
        <option key={o} value={o} className="bg-card text-foreground border-none px-4 py-2 capitalize font-medium">
          {o === "Todos" ? "Todos os Status" : 
           o === "pendente" ? "Pendentes" : 
           o === "em_progresso" ? "Em Progresso" : 
           "Concluídas"}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
  </div>
);
