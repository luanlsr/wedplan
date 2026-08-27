import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Crown, Users, ArrowRight, CreditCard } from 'lucide-react';
import { Card } from '../ui';

interface AdminAccount {
  id: string;
  status: string;
  created_at: string;
  account_types: any; // Cast flexível para lidar com retorno do Supabase
  profiles: { full_name: string; email: string }[];
}

export function AdminDashboard() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select(`
          id,
          status,
          created_at,
          account_types (name, price),
          profiles (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts((data as any) || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const mrr = accounts
    .filter(a => a.status === 'active')
    .reduce((acc, curr) => {
      const price = Array.isArray(curr.account_types) 
        ? curr.account_types[0]?.price 
        : curr.account_types?.price;
      return acc + (Number(price) || 0);
    }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Crown className="text-yellow-500" size={32} />
        <h1 className="text-2xl font-black uppercase tracking-widest">Master Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="p-6 bg-gradient-to-br from-primary/20 to-transparent border-primary/20 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => navigate('/usuarios')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Users className="text-primary" size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total de Contas</p>
                <p className="text-3xl font-black">{accounts.length}</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-muted-foreground" />
          </div>
        </Card>
        
        <Card 
          className="p-6 bg-gradient-to-br from-blue-500/20 to-transparent border-blue-500/20 cursor-pointer hover:scale-[1.02] transition-transform"
          onClick={() => navigate('/assinaturas')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <CreditCard className="text-blue-500" size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">MRR Projetado</p>
                <p className="text-3xl font-black">R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-muted-foreground" />
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/50 bg-secondary/20">
        <div className="p-4 border-b border-border/50 bg-background/50">
          <h2 className="font-bold tracking-widest uppercase text-sm">Assinantes Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50 text-left">
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Cliente Principal</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Plano</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Status Assinatura</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {accounts.slice(0, 5).map(acc => {
                const owner = acc.profiles?.[0];
                return (
                  <tr key={acc.id} className="border-b border-border/10 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold">{owner?.full_name || 'Sem nome'}</div>
                      <div className="text-xs text-muted-foreground">{owner?.email || 'Sem e-mail'}</div>
                    </td>
                    <td className="p-4 text-muted-foreground font-bold">
                      {Array.isArray(acc.account_types) 
                        ? acc.account_types[0]?.name 
                        : acc.account_types?.name || 'Padrão'}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                        acc.status === 'active' ? 'bg-green-500/20 text-green-500' :
                        acc.status === 'trial' ? 'bg-blue-500/20 text-blue-500' :
                        'bg-orange-500/20 text-orange-500'
                      }`}>
                        {acc.status || 'trial'}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {new Date(acc.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    Nenhuma conta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
