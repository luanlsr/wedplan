-- SPRINT 4: ROLES AND ACCOUNT ARCHITECTURE

-- 1. Create Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Roles
INSERT INTO public.roles (name, description) VALUES
    ('master', 'Administrador geral do sistema'),
    ('couple', 'Noivos / Donos da conta do casamento'),
    ('staff', 'Fornecedores ou equipe de apoio'),
    ('guest', 'Convidados com acesso restrito')
ON CONFLICT (name) DO NOTHING;

-- 2. Create Account Types Table (Plans)
CREATE TABLE IF NOT EXISTS public.account_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    features JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.account_types (name, price, features) VALUES
    ('Premium', 197.00, '{"max_guests": 500, "priority_support": true}')
ON CONFLICT (name) DO NOTHING;

-- 3. Create Accounts Table (Tenants)
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_type_id UUID REFERENCES public.account_types(id),
    status TEXT DEFAULT 'pending_payment', -- pending_payment, active, canceled
    asaas_customer_id TEXT,
    asaas_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Alter Profiles Table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL;

-- Migrate existing text 'role' to 'role_id'
UPDATE public.profiles p
SET role_id = r.id
FROM public.roles r
WHERE p.role = r.name;

-- 5. Alter Weddings Table to link to Account
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

-- 6. Script to migrate legacy weddings/users to accounts
DO $$
DECLARE
    wed RECORD;
    new_acc_id UUID;
    prem_type_id UUID;
BEGIN
    SELECT id INTO prem_type_id FROM public.account_types WHERE name = 'Premium' LIMIT 1;

    FOR wed IN SELECT * FROM public.weddings WHERE account_id IS NULL LOOP
        -- Criar uma conta (account) para cada casamento antigo e assumir como 'active'
        INSERT INTO public.accounts (account_type_id, status) 
        VALUES (prem_type_id, 'active')
        RETURNING id INTO new_acc_id;

        -- Atualizar o casamento com o ID da nova conta
        UPDATE public.weddings SET account_id = new_acc_id WHERE id = wed.id;

        -- Atualizar o perfil do dono do casamento para pertencer a esta conta
        IF wed.owner_id IS NOT NULL THEN
            UPDATE public.profiles SET account_id = new_acc_id WHERE id = wed.owner_id;
        END IF;
    END LOOP;
END $$;
