// @ts-nocheck
// supabase/functions/asaas-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
}

const paidEvents = new Set(['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'])
const overdueEvents = new Set(['PAYMENT_OVERDUE'])
const canceledEvents = new Set(['PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'SUBSCRIPTION_DELETED'])

const normalizeEmail = (email: string) => String(email || '').trim().toLowerCase()

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
      plan_current_period_end: payment?.dueDate || payment?.originalDueDate || null,
      plan_assigned_at: new Date().toISOString(),
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
    current_period_start: new Date().toISOString().split('T')[0],
    current_period_end: payment?.dueDate || payment?.originalDueDate || null,
    metadata: {
      lastPaymentId: payment?.id || checkout.asaas_payment_id || null,
      checkoutSessionId: checkout.id,
      weddingId,
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
    .update({ account_id: userId })
    .eq('checkout_session_id', checkout.id)

  return subscription?.id || null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    const adminClient = createClient(
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
      .select('id, plan_id, billing_interval, status, full_name, email, asaas_customer_id, asaas_subscription_id, asaas_payment_id, checkout_url, created_user_id, metadata')
      .order('created_at', { ascending: false })
      .limit(1)

    if (asaasSubscriptionId) {
      checkoutQuery = checkoutQuery.eq('asaas_subscription_id', asaasSubscriptionId)
    } else if (asaasPaymentId) {
      checkoutQuery = checkoutQuery.eq('asaas_payment_id', asaasPaymentId)
    } else if (asaasCustomerId) {
      checkoutQuery = checkoutQuery.eq('asaas_customer_id', asaasCustomerId)
    } else {
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

    return new Response(JSON.stringify({ success: true, event }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[Asaas Webhook] Erro:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
