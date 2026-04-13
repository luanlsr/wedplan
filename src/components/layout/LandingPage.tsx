import { ArrowRight, CheckCircle2, LayoutDashboard, Briefcase, DollarSign, TrendingUp, Heart } from "lucide-react";
import { Button } from "../ui";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export const LandingPage = ({ onGetStarted, onLogin }: LandingPageProps) => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5 py-4 px-6 md:px-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black italic">
            WP
          </div>
          <span className="font-black text-xl tracking-tighter uppercase italic">Wed<span className="text-primary not-italic">Plan</span></span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onLogin} className="font-bold hover:text-primary transition-colors">Entrar</Button>
          <Button onClick={onGetStarted} className="bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20">Começar Agora</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 md:px-20 relative">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full -z-10" />
        
        <div className="max-w-4xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
            A revolução no planejamento de casamentos
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] uppercase italic">
            Organize seu grande dia com <span className="text-primary not-italic">precisão absoluta.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
            Do orçamento inicial à quitação do último fornecedor. WedPlan é o seu parceiro digital para um casamento perfeito e sem dívidas.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button onClick={onGetStarted} className="h-16 px-10 rounded-2xl bg-primary text-white font-black text-lg shadow-xl shadow-primary/20 group">
              Criar Planejamento Grátis <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" /> Sem cartão de crédito
            </p>
          </div>
        </div>

        {/* Floating Elements Mockup */}
        <div className="mt-20 max-w-5xl mx-auto rounded-[3rem] border border-white/10 bg-card/50 p-4 shadow-2xl relative animate-in zoom-in duration-1000 delay-300">
           <img 
             src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=2000" 
             alt="Dashboard Preview" 
             className="w-full h-auto rounded-[2.2rem] shadow-inner opacity-80"
           />
           <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent rounded-[2.2rem]" />
        </div>
      </section>

      {/* Features Table */}
      <section className="py-20 px-6 md:px-20 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">Tudo o que você precisa</h2>
            <p className="text-muted-foreground font-medium">Uma suíte completa para gerenciar cada centavo e cada contrato.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: LayoutDashboard, title: "Dashboard Inteligente", desc: "Visão 360º de todos os gastos e status de fornecedores." },
              { icon: Briefcase, title: "Gestão de Fornecedores", desc: "Organize contratos, contatos e serviços em um só lugar." },
              { icon: DollarSign, title: "Fluxo Financeiro", desc: "Controle de parcelas, entradas e quitações automatizado." },
              { icon: TrendingUp, title: "Projeção de Quitação", desc: "Saiba exatamente quanto poupar para chegar ao dia zero de dívidas." }
            ].map((f, i) => (
              <div key={i} className="glass p-8 rounded-[2rem] border border-white/5 hover:border-primary/20 transition-all hover:-translate-y-2 group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                  <f.icon size={28} />
                </div>
                <h3 className="text-xl font-black mb-3 uppercase italic tracking-tight">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Quote */}
      <section className="py-32 px-6 md:px-20 text-center relative overflow-hidden">
        <Heart className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary/5 size-96" />
        <div className="max-w-3xl mx-auto relative z-10">
          <p className="text-2xl md:text-4xl font-black italic tracking-tight leading-tight uppercase">
            "O WedPlan tirou o peso das planilhas das minhas costas. Chegamos no altar com tudo pago e sem estresse."
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
             <div className="w-12 h-12 rounded-full bg-slate-300" />
             <div className="text-left">
                <p className="font-black uppercase italic text-sm">Mariana & Lucas</p>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Recém Casados</p>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 border-t border-white/5 text-center">
         <div className="flex items-center justify-center gap-2 mb-4 opacity-50">
            <span className="font-black tracking-tighter uppercase italic text-sm">WedPlan</span>
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground line-through">Eternal Planner</span>
         </div>
         <p className="text-[10px] text-muted-foreground/50 uppercase font-bold tracking-[0.2em]">© 2026 WedPlan - All Rights Reserved</p>
      </footer>
    </div>
  );
};

// Simple Badge component if not imported
const Badge = ({ children, className }: { children: React.ReactNode, className: string }) => (
  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
    {children}
  </span>
);
