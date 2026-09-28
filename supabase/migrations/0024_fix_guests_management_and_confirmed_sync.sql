-- Garante que a tabela guests seja a fonte editavel do app e receba novas confirmacoes.
-- Corrige RLS para dono/conta/profile/membro do casamento e sincroniza convidados_confirmados -> guests.

CREATE EXTENSION IF NOT EXISTS unaccent;

DROP POLICY IF EXISTS "Membros gerenciam convidados" ON public.guests;
CREATE POLICY "Membros gerenciam convidados"
ON public.guests
FOR ALL
TO authenticated
USING (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    LEFT JOIN public.profiles p ON p.id = auth.uid()
    WHERE w.id = guests.wedding_id
      AND (
        w.owner_id = auth.uid()
        OR w.account_id = auth.uid()
        OR p.wedding_id = w.id
        OR (w.account_id IS NOT NULL AND p.account_id = w.account_id)
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.wedding_members wm
    WHERE wm.wedding_id = guests.wedding_id
      AND wm.user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    LEFT JOIN public.profiles p ON p.id = auth.uid()
    WHERE w.id = guests.wedding_id
      AND (
        w.owner_id = auth.uid()
        OR w.account_id = auth.uid()
        OR p.wedding_id = w.id
        OR (w.account_id IS NOT NULL AND p.account_id = w.account_id)
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.wedding_members wm
    WHERE wm.wedding_id = guests.wedding_id
      AND wm.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.sync_convidados_confirmados_to_guests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload jsonb := to_jsonb(NEW);
  v_wedding_id uuid;
  v_guest_id uuid;
  v_name text;
  v_phone text;
  v_phone_digits text;
  v_email text;
BEGIN
  IF COALESCE(v_payload->>'wedding_id', '') = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_wedding_id := (v_payload->>'wedding_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  v_name := nullif(trim(coalesce(
    v_payload->>'nome',
    v_payload->>'name',
    v_payload->>'full_name',
    v_payload->>'nome_completo',
    v_payload->>'convidado',
    v_payload->>'guest_name'
  )), '');

  v_phone := nullif(trim(coalesce(
    v_payload->>'telefone',
    v_payload->>'phone',
    v_payload->>'whatsapp',
    v_payload->>'celular',
    v_payload->>'mobile'
  )), '');
  v_phone_digits := nullif(regexp_replace(coalesce(v_phone, ''), '\D', '', 'g'), '');

  v_email := nullif(lower(trim(coalesce(
    v_payload->>'email',
    v_payload->>'mail',
    v_payload->>'e_mail'
  ))), '');

  IF v_name IS NULL AND v_phone_digits IS NULL AND v_email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT g.id INTO v_guest_id
  FROM public.guests g
  WHERE g.wedding_id = v_wedding_id
    AND (
      (v_phone_digits IS NOT NULL AND regexp_replace(coalesce(g.telefone, ''), '\D', '', 'g') = v_phone_digits)
      OR (v_email IS NOT NULL AND lower(coalesce(g.observacoes, '')) LIKE '%' || v_email || '%')
      OR (
        v_name IS NOT NULL
        AND lower(unaccent(g.nome)) = lower(unaccent(v_name))
      )
    )
  ORDER BY
    CASE
      WHEN v_phone_digits IS NOT NULL AND regexp_replace(coalesce(g.telefone, ''), '\D', '', 'g') = v_phone_digits THEN 1
      WHEN v_email IS NOT NULL AND lower(coalesce(g.observacoes, '')) LIKE '%' || v_email || '%' THEN 2
      ELSE 3
    END
  LIMIT 1;

  IF v_guest_id IS NULL THEN
    INSERT INTO public.guests (
      wedding_id,
      nome,
      categoria,
      status,
      adultos,
      criancas,
      children_names,
      telefone,
      observacoes,
      is_present,
      invitation_sent
    )
    VALUES (
      v_wedding_id,
      COALESCE(v_name, v_phone, v_email, 'Convidado confirmado'),
      'Outros',
      'confirmado',
      1,
      0,
      '',
      v_phone,
      CASE WHEN v_email IS NOT NULL THEN 'E-mail confirmado: ' || v_email ELSE '' END,
      false,
      true
    );
  ELSE
    UPDATE public.guests
    SET
      status = 'confirmado',
      telefone = COALESCE(v_phone, telefone),
      observacoes = CASE
        WHEN v_email IS NOT NULL AND coalesce(observacoes, '') NOT ILIKE '%' || v_email || '%'
          THEN trim(coalesce(observacoes, '') || E'\nE-mail confirmado: ' || v_email)
        ELSE observacoes
      END,
      invitation_sent = true,
      updated_at = now()
    WHERE id = v_guest_id;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.convidados_confirmados') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_sync_convidados_confirmados_to_guests ON public.convidados_confirmados;
    CREATE TRIGGER trg_sync_convidados_confirmados_to_guests
    AFTER INSERT OR UPDATE ON public.convidados_confirmados
    FOR EACH ROW EXECUTE FUNCTION public.sync_convidados_confirmados_to_guests();
  END IF;
END $$;
