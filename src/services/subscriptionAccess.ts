import { supabase } from '../lib/supabase';

export type AccountAccessStatus = 'trial' | 'active' | 'pending_payment' | 'past_due' | 'canceled' | 'expired' | null | undefined;

export const isAccountAccessBlocked = (status: AccountAccessStatus) =>
  ['pending_payment', 'past_due', 'canceled', 'expired'].includes(String(status || ''));

export const isRefundWindowOpen = (status?: string | null) => status === 'eligible';

export const formatDatePt = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
};

export const getAccountAccessTitle = (status: AccountAccessStatus) => {
  if (status === 'past_due') return 'Assinatura vencida';
  if (status === 'canceled' || status === 'expired') return 'Assinatura cancelada';
  return 'Ativação de conta';
};

export const getAccountAccessMessage = (status: AccountAccessStatus, currentPeriodEnd?: string | null) => {
  const formattedDate = formatDatePt(currentPeriodEnd);

  if (status === 'past_due') {
    return formattedDate
      ? `Identificamos que o ciclo pago terminou em ${formattedDate}. Renove a assinatura para continuar usando todos os recursos do WedPlan.`
      : 'Identificamos uma pendência na assinatura. Renove o pagamento para continuar usando todos os recursos do WedPlan.';
  }

  if (status === 'canceled' || status === 'expired') {
    return 'Sua assinatura não está ativa no momento. Gere uma nova assinatura para voltar a usar o WedPlan.';
  }

  return 'Sua conta está aguardando a confirmação de pagamento para liberar o acesso total ao WedPlan.';
};

export const syncSubscriptionAccess = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('sync-subscription-access', {
      body: { source: 'app_login' },
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('[subscriptionAccess] Não foi possível sincronizar assinatura agora:', error);
    return null;
  }
};
