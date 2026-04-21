-- Migration: Unique Wedding Owner
-- Description: Ensures one user can only own one wedding record as the primary owner. This prevents duplicate wedding records for the same user.

-- 1. Remove existing duplicates keeping only the most recent (CUIDADO: Isso limpa duplicatas órfãs)
DELETE FROM public.weddings a
USING public.weddings b
WHERE a.owner_id = b.owner_id 
AND a.created_at < b.created_at;

-- 2. Add Unique Constraint on owner_id
ALTER TABLE public.weddings DROP CONSTRAINT IF EXISTS weddings_owner_id_key;
ALTER TABLE public.weddings ADD CONSTRAINT weddings_owner_id_key UNIQUE (owner_id);
