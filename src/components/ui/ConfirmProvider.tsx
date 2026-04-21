import { useState, useCallback, useRef, type ReactNode } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { ConfirmContext, type ConfirmOptions } from './ConfirmContext';

interface DialogState {
  isOpen: boolean;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [dialogState, setDialogState] = useState<DialogState | null>(null);
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
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
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
