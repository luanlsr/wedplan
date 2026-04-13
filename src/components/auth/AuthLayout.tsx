import { Heart } from "lucide-react";

export const AuthLayout = ({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-[450px] relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary to-blue-400 p-0.5 shadow-2xl shadow-primary/20 mb-6 scale-110 hover:rotate-3 transition-transform duration-500">
            <div className="w-full h-full rounded-[1.4rem] bg-white dark:bg-card flex items-center justify-center text-primary font-black italic text-3xl shadow-inner">
              WP
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground uppercase italic mb-2">
            Wed<span className="text-primary not-italic">Plan</span>
          </h1>
          <p className="text-muted-foreground font-medium text-center px-4 tracking-tight">
            Wedding Management Suite
          </p>
        </div>

        <div className="glass border border-white/10 p-10 rounded-[2.5rem] shadow-2xl shadow-black/20">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-foreground mb-1">{title}</h2>
            <p className="text-muted-foreground font-medium text-sm">{subtitle}</p>
          </div>
          
          {children}
        </div>

        <div className="mt-10 text-center flex items-center justify-center gap-2 text-muted-foreground/40 font-bold uppercase text-[10px] tracking-[0.2em]">
          <Heart size={14} className="fill-current" />
          Powered by Love & Tech
          <Heart size={14} className="fill-current" />
        </div>
      </div>
    </div>
  );
};
