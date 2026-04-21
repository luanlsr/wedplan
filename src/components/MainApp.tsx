import { useState, useMemo, useEffect } from 'react';
import { cn } from '../lib/utils';
import confetti from 'canvas-confetti';
import { Sidebar, Header, BottomNav } from './layout/index';
import { Dashboard } from './dashboard';
import { SuppliersList } from './suppliers';
import { FinancialView } from './suppliers/FinancialView';
import { PlanningView } from './suppliers/PlanningView';
import { SupplierModal } from './suppliers/AddSupplierModal';
import { GuestsList } from './guests/GuestsList';
import { AddGuestModal } from './guests/AddGuestModal';
import { TasksList } from './tasks/TasksList';
import { AddTaskModal } from './tasks/AddTaskModal';
import { CheckInView } from './guests/CheckInView';
import { Onboarding } from './layout/Onboarding';
import { SettingsView } from './SettingsView';
import { useWeddingData } from '../hooks/useWeddingData';
import { calculateStats, formatCurrency, formatDate } from '../utils/calculations';
import type { Supplier, Installment, Guest, Task } from '../types';
import { Card, Button, Badge, Input, useConfirm } from './ui';
import { ChevronLeft, CheckCircle2, Circle, Calendar, Printer, Download, Share2, Heart, DollarSign, FileText, Edit2, Clock, AlertTriangle, Info, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { parseISO, differenceInDays } from "date-fns";
import { maskCurrency, unmaskCurrency } from '../utils/masks';

import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';

const SortButton = ({ active, onClick, label, direction }: { active: boolean, onClick: () => void, label: string, direction?: 'asc' | 'desc' | null }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
      active ? "bg-primary text-white" : "bg-card text-muted-foreground border border-white/5 hover:bg-secondary"
    )}
  >
    {label}
    {!direction ? <ArrowUpDown size={10} className="opacity-30" /> :
      direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
  </button>
);

export function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const {
    data, loading,
    addSupplier, updateSupplier, deleteSupplier, updateInstallment,
    addGuest, updateGuest, deleteGuest,
    addTask, updateTask, deleteTask,
    updateConfig, updateWeddingInfo, reorderSuppliers
  } = useWeddingData();
  const { user, signOut } = useAuth();
  const { confirm, alert: customAlert } = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [editingInstallmentId, setEditingInstallmentId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const stats = useMemo(() => calculateStats(data), [data]);
  const isDark = data.configuracoes.tema === 'dark';
  
  // Condição para mostrar onboarding: NOMES PADRÃO e NÃO É STAFF/MASTER
  const isNewWedding = !loading && data.id && (data.casal.nome1 === 'Cônjuge 1' || !data.casal.nome1) && data.role === 'couple';

  const toggleTheme = () => {
    updateConfig({ tema: isDark ? 'light' : 'dark' });
  };

  // Sincronizar tema com a classe HTML
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Logout automático se o usuário for removido do banco ou sessão estiver órfã
  useEffect(() => {
    // Se terminou de carregar, o usuário está autenticado mas não temos ID de casamento vinculado
    // Isso indica que o registro no banco foi removido mas a sessão auth ainda existe.
    if (!loading && user && !data.id) {
      console.warn('Sessão órfã detectada. Realizando logout automático...');
      signOut().then(() => navigate('/login'));
    }
  }, [loading, user, data.id, signOut, navigate]);

  const handleSyncData = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const { migrateLocalStorageToSupabase } = await import('../services/migrationService');
      const result = await migrateLocalStorageToSupabase(user.id, data);
      if (result.success) {
        await customAlert({
          title: "Sincronização Concluída",
          description: "Dados sincronizados com sucesso na nuvem! O aplicativo será recarregado.",
          type: "success",
          confirmLabel: "OK",
        });
        window.location.reload();
      } else {
        await customAlert({
          title: "Erro na Sincronização",
          description: "Ocorreu um erro ao sincronizar os dados. Tente novamente mais tarde.",
          type: "danger",
          confirmLabel: "Entendido",
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncing(false);
    }
  };

  const notifications = useMemo(() => {
    const today = new Date();
    const alerts: { type: 'warning' | 'info', message: string, supplier: string }[] = [];

    data.fornecedores.forEach(s => {
      if (s.status === 'pago') return;
      const lastInstallment = s.parcelas[s.parcelas.length - 1];
      if (!lastInstallment) return;
      const dueDate = parseISO(lastInstallment.dataVencimento);
      const daysDiff = differenceInDays(dueDate, today);

      if (daysDiff > 0 && daysDiff <= 15) {
        alerts.push({ type: 'warning', message: `Quitação final em ${daysDiff} dias (${formatDate(lastInstallment.dataVencimento)})!`, supplier: s.fornecedor });
      } else if (daysDiff > 15 && daysDiff <= 30) {
        alerts.push({ type: 'info', message: `Quitação final em aproximadamente 1 mês (${formatDate(lastInstallment.dataVencimento)}).`, supplier: s.fornecedor });
      }
    });

    return alerts;
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">Carregando WedPlan...</p>
        </div>
      </div>
    );
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setSupplierToEdit(supplier);
    setIsModalOpen(true);
  };

  const clearModal = () => {
    setIsModalOpen(false);
    setSupplierToEdit(null);
    setIsGuestModalOpen(false);
    setGuestToEdit(null);
    setIsTaskModalOpen(false);
    setTaskToEdit(null);
  };

  const handleEditGuest = (guest: Guest) => {
    setGuestToEdit(guest);
    setIsGuestModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleOnboardingComplete = async (onboardingData: { nome1: string, nome2: string, data: string, orcamento: number }) => {
    try {
      await updateWeddingInfo({
        nome1: onboardingData.nome1,
        nome2: onboardingData.nome2,
        data: onboardingData.data
      });
      await updateConfig({
        orcamentoTotal: onboardingData.orcamento
      });
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a8863d', '#ffffff', '#e0c090']
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = (supplierId: string, p: Installment) => {
    const newStatus = p.status === 'pago' ? 'pendente' : 'pago';
    updateInstallment(supplierId, p.id, {
      status: newStatus,
      dataPagamento: newStatus === 'pago' ? new Date().toISOString().split("T")[0] : undefined
    });

    if (newStatus === 'pago') {
      const supplier = data.fornecedores.find(s => s.id === supplierId);
      if (supplier) {
        const remaining = supplier.parcelas.filter(inst => inst.status !== 'pago' && inst.id !== p.id);
        if (remaining.length === 0) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3');
          audio.volume = 0.5;
          audio.play().catch(e => console.log("Audio play blocked", e));

          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ffffff'],
            scalar: 1.2
          });
        }
      }
    }
  };

  const handleDashboardAction = (action: 'new_supplier' | 'financial' | 'settings') => {
    switch (action) {
      case 'new_supplier':
        setIsModalOpen(true);
        break;
      case 'financial':
        navigate('/financeiro');
        break;
      case 'settings':
        navigate('/configuracoes');
        break;
    }
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/fornecedores/')) return "Detalhes do Fornecedor";
    if (path === "/fornecedores") return "Lista de Fornecedores";
    if (path === "/convidados") return "Lista de Convidados";
    if (path === "/tarefas") return "Minhas Tarefas";
    if (path === "/financeiro") return "Fluxo de Caixa";
    if (path === "/planejamento") return "Planejamento Financeiro";
    if (path === "/configuracoes") return "Configurações";
    return "Visão Geral";
  };

  const SupplierDetailsWrapper = () => {
    const { id } = useParams();
    const currentSupplier = data.fornecedores.find(s => s.id === id);
    const [instSort, setInstSort] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'numero', direction: 'asc' });

    if (!currentSupplier) return <Navigate to="/fornecedores" />;

    const sortedInstallments = [...currentSupplier.parcelas].sort((a, b) => {
      const valA = a[instSort.key as keyof typeof a] ?? '';
      const valB = b[instSort.key as keyof typeof b] ?? '';
      if (valA < valB) return instSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return instSort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    const toggleInstSort = (key: string) => {
      setInstSort(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
      }));
    };

    const handlePrint = () => window.print();
    const handleExportCSV = (supplier: Supplier) => {
      const headers = ["Numero", "Vencimento", "Valor", "Status", "Data Pagamento"];
      const rows = supplier.parcelas.map(p => [p.numero, p.dataVencimento, p.valor.toFixed(2), p.status, p.dataPagamento || "-"]);
      const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `cronograma_${supplier.fornecedor.toLowerCase().replace(/\s+/g, '_')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const finalDeadline = currentSupplier.parcelas[currentSupplier.parcelas.length - 1].dataVencimento;

    return (
      <div className="space-y-6 max-w-full mx-auto animate-in fade-in slide-in-from-left-4 duration-500 pb-20 print:p-0">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Button variant="outline" onClick={() => navigate('/fornecedores')}>
            <ChevronLeft size={18} />
            Voltar para lista
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => handleEditSupplier(currentSupplier)}>
            <Edit2 size={16} />
            Editar Fornecedor
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <Card className="border-none shadow-xl bg-card p-8 print:shadow-none print:border print:p-4">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <Badge variant="default" className="bg-primary/10 text-primary border-none mb-2 print:border">
                    {currentSupplier.categoria}
                  </Badge>
                  <h2 className="text-4xl font-black text-foreground print:text-2xl">{currentSupplier.fornecedor}</h2>
                  <p className="text-lg text-muted-foreground font-medium print:text-sm">{currentSupplier.servico}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-muted-foreground uppercase mb-1">Limite de Quitação</p>
                  <div className="flex items-center gap-2 justify-end text-amber-500 font-black text-xl print:text-lg">
                    <Clock size={20} />
                    {formatDate(finalDeadline)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 rounded-3xl bg-secondary/30 border border-border print:bg-white print:grid-cols-3 print:gap-4 print:p-4">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Valor Total</p>
                  <p className="text-2xl font-black print:text-xl">{formatCurrency(currentSupplier.valorTotal)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Tipo de Pagamento</p>
                  <p className="text-xl font-bold capitalize print:text-base">{currentSupplier.tipoPagamento.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Status Global</p>
                  <div>
                    {currentSupplier.status === 'pago' ? <Badge variant="success">Liquidado</Badge> :
                      currentSupplier.status === 'parcial' ? <Badge variant="warning" className="bg-amber-500/10 text-amber-500">Parcial</Badge> :
                        <Badge variant="default" className="bg-slate-500/10 text-slate-500">Pendente</Badge>}
                  </div>
                </div>
              </div>
            </Card>

            {(currentSupplier.regraPagamento || currentSupplier.observacoes) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentSupplier.regraPagamento && (
                  <Card className="border-none shadow-lg bg-card p-6 border-l-4 border-primary">
                    <div className="flex items-center gap-2 mb-3 text-primary">
                      <DollarSign size={18} />
                      <h4 className="font-extrabold text-sm uppercase tracking-wider">Regra de Pagamento</h4>
                    </div>
                    <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                      {currentSupplier.regraPagamento}
                    </p>
                  </Card>
                )}
                {currentSupplier.observacoes && (
                  <Card className="border-none shadow-lg bg-card p-6 border-l-4 border-amber-500">
                    <div className="flex items-center gap-2 mb-3 text-amber-500">
                      <Info size={18} />
                      <h4 className="font-extrabold text-sm uppercase tracking-wider">Observações do Contrato</h4>
                    </div>
                    <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                      {currentSupplier.observacoes}
                    </p>
                  </Card>
                )}
              </div>
            )}

            <Card className="border-none shadow-xl bg-card p-8 print:shadow-none print:border print:p-4">
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <h3 className="text-2xl font-black text-foreground print:text-xl">Cronograma</h3>
                  <div className="flex gap-1 p-1 bg-secondary/20 rounded-xl border border-white/5 print:hidden">
                    <SortButton active={instSort.key === 'numero'} onClick={() => toggleInstSort('numero')} label="#" direction={instSort.key === 'numero' ? instSort.direction : null} />
                    <SortButton active={instSort.key === 'dataVencimento'} onClick={() => toggleInstSort('dataVencimento')} label="Data" direction={instSort.key === 'dataVencimento' ? instSort.direction : null} />
                    <SortButton active={instSort.key === 'valor'} onClick={() => toggleInstSort('valor')} label="Valor" direction={instSort.key === 'valor' ? instSort.direction : null} />
                  </div>
                </div>
                <div className="flex gap-2 print:hidden">
                  <Button variant="outline" className="h-10 text-sm" onClick={handlePrint}><Printer size={16} /> Imprimir</Button>
                  <Button variant="outline" className="h-10 text-sm" onClick={() => handleExportCSV(currentSupplier)}><Download size={16} /> Exportar</Button>
                </div>
              </div>

              <div className="space-y-4">
                {sortedInstallments.map((p) => {
                  const isEditing = editingInstallmentId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "flex flex-col p-5 rounded-2xl border-2 transition-all duration-300",
                        p.status === 'pago' ? "bg-green-500/10 border-green-500/20" : "bg-card border-border hover:border-primary/5"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <button
                            onClick={() => handleToggleStatus(currentSupplier.id, p)}
                            className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm",
                              p.status === 'pago' ? "bg-green-500 text-white" : "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            )}
                          >
                            {p.status === 'pago' ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                          </button>
                          <div>
                            <p className="font-black text-lg text-foreground">Parcela {p.numero}</p>
                            <div className="flex items-center gap-4 text-sm font-medium">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Calendar size={14} /> Venc: {formatDate(p.dataVencimento)}
                              </span>
                              {p.dataPagamento && (
                                <span className="text-green-600 flex items-center gap-1">
                                  <DollarSign size={14} /> Pago em: {formatDate(p.dataPagamento)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={cn("text-xl font-black font-mono", p.status === 'pago' ? "text-green-600" : "text-foreground")}>
                              {formatCurrency(p.valor)}
                            </p>
                          </div>
                          <button
                            onClick={() => setEditingInstallmentId(isEditing ? null : p.id)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-primary"
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="mt-6 pt-6 border-t border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-300">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Valor da Parcela</label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                              <Input
                                type="text"
                                className="pl-8 h-10 text-sm font-bold"
                                value={maskCurrency(p.valor)}
                                onChange={(e) => updateInstallment(currentSupplier.id, p.id, { valor: unmaskCurrency(e.target.value) })}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Vencimento</label>
                            <Input
                              type="date"
                              className="h-10 text-sm"
                              value={p.dataVencimento}
                              onChange={(e) => updateInstallment(currentSupplier.id, p.id, { dataVencimento: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Data do Pagamento</label>
                            <Input
                              type="date"
                              className="h-10 text-sm border-primary/20 bg-primary/5"
                              value={p.dataPagamento || ""}
                              onChange={(e) => updateInstallment(currentSupplier.id, p.id, {
                                dataPagamento: e.target.value,
                                status: e.target.value ? "pago" : "pendente"
                              })}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div className="w-full lg:w-96 space-y-6">
            <Card className="bg-primary text-white border-none shadow-2xl p-8 overflow-hidden relative">
              <Heart className="absolute -right-4 -bottom-4 text-white/10" size={160} />
              <h3 className="text-xl font-bold mb-6 relative z-10">Resumo Financeiro</h3>
              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-center pb-4 border-b border-white/20">
                  <span className="text-white/80 font-medium">Contratado</span>
                  <span className="font-black text-lg font-mono">{formatCurrency(currentSupplier.valorTotal)}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-white/20">
                  <span className="text-white/80 font-medium">Total Pago</span>
                  <span className="font-black text-lg font-mono text-green-300">
                    {formatCurrency(currentSupplier.parcelas.reduce((acc, p) => p.status === 'pago' ? acc + p.valor : acc, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80 font-medium">Pendente</span>
                  <span className="font-black text-xl font-mono">
                    {formatCurrency(currentSupplier.parcelas.reduce((acc, p) => p.status === 'pendente' ? acc + p.valor : acc, 0))}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="border-none shadow-xl bg-card p-6">
              <h4 className="font-bold mb-4">Ações do Fornecedor</h4>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start font-bold h-12">
                  <FileText size={18} /> Ver Contrato
                </Button>
                <Button variant="outline" className="w-full justify-start font-bold h-12">
                  <Share2 size={18} /> Compartilhar Dados
                </Button>
                <Button variant="destructive" className="w-full justify-start font-bold h-12" onClick={async () => {
                  const isConfirmed = await confirm({
                    title: "Excluir Fornecedor?",
                    description: `Tem certeza que deseja excluir "${currentSupplier.fornecedor}"? Isso removerá todos os dados e parcelas associadas permanentemente.`,
                    type: "danger",
                    confirmLabel: "Sim, Excluir",
                    cancelLabel: "Cancelar",
                  });
                  if (isConfirmed) {
                    deleteSupplier(currentSupplier.id);
                    navigate('/fornecedores');
                  }
                }}>
                  Remover Fornecedor
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className={cn("min-h-screen transition-colors duration-500 flex flex-col lg:flex-row", isDark ? "dark bg-background text-foreground" : "bg-slate-50 text-slate-900")}>
      <Sidebar
        isDark={isDark}
        toggleTheme={toggleTheme}
        userRole={data.role}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {isNewWedding && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      <main className={cn(
        "flex-1 min-h-screen pb-24 lg:pb-10 transition-all duration-500 ease-in-out",
        isSidebarCollapsed ? "lg:ml-24" : "lg:ml-72"
      )}>
        <div className="max-w-[1600px] mx-auto p-3 sm:p-6 lg:p-10">
          <Header title={getPageTitle()} />

          <Routes>
            <Route index element={
              <div className="space-y-6">
                {notifications.length > 0 && (
                  <div className="space-y-3">
                    {notifications.map((n, i) => (
                      <div key={i} className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border animate-in slide-in-from-top-4 duration-500",
                        n.type === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400"
                      )}>
                        <AlertTriangle size={20} />
                        <div className="flex-1">
                          <span className="font-black uppercase text-[10px] block leading-none mb-1">Alerta de Quitação</span>
                          <p className="text-sm font-bold"><strong>{n.supplier}</strong>: {n.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Dashboard stats={stats} onAction={handleDashboardAction} />
              </div>
            } />

            <Route path="fornecedores" element={
              <SuppliersList
                suppliers={data.fornecedores}
                onAdd={() => setIsModalOpen(true)}
                onSelect={(s) => navigate(`/fornecedores/${s.id}`)}
                onReorder={reorderSuppliers}
              />
            } />

            <Route path="fornecedores/:id" element={<SupplierDetailsWrapper />} />

            <Route path="financeiro" element={<FinancialView suppliers={data.fornecedores} />} />

            <Route path="convidados" element={
              <GuestsList
                guests={data.convidados || []}
                onAdd={() => setIsGuestModalOpen(true)}
                onEdit={handleEditGuest}
                onUpdate={updateGuest}
                onDelete={deleteGuest}
              />
            } />

            <Route path="tarefas" element={
              <TasksList
                tasks={data.tarefas || []}
                onAdd={() => setIsTaskModalOpen(true)}
                onEdit={handleEditTask}
                onUpdate={updateTask}
                onDelete={deleteTask}
              />
            } />

            <Route path="planejamento" element={
              <PlanningView
                suppliers={data.fornecedores}
                weddingDate={data.casal.data}
                simulation={data.simulation}
                onUpdateSimulation={() => { }}
              />
            } />

            <Route path="checkin" element={
              <CheckInView
                guests={data.convidados || []}
                suppliers={data.fornecedores || []}
                onTogglePresence={updateGuest}
              />
            } />

            <Route path="configuracoes" element={
              <SettingsView
                data={data}
                updateWeddingInfo={updateWeddingInfo}
                updateConfig={updateConfig}
                handleSyncData={handleSyncData}
                isSyncing={isSyncing}
                customAlert={customAlert}
              />
            } />
          </Routes>
        </div>
      </main>

      <BottomNav userRole={data.role} />

      {isModalOpen && (
        <SupplierModal
          weddingDate={data.casal.data}
          onClose={clearModal}
          onAdd={addSupplier}
          onUpdate={updateSupplier}
          editSupplier={supplierToEdit}
        />
      )}

      {isGuestModalOpen && (
        <AddGuestModal
          onClose={clearModal}
          onAdd={addGuest}
          onUpdate={updateGuest}
          editGuest={guestToEdit}
        />
      )}

      {isTaskModalOpen && (
        <AddTaskModal
          onClose={clearModal}
          onAdd={addTask}
          onUpdate={updateTask}
          editTask={taskToEdit}
        />
      )}
    </div>
  );
}
