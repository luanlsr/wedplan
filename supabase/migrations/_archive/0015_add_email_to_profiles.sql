-- 1. Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Populate the email column with data from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 3. Update the trigger function to automatically insert email for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'couple');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
