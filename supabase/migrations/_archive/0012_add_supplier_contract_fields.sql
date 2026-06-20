-- Add expanded supplier fields
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS cnpj_cpf TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS contract_url TEXT;

-- Create contracts bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Set up policies for the contracts bucket
-- Everyone can view contracts (since URLs might be needed to view)
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'contracts');

-- Only authenticated users can insert/update/delete contracts
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'contracts' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING (bucket_id = 'contracts' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING (bucket_id = 'contracts' AND auth.role() = 'authenticated');
