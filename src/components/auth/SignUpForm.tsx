import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getSiteUrl } from '../../utils/url';
import { AuthLayout } from './AuthLayout';
import { Button, Input } from '../ui';
import { Mail, Lock, Loader2, ArrowRight, User, ShieldCheck, CreditCard, CheckCircle2 } from 'lucide-react';

interface SignUpFormProps {
  onSuccess?: () => void;
  onNavigateToLogin: () => void;
}

export const SignUpForm = ({ onSuccess, onNavigateToLogin }: SignUpFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentValue, setPaymentValue] = useState<number>(197);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Criar usuário no Supabase Auth
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name }
      }
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // 2. Fazer login imediato para obter o token (necessário para chamar a Edge Function)
    const { data: sessionData } = await supabase.auth.signInWithPassword({ email, password });
    const token = sessionData?.session?.access_token;

    if (token) {
      try {
        // 3. Criar cliente no Asaas e gerar link de pagamento
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-asaas-customer`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ name, email }),
          }
        );

        const result = await res.json();

        if (res.ok && result.paymentUrl) {
          setPaymentUrl(result.paymentUrl);
          if (result.paymentValue) setPaymentValue(Number(result.paymentValue));
          setSuccess(true);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Erro ao criar cliente Asaas:', err);
        // Continua o fluxo normalmente sem bloquear o cadastro
      }
    }

    setSuccess(true);
    setLoading(false);
    if (onSuccess) setTimeout(onSuccess, 2000);
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getSiteUrl(),
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (success) {
    return (
      <AuthLayout 
        title={paymentUrl ? "Checkout iniciado" : "Verifique seu e-mail!"} 
        subtitle={paymentUrl 
          ? "Sua conta foi criada. Confirme o e-mail e finalize o pagamento para liberar o WedPlan." 
          : "Verifique seu e-mail para confirmar o cadastro e começar a planejar."}
      >
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-6 animate-in zoom-in duration-500">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${paymentUrl ? 'bg-primary/10 text-primary' : 'bg-green-500/10 text-green-500'}`}>
            <Mail size={40} />
          </div>
          {paymentUrl ? (
            <>
              <div className="space-y-2">
                <p className="text-muted-foreground font-medium">
                  Conta criada para <strong className="text-foreground">{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  Sua senha inicial é a senha definida no cadastro. Por segurança, ela não será enviada por e-mail.
                </p>
                <p className="text-sm text-muted-foreground">
                  Clique abaixo para pagar via PIX, boleto ou cartão e liberar seu acesso.
                </p>
              </div>
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center justify-center gap-2 transition-all"
              >
                Pagar e Ativar Minha Conta →
              </a>
              <p className="text-xs text-muted-foreground">
                Após o pagamento, sua conta será ativada automaticamente.
              </p>
            </>
          ) : (
            <>
              <p className="text-muted-foreground font-medium">
                Enviamos um link de confirmação para <br/>
                <strong className="text-foreground">{email}</strong>
              </p>
            </>
          )}
          <Button onClick={onNavigateToLogin} variant="outline" className="w-full h-14 rounded-2xl">
            Voltar para o Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Checkout WedPlan" 
      subtitle="Crie sua conta, confirme seu e-mail e finalize o pagamento com segurança."
    >
      <form onSubmit={handleSignUp} className="space-y-5">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Plano Premium</p>
              <p className="mt-1 text-sm font-bold text-foreground">Acesso completo para organizar um casamento</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-foreground">R$ {Math.round(paymentValue)}</p>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">pagamento único</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-xs font-bold text-muted-foreground">
            {["Convidados, fornecedores, financeiro e tarefas", "Check-in público com token seguro", "Ativação automática via Asaas"].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-primary" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Seu Nome</label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <Input 
              type="text" 
              placeholder="Ex: Luan Ramalho" 
              className="pl-12 h-14 bg-secondary/50 border-white/5 focus:border-primary/50 transition-all rounded-2xl"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <Input 
              type="email" 
              placeholder="exemplo@email.com" 
              className="pl-12 h-14 bg-secondary/50 border-white/5 focus:border-primary/50 transition-all rounded-2xl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Senha inicial</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <Input 
              type="password" 
              placeholder="Essa será sua senha de login" 
              className="pl-12 h-14 bg-secondary/50 border-white/5 focus:border-primary/50 transition-all rounded-2xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <p className="ml-1 text-[10px] font-medium text-muted-foreground">
            Enviaremos o e-mail de confirmação da conta. A senha não é enviada por e-mail por segurança.
          </p>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/30 p-4 text-xs font-bold text-muted-foreground">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
            required
          />
          <span>Confirmo que quero criar minha conta WedPlan e seguir para o checkout seguro via Asaas.</span>
        </label>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}

        <Button 
          type="submit" 
          disabled={loading || !acceptedTerms}
          className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 group"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <span className="flex items-center gap-2">
              Criar conta e ir para pagamento <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </Button>

        <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase tracking-wide text-muted-foreground">
          <span className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/20 px-3 py-2">
            <ShieldCheck size={14} className="text-emerald-600" />
            Conta protegida
          </span>
          <span className="flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary/20 px-3 py-2">
            <CreditCard size={14} className="text-primary" />
            Pix, boleto, cartão
          </span>
        </div>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.3em]">
            <span className="bg-background px-4 text-muted-foreground/40">Ou entre com Google</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Button 
            variant="outline" 
            type="button" 
            onClick={handleGoogleLogin}
            className="h-14 rounded-2xl border-white/5 bg-secondary/30 gap-3 font-bold hover:bg-secondary/50 transition-all"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 7.79-4.53 1.62 0 3.06.56 4.21 1.64z" fill="#EA4335"/>
            </svg>
            Cadastrar com Google
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Já tem uma conta?{' '}
          <button 
            type="button"
            onClick={onNavigateToLogin}
            className="text-primary font-black hover:underline underline-offset-4"
          >
            Fazer Login
          </button>
        </p>
      </form>
    </AuthLayout>
  );
};
