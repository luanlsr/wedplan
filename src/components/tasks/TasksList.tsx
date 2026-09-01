import { CheckCircle2, Plus, Trash2, Calendar, Tag, Edit2, ArrowUpDown, ArrowUp, ArrowDown, Filter, MoreVertical } from 'lucide-react';
import { Button, PaginationBar, useConfirm } from '../ui';
import type { ConfirmOptions, ToastOptions } from '../ui';
import { ChevronDown } from 'lucide-react';
import type { Task } from '../../types';
import { cn } from '../../lib/utils';
import { sortTextPtBr } from '../../utils/sorting';
import { useState, useMemo, useEffect } from 'react';

interface TasksListProps {
  tasks: Task[];
  onAdd: () => void;
  onEdit: (task: Task) => void;
  onUpdate: (id: string, task: Partial<Task>) => void;
  onDelete: (id: string) => void | Promise<void>;
}

type SortOption = 'titulo' | 'categoria' | 'dataLimite' | 'status';

const getTaskStatusLabel = (status: string) => {
  if (status === "concluido") return "Concluídas";
  if (status === "em_progresso") return "Em Progresso";
  if (status === "pendente") return "Pendentes";
  return status;
};

const taskStatusOptions = [
  'Todos',
  ...['concluido', 'em_progresso', 'pendente'].sort((a, b) => sortTextPtBr(getTaskStatusLabel(a), getTaskStatusLabel(b))),
];

export const TasksList = ({ tasks, onAdd, onEdit, onUpdate, onDelete }: TasksListProps) => {
  const { confirm, toast } = useConfirm();
  const [filterStatus, setFilterStatus] = useState<'Todos' | 'pendente' | 'em_progresso' | 'concluido'>('Todos');
  const [sortBy, setSortBy] = useState<SortOption>('dataLimite');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Reset page when filters or sorting change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const result = tasks.filter(t => filterStatus === 'Todos' || t.status === filterStatus);
    
    result.sort((a, b) => {
      let valA: string | number = String(a[sortBy] || '');
      let valB: string | number = String(b[sortBy] || '');

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
        <div className="flex-1 min-w-[110px] p-3 sm:p-5 bg-card border border-border shadow-sm rounded-xl flex flex-col items-center sm:items-start text-center sm:text-left gap-1 sm:gap-3 shrink-0 transition-all">
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-primary/10 text-primary shrink-0 transition-colors">
            <CheckCircle2 size={16} className="sm:w-[24px] sm:h-[24px]" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Totais</p>
            <p className="text-lg sm:text-2xl font-extrabold truncate leading-tight">{stats.total}</p>
          </div>
        </div>
        <div className="flex-1 min-w-[110px] p-3 sm:p-5 bg-card border border-border shadow-sm rounded-xl flex flex-col items-center sm:items-start text-center sm:text-left gap-1 sm:gap-3 shrink-0 transition-all">
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-green-500/10 text-green-600 shrink-0 transition-colors">
            <CheckCircle2 size={16} className="sm:w-[24px] sm:h-[24px]" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Prontas</p>
            <p className="text-lg sm:text-2xl font-extrabold text-green-600 truncate leading-tight">{stats.concluidas}</p>
          </div>
        </div>
        <div className="flex-1 min-w-[110px] p-3 sm:p-5 bg-card border border-border shadow-sm rounded-xl flex flex-col items-center sm:items-start text-center sm:text-left gap-1 sm:gap-3 shrink-0 transition-all">
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-600 shrink-0 transition-colors">
            <CheckCircle2 size={16} className="sm:w-[24px] sm:h-[24px]" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-extrabold text-muted-foreground uppercase tracking-wide">Faltam</p>
            <p className="text-lg sm:text-2xl font-extrabold text-amber-600 truncate leading-tight">{stats.pendentes}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-center bg-transparent md:bg-card p-0 md:p-4 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 md:border border-border gap-4">
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
                 <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wide mr-2 hidden xs:inline">Encontrados:</span>
                 <span className="text-xs font-extrabold text-primary">{sortedTasks.length}</span>
              </div>
            </div>

            <div className={cn(
              "md:flex flex-col md:flex-row items-center gap-2 w-full md:w-auto",
              showMobileFilters ? "flex animate-in slide-in-from-top-2 pt-2 md:pt-0 border-t md:border-none border-border" : "hidden"
            )}>
              <FilterSelect 
                value={filterStatus} 
                onChange={(v) => setFilterStatus(v as typeof filterStatus)} 
                options={taskStatusOptions} 
                icon={<CheckCircle2 size={18}/>} 
                isStatus 
              />
            </div>
          </div>

          <div className="px-4 md:px-0 w-full md:w-auto">
            <Button className="gap-2 h-10 px-5 rounded-xl font-bold shadow-sm shadow-primary/20 w-full" onClick={onAdd}>
              <Plus size={18} />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Sorting Bar - Fixed Horizontal Scroll and Cutoff */}
        <div className={cn(
          "items-center gap-3 p-3 bg-card rounded-xl overflow-hidden border border-border w-full md:w-auto mx-4 md:mx-0",
          showMobileFilters ? "flex" : "hidden md:flex"
        )}>
           <span className="text-[10px] font-extrabold uppercase text-muted-foreground whitespace-nowrap shrink-0">Ordenar:</span>
           <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 w-full">
             <SortTab active={sortBy === 'titulo'} onClick={() => handleSort('titulo')} label="Título" direction={sortBy === 'titulo' ? sortDirection : null} />
             <SortTab active={sortBy === 'categoria'} onClick={() => handleSort('categoria')} label="Categoria" direction={sortBy === 'categoria' ? sortDirection : null} />
             <SortTab active={sortBy === 'dataLimite'} onClick={() => handleSort('dataLimite')} label="Data" direction={sortBy === 'dataLimite' ? sortDirection : null} />
             <SortTab active={sortBy === 'status'} onClick={() => handleSort('status')} label="Status" direction={sortBy === 'status' ? sortDirection : null} />
           </div>
        </div>
      </div>

      <div className="flex flex-col bg-card/80 backdrop-blur-sm divide-y divide-border md:grid md:grid-cols-2 2xl:grid-cols-3 md:gap-4 md:bg-transparent md:backdrop-blur-none md:divide-none">
        {paginatedTasks.map((task) => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onUpdate={onUpdate} 
            onEdit={onEdit} 
            onDelete={onDelete}
            confirm={confirm}
            toast={toast}
          />
        ))}

        {sortedTasks.length === 0 && (
          <div className="p-20 text-center border-2 border-dashed rounded-[2rem] border-border/40 col-span-full">
             <p className="text-muted-foreground font-bold">Nenhuma tarefa encontrada.</p>
          </div>
        )}
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedTasks.length}
        itemsPerPage={itemsPerPage}
        itemLabel="tarefa"
        itemLabelPlural="tarefas"
        onPageChange={setCurrentPage}
        className="mx-4 mt-4 md:mx-0"
      />
    </div>
  );
};

type TaskItemProps = {
  task: Task;
  onUpdate: (id: string, task: Partial<Task>) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void | Promise<void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  toast: (options: ToastOptions) => void;
};

const TaskItem = ({ task, onUpdate, onEdit, onDelete, confirm, toast }: TaskItemProps) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className={cn(
      "relative border-b border-border bg-card/90 py-4 px-4 last:border-0 md:border md:rounded-xl md:mb-0 md:bg-card md:shadow-sm transition-all group hover:bg-accent/40",
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
            "text-sm font-semibold text-foreground leading-tight tracking-normal line-clamp-2",
            task.status === 'concluido' && "line-through opacity-50"
          )}>
            {task.titulo}
          </h4>
          <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground mt-1">
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
            className={cn("h-9 w-9 rounded-lg bg-secondary/60", showActions && "bg-primary text-white shadow-sm shadow-primary/30")}
            onClick={() => setShowActions(!showActions)}
          >
            <MoreVertical size={20} />
          </Button>

          {showActions && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setShowActions(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border shadow-xl rounded-xl p-2 z-[70] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wide px-3 py-2">Gerenciar</div>
                
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
                    if (isConfirmed) {
                      await onDelete(task.id);
                      toast({
                        title: "Tarefa removida",
                        description: `"${task.titulo}" foi excluída.`,
                        type: "success",
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
  );
};

const SortTab = ({ active, onClick, label, direction }: { active: boolean; onClick: () => void; label: string; direction?: 'asc' | 'desc' | null }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all",
      active ? "bg-primary text-white shadow-sm shadow-primary/20" : "bg-card text-muted-foreground border border-border hover:bg-accent"
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
        <option key={o} value={o}>
          {o === "Todos" ? "Todos os Status" : getTaskStatusLabel(o)}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
  </div>
);
