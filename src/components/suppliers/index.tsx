import { useState, useMemo, useEffect } from "react";
import { Button } from "../ui";
import { 
  Search, Plus, ArrowUpDown, 
  ChevronDown, Filter, ArrowUp, ArrowDown, 
  DollarSign as DollarIcon, Calendar, CheckCircle2, 
  ChevronLeft
} from "lucide-react";
import type { Supplier } from "../../types";
import { Reorder, motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { SupplierItem } from "./SupplierItem";

interface SuppliersListProps {
  suppliers: Supplier[];
  onAdd: () => void;
  onSelect: (supplier: Supplier) => void;
  onReorder: (suppliers: Supplier[]) => void;
}

type SortOption = "manual" | "alphabetical" | "value" | "category" | "status";

const FilterSelect = ({ value, onChange, options, icon, isStatus = false }: any) => (
  <div className="relative w-full md:w-48 group">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none group-focus-within:text-primary transition-colors">
      {icon}
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-secondary/20 border border-white/5 rounded-2xl h-14 pl-12 pr-10 text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-secondary/40 transition-all font-medium cursor-pointer"
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

export const SuppliersList = ({ suppliers, onAdd, onSelect, onReorder }: SuppliersListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [sortBy, setSortBy] = useState<SortOption>("manual");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const categories = ["Todas", ...Array.from(new Set(suppliers.map((s) => s.categoria))).sort((a, b) => a.localeCompare(b))];
  const statuses = ["Todos", "pago", "pendente", "parcial", "atrasado"];

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
            
            <div className="flex gap-4 w-full md:w-auto">
              <FilterSelect value={categoryFilter} onChange={setCategoryFilter} options={categories} icon={<Filter size={18}/>} />
              <FilterSelect value={statusFilter} onChange={setStatusFilter} options={statuses} icon={<CheckCircle2 size={18}/>} isStatus />
            </div>
          </div>

          <Button onClick={onAdd} size="lg" className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest group shadow-[0_10px_20px_rgba(var(--primary-rgb),0.3)] w-full xl:w-auto">
            <Plus className="group-hover:rotate-90 transition-transform duration-500" />
            Adicionar Fornecedor
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
          <SortBtn active={sortBy === 'manual'} onClick={() => handleSort('manual')} icon={<ArrowUpDown size={14}/>} label="Ordem Manual" />
          <SortBtn active={sortBy === 'alphabetical'} onClick={() => handleSort('alphabetical')} icon={<Search size={14}/>} label="A-Z" direction={sortBy === 'alphabetical' ? sortDirection : null} />
          <SortBtn active={sortBy === 'value'} onClick={() => handleSort('value')} icon={<DollarIcon size={14}/>} label="Valor" direction={sortBy === 'value' ? sortDirection : null} />
          <SortBtn active={sortBy === 'category'} onClick={() => handleSort('category')} icon={<Filter size={14}/>} label="Categoria" direction={sortBy === 'category' ? sortDirection : null} />
          <SortBtn active={sortBy === 'status'} onClick={() => handleSort('status')} icon={<CheckCircle2 size={14}/>} label="Status" direction={sortBy === 'status' ? sortDirection : null} />
        </div>
      </div>

      <div className="relative">
        <Reorder.Group
          axis="y"
          values={sortedSuppliers}
          onReorder={onReorder}
          className="space-y-4"
        >
          <AnimatePresence mode="popLayout">
            {paginatedSuppliers.map((s) => (
              <SupplierItem
                key={s.id}
                supplier={s}
                onSelect={onSelect}
                isManual={sortBy === 'manual'}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>

        {sortedSuppliers.length === 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 px-4 text-center bg-card/20 rounded-[3rem] border border-dashed border-white/10"
          >
            <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center mb-6 text-muted-foreground opacity-20">
              <Search size={40} />
            </div>
            <h3 className="text-2xl font-black text-muted-foreground uppercase tracking-tighter italic">Nenhum fornecedor encontrado</h3>
            <p className="text-muted-foreground/60 mt-2 font-medium">Tente ajustar seus filtros ou busca.</p>
          </motion.div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8">
           <Button 
            variant="outline" 
            size="icon" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="rounded-xl border-white/5 bg-card/40"
           >
             <ChevronLeft size={20} />
           </Button>
           
           <div className="flex items-center gap-1.5 px-6 h-10 rounded-xl bg-card/40 border border-white/5">
             <span className="text-primary font-black">{currentPage}</span>
             <span className="text-muted-foreground font-bold">/</span>
             <span className="text-muted-foreground font-bold">{totalPages}</span>
           </div>

           <Button 
            variant="outline" 
            size="icon" 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="rounded-xl border-white/5 bg-card/40 rotate-180"
           >
             <ChevronLeft size={20} />
           </Button>
        </div>
      )}
    </div>
  );
};
