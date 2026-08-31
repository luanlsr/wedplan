import { useEffect, useMemo, useState } from "react";
import { CalendarHeart, Clock3 } from "lucide-react";
import { cn } from "../../lib/utils";

interface WeddingCountdownProps {
  weddingDate?: string;
  compact?: boolean;
}

const parseWeddingDate = (weddingDate?: string) => {
  if (!weddingDate) return null;
  const date = new Date(`${weddingDate}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTimeRemaining = (targetDate: Date | null, now: Date) => {
  if (!targetDate) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const total = Math.max(0, targetDate.getTime() - now.getTime());
  const secondsTotal = Math.floor(total / 1000);

  return {
    total,
    days: Math.floor(secondsTotal / 86400),
    hours: Math.floor((secondsTotal % 86400) / 3600),
    minutes: Math.floor((secondsTotal % 3600) / 60),
    seconds: secondsTotal % 60,
  };
};

const formatDate = (weddingDate?: string) => {
  const date = parseWeddingDate(weddingDate);
  if (!date) return "Data do casamento não definida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

export const WeddingCountdown = ({ weddingDate, compact = false }: WeddingCountdownProps) => {
  const [now, setNow] = useState(() => new Date());
  const targetDate = useMemo(() => parseWeddingDate(weddingDate), [weddingDate]);
  const remaining = getTimeRemaining(targetDate, now);
  const units = [
    { label: "Dias", value: remaining.days },
    { label: "Horas", value: remaining.hours },
    { label: "Min", value: remaining.minutes },
    { label: "Seg", value: remaining.seconds },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className={cn(
      "overflow-hidden rounded-xl border border-primary/20 bg-card shadow-sm",
      compact ? "p-4" : "p-4 sm:p-5"
    )}>
      <div className={cn(
        "flex flex-col gap-4",
        compact ? "lg:flex-row lg:items-center lg:justify-between" : "md:flex-row md:items-center md:justify-between"
      )}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {remaining.total === 0 && targetDate ? <CalendarHeart size={22} /> : <Clock3 size={22} />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-primary">Contagem regressiva</p>
            <h2 className={cn("truncate font-extrabold text-foreground", compact ? "text-lg" : "text-xl sm:text-2xl")}>
              {targetDate && remaining.total === 0 ? "Chegou o grande dia" : formatDate(weddingDate)}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {units.map((unit) => (
            <div key={unit.label} className="min-w-0 rounded-xl border border-border bg-secondary/30 px-2 py-3 text-center">
              <span className="block text-lg font-extrabold leading-none text-foreground sm:text-2xl">
                {String(unit.value).padStart(2, "0")}
              </span>
              <span className="mt-1 block text-[9px] font-extrabold uppercase tracking-wide text-muted-foreground">
                {unit.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
