import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { 
  Shield, Bell, Database, 
  Save, CheckCircle, AlertTriangle,
  Zap, RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button, Card } from '../ui';

interface SettingSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
}

const sections: SettingSection[] = [
  { id: 'profile', title: 'Perfil Master', icon: Shield, description: 'Dados da sua conta administrativa' },
  { id: 'plans', title: 'Planos e Preços', icon: Zap, description: 'Gerencie os planos disponíveis' },
  { id: 'notifications', title: 'Notificações', icon: Bell, description: 'Alertas e avisos do sistema' },
  { id: 'system', title: 'Sistema', icon: Database, description: 'Informações técnicas e manutenção' },
];

export function AdminSettings() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({ fullName: '', email: '' });
  const [plans, setPlans] = useState<{
    id: string;
    code: string;
    name: string;
    description: string;
    price_monthly: number;
    price_yearly: number;
    is_active: boolean;
  }[]>([]);
  const [notifications, setNotifications] = useState({
    newAccount: true,
    paymentReceived: true,
    paymentFailed: true,
    accountCanceled: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user) return;
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();
      
      if (profileData) {
        setProfile({ fullName: profileData.full_name || '', email: user.email || '' });
      }

      const { data: plansData } = await supabase
        .from('plans')
        .select('id, code, name, description, price_monthly, price_yearly, is_active')
        .order('price_monthly');
      
      if (plansData) setPlans(plansData);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeSection === 'profile') {
        await supabase.from('profiles').update({ full_name: profile.fullName }).eq('id', user?.id!);
      }
      if (activeSection === 'plans') {
        for (const plan of plans) {
          await supabase
            .from('plans')
            .update({
              name: plan.name,
              description: plan.description,
              price_monthly: plan.price_monthly,
              price_yearly: plan.price_yearly,
              is_active: plan.is_active,
            })
            .eq('id', plan.id);
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic">
            Configura<span className="text-primary">ções</span>
          </h2>
          <p className="text-muted-foreground text-sm mt-1 font-medium">Gerencie as configurações globais do WedPlan</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : saved ? (
            <CheckCircle size={16} className="text-green-400" />
          ) : (
            <Save size={16} />
          )}
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Alterações'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de seções */}
        <div className="glass rounded-3xl border border-white/10 p-4 h-fit space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all duration-200',
                activeSection === s.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
              )}
            >
              <s.icon size={18} className="shrink-0" />
              <div>
                <p className="text-xs font-black uppercase tracking-tighter leading-none">{s.title}</p>
                <p className={cn('text-[10px] mt-0.5 leading-none', activeSection === s.id ? 'text-white/70' : 'text-muted-foreground')}>{s.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Conteúdo da seção ativa */}
        <div className="lg:col-span-3 space-y-4">
          {/* === PERFIL MASTER === */}
          {activeSection === 'profile' && (
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Shield size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-tighter">Perfil Administrativo</h3>
                  <p className="text-xs text-muted-foreground">Seus dados de acesso master</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nome Completo</label>
                  <input
                    value={profile.fullName}
                    onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">E-mail</label>
                  <input
                    value={profile.email}
                    readOnly
                    className="w-full bg-secondary/30 border border-border/50 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                <Shield size={18} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black uppercase tracking-tighter text-primary">Papel: Master Administrator</p>
                  <p className="text-xs text-muted-foreground mt-1">Você tem acesso total ao sistema. Altere a senha pelo Supabase Dashboard por segurança.</p>
                </div>
              </div>
            </Card>
          )}


          {/* === PLANOS === */}
          {activeSection === 'plans' && (
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Zap size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-tighter">Planos e Preços</h3>
                  <p className="text-xs text-muted-foreground">Edite os planos comerciais da tabela plans</p>
                </div>
              </div>

              {plans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhum plano cadastrado na tabela plans</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {plans.map((plan, idx) => (
                    <div key={plan.id} className="p-4 rounded-2xl border border-border bg-secondary/20 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary">Plano {idx + 1}</p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Código</label>
                          <input
                            value={plan.code}
                            readOnly
                            className="w-full bg-secondary/30 border border-border/60 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome</label>
                          <input
                            value={plan.name}
                            onChange={e => setPlans(ps => ps.map(p => p.id === plan.id ? { ...p, name: e.target.value } : p))}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mensal (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={plan.price_monthly}
                            onChange={e => setPlans(ps => ps.map(p => p.id === plan.id ? { ...p, price_monthly: parseFloat(e.target.value) || 0 } : p))}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Anual (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={plan.price_yearly}
                            onChange={e => setPlans(ps => ps.map(p => p.id === plan.id ? { ...p, price_yearly: parseFloat(e.target.value) || 0 } : p))}
                            className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descrição</label>
                        <input
                          value={plan.description || ''}
                          onChange={e => setPlans(ps => ps.map(p => p.id === plan.id ? { ...p, description: e.target.value } : p))}
                          className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                        />
                      </div>
                      <label className="flex items-center justify-between rounded-xl border border-border bg-background/50 px-3 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Plano ativo
                        <input
                          type="checkbox"
                          checked={plan.is_active}
                          onChange={e => setPlans(ps => ps.map(p => p.id === plan.id ? { ...p, is_active: e.target.checked } : p))}
                          className="h-4 w-4 accent-primary"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* === NOTIFICAÇÕES === */}
          {activeSection === 'notifications' && (
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Bell size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-black uppercase tracking-tighter">Notificações do Sistema</h3>
                  <p className="text-xs text-muted-foreground">Configure quando você quer ser alertado</p>
                </div>
              </div>

              <div className="space-y-3">
                {([
                  { key: 'newAccount', label: 'Nova Conta Criada', desc: 'Quando um novo usuário se cadastrar' },
                  { key: 'paymentReceived', label: 'Pagamento Recebido', desc: 'Confirmação de assinatura via Asaas' },
                  { key: 'paymentFailed', label: 'Pagamento Falhou', desc: 'Falha ou recusa de cobrança' },
                  { key: 'accountCanceled', label: 'Conta Cancelada', desc: 'Quando um usuário cancelar' },
                ] as const).map(item => (
                  <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-secondary/20">
                    <div>
                      <p className="font-black text-sm uppercase tracking-tighter">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => setNotifications(n => ({ ...n, [item.key]: !n[item.key] }))}
                      className={cn(
                        'w-12 h-6 rounded-full transition-all duration-300 relative shrink-0',
                        notifications[item.key] ? 'bg-primary' : 'bg-secondary border border-border'
                      )}
                    >
                      <span className={cn(
                        'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-300',
                        notifications[item.key] ? 'left-7' : 'left-1'
                      )} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Notificações por e-mail requerem configuração de SMTP no Supabase. Atualmente apenas visuais no sistema.</p>
              </div>
            </Card>
          )}

          {/* === SISTEMA === */}
          {activeSection === 'system' && (
            <div className="space-y-4">
              <Card className="p-6 space-y-4">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Database size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tighter">Informações do Sistema</h3>
                    <p className="text-xs text-muted-foreground">Ambiente e versão da plataforma</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Versão', value: 'WedPlan v1.0.0' },
                    { label: 'Ambiente', value: 'Supabase + Vite' },
                    { label: 'Autenticação', value: 'Supabase Auth' },
                    { label: 'Armazenamento', value: 'Supabase PostgreSQL' },
                    { label: 'Gateway', value: 'Asaas (via Edge Function)' },
                    { label: 'Deploy', value: 'Vercel / Local Dev' },
                  ].map(info => (
                    <div key={info.label} className="p-3 rounded-xl bg-secondary/30">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{info.label}</p>
                      <p className="text-sm font-bold mt-1">{info.value}</p>
                    </div>
                  ))}
                </div>
              </Card>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
