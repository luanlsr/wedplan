// @ts-nocheck
// Gera URL temporaria para visualizar contrato privado de fornecedor.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

const canAccessWedding = async (adminClient: any, userId: string, weddingId: string) => {
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, role, wedding_id')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role === 'master') return true
  if (profile?.wedding_id === weddingId) return true

  const { data: membership } = await adminClient
    .from('wedding_members')
    .select('id')
    .eq('wedding_id', weddingId)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  return Boolean(membership)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Sessão expirada' }, 401)

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
    if (userError || !user) return jsonResponse({ error: 'Sessão expirada' }, 401)

    const { path, supplierId } = await req.json()
    const storagePath = String(path || '')
    let weddingId = storagePath.split('/')[0]
    const hasWeddingPrefix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(weddingId)

    if (!storagePath || storagePath.includes('..')) {
      return jsonResponse({ error: 'Contrato inválido' }, 400)
    }

    let hasAccess = hasWeddingPrefix ? await canAccessWedding(adminClient, user.id, weddingId) : false

    if (!hasAccess && supplierId) {
      const { data: supplier } = await adminClient
        .from('suppliers')
        .select('id, wedding_id, contract_storage_path, contract_url')
        .eq('id', supplierId)
        .maybeSingle()

      const matchesStoragePath = supplier?.contract_storage_path === storagePath
      const matchesLegacyUrl = supplier?.contract_url && String(supplier.contract_url).includes(storagePath)

      if (supplier?.wedding_id && (matchesStoragePath || matchesLegacyUrl)) {
        weddingId = supplier.wedding_id
        hasAccess = await canAccessWedding(adminClient, user.id, weddingId)
      }
    }

    if (!hasAccess) {
      return jsonResponse({ error: 'Sem permissão para visualizar este contrato' }, 403)
    }

    const { data, error } = await adminClient.storage
      .from('contracts')
      .createSignedUrl(storagePath, 60 * 60)

    if (error) throw error

    return jsonResponse({ success: true, signedUrl: data?.signedUrl || null })
  } catch (error) {
    console.error('[create-supplier-contract-url] Erro:', error.message)
    return jsonResponse({ error: error.message || 'Erro ao gerar link do contrato' }, 400)
  }
})
