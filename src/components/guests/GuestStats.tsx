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
    convitesEnviados: number;
  };
}

export const GuestStats = ({ totals }: GuestStatsProps) => {
  return (
    <div className="flex overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 no-scrollbar scroll-smooth snap-x">
      <div className="min-w-[120px] sm:min-w-0 snap-start">
        <Card className="p-3 bg-primary/10 border-none flex flex-col justify-between h-20 sm:h-auto">
          <p className="text-[9px] font-black text-primary uppercase tracking-widest">Total</p>
          <div>
            <p className="text-lg sm:text-2xl font-black leading-none">{totals.adultos + totals.criancas}</p>
            <p className="text-[8px] text-muted-foreground uppercase font-black tracking-tighter mt-1">{totals.total} Grp</p>
          </div>
        </Card>
      </div>
      <div className="min-w-[120px] sm:min-w-0 snap-start">
        <Card className="p-3 bg-emerald-500/10 border-none flex flex-col justify-between h-20 sm:h-auto">
          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Confirm.</p>
          <p className="text-lg sm:text-2xl font-black leading-none">{totals.confirmados}</p>
        </Card>
      </div>
      <div className="min-w-[120px] sm:min-w-0 snap-start">
        <Card className="p-3 bg-amber-500/10 border-none flex flex-col justify-between h-20 sm:h-auto">
          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Pendente</p>
          <p className="text-lg sm:text-2xl font-black leading-none">{totals.pendentes}</p>
        </Card>
      </div>
      <div className="min-w-[120px] sm:min-w-0 snap-start">
        <Card className="p-3 bg-secondary/30 border-none flex flex-col justify-between h-20 sm:h-auto">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">A / C</p>
          <div className="flex items-baseline gap-1">
            <p className="text-lg sm:text-2xl font-black leading-none">{totals.adultos}</p>
            <span className="text-[10px] font-bold text-muted-foreground">/</span>
            <p className="text-sm font-bold text-muted-foreground">{totals.criancas}</p>
          </div>
        </Card>
      </div>
      <div className="min-w-[120px] sm:min-w-0 snap-start">
        <Card className="p-3 bg-pink-500/10 border-none flex flex-col justify-between h-20 sm:h-auto">
          <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest">Noiva</p>
          <p className="text-lg sm:text-2xl font-black leading-none">{totals.noiva}</p>
        </Card>
      </div>
      <div className="min-w-[120px] sm:min-w-0 snap-start">
        <Card className="p-3 bg-blue-500/10 border-none flex flex-col justify-between h-20 sm:h-auto">
          <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Noivo</p>
          <p className="text-lg sm:text-2xl font-black leading-none">{totals.noivo}</p>
        </Card>
      </div>
      <div className="min-w-[120px] sm:min-w-0 snap-start">
        <Card className="p-3 bg-purple-500/10 border-none flex flex-col justify-between h-20 sm:h-auto">
          <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">Enviados</p>
          <p className="text-lg sm:text-2xl font-black leading-none">{totals.convitesEnviados}</p>
        </Card>
      </div>
    </div>
  );
};
