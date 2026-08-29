-- Persistencia de consentimento de cookies por navegador e por usuario.
-- Aditiva e segura para producao: nao remove dados existentes.

ALTER TABLE public.cookie_consents
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consented_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE public.cookie_consents
SET
  consented_at = COALESCE(consented_at, created_at, now()),
  expires_at = COALESCE(expires_at, COALESCE(created_at, now()) + interval '365 days')
WHERE expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cookie_consents_user_policy
  ON public.cookie_consents (user_id, policy_version, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cookie_consents_expiry
  ON public.cookie_consents (expires_at);

DROP POLICY IF EXISTS "Qualquer visitante registra consentimento de cookies" ON public.cookie_consents;
CREATE POLICY "Qualquer visitante registra consentimento de cookies"
ON public.cookie_consents
FOR INSERT
TO anon, authenticated
WITH CHECK (
  necessary = true
  AND (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Usuário vê próprios consentimentos" ON public.cookie_consents;
CREATE POLICY "Usuário vê próprios consentimentos"
ON public.cookie_consents
FOR SELECT
TO authenticated
USING (
  public.is_master()
  OR user_id = auth.uid()
  OR account_id IN (
    SELECT p.account_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.account_id IS NOT NULL
  )
);
