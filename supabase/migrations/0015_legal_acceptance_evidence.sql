-- Evidencias de aceite dos documentos legais.
-- Aditiva e segura para producao: enriquece legal_acceptances sem remover registros existentes.

ALTER TABLE public.legal_acceptances
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_type text
    CHECK (document_type IN ('terms', 'privacy', 'cookies', 'refund')),
  ADD COLUMN IF NOT EXISTS document_version text,
  ADD COLUMN IF NOT EXISTS document_title text,
  ADD COLUMN IF NOT EXISTS public_url text,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS acceptance_source text NOT NULL DEFAULT 'checkout',
  ADD COLUMN IF NOT EXISTS locale text,
  ADD COLUMN IF NOT EXISTS timezone text,
  ADD COLUMN IF NOT EXISTS screen_resolution text,
  ADD COLUMN IF NOT EXISTS referrer text,
  ADD COLUMN IF NOT EXISTS device_type text,
  ADD COLUMN IF NOT EXISTS browser_name text,
  ADD COLUMN IF NOT EXISTS operating_system text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.legal_acceptances la
SET
  document_type = COALESCE(la.document_type, ld.document_type),
  document_version = COALESCE(la.document_version, ld.version),
  document_title = COALESCE(la.document_title, ld.title),
  public_url = COALESCE(la.public_url, ld.public_url),
  content_hash = COALESCE(la.content_hash, ld.content_hash)
FROM public.legal_documents ld
WHERE la.legal_document_id = ld.id;

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user
  ON public.legal_acceptances (user_id, accepted_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_checkout
  ON public.legal_acceptances (checkout_session_id, accepted_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_acceptances_email_document
  ON public.legal_acceptances (lower(email), document_type, document_version, accepted_at DESC);

INSERT INTO public.legal_documents (document_type, version, title, public_url, content_hash, is_active, published_at)
VALUES
  ('terms', '2026-08-31', 'Termos de Uso WedPlan', '/termos-de-uso', 'wedplan-terms-2026-08-31', true, now()),
  ('privacy', '2026-08-31', 'Politica de Privacidade WedPlan', '/politica-de-privacidade', 'wedplan-privacy-2026-08-31', true, now())
ON CONFLICT (document_type, version) DO UPDATE
SET
  title = EXCLUDED.title,
  public_url = EXCLUDED.public_url,
  content_hash = EXCLUDED.content_hash,
  is_active = true,
  published_at = COALESCE(public.legal_documents.published_at, EXCLUDED.published_at);

UPDATE public.legal_documents
SET is_active = false
WHERE document_type IN ('terms', 'privacy')
  AND version <> '2026-08-31';

DROP POLICY IF EXISTS "Qualquer visitante registra aceite legal" ON public.legal_acceptances;
CREATE POLICY "Qualquer visitante registra aceite legal"
ON public.legal_acceptances
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND (
    account_id IS NULL
    OR account_id = auth.uid()
    OR account_id IN (
      SELECT p.account_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.account_id IS NOT NULL
    )
  )
);

DROP POLICY IF EXISTS "Usuário vê próprios aceites legais" ON public.legal_acceptances;
CREATE POLICY "Usuário vê próprios aceites legais"
ON public.legal_acceptances
FOR SELECT
TO authenticated
USING (
  public.is_master()
  OR user_id = auth.uid()
  OR account_id = auth.uid()
  OR account_id IN (
    SELECT p.account_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.account_id IS NOT NULL
  )
);
