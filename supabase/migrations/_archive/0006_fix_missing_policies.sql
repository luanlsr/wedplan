-- Migration: Fix Missing RLS Policies
-- Description: Adds missing INSERT and DELETE policies for weddings, guests, and installments.

-- 1. Permits users to create their own wedding
DROP POLICY IF EXISTS "Usuários criam próprio casamento" ON public.weddings;
CREATE POLICY "Usuários criam próprio casamento" 
ON public.weddings 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- 2. Permits users to manage guests fully
DROP POLICY IF EXISTS "Noivo gere convidados" ON public.guests;
CREATE POLICY "Noivo gere convidados" 
ON public.guests 
FOR ALL 
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('couple', 'master') AND
    wedding_id = (SELECT wedding_id FROM public.profiles WHERE id = auth.uid())
);

-- 3. Permits users to manage installments fully
DROP POLICY IF EXISTS "Noivo gere parcelas" ON public.installments;
CREATE POLICY "Noivo gere parcelas" 
ON public.installments 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.suppliers s
        JOIN public.profiles p ON p.id = auth.uid()
        WHERE s.id = installments.supplier_id 
        AND s.wedding_id = p.wedding_id
        AND p.role IN ('couple', 'master')
    )
);

-- 4. Correct guests select for staff (already defined but ensuring ALL covers it for couple)
-- We keep the specific staff/checkin ones from migration 0003 if they don't conflict.
