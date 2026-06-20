-- Migration: Fix RLS Recursion and Profile Access
-- Description: Corrects infinite recursion in profiles policy and ensures users can manage their own profile.

-- 1. Remove recursive policies
DROP POLICY IF EXISTS "Pode ver próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Master pode tudo em perfis" ON public.profiles;

-- 2. Create safer, non-recursive policies for profiles
-- Use simple UID check for most actions
CREATE POLICY "Usuários gerenciam próprio perfil" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Correct weddings policy to be more robust
DROP POLICY IF EXISTS "Noivo vê seu casamento" ON public.weddings;
CREATE POLICY "Acesso ao casamento vinculado" 
ON public.weddings 
FOR SELECT 
USING (
    auth.uid() = owner_id OR 
    id IN (SELECT wedding_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Noivo atualiza seu casamento" ON public.weddings;
CREATE POLICY "Proprietário atualiza casamento" 
ON public.weddings 
FOR UPDATE 
USING (auth.uid() = owner_id);

-- 4. Enable Master role access without recursion (optional, using a function if needed)
-- For now, focused on fixing the crash.
