import { Heart } from "lucide-react";
import { cn } from "../../lib/utils";
import { BrandLogo } from "../layout/BrandLogo";

export const AuthLayout = ({
  children,
  title,
  subtitle,
  className,
  contentClassName,
  hideBrand = false,
  hideFooter = false,
  showHeading = true,
  compact = false,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  className?: string;
  contentClassName?: string;
  hideBrand?: boolean;
  hideFooter?: boolean;
  showHeading?: boolean;
  compact?: boolean;
}) => {
  return (
    <div className={cn(
      "min-h-screen w-full flex items-center justify-center bg-background p-4 relative overflow-hidden",
      compact && "items-stretch p-2 sm:p-3 lg:p-4"
    )}>
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <div className={cn("w-full max-w-[450px] relative z-10 animate-in fade-in zoom-in duration-700", className)}>
        {!hideBrand && (
          <div className="flex flex-col items-center mb-10">
            <BrandLogo variant="stacked" size="lg" showTagline />
            <p className="text-muted-foreground font-medium text-center px-4 tracking-tight">
              Planejamento de casamento em um só lugar
            </p>
          </div>
        )}

        <div className={cn(
          "glass border border-white/10 p-10 rounded-[2.5rem] shadow-2xl shadow-black/20",
          compact && "p-3 rounded-3xl sm:p-4 lg:p-4",
          contentClassName
        )}>
          {showHeading && (
            <div className="mb-8">
              <h2 className="text-2xl font-black text-foreground mb-1">{title}</h2>
              <p className="text-muted-foreground font-medium text-sm">{subtitle}</p>
            </div>
          )}
          
          {children}
        </div>

        {!hideFooter && (
          <div className="mt-10 text-center flex items-center justify-center gap-2 text-muted-foreground/40 font-bold uppercase text-[10px] tracking-[0.2em]">
            <Heart size={14} className="fill-current" />
            Powered by Love & Tech
            <Heart size={14} className="fill-current" />
          </div>
        )}
      </div>
    </div>
  );
};
