-- Create dummy users for Manager and Supporter roles
-- These accounts can be used for testing different access levels

-- First, check if the users table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) THEN
        RAISE EXCEPTION 'Users table does not exist. Please run the authentication setup first.';
    END IF;
END $$;

-- Create Manager User
INSERT INTO users (google_sub, email, name, role, is_active) VALUES
('manager_dummy_123', 'manager@zoombahrain.com', 'Manager User', 'MANAGER', true)
ON CONFLICT (email) DO UPDATE SET 
    role = 'MANAGER',
    name = 'Manager User',
    is_active = true,
    updated_at = NOW();

-- Create Supporter User  
INSERT INTO users (google_sub, email, name, role, is_active) VALUES
('support_dummy_456', 'support@zoombahrain.com', 'Support User', 'SUPPORT', true)
ON CONFLICT (email) DO UPDATE SET 
    role = 'SUPPORT',
    name = 'Support User',
    is_active = true,
    updated_at = NOW();

-- Create Admin User (if needed)
INSERT INTO users (google_sub, email, name, role, is_active) VALUES
('admin_dummy_789', 'admin@zoombahrain.com', 'Admin User', 'ADMIN', true)
ON CONFLICT (email) DO UPDATE SET 
    role = 'ADMIN',
    name = 'Admin User',
    is_active = true,
    updated_at = NOW();

-- Create Regular User (if needed)
INSERT INTO users (google_sub, email, name, role, is_active) VALUES
('user_dummy_101', 'user@zoombahrain.com', 'Regular User', 'USER', true)
ON CONFLICT (email) DO UPDATE SET 
    role = 'USER',
    name = 'Regular User',
    is_active = true,
    updated_at = NOW();

-- Display created users
SELECT 
    email,
    name,
    role,
    is_active,
    created_at
FROM users 
WHERE email IN (
    'manager@zoombahrain.com',
    'support@zoombahrain.com', 
    'admin@zoombahrain.com',
    'user@zoombahrain.com'
)
ORDER BY role;

-- Instructions for testing:
-- 1. Run this script in your Supabase SQL editor
-- 2. Use these credentials to test different access levels:
--
-- Manager Account:
--   Email: manager@zoombahrain.com
--   Access: Warehouse management only (no occupants)
--
-- Support Account:
--   Email: support@zoombahrain.com
--   Access: Basic warehouse view and support tools
--
-- Admin Account:
--   Email: admin@zoombahrain.com
--   Access: Full system access
--
-- Regular User Account:
--   Email: user@zoombahrain.com
--   Access: Basic warehouse view and stock management
--
-- Note: These accounts use Google OAuth for authentication.
-- To test with email/password, you'll need to add password_hash column
-- or use the Google OAuth login method.
