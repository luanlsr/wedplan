import { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { parseISO, differenceInDays } from "date-fns";
import { AlertTriangle } from 'lucide-react';

import { AppLayout } from './layout/AppLayout';
import { GlobalModals } from './layout/GlobalModals';
import { Dashboard } from './dashboard';
import { SuppliersList } from './suppliers';
import { SupplierDetails } from './suppliers/SupplierDetails';
import { FinancialView } from './suppliers/FinancialView';
import { PlanningView } from './suppliers/PlanningView';
import { GuestsList } from './guests/GuestsList';
import { TasksList } from './tasks/TasksList';
import { CheckInView } from './guests/CheckInView';
import { SettingsView } from './SettingsView';

import { useWeddingData } from '../hooks/useWeddingData';
import { useAuth } from '../hooks/useAuth';
import { useConfirm } from './ui';
import { useAppModals } from '../hooks/useAppModals';
import { calculateStats, formatDate } from '../utils/calculations';
import { cn } from '../lib/utils';
import type { Installment } from '../types';

export function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const {
    data, loading,
    addSupplier, updateSupplier, deleteSupplier, updateInstallment,
    addGuest, updateGuest, deleteGuest,
    addTask, updateTask, deleteTask,
    updateConfig, updateWeddingInfo, reorderSuppliers
  } = useWeddingData();
  
  const { user, signOut } = useAuth();
  const { confirm, alert: customAlert } = useConfirm();
  const {
    isModalOpen, setIsModalOpen, supplierToEdit,
    isGuestModalOpen, setIsGuestModalOpen, guestToEdit, handleEditGuest,
    isTaskModalOpen, setIsTaskModalOpen, taskToEdit, handleEditTask,
    clearModals
  } = useAppModals();

  const stats = useMemo(() => calculateStats(data), [data]);
  const isDark = data.configuracoes.tema === 'dark';
  const isNewWedding = !!(!loading && data.id && (data.casal.nome1 === 'Cônjuge 1' || !data.casal.nome1) && data.role === 'couple');

  const toggleTheme = () => {
    updateConfig({ tema: isDark ? 'light' : 'dark' });
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
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
    if (path === "/checkin") return "Visão Geral do Evento";
    return "Visão Geral";
  };

  const isPublicMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return !!params.get('token') && !user;
  }, [user]);

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

  return (
    <AppLayout
      isDark={isDark}
      toggleTheme={toggleTheme}
      userRole={data.role || 'couple'}
      isSidebarCollapsed={isSidebarCollapsed}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      isNewWedding={!!isNewWedding}
      onOnboardingComplete={handleOnboardingComplete}
      pageTitle={isPublicMode ? "Check-in de Convidados" : getPageTitle()}
      isPublicMode={isPublicMode}
    >
      <Routes>
        <Route index element={
          isPublicMode ? (
            <CheckInView
              guests={data.convidados || []}
              onTogglePresence={updateGuest}
            />
          ) : (
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
          )
        } />

        <Route path="fornecedores" element={
          <SuppliersList
            suppliers={data.fornecedores}
            onAdd={() => setIsModalOpen(true)}
            onSelect={(s) => navigate(`/fornecedores/${s.id}`)}
            onReorder={reorderSuppliers}
          />
        } />

        <Route path="fornecedores/:id" element={
          <SupplierDetails 
            suppliers={data.fornecedores}
            updateInstallment={updateInstallment}
            deleteSupplier={deleteSupplier}
            confirm={confirm}
            onToggleStatus={handleToggleStatus}
          />
        } />

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

      <GlobalModals
        isModalOpen={isModalOpen}
        supplierToEdit={supplierToEdit}
        weddingDate={data.casal.data}
        addSupplier={addSupplier}
        updateSupplier={updateSupplier}
        isGuestModalOpen={isGuestModalOpen}
        guestToEdit={guestToEdit}
        addGuest={addGuest}
        updateGuest={updateGuest}
        isTaskModalOpen={isTaskModalOpen}
        taskToEdit={taskToEdit}
        addTask={addTask}
        updateTask={updateTask}
        onClose={clearModals}
      />
    </AppLayout>
  );
}
