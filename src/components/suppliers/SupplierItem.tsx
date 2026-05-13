import { motion, useDragControls, Reorder } from "framer-motion";
import { 
    GripVertical, ChevronRight, AlertCircle, 
    Briefcase, DollarSign as DollarIcon, Calendar,
    MoreVertical, Edit2, Trash2, ExternalLink,
    Check
} from "lucide-react";
import { Badge, Button } from "../ui";
import { formatCurrency, formatDate } from "../../utils/calculations";
import { cn } from "../../lib/utils";
import type { Supplier } from "../../types";
import { useState } from "react";

interface SupplierItemProps {
    supplier: Supplier;
    onSelect: (supplier: Supplier) => void;
    isManual: boolean;
}

export const SupplierItem = ({ supplier, onSelect, isManual }: SupplierItemProps) => {
    const dragControls = useDragControls();
    const [showActions, setShowActions] = useState(false);
    const paidValue = supplier.parcelas.reduce((acc: number, p: any) => p.status === 'pago' ? acc + p.valor : acc, 0);
    const progress = (paidValue / supplier.valorTotal) * 100;

    return (
        <Reorder.Item
            value={supplier}
            dragListener={false}
            dragControls={dragControls}
            className="group outline-none"
        >
        <div className={cn(
            "relative border-b border-border/40 bg-transparent py-4 px-2 sm:px-4 sm:py-5 transition-all last:border-0 group hover:bg-secondary/5",
            showActions && "z-50"
        )}>
                <div className="flex items-center gap-4 relative z-10 w-full min-w-0">
                    {isManual && (
                        <div 
                            onPointerDown={(e) => dragControls.start(e)}
                            className="p-2 cursor-grab active:cursor-grabbing text-muted-foreground/20 hover:text-primary transition-colors flex items-center shrink-0"
                        >
                            <GripVertical size={20} />
                        </div>
                    )}
                <div className="flex items-center justify-between gap-4 relative w-full">
                    {/* Lado Esquerdo: Info */}
                    <div className="flex-1 min-w-0 pr-24" onClick={() => onSelect(supplier)}>
                        {/* Nível 1: Nome */}
                        <div className="mb-2">
                            <h4 className="text-[15px] sm:text-2xl font-black text-foreground leading-tight tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                              {supplier.fornecedor}
                            </h4>
                        </div>

                        {/* Nível 2: Valor */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mb-3">
                            <div className="flex items-center gap-1.5">
                                <DollarIcon size={14} className="text-primary/30" />
                                <span className="text-[12px] sm:text-lg font-medium text-foreground/80 tracking-tight">
                                    {formatCurrency(supplier.valorTotal)}
                                </span>
                            </div>

                            <div className="hidden sm:flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                                <div className="flex flex-col">
                                    <span className="text-[9px] opacity-60">Pago</span>
                                    <span className="text-emerald-500/80">{formatCurrency(paidValue)}</span>
                                </div>
                                <div className="w-px h-6 bg-border/40" />
                                <div className="flex flex-col">
                                    <span className="text-[9px] opacity-60">Restante</span>
                                    <span className="text-amber-500/80">{formatCurrency(supplier.valorTotal - paidValue)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Nível 3: Tags Lado a Lado */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="opacity-80 sm:text-[10px] sm:px-3 sm:py-1">
                                {supplier.categoria}
                            </Badge>
                            
                            <Badge 
                                variant={
                                    // @ts-ignore
                                    supplier.status === 'pago' ? "success" : 
                                    // @ts-ignore
                                    supplier.status === 'atrasado' ? "error" : "warning"
                                }
                                className="shadow-sm sm:text-[10px] sm:px-3 sm:py-1"
                            >
                                {/* @ts-ignore */}
                                {supplier.status}
                            </Badge>
                        </div>
                    </div>

                    {/* Lado Direito: Progresso e Ações - Absoluto */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-3 shrink-0">
                        {/* Progresso Circular */}
                        <div className="relative w-10 h-10 sm:w-14 sm:h-14 hidden sm:block">
                            <svg className="w-full h-full -rotate-90">
                                <circle
                                    cx="50%" cy="50%" r="45%"
                                    className="fill-none stroke-secondary/30 stroke-[3]"
                                />
                                <motion.circle
                                    cx="50%" cy="50%" r="45%"
                                    className="fill-none stroke-primary stroke-[3]"
                                    strokeDasharray="100"
                                    initial={{ strokeDashoffset: 100 }}
                                    animate={{ strokeDashoffset: 100 - progress }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[10px] font-black">{Math.round(progress)}%</span>
                        </div>

                        {/* Menu de Ações */}
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
                                        <div className="text-[9px] font-black text-muted-foreground/80 uppercase tracking-widest px-3 py-2">Administrar</div>
                                        
                                        <button 
                                            onClick={() => {
                                                onSelect(supplier);
                                                setShowActions(false);
                                            }}
                                            className="w-full flex items-center gap-2 p-3 rounded-xl hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-widest transition-colors"
                                        >
                                            <ExternalLink size={16} className="text-primary" />
                                            Ver Detalhes
                                        </button>

                                        <button 
                                            onClick={() => {
                                                onSelect(supplier);
                                                setShowActions(false);
                                            }}
                                            className="w-full flex items-center gap-2 p-3 rounded-xl hover:bg-secondary text-foreground text-xs font-bold uppercase tracking-widest transition-colors"
                                        >
                                            <Edit2 size={16} className="text-primary" />
                                            Editar
                                        </button>

                                        <div className="h-px bg-border/50 my-1 mx-2" />

                                        <button 
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
                </div>

                {/* Subinfo: Removida para manter padrão clean list mobile-like no Web */}
            </div>
        </Reorder.Item>
    );
};
