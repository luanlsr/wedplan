-- Ajusta a policy de insercao de observabilidade para aceitar donos e perfis
-- vinculados ao casamento, alem de wedding_members.

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
    OR public.is_master()
    OR EXISTS (
      SELECT 1
      FROM public.weddings w
      WHERE w.id = app_events.wedding_id
        AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.wedding_id = app_events.wedding_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.wedding_members wm
      WHERE wm.wedding_id = app_events.wedding_id
        AND wm.user_id = auth.uid()
    )
  )
);
