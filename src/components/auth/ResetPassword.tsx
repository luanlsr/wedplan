import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthLayout } from './AuthLayout';
import { Button, Input } from '../ui';
import { Lock, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ResetPasswordProps {
  onSuccess: () => void;
}

export const ResetPassword = ({ onSuccess }: ResetPasswordProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setTimeout(() => onSuccess(), 2000);
    }
  };

  if (success) {
    return (
      <AuthLayout 
        title="Senha redefinida!" 
        subtitle="Sua senha foi atualizada com sucesso. Redirecionando..."
      >
        <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
            <CheckCircle2 size={40} />
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout 
      title="Nova Senha" 
      subtitle="Crie uma nova senha forte para sua conta."
    >
      <form onSubmit={handleUpdate} className="space-y-5">
        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nova Senha</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <Input 
              type="password" 
              placeholder="••••••••" 
              className="pl-12 h-14 bg-secondary/50 border-white/5 focus:border-primary/50 transition-all rounded-2xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirmar Senha</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <Input 
              type="password" 
              placeholder="••••••••" 
              className="pl-12 h-14 bg-secondary/50 border-white/5 focus:border-primary/50 transition-all rounded-2xl"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
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
              Atualizar Senha <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
};
