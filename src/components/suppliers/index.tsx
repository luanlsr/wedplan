import { useState, useMemo, useEffect } from "react";
import { Button, Badge } from "../ui";
import { formatCurrency, formatDate } from "../../utils/calculations";
import { 
  Search, Plus, ChevronRight, Briefcase, ArrowUpDown, 
  ChevronDown, Filter, ArrowUp, ArrowDown, 
  DollarSign as DollarIcon, Calendar, CheckCircle2, 
  AlertCircle, GripVertical, ChevronLeft
} from "lucide-react";
import type { Supplier } from "../../types";
import { Reorder, useDragControls, motion, AnimatePresence } from "framer-motion";

interface SuppliersListProps {
  suppliers: Supplier[];
  onAdd: () => void;
  onSelect: (supplier: Supplier) => void;
  onReorder: (suppliers: Supplier[]) => void;
}

type SortOption = "manual" | "alphabetical" | "value" | "category" | "status";

export const SuppliersList = ({ suppliers, onAdd, onSelect, onReorder }: SuppliersListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sortBy, setSortBy] = useState<SortOption>("manual");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const categories = ["Todas", ...Array.from(new Set(suppliers.map((s) => s.categoria))).sort((a, b) => a.localeCompare(b))];
  const statuses = ["Todos", "pago", "pendente", "parcial", "atrasado"];

  // Reset page on filter/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, sortBy, sortDirection]);

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(option);
      setSortDirection("asc");
    }
  };

  const sortedSuppliers = useMemo(() => {
    let result = [...suppliers];
    const statusOrder = { atrasado: 0, pendente: 1, parcial: 2, pago: 3 };

    if (sortBy === "alphabetical") {
      result.sort((a, b) => sortDirection === "asc" 
        ? a.fornecedor.localeCompare(b.fornecedor) 
        : b.fornecedor.localeCompare(a.fornecedor));
    } else if (sortBy === "value") {
      result.sort((a, b) => sortDirection === "asc" 
        ? b.valorTotal - a.valorTotal 
        : a.valorTotal - b.valorTotal);
    } else if (sortBy === "category") {
      result.sort((a, b) => sortDirection === "asc" 
        ? a.categoria.localeCompare(b.categoria) 
        : b.categoria.localeCompare(a.categoria));
    } else if (sortBy === "status") {
      result.sort((a, b) => sortDirection === "asc" 
        ? statusOrder[a.status] - statusOrder[b.status]
        : statusOrder[b.status] - statusOrder[a.status]);
    }

    return result.filter((s) => {
      const matchesSearch = s.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.servico.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "Todas" || s.categoria === categoryFilter;
      const matchesStatus = statusFilter === "Todos" || s.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [suppliers, searchTerm, categoryFilter, statusFilter, sortBy, sortDirection]);

  const totalPages = Math.ceil(sortedSuppliers.length / itemsPerPage);
  const paginatedSuppliers = sortedSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-6 bg-card/60 backdrop-blur-xl p-4 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 shadow-2xl">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-all duration-300" size={20} />
              <input
                type="text"
                placeholder="Buscar fornecedor ou serviço..."
                className="w-full bg-secondary/20 border border-white/5 rounded-2xl h-14 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-secondary/40 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              <FilterSelect 
                value={categoryFilter} 
                onChange={setCategoryFilter} 
                options={categories} 
                icon={<Briefcase size={18} />} 
              />
              <FilterSelect 
                value={statusFilter} 
                onChange={setStatusFilter} 
                options={statuses} 
                icon={<Filter size={18} />} 
                isStatus
              />
            </div>
          </div>

          <Button 
            onClick={onAdd} 
            className="h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all group w-full xl:w-auto overflow-hidden relative"
          >
            <span className="relative z-10 flex items-center gap-2 font-bold uppercase tracking-wider text-sm">
              <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              Adicionar Fornecedor
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </Button>
        </div>

        {/* Sorting Controls */}
        <div className="flex flex-wrap items-center gap-2 pt-6 border-t border-white/5">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mr-4">Ordenar por:</span>
          <div className="flex flex-wrap gap-2">
            <SortBtn 
              active={sortBy === 'manual'} 
              onClick={() => handleSort('manual')} 
              icon={<GripVertical size={14} />} 
              label="Manual" 
            />
            <SortBtn 
              active={sortBy === 'status'} 
              onClick={() => handleSort('status')} 
              icon={<CheckCircle2 size={14} />} 
              label="Status"
              direction={sortBy === 'status' ? sortDirection : null}
            />
            <SortBtn 
              active={sortBy === 'alphabetical'} 
              onClick={() => handleSort('alphabetical')} 
              icon={<ArrowUpDown size={14} />} 
              label="Nome"
              direction={sortBy === 'alphabetical' ? sortDirection : null}
            />
            <SortBtn 
              active={sortBy === 'value'} 
              onClick={() => handleSort('value')} 
              icon={<DollarIcon size={14} />} 
              label="Valor"
              direction={sortBy === 'value' ? sortDirection : null}
            />
            <SortBtn 
              active={sortBy === 'category'} 
              onClick={() => handleSort('category')} 
              icon={<Briefcase size={14} />} 
              label="Categoria"
              direction={sortBy === 'category' ? sortDirection : null}
            />
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      <Reorder.Group 
        axis="y" 
        values={sortedSuppliers} 
        onReorder={(newOrder) => sortBy === 'manual' && onReorder(newOrder)}
        className="space-y-4"
      >
        <AnimatePresence mode="popLayout">
          {paginatedSuppliers.map((supplier) => (
            <ReorderItem 
              key={supplier.id} 
              supplier={supplier} 
              onSelect={onSelect} 
              isManual={sortBy === 'manual'}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 sm:p-8 bg-card/40 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2rem] border border-white/5 shadow-xl mt-8"
        >
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Progresso da Lista</p>
            <p className="text-sm font-bold text-foreground/80">
              Mostrando <span className="text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="text-primary">{Math.min(currentPage * itemsPerPage, sortedSuppliers.length)}</span> de <span className="text-primary">{sortedSuppliers.length}</span> fornecedores
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-4">
              <Button 
                variant="ghost" 
                className="h-10 w-10 p-0 rounded-xl bg-secondary/20 hover:bg-primary/20 hover:text-primary transition-all" 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1}
              >
                <ChevronLeft size={18} className="-mr-2" /><ChevronLeft size={18} />
              </Button>
              <Button 
                variant="ghost" 
                className="h-10 w-10 p-0 rounded-xl bg-secondary/20 hover:bg-primary/20 hover:text-primary transition-all" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                disabled={currentPage === 1}
              >
                <ChevronLeft size={18} />
              </Button>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-2xl border border-white/5">
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
                      "w-8 h-8 rounded-lg text-xs font-black transition-all duration-300",
                      currentPage === page 
                        ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" 
                        : "text-muted-foreground hover:bg-white/5"
                    )}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 ml-4">
              <Button 
                variant="ghost" 
                className="h-10 w-10 p-0 rounded-xl bg-secondary/20 hover:bg-primary/20 hover:text-primary transition-all" 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={18} />
              </Button>
              <Button 
                variant="ghost" 
                className="h-10 w-10 p-0 rounded-xl bg-secondary/20 hover:bg-primary/20 hover:text-primary transition-all" 
                onClick={() => setCurrentPage(totalPages)} 
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={18} /><ChevronRight size={18} className="-ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {sortedSuppliers.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-32 text-center rounded-[3rem] border-2 border-dashed border-white/5 bg-secondary/5"
        >
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
            <Briefcase size={40} />
          </div>
          <h3 className="text-2xl font-black text-foreground mb-2">Nada por aqui ainda</h3>
          <p className="text-muted-foreground max-w-sm mx-auto font-medium">Experimente ajustar os filtros ou adicione o seu primeiro fornecedor no botão acima.</p>
        </motion.div>
      )}
    </div>
  );
};

const FilterSelect = ({ value, onChange, options, icon, isStatus }: any) => (
  <div className="relative w-full md:min-w-[240px] md:w-fit">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none transition-colors">
      {icon}
    </div>
    <select
      className="h-14 w-full pl-12 pr-10 rounded-2xl bg-secondary/20 border border-white/5 text-foreground text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none transition-all cursor-pointer hover:bg-secondary/30"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o: string) => (
        <option key={o} value={o} className="bg-slate-900 border-none px-4 py-2 capitalize font-medium">
          {isStatus && o !== "Todos" ? (o === "pago" ? "Pagos" : o === "pendente" ? "Pendentes" : o === "parcial" ? "Parciais" : "Atrasados") : o}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
  </div>
);

const SortBtn = ({ active, onClick, icon, label, direction }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all duration-300",
            active 
              ? "bg-primary text-white shadow-[0_8px_16px_rgba(var(--primary-rgb),0.3)] scale-105" 
              : "text-muted-foreground bg-secondary/10 hover:bg-secondary/30 border border-white/5"
        )}
    >
        {icon}
        <span>{label}</span>
        {direction && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
              {direction === 'asc' ? <ArrowUp size={12} className="ml-1" /> : <ArrowDown size={12} className="ml-1" />}
            </motion.div>
        )}
    </button>
);

const ReorderItem = ({ supplier, onSelect, isManual }: any) => {
    const dragControls = useDragControls();
    const paidValue = supplier.parcelas.reduce((acc: number, p: any) => p.status === 'pago' ? acc + p.valor : acc, 0);
    const progress = (paidValue / supplier.valorTotal) * 100;

    return (
        <Reorder.Item
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            value={supplier}
            dragListener={isManual}
            dragControls={dragControls}
            className="group"
        >
            <div
                className={cn(
                    "relative overflow-hidden p-5 sm:p-6 rounded-[2.5rem] border transition-all duration-500 cursor-pointer active:scale-[0.98]",
                    supplier.status === 'pago' 
                      ? "bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-transparent border-green-500/40 shadow-[0_20px_40px_-15px_rgba(34,197,94,0.2)] ring-1 ring-green-500/30"
                      : "bg-card/40 backdrop-blur-md border-white/5 hover:border-primary/30 shadow-xl hover:shadow-primary/5",
                    isManual ? "pl-2" : ""
                )}
                onClick={() => onSelect(supplier)}
            >
                {/* Status Indicator Background */}
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl transition-all duration-700",
                  supplier.status === 'pago' ? 'bg-green-400 opacity-40 scale-150' :
                  supplier.status === 'atrasado' ? 'bg-red-500 opacity-20' :
                  supplier.status === 'parcial' ? 'bg-amber-500 opacity-20' : 'bg-blue-500 opacity-20'
                )} />

                <div className="flex flex-col gap-4 relative z-10 w-full">
                    {/* Line 1: Name + Category */}
                    <div className="flex items-center gap-4 w-full">
                        {isManual && (
                            <div 
                                onPointerDown={(e) => dragControls.start(e)}
                                className="p-2 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-primary transition-colors flex items-center shrink-0"
                            >
                                <GripVertical size={20} />
                            </div>
                        )}
                        <div className="flex flex-1 items-start sm:items-center gap-2 sm:gap-3 flex-wrap min-w-0">
                            <h4 className="text-lg sm:text-2xl font-black text-foreground group-hover:text-primary transition-colors duration-300 truncate max-w-full">
                              {supplier.fornecedor}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="shrink-0 bg-primary/5 text-primary border-primary/20 text-[8px] sm:text-[9px] uppercase font-black px-2 sm:px-3 py-0.5">
                                    {supplier.categoria}
                                </Badge>
                                {supplier.status === 'atrasado' && (
                                  <span className="flex items-center gap-1 text-red-500 text-[8px] sm:text-[9px] font-black uppercase shrink-0 px-2 py-0.5 bg-red-500/10 rounded-full border border-red-500/20">
                                    <AlertCircle size={10} /> Atrasado
                                  </span>
                                )}
                            </div>
                        </div>
                        <div className="ml-auto group-hover:translate-x-1 transition-transform duration-500 text-muted-foreground group-hover:text-primary">
                             <ChevronRight size={20} />
                        </div>
                    </div>

                    {/* Line 2: Financial Stats & Status */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 xl:gap-8 bg-secondary/5 p-4 rounded-[1.2rem] border border-white/5">
                        <div>
                            <p className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5 opacity-50">
                              <DollarIcon size={10} className="text-primary" /> Valor
                            </p>
                            <p className="font-black text-base text-foreground font-mono">{formatCurrency(supplier.valorTotal)}</p>
                        </div>

                        <div>
                            <p className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-1.5 opacity-50">
                              <Calendar size={10} className="text-amber-500" /> Quitação
                            </p>
                            <p className="text-base font-black text-foreground font-mono">
                              {formatDate(supplier.parcelas[supplier.parcelas.length - 1].dataVencimento)}
                            </p>
                        </div>

                        <div className="flex flex-col justify-center gap-1.5">
                            <p className="text-[8px] text-muted-foreground font-black uppercase tracking-[0.2em] flex items-center justify-between opacity-50">
                              Pago <span className="text-foreground">{Math.round(progress)}%</span>
                            </p>
                            <div className="h-1.5 w-full bg-secondary/30 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className={cn(
                                  "h-full rounded-full bg-gradient-to-r",
                                  progress === 100 ? "from-green-500 to-emerald-400" : "from-primary to-blue-400"
                                )}
                              />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 pr-1">
                            <div className="flex -space-x-1.5 overflow-hidden">
                                {supplier.parcelas.map((p: any, i: number) => (
                                    <div 
                                        key={i} 
                                        className={cn(
                                            "w-5 h-5 rounded-md border-2 border-slate-900 flex items-center justify-center text-[8px] font-black transition-all", 
                                            p.status === 'pago' 
                                              ? 'bg-green-500 text-white shadow-[0_0_6px_rgba(34,197,94,0.3)]' 
                                              : 'bg-secondary/40 text-muted-foreground/30'
                                        )} 
                                        title={`Parcela ${p.numero}: ${p.status}`} 
                                    >
                                      {p.numero}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Line 3: Service with icon */}
                    <div className="flex items-center gap-2 pl-1">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Briefcase size={12} />
                        </div>
                        <p className="text-[11px] font-bold text-muted-foreground tracking-wide truncate">
                          Serviço: <span className="text-foreground">{supplier.servico}</span>
                        </p>
                    </div>
                </div>
            </div>
        </Reorder.Item>
    );
};


function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}
