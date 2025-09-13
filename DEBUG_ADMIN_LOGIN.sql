-- Debug admin login issues
-- Run these queries in Supabase SQL Editor to check user roles and sessions

-- 1. Check all admin users
SELECT
    id,
    email,
    name,
    role,
    is_active,
    created_at,
    updated_at
FROM users
WHERE role IN ('ADMIN', 'MANAGER', 'SUPPORT')
ORDER BY created_at DESC;

-- 2. Check recent sessions for admin users
SELECT
    us.id,
    us.user_id,
    us.session_token,
    us.created_at,
    us.expires_at,
    u.email,
    u.role,
    u.is_active
FROM user_sessions us
JOIN users u ON us.user_id = u.id
WHERE u.role IN ('ADMIN', 'MANAGER', 'SUPPORT')
  AND us.expires_at > NOW()
ORDER BY us.created_at DESC
LIMIT 20;

-- 3. Check environment variable (you need to verify this is set correctly)
-- NEXT_PUBLIC_ADMIN_EMAILS should contain admin emails separated by commas
-- Example: admin@example.com,manager@company.com

-- 4. Check if user was created with correct role after Google login
-- Replace 'your-admin-email@example.com' with actual admin email
SELECT
    id,
    google_sub,
    email,
    name,
    role,
    is_active,
    created_at
FROM users
WHERE email = 'your-admin-email@example.com';

-- 5. Check warehouse_occupants table structure to verify floor_type constraint
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'warehouse_occupants'
  AND column_name = 'floor_type';

-- 6. Check floor_type check constraint
SELECT
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'warehouse_occupants'
  AND tc.constraint_type = 'CHECK'
  AND cc.check_clause LIKE '%floor_type%';

-- 7. Test floor_type values
-- These should work:
-- INSERT INTO warehouse_occupants (id, warehouse_id, name, space_occupied, floor_type, entry_date, status)
-- VALUES (gen_random_uuid(), 'test-warehouse-id', 'Test Ground', 100, 'ground', NOW(), 'active');

-- INSERT INTO warehouse_occupants (id, warehouse_id, name, space_occupied, floor_type, entry_date, status)
-- VALUES (gen_random_uuid(), 'test-warehouse-id', 'Test Mezzanine', 100, 'mezzanine', NOW(), 'active');

-- Clean up test records:
-- DELETE FROM warehouse_occupants WHERE name LIKE 'Test%';
