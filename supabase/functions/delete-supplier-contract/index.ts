// @ts-nocheck
// Remove contrato/documento de fornecedor com validacao de acesso.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

const getStoragePathFromLegacyUrl = (url?: string | null) => {
  if (!url) return null
  const marker = '/storage/v1/object/public/contracts/'
  const markerIndex = url.indexOf(marker)
  if (markerIndex === -1) return null

  const pathWithQuery = url.slice(markerIndex + marker.length)
  const path = pathWithQuery.split('?')[0]
  return path ? decodeURIComponent(path) : null
}

const canAccessWedding = async (adminClient: any, userId: string, weddingId: string) => {
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, role, wedding_id, roles(name)')
    .eq('id', userId)
    .maybeSingle()

  const relationRole = Array.isArray(profile?.roles) ? profile.roles[0]?.name : profile?.roles?.name
  if (profile?.role === 'master' || relationRole === 'master') return true
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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders, status: 204 })
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

    const { supplierId } = await req.json()
    if (!supplierId) return jsonResponse({ error: 'Fornecedor não informado' }, 400)

    const { data: supplier, error: supplierError } = await adminClient
      .from('suppliers')
      .select('id, wedding_id, fornecedor, contract_storage_path, contract_url')
      .eq('id', supplierId)
      .maybeSingle()

    if (supplierError) throw supplierError
    if (!supplier) return jsonResponse({ error: 'Fornecedor não encontrado' }, 404)
    if (!(await canAccessWedding(adminClient, user.id, supplier.wedding_id))) {
      return jsonResponse({ error: 'Sem permissão para remover este contrato' }, 403)
    }

    const storagePath = supplier.contract_storage_path || getStoragePathFromLegacyUrl(supplier.contract_url)
    if (storagePath && !storagePath.includes('..')) {
      const { error: removeError } = await adminClient.storage
        .from('contracts')
        .remove([storagePath])

      if (removeError) {
        console.warn('[delete-supplier-contract] Falha ao remover objeto do Storage:', removeError.message)
      }
    }

    const { error: updateError } = await adminClient
      .from('suppliers')
      .update({
        contract_url: null,
        contract_storage_path: null,
        contract_file_name: null,
        contract_file_size_bytes: null,
        contract_compressed_size_bytes: null,
        contract_mime_type: null,
        contract_uploaded_at: null,
      })
      .eq('id', supplierId)

    if (updateError) throw updateError

    return jsonResponse({
      success: true,
      supplierId,
      removedPath: storagePath || null,
    })
  } catch (error) {
    console.error('[delete-supplier-contract] Erro:', error.message)
    return jsonResponse({ error: error.message || 'Erro ao remover contrato' }, 400)
  }
})
