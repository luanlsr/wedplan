-- Alinha as policies do bucket contracts com todos os vinculos validos do casamento:
-- master, dono, conta vinculada, profile vinculado e wedding_members.

UPDATE storage.buckets
SET public = false
WHERE id = 'contracts';

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
      FROM public.weddings w
      WHERE w.id::text = (string_to_array(storage.objects.name, '/'))[1]
        AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
          OR p.account_id IN (
            SELECT w.account_id
            FROM public.weddings w
            WHERE w.id::text = (string_to_array(storage.objects.name, '/'))[1]
              AND w.account_id IS NOT NULL
          )
        )
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
      FROM public.weddings w
      WHERE w.id::text = (string_to_array(storage.objects.name, '/'))[1]
        AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
          OR p.account_id IN (
            SELECT w.account_id
            FROM public.weddings w
            WHERE w.id::text = (string_to_array(storage.objects.name, '/'))[1]
              AND w.account_id IS NOT NULL
          )
        )
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
      FROM public.weddings w
      WHERE w.id::text = (string_to_array(storage.objects.name, '/'))[1]
        AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
          OR p.account_id IN (
            SELECT w.account_id
            FROM public.weddings w
            WHERE w.id::text = (string_to_array(storage.objects.name, '/'))[1]
              AND w.account_id IS NOT NULL
          )
        )
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
      FROM public.weddings w
      WHERE w.id::text = (string_to_array(storage.objects.name, '/'))[1]
        AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
          OR p.account_id IN (
            SELECT w.account_id
            FROM public.weddings w
            WHERE w.id::text = (string_to_array(storage.objects.name, '/'))[1]
              AND w.account_id IS NOT NULL
          )
        )
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
      FROM public.weddings w
      WHERE w.id::text = (string_to_array(storage.objects.name, '/'))[1]
        AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
          OR p.account_id IN (
            SELECT w.account_id
            FROM public.weddings w
            WHERE w.id::text = (string_to_array(storage.objects.name, '/'))[1]
              AND w.account_id IS NOT NULL
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.wedding_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.wedding_id::text = (string_to_array(storage.objects.name, '/'))[1]
    )
  )
);
