import { cn } from "../../lib/utils";

type BrandLogoProps = {
  variant?: "horizontal" | "mark" | "stacked";
  size?: "sm" | "md" | "lg";
  className?: string;
  showTagline?: boolean;
};

const sizeMap = {
  sm: {
    mark: "h-8 w-8",
    text: "text-lg",
    gap: "gap-2",
    tagline: "text-[9px]",
  },
  md: {
    mark: "h-10 w-10",
    text: "text-2xl",
    gap: "gap-2.5",
    tagline: "text-[10px]",
  },
  lg: {
    mark: "h-16 w-16",
    text: "text-4xl",
    gap: "gap-3",
    tagline: "text-[11px]",
  },
};

export const BrandLogo = ({
  variant = "horizontal",
  size = "md",
  className,
  showTagline = false,
}: BrandLogoProps) => {
  const sizing = sizeMap[size];
  const isMarkOnly = variant === "mark";

  return (
    <div
      className={cn(
        "inline-flex min-w-0 items-center",
        variant === "stacked" ? "flex-col text-center" : sizing.gap,
        className
      )}
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-card/80 shadow-sm shadow-primary/10 backdrop-blur",
          sizing.mark,
          variant === "stacked" && "mb-3"
        )}
      >
        <img src="/image/favicon.png" alt="" className="h-[78%] w-[78%] object-contain" />
      </span>

      {!isMarkOnly && (
        <span className="min-w-0">
          <span
            className={cn(
              "block truncate font-extrabold leading-none tracking-normal text-foreground [font-family:'Outfit',sans-serif]",
              sizing.text
            )}
          >
            Wed<span className="text-primary">Plan</span>
          </span>
          {showTagline && (
            <span
            className={cn(
                "mt-1 block font-black uppercase tracking-[0.18em] text-muted-foreground",
                sizing.tagline
              )}
            >
              Wedding Management
            </span>
          )}
        </span>
      )}
    </div>
  );
};
