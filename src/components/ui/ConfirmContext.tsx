import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { ConfirmDialog, type ConfirmDialogType } from './ConfirmDialog';

interface ConfirmOptions {
  title: string;
  description: string;
  type?: ConfirmDialogType;
  confirmLabel?: string;
  cancelLabel?: string;
  requireString?: string;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: ConfirmOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  // We use a ref to track if the current dialog has already been resolved 
  // to avoid double resolution between handleConfirm and handleClose
  const isResolvedRef = useRef(false);

  const confirm = useCallback((options: ConfirmOptions) => {
    isResolvedRef.current = false;
    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: ConfirmOptions) => {
    isResolvedRef.current = false;
    return new Promise<void>((resolve) => {
      setDialogState({
        isOpen: true,
        options: { ...options, cancelLabel: "" }, // No cancel button for alert
        resolve: (_value: boolean) => resolve(),
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
    if (dialogState && !isResolvedRef.current) {
      if (dialogState.options.requireString && inputValue !== dialogState.options.requireString) {
        return;
      }
      isResolvedRef.current = true;
      dialogState.resolve(true);
      // We don't setDialogState(null) here to allow ConfirmDialog to 
      // handle its own closing animation, which will eventually call handleClose
    }
  }, [dialogState]);

  return (
    <ConfirmContext.Provider value={{ confirm, alert }}>
      {children}
      {dialogState && (
        <ConfirmDialog
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

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

