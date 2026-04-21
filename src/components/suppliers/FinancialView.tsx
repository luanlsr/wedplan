import { useMemo, useState } from 'react';
import { Card, Badge, Input } from '../ui';
import { formatCurrency, formatDate } from '../../utils/calculations';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Search, Filter, Calendar, DollarSign, ChevronDown, CheckCircle, Clock, ArrowUp, ArrowDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from '../ui';
import type { Supplier, Installment } from '../../types';

interface FinancialViewProps {
  suppliers: Supplier[];
}

export const FinancialView = ({ suppliers }: FinancialViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pago" | "pendente">("all");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [installmentSort, setInstallmentSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'dataVencimento', direction: 'asc' });

  const [showPastMonths, setShowPastMonths] = useState(true);

  const categories = useMemo(() => 
    ["Todas", ...Array.from(new Set(suppliers.map(s => s.categoria))).sort()], 
    [suppliers]
  );

  const monthlyData = useMemo(() => {
    const data: Record<string, { 
      monthLabel: string, 
      total: number, 
      paid: number, 
      pending: number,
      installments: (Installment & { supplierName: string, category: string })[] 
    }> = {};

    const currentMonthKey = format(new Date(), "yyyy-MM");

    suppliers.forEach(s => {
      // Filter by category first
      if (categoryFilter !== "Todas" && s.categoria !== categoryFilter) return;
      
      s.parcelas.forEach(p => {
        const date = parseISO(p.dataVencimento);
        const sortKey = format(date, "yyyy-MM");

        // Hide past months if toggle is off
        if (!showPastMonths && sortKey < currentMonthKey) return;

        // Filter by searchTerm
        if (searchTerm && !s.fornecedor.toLowerCase().includes(searchTerm.toLowerCase())) return;
        
        // Filter by status
        if (statusFilter !== "all" && p.status !== statusFilter) return;

        const monthLabel = format(date, "MMMM / yyyy", { locale: ptBR });

        if (!data[sortKey]) {
          data[sortKey] = {
            monthLabel,
            total: 0,
            paid: 0,
            pending: 0,
            installments: []
          };
        }

        data[sortKey].total += p.valor;
        if (p.status === 'pago') data[sortKey].paid += p.valor;
        else data[sortKey].pending += p.valor;

        data[sortKey].installments.push({
          ...p,
          supplierName: s.fornecedor,
          category: s.categoria
        });
      });
    });

    // Sort installments inside each month based on installmentSort
    Object.keys(data).forEach(key => {
      data[key].installments.sort((a, b) => {
        let valA: any = a[installmentSort.key as keyof typeof a];
        let valB: any = b[installmentSort.key as keyof typeof b];

        if (valA < valB) return installmentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return installmentSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    });

    return Object.entries(data)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => ({ key, ...value }));
  }, [suppliers, searchTerm, categoryFilter, statusFilter, showPastMonths, installmentSort]);

  const toggleSort = (key: string) => {
    setInstallmentSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => 
      prev.includes(monthKey) 
        ? prev.filter(m => m !== monthKey) 
        : [...prev, monthKey]
    );
  };

  const chartData = useMemo(() => monthlyData.map(m => ({
    name: m.monthLabel.split(' / ')[0],
    Total: m.total,
    Pago: m.paid,
    Pendente: m.pending
  })), [monthlyData]);

  const stats = useMemo(() => {
    let t = 0; let p = 0; let pend = 0;
    monthlyData.forEach(m => {
      t += m.total;
      p += m.paid;
      pend += m.pending;
    });
    return { total: t, paid: p, pending: pend };
  }, [monthlyData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input 
              placeholder="Buscar fornecedor no fluxo..." 
              className="pl-12 h-12 bg-secondary/30 border-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <select 
              className="w-full h-12 pl-12 pr-4 rounded-xl bg-secondary/30 border-none focus:outline-none text-sm font-bold appearance-none text-foreground"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map(c => <option key={c} value={c} className="bg-card text-foreground">{c}</option>)}
            </select>
          </div>

          <div className="flex bg-secondary/30 rounded-xl p-1 gap-1">
            {(["all", "pago", "pendente"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "flex-1 text-[10px] font-black uppercase tracking-wider h-10 rounded-lg transition-all",
                  statusFilter === s ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5"
                )}
              >
                {s === 'all' ? 'Tudo' : s === 'pago' ? 'Pago' : 'Pendente'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
              <div 
                role="button"
                onClick={() => setShowPastMonths(!showPastMonths)}
                className={cn(
                  "w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 flex items-center",
                  showPastMonths ? "bg-primary" : "bg-secondary"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-300",
                  showPastMonths ? "translate-x-6" : "translate-x-0"
                )} />
              </div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Mostrar Meses Passados</span>
           </div>
           
           <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">
             {monthlyData.length} meses visíveis
           </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
          <Card className="bg-card/40 border-none justify-between flex flex-col p-4 sm:p-6 h-28 sm:h-32">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total no Filtro</p>
             <h4 className="text-2xl sm:text-3xl font-black text-foreground">{formatCurrency(stats.total)}</h4>
             <div className="h-1 w-full bg-secondary/30 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primary w-full opacity-30" />
             </div>
          </Card>
          <Card className="bg-green-500/5 border border-green-500/10 flex flex-col justify-between p-4 sm:p-6 h-28 sm:h-32">
             <p className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em] flex items-center gap-2">
               <CheckCircle size={12} /> Total Pago
             </p>
             <h4 className="text-2xl sm:text-3xl font-black text-green-500">{formatCurrency(stats.paid)}</h4>
             <div className="h-1 w-full bg-green-500/20 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${(stats.paid / stats.total * 100) || 0}%` }} />
             </div>
          </Card>
          <Card className="bg-amber-500/5 border border-amber-500/10 flex flex-col justify-between p-4 sm:p-6 h-28 sm:h-32">
             <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
               <Clock size={12} /> Saldo Pendente
             </p>
             <h4 className="text-2xl sm:text-3xl font-black text-amber-500">{formatCurrency(stats.pending)}</h4>
             <div className="h-1 w-full bg-amber-500/20 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${(stats.pending / stats.total * 100) || 0}%` }} />
             </div>
          </Card>
        </div>

        {/* Visual Chart */}
        <Card className="lg:col-span-3 h-80 bg-card border-none shadow-xl p-8">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-lg font-black text-foreground uppercase tracking-widest flex items-center gap-3">
               <Calendar className="text-primary" /> Fluxo Temporal de Caixa
             </h3>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: '#0f172a', color: 'white' }}
                formatter={(v: any) => formatCurrency(v as number)}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
              <Bar dataKey="Pago" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={24} />
              <Bar dataKey="Pendente" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Dynamic Drill-down Table */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-[0.3em] pl-2">Detalhamento Mensal</h3>
          
          {monthlyData.length > 0 ? monthlyData.map((month) => {
            const currentMonthKey = format(new Date(), "yyyy-MM");
            const isHistorical = month.key < currentMonthKey;
            const isCurrent = month.key === currentMonthKey;
            const isExpanded = expandedMonths.includes(month.key);

            return (
              <div 
                key={month.key} 
                className={cn(
                  "group transition-all duration-300",
                  isHistorical ? "opacity-60 hover:opacity-100" : "opacity-100"
                )}
              >
                <div 
                  onClick={() => toggleMonth(month.key)}
                  className={cn(
                    "flex items-center justify-between p-5 rounded-[1.5rem] cursor-pointer transition-all border border-white/5",
                    isExpanded ? "bg-primary/10 border-primary/20 scale-[1.01] shadow-lg" : "bg-card/40 hover:bg-card/60"
                  )}
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center font-black text-xs uppercase shadow-inner",
                      isCurrent ? "bg-green-500 text-white" : isHistorical ? "bg-secondary text-muted-foreground" : "bg-primary text-white"
                    )}>
                      {month.key.split('-')[1]}<br/>{month.key.split('-')[0].substring(2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                         <h4 className="text-lg font-black text-foreground capitalize">{month.monthLabel}</h4>
                         {isCurrent && <Badge variant="success" className="text-[8px] px-1.5 h-4">Mês Corrente</Badge>}
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {month.installments.length} Lançamentos • {month.paid > 0 ? `Pagos: ${formatCurrency(month.paid)}` : 'Nenhum pago'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                     <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-0.5">Total Mensal</p>
                        <p className="text-xl font-black text-foreground">{formatCurrency(month.total)}</p>
                     </div>
                     <div className={cn(
                       "w-8 h-8 rounded-full flex items-center justify-center transition-transform",
                       isExpanded ? "bg-primary text-white rotate-180" : "bg-secondary text-muted-foreground"
                     )}>
                        <ChevronDown size={16} />
                     </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-2 ml-4 mr-4 space-y-2 p-4 bg-secondary/10 rounded-b-3xl border-x border-b border-white/5 animate-in slide-in-from-top-4 duration-300">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground uppercase font-black tracking-tighter border-b border-white/5">
                          <th className="pb-3 text-left pl-2">
                            <button onClick={() => toggleSort('supplierName')} className="flex items-center gap-1 hover:text-primary transition-colors">
                              Fornecedor {installmentSort.key === 'supplierName' && (installmentSort.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                            </button>
                          </th>
                          <th className="pb-3 text-center">
                            <button onClick={() => toggleSort('dataVencimento')} className="flex items-center justify-center gap-1 w-full hover:text-primary transition-colors">
                              Vencimento {installmentSort.key === 'dataVencimento' && (installmentSort.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                            </button>
                          </th>
                          <th className="pb-3 text-right pr-2">
                             <button onClick={() => toggleSort('valor')} className="flex items-center justify-end gap-1 w-full hover:text-primary transition-colors">
                              Valor {installmentSort.key === 'valor' && (installmentSort.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {month.installments.map((inst, idx) => (
                          <tr key={idx} className="group hover:bg-white/5 transition-colors">
                            <td className="py-3 pl-2">
                              <div className="flex items-center gap-3">
                                 <div className={cn(
                                   "w-2 h-2 rounded-full",
                                   inst.status === 'pago' ? "bg-green-500" : "bg-primary"
                                 )} />
                                 <div>
                                   <p className="font-bold text-foreground">{inst.supplierName}</p>
                                   <p className="text-[10px] font-medium text-muted-foreground">Parc. {inst.numero} • {inst.category}</p>
                                 </div>
                              </div>
                            </td>
                            <td className="py-3 text-center font-mono opacity-80">{formatDate(inst.dataVencimento)}</td>
                            <td className="py-3 text-right pr-2 font-black text-foreground">
                              {formatCurrency(inst.valor)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="py-20 flex flex-col items-center justify-center gap-4 bg-card/20 rounded-[2rem] border border-dashed border-white/10 opacity-50">
               <DollarSign size={48} className="text-muted-foreground" />
               <p className="font-bold">Nenhum lançamento encontrado para estes filtros.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
