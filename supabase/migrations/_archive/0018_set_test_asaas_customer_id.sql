-- Migration 0018: Set Asaas Customer ID for testing
-- Vincula um asaas_customer_id de teste ao usuário luan.ramalhosilva@gmail.com

UPDATE public.accounts
SET asaas_customer_id = 'cus_TEST_LUAN_001'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'luan.ramalhosilva@gmail.com'
);

-- Confirma o resultado
SELECT 
  au.email,
  a.id,
  a.status,
  a.asaas_customer_id
FROM auth.users au
JOIN public.accounts a ON a.id = au.id
WHERE au.email = 'luan.ramalhosilva@gmail.com';
