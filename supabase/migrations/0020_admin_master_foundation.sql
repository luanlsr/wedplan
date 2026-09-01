-- Fundacao do perfil Admin Master.
-- Cria um usuario master inicial, alinha role legada + role_id e reforca policies sensiveis.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

INSERT INTO public.roles (name, description)
VALUES
  ('master', 'Administrador geral do sistema WedPlan'),
  ('couple', 'Usuario casal/cliente do WedPlan'),
  ('staff', 'Equipe operacional com acesso limitado')
ON CONFLICT (name) DO UPDATE
SET description = COALESCE(EXCLUDED.description, public.roles.description);

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = auth.uid()
      AND (
        p.role = 'master'
        OR r.name = 'master'
      )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_master() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Roles visiveis para autenticados" ON public.roles;
CREATE POLICY "Roles visiveis para autenticados"
ON public.roles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Usuario ve propria conta" ON public.accounts;
CREATE POLICY "Usuario ve propria conta"
ON public.accounts
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.account_id = public.accounts.id
  )
);

DROP POLICY IF EXISTS "Master gerencia contas" ON public.accounts;
CREATE POLICY "Master gerencia contas"
ON public.accounts
FOR ALL
TO authenticated
USING (public.is_master())
WITH CHECK (public.is_master());

DO $$
DECLARE
  v_user_id uuid := '11111111-1111-4111-8111-111111111120';
  v_existing_user_id uuid;
  v_email text := 'admin.master@wedplan.com.br';
  v_password text := 'WedPlanMaster2026!Trocar';
  v_full_name text := 'Admin Master WedPlan';
  v_master_role_id uuid;
  v_account_type_id uuid;
  v_plan_id uuid;
  v_crypto_schema text;
  v_encrypted_password text;
  v_identity_id_type text;
BEGIN
  SELECT id INTO v_master_role_id
  FROM public.roles
  WHERE name = 'master'
  LIMIT 1;

  SELECT id INTO v_account_type_id
  FROM public.account_types
  ORDER BY price DESC NULLS LAST
  LIMIT 1;

  SELECT id INTO v_plan_id
  FROM public.plans
  WHERE code IN ('pro_agency', 'pro_couple', 'premium')
  ORDER BY
    CASE code
      WHEN 'pro_agency' THEN 1
      WHEN 'pro_couple' THEN 2
      WHEN 'premium' THEN 3
      ELSE 4
    END
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
      jsonb_build_object('full_name', v_full_name, 'app_role', 'master', 'seeded_by', '0020_admin_master_foundation'),
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

  INSERT INTO public.accounts (id, status, account_type_id)
  VALUES (v_user_id, 'active', v_account_type_id)
  ON CONFLICT (id) DO UPDATE
  SET
    status = 'active',
    account_type_id = COALESCE(EXCLUDED.account_type_id, public.accounts.account_type_id),
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
    plan_assigned_at,
    plan_access_checked_at,
    plan_access_source,
    refund_window_status
  )
  VALUES (
    v_user_id,
    v_email,
    v_full_name,
    'master',
    v_master_role_id,
    v_user_id,
    v_plan_id,
    'active',
    'monthly',
    now(),
    now(),
    'migration_admin_master_seed',
    'not_started'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = 'master',
    role_id = v_master_role_id,
    account_id = EXCLUDED.account_id,
    plan_id = COALESCE(EXCLUDED.plan_id, public.profiles.plan_id),
    plan_status = 'active',
    billing_interval = COALESCE(public.profiles.billing_interval, EXCLUDED.billing_interval),
    plan_assigned_at = COALESCE(public.profiles.plan_assigned_at, EXCLUDED.plan_assigned_at),
    plan_access_checked_at = now(),
    plan_access_source = 'migration_admin_master_seed',
    refund_window_status = COALESCE(public.profiles.refund_window_status, EXCLUDED.refund_window_status),
    updated_at = now();
END;
$$;
