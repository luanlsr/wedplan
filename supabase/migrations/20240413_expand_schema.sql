-- Expand weddings table
ALTER TABLE weddings 
ADD COLUMN IF NOT EXISTS couple_name1 TEXT,
ADD COLUMN IF NOT EXISTS couple_name2 TEXT;

-- Migration: split couple_names if possible, or just leave for now
UPDATE weddings SET 
    couple_name1 = SPLIT_PART(couple_names, ' & ', 1),
    couple_name2 = SPLIT_PART(couple_names, ' & ', 2)
WHERE couple_name1 IS NULL;

-- Expand suppliers table
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS contract_date DATE,
ADD COLUMN IF NOT EXISTS payment_rule TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS entry_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS entry_percentage NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS entry_installments INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS num_installments INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS final_payment_days_before INTEGER DEFAULT 15;

-- Update RLS policies is not needed as they use column wedding_id which exists.
