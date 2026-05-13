import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Search, Key, Plus, ShieldAlert, X, Mail, UserPlus } from 'lucide-react';
import { Card, Button, Input } from '../ui';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  roles: { name: string };
  accounts?: { status: string };
  created_at: string;
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '', status: 'active' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          created_at,
          roles (name),
          accounts (status)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as any) || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!email) return;
    if (!confirm(`Deseja enviar um e-mail de redefinição de senha para ${email}?`)) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      alert(`E-mail de redefinição enviado com sucesso para ${email}`);
    } catch (err: any) {
      alert(`Erro ao enviar reset: ${err.message}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(newUser),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao criar usuário');

      alert(`✅ Usuário ${newUser.email} criado com sucesso!`);
      setIsModalOpen(false);
      setNewUser({ email: '', full_name: '', password: '', status: 'active' });
      fetchUsers();
    } catch (err: any) {
      alert(`❌ Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.email?.toLowerCase().includes(search.toLowerCase())) || 
    (u.full_name?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/20 rounded-xl text-primary">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest leading-none pt-2">Gestão de Usuários</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Controle de acessos e contas</p>
          </div>
        </div>

        <Button 
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl font-bold uppercase tracking-widest text-xs gap-2"
        >
          <Plus size={16} />
          Novo Usuário
        </Button>
      </div>

      <Card className="p-4 border-border/50 bg-secondary/20">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            className="pl-10 rounded-xl border-border/50 bg-background"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </Card>

      <Card className="overflow-hidden border-border/50 bg-secondary/20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50 text-left">
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Usuário</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">E-mail</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Nível de Acesso</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground">Status Conta</th>
                <th className="p-4 font-black uppercase tracking-wider text-xs text-muted-foreground text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando usuários...</td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-border/10 hover:bg-white/5 transition-colors">
                  <td className="p-4 font-bold">{user.full_name || 'Sem nome'}</td>
                  <td className="p-4 text-muted-foreground">{user.email || 'Sem e-mail'}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                      user.roles?.name === 'master' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-primary/20 text-primary'
                    }`}>
                      {user.roles?.name || 'couple'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase ${
                      user.accounts?.status === 'active' ? 'bg-green-500/20 text-green-500' :
                      user.accounts?.status === 'pending_payment' ? 'bg-orange-500/20 text-orange-500' :
                      'bg-secondary text-muted-foreground'
                    }`}>
                      {user.accounts?.status || 'Sem conta'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={() => handleResetPassword(user.email)}
                      className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                      title="Enviar reset de senha"
                    >
                      <Key size={16} />
                    </button>
                    {user.roles?.name !== 'master' && (
                      <button 
                        className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        title="Bloquear usuário"
                      >
                        <ShieldAlert size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Novo Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-md p-6 shadow-2xl border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500" />
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <UserPlus size={20} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">Novo Usuário</h2>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</label>
                <Input 
                  required
                  placeholder="Ex: João Silva"
                  className="rounded-xl"
                  value={newUser.full_name}
                  onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input 
                    required
                    type="email"
                    placeholder="joao@email.com"
                    className="pl-10 rounded-xl"
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Senha Inicial</label>
                <Input 
                  required
                  type="password"
                  placeholder="••••••••"
                  className="rounded-xl"
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Status da Conta</label>
                <select 
                  className="w-full h-10 px-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium"
                  value={newUser.status}
                  onChange={e => setNewUser({...newUser, status: e.target.value})}
                >
                  <option value="active">Ativa (Acesso Total)</option>
                  <option value="pending_payment">Pendente de Pagamento</option>
                  <option value="trial">Trial (Período de Teste)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1 rounded-xl uppercase font-bold text-xs tracking-widest"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 rounded-xl uppercase font-bold text-xs tracking-widest"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
