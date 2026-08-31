import { BrandLogo } from './BrandLogo';
import { cn } from '../../lib/utils';

type LoadingScreenProps = {
  label?: string;
  fullScreen?: boolean;
  className?: string;
};

export const LoadingScreen = ({
  label = 'Carregando WedPlan',
  fullScreen = true,
  className,
}: LoadingScreenProps) => {
  return (
    <div
      className={cn(
        'flex items-center justify-center bg-background text-foreground',
        fullScreen ? 'min-h-screen' : 'min-h-[320px]',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="relative flex flex-col items-center gap-6 px-6 text-center">
        <div className="absolute h-32 w-32 animate-ping rounded-full border border-primary/20" />
        <div className="absolute h-44 w-44 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <div className="absolute inset-[-14px] animate-spin rounded-[2rem] border-2 border-primary/20 border-t-primary" />
          <div className="relative rounded-[1.75rem] border border-primary/20 bg-card/90 p-4 shadow-2xl shadow-primary/10 backdrop-blur">
            <BrandLogo variant="mark" size="lg" />
          </div>
        </div>

        <div className="relative space-y-2">
          <BrandLogo size="md" />
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">
            {label}
          </p>
          <div className="mx-auto grid w-32 grid-cols-3 gap-1.5 pt-1">
            <span className="h-1.5 animate-pulse rounded-full bg-primary" />
            <span className="h-1.5 animate-pulse rounded-full bg-primary/70 [animation-delay:150ms]" />
            <span className="h-1.5 animate-pulse rounded-full bg-primary/40 [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
};
