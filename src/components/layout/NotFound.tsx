import { useNavigate } from 'react-router-dom';
import { Button } from '../ui';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="text-center relative z-10 max-w-lg animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center mb-10">
          <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-tr from-primary to-blue-400 p-0.5 shadow-2xl shadow-primary/20 mb-8 transform hover:rotate-6 transition-transform duration-500">
            <div className="w-full h-full rounded-[2.4rem] bg-white dark:bg-card flex items-center justify-center">
              <span className="text-primary font-black text-5xl">404</span>
            </div>
          </div>
          
          <h1 className="text-5xl font-black tracking-tighter text-foreground uppercase italic mb-4">
            Caminho <span className="text-primary not-italic">Perdido</span>
          </h1>
          
          <p className="text-muted-foreground font-medium text-lg px-6 tracking-tight mb-8">
            Parece que essa página não foi convidada para o casamento. 
            Não se preocupe, vamos te levar de volta ao altar do planejamento.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full px-10">
            <Button 
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex-1 h-14 rounded-2xl border-primary/20 hover:bg-primary/5 text-primary font-bold uppercase tracking-widest text-xs"
            >
              <ArrowLeft size={18} className="mr-2" /> Voltar
            </Button>
            
            <Button 
              onClick={() => navigate('/')}
              className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
            >
              <Home size={18} className="mr-2" /> Início
            </Button>
          </div>
        </div>

        <div className="mt-20 opacity-20 flex flex-col items-center gap-4">
             <div className="h-0.5 w-12 bg-primary/50 rounded-full" />
             <p className="font-black uppercase text-[10px] tracking-[0.3em]">WedPlan Suite</p>
        </div>
      </div>
    </div>
  );
};
