import { useState, useCallback, useRef, type ReactNode } from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { ConfirmContext, type ConfirmOptions, type ToastOptions } from './ConfirmContext';
import { cn } from './core';

interface DialogState {
  isOpen: boolean;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

type ToastState = Required<Pick<ToastOptions, 'title' | 'type' | 'durationMs'>> & {
  id: string;
  description?: string;
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const isResolvedRef = useRef(false);

  const confirm = useCallback((options: ConfirmOptions) => {
    isResolvedRef.current = false;
    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        options,
        resolve: (value: boolean) => resolve(value),
      });
    });
  }, []);

  const alert = useCallback((options: ConfirmOptions) => {
    isResolvedRef.current = false;
    return new Promise<void>((resolve) => {
      setDialogState({
        isOpen: true,
        options: { ...options, cancelLabel: "" }, // No cancel button for alert
        resolve: () => resolve(),
      });
    });
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const nextToast: ToastState = {
      id,
      title: options.title,
      description: options.description,
      type: options.type || 'success',
      durationMs: options.durationMs || 4200,
    };

    setToasts((current) => [nextToast, ...current].slice(0, 4));
    window.setTimeout(() => removeToast(id), nextToast.durationMs);
  }, [removeToast]);

  const handleClose = useCallback(() => {
    if (dialogState && !isResolvedRef.current) {
      isResolvedRef.current = true;
      dialogState.resolve(false);
    }
    setDialogState(null);
  }, [dialogState]);

  const handleConfirm = useCallback((inputValue?: string) => {
    if (dialogState) {
      // If requireString is provided, check if input matches
      if (dialogState.options.requireString) {
        if (inputValue !== dialogState.options.requireString) {
          // Do not close, could show an error if we had that state
          return;
        }
      }
      isResolvedRef.current = true;
      dialogState.resolve(true);
      setDialogState(null);
    }
  }, [dialogState]);

  return (
    <ConfirmContext.Provider value={{ confirm, alert, toast }}>
      {children}
      <ToastViewport toasts={toasts} onRemove={removeToast} />
      {dialogState && (
        <ConfirmDialog
          key={dialogState ? 'open' : 'closed'}
          isOpen={dialogState.isOpen}
          title={dialogState.options.title}
          description={dialogState.options.description}
          type={dialogState.options.type || "info"}
          confirmLabel={dialogState.options.confirmLabel}
          cancelLabel={dialogState.options.cancelLabel}
          requireString={dialogState.options.requireString}
          onClose={handleClose}
          onConfirm={handleConfirm}
        />
      )}
    </ConfirmContext.Provider>
  );
};

const toastIcons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertOctagon,
};

const toastStyles = {
  info: 'border-blue-500/20 bg-blue-500/10 text-blue-500',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
  warning: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
  danger: 'border-red-500/20 bg-red-500/10 text-red-500',
};

const ToastViewport = ({ toasts, onRemove }: { toasts: ToastState[]; onRemove: (id: string) => void }) => (
  <div className="pointer-events-none fixed right-4 top-4 z-[220] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
    {toasts.map((toast) => {
      const Icon = toastIcons[toast.type];

      return (
        <div
          key={toast.id}
          className="pointer-events-auto grid grid-cols-[auto_1fr_auto] gap-3 rounded-2xl border border-border bg-card p-4 shadow-2xl shadow-black/15 backdrop-blur-xl animate-in slide-in-from-right-4 fade-in duration-300"
          role="status"
        >
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', toastStyles[toast.type])}>
            <Icon size={20} />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-black leading-tight text-foreground">{toast.title}</p>
            {toast.description && (
              <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">{toast.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRemove(toast.id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Fechar notificação"
          >
            <X size={15} />
          </button>
        </div>
      );
    })}
  </div>
);
