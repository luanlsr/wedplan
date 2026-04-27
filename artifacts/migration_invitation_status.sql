-- Migration to add invitation_sent column to guests table
ALTER TABLE guests ADD COLUMN IF NOT EXISTS invitation_sent BOOLEAN DEFAULT FALSE;

-- Optional: Update existing records to have FALSE instead of NULL
UPDATE guests SET invitation_sent = FALSE WHERE invitation_sent IS NULL;
