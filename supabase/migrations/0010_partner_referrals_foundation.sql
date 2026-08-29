-- Fundacao para WedPlan Parceiros.
-- Aditiva e segura para producao: nao remove dados existentes.

CREATE TABLE IF NOT EXISTS public.partner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_type text NOT NULL DEFAULT 'cerimonialista'
    CHECK (partner_type IN ('cerimonialista', 'buffet', 'fotografo', 'espaco', 'dj', 'vestido', 'outro')),
  business_name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  referral_code text NOT NULL UNIQUE,
  commission_type text NOT NULL DEFAULT 'monthly_fixed'
    CHECK (commission_type IN ('monthly_fixed', 'first_purchase_percent', 'monthly_percent', 'none')),
  commission_value numeric(10,2) NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'paused', 'blocked')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id)
);

CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
  checkout_session_id uuid REFERENCES public.checkout_sessions(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  referred_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  referred_wedding_id uuid REFERENCES public.weddings(id) ON DELETE SET NULL,
  referred_email text,
  status text NOT NULL DEFAULT 'lead'
    CHECK (status IN ('lead', 'checkout_started', 'paid', 'active', 'canceled', 'invalid')),
  source text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  converted_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.partner_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partner_profiles(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES public.partner_referrals(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  competence_month date NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'paid', 'canceled')),
  paid_at timestamptz,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS partner_referral_id uuid REFERENCES public.partner_referrals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partner_profiles_profile ON public.partner_profiles(profile_id);
CREATE INDEX IF NOT EXISTS idx_partner_profiles_referral_code ON public.partner_profiles(lower(referral_code));
CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner ON public.partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_status ON public.partner_referrals(status);
CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner ON public.partner_commissions(partner_id, competence_month);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_referral_code ON public.checkout_sessions(lower(referral_code));

ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON TABLE public.partner_profiles TO authenticated;
GRANT SELECT ON TABLE public.partner_referrals TO authenticated;
GRANT SELECT ON TABLE public.partner_commissions TO authenticated;

DROP POLICY IF EXISTS "Parceiro gerencia proprio perfil" ON public.partner_profiles;
CREATE POLICY "Parceiro gerencia proprio perfil"
ON public.partner_profiles
FOR ALL
TO authenticated
USING (public.is_master() OR profile_id = auth.uid())
WITH CHECK (public.is_master() OR profile_id = auth.uid());

DROP POLICY IF EXISTS "Parceiro ve indicacoes proprias" ON public.partner_referrals;
CREATE POLICY "Parceiro ve indicacoes proprias"
ON public.partner_referrals
FOR SELECT
TO authenticated
USING (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.partner_profiles pp
    WHERE pp.id = partner_referrals.partner_id
      AND pp.profile_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Parceiro ve comissoes proprias" ON public.partner_commissions;
CREATE POLICY "Parceiro ve comissoes proprias"
ON public.partner_commissions
FOR SELECT
TO authenticated
USING (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.partner_profiles pp
    WHERE pp.id = partner_commissions.partner_id
      AND pp.profile_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS update_partner_profiles_updated_at ON public.partner_profiles;
CREATE TRIGGER update_partner_profiles_updated_at
BEFORE UPDATE ON public.partner_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_referrals_updated_at ON public.partner_referrals;
CREATE TRIGGER update_partner_referrals_updated_at
BEFORE UPDATE ON public.partner_referrals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_partner_commissions_updated_at ON public.partner_commissions;
CREATE TRIGGER update_partner_commissions_updated_at
BEFORE UPDATE ON public.partner_commissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
