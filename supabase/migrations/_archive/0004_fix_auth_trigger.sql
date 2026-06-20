-- Migration: Fix Auth Trigger for New Users
-- Description: Adds the trigger to automatically create a public profile record when a new user signs up via Supabase Auth.

-- 1. Create the function that will handle the insertion
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'couple');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on auth.users table
-- We check if it exists first to avoid errors during re-application
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    END IF;
END $$;
