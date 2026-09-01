// @ts-nocheck
// Upload seguro de contratos/documentos de fornecedores com compactacao best-effort para PDF.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024
const MAX_STORED_BYTES = 10 * 1024 * 1024
const allowedDocuments = [
  {
    extension: 'pdf',
    contentTypes: ['application/pdf'],
    outputContentType: 'application/pdf',
  },
  {
    extension: 'doc',
    contentTypes: ['application/msword'],
    outputContentType: 'application/msword',
  },
  {
    extension: 'docx',
    contentTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    outputContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
]

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

const sanitizeFileName = (name: string) =>
  String(name || 'contrato.pdf')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'contrato.pdf'

const getFileExtension = (name: string) =>
  String(name || '').split('.').pop()?.toLowerCase() || ''

const getAllowedDocument = (file: File, fileName: string) => {
  const extension = getFileExtension(fileName)
  return allowedDocuments.find((document) => (
    document.extension === extension ||
    document.contentTypes.includes(file.type)
  ))
}

const canAccessWedding = async (adminClient: any, userId: string, weddingId: string) => {
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, role, wedding_id, account_id')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role === 'master') return true
  if (profile?.wedding_id === weddingId) return true

  const { data: wedding } = await adminClient
    .from('weddings')
    .select('id, owner_id, account_id')
    .eq('id', weddingId)
    .maybeSingle()

  if (
    wedding?.owner_id === userId ||
    wedding?.account_id === userId ||
    (profile?.account_id && wedding?.account_id === profile.account_id)
  ) {
    return true
  }

  const { data: membership } = await adminClient
    .from('wedding_members')
    .select('id')
    .eq('wedding_id', weddingId)
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  return Boolean(membership)
}

const compactPdf = async (bytes: Uint8Array) => {
  try {
    const pdfDoc = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    })

    pdfDoc.setTitle('')
    pdfDoc.setAuthor('')
    pdfDoc.setSubject('')
    pdfDoc.setKeywords([])
    pdfDoc.setProducer('WedPlan')
    pdfDoc.setCreator('WedPlan')

    const compacted = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false,
    })

    return compacted.length < bytes.length ? compacted : bytes
  } catch (error) {
    console.warn('[upload-supplier-contract] Compactacao indisponivel para este PDF:', error.message)
    return bytes
  }
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

    const formData = await req.formData()
    const file = formData.get('file')
    const weddingId = String(formData.get('weddingId') || '')
    const previousPath = String(formData.get('previousPath') || '')

    if (!weddingId) return jsonResponse({ error: 'Casamento não informado' }, 400)
    if (!(await canAccessWedding(adminClient, user.id, weddingId))) {
      return jsonResponse({ error: 'Sem permissão para enviar contrato neste casamento' }, 403)
    }

    if (!(file instanceof File)) return jsonResponse({ error: 'Arquivo não enviado' }, 400)
    const originalFileName = sanitizeFileName(file.name)
    const documentType = getAllowedDocument(file, originalFileName)
    if (!documentType) return jsonResponse({ error: 'Envie um arquivo PDF, DOC ou DOCX válido' }, 400)
    if (file.size > MAX_ORIGINAL_BYTES) {
      return jsonResponse({ error: 'O arquivo original deve ter no máximo 25MB' }, 413)
    }

    const originalBytes = new Uint8Array(await file.arrayBuffer())
    const storedBytes = documentType.extension === 'pdf' ? await compactPdf(originalBytes) : originalBytes

    if (storedBytes.length > MAX_STORED_BYTES) {
      return jsonResponse({
        error: documentType.extension === 'pdf'
          ? 'Mesmo após compactação, o PDF ficou acima de 10MB. Exporte o contrato em resolução menor e tente novamente.'
          : 'O arquivo Word deve ter no máximo 10MB para ser salvo.',
        originalSize: originalBytes.length,
        compressedSize: storedBytes.length,
      }, 413)
    }

    const path = `${weddingId}/${crypto.randomUUID()}.${documentType.extension}`
    const uploadBody = new File([storedBytes], originalFileName, { type: documentType.outputContentType })

    const { error: uploadError } = await adminClient.storage
      .from('contracts')
      .upload(path, uploadBody, {
        contentType: documentType.outputContentType,
        cacheControl: 'private, max-age=0',
        upsert: false,
      })

    if (uploadError) throw uploadError

    if (previousPath && !previousPath.includes('..') && (previousPath.startsWith(`${weddingId}/`) || !previousPath.includes('/'))) {
      await adminClient.storage.from('contracts').remove([previousPath])
    }

    const { data: signed } = await adminClient.storage
      .from('contracts')
      .createSignedUrl(path, 60 * 60)

    return jsonResponse({
      success: true,
      path,
      signedUrl: signed?.signedUrl || null,
      fileName: originalFileName,
      originalSize: originalBytes.length,
      compressedSize: storedBytes.length,
      compressionRatio: originalBytes.length ? Math.round((1 - storedBytes.length / originalBytes.length) * 100) : 0,
      mimeType: documentType.outputContentType,
      uploadedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[upload-supplier-contract] Erro:', error.message)
    return jsonResponse({ error: error.message || 'Erro ao enviar contrato' }, 400)
  }
})
