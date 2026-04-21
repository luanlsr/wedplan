import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info, AlertOctagon } from "lucide-react";
import { Button, Card, Input, cn } from "./core";

export type ConfirmDialogType = "info" | "success" | "warning" | "danger";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (inputValue?: string) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: ConfirmDialogType;
  requireString?: string; // For things like "TYPE 'DELETE' TO CONFIRM"
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  type = "info",
  requireString,
}: ConfirmDialogProps) => {
  const [inputValue, setInputValue] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
      setIsClosing(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleConfirm = () => {
    if (requireString && inputValue !== requireString) return;
    onConfirm(inputValue);
    handleClose();
  };

  if (!isOpen && !isClosing) return null;

  const icons = {
    info: <Info className="text-blue-500" size={32} />,
    success: <CheckCircle2 className="text-green-500" size={32} />,
    warning: <AlertTriangle className="text-amber-500" size={32} />,
    danger: <AlertOctagon className="text-red-500" size={32} />,
  };

  const colors = {
    info: "border-blue-500/20 bg-blue-500/5",
    success: "border-green-500/20 bg-green-500/5",
    warning: "border-amber-500/20 bg-amber-500/5",
    danger: "border-red-500/20 bg-red-500/5",
  };

  const btnVariants = {
    info: "primary" as const,
    success: "primary" as const,
    warning: "primary" as const,
    danger: "destructive" as const,
  };

  return (
    <div className={cn(
      "fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300",
      isClosing ? "opacity-0" : "opacity-100"
    )}>
      <Card className={cn(
        "w-full max-w-md bg-card p-0 overflow-hidden shadow-2xl border-none transition-all duration-300 transform",
        isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
      )}>
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className={cn("p-4 rounded-full border-2", colors[type])}>
              {icons[type]}
            </div>
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-2xl font-black text-foreground">{title}</h3>
            <p className="text-muted-foreground font-medium leading-relaxed">
              {description}
            </p>
          </div>

          {requireString && (
            <div className="mt-8 space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase text-center block">
                Digite <span className="text-foreground">"{requireString}"</span> para confirmar
              </label>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={requireString}
                className="text-center font-bold tracking-widest h-14"
                autoFocus
              />
            </div>
          )}

          <div className="flex gap-4 mt-10">
            {cancelLabel && (
              <Button 
                variant="outline" 
                className="flex-1 h-12 font-bold" 
                onClick={handleClose}
              >
                {cancelLabel}
              </Button>
            )}
            <Button 
              variant={btnVariants[type]} 
              className="flex-1 h-12 font-bold shadow-lg"
              onClick={handleConfirm}
              disabled={requireString ? inputValue !== requireString : false}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
