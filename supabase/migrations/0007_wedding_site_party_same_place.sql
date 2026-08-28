-- Permite informar que cerimonia e festa acontecem no mesmo local.
-- IF NOT EXISTS deixa seguro caso a coluna ja tenha sido adicionada pela 0006 atualizada.

ALTER TABLE public.wedding_sites
  ADD COLUMN IF NOT EXISTS party_same_as_ceremony boolean NOT NULL DEFAULT false;
