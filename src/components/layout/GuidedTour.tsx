import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calculator,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Globe2,
  Heart,
  LayoutDashboard,
  Settings,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';
import { Button } from '../ui';

type TourStep = {
  id: string;
  path: string;
  icon: React.ElementType;
  title: string;
  eyebrow: string;
  description: string;
};

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

const steps: TourStep[] = [
  {
    id: 'dashboard',
    path: '/',
    icon: LayoutDashboard,
    eyebrow: 'Visão geral',
    title: 'Dashboard',
    description: 'Aqui você acompanha o resumo do casamento, orçamento, pagamentos, vencimentos e próximos passos.',
  },
  {
    id: 'suppliers',
    path: '/fornecedores',
    icon: Briefcase,
    eyebrow: 'Contratos',
    title: 'Fornecedores',
    description: 'Cadastre fornecedores, contratos, contatos, parcelas e observações para centralizar tudo em um só lugar.',
  },
  {
    id: 'guests',
    path: '/convidados',
    icon: Heart,
    eyebrow: 'Lista e presença',
    title: 'Convidados',
    description: 'Organize famílias, confirmações, crianças, acompanhantes, envio de convite e presença no evento.',
  },
  {
    id: 'tasks',
    path: '/tarefas',
    icon: ClipboardList,
    eyebrow: 'Checklist',
    title: 'Tarefas',
    description: 'Acompanhe tudo que precisa ser resolvido até a data do casamento, com status e prioridades.',
  },
  {
    id: 'timeline',
    path: '/cronograma',
    icon: CalendarClock,
    eyebrow: 'Agenda do casamento',
    title: 'Cronograma',
    description: 'Monte a linha do tempo do evento e distribua cada atividade do dia com mais controle.',
  },
  {
    id: 'financial',
    path: '/financeiro',
    icon: DollarSign,
    eyebrow: 'Controle financeiro',
    title: 'Financeiro',
    description: 'Veja totais contratados, pagos, pendentes e vencimentos para evitar surpresas no orçamento.',
  },
  {
    id: 'planning',
    path: '/planejamento',
    icon: TrendingUp,
    eyebrow: 'Simulação',
    title: 'Planejamento',
    description: 'Use comparativos e simulações para decidir onde ajustar gastos, serviços e prioridades.',
  },
  {
    id: 'tools',
    path: '/ferramentas',
    icon: Calculator,
    eyebrow: 'Recursos extras',
    title: 'Ferramentas',
    description: 'Acesse calculadoras e utilitários para estimar bebidas, doces, buffet, RSVP e outros pontos do evento.',
  },
  {
    id: 'wedding-site',
    path: '/site',
    icon: Globe2,
    eyebrow: 'Página pública',
    title: 'Site do Casal',
    description: 'Personalize o site dos noivos, lista de presentes, informações do evento e links públicos.',
  },
  {
    id: 'checkin',
    path: '/checkin',
    icon: UserCheck,
    eyebrow: 'Dia do evento',
    title: 'Check-in',
    description: 'No grande dia, use esta área para marcar presença dos convidados de forma rápida.',
  },
  {
    id: 'settings',
    path: '/configuracoes',
    icon: Settings,
    eyebrow: 'Preferências',
    title: 'Configurações',
    description: 'Atualize dados do casal, equipe, conta, suporte, senha e opções avançadas do sistema.',
  },
];

const getTargetRect = (id: string): TargetRect | null => {
  const element = document.querySelector<HTMLElement>(`[data-tour-id="${id}"]`);
  if (!element) return null;

  element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  const rect = element.getBoundingClientRect();

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  };
};

const getSpotlight = (targetRect: TargetRect | null, padding = 8) => {
  if (!targetRect) return null;

  const top = Math.max(targetRect.top - padding, 8);
  const left = Math.max(targetRect.left - padding, 8);
  const right = Math.min(targetRect.right + padding, window.innerWidth - 8);
  const bottom = Math.min(targetRect.bottom + padding, window.innerHeight - 8);

  return {
    top,
    left,
    width: Math.max(right - left, 0),
    height: Math.max(bottom - top, 0),
    right,
    bottom,
  };
};

export const GuidedTour = ({
  enabled,
  completedAt,
  onComplete,
}: {
  enabled: boolean;
  completedAt?: string | null;
  onComplete?: () => Promise<void> | void;
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [saving, setSaving] = useState(false);

  const step = steps[stepIndex];
  const StepIcon = step.icon;
  const isLastStep = stepIndex === steps.length - 1;
  const spotlight = useMemo(() => getSpotlight(targetRect), [targetRect]);

  useEffect(() => {
    if (enabled && !completedAt) {
      const timer = window.setTimeout(() => {
        setStepIndex(0);
        setIsOpen(true);
      }, 700);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(false);
  }, [completedAt, enabled]);

  useEffect(() => {
    if (!isOpen) return;
    if (location.pathname !== step.path) {
      navigate(step.path);
    }
  }, [isOpen, location.pathname, navigate, step.path]);

  useEffect(() => {
    if (!isOpen) return;

    let frame = 0;
    const updateTarget = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setTargetRect(getTargetRect(step.id));
      });
    };

    const timer = window.setTimeout(updateTarget, 220);
    window.addEventListener('resize', updateTarget);
    window.addEventListener('scroll', updateTarget, true);

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updateTarget);
      window.removeEventListener('scroll', updateTarget, true);
    };
  }, [isOpen, location.pathname, step.id]);

  if (!isOpen) return null;

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

  const goToPreviousStep = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const goToNextStep = () => {
    if (isLastStep) {
      void closeTour();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const panelStyle: CSSProperties | undefined = spotlight && window.innerWidth >= 1024
    ? {
        left: Math.min(spotlight.right + 24, Math.max(window.innerWidth - 552, 16)),
        top: Math.min(Math.max(spotlight.top - 16, 16), Math.max(window.innerHeight - 360, 16)),
      }
    : undefined;

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none">
      {spotlight ? (
        <>
          <div className="fixed left-0 right-0 top-0 bg-background/60 backdrop-blur-[2px]" style={{ height: spotlight.top }} />
          <div className="fixed left-0 bg-background/60 backdrop-blur-[2px]" style={{ top: spotlight.top, width: spotlight.left, height: spotlight.height }} />
          <div className="fixed right-0 bg-background/60 backdrop-blur-[2px]" style={{ top: spotlight.top, left: spotlight.right, height: spotlight.height }} />
          <div className="fixed bottom-0 left-0 right-0 bg-background/60 backdrop-blur-[2px]" style={{ top: spotlight.bottom }} />
          <div
            className="fixed rounded-2xl border-2 border-primary shadow-[0_0_0_6px_rgba(244,63,94,0.14),0_18px_45px_rgba(15,23,42,0.22)]"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm" />
      )}

      <div
        className="pointer-events-auto fixed bottom-4 left-4 right-4 z-[100] mx-auto w-auto max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-300 lg:bottom-auto lg:left-auto lg:right-auto lg:w-[32rem]"
        style={panelStyle}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <StepIcon size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Tour inicial {stepIndex + 1}/{steps.length} · {step.eyebrow}
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

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex max-w-full gap-1.5 overflow-hidden">
            {steps.map((item, index) => (
              <span
                key={item.id}
                className={`h-1.5 rounded-full transition-all ${index <= stepIndex ? 'w-7 bg-primary' : 'w-3 bg-secondary'}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button type="button" variant="outline" onClick={goToPreviousStep} className="h-10 rounded-xl gap-2" disabled={saving}>
                <ArrowLeft size={16} /> Voltar
              </Button>
            )}
            <Button type="button" variant="outline" onClick={closeTour} className="h-10 rounded-xl" disabled={saving}>
              Pular
            </Button>
            <Button
              type="button"
              onClick={goToNextStep}
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
