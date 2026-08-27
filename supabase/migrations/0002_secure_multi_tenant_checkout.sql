-- Segurança SaaS incremental para produção.
-- Não remove tabelas, não apaga dados e mantém o usuário existente.
-- Objetivos:
-- 1) substituir leitura/escrita pública direta de check-in por RPCs com token;
-- 2) fechar policies anon abertas em weddings/guests;
-- 3) permitir leitura controlada de accounts/account_types/roles para checkout/admin.

CREATE OR REPLACE FUNCTION public.public_get_checkin_data(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wedding_id uuid;
  v_payload jsonb;
BEGIN
  SELECT id
    INTO v_wedding_id
  FROM public.weddings
  WHERE public_checkin_token = p_token
  LIMIT 1;

  IF v_wedding_id IS NULL THEN
    RETURN jsonb_build_object(
      'casal', jsonb_build_object('nome1', '', 'nome2', '', 'data', ''),
      'convidados', '[]'::jsonb
    );
  END IF;

  SELECT jsonb_build_object(
    'casal', jsonb_build_object(
      'nome1', COALESCE(w.couple_name1, ''),
      'nome2', COALESCE(w.couple_name2, ''),
      'data', COALESCE(w.wedding_date::text, '')
    ),
    'convidados', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', g.id,
          'nome', g.nome,
          'categoria', g.categoria,
          'status', g.status,
          'adultos', g.adultos,
          'criancas', g.criancas,
          'children_names', g.children_names,
          'telefone', g.telefone,
          'observacoes', g.observacoes,
          'is_present', g.is_present,
          'invitation_sent', g.invitation_sent
        )
        ORDER BY g.nome
      )
      FROM public.guests g
      WHERE g.wedding_id = w.id
    ), '[]'::jsonb)
  )
    INTO v_payload
  FROM public.weddings w
  WHERE w.id = v_wedding_id;

  RETURN v_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.public_toggle_guest_presence(
  p_token uuid,
  p_guest_id uuid,
  p_is_present boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wedding_id uuid;
  v_guest public.guests%rowtype;
BEGIN
  SELECT id
    INTO v_wedding_id
  FROM public.weddings
  WHERE public_checkin_token = p_token
  LIMIT 1;

  IF v_wedding_id IS NULL THEN
    RAISE EXCEPTION 'Token inválido';
  END IF;

  UPDATE public.guests
  SET is_present = p_is_present,
      updated_at = now()
  WHERE id = p_guest_id
    AND wedding_id = v_wedding_id
  RETURNING *
    INTO v_guest;

  IF v_guest.id IS NULL THEN
    RAISE EXCEPTION 'Convidado não encontrado';
  END IF;

  RETURN jsonb_build_object(
    'id', v_guest.id,
    'nome', v_guest.nome,
    'categoria', v_guest.categoria,
    'status', v_guest.status,
    'adultos', v_guest.adultos,
    'criancas', v_guest.criancas,
    'children_names', v_guest.children_names,
    'telefone', v_guest.telefone,
    'observacoes', v_guest.observacoes,
    'is_present', v_guest.is_present,
    'invitation_sent', v_guest.invitation_sent
  );
END;
$$;

REVOKE ALL ON FUNCTION public.public_get_checkin_data(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_toggle_guest_presence(uuid, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_get_checkin_data(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_toggle_guest_presence(uuid, uuid, boolean) TO anon, authenticated;

DROP POLICY IF EXISTS "Leitura pública de convidados" ON public.guests;
DROP POLICY IF EXISTS "Leitura pública do casamento via token" ON public.weddings;
DROP POLICY IF EXISTS "Check-in via Token Público" ON public.guests;

CREATE POLICY "Usuário vê própria conta"
ON public.accounts
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.is_master());

CREATE POLICY "Master gerencia contas"
ON public.accounts
FOR ALL
TO authenticated
USING (public.is_master())
WITH CHECK (public.is_master());

CREATE POLICY "Usuários autenticados veem tipos de conta"
ON public.account_types
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Master gerencia tipos de conta"
ON public.account_types
FOR ALL
TO authenticated
USING (public.is_master())
WITH CHECK (public.is_master());

CREATE POLICY "Usuários autenticados veem roles"
ON public.roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Master gerencia roles"
ON public.roles
FOR ALL
TO authenticated
USING (public.is_master())
WITH CHECK (public.is_master());

INSERT INTO public.account_types (name, price, features)
VALUES (
  'Premium 2026',
  197.00,
  jsonb_build_object(
    'guests', 'unlimited',
    'suppliers', 'unlimited',
    'financial_dashboard', true,
    'public_checkin', true,
    'guided_onboarding', true
  )
)
ON CONFLICT (name) DO UPDATE
SET price = EXCLUDED.price,
    features = COALESCE(account_types.features, '{}'::jsonb) || EXCLUDED.features;
