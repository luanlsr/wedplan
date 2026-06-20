-- Migration 0021: Force Luan Master Role
-- Este script garante que o usuário luanfswd@gmail.com tenha privilégios totais

DO $$
DECLARE
    v_user_id UUID;
    v_role_id UUID;
BEGIN
    -- 1. Buscar o ID do usuário (ajuste o email se necessário)
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'luanfswd@gmail.com';

    IF v_user_id IS NOT NULL THEN
        -- 2. Garantir que a role 'master' existe e pegar seu ID
        INSERT INTO public.roles (name, description)
        VALUES ('master', 'Administrador geral do sistema')
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_role_id;

        -- 3. Atualizar o perfil para ser Master
        INSERT INTO public.profiles (id, full_name, role_id)
        VALUES (v_user_id, 'Luan Master', v_role_id)
        ON CONFLICT (id) DO UPDATE 
        SET role_id = v_role_id,
            full_name = 'Luan Master';

        -- 4. Garantir que ele tenha uma conta ativa (bypass de pagamento)
        INSERT INTO public.accounts (id, status, account_type_id)
        VALUES (
            v_user_id, 
            'active', 
            (SELECT id FROM public.account_types WHERE name = 'Premium' LIMIT 1)
        )
        ON CONFLICT (id) DO UPDATE SET status = 'active';

        RAISE NOTICE 'Usuário luanfswd@gmail.com promovido a MASTER com sucesso.';
    ELSE
        RAISE NOTICE 'Usuário luanfswd@gmail.com não encontrado. Verifique o e-mail ou se o usuário já se cadastrou.';
    END IF;
END $$;
