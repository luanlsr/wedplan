// @ts-nocheck
// supabase/functions/asaas-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
  'Access-Control-Max-Age': '86400',
}

const paidEvents = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])
const overdueEvents = new Set(['PAYMENT_OVERDUE'])
const canceledEvents = new Set(['PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'SUBSCRIPTION_DELETED'])
const supportEmail = Deno.env.get('SUPPORT_EMAIL') || 'suporte@wedplan.com.br'
const transactionalFromEmail = Deno.env.get('TRANSACTIONAL_FROM_EMAIL') || supportEmail

const normalizeEmail = (email: string) => String(email || '').trim().toLowerCase()

const addBillingCycle = (dateValue: string | null, billingInterval = 'monthly') => {
  if (!dateValue) return null
  const date = new Date(`${dateValue}T12:00:00`)
  if (Number.isNaN(date.getTime())) return null
  if (billingInterval === 'yearly') date.setFullYear(date.getFullYear() + 1)
  else date.setMonth(date.getMonth() + 1)
  return date.toISOString().split('T')[0]
}

const endOfDay = (dateValue: string | null) => {
  if (!dateValue) return null
  return `${dateValue}T23:59:59-03:00`
}

const getPaymentReferenceDate = (payment: any) =>
  payment?.dueDate || payment?.originalDueDate || payment?.paymentDate || payment?.confirmedDate || new Date().toISOString().split('T')[0]

const getRefundWindowStatus = (endsAt: string | null, existingStatus?: string | null) => {
  if (['requested', 'refunded', 'denied'].includes(existingStatus || '')) return existingStatus
  if (!endsAt) return 'not_started'
  return new Date(endsAt).getTime() >= Date.now() ? 'eligible' : 'expired'
}

const recordEvent = async (client: any, event: any) => {
  try {
    await client.from('app_events').insert({
      source: 'edge:asaas-webhook',
      occurred_at: new Date().toISOString(),
      ...event,
    })
  } catch (error) {
    console.warn('[Asaas Webhook] Observabilidade indisponível:', error.message)
  }
}

const checkoutStatusFromSubscriptionStatus = (status: string) => {
  if (status === 'active') return 'paid'
  if (status === 'canceled') return 'canceled'
  if (status === 'past_due') return 'failed'
  return 'payment_pending'
}

const findAuthUserByEmail = async (adminClient: any, email: string) => {
  const normalizedEmail = normalizeEmail(email)
  let page = 1

  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error

    const user = data?.users?.find((item: any) => normalizeEmail(item.email) === normalizedEmail)
    if (user) return user
    if (!data?.users || data.users.length < 1000) return null
    page += 1
  }

  return null
}

const getOrInviteUser = async (adminClient: any, checkout: any) => {
  if (checkout.created_user_id) return checkout.created_user_id

  const existingUser = await findAuthUserByEmail(adminClient, checkout.email)
  if (existingUser?.id) return existingUser.id

  const redirectTo = Deno.env.get('SUPABASE_AUTH_REDIRECT_URL') || `${Deno.env.get('PUBLIC_SITE_URL') || ''}/reset-password`
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(checkout.email, {
    data: {
      full_name: checkout.full_name,
      checkout_session_id: checkout.id,
      plan_id: checkout.plan_id,
      support_email: supportEmail,
      transactional_from_email: transactionalFromEmail,
    },
    redirectTo,
  })

  if (error) {
    const userAfterInviteError = await findAuthUserByEmail(adminClient, checkout.email)
    if (userAfterInviteError?.id) return userAfterInviteError.id
    throw error
  }

  return data?.user?.id
}

const getSecondNameFromWeddingName = (weddingName: string) => {
  const parts = String(weddingName || '').split('&')
  return parts[1]?.trim() || ''
}

const applyWeddingDraft = async (adminClient: any, checkout: any, userId: string) => {
  const draft = checkout.metadata?.weddingDraft
  if (!draft) return null

  const coupleName1 = String(draft.partnerName || checkout.full_name || '').trim()
  const coupleName2 = getSecondNameFromWeddingName(draft.weddingName)
  const weddingDate = draft.weddingDate || null

  if (!coupleName1 && !coupleName2 && !weddingDate) return null

  const { data: wedding, error } = await adminClient
    .from('weddings')
    .upsert({
      owner_id: userId,
      couple_name1: coupleName1,
      couple_name2: coupleName2,
      wedding_date: weddingDate,
      account_id: userId,
    }, { onConflict: 'owner_id' })
    .select('id')
    .single()

  if (error) {
    console.warn('[Asaas Webhook] Não foi possível aplicar rascunho do casamento:', error.message)
    return null
  }

  if (wedding?.id) {
    await adminClient
      .from('profiles')
      .update({ wedding_id: wedding.id })
      .eq('id', userId)
  }

  return wedding?.id || null
}

const updateAccountAndSubscription = async (adminClient: any, checkout: any, userId: string, payment: any, status: string) => {
  const asaasCustomerId = payment?.customer || checkout.asaas_customer_id
  const asaasSubscriptionId = payment?.subscription || checkout.asaas_subscription_id
  const periodStart = getPaymentReferenceDate(payment)
  const periodEnd = status === 'active'
    ? addBillingCycle(periodStart, checkout.billing_interval)
    : payment?.dueDate || payment?.originalDueDate || checkout.plan_current_period_end || null

  const { data: existingSubscription } = asaasSubscriptionId
    ? await adminClient
        .from('subscriptions')
        .select('id, refund_window_started_at, refund_window_ends_at, refund_window_status')
        .eq('asaas_subscription_id', asaasSubscriptionId)
        .maybeSingle()
    : { data: null }

  const refundWindowStartedAt = existingSubscription?.refund_window_started_at || new Date().toISOString()
  const refundWindowEndsAt = existingSubscription?.refund_window_ends_at || new Date(new Date(refundWindowStartedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const refundWindowStatus = getRefundWindowStatus(refundWindowEndsAt, existingSubscription?.refund_window_status)

  const { data: coupleRole } = await adminClient
    .from('roles')
    .select('id')
    .eq('name', 'couple')
    .maybeSingle()

  await adminClient
    .from('accounts')
    .upsert({
      id: userId,
      status,
      asaas_customer_id: asaasCustomerId,
      asaas_subscription_id: asaasSubscriptionId,
    }, { onConflict: 'id' })

  await adminClient
    .from('profiles')
    .upsert({
      id: userId,
      email: checkout.email,
      full_name: checkout.full_name,
      account_id: userId,
      role_id: coupleRole?.id || null,
      role: 'couple',
      plan_id: checkout.plan_id,
      plan_status: status,
      billing_interval: checkout.billing_interval,
      plan_current_period_start: periodStart,
      plan_current_period_end: periodEnd,
      plan_access_expires_at: endOfDay(periodEnd),
      plan_assigned_at: new Date().toISOString(),
      plan_access_checked_at: new Date().toISOString(),
      plan_access_source: 'asaas_webhook',
      refund_window_started_at: refundWindowStartedAt,
      refund_window_ends_at: refundWindowEndsAt,
      refund_window_status: refundWindowStatus,
      asaas_customer_id: asaasCustomerId,
    }, { onConflict: 'id' })

  const weddingId = await applyWeddingDraft(adminClient, checkout, userId)

  const subscriptionPayload = {
    account_id: userId,
    plan_id: checkout.plan_id,
    status,
    billing_interval: checkout.billing_interval,
    asaas_customer_id: asaasCustomerId,
    asaas_subscription_id: asaasSubscriptionId,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    access_expires_at: endOfDay(periodEnd),
    last_payment_id: payment?.id || checkout.asaas_payment_id || null,
    last_payment_status: payment?.status || null,
    last_payment_at: payment?.paymentDate ? `${payment.paymentDate}T12:00:00-03:00` : payment?.confirmedDate ? `${payment.confirmedDate}T12:00:00-03:00` : null,
    last_status_checked_at: new Date().toISOString(),
    last_status_source: 'asaas_webhook',
    refund_window_days: 7,
    refund_window_started_at: refundWindowStartedAt,
    refund_window_ends_at: refundWindowEndsAt,
    refund_window_status: refundWindowStatus,
    refund_window_checked_at: new Date().toISOString(),
    metadata: {
      lastPaymentId: payment?.id || checkout.asaas_payment_id || null,
      checkoutSessionId: checkout.id,
      weddingId,
      refundWindowStatus,
    },
  }

  const { data: subscription, error: subscriptionError } = await adminClient
    .from('subscriptions')
    .upsert(subscriptionPayload, { onConflict: 'asaas_subscription_id' })
    .select('id')
    .single()

  if (subscriptionError) throw subscriptionError

  await adminClient
    .from('checkout_sessions')
    .update({
      status: checkoutStatusFromSubscriptionStatus(status),
      created_account_id: userId,
      created_user_id: userId,
      asaas_payment_id: payment?.id || checkout.asaas_payment_id || null,
      checkout_url: payment?.invoiceUrl || checkout.checkout_url || null,
    })
    .eq('id', checkout.id)

  await adminClient
    .from('legal_acceptances')
    .update({ account_id: userId, user_id: userId })
    .eq('checkout_session_id', checkout.id)

  return subscription?.id || null
}

serve(async (req) => {
  let adminClient = null
  const startedAt = performance.now()

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  try {
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
    const receivedToken = req.headers.get('asaas-access-token')

    if (expectedToken && receivedToken !== expectedToken) {
      console.warn('[Asaas Webhook] Token inválido recebido')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const event = body.event
    const payment = body.payment || {}
    const subscriptionPayload = body.subscription || {}
    const asaasSubscriptionId = payment.subscription || subscriptionPayload.id || subscriptionPayload
    const asaasPaymentId = payment.id || null
    const asaasCustomerId = payment.customer || subscriptionPayload.customer || null
    const providerEventId = body.id || `${event}:${asaasPaymentId || asaasSubscriptionId || crypto.randomUUID()}`

    console.log('[Asaas Webhook] Evento recebido:', {
      event,
      paymentId: asaasPaymentId,
      subscriptionId: asaasSubscriptionId,
      customerId: asaasCustomerId,
    })

    await recordEvent(adminClient, {
      level: 'info',
      event_name: 'edge.asaas_webhook.received',
      route: '/functions/v1/asaas-webhook',
      request_id: providerEventId,
      entity_type: asaasSubscriptionId ? 'asaas_subscription' : 'asaas_payment',
      entity_id: asaasSubscriptionId || asaasPaymentId || null,
      metadata: {
        event,
        hasPaymentId: Boolean(asaasPaymentId),
        hasSubscriptionId: Boolean(asaasSubscriptionId),
        hasCustomerId: Boolean(asaasCustomerId),
      },
      user_agent: req.headers.get('user-agent'),
    })

    await adminClient
      .from('subscription_events')
      .upsert({
        provider: 'asaas',
        event_type: event,
        provider_event_id: providerEventId,
        payload: body,
      }, { onConflict: 'provider,provider_event_id' })

    let checkoutQuery = adminClient
      .from('checkout_sessions')
      .select('id, plan_id, billing_interval, status, full_name, email, asaas_customer_id, asaas_subscription_id, asaas_payment_id, checkout_url, created_user_id, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(1)

    if (asaasSubscriptionId) {
      checkoutQuery = checkoutQuery.eq('asaas_subscription_id', asaasSubscriptionId)
    } else if (asaasPaymentId) {
      checkoutQuery = checkoutQuery.eq('asaas_payment_id', asaasPaymentId)
    } else if (asaasCustomerId) {
      checkoutQuery = checkoutQuery.eq('asaas_customer_id', asaasCustomerId)
    } else {
      await recordEvent(adminClient, {
        level: 'warn',
        event_name: 'edge.asaas_webhook.ignored_missing_identifiers',
        route: '/functions/v1/asaas-webhook',
        request_id: providerEventId,
        metadata: { event },
        user_agent: req.headers.get('user-agent'),
      })

      return new Response(JSON.stringify({ success: true, ignored: 'missing identifiers', event }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const { data: checkoutRows, error: checkoutError } = await checkoutQuery
    if (checkoutError) throw checkoutError

    const checkout = checkoutRows?.[0]
    if (!checkout) {
      const { data: account } = asaasCustomerId
        ? await adminClient.from('accounts').select('id').eq('asaas_customer_id', asaasCustomerId).maybeSingle()
        : { data: null }

      if (account?.id) {
        const accountStatus = overdueEvents.has(event) ? 'past_due' : canceledEvents.has(event) ? 'canceled' : 'active'
        await adminClient.from('accounts').update({ status: accountStatus }).eq('id', account.id)
      }

      await recordEvent(adminClient, {
        level: 'warn',
        event_name: 'edge.asaas_webhook.checkout_not_found',
        route: '/functions/v1/asaas-webhook',
        request_id: providerEventId,
        account_id: account?.id || null,
        duration_ms: Math.round(performance.now() - startedAt),
        metadata: {
          event,
          accountUpdated: Boolean(account?.id),
        },
        user_agent: req.headers.get('user-agent'),
      })

      return new Response(JSON.stringify({ success: true, warning: 'checkout not found', event }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    let subscriptionId = null
    let processedUserId = null
    if (paidEvents.has(event)) {
      const userId = await getOrInviteUser(adminClient, checkout)
      if (!userId) throw new Error('Não foi possível criar ou localizar o usuário do checkout')
      processedUserId = userId
      subscriptionId = await updateAccountAndSubscription(adminClient, checkout, userId, payment, 'active')
    }

    if (overdueEvents.has(event) || canceledEvents.has(event)) {
      const userId = checkout.created_user_id || (await findAuthUserByEmail(adminClient, checkout.email))?.id
      if (userId) {
        processedUserId = userId
        const status = overdueEvents.has(event) ? 'past_due' : 'canceled'
        subscriptionId = await updateAccountAndSubscription(adminClient, checkout, userId, payment, status)
      } else {
        await adminClient
          .from('checkout_sessions')
          .update({ status: overdueEvents.has(event) ? 'failed' : 'canceled' })
          .eq('id', checkout.id)
      }
    }

    if (subscriptionId) {
      await adminClient
        .from('subscription_events')
        .update({
          subscription_id: subscriptionId,
          account_id: processedUserId,
        })
        .eq('provider', 'asaas')
        .eq('provider_event_id', providerEventId)
    }

    await recordEvent(adminClient, {
      level: 'info',
      event_name: 'edge.asaas_webhook.processed',
      route: '/functions/v1/asaas-webhook',
      request_id: providerEventId,
      user_id: processedUserId,
      account_id: processedUserId,
      entity_type: subscriptionId ? 'subscription' : 'checkout_session',
      entity_id: subscriptionId || checkout.id,
      duration_ms: Math.round(performance.now() - startedAt),
      metadata: {
        event,
        checkoutId: checkout.id,
        subscriptionId,
        processedUser: Boolean(processedUserId),
      },
      user_agent: req.headers.get('user-agent'),
    })

    return new Response(JSON.stringify({ success: true, event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[Asaas Webhook] Erro:', error.message)
    if (adminClient) {
      await recordEvent(adminClient, {
        level: 'error',
        event_name: 'edge.asaas_webhook.error',
        route: '/functions/v1/asaas-webhook',
        duration_ms: Math.round(performance.now() - startedAt),
        error_message: error.message,
        stack: error.stack || null,
        user_agent: req.headers.get('user-agent'),
      })
    }

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
