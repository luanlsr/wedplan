-- Unified Migration for WedPlan
-- Date: 2024-04-13
-- Author: Database Architect & Backend Specialist

-- 1. Setup Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Cleanup (DANGER: Drops all data for a clean start as requested)
DROP TABLE IF EXISTS installments CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS planning_simulations CASCADE;
DROP TABLE IF EXISTS wedding_members CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS weddings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 3. Profiles Table (extending auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Weddings Table
CREATE TABLE weddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    couple_name1 TEXT,
    couple_name2 TEXT,
    wedding_date DATE,
    total_budget NUMERIC(12, 2) DEFAULT 0.00,
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Wedding Members (Linking users to weddings)
CREATE TABLE wedding_members (
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'owner', -- 'owner', 'partner', 'organizer'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (wedding_id, user_id)
);

-- 6. Suppliers Table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    service TEXT,
    category TEXT,
    total_value NUMERIC(12, 2) DEFAULT 0.00,
    payment_type TEXT, -- 'parcelado_fixo', 'entrada_parcelas', etc.
    status TEXT DEFAULT 'pendente', -- 'pago', 'parcial', 'pendente', 'atrasado'
    contract_date DATE,
    payment_rule TEXT,
    notes TEXT,
    
    -- Planning logic fields
    entry_value NUMERIC(12, 2) DEFAULT 0.00,
    entry_percentage NUMERIC(5, 2) DEFAULT 0.00,
    entry_installments INTEGER DEFAULT 0,
    num_installments INTEGER DEFAULT 0,
    final_payment_days_before INTEGER DEFAULT 15,
    order_index INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Installments Table
CREATE TABLE installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    value NUMERIC(12, 2) NOT NULL,
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'pendente', -- 'pago', 'pendente'
    payment_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Planning Simulations (Stores the state of the PlanningView)
CREATE TABLE planning_simulations (
    wedding_id UUID PRIMARY KEY REFERENCES weddings(id) ON DELETE CASCADE,
    current_step TEXT DEFAULT 'intro',
    current_month_index INTEGER DEFAULT 0,
    simulated_aportes JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Guests Table (Expansion for future/consistency)
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT, -- 'Família', 'Amigos', etc.
    status TEXT DEFAULT 'pendente', -- 'confirmado', 'pendente', 'recusado'
    adults_count INTEGER DEFAULT 1,
    children_count INTEGER DEFAULT 0,
    phone TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Tasks Table (Checklist)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    due_date DATE,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'em_progresso', 'concluido'
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 12. RLS Policies

-- Profiles: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Wedding Members: Users can see memberships for weddings they belong to
CREATE POLICY "Users can see their wedding memberships" ON wedding_members
    FOR SELECT USING (auth.uid() = user_id);

-- Weddings: Users can see weddings they are members of
CREATE POLICY "Users can see their own weddings" ON weddings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM wedding_members
            WHERE wedding_members.wedding_id = weddings.id
            AND wedding_members.user_id = auth.uid()
        )
    );

-- Suppliers: Linked to weddings
CREATE POLICY "Users can manage suppliers of their weddings" ON suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM wedding_members
            WHERE wedding_members.wedding_id = suppliers.wedding_id
            AND wedding_members.user_id = auth.uid()
        )
    );

-- Installments: Linked to suppliers
CREATE POLICY "Users can manage installments of their suppliers" ON installments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM suppliers
            JOIN wedding_members ON suppliers.wedding_id = wedding_members.wedding_id
            WHERE suppliers.id = installments.supplier_id
            AND wedding_members.user_id = auth.uid()
        )
    );

-- Simulations: Linked to weddings
CREATE POLICY "Users can manage simulations of their weddings" ON planning_simulations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM wedding_members
            WHERE wedding_members.wedding_id = planning_simulations.wedding_id
            AND wedding_members.user_id = auth.uid()
        )
    );

-- 13. Functions and Triggers

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 14. Helper Views for Calculations
CREATE VIEW wedding_financial_overview AS
SELECT 
    w.id AS wedding_id,
    w.total_budget,
    COALESCE(SUM(s.total_value), 0) AS total_contracted,
    COALESCE((
        SELECT SUM(i.value) 
        FROM installments i 
        JOIN suppliers s2 ON i.supplier_id = s2.id 
        WHERE s2.wedding_id = w.id AND i.status = 'pago'
    ), 0) AS total_paid
FROM weddings w
LEFT JOIN suppliers s ON s.wedding_id = w.id
GROUP BY w.id, w.total_budget;
