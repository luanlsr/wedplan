// @ts-nocheck
// Cria checkout de assinatura sem criar usuário Auth antes do pagamento confirmado.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ASAAS_BASE_URL = 'https://api.asaas.com/v3'

const normalizeEmail = (email: string) => String(email || '').trim().toLowerCase()
const onlyDigits = (value?: string) => String(value || '').replace(/\D/g, '')

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
    if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY not configured')

    const body = await req.json()
    const fullName = String(body.fullName || '').trim()
    const email = normalizeEmail(body.email)
    const phone = onlyDigits(body.phone)
    const cpfCnpj = onlyDigits(body.cpfCnpj)
    const planCode = String(body.planCode || 'pro_couple').trim()
    const billingInterval = body.billingInterval === 'yearly' ? 'yearly' : 'monthly'
    const acceptedTerms = Boolean(body.acceptedTerms)
    const acceptedPrivacy = Boolean(body.acceptedPrivacy)
    const marketingConsent = Boolean(body.marketingConsent)

    if (!fullName) throw new Error('Informe o nome completo')
    if (!email || !email.includes('@')) throw new Error('Informe um e-mail válido')
    if (!acceptedTerms || !acceptedPrivacy) throw new Error('Aceite os termos e a política de privacidade')

    const { data: plan, error: planError } = await supabaseClient
      .from('plans')
      .select('id, code, name, price_monthly, price_yearly, currency, is_active')
      .eq('code', planCode)
      .eq('is_active', true)
      .maybeSingle()

    if (planError) throw planError
    if (!plan) throw new Error('Plano indisponível')

    const value = Number(billingInterval === 'yearly' ? (plan.price_yearly || plan.price_monthly * 12) : plan.price_monthly)
    if (!value || value <= 0) throw new Error('Valor do plano inválido')

    const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify({
        name: fullName,
        email,
        phone: phone || undefined,
        mobilePhone: phone || undefined,
        cpfCnpj: cpfCnpj || undefined,
        externalReference: email,
      }),
    })

    const customer = await customerRes.json()
    if (!customerRes.ok) {
      console.error('[create-subscription-checkout] Erro ao criar cliente:', customer)
      throw new Error(customer.errors?.[0]?.description || 'Erro ao criar cliente no Asaas')
    }

    const nextDueDate = new Date()
    nextDueDate.setDate(nextDueDate.getDate() + 1)
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0]

    const subscriptionRes = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: customer.id,
        billingType: 'UNDEFINED',
        value,
        nextDueDate: nextDueDateStr,
        cycle: billingInterval === 'yearly' ? 'YEARLY' : 'MONTHLY',
        description: `${plan.name} WedPlan - assinatura ${billingInterval === 'yearly' ? 'anual' : 'mensal'}`,
        externalReference: email,
      }),
    })

    const subscription = await subscriptionRes.json()
    if (!subscriptionRes.ok) {
      console.error('[create-subscription-checkout] Erro ao criar assinatura:', subscription)
      throw new Error(subscription.errors?.[0]?.description || 'Erro ao criar assinatura no Asaas')
    }

    let paymentUrl = subscription.invoiceUrl || subscription.bankSlipUrl || null
    let firstPaymentId = null

    if (!paymentUrl) {
      const paymentsRes = await fetch(`${ASAAS_BASE_URL}/payments?subscription=${subscription.id}&limit=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
      })

      const payments = await paymentsRes.json()
      const firstPayment = payments?.data?.[0]
      if (paymentsRes.ok && firstPayment) {
        firstPaymentId = firstPayment.id || null
        paymentUrl = firstPayment.invoiceUrl || firstPayment.bankSlipUrl || null
      }
    }

    const { data: checkout, error: checkoutError } = await supabaseClient
      .from('checkout_sessions')
      .insert({
        plan_id: plan.id,
        billing_interval: billingInterval,
        status: 'payment_pending',
        full_name: fullName,
        email,
        phone: phone || null,
        cpf_cnpj: cpfCnpj || null,
        asaas_customer_id: customer.id,
        asaas_subscription_id: subscription.id,
        asaas_payment_id: firstPaymentId,
        checkout_url: paymentUrl,
        accepted_terms_at: new Date().toISOString(),
        accepted_privacy_at: new Date().toISOString(),
        marketing_consent: marketingConsent,
        source: body.source || 'landing',
        user_agent: req.headers.get('user-agent'),
        metadata: {
          planCode: plan.code,
          planName: plan.name,
          value,
          billingInterval,
        },
      })
      .select('id')
      .single()

    if (checkoutError) throw checkoutError

    return new Response(JSON.stringify({
      success: true,
      checkoutSessionId: checkout.id,
      customerId: customer.id,
      subscriptionId: subscription.id,
      paymentUrl,
      planName: plan.name,
      planCode: plan.code,
      billingInterval,
      paymentValue: value,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[create-subscription-checkout] Erro:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
