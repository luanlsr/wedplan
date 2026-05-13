import { cn } from '../../lib/utils';
import { Button } from '../ui';
import { ArrowRight, Calculator, Users, Star, Heart, Music, Check, Wallet, ShieldCheck, Sparkles } from "lucide-react";

export const LandingPage = ({ onLogin, onGetStarted }: { onLogin: () => void, onGetStarted: () => void }) => {
  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden flex flex-col">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="w-full px-5 h-20 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 shrink-0">
            <Heart size={18} fill="currentColor" />
          </div>
          <span className="text-lg font-black uppercase tracking-tighter italic">WedPlan</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={onLogin}
            className="font-bold uppercase text-xs tracking-widest hover:text-primary px-3 h-9"
          >
            Entrar
          </Button>
          <Button
            onClick={onGetStarted}
            className="bg-primary text-white font-black uppercase text-[11px] tracking-widest px-4 h-9 rounded-full shadow-lg shadow-primary/20"
          >
            Criar Conta
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-5 flex flex-col items-center text-center">
        {/* Badge */}
        <div className="mt-10 mb-5">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-1.5 uppercase font-black tracking-[0.15em] italic text-[10px]">
            O Futuro do Planejamento de Casamento
          </Badge>
        </div>

        {/* Headline - mobile-first sizing */}
        <h1 className="text-[2.6rem] leading-[0.95] sm:text-6xl md:text-8xl font-black uppercase tracking-tighter italic mb-6 max-w-4xl">
          Organize seu{' '}
          <span className="text-primary underline decoration-primary/30 underline-offset-4">
            Grande Dia
          </span>{' '}
          com precisão matemática.
        </h1>

        <p className="text-base sm:text-xl text-muted-foreground font-medium max-w-xl mx-auto leading-relaxed mb-10 px-1">
          Gerenciamento de fornecedores, controle financeiro, lista de convidados e consultoria de aportes mensais em uma única plataforma premium.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mb-16">
          <Button
            onClick={onGetStarted}
            className="flex-1 h-14 sm:h-16 rounded-[2rem] bg-primary text-white text-base font-black uppercase shadow-2xl shadow-primary/30 group"
          >
            Começar agora <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
          </Button>
          <Button
            variant="outline"
            onClick={onLogin}
            className="flex-1 h-14 sm:h-16 rounded-[2rem] border-2 border-white/10 bg-secondary/20 text-base font-black uppercase hover:bg-white/5"
          >
            Ver Demonstrativo
          </Button>
        </div>

        {/* Feature Icons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full max-w-2xl border-b border-white/5 pb-16">
          {[
            { icon: Calculator, label: "Fluxo de Caixa", desc: "Simulação de aportes" },
            { icon: Users, label: "Convidados", desc: "Controle de RSVP" },
            { icon: Music, label: "Checklist", desc: "Gestão de tarefas" },
            { icon: Star, label: "Fornecedores", desc: "Contratos e parcelas" }
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2.5 group">
              <div className="w-14 h-14 rounded-2xl bg-secondary/50 border border-white/5 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-lg">
                <item.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-black uppercase italic">{item.label}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Section */}
        <div className="py-16 w-full max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight italic mb-3">
              Invista no seu <span className="text-primary">Sonho</span>
            </h2>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">
              Plano único com acesso vitalício durante o planejamento
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Feature Column 1 - Desktop only */}
            <div className="space-y-8 text-right hidden md:block">
              <div className="space-y-2">
                <div className="flex items-center justify-end gap-3 text-primary">
                  <span className="font-black uppercase italic text-sm">Gestão de Convidados</span>
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0"><Users size={20} /></div>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Controle total de RSVP e categorização de convidados.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-end gap-3 text-primary">
                  <span className="font-black uppercase italic text-sm">Controle Financeiro</span>
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0"><Wallet size={20} /></div>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Simulador de aportes e gestão de parcelas de fornecedores.</p>
              </div>
            </div>

            {/* Main Pricing Card */}
            <div className="relative group mx-auto w-full max-w-xs sm:max-w-sm md:max-w-none">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000" />
              <div className="relative p-8 bg-secondary/80 backdrop-blur-xl border border-white/10 rounded-[2rem] flex flex-col items-center text-center space-y-5">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 py-1.5 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-xl whitespace-nowrap">
                  Oferta de Lançamento
                </div>

                <div className="space-y-1 pt-2">
                  <p className="text-sm font-black uppercase tracking-widest text-primary italic">Plano Premium</p>
                  <div className="flex items-baseline justify-center">
                    <span className="text-2xl font-bold">R$</span>
                    <span className="text-6xl sm:text-7xl font-black tracking-tighter">197</span>
                  </div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Pagamento Único</p>
                </div>

                <div className="w-full h-px bg-white/5" />

                <ul className="space-y-3 w-full text-left">
                  {[
                    "Lista de Convidados Ilimitada",
                    "Gestão de Fornecedores & Contratos",
                    "Checklist Inteligente",
                    "Painel Financeiro & MRR",
                    "Acesso para o Casal",
                    "Suporte VIP"
                  ].map((text, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-medium">
                      <div className="p-1 bg-primary/20 rounded-full text-primary shrink-0"><Check size={12} /></div>
                      {text}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={onGetStarted}
                  className="w-full h-14 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/30 group"
                >
                  Garantir minha vaga <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                </Button>

                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  <ShieldCheck size={14} className="text-primary shrink-0" />
                  Compra Segura via Asaas
                </div>
              </div>
            </div>

            {/* Feature Column 2 - Desktop only */}
            <div className="space-y-8 text-left hidden md:block">
              <div className="space-y-2">
                <div className="flex items-center justify-start gap-3 text-primary">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0"><Sparkles size={20} /></div>
                  <span className="font-black uppercase italic text-sm">Checklist Inteligente</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Cronograma completo para não esquecer nenhum detalhe.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-start gap-3 text-primary">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0"><Heart size={20} /></div>
                  <span className="font-black uppercase italic text-sm">Dashboard Unificado</span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Tudo o que você precisa em um só lugar com visual premium.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-16 border-t border-white/5 flex flex-col items-center justify-center gap-1">
        <p className="text-[10px] text-muted-foreground/50 uppercase font-bold tracking-[0.2em]">
          © 2026 WedPlan — All Rights Reserved
        </p>
      </footer>
    </div>
  );
};

const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors", className)}>
    {children}
  </span>
);
