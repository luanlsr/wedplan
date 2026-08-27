import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, Search, ExternalLink, X } from 'lucide-react';
import { Card, Input } from '../ui';

interface AdminAccount {
  id: string;
  status: string;
  asaas_customer_id?: string;
  asaas_subscription_id?: string;
  account_types: any;
  created_at: string;
  profiles: { full_name: string; email: string }[];
}

export function AdminSubscriptions() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
          asaas_customer_id,
          asaas_subscription_id,
          created_at,
          account_types (name, price),
          profiles (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts((data as any) || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAccounts = accounts.filter(acc => {
    const ownerName = acc.profiles?.[0]?.full_name || '';
    const ownerEmail = acc.profiles?.[0]?.email || '';
    return ownerName.toLowerCase().includes(search.toLowerCase()) || 
           ownerEmail.toLowerCase().includes(search.toLowerCase()) ||
           acc.id.includes(search);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/20 rounded-xl text-primary">
            <CreditCard size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest leading-none pt-2">Assinaturas</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Planos e pagamentos</p>
          </div>
        </div>
      </div>

      <Card className="p-4 border-border/50 bg-secondary/20">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            className="rounded-xl border-border/50 bg-background pl-10 pr-10"
            placeholder="Buscar por nome, e-mail ou ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden border-border/50 bg-secondary/20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50 text-left">
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">ID da Conta</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Cliente Principal</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Plano</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Status</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground text-right">Integração Asaas</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando assinaturas...</td></tr>
              ) : filteredAccounts.map(acc => {
                const owner = acc.profiles?.[0];
                return (
                  <tr key={acc.id} className="border-b border-border/10 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-mono text-xs">{acc.id.split('-')[0]}...</td>
                    <td className="p-4">
                      <div className="font-bold">{owner?.full_name || 'Sem nome'}</div>
                      <div className="text-xs text-muted-foreground">{owner?.email || 'Sem e-mail'}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold">
                        {Array.isArray(acc.account_types) ? acc.account_types[0]?.name : acc.account_types?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        R$ {Array.isArray(acc.account_types) ? acc.account_types[0]?.price : acc.account_types?.price}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                        acc.status === 'active' ? 'bg-green-500/20 text-green-500' :
                        acc.status === 'pending_payment' ? 'bg-orange-500/20 text-orange-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {acc.asaas_customer_id ? (
                        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
                          <span>{acc.asaas_customer_id}</span>
                          <button className="hover:text-primary transition-colors" title="Ver no Asaas">
                            <ExternalLink size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Não integrado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredAccounts.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Nenhuma assinatura encontrada.
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
