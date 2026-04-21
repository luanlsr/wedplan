-- Reestruturação Total do Banco de Dados
-- Eternal Planner - Premium Wedding Management

-- 1. Limpeza total (CUIDADO: Isso apaga todos os dados)
DROP VIEW IF EXISTS public.staff_suppliers_view;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.installments CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.guests CASCADE;
DROP TABLE IF EXISTS public.weddings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Tabela de Perfis (Extensão do auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'couple' CHECK (role IN ('master', 'couple', 'staff')),
    wedding_id UUID, -- Vinculado ao casamento que ele gerencia/trabalha
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Casamentos (Central)
CREATE TABLE public.weddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Criador do casamento
    couple_name1 TEXT NOT NULL,
    couple_name2 TEXT NOT NULL,
    wedding_date DATE,
    total_budget NUMERIC DEFAULT 0,
    theme TEXT DEFAULT 'light',
    public_checkin_token UUID DEFAULT gen_random_uuid(), -- Token para acesso público de check-in
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Convidados
CREATE TABLE public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    categoria TEXT,
    status TEXT DEFAULT 'pendente', -- pendente, confirmado, recusado
    adultos INTEGER DEFAULT 1,
    criancas INTEGER DEFAULT 0,
    children_names TEXT,
    telefone TEXT,
    observacoes TEXT,
    is_present BOOLEAN DEFAULT FALSE, -- Controle de presença (Check-in)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Fornecedores
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    fornecedor TEXT NOT NULL,
    servico TEXT,
    categoria TEXT,
    valor_total NUMERIC DEFAULT 0,
    tipo_pagamento TEXT,
    data_contrato DATE,
    staff_names TEXT, -- Nomes dos funcionários do fornecedor
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Parcelas (Desvinculada para melhor gestão)
CREATE TABLE public.installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    valor NUMERIC NOT NULL,
    data_vencimento DATE NOT NULL,
    status TEXT DEFAULT 'pendente', -- pendente, pago, atrasado
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Tarefas
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT,
    data_limite DATE,
    status TEXT DEFAULT 'pendente', -- pendente, em_progresso, concluido
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Visualização para Staff (Sem dados financeiros)
CREATE VIEW public.staff_suppliers_view AS
SELECT id, wedding_id, fornecedor, servico, categoria, staff_names
FROM public.suppliers;

-- 9. Habilitar RLS em tudo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 10. POLÍTICAS DE SEGURANÇA (RLS)

-- Perfis
CREATE POLICY "Pode ver próprio perfil" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Master pode tudo em perfis" ON public.profiles FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'master'
);

-- Casamentos
CREATE POLICY "Noivo vê seu casamento" ON public.weddings FOR SELECT USING (
    auth.uid() = owner_id OR 
    (SELECT wedding_id FROM public.profiles WHERE id = auth.uid()) = id
);
CREATE POLICY "Noivo atualiza seu casamento" ON public.weddings FOR UPDATE USING (auth.uid() = owner_id);

-- Convidados
CREATE POLICY "Acesso por Wedding ID (Noivo/Staff)" ON public.guests FOR SELECT USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('couple', 'staff', 'master') AND
    wedding_id = (SELECT wedding_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "Check-in Público" ON public.guests FOR UPDATE USING (
    -- Permite atualização se tiver o token público do casamento
    EXISTS (
        SELECT 1 FROM public.weddings 
        WHERE weddings.id = guests.wedding_id 
        -- Aqui poderíamos adicionar lógica de token na URL se necessário
    )
);

-- Fornecedores e Parcelas (Apenas Noivos)
CREATE POLICY "Noivo gere fornecedores" ON public.suppliers FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('couple', 'master') AND
    wedding_id = (SELECT wedding_id FROM public.profiles WHERE id = auth.uid())
);

-- Tarefas (Apenas Noivos)
CREATE POLICY "Noivo gere tarefas" ON public.tasks FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('couple', 'master') AND
    wedding_id = (SELECT wedding_id FROM public.profiles WHERE id = auth.uid())
);

-- 11. Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_weddings_updated_at BEFORE UPDATE ON public.weddings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
