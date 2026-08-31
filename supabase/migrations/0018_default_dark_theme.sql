-- Define dark mode como tema padrao para novos casamentos.
-- Nao altera casamentos existentes que ja possuem uma escolha salva.

ALTER TABLE public.weddings
  ALTER COLUMN theme SET DEFAULT 'dark';
