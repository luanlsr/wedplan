import type { FinancialStats } from "../../types";
import { Card } from "../ui";
import { formatCurrency } from "../../utils/calculations";
import { useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";
import { TrendingUp, CheckCircle, Clock, AlertTriangle, Briefcase, DollarSign, Settings, ArrowDown, ArrowUp } from "lucide-react";
import { parseISO, differenceInDays } from "date-fns";
import { WeddingCountdown } from "../timeline/WeddingCountdown";

interface DashboardProps {
  stats: FinancialStats;
  weddingDate?: string;
  onAction: (action: 'new_supplier' | 'financial' | 'settings') => void;
}

import { cn } from "../../lib/utils";

export const Dashboard = ({ stats, weddingDate, onAction }: DashboardProps) => {
  const [pieSortDirection, setPieSortDirection] = useState<'asc' | 'desc'>('asc');
  const pieData = Object.entries(stats.porCategoria).map(([name, value]) => ({ name, value }));
  const sortedPieData = [...pieData].sort((a, b) => {
    const percentageA = stats.totalContratado > 0 ? a.value / stats.totalContratado : 0;
    const percentageB = stats.totalContratado > 0 ? b.value / stats.totalContratado : 0;
    return pieSortDirection === 'asc' ? percentageA - percentageB : percentageB - percentageA;
  });
  const COLORS = ["#3b82f6", "#8b5cf6", "#6366f1", "#10b981", "#f59e0b", "#06b6d4"];

  const summaryCards = [
    { title: "Total do Casamento", value: stats.totalContratado, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/20" },
    { title: "Total Pago", value: stats.totalPago, icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/20" },
    { title: "Total Restante", value: stats.totalRestante, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/20" },
    { title: "Orçamento Planejado", value: stats.totalOrcado, icon: AlertTriangle, color: "text-primary", bg: "bg-primary/20" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <WeddingCountdown weddingDate={weddingDate} compact />

      {/* Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {summaryCards.map((card, i) => (
          <Card key={i} className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-3 overflow-hidden relative min-w-0 p-4">
            <div className={cn("p-2 sm:p-3 rounded-xl shrink-0", card.bg)}>
              <card.icon className={cn(card.color, "sm:w-[24px] sm:h-[24px]")} size={18} />
            </div>
            <div className="min-w-0 flex-1 w-full">
              <p className="text-[10px] sm:text-xs font-extrabold text-muted-foreground uppercase tracking-wide truncate">{card.title}</p>
              <h3 className="text-sm sm:text-xl font-extrabold text-foreground break-all sm:break-normal leading-tight">{formatCurrency(card.value)}</h3>
            </div>
          </Card>
        ))}
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics Chart */}
        <Card className="lg:col-span-2 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-extrabold text-foreground">Resumo por Categoria</h3>
          </div>
          <div className="h-[250px] sm:h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                <XAxis 
                  dataKey="name" 
                  fontSize={8} 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: 'currentColor', opacity: 0.5 }}
                  minTickGap={10}
                />
                <YAxis 
                  fontSize={8} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(v) => `R$${v/1000}k`}
                  tick={{ fill: 'currentColor', opacity: 0.5 }}
                />
                <Tooltip 
                  formatter={(v: any) => [formatCurrency(Number(v)), '']}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    backgroundColor: '#0f172a',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                  itemStyle={{ padding: '0' }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
 
        {/* Categories Pie */}
        <Card>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-extrabold text-foreground">Distribuição de Verba</h3>
            <div className="flex rounded-xl border border-border bg-secondary/30 p-1">
              <button
                type="button"
                onClick={() => setPieSortDirection('asc')}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[10px] font-extrabold uppercase tracking-wide transition-colors sm:flex-none",
                  pieSortDirection === 'asc' ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                aria-label="Ordenar porcentagens do menor para o maior"
              >
                <ArrowUp size={13} />
                Menor
              </button>
              <button
                type="button"
                onClick={() => setPieSortDirection('desc')}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[10px] font-extrabold uppercase tracking-wide transition-colors sm:flex-none",
                  pieSortDirection === 'desc' ? "bg-primary text-white shadow-sm shadow-primary/20" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                aria-label="Ordenar porcentagens do maior para o menor"
              >
                <ArrowDown size={13} />
                Maior
              </button>
            </div>
          </div>
          <div className="h-[250px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sortedPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {sortedPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(v: any) => formatCurrency(Number(v))}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', border: 'none', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {sortedPieData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="font-medium text-muted-foreground truncate">{item.name}</span>
                </div>
                <span className="font-bold text-foreground shrink-0">
                  {stats.totalContratado > 0 ? Math.round((item.value / stats.totalContratado) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
 
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Due Dates */}
        <Card>
          <h3 className="mb-5 text-base font-extrabold text-foreground">Próximos Vencimentos</h3>
          <div className="space-y-4">
            {stats.proximosVencimentos.length > 0 ? (
              stats.proximosVencimentos.map((v, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-secondary/40 border border-border gap-4 min-w-0">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center font-extrabold text-primary shadow-sm shrink-0">
                      {parseISO(v.data).getDate()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate break-words">{v.fornecedor}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Parcela {v.parcela}/{v.totalParcelas}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-end border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50">
                    <p className="font-extrabold text-sm sm:text-base text-foreground whitespace-nowrap">{formatCurrency(v.valor)}</p>
                    <p className="text-[10px] sm:text-xs font-bold uppercase text-amber-500">
                      {differenceInDays(parseISO(v.data), new Date()) < 0 ? "Atrasado" : `Em ${differenceInDays(parseISO(v.data), new Date())} d`}
                    </p>
                  </div>
                </div>
              ))

            ) : (
                <p className="text-center text-muted-foreground py-10 font-medium">Não há vencimentos próximos!</p>
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
           <Card 
             onClick={() => onAction('new_supplier')}
             className="flex flex-col items-center justify-center gap-3 hover:bg-primary hover:text-white cursor-pointer transition-all group"
           >
             <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-white/20 flex items-center justify-center">
               <Briefcase size={24} className="text-primary group-hover:text-white" />
             </div>
             <span className="font-bold text-foreground group-hover:text-white">Novo Fornecedor</span>
           </Card>
           <Card 
             onClick={() => onAction('financial')}
             className="flex flex-col items-center justify-center gap-3 hover:bg-green-500 hover:text-white cursor-pointer transition-all group"
           >
             <div className="w-12 h-12 rounded-full bg-green-500/10 group-hover:bg-white/20 flex items-center justify-center">
               <DollarSign size={24} className="text-green-500 group-hover:text-white" />
             </div>
             <span className="font-bold text-foreground group-hover:text-white">Pagamento</span>
           </Card>
           <Card 
             onClick={() => onAction('financial')}
             className="flex flex-col items-center justify-center gap-3 hover:bg-blue-500 hover:text-white cursor-pointer transition-all group"
           >
             <div className="w-12 h-12 rounded-full bg-blue-500/10 group-hover:bg-white/20 flex items-center justify-center">
               <TrendingUp size={24} className="text-blue-500 group-hover:text-white" />
             </div>
             <span className="font-bold text-foreground group-hover:text-white">Relatórios</span>
           </Card>
           <Card 
             onClick={() => onAction('settings')}
             className="flex flex-col items-center justify-center gap-3 hover:bg-purple-500 hover:text-white cursor-pointer transition-all group"
           >
             <div className="w-12 h-12 rounded-full bg-purple-500/10 group-hover:bg-white/20 flex items-center justify-center">
               <Settings size={24} className="text-purple-500 group-hover:text-white" />
             </div>
             <span className="font-bold text-foreground group-hover:text-white">Ajustes</span>
           </Card>
        </div>
      </div>
    </div>
  );
};
