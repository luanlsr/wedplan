// @ts-nocheck
// supabase/functions/admin-create-user/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Validar que o chamador é autenticado (JWT do Supabase)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    // Cliente com service_role para criar usuários
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verificar se o chamador é master
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller } } = await userClient.auth.getUser()
    if (!caller) throw new Error('Caller not authenticated')

    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role, roles(name)')
      .eq('id', caller.id)
      .maybeSingle()

    const relationRole = Array.isArray((callerProfile as any)?.roles)
      ? (callerProfile as any)?.roles?.[0]?.name
      : (callerProfile as any)?.roles?.name
    const callerRole = (callerProfile as any)?.role || relationRole
    if (callerRole !== 'master') {
      return new Response(JSON.stringify({ error: 'Forbidden: only master can create users' }), { status: 403, headers: corsHeaders })
    }

    const { email, password, full_name, account_status } = await req.json()

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'email and password are required' }), { status: 400, headers: corsHeaders })
    }

    // 1. Criar o usuário no Auth
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirma o e-mail automaticamente (sem precisar verificar)
    })

    if (createError) throw createError

    const userId = newUser.user.id

    // 2. Buscar o tipo de conta padrão (Premium)
    const { data: accountType } = await adminClient
      .from('account_types')
      .select('id')
      .order('price', { ascending: false })
      .limit(1)
      .maybeSingle()

    const accountTypeId = accountType?.id

    // 3. Criar a conta com o status desejado
    const { data: account, error: accountError } = await adminClient
      .from('accounts')
      .insert({
        id: userId,
        status: account_status || 'active',
        account_type_id: accountTypeId,
      })
      .select()
      .single()

    if (accountError) {
      // Se a conta já existe, apenas atualiza
      await adminClient.from('accounts').update({ status: account_status || 'active' }).eq('id', userId)
    }

    // 4. Buscar a role 'couple'
    const { data: coupleRole } = await adminClient
      .from('roles')
      .select('id')
      .eq('name', 'couple')
      .maybeSingle()

    // 5. Atualizar o perfil com nome e role
    await adminClient.from('profiles').upsert({
      id: userId,
      full_name: full_name || '',
      email: email,
      role: 'couple',
      role_id: coupleRole?.id,
      account_id: userId,
    })

    console.log(`[admin-create-user] ✅ Usuário criado: ${email} (${userId})`)

    return new Response(JSON.stringify({ 
      success: true, 
      user: { id: userId, email, full_name, account_status: account_status || 'active' }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('[admin-create-user] Erro:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
