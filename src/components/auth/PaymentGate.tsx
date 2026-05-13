import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, ShieldCheck, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, Button } from '../ui';

interface PaymentGateProps {
  onCheckout: () => void;
  email?: string;
}

export function PaymentGate({ email }: PaymentGateProps) {
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initPayment();
  }, []);

  const initPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Sessão expirada');

      // Verifica se já tem um payment_url salvo ou cria novo cliente no Asaas
      const { data: account } = await supabase
        .from('accounts')
        .select('asaas_customer_id')
        .eq('id', session.user.id)
        .maybeSingle();

      // Se já tem cliente no Asaas, busca a cobrança pendente
      if (account?.asaas_customer_id) {
        // Tenta buscar uma invoice URL existente via Edge Function
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-asaas-customer`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ name: email?.split('@')[0], email }),
          }
        );
        const result = await res.json();
        if (res.ok && result.paymentUrl) {
          setPaymentUrl(result.paymentUrl);
        }
      } else {
        // Cria novo cliente no Asaas
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-asaas-customer`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ name: email?.split('@')[0] || email, email }),
          }
        );
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Erro ao gerar link de pagamento');
        if (result.paymentUrl) setPaymentUrl(result.paymentUrl);
      }
    } catch (err: any) {
      console.error('PaymentGate error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl overflow-hidden border-primary/20 shadow-2xl relative">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-blue-500 to-primary animate-gradient-x" />
        
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Side: Info */}
          <div className="p-8 space-y-6 bg-secondary/20">
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none">
                Sua jornada <br/><span className="text-primary not-italic">começa aqui.</span>
              </h2>
              <p className="text-sm text-muted-foreground font-medium">
                Sua conta está aguardando o pagamento para liberar o acesso total ao WedPlan.
              </p>
            </div>

            <ul className="space-y-4">
              {[
                "Gestão Completa de Fornecedores",
                "Controle Financeiro & Aportes",
                "Lista de Convidados Ilimitada",
                "RSVP Online e Inteligente",
                "Checklist de Tarefas Premium"
              ].map((text, i) => (
                <li key={i} className="flex items-center gap-3 text-xs font-bold uppercase tracking-tight">
                  <div className="p-1 bg-primary/20 rounded-full text-primary"><CheckCircle2 size={12} /></div>
                  {text}
                </li>
              ))}
            </ul>

            <div className="p-4 bg-background/50 rounded-2xl border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Garantia de Satisfação</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-bold leading-relaxed">
                Pagamento processado de forma segura via Asaas. Acesso liberado instantaneamente após a confirmação.
              </p>
            </div>
          </div>

          {/* Right Side: Action */}
          <div className="p-8 flex flex-col justify-center items-center text-center space-y-8 bg-background">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary italic">Plano Premium</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-xl font-bold">R$</span>
                <span className="text-6xl font-black tracking-tighter">5</span>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pagamento Único • Acesso Vitalício</p>
            </div>

            <div className="w-full space-y-4">
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2 className="animate-spin text-primary" size={28} />
                  <p className="text-xs text-muted-foreground font-medium">Gerando link de pagamento...</p>
                </div>
              ) : error ? (
                <div className="space-y-3">
                  <p className="text-xs text-destructive font-bold">{error}</p>
                  <Button onClick={initPayment} variant="outline" className="w-full h-12 rounded-2xl">
                    Tentar Novamente
                  </Button>
                </div>
              ) : paymentUrl ? (
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest shadow-xl shadow-primary/30 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors group"
                >
                  Ativar Minha Conta <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                </a>
              ) : (
                <Button onClick={initPayment} className="w-full h-16 rounded-2xl">
                  Gerar Link de Pagamento
                </Button>
              )}

              <p className="text-[10px] text-muted-foreground font-medium">
                Ao clicar, você será redirecionado para o ambiente seguro de pagamento do Asaas.
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 grayscale opacity-50">
                <CreditCard size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest">Cartão • Pix • Boleto</span>
              </div>
              {email && (
                <p className="text-[10px] text-muted-foreground font-bold italic">
                  Vinculado a: {email}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
