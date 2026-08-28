import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ClipboardList, Heart, LayoutDashboard, Wallet, X } from 'lucide-react';
import { Button } from '../ui';

const steps = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Acompanhe orçamento, pagamentos, vencimentos e distribuição de verba em um só lugar.',
  },
  {
    icon: Heart,
    title: 'Convidados',
    description: 'Cadastre famílias, crianças, staff, status de confirmação e use o check-in no dia do evento.',
  },
  {
    icon: Wallet,
    title: 'Fornecedores e financeiro',
    description: 'Registre contratos, parcelas, vencimentos e marque pagamentos sem recarregar a página.',
  },
  {
    icon: ClipboardList,
    title: 'Tarefas essenciais',
    description: 'Crie o checklist do casamento e acompanhe o que falta antes da data.',
  },
];

export const GuidedTour = ({
  enabled,
  completedAt,
  onComplete,
}: {
  enabled: boolean;
  completedAt?: string | null;
  onComplete?: () => Promise<void> | void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (enabled && !completedAt) {
      const timer = window.setTimeout(() => setIsOpen(true), 700);
      return () => window.clearTimeout(timer);
    }
    setIsOpen(false);
  }, [completedAt, enabled]);

  if (!isOpen) return null;

  const step = steps[stepIndex];
  const StepIcon = step.icon;
  const isLastStep = stepIndex === steps.length - 1;

  const closeTour = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onComplete?.();
      setIsOpen(false);
    } catch {
      setIsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-background/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <StepIcon size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Tour inicial {stepIndex + 1}/{steps.length}
              </p>
              <h3 className="text-xl font-extrabold text-foreground">{step.title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={closeTour}
            disabled={saving}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Fechar tour"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm font-medium leading-6 text-muted-foreground">{step.description}</p>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex gap-1.5">
            {steps.map((item, index) => (
              <span
                key={item.title}
                className={`h-1.5 rounded-full transition-all ${index <= stepIndex ? 'w-8 bg-primary' : 'w-4 bg-secondary'}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={closeTour} className="h-10 rounded-xl" disabled={saving}>
              Pular
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (isLastStep) closeTour();
                else setStepIndex((current) => current + 1);
              }}
              disabled={saving}
              className="h-10 rounded-xl gap-2 font-extrabold"
            >
              {isLastStep ? (
                <>
                  Concluir <CheckCircle2 size={16} />
                </>
              ) : (
                <>
                  Próximo <ArrowRight size={16} />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
