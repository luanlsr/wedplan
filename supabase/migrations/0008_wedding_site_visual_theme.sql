-- Preferencias visuais do site publico do casal.
-- IF NOT EXISTS deixa seguro caso a 0006 atualizada ja tenha criado as colunas.

ALTER TABLE public.wedding_sites
  ADD COLUMN IF NOT EXISTS font_primary text NOT NULL DEFAULT 'Playfair Display',
  ADD COLUMN IF NOT EXISTS font_secondary text NOT NULL DEFAULT 'Manrope',
  ADD COLUMN IF NOT EXISTS color_primary text NOT NULL DEFAULT '#8b6f43',
  ADD COLUMN IF NOT EXISTS color_secondary text NOT NULL DEFAULT '#2f3829',
  ADD COLUMN IF NOT EXISTS background_primary text NOT NULL DEFAULT '#fbfaf7',
  ADD COLUMN IF NOT EXISTS background_secondary text NOT NULL DEFAULT '#ffffff';
