import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthLayout } from './AuthLayout';
import { Button, Input } from '../ui';
import { Mail, Lock, Loader2, ArrowRight, User } from 'lucide-react';

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        }
      }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      // Wait a bit then success callback or immediate
      if (onSuccess) {
          setTimeout(onSuccess, 2000);
      }
    }
  };

  if (success) {
    return (
      <AuthLayout 
        title="Quase lá!" 
        subtitle="Verifique seu e-mail para confirmar o cadastro e começar a planejar."
      >
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-6 animate-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
            <Mail size={40} />
          </div>
          <p className="text-muted-foreground font-medium">
            Enviamos um link de confirmação para <br/>
            <strong className="text-foreground">{email}</strong>
          </p>
          <Button onClick={onNavigateToLogin} variant="outline" className="w-full h-14 rounded-2xl">
            Voltar para o Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Criar sua conta" 
      subtitle="Junte-se ao WedPlan e organize o seu casamento dos sonhos."
    >
      <form onSubmit={handleSignUp} className="space-y-5">
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
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Senha</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <Input 
              type="password" 
              placeholder="Min. 8 caracteres" 
              className="pl-12 h-14 bg-secondary/50 border-white/5 focus:border-primary/50 transition-all rounded-2xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
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
              Começar Agora <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </Button>

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
