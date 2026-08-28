-- Site publico do casal: editor completo, imagens, historia, eventos, RSVP e presentes.
-- Migration incremental e conservadora: nao remove dados existentes.

ALTER TABLE public.wedding_sites
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS hero_layout text NOT NULL DEFAULT 'editorial'
    CHECK (hero_layout IN ('editorial', 'classic', 'minimal')),
  ADD COLUMN IF NOT EXISTS party_same_as_ceremony boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS font_primary text NOT NULL DEFAULT 'Playfair Display',
  ADD COLUMN IF NOT EXISTS font_secondary text NOT NULL DEFAULT 'Manrope',
  ADD COLUMN IF NOT EXISTS color_primary text NOT NULL DEFAULT '#8b6f43',
  ADD COLUMN IF NOT EXISTS color_secondary text NOT NULL DEFAULT '#2f3829',
  ADD COLUMN IF NOT EXISTS background_primary text NOT NULL DEFAULT '#fbfaf7',
  ADD COLUMN IF NOT EXISTS background_secondary text NOT NULL DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS gift_intro text,
  ADD COLUMN IF NOT EXISTS gift_delivery_name text,
  ADD COLUMN IF NOT EXISTS gift_delivery_address text,
  ADD COLUMN IF NOT EXISTS gift_delivery_city text,
  ADD COLUMN IF NOT EXISTS gift_delivery_state text,
  ADD COLUMN IF NOT EXISTS gift_delivery_zip text,
  ADD COLUMN IF NOT EXISTS gift_delivery_notes text;

CREATE TABLE IF NOT EXISTS public.wedding_site_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_path text,
  image_role text NOT NULL DEFAULT 'gallery' CHECK (image_role IN ('hero', 'gallery')),
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wedding_site_story_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  icon text NOT NULL DEFAULT 'heart',
  image_url text,
  event_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wedding_site_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('ceremony', 'party')),
  title text NOT NULL,
  address text,
  event_date date,
  event_time time,
  maps_query text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding_site_id, event_type)
);

ALTER TABLE public.lista_presentes
  ADD COLUMN IF NOT EXISTS reserved_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.categorias_presentes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_wedding_site_images_site ON public.wedding_site_images (wedding_site_id, image_role, sort_order);
CREATE INDEX IF NOT EXISTS idx_wedding_site_story_site ON public.wedding_site_story_items (wedding_site_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_wedding_site_events_site ON public.wedding_site_events (wedding_site_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lista_presentes_wedding ON public.lista_presentes (wedding_id);
CREATE INDEX IF NOT EXISTS idx_lista_presentes_bought ON public.lista_presentes (wedding_id, is_bought);
CREATE INDEX IF NOT EXISTS idx_confirmacoes_wedding_name ON public.confirmacoes (wedding_id, lower(full_name));

ALTER TABLE public.wedding_site_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_site_story_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_site_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.wedding_site_images TO anon, authenticated;
GRANT SELECT ON TABLE public.wedding_site_story_items TO anon, authenticated;
GRANT SELECT ON TABLE public.wedding_site_events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.wedding_site_images TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.wedding_site_story_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.wedding_site_events TO authenticated;

CREATE POLICY "Imagens publicadas do site sao publicas"
ON public.wedding_site_images
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.wedding_sites ws
    WHERE ws.id = wedding_site_images.wedding_site_id
      AND (ws.status = 'published' OR public.is_master())
  )
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = wedding_site_images.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
);

CREATE POLICY "Casal gerencia imagens do proprio site"
ON public.wedding_site_images
FOR ALL
TO authenticated
USING (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = wedding_site_images.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
)
WITH CHECK (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = wedding_site_images.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
);

CREATE POLICY "Historia publicada do site e publica"
ON public.wedding_site_story_items
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.wedding_sites ws
    WHERE ws.id = wedding_site_story_items.wedding_site_id
      AND (ws.status = 'published' OR public.is_master())
  )
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = wedding_site_story_items.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
);

CREATE POLICY "Casal gerencia historia do proprio site"
ON public.wedding_site_story_items
FOR ALL
TO authenticated
USING (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = wedding_site_story_items.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
)
WITH CHECK (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = wedding_site_story_items.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
);

CREATE POLICY "Eventos publicados do site sao publicos"
ON public.wedding_site_events
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.wedding_sites ws
    WHERE ws.id = wedding_site_events.wedding_site_id
      AND (ws.status = 'published' OR public.is_master())
  )
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = wedding_site_events.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
);

CREATE POLICY "Casal gerencia eventos do proprio site"
ON public.wedding_site_events
FOR ALL
TO authenticated
USING (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = wedding_site_events.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
)
WITH CHECK (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = wedding_site_events.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
);

DROP TRIGGER IF EXISTS update_wedding_site_story_items_updated_at ON public.wedding_site_story_items;
CREATE TRIGGER update_wedding_site_story_items_updated_at
BEFORE UPDATE ON public.wedding_site_story_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_wedding_site_events_updated_at ON public.wedding_site_events;
CREATE TRIGGER update_wedding_site_events_updated_at
BEFORE UPDATE ON public.wedding_site_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_lista_presentes_updated_at ON public.lista_presentes;
CREATE TRIGGER update_lista_presentes_updated_at
BEFORE UPDATE ON public.lista_presentes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_categorias_presentes_updated_at ON public.categorias_presentes;
CREATE TRIGGER update_categorias_presentes_updated_at
BEFORE UPDATE ON public.categorias_presentes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Policies legadas dessas tabelas eram amplas demais. Recria acesso escopado a sites publicados e ao casal dono.
DROP POLICY IF EXISTS "Admin Categories All Access" ON public.categorias_presentes;
DROP POLICY IF EXISTS "Public Categories Access" ON public.categorias_presentes;
DROP POLICY IF EXISTS "Isolated Read Gifts" ON public.lista_presentes;
DROP POLICY IF EXISTS "Isolated Manage Gifts" ON public.lista_presentes;
DROP POLICY IF EXISTS "Public Gifts Access" ON public.lista_presentes;
DROP POLICY IF EXISTS "Guests Reservation Access" ON public.lista_presentes;
DROP POLICY IF EXISTS "Public Confirmations Access" ON public.confirmacoes;
DROP POLICY IF EXISTS "Admin RSVP Management" ON public.confirmacoes;
DROP POLICY IF EXISTS "Admin RSVP Update" ON public.confirmacoes;
DROP POLICY IF EXISTS "Guest RSVP Registration" ON public.confirmacoes;
DROP POLICY IF EXISTS "Isolated Insert Confirmations" ON public.confirmacoes;
DROP POLICY IF EXISTS "Isolated Read Confirmations" ON public.confirmacoes;

CREATE POLICY "Categorias de sites publicados sao publicas"
ON public.categorias_presentes
FOR SELECT
TO anon, authenticated
USING (
  active = true
  AND EXISTS (
    SELECT 1 FROM public.wedding_sites ws
    WHERE ws.wedding_id = categorias_presentes.wedding_id
      AND ws.status = 'published'
      AND ws.gift_list_enabled = true
  )
);

CREATE POLICY "Casal gerencia categorias de presentes"
ON public.categorias_presentes
FOR ALL
TO authenticated
USING (
  public.is_master()
  OR EXISTS (
    SELECT 1 FROM public.weddings w
    WHERE w.id = categorias_presentes.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
)
WITH CHECK (
  public.is_master()
  OR EXISTS (
    SELECT 1 FROM public.weddings w
    WHERE w.id = categorias_presentes.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
);

CREATE POLICY "Presentes de sites publicados sao publicos"
ON public.lista_presentes
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.wedding_sites ws
    WHERE ws.wedding_id = lista_presentes.wedding_id
      AND ws.status = 'published'
      AND ws.gift_list_enabled = true
  )
  OR public.is_master()
  OR EXISTS (
    SELECT 1 FROM public.weddings w
    WHERE w.id = lista_presentes.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
);

CREATE POLICY "Casal gerencia presentes"
ON public.lista_presentes
FOR ALL
TO authenticated
USING (
  public.is_master()
  OR EXISTS (
    SELECT 1 FROM public.weddings w
    WHERE w.id = lista_presentes.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
)
WITH CHECK (
  public.is_master()
  OR EXISTS (
    SELECT 1 FROM public.weddings w
    WHERE w.id = lista_presentes.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
);

CREATE POLICY "Casal ve confirmacoes do proprio casamento"
ON public.confirmacoes
FOR SELECT
TO authenticated
USING (
  public.is_master()
  OR EXISTS (
    SELECT 1 FROM public.weddings w
    WHERE w.id = confirmacoes.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
);

CREATE POLICY "Casal gerencia confirmacoes"
ON public.confirmacoes
FOR ALL
TO authenticated
USING (
  public.is_master()
  OR EXISTS (
    SELECT 1 FROM public.weddings w
    WHERE w.id = confirmacoes.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
)
WITH CHECK (
  public.is_master()
  OR EXISTS (
    SELECT 1 FROM public.weddings w
    WHERE w.id = confirmacoes.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.submit_wedding_site_rsvp(
  p_slug text,
  p_full_name text,
  p_phone text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_is_attending boolean DEFAULT true,
  p_children jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wedding_id uuid;
  v_confirmation_id uuid;
  v_guest_status text;
BEGIN
  SELECT wedding_id INTO v_wedding_id
  FROM public.wedding_sites
  WHERE slug = p_slug
    AND status = 'published'
    AND rsvp_enabled = true;

  IF v_wedding_id IS NULL THEN
    RAISE EXCEPTION 'Site indisponivel para confirmacao';
  END IF;

  IF length(trim(coalesce(p_full_name, ''))) < 4 THEN
    RAISE EXCEPTION 'Nome invalido';
  END IF;

  v_guest_status := CASE WHEN p_is_attending THEN 'confirmado' ELSE 'recusado' END;

  INSERT INTO public.confirmacoes (wedding_id, full_name, phone, email, is_attending, children)
  VALUES (v_wedding_id, trim(p_full_name), nullif(trim(coalesce(p_phone, '')), ''), nullif(lower(trim(coalesce(p_email, ''))), ''), p_is_attending, coalesce(p_children, '[]'::jsonb))
  RETURNING id INTO v_confirmation_id;

  UPDATE public.guests
  SET status = v_guest_status,
      telefone = COALESCE(nullif(trim(coalesce(p_phone, '')), ''), telefone),
      children_names = CASE
        WHEN jsonb_array_length(coalesce(p_children, '[]'::jsonb)) > 0 THEN p_children::text
        ELSE children_names
      END,
      updated_at = now()
  WHERE wedding_id = v_wedding_id
    AND lower(unaccent(nome)) = lower(unaccent(trim(p_full_name)));

  RETURN v_confirmation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_wedding_gift(
  p_gift_id uuid,
  p_guest_name text
)
RETURNS TABLE (gift_id uuid, buy_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buy_url text;
  v_updated_id uuid;
BEGIN
  IF length(trim(coalesce(p_guest_name, ''))) < 4 THEN
    RAISE EXCEPTION 'Nome invalido';
  END IF;

  UPDATE public.lista_presentes lp
  SET is_bought = true,
      bought_by = trim(p_guest_name),
      reserved_at = now(),
      updated_at = now()
  FROM public.wedding_sites ws
  WHERE lp.id = p_gift_id
    AND lp.wedding_id = ws.wedding_id
    AND ws.status = 'published'
    AND ws.gift_list_enabled = true
    AND coalesce(lp.is_bought, false) = false
  RETURNING lp.id, lp.buy_url INTO v_updated_id, v_buy_url;

  IF v_updated_id IS NULL THEN
    RAISE EXCEPTION 'Presente indisponivel';
  END IF;

  RETURN QUERY SELECT v_updated_id, v_buy_url;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_wedding_site_rsvp(text, text, text, text, boolean, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_wedding_gift(uuid, text) TO anon, authenticated;

DROP POLICY IF EXISTS "Casal faz upload de midias do site" ON storage.objects;
CREATE POLICY "Casal faz upload de midias do site"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'casamentos'
  AND (string_to_array(name, '/'))[2] = 'site'
  AND EXISTS (
    SELECT 1 FROM public.weddings w
    WHERE w.id::text = (string_to_array(name, '/'))[1]
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid() OR public.is_master())
  )
);

DROP POLICY IF EXISTS "Casal remove midias do site" ON storage.objects;
CREATE POLICY "Casal remove midias do site"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'casamentos'
  AND (string_to_array(name, '/'))[2] = 'site'
  AND EXISTS (
    SELECT 1 FROM public.weddings w
    WHERE w.id::text = (string_to_array(name, '/'))[1]
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid() OR public.is_master())
  )
);

DROP POLICY IF EXISTS "Visitantes veem midias de sites publicados" ON storage.objects;
CREATE POLICY "Visitantes veem midias de sites publicados"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'casamentos'
  AND (string_to_array(name, '/'))[2] = 'site'
  AND EXISTS (
    SELECT 1 FROM public.wedding_sites ws
    WHERE ws.wedding_id::text = (string_to_array(name, '/'))[1]
      AND ws.status = 'published'
  )
);
