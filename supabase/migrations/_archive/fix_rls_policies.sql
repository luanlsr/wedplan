-- FIX RLS FOR WEDDINGS AND MEMBERS
-- Permite que usuários autenticados criem casamentos e visualizem aqueles que acabaram de criar

-- 1. Adiciona coluna creator_id para facilitar RLS inicial (opcional mas recomendado)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='weddings' AND COLUMN_NAME='creator_id') THEN
        ALTER TABLE weddings ADD COLUMN creator_id UUID DEFAULT auth.uid();
    END IF;
END $$;

-- 2. Atualiza políticas de WEDDINGS
DROP POLICY IF EXISTS "Users can create weddings" ON weddings;
CREATE POLICY "Users can create weddings" ON weddings
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can see their own weddings" ON weddings;
CREATE POLICY "Users can see their own weddings" ON weddings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM wedding_members WHERE wedding_id = id AND user_id = auth.uid())
        OR 
        creator_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update their own weddings" ON weddings;
CREATE POLICY "Users can update their own weddings" ON weddings
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM wedding_members WHERE wedding_id = id AND user_id = auth.uid())
        OR 
        creator_id = auth.uid()
    );

-- 3. Atualiza políticas de WEDDING_MEMBERS
DROP POLICY IF EXISTS "Users can join weddings" ON wedding_members;
CREATE POLICY "Users can join weddings" ON wedding_members 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can see their wedding memberships" ON wedding_members;
CREATE POLICY "Users can see their wedding memberships" ON wedding_members 
    FOR SELECT USING (auth.uid() = user_id);

-- 4. Garante que DELETE também funcione para donos
DROP POLICY IF EXISTS "Users can delete their own weddings" ON weddings;
CREATE POLICY "Users can delete their own weddings" ON weddings
    FOR DELETE USING (creator_id = auth.uid());

-- 5. Outras tabelas: Garantir política de INSERT para convidados e tarefas
DROP POLICY IF EXISTS "Users can manage guests of their weddings" ON guests;
CREATE POLICY "Users can manage guests of their weddings" ON guests
    FOR ALL USING (EXISTS (SELECT 1 FROM wedding_members WHERE wedding_id = guests.wedding_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage tasks of their weddings" ON tasks;
CREATE POLICY "Users can manage tasks of their weddings" ON tasks
    FOR ALL USING (EXISTS (SELECT 1 FROM wedding_members WHERE wedding_id = tasks.wedding_id AND user_id = auth.uid()));
