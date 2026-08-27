// @ts-nocheck
// Registra solicitação de domínio personalizado para planos Pro.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const normalizeDomain = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')

const isValidDomain = (domain: string) =>
  /^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)+$/.test(domain)

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

    const body = await req.json()
    const weddingSiteId = body.weddingSiteId
    const requestedDomain = normalizeDomain(body.domain)

    if (!weddingSiteId) throw new Error('Site do casal não informado')
    if (!isValidDomain(requestedDomain)) throw new Error('Informe um domínio válido')

    const { data: site, error: siteError } = await adminClient
      .from('wedding_sites')
      .select('id, wedding_id, weddings(owner_id, account_id)')
      .eq('id', weddingSiteId)
      .maybeSingle()

    if (siteError) throw siteError
    if (!site) throw new Error('Site do casal não encontrado')

    const wedding = Array.isArray(site.weddings) ? site.weddings[0] : site.weddings
    if (wedding?.owner_id !== user.id && wedding?.account_id !== user.id) {
      throw new Error('Você não pode solicitar domínio para este site')
    }

    const { data: subscription, error: subscriptionError } = await adminClient
      .from('subscriptions')
      .select('id, status, plan_id')
      .eq('account_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (subscriptionError) throw subscriptionError
    if (!subscription) throw new Error('Assinatura ativa não encontrada')

    const { data: featureRows, error: featuresError } = await adminClient
      .from('plan_features')
      .select('feature_key, feature_value')
      .eq('plan_id', subscription.plan_id)

    if (featuresError) throw featuresError

    const canRequestDomain = (featureRows || []).some((feature) =>
      feature.feature_key === 'custom_domain_addon' &&
      (feature.feature_value === true || feature.feature_value === 'true')
    )

    if (!canRequestDomain) throw new Error('Domínio personalizado está disponível apenas para planos Pro')

    const setupFee = Number(Deno.env.get('CUSTOM_DOMAIN_SETUP_FEE') || '79.90')
    const annualFee = Number(Deno.env.get('CUSTOM_DOMAIN_ANNUAL_FEE') || '99.90')

    const { data: request, error: requestError } = await adminClient
      .from('domain_requests')
      .insert({
        wedding_site_id: weddingSiteId,
        requested_domain: requestedDomain,
        status: 'requested',
        availability_provider: Deno.env.get('DOMAIN_PROVIDER') || 'manual',
        setup_fee: setupFee,
        annual_fee: annualFee,
        billing_status: 'not_charged',
      })
      .select('id, requested_domain, status, setup_fee, annual_fee, billing_status, created_at')
      .single()

    if (requestError) throw requestError

    return new Response(JSON.stringify({ success: true, request }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[request-custom-domain] Erro:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
