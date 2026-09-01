import { useState, useMemo, useEffect, type ReactNode } from "react";
import { Button, PaginationBar } from "../ui";
import { 
  Search, Plus, ArrowUpDown, 
  ChevronDown, Filter, ArrowUp, ArrowDown, 
  DollarSign as DollarIcon, CheckCircle2, 
  X
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

type FilterSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  icon: ReactNode;
  isStatus?: boolean;
};

const FilterSelect = ({ value, onChange, options, icon, isStatus = false }: FilterSelectProps) => (
  <div className="relative w-full md:w-48 group">
    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none group-focus-within:text-primary transition-colors">
      {icon}
    </div>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-card border border-border rounded-xl h-11 pl-12 pr-10 text-foreground appearance-none focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all text-sm font-medium cursor-pointer"
    >
      {options.map((o: string) => (
        <option key={o} value={o}>
          {isStatus && o !== "Todos" ? (o === "pago" ? "Pagos" : o === "pendente" ? "Pendentes" : o === "parcial" ? "Parciais" : "Atrasados") : o}
        </option>
      ))}
    </select>
    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
  </div>
);

type SortBtnProps = {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  direction?: "asc" | "desc" | null;
};

const SortBtn = ({ active, onClick, icon, label, direction }: SortBtnProps) => (
    <button
        onClick={onClick}
        className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold tracking-wide transition-all duration-300",
            active 
              ? "bg-primary text-white shadow-sm shadow-primary/20" 
              : "text-muted-foreground bg-card hover:bg-accent border border-border"
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
  const [sortBy, setSortBy] = useState<SortOption>("alphabetical");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const categories = ["Todas", ...Array.from(new Set(suppliers.map((s) => s.categoria))).sort((a, b) => a.localeCompare(b))];
  const statuses = ["Todos", "pago", "pendente", "parcial", "atrasado"];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    const result = [...suppliers];
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
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-5 bg-transparent md:bg-card/90 md:backdrop-blur-xl p-0 md:p-5 rounded-none md:rounded-xl border-0 md:border md:border-border shadow-none md:shadow-sm">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4 sm:gap-6 px-4 md:px-0 pt-4 md:pt-0">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-all duration-300" size={20} />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-full bg-card border border-border rounded-xl h-11 pl-10 sm:pl-12 pr-10 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/50 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
              <div className="flex items-center justify-between w-full h-full gap-4">
                <Button 
                  variant="outline" 
                  className={cn("md:hidden h-10 flex-1 rounded-xl font-bold gap-2 text-xs", showMobileFilters && "bg-primary/10 text-primary border-primary/20")}
                  onClick={() => setShowMobileFilters(!showMobileFilters)}
                >
                  <Filter size={16} /> {showMobileFilters ? 'Ocultar' : 'Filtrar'}
                </Button>
                <div className="px-3 py-1 bg-secondary/50 rounded-lg border border-border shrink-0 flex items-center h-10 sm:h-11">
                   <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wide mr-2 hidden sm:inline">Encontrados:</span>
                   <span className="text-xs font-extrabold text-primary">{sortedSuppliers.length}</span>
                </div>
              </div>

              <div className={cn(
                "md:flex flex-col md:flex-row items-center gap-4 w-full md:w-auto",
                showMobileFilters ? "flex animate-in slide-in-from-top-2 mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-none border-white/5" : "hidden"
              )}>
                <FilterSelect value={categoryFilter} onChange={setCategoryFilter} options={categories} icon={<Filter size={18}/>} />
                <FilterSelect value={statusFilter} onChange={setStatusFilter} options={statuses} icon={<CheckCircle2 size={18}/>} isStatus />
              </div>
            </div>
          </div>

          <Button onClick={onAdd} size="lg" className="h-11 px-5 rounded-xl font-extrabold group w-full xl:w-auto text-sm">
            <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
            Adicionar Fornecedor
          </Button>
        </div>

        <div className={cn(
          "flex-wrap items-center gap-2 pt-4 border-t border-border px-4 md:px-0",
          showMobileFilters ? "flex" : "hidden md:flex"
        )}>
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
          className="flex flex-col bg-card/80 backdrop-blur-sm divide-y divide-border md:bg-transparent md:backdrop-blur-none md:divide-none md:space-y-3"
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

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedSuppliers.length}
        itemsPerPage={itemsPerPage}
        itemLabel="fornecedor"
        itemLabelPlural="fornecedores"
        onPageChange={setCurrentPage}
        className="mx-4 mt-4 md:mx-0"
      />
    </div>
  );
};
