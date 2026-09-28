-- Atualizacao segura de guests pelo app. Evita falhas silenciosas de RLS legada,
-- mantendo validacao de dono/conta/profile/membro do casamento no banco.

CREATE OR REPLACE FUNCTION public.update_guest_details(
  p_guest_id uuid,
  p_updates jsonb
)
RETURNS public.guests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest public.guests%rowtype;
  v_updated_guest public.guests%rowtype;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  SELECT * INTO v_guest
  FROM public.guests
  WHERE id = p_guest_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convidado nao encontrado';
  END IF;

  IF NOT (
    public.is_master()
    OR EXISTS (
      SELECT 1
      FROM public.weddings w
      LEFT JOIN public.profiles p ON p.id = auth.uid()
      WHERE w.id = v_guest.wedding_id
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
      WHERE wm.wedding_id = v_guest.wedding_id
        AND wm.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissao para atualizar este convidado';
  END IF;

  IF p_updates ? 'status'
     AND p_updates->>'status' NOT IN ('confirmado', 'pendente', 'recusado') THEN
    RAISE EXCEPTION 'Status de convidado invalido';
  END IF;

  UPDATE public.guests
  SET
    nome = CASE WHEN p_updates ? 'nome' THEN nullif(trim(p_updates->>'nome'), '') ELSE nome END,
    categoria = CASE WHEN p_updates ? 'categoria' THEN nullif(trim(p_updates->>'categoria'), '') ELSE categoria END,
    status = CASE WHEN p_updates ? 'status' THEN p_updates->>'status' ELSE status END,
    adultos = CASE WHEN p_updates ? 'adultos' THEN GREATEST((p_updates->>'adultos')::int, 0) ELSE adultos END,
    criancas = CASE WHEN p_updates ? 'criancas' THEN GREATEST((p_updates->>'criancas')::int, 0) ELSE criancas END,
    children_names = CASE WHEN p_updates ? 'children_names' THEN p_updates->>'children_names' ELSE children_names END,
    telefone = CASE WHEN p_updates ? 'telefone' THEN p_updates->>'telefone' ELSE telefone END,
    observacoes = CASE WHEN p_updates ? 'observacoes' THEN p_updates->>'observacoes' ELSE observacoes END,
    is_present = CASE WHEN p_updates ? 'is_present' THEN (p_updates->>'is_present')::boolean ELSE is_present END,
    invitation_sent = CASE WHEN p_updates ? 'invitation_sent' THEN (p_updates->>'invitation_sent')::boolean ELSE invitation_sent END,
    updated_at = now()
  WHERE id = p_guest_id
  RETURNING * INTO v_updated_guest;

  RETURN v_updated_guest;
END;
$$;

REVOKE ALL ON FUNCTION public.update_guest_details(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_guest_details(uuid, jsonb) TO authenticated;
