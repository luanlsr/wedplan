import { motion, useDragControls, Reorder } from "framer-motion";
import { 
    GripVertical, ChevronRight, AlertCircle, 
    Briefcase, DollarSign as DollarIcon, Calendar 
} from "lucide-react";
import { Badge } from "../ui";
import { formatCurrency, formatDate } from "../../utils/calculations";
import { cn } from "../../lib/utils";
import type { Supplier } from "../../types";

interface SupplierItemProps {
    supplier: Supplier;
    onSelect: (supplier: Supplier) => void;
    isManual: boolean;
}

export const SupplierItem = ({ supplier, onSelect, isManual }: SupplierItemProps) => {
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
