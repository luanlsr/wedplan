-- Migration 0020: Fix auth trigger to create account on signup
-- Garante que novos usuários tenham uma conta com status pending_payment automaticamente

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  couple_role_id UUID;
  premium_type_id UUID;
  new_account_id UUID;
BEGIN
  -- Buscar IDs necessários
  SELECT id INTO couple_role_id FROM public.roles WHERE name = 'couple' LIMIT 1;
  SELECT id INTO premium_type_id FROM public.account_types ORDER BY price DESC LIMIT 1;

  -- 1. Criar a conta com status pending_payment
  INSERT INTO public.accounts (id, account_type_id, status)
  VALUES (new.id, premium_type_id, 'pending_payment')
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO new_account_id;

  -- 2. Criar/atualizar o profile vinculando à conta e ao role
  INSERT INTO public.profiles (id, email, full_name, role_id, account_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    couple_role_id,
    new.id  -- account.id = user.id (mesmo UUID)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role_id = COALESCE(EXCLUDED.role_id, public.profiles.role_id),
    account_id = COALESCE(EXCLUDED.account_id, public.profiles.account_id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar o trigger (DROP + CREATE para garantir que usa a nova função)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
