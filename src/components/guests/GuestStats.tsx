import { Card } from '../ui';

interface GuestStatsProps {
  totals: {
    total: number;
    confirmados: number;
    pendentes: number;
    convidados: number;
    adultos: number;
    criancas: number;
    noiva: number;
    noivo: number;
    staff: number;
    meia: number;
  };
}

export const GuestStats = ({ totals }: GuestStatsProps) => {
  return (
    <div className="flex items-stretch overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4 no-scrollbar scroll-smooth snap-x">
      <div className="min-w-[120px] sm:min-w-0 snap-start h-full">
        <Card className="p-3 bg-primary/10 border-primary/20 flex h-full min-h-20 flex-col justify-between">
          <p className="text-[10px] font-extrabold text-primary uppercase tracking-wide">Total</p>
          <div>
            <p className="text-lg sm:text-xl font-extrabold leading-none">{totals.adultos + totals.criancas}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide mt-1">{totals.total} Grp</p>
          </div>
        </Card>
      </div>
      <div className="min-w-[120px] sm:min-w-0 snap-start h-full">
        <Card className="p-3 bg-emerald-500/10 border-emerald-500/20 flex h-full min-h-20 flex-col justify-between">
          <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wide">Confirm.</p>
          <p className="text-lg sm:text-xl font-extrabold leading-none">{totals.confirmados}</p>
        </Card>
      </div>
      <div className="min-w-[120px] sm:min-w-0 snap-start h-full">
        <Card className="p-3 bg-amber-500/10 border-amber-500/20 flex h-full min-h-20 flex-col justify-between">
          <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wide">Pendente</p>
          <p className="text-lg sm:text-xl font-extrabold leading-none">{totals.pendentes}</p>
        </Card>
      </div>
      <div className="min-w-[120px] sm:min-w-0 snap-start h-full">
        <Card className="p-3 bg-secondary/40 border-border flex h-full min-h-20 flex-col justify-between">
          <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wide">Convidados</p>
          <div>
            <p className="text-lg sm:text-xl font-extrabold leading-none">{totals.convidados}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wide mt-1">sem staff</p>
          </div>
        </Card>
      </div>
      <div className="min-w-[120px] sm:min-w-0 snap-start h-full">
        <Card className="p-3 bg-pink-500/10 border-pink-500/20 flex h-full min-h-20 flex-col justify-between">
          <p className="text-[10px] font-extrabold text-pink-500 uppercase tracking-wide">Noiva</p>
          <p className="text-lg sm:text-xl font-extrabold leading-none">{totals.noiva}</p>
        </Card>
      </div>
      <div className="min-w-[120px] sm:min-w-0 snap-start h-full">
        <Card className="p-3 bg-blue-500/10 border-blue-500/20 flex h-full min-h-20 flex-col justify-between">
          <p className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wide">Noivo</p>
          <p className="text-lg sm:text-xl font-extrabold leading-none">{totals.noivo}</p>
        </Card>
      </div>
      <div className="min-w-[120px] sm:min-w-0 snap-start h-full">
        <Card className="p-3 bg-slate-500/10 border-slate-500/20 flex h-full min-h-20 flex-col justify-between">
          <p className="text-[10px] font-extrabold text-slate-500 dark:text-slate-300 uppercase tracking-wide">Meia</p>
          <div>
            <p className="text-lg sm:text-xl font-extrabold leading-none">{totals.meia}</p>
            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wide mt-1">
              {totals.staff} staff + {totals.criancas} cri.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
