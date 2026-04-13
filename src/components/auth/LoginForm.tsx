import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthLayout } from './AuthLayout';
import { Button, Input } from '../ui';
import { Mail, Lock, Loader2, ArrowRight, Globe } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
  onNavigateToSignUp: () => void;
  onNavigateToForgot: () => void;
}

export const LoginForm = ({ onSuccess, onNavigateToSignUp, onNavigateToForgot }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
      setLoading(false);
    } else {
      if (onSuccess) onSuccess();
    }
  };

  return (
    <AuthLayout 
      title="Bem-vindo de volta" 
      subtitle="Entre com suas credenciais para gerenciar seu grande dia."
    >
      <form onSubmit={handleLogin} className="space-y-5">
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
          <div className="flex justify-between items-center ml-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Senha</label>
            <button 
              type="button"
              onClick={onNavigateToForgot}
              className="text-[11px] font-black uppercase tracking-widest text-primary hover:underline transition-all"
            >
              Esqueceu?
            </button>
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <Input 
              type="password" 
              placeholder="••••••••" 
              className="pl-12 h-14 bg-secondary/50 border-white/5 focus:border-primary/50 transition-all rounded-2xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold animate-in fade-in slide-in-from-top-2">
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
              Acessar Painel <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </Button>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.3em]">
            <span className="bg-background px-4 text-muted-foreground/40">Ou continue com</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Button variant="outline" type="button" className="h-14 rounded-2xl border-white/5 bg-secondary/30 gap-3 font-bold">
            <Globe size={20} /> GitHub
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Não tem uma conta?{' '}
          <button 
            type="button"
            onClick={onNavigateToSignUp}
            className="text-primary font-black hover:underline underline-offset-4"
          >
            Cadastre-se grátis
          </button>
        </p>
      </form>
    </AuthLayout>
  );
};
