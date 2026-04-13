import { cn } from '../../lib/utils';

import { Button } from '../ui';
import { ArrowRight, Calculator, Users, Star, Heart, Music } from "lucide-react";

export const LandingPage = ({ onLogin, onGetStarted }: { onLogin: () => void, onGetStarted: () => void }) => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="container mx-auto px-6 h-24 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <Heart size={20} fill="currentColor" />
          </div>
          <span className="text-xl font-black uppercase tracking-tighter italic">WedPlan</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onLogin} className="font-bold uppercase text-xs tracking-widest hover:text-primary">Entrar</Button>
          <Button onClick={onGetStarted} className="bg-primary text-white font-black uppercase text-xs tracking-widest px-8 rounded-full shadow-xl shadow-primary/20">Criar Conta</Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 container mx-auto px-6 flex flex-col items-center justify-center text-center space-y-12 py-20">
        <div className="space-y-4 max-w-4xl">
           <Badge className="bg-primary/10 text-primary border-primary/20 mb-4 px-4 py-1 uppercase font-black tracking-[0.2em] italic">O Futuro do Planejamento de Casamento</Badge>
           <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic leading-[0.9]">
             Organize seu <span className="text-primary underline decoration-primary/20 underline-offset-8">Grande Dia</span> com precisão matemática.
           </h1>
           <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
             Gerenciamento de fornecedores, controle financeiro, lista de convidados e consultoria de aportes mensais em uma única plataforma premium.
           </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 w-full max-w-xl">
           <Button onClick={onGetStarted} className="flex-1 h-20 rounded-[2.5rem] bg-primary text-white text-xl font-black uppercase shadow-2xl shadow-primary/30 group">
             Começar agora <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
           </Button>
           <Button variant="outline" onClick={onLogin} className="flex-1 h-20 rounded-[2.5rem] border-2 border-white/10 bg-secondary/20 text-xl font-black uppercase hover:bg-white/5">
             Ver Demonstrativo
           </Button>
        </div>

        {/* Floating Icons Decors */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-5xl pt-10">
           {[
             { icon: Calculator, label: "Fluxo de Caixa", desc: "Simulação de aportes" },
             { icon: Users, label: "Convidados", desc: "Controle de RSVP" },
             { icon: Music, label: "Checklist", desc: "Gestão de tarefas" },
             { icon: Star, label: "Fornecedores", desc: "Contratos e parcelas" }
           ].map((item, idx) => (
             <div key={idx} className="flex flex-col items-center gap-3 group">
                <div className="w-16 h-16 rounded-3xl bg-secondary/50 border border-white/5 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-lg">
                   <item.icon size={28} />
                </div>
                <div>
                   <p className="text-sm font-black uppercase italic">{item.label}</p>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">{item.desc}</p>
                </div>
             </div>
           ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="h-20 border-t border-white/5 flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground line-through">Eternal Planner</span>
          </div>
          <p className="text-[10px] text-muted-foreground/50 uppercase font-bold tracking-[0.2em]">© 2026 WedPlan - All Rights Reserved</p>
      </footer>
    </div>
  );
};

// Simple Badge component
const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
    {children}
  </span>
);
