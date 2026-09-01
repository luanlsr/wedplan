-- Contratos de fornecedores em PDF/Word: bucket privado e metadados no fornecedor.

UPDATE storage.buckets
SET public = false
WHERE id = 'contracts';

INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS contract_storage_path text,
  ADD COLUMN IF NOT EXISTS contract_file_name text,
  ADD COLUMN IF NOT EXISTS contract_file_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS contract_compressed_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS contract_mime_type text DEFAULT 'application/pdf',
  ADD COLUMN IF NOT EXISTS contract_uploaded_at timestamptz;

COMMENT ON COLUMN public.suppliers.contract_storage_path IS
  'Caminho privado do documento no bucket storage contracts, no formato {wedding_id}/{uuid}.{ext}.';
COMMENT ON COLUMN public.suppliers.contract_file_size_bytes IS
  'Tamanho original do contrato enviado pelo usuario, em bytes.';
COMMENT ON COLUMN public.suppliers.contract_compressed_size_bytes IS
  'Tamanho salvo apos compactacao best-effort, em bytes.';

UPDATE public.suppliers
SET
  contract_storage_path = regexp_replace(contract_url, '^.*?/storage/v1/object/public/contracts/', ''),
  contract_file_name = COALESCE(
    contract_file_name,
    NULLIF(regexp_replace(regexp_replace(contract_url, '^.*?/storage/v1/object/public/contracts/', ''), '^.*/', ''), '')
  ),
  contract_mime_type = COALESCE(
    contract_mime_type,
    CASE
      WHEN contract_url ILIKE '%.docx%' THEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      WHEN contract_url ILIKE '%.doc%' THEN 'application/msword'
      ELSE 'application/pdf'
    END
  ),
  contract_uploaded_at = COALESCE(contract_uploaded_at, updated_at, created_at)
WHERE contract_storage_path IS NULL
  AND contract_url ILIKE '%/storage/v1/object/public/contracts/%';

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

DROP POLICY IF EXISTS "Membros do casamento podem ver contratos" ON storage.objects;
CREATE POLICY "Membros do casamento podem ver contratos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'contracts'
  AND (
    public.is_master()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.wedding_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
    )
  )
);

DROP POLICY IF EXISTS "Membros do casamento podem enviar contratos" ON storage.objects;
CREATE POLICY "Membros do casamento podem enviar contratos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contracts'
  AND (
    public.is_master()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.wedding_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
    )
  )
);

DROP POLICY IF EXISTS "Membros do casamento podem atualizar contratos" ON storage.objects;
CREATE POLICY "Membros do casamento podem atualizar contratos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contracts'
  AND (
    public.is_master()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.wedding_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
    )
  )
)
WITH CHECK (
  bucket_id = 'contracts'
  AND (
    public.is_master()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.wedding_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
    )
  )
);

DROP POLICY IF EXISTS "Membros do casamento podem remover contratos" ON storage.objects;
CREATE POLICY "Membros do casamento podem remover contratos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'contracts'
  AND (
    public.is_master()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
    )
    OR EXISTS (
      SELECT 1
      FROM public.wedding_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
    )
  )
);
