-- Restaura o acesso da lista de presentes do site de convite externo.
--
-- A migration 0006 passou lista_presentes/categorias_presentes a dependerem de
-- wedding_sites publicado. O convite externo antigo usa essas tabelas direto via
-- anon key e wedding_id fixo, entao precisa de uma policy propria e escopada.

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.categorias_presentes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lista_presentes TO anon;

DROP POLICY IF EXISTS "Convite externo gerencia categorias de presentes" ON public.categorias_presentes;
CREATE POLICY "Convite externo gerencia categorias de presentes"
ON public.categorias_presentes
FOR ALL
TO anon
USING (wedding_id = 'c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a'::uuid)
WITH CHECK (wedding_id = 'c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a'::uuid);

DROP POLICY IF EXISTS "Convite externo gerencia lista de presentes" ON public.lista_presentes;
CREATE POLICY "Convite externo gerencia lista de presentes"
ON public.lista_presentes
FOR ALL
TO anon
USING (wedding_id = 'c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a'::uuid)
WITH CHECK (wedding_id = 'c28206d4-9c4b-4cb3-8a4a-9045e7b0bd8a'::uuid);
