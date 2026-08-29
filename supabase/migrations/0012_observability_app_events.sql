-- Observabilidade do WedPlan.
-- Aditiva e segura para producao: cria uma tabela de eventos sem remover dados existentes.

CREATE TABLE IF NOT EXISTS public.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  level text NOT NULL DEFAULT 'info'
    CHECK (level IN ('debug', 'info', 'warn', 'error')),
  event_name text NOT NULL,
  source text NOT NULL DEFAULT 'web',
  route text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  wedding_id uuid REFERENCES public.weddings(id) ON DELETE SET NULL,
  role text,
  anonymous_id text,
  session_id text,
  request_id text,
  entity_type text,
  entity_id text,
  duration_ms integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  stack text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_events_occurred_at
  ON public.app_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_events_level_occurred_at
  ON public.app_events (level, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_events_event_name
  ON public.app_events (event_name, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_events_user
  ON public.app_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_events_account
  ON public.app_events (account_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_events_wedding
  ON public.app_events (wedding_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_events_session
  ON public.app_events (session_id, occurred_at DESC);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.app_events FROM anon, authenticated;
GRANT INSERT ON TABLE public.app_events TO anon, authenticated;
GRANT SELECT ON TABLE public.app_events TO authenticated;

DROP POLICY IF EXISTS "Visitantes registram eventos observabilidade" ON public.app_events;
CREATE POLICY "Visitantes registram eventos observabilidade"
ON public.app_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  level IN ('debug', 'info', 'warn', 'error')
  AND event_name IS NOT NULL
  AND length(event_name) <= 120
  AND (user_id IS NULL OR user_id = auth.uid())
  AND (
    account_id IS NULL
    OR account_id IN (
      SELECT p.account_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.account_id IS NOT NULL
    )
  )
  AND (
    wedding_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.wedding_members wm
      WHERE wm.wedding_id = app_events.wedding_id
        AND wm.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Usuarios veem eventos proprios" ON public.app_events;
CREATE POLICY "Usuarios veem eventos proprios"
ON public.app_events
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
  OR wedding_id IN (
    SELECT wm.wedding_id
    FROM public.wedding_members wm
    WHERE wm.user_id = auth.uid()
  )
);
