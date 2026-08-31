CREATE TABLE IF NOT EXISTS public.timeline_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  wedding_id uuid NOT NULL,
  nome text NOT NULL,
  cor text NOT NULL DEFAULT '#d8757c',
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.timeline_categories OWNER TO postgres;

CREATE TABLE IF NOT EXISTS public.timeline_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  wedding_id uuid NOT NULL,
  category_id uuid NOT NULL,
  titulo text NOT NULL,
  descricao text,
  data date NOT NULL,
  status text DEFAULT 'pendente'::text NOT NULL,
  ordem integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.timeline_items OWNER TO postgres;

ALTER TABLE ONLY public.timeline_categories
  ADD CONSTRAINT timeline_categories_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.timeline_items
  ADD CONSTRAINT timeline_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.timeline_categories
  ADD CONSTRAINT timeline_categories_wedding_id_fkey
  FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.timeline_items
  ADD CONSTRAINT timeline_items_wedding_id_fkey
  FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.timeline_items
  ADD CONSTRAINT timeline_items_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.timeline_categories(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.timeline_items
  ADD CONSTRAINT timeline_items_status_check
  CHECK (status = ANY (ARRAY['pendente'::text, 'em_progresso'::text, 'concluido'::text]));

CREATE INDEX IF NOT EXISTS timeline_categories_wedding_id_idx
  ON public.timeline_categories USING btree (wedding_id, ordem);

CREATE INDEX IF NOT EXISTS timeline_items_wedding_id_date_idx
  ON public.timeline_items USING btree (wedding_id, data);

CREATE INDEX IF NOT EXISTS timeline_items_category_id_idx
  ON public.timeline_items USING btree (category_id, ordem);

CREATE OR REPLACE TRIGGER update_timeline_categories_updated_at
  BEFORE UPDATE ON public.timeline_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_timeline_items_updated_at
  BEFORE UPDATE ON public.timeline_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Noivo gere categorias do cronograma" ON public.timeline_categories
  USING (((( SELECT profiles.role
    FROM public.profiles
    WHERE (profiles.id = auth.uid())) = ANY (ARRAY['couple'::text, 'master'::text]))
    AND (wedding_id = ( SELECT profiles.wedding_id
      FROM public.profiles
      WHERE (profiles.id = auth.uid())))));

CREATE POLICY "Noivo gere itens do cronograma" ON public.timeline_items
  USING (((( SELECT profiles.role
    FROM public.profiles
    WHERE (profiles.id = auth.uid())) = ANY (ARRAY['couple'::text, 'master'::text]))
    AND (wedding_id = ( SELECT profiles.wedding_id
      FROM public.profiles
      WHERE (profiles.id = auth.uid())))));

CREATE POLICY "Users can manage timeline categories of their weddings" ON public.timeline_categories
  USING (((EXISTS ( SELECT 1
    FROM public.wedding_members
    WHERE ((wedding_members.wedding_id = timeline_categories.wedding_id)
      AND (wedding_members.user_id = auth.uid())))) OR public.is_master()));

CREATE POLICY "Users can manage timeline items of their weddings" ON public.timeline_items
  USING (((EXISTS ( SELECT 1
    FROM public.wedding_members
    WHERE ((wedding_members.wedding_id = timeline_items.wedding_id)
      AND (wedding_members.user_id = auth.uid())))) OR public.is_master()));

ALTER TABLE public.timeline_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_items ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.timeline_categories TO anon;
GRANT ALL ON TABLE public.timeline_categories TO authenticated;
GRANT ALL ON TABLE public.timeline_categories TO service_role;

GRANT ALL ON TABLE public.timeline_items TO anon;
GRANT ALL ON TABLE public.timeline_items TO authenticated;
GRANT ALL ON TABLE public.timeline_items TO service_role;
