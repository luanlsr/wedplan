import type { FinancialStats } from "../../types";
import { Card } from "../ui";
import { formatCurrency } from "../../utils/calculations";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";
import { TrendingUp, CheckCircle, Clock, AlertTriangle, Briefcase, DollarSign, Settings } from "lucide-react";
import { parseISO, differenceInDays } from "date-fns";

interface DashboardProps {
  stats: FinancialStats;
  onAction: (action: 'new_supplier' | 'financial' | 'settings') => void;
}

// Internal helper for styling combine
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}

export const Dashboard = ({ stats, onAction }: DashboardProps) => {
  const pieData = Object.entries(stats.porCategoria).map(([name, value]) => ({ name, value }));
  const COLORS = ["#3b82f6", "#8b5cf6", "#6366f1", "#10b981", "#f59e0b", "#06b6d4"];

  const summaryCards = [
    { title: "Total do Casamento", value: stats.totalContratado, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/20" },
    { title: "Total Pago", value: stats.totalPago, icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/20" },
    { title: "Total Restante", value: stats.totalRestante, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/20" },
    { title: "Orçamento Planejado", value: stats.totalOrcado, icon: AlertTriangle, color: "text-primary", bg: "bg-primary/20" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, i) => (
          <Card key={i} className="flex items-center gap-4 border-none shadow-lg bg-card">
            <div className={cn("p-4 rounded-2xl", card.bg)}>
              <card.icon className={card.color} size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{card.title}</p>
              <h3 className="text-2xl font-black text-foreground">{formatCurrency(card.value)}</h3>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics Chart */}
        <Card className="lg:col-span-2 shadow-xl border-none bg-card">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-foreground">Resumo por Categoria</h3>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} stroke="currentColor" className="text-muted-foreground/20" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="currentColor" className="text-muted-foreground" />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip 
                  formatter={(v: any) => formatCurrency(Number(v))}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                    backgroundColor: 'hsl(var(--card))',
                    color: 'hsl(var(--card-foreground))'
                  }}
                  itemStyle={{ color: 'hsl(var(--card-foreground))' }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Categories Pie */}
        <Card className="shadow-xl border-none bg-card">
          <h3 className="text-lg font-bold mb-8 text-foreground">Distribuição de Verba</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, index) => (
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
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="font-medium text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-bold text-foreground">{Math.round((item.value / stats.totalContratado) * 100)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Due Dates */}
        <Card className="shadow-xl border-none bg-card">
          <h3 className="text-lg font-bold mb-6 text-foreground">Próximos Vencimentos</h3>
          <div className="space-y-4">
            {stats.proximosVencimentos.length > 0 ? (
              stats.proximosVencimentos.map((v, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center font-black text-primary shadow-sm">
                      {parseISO(v.data).getDate()}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{v.fornecedor}</p>
                      <p className="text-xs text-muted-foreground">Parcela {v.parcela}/{v.totalParcelas}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg text-foreground">{formatCurrency(v.valor)}</p>
                    <p className="text-xs font-bold uppercase text-amber-500">
                      {differenceInDays(parseISO(v.data), new Date()) < 0 ? "Atrasado" : `Em ${differenceInDays(parseISO(v.data), new Date())} dias`}
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
             className="flex flex-col items-center justify-center gap-3 hover:bg-primary hover:text-white cursor-pointer transition-all border-none shadow-lg group bg-card"
           >
             <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-white/20 flex items-center justify-center">
               <Briefcase size={24} className="text-primary group-hover:text-white" />
             </div>
             <span className="font-bold text-foreground group-hover:text-white">Novo Fornecedor</span>
           </Card>
           <Card 
             onClick={() => onAction('financial')}
             className="flex flex-col items-center justify-center gap-3 hover:bg-green-500 hover:text-white cursor-pointer transition-all border-none shadow-lg group bg-card"
           >
             <div className="w-12 h-12 rounded-full bg-green-500/10 group-hover:bg-white/20 flex items-center justify-center">
               <DollarSign size={24} className="text-green-500 group-hover:text-white" />
             </div>
             <span className="font-bold text-foreground group-hover:text-white">Pagamento</span>
           </Card>
           <Card 
             onClick={() => onAction('financial')}
             className="flex flex-col items-center justify-center gap-3 hover:bg-blue-500 hover:text-white cursor-pointer transition-all border-none shadow-lg group bg-card"
           >
             <div className="w-12 h-12 rounded-full bg-blue-500/10 group-hover:bg-white/20 flex items-center justify-center">
               <TrendingUp size={24} className="text-blue-500 group-hover:text-white" />
             </div>
             <span className="font-bold text-foreground group-hover:text-white">Relatórios</span>
           </Card>
           <Card 
             onClick={() => onAction('settings')}
             className="flex flex-col items-center justify-center gap-3 hover:bg-purple-500 hover:text-white cursor-pointer transition-all border-none shadow-lg group bg-card"
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
