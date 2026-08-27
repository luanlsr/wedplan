// @ts-nocheck
// supabase/functions/create-asaas-customer/index.ts
// Chamada no signup: cria cliente no Asaas, gera link de pagamento e salva os IDs no banco

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ASAAS_BASE_URL = 'https://api.asaas.com/v3'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Autenticar o usuário
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await userClient.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')
    if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY not configured')

    const body = await req.json()
    const { name, email, cpfCnpj } = body

    const { data: existingAccount } = await supabaseClient
      .from('accounts')
      .select('id, asaas_customer_id')
      .eq('id', user.id)
      .maybeSingle()

    let customerId = existingAccount?.asaas_customer_id

    if (!customerId) {
      console.log(`[create-asaas-customer] Criando cliente Asaas para: ${email}`)

      // 1. Criar cliente no Asaas
      const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify({
          name: name || email,
          email: email,
          cpfCnpj: cpfCnpj || undefined,
          externalReference: user.id,
        })
      })

      const customer = await customerRes.json()
      if (!customerRes.ok) {
        console.error('[create-asaas-customer] Erro ao criar cliente:', customer)
        throw new Error(customer.errors?.[0]?.description || 'Erro ao criar cliente no Asaas')
      }

      customerId = customer.id
      console.log(`[create-asaas-customer] Cliente criado: ${customerId}`)
    } else {
      console.log(`[create-asaas-customer] Reutilizando cliente Asaas: ${customerId}`)
    }

    // 2. Buscar o preço do plano
    const { data: accountType } = await supabaseClient
      .from('account_types')
      .select('id, name, price')
      .order('price', { ascending: false })
      .limit(1)
      .maybeSingle()

    const planPrice = accountType?.price || 5.00
    const planName = accountType?.name || 'WedPlan Premium'

    // 3. Criar cobrança única (boleto/pix/cartão) no Asaas
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 3) // Vencimento em 3 dias
    const dueDateStr = dueDate.toISOString().split('T')[0]

    const paymentRes = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: 'UNDEFINED', // Permite que o cliente escolha (PIX, boleto ou cartão)
        value: planPrice,
        dueDate: dueDateStr,
        description: `${planName} - Acesso completo ao WedPlan`,
        externalReference: user.id,
        callback: {
          successUrl: `${Deno.env.get('SITE_URL') || 'https://wedplan.vercel.app'}/?payment=success`,
          autoRedirect: true
        }
      })
    })

    const payment = await paymentRes.json()
    if (!paymentRes.ok) {
      console.error('[create-asaas-customer] Erro ao criar cobrança:', payment)
      throw new Error(payment.errors?.[0]?.description || 'Erro ao criar cobrança no Asaas')
    }

    console.log(`[create-asaas-customer] Cobrança criada: ${payment.id}, URL: ${payment.invoiceUrl}`)

    // 4. Salvar asaas_customer_id e asaas_payment_id na conta do usuário
    await supabaseClient
      .from('accounts')
      .upsert({
        id: user.id,
        status: 'pending_payment',
        asaas_customer_id: customerId,
        account_type_id: accountType?.id,
      })

    console.log(`[create-asaas-customer] ✅ Conta atualizada para pending_payment`)

    return new Response(JSON.stringify({
      success: true,
      customerId,
      paymentId: payment.id,
      paymentUrl: payment.invoiceUrl,   // Link para pagar
      paymentValue: planPrice,
      planName,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('[create-asaas-customer] Erro:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
