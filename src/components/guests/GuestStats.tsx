import { Card } from '../ui';

interface GuestStatsProps {
  totals: {
    total: number;
    confirmados: number;
    pendentes: number;
    adultos: number;
    criancas: number;
    noiva: number;
    noivo: number;
  };
}

export const GuestStats = ({ totals }: GuestStatsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      <Card className="p-3 sm:p-4 bg-primary/10 border-none flex flex-col justify-between h-20 sm:h-auto transition-all">
        <p className="text-[8px] sm:text-xs font-black text-primary uppercase tracking-widest">Total</p>
        <div>
          <p className="text-base sm:text-2xl font-black leading-none">{totals.adultos + totals.criancas}</p>
          <p className="text-[7px] sm:text-[10px] text-muted-foreground uppercase font-black tracking-tighter mt-1">{totals.total} Grp</p>
        </div>
      </Card>
      <Card className="p-3 sm:p-4 bg-green-500/10 border-none flex flex-col justify-between h-20 sm:h-auto transition-all">
        <p className="text-[8px] sm:text-xs font-black text-green-600 uppercase tracking-widest">Confirma.</p>
        <p className="text-base sm:text-2xl font-black leading-none">{totals.confirmados}</p>
      </Card>
      <Card className="p-3 sm:p-4 bg-amber-500/10 border-none flex flex-col justify-between h-20 sm:h-auto transition-all">
        <p className="text-[8px] sm:text-xs font-black text-amber-600 uppercase tracking-widest">Pendente</p>
        <p className="text-base sm:text-2xl font-black leading-none">{totals.pendentes}</p>
      </Card>
      <Card className="p-3 sm:p-4 bg-secondary/30 border-none flex flex-col justify-between h-20 sm:h-auto transition-all">
        <p className="text-[8px] sm:text-xs font-black text-muted-foreground uppercase tracking-widest">Adul/Cria</p>
        <div className="flex items-baseline gap-1">
          <p className="text-base sm:text-2xl font-black leading-none">{totals.adultos}</p>
          <span className="text-[8px] font-bold text-muted-foreground">/</span>
          <p className="text-xs sm:text-sm font-bold text-muted-foreground">{totals.criancas}</p>
        </div>
      </Card>
      <Card className="p-3 sm:p-4 bg-pink-500/10 border-none flex flex-col justify-between h-20 sm:h-auto transition-all">
        <p className="text-[8px] sm:text-xs font-black text-pink-500 uppercase tracking-widest">Noiva</p>
        <p className="text-base sm:text-2xl font-black leading-none">{totals.noiva}</p>
      </Card>
      <Card className="p-3 sm:p-4 bg-blue-500/10 border-none flex flex-col justify-between h-20 sm:h-auto transition-all">
        <p className="text-[8px] sm:text-xs font-black text-blue-500 uppercase tracking-widest">Noivo</p>
        <p className="text-base sm:text-2xl font-black leading-none">{totals.noivo}</p>
      </Card>
    </div>
  );
};
