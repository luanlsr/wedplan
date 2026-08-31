// @ts-nocheck
// Sincroniza acesso de assinatura no login sem expor a chave do Asaas ao frontend.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ASAAS_BASE_URL = 'https://api.asaas.com/v3'
const paidPaymentStatuses = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])
const overduePaymentStatuses = new Set(['OVERDUE'])

const safeJson = async (res: Response) => {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

const addCycle = (dateValue: string | null, billingInterval = 'monthly') => {
  if (!dateValue) return null
  const base = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(base.getTime())) return null
  if (billingInterval === 'yearly') base.setFullYear(base.getFullYear() + 1)
  else base.setMonth(base.getMonth() + 1)
  return base.toISOString().split('T')[0]
}

const endOfDay = (dateValue: string | null) => {
  if (!dateValue) return null
  return `${dateValue}T23:59:59-03:00`
}

const getRefundStatus = (subscription: any) => {
  if (['requested', 'refunded', 'denied'].includes(subscription?.refund_window_status)) {
    return subscription.refund_window_status
  }
  if (!subscription?.refund_window_ends_at) return 'not_started'
  return new Date(subscription.refund_window_ends_at).getTime() >= Date.now() ? 'eligible' : 'expired'
}

const providerStatusToPlanStatus = (status: string | null) => {
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'ACTIVE') return 'active'
  if (normalized === 'OVERDUE') return 'past_due'
  if (['INACTIVE', 'DELETED', 'CANCELED', 'CANCELLED', 'EXPIRED'].includes(normalized)) return 'canceled'
  return null
}

const accountStatusFromPlanStatus = (status: string) => {
  if (status === 'active' || status === 'trialing') return 'active'
  if (status === 'past_due') return 'past_due'
  if (status === 'canceled' || status === 'expired') return 'canceled'
  return 'pending_payment'
}

const refreshFromDatabase = async (adminClient: any, accountId: string) => {
  await adminClient.rpc('refresh_subscription_access_state', { p_account_id: accountId })
  const { data: subscription } = await adminClient
    .from('subscriptions')
    .select('id, status, current_period_end, access_expires_at, refund_window_status, refund_window_ends_at, last_status_checked_at')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return subscription
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Sessão expirada')

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) throw new Error('Sessão expirada')

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, account_id, plan_id, plan_status, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) throw profileError

    const accountId = profile?.account_id || user.id
    const { data: subscription, error: subscriptionError } = await adminClient
      .from('subscriptions')
      .select('id, account_id, plan_id, status, billing_interval, asaas_subscription_id, current_period_start, current_period_end, access_expires_at, refund_window_started_at, refund_window_ends_at, refund_window_status, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscriptionError) throw subscriptionError

    if (!subscription) {
      return new Response(JSON.stringify({
        success: true,
        hasSubscription: false,
        status: profile?.plan_status || 'pending_payment',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const apiKey = Deno.env.get('ASAAS_API_KEY')
    const isTestSubscription = String(subscription.asaas_subscription_id || '').startsWith('test_')
    if (!apiKey || isTestSubscription || !subscription.asaas_subscription_id) {
      const refreshed = await refreshFromDatabase(adminClient, accountId)
      return new Response(JSON.stringify({
        success: true,
        source: isTestSubscription ? 'test_subscription' : 'database',
        hasSubscription: true,
        status: refreshed?.status || subscription.status,
        currentPeriodEnd: refreshed?.current_period_end || subscription.current_period_end,
        accessExpiresAt: refreshed?.access_expires_at || subscription.access_expires_at,
        refundWindowStatus: refreshed?.refund_window_status || getRefundStatus(subscription),
        refundWindowEndsAt: refreshed?.refund_window_ends_at || subscription.refund_window_ends_at,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const [subscriptionRes, paymentsRes] = await Promise.all([
      fetch(`${ASAAS_BASE_URL}/subscriptions/${subscription.asaas_subscription_id}`, {
        headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
      }),
      fetch(`${ASAAS_BASE_URL}/payments?subscription=${subscription.asaas_subscription_id}&limit=10`, {
        headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
      }),
    ])

    const providerSubscription = await safeJson(subscriptionRes)
    const providerPayments = await safeJson(paymentsRes)

    if (!subscriptionRes.ok) {
      console.warn('[sync-subscription-access] Falha ao consultar assinatura Asaas:', providerSubscription)
      const refreshed = await refreshFromDatabase(adminClient, accountId)
      return new Response(JSON.stringify({
        success: true,
        source: 'database_fallback',
        warning: 'asaas_subscription_lookup_failed',
        status: refreshed?.status || subscription.status,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const payments = Array.isArray(providerPayments?.data) ? providerPayments.data : []
    const latestPaidPayment = payments.find((payment: any) => paidPaymentStatuses.has(String(payment.status || '').toUpperCase()))
    const latestPayment = payments[0] || latestPaidPayment || null
    const latestDueDate = latestPaidPayment?.dueDate || latestPaidPayment?.originalDueDate || null
    const nextPeriodEnd = addCycle(latestDueDate, subscription.billing_interval)
    const providerStatus = providerStatusToPlanStatus(providerSubscription?.status)
    const periodExpired = nextPeriodEnd ? new Date(`${nextPeriodEnd}T23:59:59`).getTime() < Date.now() : false
    const latestOverdue = latestPayment && overduePaymentStatuses.has(String(latestPayment.status || '').toUpperCase())

    let status = providerStatus || subscription.status
    if (latestPaidPayment) status = periodExpired ? 'past_due' : 'active'
    else if (latestOverdue || providerStatus === 'past_due') status = 'past_due'
    else if (providerStatus === 'canceled') status = 'canceled'

    const currentPeriodStart = latestDueDate || subscription.current_period_start || null
    const currentPeriodEnd = nextPeriodEnd || subscription.current_period_end || null
    const refundWindowStartedAt = subscription.refund_window_started_at || subscription.created_at || new Date().toISOString()
    const refundWindowEndsAt = subscription.refund_window_ends_at || new Date(new Date(refundWindowStartedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const refundWindowStatus = getRefundStatus({
      ...subscription,
      refund_window_ends_at: refundWindowEndsAt,
    })

    const updatePayload = {
      status,
      current_period_start: currentPeriodStart,
      current_period_end: currentPeriodEnd,
      access_expires_at: endOfDay(currentPeriodEnd),
      last_payment_id: latestPayment?.id || subscription.last_payment_id || null,
      last_payment_status: latestPayment?.status || null,
      last_payment_at: latestPaidPayment?.paymentDate ? `${latestPaidPayment.paymentDate}T12:00:00-03:00` : latestPaidPayment?.confirmedDate ? `${latestPaidPayment.confirmedDate}T12:00:00-03:00` : null,
      last_status_checked_at: new Date().toISOString(),
      last_status_source: 'asaas_login_sync',
      refund_window_started_at: refundWindowStartedAt,
      refund_window_ends_at: refundWindowEndsAt,
      refund_window_status: refundWindowStatus,
      refund_window_checked_at: new Date().toISOString(),
    }

    const { error: updateError } = await adminClient
      .from('subscriptions')
      .update(updatePayload)
      .eq('id', subscription.id)

    if (updateError) throw updateError

    await adminClient
      .from('profiles')
      .update({
        plan_id: subscription.plan_id,
        plan_status: status,
        billing_interval: subscription.billing_interval,
        plan_current_period_start: currentPeriodStart,
        plan_current_period_end: currentPeriodEnd,
        plan_access_expires_at: endOfDay(currentPeriodEnd),
        plan_access_checked_at: new Date().toISOString(),
        plan_access_source: 'asaas_login_sync',
        refund_window_started_at: refundWindowStartedAt,
        refund_window_ends_at: refundWindowEndsAt,
        refund_window_status: refundWindowStatus,
      })
      .or(`id.eq.${user.id},account_id.eq.${accountId}`)

    await adminClient
      .from('accounts')
      .update({ status: accountStatusFromPlanStatus(status), updated_at: new Date().toISOString() })
      .eq('id', accountId)

    return new Response(JSON.stringify({
      success: true,
      source: 'asaas',
      hasSubscription: true,
      status,
      currentPeriodEnd,
      accessExpiresAt: endOfDay(currentPeriodEnd),
      refundWindowStatus,
      refundWindowEndsAt,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[sync-subscription-access] Erro:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
