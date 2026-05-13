-- Migration 0017: Set Master User
-- Garante as roles e define o usuário master

-- 1. Garantir que as roles básicas existam
INSERT INTO roles (name) VALUES ('master'), ('couple'), ('admin') ON CONFLICT (name) DO NOTHING;

-- 2. Vincular o usuário master pelo email luanfswd@gmail.com
-- Primeiro buscamos o ID do usuário se ele existir
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'luanfswd@gmail.com';

    IF v_user_id IS NOT NULL THEN
        -- Atualiza ou insere o perfil como Master
        INSERT INTO public.profiles (id, full_name, role_id)
        VALUES (
            v_user_id, 
            'Luan Master', 
            (SELECT id FROM roles WHERE name = 'master')
        )
        ON CONFLICT (id) DO UPDATE 
        SET 
            role_id = EXCLUDED.role_id,
            full_name = EXCLUDED.full_name;

        -- Garante que ele tenha uma conta ativa e sem necessidade de pagamento
        INSERT INTO public.accounts (id, status, account_type_id)
        VALUES (
            v_user_id, 
            'active', 
            (SELECT id FROM account_types WHERE name = 'Premium')
        )
        ON CONFLICT (id) DO UPDATE SET status = 'active';
        
        RAISE NOTICE 'Usuário master configurado com sucesso.';
    ELSE
        RAISE NOTICE 'Usuário luanfswd@gmail.com não encontrado no auth.users. Execute o cadastro primeiro.';
    END IF;
END $$;
