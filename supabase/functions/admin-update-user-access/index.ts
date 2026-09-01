// @ts-nocheck
// Atualiza liberacao/bloqueio de acesso de usuarios. Somente master.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

const allowedStatuses = ['active', 'pending_payment', 'past_due', 'canceled']

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const getCaller = async (authHeader: string) => {
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) return null
  return user
}

const isMaster = async (adminClient: any, userId: string) => {
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, roles(name)')
    .eq('id', userId)
    .maybeSingle()

  const relationRole = Array.isArray(profile?.roles) ? profile.roles[0]?.name : profile?.roles?.name
  return profile?.role === 'master' || relationRole === 'master'
}

const mapPlanStatus = (accountStatus: string) => {
  if (accountStatus === 'active') return 'active'
  if (accountStatus === 'past_due') return 'past_due'
  if (accountStatus === 'canceled') return 'canceled'
  return 'pending_payment'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders, status: 204 })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Sessão expirada' }, 401)

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const caller = await getCaller(authHeader)
    if (!caller) return jsonResponse({ error: 'Sessão expirada' }, 401)
    if (!(await isMaster(adminClient, caller.id))) {
      return jsonResponse({ error: 'Apenas o Admin Master pode alterar acesso de usuários' }, 403)
    }

    const { userId, status, note } = await req.json()
    const nextStatus = String(status || '')
    if (!userId) return jsonResponse({ error: 'Usuário não informado' }, 400)
    if (!allowedStatuses.includes(nextStatus)) {
      return jsonResponse({ error: 'Status inválido' }, 400)
    }

    const { data: targetProfile, error: targetError } = await adminClient
      .from('profiles')
      .select('id, role, account_id, roles(name)')
      .eq('id', userId)
      .maybeSingle()

    if (targetError) throw targetError
    if (!targetProfile) return jsonResponse({ error: 'Usuário não encontrado' }, 404)

    const targetRelationRole = Array.isArray(targetProfile.roles) ? targetProfile.roles[0]?.name : targetProfile.roles?.name
    if (targetProfile.role === 'master' || targetRelationRole === 'master') {
      return jsonResponse({ error: 'Acesso de outro master não deve ser alterado por esta ação' }, 403)
    }

    const accountId = targetProfile.account_id || userId
    const planStatus = mapPlanStatus(nextStatus)

    await adminClient
      .from('accounts')
      .upsert({
        id: accountId,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    const profileUpdate: Record<string, unknown> = {
      account_id: accountId,
      plan_status: planStatus,
      plan_access_checked_at: new Date().toISOString(),
      plan_access_source: 'admin_master',
      updated_at: new Date().toISOString(),
    }

    if (nextStatus === 'active') {
      profileUpdate.plan_access_expires_at = null
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId)

    if (profileError) throw profileError

    await adminClient
      .from('app_events')
      .insert({
        level: 'warn',
        event_name: 'admin.user_access_updated',
        source: 'edge_function',
        user_id: caller.id,
        account_id: accountId,
        entity_type: 'profile',
        entity_id: userId,
        role: 'master',
        metadata: {
          target_user_id: userId,
          status: nextStatus,
          plan_status: planStatus,
          note: note || null,
        },
      })

    return jsonResponse({
      success: true,
      userId,
      accountId,
      status: nextStatus,
      planStatus,
    })
  } catch (error) {
    console.error('[admin-update-user-access] Erro:', error.message)
    return jsonResponse({ error: error.message || 'Erro ao alterar acesso' }, 400)
  }
})
