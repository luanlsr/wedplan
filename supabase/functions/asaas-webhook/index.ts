// @ts-nocheck
// supabase/functions/asaas-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validar o token de autenticação do Asaas
    const expectedToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
    const receivedToken = req.headers.get('asaas-access-token')

    if (expectedToken && receivedToken !== expectedToken) {
      console.warn('Token inválido recebido:', receivedToken)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // 2. Criar cliente Supabase com service_role para bypass de RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const event = body.event
    const payment = body.payment

    console.log(`[Asaas Webhook] Evento recebido: ${event}`, { paymentId: payment?.id, customer: payment?.customer })

    // 3. Processar eventos de pagamento confirmado
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const asaasCustomerId = payment.customer

      // Buscar conta vinculada ao Customer ID do Asaas
      const { data: account, error: accError } = await supabaseClient
        .from('accounts')
        .select('id')
        .eq('asaas_customer_id', asaasCustomerId)
        .single()

      if (accError || !account) {
        console.error(`Conta não encontrada para Customer ID: ${asaasCustomerId}`)
        // Retorna 200 mesmo assim para o Asaas não tentar reenviar
        return new Response(JSON.stringify({ warning: 'Account not found, ignoring.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      // Ativar a conta
      const { error: updateError } = await supabaseClient
        .from('accounts')
        .update({
          status: 'active',
          asaas_subscription_id: payment.subscription || null
        })
        .eq('id', account.id)

      if (updateError) throw updateError

      console.log(`[Asaas Webhook] ✅ Conta ${account.id} ativada!`)
    }

    // 4. Processar pagamento vencido/atrasado
    if (event === 'PAYMENT_OVERDUE') {
      const asaasCustomerId = payment.customer

      const { data: account } = await supabaseClient
        .from('accounts')
        .select('id')
        .eq('asaas_customer_id', asaasCustomerId)
        .single()

      if (account) {
        await supabaseClient
          .from('accounts')
          .update({ status: 'past_due' })
          .eq('id', account.id)

        console.log(`[Asaas Webhook] ⚠️ Conta ${account.id} marcada como past_due`)
      }
    }

    // 5. Processar cancelamento de cobrança
    if (event === 'PAYMENT_DELETED') {
      const asaasCustomerId = payment.customer

      const { data: account } = await supabaseClient
        .from('accounts')
        .select('id')
        .eq('asaas_customer_id', asaasCustomerId)
        .single()

      if (account) {
        await supabaseClient
          .from('accounts')
          .update({ status: 'canceled' })
          .eq('id', account.id)

        console.log(`[Asaas Webhook] ❌ Conta ${account.id} cancelada`)
      }
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
