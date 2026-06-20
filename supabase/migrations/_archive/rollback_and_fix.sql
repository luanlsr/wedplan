-- 1. ROLLBACK: Remove as políticas que causaram o bloqueio (erro de recursão infinita)
DROP POLICY IF EXISTS "Master can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Master can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Master can view all weddings" ON weddings;
DROP POLICY IF EXISTS "Master can update all weddings" ON weddings;

-- 2. SUGESTÃO CORRETA:
-- Para evitar o erro de recursão (onde a tabela profiles consulta ela mesma infinitamente),
-- a melhor prática no Supabase é checar a role no JWT do usuário, OU usar uma função com SECURITY DEFINER.

-- Função segura que ignora o RLS para checar se é master:
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN coalesce(user_role = 'master', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RECRIANDO AS POLÍTICAS DA FORMA CORRETA (SEM DROPAR DADOS, APENAS ATUALIZANDO AS REGRAS)

-- Allow 'master' to view all profiles
CREATE POLICY "Master can view all profiles" ON profiles
    FOR SELECT USING (public.is_master());

-- Allow 'master' to view all weddings
CREATE POLICY "Master can view all weddings" ON weddings
    FOR SELECT USING (public.is_master());

-- Admin can manage all profiles
CREATE POLICY "Master can update all profiles" ON profiles
    FOR UPDATE USING (public.is_master());

-- Admin can manage all weddings
CREATE POLICY "Master can update all weddings" ON weddings
    FOR UPDATE USING (public.is_master());
