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

export interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: ConfirmOptions) => Promise<void>;
}

export const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);
