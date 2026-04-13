import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthLayout } from './AuthLayout';
import { Button, Input } from '../ui';
import { Mail, Loader2, ArrowRight } from 'lucide-react';

interface ForgotPasswordProps {
  onNavigateToLogin: () => void;
}

export const ForgotPassword = ({ onNavigateToLogin }: ForgotPasswordProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout 
        title="Verifique seu e-mail" 
        subtitle="Se houver uma conta associada a este endereço, você receberá um link de recuperação."
      >
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Mail size={40} />
          </div>
          <Button onClick={onNavigateToLogin} variant="outline" className="w-full h-14 rounded-2xl">
            Voltar para o Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Recuperar senha" 
      subtitle="Informe seu e-mail para receber as instruções de recuperação."
    >
      <form onSubmit={handleReset} className="space-y-5">
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

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold">
            {error}
          </div>
        )}

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 group"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <span className="flex items-center gap-2">
              Enviar Link <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Lembrou a senha?{' '}
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
