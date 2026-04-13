import { useMemo, useState, useEffect } from 'react';
import { Card, Input, Button } from '../ui';
import { formatCurrency } from '../../utils/calculations';
import { DollarSign, Wallet, TrendingUp, ArrowRight, Info, ArrowLeft, CheckCircle2, ChevronRight, Calculator } from "lucide-react";
import { format, differenceInMonths, addMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from '../ui';
import type { Supplier } from '../../types';

interface PlanningViewProps {
  suppliers: Supplier[];
  weddingDate: string;
  simulation?: any;
  onUpdateSimulation: (simulation: any) => void;
}

type Step = 'intro' | 'simulacao' | 'final';



export const PlanningView = ({ suppliers, weddingDate, simulation, onUpdateSimulation }: PlanningViewProps) => {
  // Load initial state from simulation storage/props
  const [step, setStep] = useState<Step>(simulation?.step || 'intro');
  const [simulacaoIndex, setSimulacaoIndex] = useState(simulation?.index || 0);
  const [simulatedAportes, setSimulatedAportes] = useState<Record<string, number>>(simulation?.aportes || {});
  const [currentInputValue, setCurrentInputValue] = useState<number | "">("");

  const today = new Date();
  const wedding = parseISO(weddingDate);
  const monthsRemaining = Math.max(1, differenceInMonths(wedding, today));

  // Sync with prop if it changes and we are not in the middle of editing
  useEffect(() => {
    if (simulation) {
      if (simulation.step) setStep(simulation.step);
      if (simulation.index !== undefined) setSimulacaoIndex(simulation.index);
      if (simulation.aportes) setSimulatedAportes(simulation.aportes);
    }
  }, [simulation]);

  // Persistence Effect to Supabase
  useEffect(() => {
    onUpdateSimulation({
      step,
      index: simulacaoIndex,
      aportes: simulatedAportes
    });
  }, [step, simulacaoIndex, simulatedAportes]);

  // Months with installments or quitações
  const simulationTimeline = useMemo(() => {
    const months = [];
    for (let i = 0; i <= monthsRemaining; i++) {
        const date = addMonths(today, i);
        const key = format(date, "yyyy-MM");
        
        const monthSuppliers = suppliers.map(s => {
            const installments = s.parcelas.filter(p => p.dataVencimento.substring(0, 7) === key && p.status === 'pendente');
            const total = installments.reduce((sum, p) => sum + p.valor, 0);
            return {
                name: s.fornecedor,
                total,
                installmentsCount: installments.length
            };
        }).filter(s => s.total > 0);

        const monthTotal = monthSuppliers.reduce((sum, s) => sum + s.total, 0);

        months.push({
            key,
            date,
            label: format(date, "MMMM yyyy", { locale: ptBR }),
            suppliers: monthSuppliers,
            totalDue: monthTotal,
            isWedding: i === monthsRemaining
        });
    }
    return months;
  }, [suppliers, monthsRemaining]);

  const currentMonthData = simulationTimeline[simulacaoIndex];

  // Sync current input value when index changes (going back/forth)
  useEffect(() => {
    if (currentMonthData) {
      setCurrentInputValue(simulatedAportes[currentMonthData.key] || "");
    }
  }, [simulacaoIndex, currentMonthData?.key]);

  // Logic for final step
  const totalSimulatedPayments = Object.values(simulatedAportes).reduce((a, b) => a + b, 0);
  const totalOverallPending = useMemo(() => {
    return suppliers.reduce((acc, s) => {
      return acc + s.parcelas.reduce((pAcc, p) => p.status === 'pendente' ? pAcc + p.valor : pAcc, 0);
    }, 0);
  }, [suppliers]);

  const remainingAfterSimulation = Math.max(0, totalOverallPending - totalSimulatedPayments);
  const finalSavingsGoal = remainingAfterSimulation / monthsRemaining;

  const handleNextSimulation = () => {
    if (currentMonthData) {
        setSimulatedAportes(prev => ({
            ...prev,
            [currentMonthData.key]: Number(currentInputValue || 0)
        }));
    }
    
    if (simulacaoIndex < simulationTimeline.length - 1) {
        setSimulacaoIndex(prev => prev + 1);
        // We don't clear currentInputValue here because the useEffect above handles it
    } else {
        setStep('final');
    }
  };

  const handleBackSimulation = () => {
    if (simulacaoIndex > 0) {
        setSimulacaoIndex(prev => prev - 1);
    } else {
        setStep('intro');
    }
  };

  const resetSimulation = () => {
    setStep('intro');
    setSimulacaoIndex(0);
    setSimulatedAportes({});
    setCurrentInputValue("");
    onUpdateSimulation({ step: 'intro', index: 0, aportes: {} });
  };

  const renderIntro = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 max-w-3xl mx-auto text-center">
      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-6 border border-primary/20">
        <Calculator size={40} />
      </div>
      
      <div className="space-y-4">
        <h3 className="text-4xl font-black uppercase tracking-tight italic">Simulador de Fluxo de Caixa</h3>
        <p className="text-lg text-muted-foreground font-medium leading-relaxed">
            Vamos percorrer <span className="text-foreground font-bold">{simulationTimeline.length} meses</span> até o seu casamento. 
            Em cada mês, você verá o que está agendado e decidirá quanto quer pagar. 
            Ao final, calcularemos o <span className="text-primary font-bold">Plano de Poupança</span> necessário para as quitações remanescentes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
         <Card className="p-6 bg-card/40 border-white/5 space-y-2">
            <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
               <CheckCircle2 size={14} /> Passo 1: Exercício
            </h4>
            <p className="text-xs text-muted-foreground">Mês a mês, defina seu aporte financeiro real baseado nos fornecedores vencendo.</p>
         </Card>
         <Card className="p-6 bg-card/40 border-white/5 space-y-2">
            <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
               <TrendingUp size={14} /> Passo 2: Estratégia
            </h4>
            <p className="text-xs text-muted-foreground">Descubra quanto falta para as quitações de 15 dias antes e quanto poupar por mês.</p>
         </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Button 
            onClick={() => setStep('simulacao')}
            className="w-full h-20 rounded-[2rem] bg-primary text-white font-black text-xl uppercase shadow-2xl shadow-primary/30 group"
        >
            {Object.keys(simulatedAportes).length > 0 ? 'Continuar Simulação Salva' : 'Começar Simulação Mensal'}
            <ArrowRight className="ml-3 group-hover:translate-x-1 transition-transform" />
        </Button>
        {Object.keys(simulatedAportes).length > 0 && (
            <Button variant="ghost" onClick={resetSimulation} className="text-xs font-black uppercase text-muted-foreground hover:text-red-500">
                Reiniciar e Apagar Dados Salvos
            </Button>
        )}
      </div>
    </div>
  );

  const renderSimulacao = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex">
         {simulationTimeline.map((_, idx) => (
           <div 
             key={idx} 
             className={cn(
               "flex-1 h-full transition-all duration-500",
               idx <= simulacaoIndex ? "bg-primary" : "bg-transparent"
             )}
           />
         ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Left Card: Month Details */}
        <div className="space-y-6">
           <div className="space-y-1">
             <p className="text-xs font-black text-primary uppercase tracking-[0.2em]">{simulacaoIndex + 1} de {simulationTimeline.length} Meses</p>
             <h3 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">{currentMonthData?.label}</h3>
           </div>

           <Card className="bg-card/40 border-white/5 overflow-hidden">
              <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                 <span>Fornecedores do Mês</span>
                 <span>Total Original</span>
              </div>
              <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                 {currentMonthData?.suppliers.map((sup, idx) => (
                   <div key={idx} className="p-4 flex justify-between items-center">
                      <div>
                         <p className="text-sm font-black text-foreground uppercase tracking-tight">{sup.name}</p>
                         <p className="text-[10px] font-bold text-muted-foreground uppercase">{sup.installmentsCount} {sup.installmentsCount === 1 ? 'vencimento' : 'vencimentos'}</p>
                      </div>
                      <span className="font-black text-foreground">{formatCurrency(sup.total)}</span>
                   </div>
                 ))}
                 {currentMonthData?.suppliers.length === 0 && (
                   <div className="p-8 text-center text-muted-foreground italic font-medium">Nenhum vencimento agendado para este mês.</div>
                 )}
              </div>
              <div className="p-5 bg-primary/5 flex justify-between items-center border-t border-primary/10">
                 <span className="text-xs font-black text-primary uppercase tracking-widest italic">Total Devido no Mês</span>
                 <span className="text-xl font-black text-primary">{formatCurrency(currentMonthData?.totalDue || 0)}</span>
              </div>
           </Card>
        </div>

        {/* Right Side: Input and Actions */}
        <div className="space-y-8 pt-6 lg:pt-14">
           <Card className="p-8 bg-card border-2 border-white/5 shadow-2xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="space-y-2 relative">
                 <h4 className="text-sm font-black uppercase text-foreground">Quanto você irá pagar neste mês?</h4>
                 <p className="text-xs text-muted-foreground italic">Com base no seu saldo atual, defina o valor do aporte.</p>
              </div>

              <div className="relative">
                 <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-primary/30 italic">R$</span>
                 <Input 
                   type="number" 
                   autoFocus
                   placeholder="0,00"
                   className="h-24 pl-20 pr-8 bg-secondary/20 border-2 border-white/5 focus:border-primary/50 text-5xl font-black transition-all rounded-[2rem] placeholder:text-muted-foreground/10"
                   value={currentInputValue}
                   onChange={(e) => setCurrentInputValue(e.target.value === "" ? "" : Number(e.target.value))}
                 />
              </div>

              <div className="flex gap-4">
                 <Button 
                   variant="outline" 
                   onClick={handleBackSimulation}
                   className="flex-1 h-14 rounded-2xl font-black uppercase text-xs"
                 >
                   <ArrowLeft className="mr-2" size={16} /> Voltar
                 </Button>
                 <Button 
                   onClick={handleNextSimulation}
                   className="flex-[2] h-14 rounded-2xl bg-primary text-white font-black uppercase text-xs shadow-lg shadow-primary/20"
                 >
                   {simulacaoIndex < simulationTimeline.length - 1 ? 'Próximo Mês' : 'Finalizar Simulação'}
                   <ChevronRight className="ml-2" size={16} />
                 </Button>
              </div>
           </Card>

           <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex gap-4">
              <Info className="text-amber-500 shrink-0" size={18} />
              <p className="text-[11px] font-medium text-amber-500/80 leading-relaxed italic">
                 Ao pagar menos que o "Total Devido", o sistema acumulará o saldo para o cálculo da meta de poupança final. Se pagar mais, você amortiza as quitações futuras.
              </p>
           </div>
        </div>
      </div>
    </div>
  );

  const renderFinal = () => (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
         <h3 className="text-4xl font-black uppercase italic tracking-tighter text-foreground">Diagnóstico Final de Quitação</h3>
         <p className="text-muted-foreground font-medium">Com base nas suas simulações, calculamos sua estratégia de poupança.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <Card className="p-8 bg-card/40 border-white/5 space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 text-primary italic font-black text-4xl opacity-5 select-none"><Wallet size={80} /></div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Simulado Pago</p>
            <p className="text-3xl font-black text-foreground tracking-tighter italic">{formatCurrency(totalSimulatedPayments)}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Soma de todos os seus aportes mensais</p>
         </Card>

         <Card className="p-8 bg-card/40 border-white/5 space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 text-red-500 italic font-black text-4xl opacity-5 select-none"><AlertCircle size={80} /></div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest italic">Ainda Falta (Saldo Devedor)</p>
            <p className="text-3xl font-black text-red-500 tracking-tighter italic">{formatCurrency(remainingAfterSimulation)}</p>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Dívida residual após aportes simulados</p>
         </Card>

         <Card className="p-8 bg-primary text-white space-y-2 relative overflow-hidden shadow-2xl shadow-primary/30">
            <TrendingUp className="absolute top-[-10px] right-[-10px] size-32 opacity-10 rotate-12" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Meta Mensal de Poupança</p>
            <p className="text-3xl font-black tracking-tighter italic">{formatCurrency(finalSavingsGoal)}</p>
            <p className="text-[9px] font-bold uppercase opacity-80">Quanto poupar/mês fora as parcelas simuladas</p>
         </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground pl-2">Análise Estratégica</h4>
            <Card className="p-8 bg-card/40 border-white/5 space-y-6">
               <div className="space-y-4">
                  <div className="flex items-start gap-4">
                     <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1"><CheckCircle2 size={16} /></div>
                     <p className="text-sm font-medium leading-relaxed italic">
                        Você simulou o pagamento de <span className="text-foreground font-black">{formatCurrency(totalSimulatedPayments)}</span> ao longo dos próximos <span className="text-foreground font-black">{monthsRemaining} meses</span>.
                     </p>
                  </div>
                  <div className="flex items-start gap-4">
                     <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0 mt-1"><AlertCircle size={16} /></div>
                     <p className="text-sm font-medium leading-relaxed italic">
                        Para quitar os <span className="text-foreground font-black">{formatCurrency(totalOverallPending)}</span> totais (incluindo as quitações de 15 dias antes), 
                        você ainda precisará levantar <span className="text-red-500 font-black">{formatCurrency(remainingAfterSimulation)}</span> no total.
                     </p>
                  </div>
               </div>

               <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10">
                  <p className="text-sm font-black text-primary leading-tight uppercase italic mb-2">Conclusão do Consultor:</p>
                  <p className="text-xs font-bold text-muted-foreground leading-relaxed italic">
                    Para não ter surpresas, além dos aportes simulados, sua família deve guardar um fundo de reserva de no mínimo <strong>{formatCurrency(finalSavingsGoal)} por mês</strong> a partir de hoje. 
                    Este valor garante que os fornecedores com quitação final sejam pagos sem comprometer o fluxo de caixa.
                  </p>
               </div>
            </Card>
         </div>

         <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground pl-2">Soma dos Aportes Simulados</h4>
            <Card className="p-6 bg-card/40 border-white/5">
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {simulationTimeline.map((item) => (
                        <div key={item.key} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-[10px] font-black text-muted-foreground uppercase">{item.label}</span>
                            <span className="text-sm font-black text-foreground">{formatCurrency(simulatedAportes[item.key] || 0)}</span>
                        </div>
                    ))}
                </div>
            </Card>
         </div>
      </div>

      <div className="flex gap-4">
        <Button 
            onClick={resetSimulation}
            variant="ghost" 
            className="flex-1 h-14 rounded-2xl text-muted-foreground font-bold uppercase tracking-widest hover:text-foreground"
        >
            Reiniciar Exercício
        </Button>
        <Button 
            variant="outline"
            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-[10px]"
            onClick={() => window.print()}
        >
            Imprimir Diagnóstico
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="flex flex-col gap-2">
        <h2 className="text-5xl font-black text-foreground tracking-tighter uppercase italic flex items-center gap-4">
          Consultoria
          <span className="text-primary">Financeira</span>
        </h2>
        <p className="text-muted-foreground font-semibold flex items-center gap-2 tracking-wide uppercase text-[10px]">
          <DollarSign size={14} className="text-primary" />
          Exercício de projeção de fluxo de caixa e quitação final
        </p>
      </div>

      <div className="min-h-[600px] relative">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/5 to-transparent blur-[120px] -z-10 opacity-30 pointer-events-none" />
        {step === 'intro' && renderIntro()}
        {step === 'simulacao' && renderSimulacao()}
        {step === 'final' && renderFinal()}
      </div>
    </div>
  );
};

// Missing imports fix
import { AlertCircle } from "lucide-react";
