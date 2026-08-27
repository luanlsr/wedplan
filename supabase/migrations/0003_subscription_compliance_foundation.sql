-- Fundação incremental para assinatura mensal, checkout seguro e LGPD.
-- Não remove dados nem altera a migration 0002 já aplicada.
-- A criação de usuário Auth após pagamento deve acontecer via Edge Function com service_role.

CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL,
  price_yearly numeric(10,2),
  currency text NOT NULL DEFAULT 'BRL',
  billing_provider text NOT NULL DEFAULT 'asaas',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  feature_value jsonb NOT NULL DEFAULT 'true'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, feature_key)
);

CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'payment_pending', 'paid', 'expired', 'canceled', 'failed')),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  cpf_cnpj text,
  asaas_customer_id text,
  asaas_subscription_id text,
  asaas_payment_id text,
  checkout_url text,
  accepted_terms_at timestamptz,
  accepted_privacy_at timestamptz,
  marketing_consent boolean NOT NULL DEFAULT false,
  source text,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours'),
  created_account_id uuid REFERENCES public.accounts(id),
  created_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'expired')),
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
  asaas_customer_id text,
  asaas_subscription_id text UNIQUE,
  current_period_start date,
  current_period_end date,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'asaas',
  event_type text NOT NULL,
  provider_event_id text NOT NULL DEFAULT gen_random_uuid()::text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type IN ('terms', 'privacy', 'cookies', 'refund')),
  version text NOT NULL,
  title text NOT NULL,
  public_url text,
  content_hash text,
  is_active boolean NOT NULL DEFAULT true,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_type, version)
);

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_document_id uuid NOT NULL REFERENCES public.legal_documents(id),
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  checkout_session_id uuid REFERENCES public.checkout_sessions(id) ON DELETE SET NULL,
  email text,
  ip_address inet,
  user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cookie_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  anonymous_id text,
  policy_version text NOT NULL DEFAULT '2026-08-27',
  necessary boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  preferences boolean NOT NULL DEFAULT false,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wedding_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  title text,
  welcome_message text,
  cover_image_url text,
  custom_domain text UNIQUE,
  custom_domain_status text NOT NULL DEFAULT 'not_requested' CHECK (custom_domain_status IN ('not_requested', 'checking', 'available', 'reserved', 'configured', 'failed')),
  rsvp_enabled boolean NOT NULL DEFAULT true,
  gift_list_enabled boolean NOT NULL DEFAULT true,
  messages_enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding_id)
);

CREATE TABLE IF NOT EXISTS public.domain_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  requested_domain text NOT NULL,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'checking', 'available', 'unavailable', 'awaiting_payment', 'purchased', 'configured', 'failed', 'canceled')),
  availability_provider text,
  provider_order_id text,
  setup_fee numeric(10,2) NOT NULL DEFAULT 0,
  annual_fee numeric(10,2) NOT NULL DEFAULT 0,
  billing_status text NOT NULL DEFAULT 'not_charged' CHECK (billing_status IN ('not_charged', 'pending', 'paid', 'failed', 'refunded')),
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guest_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_email text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden')),
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_email ON public.checkout_sessions (lower(email));
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status ON public.checkout_sessions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_account ON public.subscriptions (account_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_account ON public.legal_acceptances (account_id);
CREATE INDEX IF NOT EXISTS idx_cookie_consents_account ON public.cookie_consents (account_id);
CREATE INDEX IF NOT EXISTS idx_cookie_consents_anonymous ON public.cookie_consents (anonymous_id);
CREATE INDEX IF NOT EXISTS idx_wedding_sites_wedding ON public.wedding_sites (wedding_id);
CREATE INDEX IF NOT EXISTS idx_wedding_sites_status ON public.wedding_sites (status);
CREATE INDEX IF NOT EXISTS idx_domain_requests_site ON public.domain_requests (wedding_site_id);
CREATE INDEX IF NOT EXISTS idx_domain_requests_status ON public.domain_requests (status);
CREATE INDEX IF NOT EXISTS idx_guest_messages_wedding ON public.guest_messages (wedding_id);
CREATE INDEX IF NOT EXISTS idx_guest_messages_status ON public.guest_messages (status);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.plans FROM anon, authenticated;
REVOKE ALL ON TABLE public.plan_features FROM anon, authenticated;
REVOKE ALL ON TABLE public.checkout_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.subscriptions FROM anon, authenticated;
REVOKE ALL ON TABLE public.subscription_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.legal_documents FROM anon, authenticated;
REVOKE ALL ON TABLE public.legal_acceptances FROM anon, authenticated;
REVOKE ALL ON TABLE public.cookie_consents FROM anon, authenticated;
REVOKE ALL ON TABLE public.wedding_sites FROM anon, authenticated;
REVOKE ALL ON TABLE public.domain_requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.guest_messages FROM anon, authenticated;

GRANT SELECT ON TABLE public.plans TO anon, authenticated;
GRANT SELECT ON TABLE public.plan_features TO anon, authenticated;
GRANT SELECT ON TABLE public.legal_documents TO anon, authenticated;
GRANT INSERT ON TABLE public.legal_acceptances TO anon, authenticated;
GRANT INSERT ON TABLE public.cookie_consents TO anon, authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;
GRANT SELECT ON TABLE public.checkout_sessions TO authenticated;
GRANT SELECT ON TABLE public.legal_acceptances TO authenticated;
GRANT SELECT ON TABLE public.cookie_consents TO authenticated;
GRANT SELECT ON TABLE public.wedding_sites TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.wedding_sites TO authenticated;
GRANT SELECT, INSERT ON TABLE public.domain_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.guest_messages TO anon, authenticated;

CREATE POLICY "Planos ativos são públicos"
ON public.plans
FOR SELECT
TO anon, authenticated
USING (is_active = true OR public.is_master());

CREATE POLICY "Master gerencia planos"
ON public.plans
FOR ALL
TO authenticated
USING (public.is_master())
WITH CHECK (public.is_master());

CREATE POLICY "Features de planos ativos são públicas"
ON public.plan_features
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.plans p
    WHERE p.id = plan_features.plan_id
      AND (p.is_active = true OR public.is_master())
  )
);

CREATE POLICY "Master gerencia features"
ON public.plan_features
FOR ALL
TO authenticated
USING (public.is_master())
WITH CHECK (public.is_master());

CREATE POLICY "Usuário vê sessões que criaram sua conta"
ON public.checkout_sessions
FOR SELECT
TO authenticated
USING (created_user_id = auth.uid() OR public.is_master());

CREATE POLICY "Usuário vê própria assinatura"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (account_id = auth.uid() OR public.is_master());

CREATE POLICY "Master vê eventos de assinatura"
ON public.subscription_events
FOR SELECT
TO authenticated
USING (public.is_master());

CREATE POLICY "Documentos legais publicados são públicos"
ON public.legal_documents
FOR SELECT
TO anon, authenticated
USING ((is_active = true AND published_at IS NOT NULL) OR public.is_master());

CREATE POLICY "Master gerencia documentos legais"
ON public.legal_documents
FOR ALL
TO authenticated
USING (public.is_master())
WITH CHECK (public.is_master());

CREATE POLICY "Qualquer visitante registra aceite legal"
ON public.legal_acceptances
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Usuário vê próprios aceites legais"
ON public.legal_acceptances
FOR SELECT
TO authenticated
USING (account_id = auth.uid() OR public.is_master());

CREATE POLICY "Qualquer visitante registra consentimento de cookies"
ON public.cookie_consents
FOR INSERT
TO anon, authenticated
WITH CHECK (necessary = true);

CREATE POLICY "Usuário vê próprios consentimentos"
ON public.cookie_consents
FOR SELECT
TO authenticated
USING (account_id = auth.uid() OR public.is_master());

CREATE POLICY "Sites publicados são públicos"
ON public.wedding_sites
FOR SELECT
TO anon, authenticated
USING (status = 'published' OR public.is_master() OR EXISTS (
  SELECT 1
  FROM public.weddings w
  WHERE w.id = wedding_sites.wedding_id
    AND (
      w.owner_id = auth.uid()
      OR w.account_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.wedding_members wm
        WHERE wm.wedding_id = w.id
          AND wm.user_id = auth.uid()
      )
    )
));

CREATE POLICY "Casal gerencia site do próprio casamento"
ON public.wedding_sites
FOR ALL
TO authenticated
USING (public.is_master() OR EXISTS (
  SELECT 1
  FROM public.weddings w
  WHERE w.id = wedding_sites.wedding_id
    AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
))
WITH CHECK (public.is_master() OR EXISTS (
  SELECT 1
  FROM public.weddings w
  WHERE w.id = wedding_sites.wedding_id
    AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
));

CREATE POLICY "Casal vê pedidos de domínio do próprio site"
ON public.domain_requests
FOR SELECT
TO authenticated
USING (public.is_master() OR EXISTS (
  SELECT 1
  FROM public.wedding_sites ws
  JOIN public.weddings w ON w.id = ws.wedding_id
  WHERE ws.id = domain_requests.wedding_site_id
    AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
));

CREATE POLICY "Casal solicita domínio do próprio site"
ON public.domain_requests
FOR INSERT
TO authenticated
WITH CHECK (public.is_master() OR EXISTS (
  SELECT 1
  FROM public.wedding_sites ws
  JOIN public.weddings w ON w.id = ws.wedding_id
  WHERE ws.id = domain_requests.wedding_site_id
    AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
));

CREATE POLICY "Master gerencia pedidos de domínio"
ON public.domain_requests
FOR ALL
TO authenticated
USING (public.is_master())
WITH CHECK (public.is_master());

CREATE POLICY "Mensagens aprovadas do site são públicas"
ON public.guest_messages
FOR SELECT
TO anon, authenticated
USING (status = 'approved' OR public.is_master() OR EXISTS (
  SELECT 1
  FROM public.weddings w
  WHERE w.id = guest_messages.wedding_id
    AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
));

CREATE POLICY "Visitante envia mensagem em site publicado"
ON public.guest_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.wedding_sites ws
  WHERE ws.wedding_id = guest_messages.wedding_id
    AND ws.status = 'published'
    AND ws.messages_enabled = true
));

CREATE POLICY "Casal modera mensagens do próprio casamento"
ON public.guest_messages
FOR UPDATE
TO authenticated
USING (public.is_master() OR EXISTS (
  SELECT 1
  FROM public.weddings w
  WHERE w.id = guest_messages.wedding_id
    AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
))
WITH CHECK (public.is_master() OR EXISTS (
  SELECT 1
  FROM public.weddings w
  WHERE w.id = guest_messages.wedding_id
    AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
));

DROP TRIGGER IF EXISTS update_plans_updated_at ON public.plans;
CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_checkout_sessions_updated_at ON public.checkout_sessions;
CREATE TRIGGER update_checkout_sessions_updated_at
BEFORE UPDATE ON public.checkout_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_wedding_sites_updated_at ON public.wedding_sites;
CREATE TRIGGER update_wedding_sites_updated_at
BEFORE UPDATE ON public.wedding_sites
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_domain_requests_updated_at ON public.domain_requests;
CREATE TRIGGER update_domain_requests_updated_at
BEFORE UPDATE ON public.domain_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_guest_messages_updated_at ON public.guest_messages;
CREATE TRIGGER update_guest_messages_updated_at
BEFORE UPDATE ON public.guest_messages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plans (code, name, description, price_monthly, price_yearly, sort_order)
VALUES
  ('essential', 'Essencial', 'Organização básica para o casal começar sem planilhas soltas.', 14.90, 149.00, 10),
  ('premium', 'Premium', 'Gestão completa de convidados, fornecedores, tarefas e financeiro.', 24.90, 249.00, 20),
  ('pro_couple', 'Pro Casal', 'Inclui site público do casal, RSVP, mensagens e lista de presentes.', 39.90, 399.00, 30),
  ('pro_agency', 'Pro Assessoria', 'Plano para assessorias com múltiplos casamentos e recursos Pro.', 79.90, 799.00, 40)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    sort_order = EXCLUDED.sort_order,
    is_active = true;

WITH feature_seed(plan_code, feature_key, feature_value) AS (
  VALUES
    ('essential', 'max_guests', '150'::jsonb),
    ('essential', 'tasks', 'true'::jsonb),
    ('essential', 'suppliers', 'true'::jsonb),
    ('essential', 'financial_dashboard', 'false'::jsonb),
    ('essential', 'public_checkin', 'false'::jsonb),
    ('essential', 'wedding_site', 'false'::jsonb),
    ('premium', 'max_guests', '500'::jsonb),
    ('premium', 'tasks', 'true'::jsonb),
    ('premium', 'suppliers', 'true'::jsonb),
    ('premium', 'financial_dashboard', 'true'::jsonb),
    ('premium', 'public_checkin', 'true'::jsonb),
    ('premium', 'wedding_site', 'false'::jsonb),
    ('pro_couple', 'max_guests', '1000'::jsonb),
    ('pro_couple', 'financial_dashboard', 'true'::jsonb),
    ('pro_couple', 'public_checkin', 'true'::jsonb),
    ('pro_couple', 'wedding_site', 'true'::jsonb),
    ('pro_couple', 'gift_list', 'true'::jsonb),
    ('pro_couple', 'guest_messages', 'true'::jsonb),
    ('pro_couple', 'custom_domain_addon', 'true'::jsonb),
    ('pro_agency', 'multiple_weddings', 'true'::jsonb),
    ('pro_agency', 'financial_dashboard', 'true'::jsonb),
    ('pro_agency', 'public_checkin', 'true'::jsonb),
    ('pro_agency', 'wedding_site', 'true'::jsonb),
    ('pro_agency', 'gift_list', 'true'::jsonb),
    ('pro_agency', 'guest_messages', 'true'::jsonb),
    ('pro_agency', 'custom_domain_addon', 'true'::jsonb)
)
INSERT INTO public.plan_features (plan_id, feature_key, feature_value)
SELECT p.id, fs.feature_key, fs.feature_value
FROM feature_seed fs
JOIN public.plans p ON p.code = fs.plan_code
ON CONFLICT (plan_id, feature_key) DO UPDATE
SET feature_value = EXCLUDED.feature_value;

INSERT INTO public.legal_documents (document_type, version, title, public_url, is_active, published_at)
VALUES
  ('terms', '2026-08-27', 'Termos de Uso WedPlan', '/legal/termos', false, NULL),
  ('privacy', '2026-08-27', 'Política de Privacidade WedPlan', '/legal/privacidade', false, NULL),
  ('cookies', '2026-08-27', 'Política de Cookies WedPlan', '/legal/cookies', false, NULL),
  ('refund', '2026-08-27', 'Política de Reembolso e Cancelamento WedPlan', '/legal/reembolso', false, NULL)
ON CONFLICT (document_type, version) DO NOTHING;
