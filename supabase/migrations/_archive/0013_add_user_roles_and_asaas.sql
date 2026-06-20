-- Add role to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'couple';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT;
ALTER TABLE public.weddings ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial'; -- trial, active, past_due, canceled

-- Add RLS policy for master role
-- Allow 'master' to view all profiles
DROP POLICY IF EXISTS "Master can view all profiles" ON profiles;
CREATE POLICY "Master can view all profiles" ON profiles
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
    );

-- Allow 'master' to view all weddings
DROP POLICY IF EXISTS "Master can view all weddings" ON weddings;
CREATE POLICY "Master can view all weddings" ON weddings
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
    );

-- Admin can manage all profiles
DROP POLICY IF EXISTS "Master can update all profiles" ON profiles;
CREATE POLICY "Master can update all profiles" ON profiles
    FOR UPDATE USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
    );

-- Admin can manage all weddings
DROP POLICY IF EXISTS "Master can update all weddings" ON weddings;
CREATE POLICY "Master can update all weddings" ON weddings
    FOR UPDATE USING (
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'master'
    );
