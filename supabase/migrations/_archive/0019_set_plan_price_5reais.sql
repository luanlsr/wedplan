-- Migration 0019: Atualizar preço do plano para R$ 5 (testes em produção)
-- Data: 2026-05-03

-- Atualizar o preço do plano existente
UPDATE public.account_types
SET price = 5.00;

-- Se não existir nenhum plano, criar um padrão de R$ 5
INSERT INTO public.account_types (name, price, features)
SELECT 
  'WedPlan Premium', 
  5.00, 
  '["Gestão de fornecedores","Lista de convidados","Check-in no evento","Controle financeiro"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.account_types);

-- Confirmar
SELECT id, name, price FROM public.account_types;
