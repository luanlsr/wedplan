import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { getSiteUrl } from '../utils/url';
import { logError, logEvent } from '../utils/observability';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  resetPassword: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;

      if (error) {
        console.warn('[Auth] Sessão local inválida. Limpando autenticação local:', error.message);
        logError('auth.session.invalid', error);
        await supabase.auth.signOut({ scope: 'local' });
        if (!mounted) return;
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          void logEvent({ eventName: 'auth.session.loaded', metadata: { provider: session.user.app_metadata?.provider || null } });
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);
      void logEvent({
        eventName: `auth.${event.toLowerCase()}`,
        metadata: {
          hasUser: Boolean(session?.user),
          provider: session?.user?.app_metadata?.provider || null,
        },
      });
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const result = await supabase.auth.signOut();
    if (result.error) {
      logError('auth.sign_out.error', result.error);
      return;
    }
    void logEvent({ eventName: 'auth.sign_out.success' });
  };

  const resetPassword = async (email: string) => {
    const result = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/reset-password`,
    });
    if (result.error) logError('auth.reset_password.error', result.error);
    else void logEvent({ eventName: 'auth.reset_password.requested' });
    return result;
  };

  
  const updatePassword = async (password: string) => {
    const result = await supabase.auth.updateUser({ password });
    if (result.error) logError('auth.update_password.error', result.error);
    else void logEvent({ eventName: 'auth.update_password.success' });
    return result;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
