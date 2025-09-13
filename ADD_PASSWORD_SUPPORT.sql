-- Add password support to existing users table
-- This script adds the necessary columns for email/password authentication

-- Add password_hash column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE users ADD COLUMN password_hash TEXT;
        RAISE NOTICE 'Added password_hash column to users table';
    ELSE
        RAISE NOTICE 'password_hash column already exists';
    END IF;
END $$;

-- Add is_verified column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_verified column to users table';
    ELSE
        RAISE NOTICE 'is_verified column already exists';
    END IF;
END $$;

-- Add signup_method column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'signup_method'
    ) THEN
        ALTER TABLE users ADD COLUMN signup_method TEXT DEFAULT 'google';
        RAISE NOTICE 'Added signup_method column to users table';
    ELSE
        RAISE NOTICE 'signup_method column already exists';
    END IF;
END $$;

-- Update existing users to have is_verified = true and signup_method = 'google'
UPDATE users 
SET is_verified = true, signup_method = 'google' 
WHERE is_verified IS NULL OR signup_method IS NULL;

-- Now create the dummy users with password support
INSERT INTO users (google_sub, email, name, role, is_active, password_hash, is_verified, signup_method) VALUES
('manager_dummy_123', 'manager@zoombahrain.com', 'Manager User', 'MANAGER', true, 'manager123', true, 'email')
ON CONFLICT (email) DO UPDATE SET 
    role = 'MANAGER',
    name = 'Manager User',
    is_active = true,
    password_hash = 'manager123',
    is_verified = true,
    signup_method = 'email',
    updated_at = NOW();

INSERT INTO users (google_sub, email, name, role, is_active, password_hash, is_verified, signup_method) VALUES
('support_dummy_456', 'support@zoombahrain.com', 'Support User', 'SUPPORT', true, 'support123', true, 'email')
ON CONFLICT (email) DO UPDATE SET 
    role = 'SUPPORT',
    name = 'Support User',
    is_active = true,
    password_hash = 'support123',
    is_verified = true,
    signup_method = 'email',
    updated_at = NOW();

INSERT INTO users (google_sub, email, name, role, is_active, password_hash, is_verified, signup_method) VALUES
('admin_dummy_789', 'admin@zoombahrain.com', 'Admin User', 'ADMIN', true, 'admin123', true, 'email')
ON CONFLICT (email) DO UPDATE SET 
    role = 'ADMIN',
    name = 'Admin User',
    is_active = true,
    password_hash = 'admin123',
    is_verified = true,
    signup_method = 'email',
    updated_at = NOW();

INSERT INTO users (google_sub, email, name, role, is_active, password_hash, is_verified, signup_method) VALUES
('user_dummy_101', 'user@zoombahrain.com', 'Regular User', 'USER', true, 'user123', true, 'email')
ON CONFLICT (email) DO UPDATE SET 
    role = 'USER',
    name = 'Regular User',
    is_active = true,
    password_hash = 'user123',
    is_verified = true,
    signup_method = 'email',
    updated_at = NOW();

-- Display created users
SELECT 
    email,
    name,
    role,
    is_active,
    is_verified,
    signup_method,
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
--   Password: manager123
--   Access: Warehouse management only (no occupants)
--
-- Support Account:
--   Email: support@zoombahrain.com
--   Password: support123
--   Access: Basic warehouse view and support tools
--
-- Admin Account:
--   Email: admin@zoombahrain.com
--   Password: admin123
--   Access: Full system access
--
-- Regular User Account:
--   Email: user@zoombahrain.com
--   Password: user123
--   Access: Basic warehouse view and stock management
