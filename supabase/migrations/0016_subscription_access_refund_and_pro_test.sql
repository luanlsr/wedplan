-- Controle de acesso por assinatura, janela de reembolso de 7 dias e usuario Pro de teste.
-- Aditiva e idempotente: nao remove dados existentes.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS access_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_id text,
  ADD COLUMN IF NOT EXISTS last_payment_status text,
  ADD COLUMN IF NOT EXISTS last_payment_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_status_source text,
  ADD COLUMN IF NOT EXISTS refund_window_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS refund_window_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_window_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_window_status text NOT NULL DEFAULT 'not_started'
    CHECK (refund_window_status IN ('not_started', 'eligible', 'expired', 'requested', 'refunded', 'denied')),
  ADD COLUMN IF NOT EXISTS refund_window_checked_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_current_period_start date,
  ADD COLUMN IF NOT EXISTS plan_access_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_access_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_access_source text,
  ADD COLUMN IF NOT EXISTS refund_window_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_window_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS refund_window_status text NOT NULL DEFAULT 'not_started'
    CHECK (refund_window_status IN ('not_started', 'eligible', 'expired', 'requested', 'refunded', 'denied'));

CREATE TABLE IF NOT EXISTS public.subscription_cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_refund boolean NOT NULL DEFAULT false,
  refund_window_status_at_request text NOT NULL DEFAULT 'not_started'
    CHECK (refund_window_status_at_request IN ('not_started', 'eligible', 'expired', 'requested', 'refunded', 'denied')),
  reason text,
  status text NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'reviewing', 'canceled', 'refunded', 'denied')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_access_status
  ON public.subscriptions (account_id, status, current_period_end);

CREATE INDEX IF NOT EXISTS idx_subscriptions_refund_window
  ON public.subscriptions (account_id, refund_window_status, refund_window_ends_at);

CREATE INDEX IF NOT EXISTS idx_profiles_access_status
  ON public.profiles (account_id, plan_status, plan_current_period_end);

CREATE INDEX IF NOT EXISTS idx_cancellation_requests_account
  ON public.subscription_cancellation_requests (account_id, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_cancellation_requests_requested_by
  ON public.subscription_cancellation_requests (requested_by, requested_at DESC);

ALTER TABLE public.subscription_cancellation_requests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON TABLE public.subscription_cancellation_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_subscription_access_state(p_account_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  status text,
  current_period_end date,
  access_expires_at timestamptz,
  refund_window_status text,
  refund_window_ends_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription public.subscriptions%ROWTYPE;
  v_effective_status text;
  v_refund_status text;
BEGIN
  IF p_account_id IS NULL THEN
    RETURN;
  END IF;

  SELECT *
  INTO v_subscription
  FROM public.subscriptions
  WHERE account_id = p_account_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_effective_status := v_subscription.status;
  IF v_effective_status IN ('active', 'trialing')
     AND v_subscription.current_period_end IS NOT NULL
     AND v_subscription.current_period_end < current_date THEN
    v_effective_status := 'past_due';
  END IF;

  v_refund_status := CASE
    WHEN v_subscription.refund_window_status IN ('requested', 'refunded', 'denied') THEN v_subscription.refund_window_status
    WHEN v_subscription.refund_window_ends_at IS NULL THEN 'not_started'
    WHEN now() <= v_subscription.refund_window_ends_at THEN 'eligible'
    ELSE 'expired'
  END;

  UPDATE public.subscriptions
  SET
    status = v_effective_status,
    access_expires_at = COALESCE(access_expires_at, (v_subscription.current_period_end::timestamp + time '23:59:59') AT TIME ZONE 'America/Sao_Paulo'),
    refund_window_status = v_refund_status,
    refund_window_checked_at = now(),
    last_status_checked_at = now(),
    last_status_source = COALESCE(last_status_source, 'database_refresh')
  WHERE id = v_subscription.id
  RETURNING * INTO v_subscription;

  UPDATE public.profiles
  SET
    plan_id = v_subscription.plan_id,
    plan_status = v_effective_status,
    billing_interval = v_subscription.billing_interval,
    plan_current_period_start = v_subscription.current_period_start,
    plan_current_period_end = v_subscription.current_period_end,
    plan_access_expires_at = v_subscription.access_expires_at,
    plan_access_checked_at = now(),
    plan_access_source = COALESCE(v_subscription.last_status_source, 'database_refresh'),
    refund_window_started_at = v_subscription.refund_window_started_at,
    refund_window_ends_at = v_subscription.refund_window_ends_at,
    refund_window_status = v_refund_status
  WHERE id = p_account_id OR account_id = p_account_id;

  UPDATE public.accounts
  SET
    status = CASE
      WHEN v_effective_status IN ('active', 'trialing') THEN 'active'
      WHEN v_effective_status = 'past_due' THEN 'past_due'
      WHEN v_effective_status IN ('canceled', 'expired') THEN 'canceled'
      ELSE 'pending_payment'
    END,
    updated_at = now()
  WHERE id = p_account_id;

  RETURN QUERY
  SELECT
    v_subscription.id,
    v_effective_status,
    v_subscription.current_period_end,
    v_subscription.access_expires_at,
    v_refund_status,
    v_subscription.refund_window_ends_at;
END;
$$;

DROP POLICY IF EXISTS "Usuário solicita cancelamento da própria assinatura" ON public.subscription_cancellation_requests;
CREATE POLICY "Usuário solicita cancelamento da própria assinatura"
ON public.subscription_cancellation_requests
FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND (
    account_id = auth.uid()
    OR account_id IN (
      SELECT p.account_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.account_id IS NOT NULL
    )
  )
);

DROP POLICY IF EXISTS "Usuário vê próprios pedidos de cancelamento" ON public.subscription_cancellation_requests;
CREATE POLICY "Usuário vê próprios pedidos de cancelamento"
ON public.subscription_cancellation_requests
FOR SELECT
TO authenticated
USING (
  public.is_master()
  OR requested_by = auth.uid()
  OR account_id = auth.uid()
  OR account_id IN (
    SELECT p.account_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.account_id IS NOT NULL
  )
);

DROP POLICY IF EXISTS "Master gerencia pedidos de cancelamento" ON public.subscription_cancellation_requests;
CREATE POLICY "Master gerencia pedidos de cancelamento"
ON public.subscription_cancellation_requests
FOR ALL
TO authenticated
USING (public.is_master())
WITH CHECK (public.is_master());

DROP TRIGGER IF EXISTS update_subscription_cancellation_requests_updated_at ON public.subscription_cancellation_requests;
CREATE TRIGGER update_subscription_cancellation_requests_updated_at
BEFORE UPDATE ON public.subscription_cancellation_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

WITH active_subscriptions AS (
  SELECT id, current_period_start, current_period_end, created_at
  FROM public.subscriptions
  WHERE status IN ('active', 'trialing')
)
UPDATE public.subscriptions s
SET
  access_expires_at = COALESCE(s.access_expires_at, (a.current_period_end::timestamp + time '23:59:59') AT TIME ZONE 'America/Sao_Paulo'),
  refund_window_started_at = COALESCE(s.refund_window_started_at, a.created_at),
  refund_window_ends_at = COALESCE(s.refund_window_ends_at, a.created_at + interval '7 days'),
  refund_window_status = CASE
    WHEN COALESCE(s.refund_window_ends_at, a.created_at + interval '7 days') >= now() THEN 'eligible'
    ELSE 'expired'
  END,
  refund_window_checked_at = now()
FROM active_subscriptions a
WHERE s.id = a.id;

INSERT INTO public.legal_documents (document_type, version, title, public_url, content_hash, is_active, published_at)
VALUES (
  'refund',
  '2026-08-31',
  'Política de Cancelamento e Reembolso WedPlan',
  '/termos-de-uso',
  'wedplan-refund-2026-08-31',
  true,
  now()
)
ON CONFLICT (document_type, version) DO UPDATE
SET
  title = EXCLUDED.title,
  public_url = EXCLUDED.public_url,
  content_hash = EXCLUDED.content_hash,
  is_active = true,
  published_at = COALESCE(public.legal_documents.published_at, EXCLUDED.published_at);

DO $$
DECLARE
  v_user_id uuid := '11111111-1111-4111-8111-111111111116';
  v_existing_user_id uuid;
  v_email text := 'teste.pro@wedplan.com.br';
  v_password text := 'WedPlanProTeste2026!';
  v_full_name text := 'Usuário Pro Teste';
  v_plan_id uuid;
  v_role_id uuid;
  v_crypto_schema text;
  v_encrypted_password text;
  v_identity_id_type text;
  v_wedding_id uuid;
BEGIN
  SELECT p.id INTO v_plan_id
  FROM public.plans p
  WHERE p.code = 'pro_couple'
  LIMIT 1;

  SELECT r.id INTO v_role_id
  FROM public.roles r
  WHERE r.name = 'couple'
  LIMIT 1;

  SELECT n.nspname INTO v_crypto_schema
  FROM pg_proc pr
  JOIN pg_namespace n ON n.oid = pr.pronamespace
  WHERE pr.proname = 'crypt'
  LIMIT 1;

  IF v_crypto_schema IS NULL THEN
    v_crypto_schema := 'extensions';
  END IF;

  EXECUTE format('SELECT %I.crypt($1, %I.gen_salt(''bf''))', v_crypto_schema, v_crypto_schema)
  INTO v_encrypted_password
  USING v_password;

  IF to_regclass('auth.users') IS NOT NULL THEN
    SELECT id INTO v_existing_user_id
    FROM auth.users
    WHERE lower(email) = lower(v_email)
    LIMIT 1;

    IF v_existing_user_id IS NOT NULL THEN
      v_user_id := v_existing_user_id;
    END IF;

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_password,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_full_name, 'test_account', true, 'plan_code', 'pro_couple'),
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      encrypted_password = EXCLUDED.encrypted_password,
      email_confirmed_at = COALESCE(auth.users.email_confirmed_at, EXCLUDED.email_confirmed_at),
      raw_app_meta_data = EXCLUDED.raw_app_meta_data,
      raw_user_meta_data = EXCLUDED.raw_user_meta_data,
      updated_at = now();

    IF to_regclass('auth.identities') IS NOT NULL THEN
      SELECT udt_name INTO v_identity_id_type
      FROM information_schema.columns
      WHERE table_schema = 'auth'
        AND table_name = 'identities'
        AND column_name = 'id'
      LIMIT 1;

      IF v_identity_id_type = 'uuid' THEN
        EXECUTE '
          INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, now(), now(), now())
          ON CONFLICT (provider, provider_id) DO UPDATE
          SET user_id = EXCLUDED.user_id,
              identity_data = EXCLUDED.identity_data,
              updated_at = now()
        '
        USING
          v_user_id,
          v_user_id,
          v_email,
          jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
          'email';
      ELSE
        EXECUTE '
          INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, now(), now(), now())
          ON CONFLICT (provider, provider_id) DO UPDATE
          SET user_id = EXCLUDED.user_id,
              identity_data = EXCLUDED.identity_data,
              updated_at = now()
        '
        USING
          v_user_id::text,
          v_user_id,
          v_email,
          jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
          'email';
      END IF;
    END IF;
  END IF;

  INSERT INTO public.accounts (id, status, asaas_customer_id, asaas_subscription_id)
  VALUES (v_user_id, 'active', 'test_customer_pro', 'test_subscription_pro')
  ON CONFLICT (id) DO UPDATE
  SET
    status = 'active',
    asaas_customer_id = EXCLUDED.asaas_customer_id,
    asaas_subscription_id = EXCLUDED.asaas_subscription_id,
    updated_at = now();

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    role_id,
    account_id,
    plan_id,
    plan_status,
    billing_interval,
    plan_current_period_start,
    plan_current_period_end,
    plan_access_expires_at,
    plan_assigned_at,
    plan_access_checked_at,
    plan_access_source,
    refund_window_started_at,
    refund_window_ends_at,
    refund_window_status
  )
  VALUES (
    v_user_id,
    v_email,
    v_full_name,
    'couple',
    v_role_id,
    v_user_id,
    v_plan_id,
    'active',
    'monthly',
    current_date,
    current_date + 30,
    ((current_date + 30)::timestamp + time '23:59:59') AT TIME ZONE 'America/Sao_Paulo',
    now(),
    now(),
    'migration_test_seed',
    now(),
    now() + interval '7 days',
    'eligible'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    role_id = EXCLUDED.role_id,
    account_id = EXCLUDED.account_id,
    plan_id = EXCLUDED.plan_id,
    plan_status = EXCLUDED.plan_status,
    billing_interval = EXCLUDED.billing_interval,
    plan_current_period_start = EXCLUDED.plan_current_period_start,
    plan_current_period_end = EXCLUDED.plan_current_period_end,
    plan_access_expires_at = EXCLUDED.plan_access_expires_at,
    plan_assigned_at = COALESCE(public.profiles.plan_assigned_at, EXCLUDED.plan_assigned_at),
    plan_access_checked_at = EXCLUDED.plan_access_checked_at,
    plan_access_source = EXCLUDED.plan_access_source,
    refund_window_started_at = EXCLUDED.refund_window_started_at,
    refund_window_ends_at = EXCLUDED.refund_window_ends_at,
    refund_window_status = EXCLUDED.refund_window_status,
    updated_at = now();

  INSERT INTO public.weddings (
    owner_id,
    account_id,
    couple_name1,
    couple_name2,
    wedding_date,
    total_budget,
    theme,
    asaas_subscription_id,
    subscription_status
  )
  VALUES (
    v_user_id,
    v_user_id,
    'Teste',
    'Pro',
    current_date + 365,
    85000,
    'light',
    'test_subscription_pro',
    'active'
  )
  ON CONFLICT (owner_id) DO UPDATE
  SET
    account_id = EXCLUDED.account_id,
    couple_name1 = EXCLUDED.couple_name1,
    couple_name2 = EXCLUDED.couple_name2,
    wedding_date = EXCLUDED.wedding_date,
    total_budget = EXCLUDED.total_budget,
    theme = EXCLUDED.theme,
    asaas_subscription_id = EXCLUDED.asaas_subscription_id,
    subscription_status = EXCLUDED.subscription_status,
    updated_at = now()
  RETURNING id INTO v_wedding_id;

  UPDATE public.profiles
  SET wedding_id = v_wedding_id
  WHERE id = v_user_id;

  INSERT INTO public.subscriptions (
    account_id,
    plan_id,
    status,
    billing_interval,
    asaas_customer_id,
    asaas_subscription_id,
    current_period_start,
    current_period_end,
    access_expires_at,
    last_payment_id,
    last_payment_status,
    last_payment_at,
    last_status_checked_at,
    last_status_source,
    refund_window_days,
    refund_window_started_at,
    refund_window_ends_at,
    refund_window_status,
    refund_window_checked_at,
    metadata
  )
  VALUES (
    v_user_id,
    v_plan_id,
    'active',
    'monthly',
    'test_customer_pro',
    'test_subscription_pro',
    current_date,
    current_date + 30,
    ((current_date + 30)::timestamp + time '23:59:59') AT TIME ZONE 'America/Sao_Paulo',
    'test_payment_pro',
    'CONFIRMED',
    now(),
    now(),
    'migration_test_seed',
    7,
    now(),
    now() + interval '7 days',
    'eligible',
    now(),
    jsonb_build_object('test_account', true, 'wedding_id', v_wedding_id)
  )
  ON CONFLICT (asaas_subscription_id) DO UPDATE
  SET
    account_id = EXCLUDED.account_id,
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    billing_interval = EXCLUDED.billing_interval,
    asaas_customer_id = EXCLUDED.asaas_customer_id,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    access_expires_at = EXCLUDED.access_expires_at,
    last_payment_id = EXCLUDED.last_payment_id,
    last_payment_status = EXCLUDED.last_payment_status,
    last_payment_at = EXCLUDED.last_payment_at,
    last_status_checked_at = EXCLUDED.last_status_checked_at,
    last_status_source = EXCLUDED.last_status_source,
    refund_window_days = EXCLUDED.refund_window_days,
    refund_window_started_at = EXCLUDED.refund_window_started_at,
    refund_window_ends_at = EXCLUDED.refund_window_ends_at,
    refund_window_status = EXCLUDED.refund_window_status,
    refund_window_checked_at = EXCLUDED.refund_window_checked_at,
    metadata = EXCLUDED.metadata,
    updated_at = now();
END;
$$;
