-- Adiciona a coluna de data de pagamento na tabela de parcelas
ALTER TABLE public.installments ADD COLUMN IF NOT EXISTS data_pagamento DATE;

-- Comentário para documentação
COMMENT ON COLUMN public.installments.data_pagamento IS 'Data real em que a parcela foi paga pelo usuário';
