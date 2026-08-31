import { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Badge, cn, useConfirm, type ConfirmOptions } from './ui';
import { Save, UserPlus, Shield, Database, RefreshCw, Copy, Check, Lock, Eye, EyeOff, LifeBuoy, Mail, ExternalLink, ClipboardList } from 'lucide-react';
import { maskCurrency, unmaskCurrency } from '../utils/masks';
import { useAuth } from '../hooks/useAuth';
import { SUPPORT_EMAIL, TRANSACTIONAL_FROM_EMAIL } from '../config/support';
import { supabase } from '../lib/supabase';
import { formatDatePt, isRefundWindowOpen } from '../services/subscriptionAccess';
import type { WeddingData } from '../types';

type SettingsTab = 'geral' | 'equipe' | 'conta' | 'suporte' | 'avancado';

interface SettingsViewProps {
  data: WeddingData;
  updateWeddingInfo: (info: Partial<WeddingData['casal']>) => Promise<void>;
  updateConfig: (config: Partial<WeddingData['configuracoes']>) => Promise<void>;
  handleSyncData: () => Promise<void>;
  isSyncing: boolean;
  customAlert: (info: ConfirmOptions) => Promise<void>;
  refreshData: () => Promise<void>;
}

export const SettingsView = ({
  data,
  updateWeddingInfo,
  updateConfig,
  handleSyncData,
  isSyncing,
  customAlert,
  refreshData
}: SettingsViewProps) => {
  const { user, updatePassword } = useAuth();
  const { confirm } = useConfirm();

  // Local state for the form
  const [localData, setLocalData] = useState({
    nome1: data.casal.nome1,
    nome2: data.casal.nome2,
    weddingDate: data.casal.data,
    orcamento: data.configuracoes.orcamentoTotal
  });

  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isRequestingCancellation, setIsRequestingCancellation] = useState(false);

  // Update local state when data changes (initial load)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalData({
      nome1: data.casal.nome1,
      nome2: data.casal.nome2,
      weddingDate: data.casal.data,
      orcamento: data.configuracoes.orcamentoTotal
    });
  }, [data.casal, data.configuracoes]);

  const isDirty = useMemo(() => {
    return (
      localData.nome1 !== data.casal.nome1 ||
      localData.nome2 !== data.casal.nome2 ||
      localData.weddingDate !== data.casal.data ||
      localData.orcamento !== data.configuracoes.orcamentoTotal
    );
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

  const [activeTab, setActiveTab] = useState<SettingsTab>('geral');
  const supportSubject = encodeURIComponent(`Suporte WedPlan - ${data.casal.nome1 || 'Casamento'}`);
  const refundEligible = isRefundWindowOpen(data.refund_window_status);
  const refundWindowEnd = formatDatePt(data.refund_window_ends_at);
  const supportBody = encodeURIComponent([
    'Olá, equipe WedPlan.',
    '',
    'Preciso de ajuda com:',
    '',
    'Detalhes para suporte:',
    `E-mail da conta: ${user?.email || 'não informado'}`,
    `Casamento: ${data.casal.nome1 || '-'} & ${data.casal.nome2 || '-'}`,
    `Wedding ID: ${data.id || 'não informado'}`,
    `Account ID: ${data.account_id || 'não informado'}`,
    `Status da conta: ${data.account_status || data.plan_status || 'não informado'}`,
    `Página atual: ${window.location.href}`,
  ].join('\n'));
  const supportMailto = `mailto:${SUPPORT_EMAIL}?subject=${supportSubject}&body=${supportBody}`;

  const copyCheckinLink = () => {
    const link = `${window.location.origin}/checkin?token=${data.public_checkin_token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancellationRequest = async () => {
    if (!user) return;

    const confirmed = await confirm({
      title: refundEligible ? 'Solicitar cancelamento e reembolso?' : 'Solicitar cancelamento?',
      description: refundEligible
        ? 'Vamos registrar sua solicitação para análise dentro da janela de 7 dias.'
        : 'Vamos registrar sua solicitação de cancelamento para análise do suporte.',
      confirmLabel: 'Enviar solicitação',
      type: 'warning',
    });

    if (!confirmed) return;

    setIsRequestingCancellation(true);
    try {
      const { error } = await supabase
        .from('subscription_cancellation_requests')
        .insert({
          account_id: data.account_id || user.id,
          requested_by: user.id,
          requested_refund: refundEligible,
          refund_window_status_at_request: data.refund_window_status || 'not_started',
          reason: cancellationReason.trim() || null,
          metadata: {
            page: window.location.href,
            planStatus: data.plan_status || data.account_status || null,
            currentPeriodEnd: data.plan_current_period_end || null,
            refundWindowEndsAt: data.refund_window_ends_at || null,
          },
        });

      if (error) throw error;

      setCancellationReason('');
      await customAlert({
        title: 'Solicitação enviada',
        description: refundEligible
          ? 'Registramos seu pedido de cancelamento e reembolso. O suporte vai analisar a solicitação.'
          : 'Registramos seu pedido de cancelamento. O suporte vai analisar a solicitação.',
        type: 'success',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : null;
      await customAlert({
        title: 'Erro ao registrar solicitação',
        description: message || 'Não foi possível registrar o pedido agora. Tente novamente ou fale com o suporte.',
        type: 'danger',
      });
    } finally {
      setIsRequestingCancellation(false);
    }
  };
  
  const handleUpdatePassword = async () => {
    if (!passwordData.newPassword) return;
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      await customAlert({
        title: "Erro",
        description: "As senhas não coincidem.",
        type: "danger"
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      await customAlert({
        title: "Senha Curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        type: "danger"
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await updatePassword(passwordData.newPassword);
      if (error) throw error;
      
      await customAlert({
        title: "Sucesso!",
        description: "Sua senha foi alterada com sucesso.",
        type: "success"
      });
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null;
      await customAlert({
        title: "Erro ao alterar",
        description: message || "Não foi possível alterar sua senha no momento.",
        type: "danger"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const tabs = [
    { id: 'geral', label: 'Geral', icon: Database },
    { id: 'equipe', label: 'Equipe', icon: UserPlus },
    { id: 'conta', label: 'Conta & Nuvem', icon: Shield },
    { id: 'suporte', label: 'Suporte', icon: LifeBuoy },
    { id: 'avancado', label: 'Avançado', icon: RefreshCw },
  ] as const;

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Tab Navigation */}
      <div className="flex flex-nowrap overflow-x-auto no-scrollbar gap-2 p-1.5 bg-secondary/30 rounded-2xl w-full sm:w-fit backdrop-blur-md border border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
              <div className="flex items-center gap-3 text-primary">
                <Lock size={24} />
                <h4 className="font-black uppercase italic tracking-tight">Alterar Senha</h4>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 italic text-left block">Nova Senha</label>
                  <div className="relative group">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      className="h-14 bg-secondary/30 border-white/5 rounded-2xl font-bold transition-all focus:bg-secondary/50 pr-12"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 italic text-left block">Confirmar Nova Senha</label>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Repita a nova senha"
                    className="h-14 bg-secondary/30 border-white/5 rounded-2xl font-bold transition-all focus:bg-secondary/50"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  />
                </div>

                <Button
                  onClick={handleUpdatePassword}
                  disabled={isChangingPassword || !passwordData.newPassword}
                  className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-primary/20"
                >
                  {isChangingPassword ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                  {isChangingPassword ? "Alterando..." : "Atualizar Senha"}
                </Button>
              </div>
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

        {activeTab === 'suporte' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <Card className="p-5 sm:p-8 border-white/5 shadow-lg space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <LifeBuoy size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tight">Suporte WedPlan</h3>
                    <p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">
                      Use este canal para dúvidas sobre assinatura, acesso, dados do casamento, domínio personalizado e funcionamento do sistema.
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="self-start">Canal oficial</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-secondary/20 p-5">
                  <div className="flex items-center gap-3 text-primary">
                    <Mail size={20} />
                    <h4 className="font-black uppercase tracking-widest text-xs">E-mail de suporte</h4>
                  </div>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-3 block break-all text-lg font-black text-foreground hover:text-primary">
                    {SUPPORT_EMAIL}
                  </a>
                  <p className="mt-2 text-xs font-medium leading-5 text-muted-foreground">
                    As respostas oficiais de atendimento devem partir deste endereço.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-secondary/20 p-5">
                  <div className="flex items-center gap-3 text-primary">
                    <Shield size={20} />
                    <h4 className="font-black uppercase tracking-widest text-xs">E-mails transacionais</h4>
                  </div>
                  <p className="mt-3 break-all text-lg font-black text-foreground">{TRANSACTIONAL_FROM_EMAIL}</p>
                  <p className="mt-2 text-xs font-medium leading-5 text-muted-foreground">
                    Confirmações, convites e recuperação de senha devem usar este remetente no SMTP/Auth.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <ClipboardList className="mt-0.5 shrink-0 text-primary" size={20} />
                  <div>
                    <h4 className="font-black text-foreground">Informações incluídas ao abrir chamado</h4>
                    <p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">
                      O botão abaixo abre uma mensagem já preenchida com e-mail da conta, casamento, identificadores internos e página atual para acelerar o atendimento.
                    </p>
                  </div>
                </div>
                <a
                  href={supportMailto}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-primary/90 sm:w-auto"
                >
                  Abrir chamado por e-mail
                  <ExternalLink size={16} />
                </a>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h4 className="font-black text-foreground">Cancelamento e reembolso</h4>
                    <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
                      Teste sem risco por 7 dias. Se a janela ainda estiver aberta, o pedido será registrado como solicitação de cancelamento com reembolso.
                    </p>
                    <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
                      {refundEligible
                        ? `Reembolso elegível${refundWindowEnd ? ` até ${refundWindowEnd}` : ''}`
                        : 'Janela de reembolso encerrada ou indisponível'}
                    </p>
                  </div>
                  <Badge variant={refundEligible ? 'success' : 'warning'} className="self-start">
                    {refundEligible ? 'Dentro dos 7 dias' : 'Fora da janela'}
                  </Badge>
                </div>

                <textarea
                  value={cancellationReason}
                  onChange={(event) => setCancellationReason(event.target.value)}
                  placeholder="Conte brevemente o motivo do cancelamento, se quiser."
                  className="mt-4 min-h-28 w-full rounded-2xl border border-border bg-background p-4 text-sm font-medium outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                />

                <Button
                  onClick={handleCancellationRequest}
                  disabled={isRequestingCancellation}
                  variant="outline"
                  className="mt-4 h-12 w-full rounded-2xl border-amber-500/30 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300 sm:w-auto"
                >
                  {isRequestingCancellation ? 'Enviando...' : refundEligible ? 'Solicitar cancelamento e reembolso' : 'Solicitar cancelamento'}
                </Button>
              </div>
            </Card>
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
                      await refreshData();
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
