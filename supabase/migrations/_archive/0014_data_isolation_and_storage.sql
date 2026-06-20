-- SPRINT 2: Data Isolation & Storage Security

-- 1. ADD wedding_id TO installments
ALTER TABLE public.installments ADD COLUMN IF NOT EXISTS wedding_id UUID REFERENCES public.weddings(id) ON DELETE CASCADE;

-- Populate wedding_id for existing installments
UPDATE public.installments i
SET wedding_id = s.wedding_id
FROM public.suppliers s
WHERE i.supplier_id = s.id AND i.wedding_id IS NULL;

-- 2. UPDATE RLS POLICIES FOR ALL TABLES TO INCLUDE MASTER BYPASS
-- This ensures strict isolation per couple, while allowing the Admin (master) to access everything.

-- Installments (New Policy based directly on wedding_id)
DROP POLICY IF EXISTS "Users can manage installments of their suppliers" ON installments;
DROP POLICY IF EXISTS "Users can manage installments of their weddings" ON installments;
CREATE POLICY "Users can manage installments of their weddings" ON installments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM wedding_members WHERE wedding_id = installments.wedding_id AND user_id = auth.uid())
        OR public.is_master()
    );

-- Suppliers
DROP POLICY IF EXISTS "Users can manage suppliers of their weddings" ON suppliers;
CREATE POLICY "Users can manage suppliers of their weddings" ON suppliers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM wedding_members WHERE wedding_id = suppliers.wedding_id AND user_id = auth.uid())
        OR public.is_master()
    );

-- Guests
DROP POLICY IF EXISTS "Users can manage guests of their weddings" ON guests;
CREATE POLICY "Users can manage guests of their weddings" ON guests
    FOR ALL USING (
        EXISTS (SELECT 1 FROM wedding_members WHERE wedding_id = guests.wedding_id AND user_id = auth.uid())
        OR public.is_master()
    );

-- Tasks
DROP POLICY IF EXISTS "Users can manage tasks of their weddings" ON tasks;
CREATE POLICY "Users can manage tasks of their weddings" ON tasks
    FOR ALL USING (
        EXISTS (SELECT 1 FROM wedding_members WHERE wedding_id = tasks.wedding_id AND user_id = auth.uid())
        OR public.is_master()
    );

-- Planning Simulations
DROP POLICY IF EXISTS "Users can manage simulations of their weddings" ON planning_simulations;
CREATE POLICY "Users can manage simulations of their weddings" ON planning_simulations
    FOR ALL USING (
        EXISTS (SELECT 1 FROM wedding_members WHERE wedding_id = planning_simulations.wedding_id AND user_id = auth.uid())
        OR public.is_master()
    );

-- Wedding Members
DROP POLICY IF EXISTS "Users can see their wedding memberships" ON wedding_members;
CREATE POLICY "Users can see their wedding memberships" ON wedding_members 
    FOR SELECT USING (auth.uid() = user_id OR public.is_master());

-- 3. SUPABASE STORAGE: SEPARATION BY WEDDING_ID
-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('casamentos', 'casamentos', true) 
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for Storage
-- Extrapolates the wedding_id from the first folder in the path: /{wedding_id}/avatar.jpg
DROP POLICY IF EXISTS "Membros do casamento podem ver arquivos" ON storage.objects;
CREATE POLICY "Membros do casamento podem ver arquivos" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'casamentos' 
        AND (
            EXISTS (
                SELECT 1 FROM public.wedding_members 
                WHERE wedding_id::text = (string_to_array(name, '/'))[1] 
                AND user_id = auth.uid()
            )
            OR public.is_master()
        )
    );

DROP POLICY IF EXISTS "Membros do casamento podem fazer upload" ON storage.objects;
CREATE POLICY "Membros do casamento podem fazer upload" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'casamentos' 
        AND (
            EXISTS (
                SELECT 1 FROM public.wedding_members 
                WHERE wedding_id::text = (string_to_array(name, '/'))[1] 
                AND user_id = auth.uid()
            )
            OR public.is_master()
        )
    );

DROP POLICY IF EXISTS "Membros do casamento podem deletar arquivos" ON storage.objects;
CREATE POLICY "Membros do casamento podem deletar arquivos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'casamentos' 
        AND (
            EXISTS (
                SELECT 1 FROM public.wedding_members 
                WHERE wedding_id::text = (string_to_array(name, '/'))[1] 
                AND user_id = auth.uid()
            )
            OR public.is_master()
        )
    );
