import { createContext } from 'react';
import { type ConfirmDialogType } from './ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  description: string;
  type?: ConfirmDialogType;
  confirmLabel?: string;
  cancelLabel?: string;
  requireString?: string;
}

export interface ToastOptions {
  title: string;
  description?: string;
  type?: ConfirmDialogType;
  durationMs?: number;
}

export interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: ConfirmOptions) => Promise<void>;
  toast: (options: ToastOptions) => void;
}

export const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);
