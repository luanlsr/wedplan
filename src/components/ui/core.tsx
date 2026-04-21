import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "bg-card rounded-2xl p-6 transition-all duration-300 border border-border/50 shadow-lg",
      onClick && "cursor-pointer active:scale-[0.98]",
      className
    )}
  >
    {children}
  </div>
);

export const Button = ({ 
  children, 
  variant = "primary", 
  onClick, 
  className,
  type = "button",
  disabled = false
}: { 
  children: React.ReactNode; 
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}) => {
  const variants = {
    primary: "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border-2 border-primary/20 bg-transparent hover:bg-primary/5 text-primary",
    ghost: "bg-transparent hover:bg-accent text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/20",
  };

  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      type={type}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border-2 border-transparent bg-secondary/50 px-4 py-2 text-sm transition-all placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:bg-card disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Badge = ({ children, variant = "default", className }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "error" | "outline"; className?: string }) => {
  const styles = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    warning: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    outline: "border border-border bg-transparent text-muted-foreground",
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider", styles[variant], className)}>
      {children}
    </span>
  );
};
