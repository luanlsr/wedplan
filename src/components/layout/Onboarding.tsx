import { useState } from 'react';
import { Card, Button, Input } from '../ui';
import { Heart, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface OnboardingProps {
    onComplete: (data: { nome1: string, nome2: string, data: string, orcamento: number }) => Promise<void>;
}

export const Onboarding = ({ onComplete }: OnboardingProps) => {
    const [step, setStep] = useState(1);
    const [nome1, setNome1] = useState('');
    const [nome2, setNome2] = useState('');
    const [data, setData] = useState('');
    const [orcamento, setOrcamento] = useState('');
    const [loading, setLoading] = useState(false);

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else handleSubmit();
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onComplete({
                nome1,
                nome2,
                data,
                orcamento: parseFloat(orcamento) || 0
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex items-center justify-center p-4">
            <Card className="w-full max-w-xl p-8 lg:p-12 border-white/10 shadow-2xl overflow-hidden relative">
                {/* Background Decorations */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

                <div className="relative space-y-8">
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary/10 text-primary mb-4 animate-bounce">
                            <Heart size={32} fill="currentColor" className="opacity-80" />
                        </div>
                        <h2 className="text-3xl font-black tracking-tight italic uppercase italic">Bem-vindo ao <span className="text-primary not-italic">WedPlan</span></h2>
                        <p className="text-muted-foreground font-medium italic">Vamos começar a planejar o seu grande dia!</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex gap-2 justify-center">
                        {[1, 2, 3].map((s) => (
                            <div 
                                key={s} 
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-500",
                                    step >= s ? "w-12 bg-primary" : "w-6 bg-secondary"
                                )} 
                            />
                        ))}
                    </div>

                    {/* Step Content */}
                    <div className="min-h-[220px] flex items-center">
                        {step === 1 && (
                            <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <h3 className="text-xl font-bold">Quem são os noivos?</h3>
                                        <p className="text-sm text-muted-foreground">Como devemos chamar esse casal maravilhoso?</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 italic">Noivo(a) 1</label>
                                            <Input 
                                                placeholder="Nome Completo" 
                                                value={nome1} 
                                                onChange={e => setNome1(e.target.value)}
                                                className="h-14 bg-secondary/50 border-white/5 rounded-2xl"
                                            />
                                        </div>
                                        <div className="space-y-2 text-center flex flex-col justify-end pb-4 hidden sm:flex italic text-primary opacity-50">
                                            <Heart size={20} fill="currentColor" className="mx-auto" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 italic">Noivo(a) 2</label>
                                            <Input 
                                                placeholder="Nome Completo" 
                                                value={nome2} 
                                                onChange={e => setNome2(e.target.value)}
                                                className="h-14 bg-secondary/50 border-white/5 rounded-2xl"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <h3 className="text-xl font-bold">Quando será o grande dia?</h3>
                                        <p className="text-sm text-muted-foreground">Não se preocupe, você pode mudar isso depois.</p>
                                    </div>
                                    <div className="relative group max-w-sm mx-auto">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
                                        <Input 
                                            type="date"
                                            value={data} 
                                            onChange={e => setData(e.target.value)}
                                            className="pl-12 h-14 bg-secondary/50 border-white/5 rounded-2xl"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                <div className="space-y-4 text-center">
                                    <div className="text-center">
                                        <h3 className="text-xl font-bold">Qual o orçamento total?</h3>
                                        <p className="text-sm text-muted-foreground">Para ajudarmos você a controlar os gastos.</p>
                                    </div>
                                    <div className="relative group max-w-sm mx-auto">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">R$</div>
                                        <Input 
                                            type="number"
                                            placeholder="Ex: 50.000"
                                            value={orcamento} 
                                            onChange={e => setOrcamento(e.target.value)}
                                            className="pl-12 h-14 bg-secondary/50 border-white/5 rounded-2xl text-xl font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex gap-4 pt-4">
                        {step > 1 && (
                            <Button 
                                variant="outline" 
                                onClick={() => setStep(step - 1)}
                                className="h-14 flex-1 rounded-2xl border-white/10"
                                disabled={loading}
                            >
                                Voltar
                            </Button>
                        )}
                        <Button 
                            onClick={handleNext}
                            className="h-14 flex-[2] rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 group"
                            disabled={loading || (step === 1 && (!nome1 || !nome2) || (step === 2 && !data))}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <span className="flex items-center gap-2">
                                    {step === 3 ? 'Finalizar Configuração' : 'Continuar'} 
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};
