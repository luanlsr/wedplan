-- Templates visuais para o site publico do casal.
-- Seguro para producao: adiciona coluna com default e preserva sites existentes.

ALTER TABLE public.wedding_sites
  ADD COLUMN IF NOT EXISTS template_id text NOT NULL DEFAULT 'romantic-editorial';

ALTER TABLE public.wedding_sites
  DROP CONSTRAINT IF EXISTS wedding_sites_template_id_check;

ALTER TABLE public.wedding_sites
  ADD CONSTRAINT wedding_sites_template_id_check
  CHECK (
    template_id IN (
      'romantic-editorial',
      'classic-invitation',
      'botanical-garden',
      'modern-minimal',
      'black-tie'
    )
  );

COMMENT ON COLUMN public.wedding_sites.template_id IS
  'Template visual escolhido para o site publico do casal.';
