import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, ShieldCheck, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, Button } from '../ui';
import { getClientEvidence } from '../../utils/clientEvidence';

interface PaymentGateProps {
  email?: string;
}

const paymentFallbackError = 'Não conseguimos iniciar o pagamento agora. Tente novamente em alguns minutos ou fale com o suporte.';

const getResultMessage = (result: unknown) => {
  if (!result || typeof result !== 'object') return paymentFallbackError;
  const payload = result as { userMessage?: unknown; error?: unknown };
  return String(payload.userMessage || payload.error || paymentFallbackError);
};

const getPaymentErrorMessage = (result: unknown) => {
  const message = getResultMessage(result);
  const technicalPatterns = ['api', 'asaas', 'supabase', 'service_role', 'invalid key', 'chave api', 'not configured', 'jwt', 'authorization'];

  if (technicalPatterns.some((pattern) => message.toLowerCase().includes(pattern))) {
    return paymentFallbackError;
  }

  return message;
};

export function PaymentGate({ email }: PaymentGateProps) {
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentValue, setPaymentValue] = useState<number>(39.9);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  const initPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!email) throw new Error('E-mail da conta não encontrado');
      if (!acceptedTerms || !acceptedPrivacy) {
        throw new Error('Aceite os Termos de Uso e a Política de Privacidade para continuar.');
      }

      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subscription-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(supabaseAnonKey ? { Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey } : {}),
          },
          body: JSON.stringify({
            fullName: email.split('@')[0],
            email,
            planCode: 'pro_couple',
            billingInterval: 'monthly',
            acceptedTerms: true,
            acceptedPrivacy: true,
            clientEvidence: getClientEvidence(),
            source: 'payment_gate',
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(getPaymentErrorMessage(result));
      if (result.paymentUrl) setPaymentUrl(result.paymentUrl);
      if (result.paymentValue) setPaymentValue(Number(result.paymentValue));
    } catch (err: unknown) {
      console.error('PaymentGate error:', err);
      setError(err instanceof Error ? err.message : paymentFallbackError);
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
                "Lista de Convidados Integrada",
                "RSVP Online e Inteligente",
                "Site do Casal no Plano Pro"
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
                <span className="text-6xl font-black tracking-tighter">{Math.round(paymentValue)}</span>
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Assinatura mensal • Plano Pro Casal</p>
            </div>

            <div className="w-full space-y-4">
              <div className="space-y-2 text-left">
                <ConsentCheckbox checked={acceptedTerms} onChange={setAcceptedTerms}>
                  Li e aceito os <LegalLink to="/termos-de-uso">Termos de Uso</LegalLink>.
                </ConsentCheckbox>
                <ConsentCheckbox checked={acceptedPrivacy} onChange={setAcceptedPrivacy}>
                  Li e aceito a <LegalLink to="/politica-de-privacidade">Política de Privacidade</LegalLink> e estou ciente do registro técnico do aceite.
                </ConsentCheckbox>
              </div>

              {loading ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2 className="animate-spin text-primary" size={28} />
                  <p className="text-xs text-muted-foreground font-medium">Gerando checkout da assinatura...</p>
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
                <Button
                  onClick={initPayment}
                  disabled={!acceptedTerms || !acceptedPrivacy}
                  className="w-full h-16 rounded-2xl"
                >
                  Gerar Checkout da Assinatura
                </Button>
              )}

              <p className="text-[10px] text-muted-foreground font-medium">
                Ao clicar, registraremos data e hora, IP, dispositivo, navegador e versão dos documentos aceitos, e você será redirecionado para o ambiente seguro do Asaas.
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

const ConsentCheckbox = ({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) => (
  <label className="flex items-start gap-3 rounded-2xl border border-border bg-background/70 p-3 text-xs font-bold leading-5 text-muted-foreground">
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
    />
    <span>{children}</span>
  </label>
);

const LegalLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link
    to={to}
    target="_blank"
    rel="noopener noreferrer"
    onClick={(event) => event.stopPropagation()}
    className="text-primary underline underline-offset-4 hover:text-primary/80"
  >
    {children}
  </Link>
);
