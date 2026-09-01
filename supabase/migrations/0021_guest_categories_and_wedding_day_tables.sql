-- Categorias customizadas de convidados e organizacao de mesas do dia do casamento.

CREATE TABLE IF NOT EXISTS public.guest_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#d8757c',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guest_categories_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT guest_categories_unique_name UNIQUE (wedding_id, name)
);

CREATE TABLE IF NOT EXISTS public.wedding_reception_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  name text NOT NULL,
  chair_count integer NOT NULL DEFAULT 8 CHECK (chair_count > 0 AND chair_count <= 100),
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wedding_reception_tables_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT wedding_reception_tables_unique_name UNIQUE (wedding_id, name),
  CONSTRAINT wedding_reception_tables_id_wedding_unique UNIQUE (id, wedding_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guests_id_wedding
  ON public.guests (id, wedding_id);

CREATE TABLE IF NOT EXISTS public.wedding_table_guests (
  table_id uuid NOT NULL REFERENCES public.wedding_reception_tables(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (table_id, guest_id),
  CONSTRAINT wedding_table_guests_one_table_per_guest UNIQUE (guest_id),
  CONSTRAINT wedding_table_guests_table_same_wedding
    FOREIGN KEY (table_id, wedding_id)
    REFERENCES public.wedding_reception_tables(id, wedding_id)
    ON DELETE CASCADE,
  CONSTRAINT wedding_table_guests_guest_same_wedding
    FOREIGN KEY (guest_id, wedding_id)
    REFERENCES public.guests(id, wedding_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_guest_categories_wedding
  ON public.guest_categories (wedding_id, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_reception_tables_wedding
  ON public.wedding_reception_tables (wedding_id, sort_order, name);

CREATE INDEX IF NOT EXISTS idx_table_guests_wedding
  ON public.wedding_table_guests (wedding_id);

CREATE INDEX IF NOT EXISTS idx_table_guests_table
  ON public.wedding_table_guests (table_id);

ALTER TABLE public.guest_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_reception_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_table_guests ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.guest_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.wedding_reception_tables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.wedding_table_guests TO authenticated;

DROP POLICY IF EXISTS "Membros gerenciam categorias de convidados" ON public.guest_categories;
CREATE POLICY "Membros gerenciam categorias de convidados"
ON public.guest_categories
FOR ALL
TO authenticated
USING (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = guest_categories.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.wedding_id = guest_categories.wedding_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.wedding_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.wedding_id = guest_categories.wedding_id
  )
)
WITH CHECK (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = guest_categories.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.wedding_id = guest_categories.wedding_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.wedding_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.wedding_id = guest_categories.wedding_id
  )
);

DROP POLICY IF EXISTS "Membros gerenciam mesas do casamento" ON public.wedding_reception_tables;
CREATE POLICY "Membros gerenciam mesas do casamento"
ON public.wedding_reception_tables
FOR ALL
TO authenticated
USING (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = wedding_reception_tables.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.wedding_id = wedding_reception_tables.wedding_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.wedding_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.wedding_id = wedding_reception_tables.wedding_id
  )
)
WITH CHECK (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = wedding_reception_tables.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.wedding_id = wedding_reception_tables.wedding_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.wedding_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.wedding_id = wedding_reception_tables.wedding_id
  )
);

DROP POLICY IF EXISTS "Membros gerenciam convidados nas mesas" ON public.wedding_table_guests;
CREATE POLICY "Membros gerenciam convidados nas mesas"
ON public.wedding_table_guests
FOR ALL
TO authenticated
USING (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = wedding_table_guests.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.wedding_id = wedding_table_guests.wedding_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.wedding_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.wedding_id = wedding_table_guests.wedding_id
  )
)
WITH CHECK (
  public.is_master()
  OR EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = wedding_table_guests.wedding_id
      AND (w.owner_id = auth.uid() OR w.account_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.wedding_id = wedding_table_guests.wedding_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.wedding_members wm
    WHERE wm.user_id = auth.uid()
      AND wm.wedding_id = wedding_table_guests.wedding_id
  )
);

DROP TRIGGER IF EXISTS update_guest_categories_updated_at ON public.guest_categories;
CREATE TRIGGER update_guest_categories_updated_at
BEFORE UPDATE ON public.guest_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_wedding_reception_tables_updated_at ON public.wedding_reception_tables;
CREATE TRIGGER update_wedding_reception_tables_updated_at
BEFORE UPDATE ON public.wedding_reception_tables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.guest_categories (wedding_id, name, sort_order)
SELECT DISTINCT g.wedding_id, COALESCE(NULLIF(trim(g.categoria), ''), 'Outros'), 100
FROM public.guests g
ON CONFLICT (wedding_id, name) DO NOTHING;
