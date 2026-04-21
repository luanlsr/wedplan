import { useState, useEffect } from 'react';
import { Card, Button, Input, Badge, cn, useConfirm } from './ui';
import { Save, UserPlus, Shield, Database, RefreshCw, Copy, Check } from 'lucide-react';
import { maskCurrency, unmaskCurrency } from '../utils/masks';
import { useAuth } from '../hooks/useAuth';

interface SettingsViewProps {
  data: any;
  updateWeddingInfo: (info: any) => Promise<void>;
  updateConfig: (config: any) => Promise<void>;
  handleSyncData: () => Promise<void>;
  isSyncing: boolean;
  customAlert: (info: any) => Promise<void>;
}

export const SettingsView = ({
  data,
  updateWeddingInfo,
  updateConfig,
  handleSyncData,
  isSyncing,
  customAlert
}: SettingsViewProps) => {
  const { user, resetPassword } = useAuth();
  const { confirm } = useConfirm();

  // Local state for the form
  const [localData, setLocalData] = useState({
    nome1: data.casal.nome1,
    nome2: data.casal.nome2,
    weddingDate: data.casal.data,
    orcamento: data.configuracoes.orcamentoTotal
  });

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Update local state when data changes (initial load)
  useEffect(() => {
    setLocalData({
      nome1: data.casal.nome1,
      nome2: data.casal.nome2,
      weddingDate: data.casal.data,
      orcamento: data.configuracoes.orcamentoTotal
    });
  }, [data.casal, data.configuracoes]);

  // Check if form is dirty
  useEffect(() => {
    const isChanged =
      localData.nome1 !== data.casal.nome1 ||
      localData.nome2 !== data.casal.nome2 ||
      localData.weddingDate !== data.casal.data ||
      localData.orcamento !== data.configuracoes.orcamentoTotal;
    setIsDirty(isChanged);
  }, [localData, data.casal, data.configuracoes]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateWeddingInfo({
        nome1: localData.nome1,
        nome2: localData.nome2,
        data: localData.weddingDate
      });
      await updateConfig({
        orcamentoTotal: localData.orcamento
      });
      setIsDirty(false);
      await customAlert({
        title: "Sucesso!",
        description: "Suas configurações foram atualizadas com sucesso.",
        type: "success"
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'geral' | 'equipe' | 'conta' | 'avancado'>('geral');

  const copyCheckinLink = () => {
    const link = `${window.location.origin}/checkin?token=${data.public_checkin_token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'geral', label: 'Geral', icon: Database },
    { id: 'equipe', label: 'Equipe', icon: UserPlus },
    { id: 'conta', label: 'Conta & Nuvem', icon: Shield },
    { id: 'avancado', label: 'Avançado', icon: RefreshCw },
  ] as const;

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Tab Navigation */}
      <div className="flex flex-nowrap overflow-x-auto no-scrollbar gap-2 p-1.5 bg-secondary/30 rounded-2xl w-full sm:w-fit backdrop-blur-md border border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl text-[10px] sm:text-sm font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap",
              activeTab === tab.id
                ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <tab.icon size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'geral' && (
          <Card className="bg-card border-white/5 shadow-xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-500">
            <div className="p-5 sm:p-8 space-y-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight">Dados do Casamento</h3>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Informações centrais exibidas em todo o sistema</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 italic">Orçamento Total</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">R$</div>
                    <Input
                      type="text"
                      className="pl-12 h-14 bg-secondary/30 border-white/5 rounded-2xl text-xl font-bold transition-all focus:bg-secondary/50"
                      value={maskCurrency(localData.orcamento)}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalData({ ...localData, orcamento: unmaskCurrency(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 italic">Noivo(a) 1</label>
                    <Input
                      className="h-14 bg-secondary/30 border-white/5 rounded-2xl font-bold transition-all focus:bg-secondary/50"
                      value={localData.nome1}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalData({ ...localData, nome1: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 italic">Noivo(a) 2</label>
                    <Input
                      className="h-14 bg-secondary/30 border-white/5 rounded-2xl font-bold transition-all focus:bg-secondary/50"
                      value={localData.nome2}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalData({ ...localData, nome2: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 italic">Data do Grande Dia</label>
                  <Input
                    type="date"
                    className="h-14 bg-secondary/30 border-white/5 rounded-2xl font-bold transition-all focus:bg-secondary/50"
                    value={localData.weddingDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalData({ ...localData, weddingDate: e.target.value })}
                  />
                </div>
              </div>

              <Button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className={cn(
                  "w-full h-14 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl",
                  isDirty
                    ? "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
              >
                {isSaving ? (
                  <RefreshCw className="animate-spin mr-2" size={20} />
                ) : (
                  <Save className="mr-2" size={20} />
                )}
                {isSaving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </Card>
        )}

        {activeTab === 'equipe' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <Card className="p-5 sm:p-8 border-white/5 shadow-lg space-y-6">
              <div className="flex items-center gap-4 text-primary mb-2">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <UserPlus size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase italic tracking-tight leading-none">Equipe do Dia</h3>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">Gestão de acesso para recepção e staff</p>
                </div>
              </div>

              <div className="p-6 bg-secondary/20 rounded-2xl border border-white/5 space-y-4">
                <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                  Este link permite que sua equipe de assessoria realize o check-in dos convidados em tempo real, sem precisar de uma conta de usuário completa.
                </p>
                <div className="flex gap-3">
                  <div className="flex-1 bg-black/20 p-3 rounded-xl border border-white/5 font-mono text-[10px] break-all opacity-50 flex items-center">
                    {window.location.origin}/checkin?token={data.public_checkin_token}
                  </div>
                  <Button
                    className="shrink-0 h-12 px-6 rounded-xl bg-primary text-white font-bold"
                    onClick={copyCheckinLink}
                  >
                    {copied ? <Check size={18} className="text-white" /> : <Copy size={18} />}
                    <span className="ml-2 hidden sm:inline">{copied ? "Copiado" : "Copiar"}</span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 border border-white/5 rounded-2xl space-y-2">
                  <h5 className="font-bold text-sm">Privacidade Total</h5>
                  <p className="text-xs text-muted-foreground">O link dá acesso apenas à lista de convidados e fornecedores. Financeiro e contratos permanecem ocultos.</p>
                </div>
                <div className="p-6 border border-white/5 rounded-2xl space-y-2">
                  <h5 className="font-bold text-sm">Sincronização ao Vivo</h5>
                  <p className="text-xs text-muted-foreground">Cada convidado marcado por sua equipe aparecerá instantaneamente no seu dashboard principal.</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'conta' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <Card className="p-5 sm:p-8 border-white/5 shadow-lg space-y-6">
              <div className="flex items-center gap-3 text-amber-500">
                <Shield size={24} />
                <h4 className="font-black uppercase italic tracking-tight">Segurança da Conta</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Sua conta está protegida com criptografia ponta a ponta via Supabase.
              </p>
              <Button
                variant="outline"
                className="w-full h-14 border-amber-500/20 hover:bg-amber-500/5 text-amber-500 font-black uppercase tracking-widest text-xs rounded-2xl"
                onClick={async () => {
                  if (!user?.email) return;
                  const { error } = await resetPassword(user.email);
                  if (!error) {
                    await customAlert({
                      title: "E-mail Enviado!",
                      description: "Um link para redefinição de senha foi enviado para seu e-mail.",
                      type: "success"
                    });
                  }
                }}
              >
                Solicitar Reset de Senha
              </Button>
            </Card>

            {user && (
              <Card className="p-5 sm:p-8 border-white/5 shadow-lg space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-primary">
                    <RefreshCw className={cn(isSyncing && "animate-spin", "sm:w-[24px] sm:h-[24px]")} size={20} />
                    <h4 className="font-black uppercase italic tracking-tight text-base sm:text-lg">Sincronização em Nuvem</h4>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] sm:text-xs py-1 px-3 self-start sm:self-auto max-w-full truncate">
                    Ativo: {user.email}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Todos os seus dados estão sendo salvos automaticamente na nuvem. Você pode forçar uma atualização manual se desejar.
                </p>
                <Button
                  onClick={handleSyncData}
                  disabled={isSyncing}
                  className="w-full h-14 bg-secondary hover:bg-secondary/80 text-foreground font-black uppercase tracking-widest text-xs rounded-2xl"
                >
                  {isSyncing ? "Sincronizando..." : "Sincronizar Manualmente"}
                </Button>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'avancado' && (
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <Card className="p-8 border-red-500/10 bg-red-500/[0.02] shadow-lg border-2 border-dashed space-y-6">
              <div className="flex items-center gap-3 text-red-500">
                <RefreshCw size={24} />
                <h4 className="font-black uppercase italic tracking-tight">Oções de Recuperação</h4>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  CUIDADO: Estas ações são irreversíveis e apagam todos os dados da aplicação, incluindo casamentos, convidados e fornecedores vinculados a esta conta.
                </p>
                <Button
                  variant="destructive"
                  className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/10"
                  onClick={async () => {
                    const isConfirmed = await confirm({
                      title: "CONFIRMAÇÃO CRÍTICA",
                      description: "Esta ação é IRREVERSÍVEL. Digite APAGAR para confirmar a exclusão total e permanente.",
                      requireString: "APAGAR",
                      type: "danger"
                    });
                    if (isConfirmed) {
                      localStorage.removeItem("wedding_manager_data");
                      window.location.reload();
                    }
                  }}
                >
                  Limpar Toda a Base de Dados
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

