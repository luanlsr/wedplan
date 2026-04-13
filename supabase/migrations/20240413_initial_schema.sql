-- Create weddings table
CREATE TABLE IF NOT EXISTS weddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_names TEXT,
    wedding_date DATE,
    total_budget NUMERIC DEFAULT 0,
    theme TEXT DEFAULT 'light',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table to link Auth Users to Weddings
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    service TEXT,
    category TEXT,
    total_value NUMERIC DEFAULT 0,
    payment_type TEXT,
    status TEXT DEFAULT 'pendente',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Installments table
CREATE TABLE IF NOT EXISTS installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    due_date DATE NOT NULL,
    value NUMERIC NOT NULL,
    status TEXT DEFAULT 'pendente',
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;

-- Policies
-- Profiles: User can only see/edit their own profile
CREATE POLICY "Users can see their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Weddings: Users can see the wedding they are part of
CREATE POLICY "Users can see their wedding" ON weddings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.wedding_id = weddings.id 
            AND profiles.id = auth.uid()
        )
    );

CREATE POLICY "Users can update their wedding" ON weddings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.wedding_id = weddings.id 
            AND profiles.id = auth.uid()
        )
    );

-- Suppliers: Filtered by wedding_id
CREATE POLICY "Users can manage suppliers of their wedding" ON suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.wedding_id = suppliers.wedding_id 
            AND profiles.id = auth.uid()
        )
    );

-- Installments: Filtered by supplier -> wedding_id
CREATE POLICY "Users can manage installments of their wedding" ON installments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM suppliers
            JOIN profiles ON profiles.wedding_id = suppliers.wedding_id
            WHERE suppliers.id = installments.supplier_id
            AND profiles.id = auth.uid()
        )
    );
