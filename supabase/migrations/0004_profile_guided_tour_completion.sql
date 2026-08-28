-- Persistência do tour inicial por usuário.
-- Migration aditiva: não remove tabelas, não apaga dados existentes e não altera policies atuais.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS guided_tour_completed_at timestamptz;

COMMENT ON COLUMN public.profiles.guided_tour_completed_at IS
  'Momento em que o usuário concluiu ou pulou o tour inicial do sistema logado.';

CREATE INDEX IF NOT EXISTS idx_profiles_guided_tour_completed_at
ON public.profiles (guided_tour_completed_at);
