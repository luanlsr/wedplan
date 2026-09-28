-- Ajusta a sincronizacao de convidados_confirmados para nao criar convidados fora da lista fechada.
-- A tabela editavel do app e guests; convidados_confirmados apenas atualiza convidados existentes.

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

  IF v_guest_id IS NOT NULL THEN
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
