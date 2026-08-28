-- Vínculo direto do usuário ao plano comercial atual.
-- Migration aditiva: mantém profiles.account_id e accounts para compatibilidade legado.
-- A nova fonte preferencial de plano passa a ser profiles.plan_id.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS plan_status text CHECK (
  plan_status IS NULL OR plan_status IN ('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'expired', 'pending_payment')
),
ADD COLUMN IF NOT EXISTS billing_interval text CHECK (
  billing_interval IS NULL OR billing_interval IN ('monthly', 'yearly')
),
ADD COLUMN IF NOT EXISTS plan_current_period_end date,
ADD COLUMN IF NOT EXISTS plan_assigned_at timestamptz;

COMMENT ON COLUMN public.profiles.plan_id IS
  'Plano comercial atual do usuário. Substitui gradualmente o uso de profiles.account_id/accounts para controle de acesso por plano.';

COMMENT ON COLUMN public.profiles.plan_status IS
  'Status comercial do plano vinculado diretamente ao perfil.';

COMMENT ON COLUMN public.profiles.billing_interval IS
  'Periodicidade comercial do plano vinculado diretamente ao perfil.';

COMMENT ON COLUMN public.profiles.plan_current_period_end IS
  'Fim do ciclo atual do plano quando houver controle de assinatura.';

COMMENT ON COLUMN public.profiles.plan_assigned_at IS
  'Momento em que o plano atual foi vinculado diretamente ao perfil.';

CREATE INDEX IF NOT EXISTS idx_profiles_plan_id
ON public.profiles (plan_id);

CREATE INDEX IF NOT EXISTS idx_profiles_plan_status
ON public.profiles (plan_status);

UPDATE public.profiles p
SET
  plan_id = s.plan_id,
  plan_status = s.status,
  billing_interval = s.billing_interval,
  plan_current_period_end = s.current_period_end,
  plan_assigned_at = COALESCE(p.plan_assigned_at, s.created_at, now())
FROM (
  SELECT DISTINCT ON (account_id)
    account_id,
    plan_id,
    status,
    billing_interval,
    current_period_end,
    created_at
  FROM public.subscriptions
  WHERE status IN ('active', 'trialing', 'past_due')
  ORDER BY account_id, created_at DESC
) s
WHERE p.account_id = s.account_id
  AND p.plan_id IS NULL;
