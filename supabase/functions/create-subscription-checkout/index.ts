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
const genericPaymentMessage = 'Não conseguimos iniciar o pagamento agora. Tente novamente em alguns minutos ou fale com o suporte.'

class PublicCheckoutError extends Error {
  constructor(message: string, status = 400, code = 'VALIDATION_ERROR') {
    super(message)
    this.status = status
    this.code = code
    this.publicMessage = message
  }
}

class InternalCheckoutError extends Error {
  constructor(code = 'CHECKOUT_ERROR', publicMessage = genericPaymentMessage, status = 400) {
    super(code)
    this.status = status
    this.code = code
    this.publicMessage = publicMessage
  }
}

const safeJson = async (res: Response) => {
  try {
    return await res.json()
  } catch {
    return {}
  }
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
    if (!ASAAS_API_KEY) {
      console.error('[create-subscription-checkout] ASAAS_API_KEY não configurada')
      throw new InternalCheckoutError('PAYMENT_PROVIDER_NOT_CONFIGURED')
    }

    const body = await req.json()
    const fullName = String(body.fullName || '').trim()
    const email = normalizeEmail(body.email)
    const phone = onlyDigits(body.phone)
    const cpfCnpj = onlyDigits(body.cpfCnpj)
    const planCode = String(body.planCode || 'pro_couple').trim()
    const billingInterval = body.billingInterval === 'yearly' ? 'yearly' : 'monthly'
    const acceptedTerms = Boolean(body.acceptedTerms)
    const acceptedPrivacy = Boolean(body.acceptedPrivacy)
    const weddingDraft = typeof body.weddingDraft === 'object' && body.weddingDraft ? body.weddingDraft : null
    const paymentMethod = String(body.paymentMethod || 'asaas_checkout')

    if (!fullName) throw new PublicCheckoutError('Informe o nome completo')
    if (!email || !email.includes('@')) throw new PublicCheckoutError('Informe um e-mail válido')
    if (!acceptedTerms || !acceptedPrivacy) throw new PublicCheckoutError('Aceite os termos e a política de privacidade')

    const { data: plan, error: planError } = await supabaseClient
      .from('plans')
      .select('id, code, name, price_monthly, price_yearly, currency, is_active')
      .eq('code', planCode)
      .eq('is_active', true)
      .maybeSingle()

    if (planError) {
      console.error('[create-subscription-checkout] Erro ao buscar plano:', planError)
      throw new InternalCheckoutError('PLAN_LOOKUP_ERROR')
    }
    if (!plan) throw new PublicCheckoutError('Plano indisponível')

    const value = Number(billingInterval === 'yearly' ? (plan.price_yearly || plan.price_monthly * 12) : plan.price_monthly)
    if (!value || value <= 0) throw new PublicCheckoutError('Valor do plano inválido')

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

    const customer = await safeJson(customerRes)
    if (!customerRes.ok) {
      console.error('[create-subscription-checkout] Erro ao criar cliente:', customer)
      throw new InternalCheckoutError('ASAAS_CUSTOMER_ERROR', genericPaymentMessage, 502)
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

    const subscription = await safeJson(subscriptionRes)
    if (!subscriptionRes.ok) {
      console.error('[create-subscription-checkout] Erro ao criar assinatura:', subscription)
      throw new InternalCheckoutError('ASAAS_SUBSCRIPTION_ERROR', genericPaymentMessage, 502)
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

      const payments = await safeJson(paymentsRes)
      const firstPayment = payments?.data?.[0]
      if (paymentsRes.ok && firstPayment) {
        firstPaymentId = firstPayment.id || null
        paymentUrl = firstPayment.invoiceUrl || firstPayment.bankSlipUrl || null
      } else if (!paymentsRes.ok) {
        console.warn('[create-subscription-checkout] Não foi possível buscar primeira cobrança:', payments)
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
        marketing_consent: false,
        source: body.source || 'landing',
        user_agent: req.headers.get('user-agent'),
        metadata: {
          planCode: plan.code,
          planName: plan.name,
          value,
          billingInterval,
          weddingDraft,
          paymentMethod,
        },
      })
      .select('id')
      .single()

    if (checkoutError) {
      console.error('[create-subscription-checkout] Erro ao salvar checkout:', checkoutError)
      throw new InternalCheckoutError('CHECKOUT_PERSISTENCE_ERROR')
    }

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
    const publicMessage = error.publicMessage || genericPaymentMessage
    const status = error.status || 400
    const code = error.code || 'CHECKOUT_ERROR'

    console.error('[create-subscription-checkout] Erro:', {
      code,
      message: error.message,
      publicMessage,
    })

    return new Response(JSON.stringify({ error: publicMessage, userMessage: publicMessage, code }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })
  }
})
