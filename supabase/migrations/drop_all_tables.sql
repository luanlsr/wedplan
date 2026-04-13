-- WedPlan Drop Script
-- Run this to completely reset your database structure

DROP VIEW IF EXISTS wedding_financial_overview CASCADE;
DROP TABLE IF EXISTS installments CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS planning_simulations CASCADE;
DROP TABLE IF EXISTS wedding_members CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS weddings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;

-- Cleanup Auth Trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
