-- SIMPLE UNIFIED USERS FIX - No Complex JOINs
-- This script creates the unified table and migrates data without complex JOINs

-- 1. Drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS unified_users;

-- 2. Create the unified table
CREATE TABLE unified_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'MANAGER', 'SUPPORT', 'USER')),
    is_active BOOLEAN DEFAULT true,
    
    -- Warehouse-specific fields
    warehouse_id TEXT,
    space_occupied DECIMAL(10,2) DEFAULT 0,
    floor_type TEXT DEFAULT 'ground',
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expected_exit_date TIMESTAMP WITH TIME ZONE,
    warehouse_status TEXT DEFAULT 'inactive' CHECK (warehouse_status IN ('active', 'inactive', 'pending')),
    
    -- Additional fields
    phone TEXT,
    company TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Migrate existing users to the new unified table
INSERT INTO unified_users (
    id, email, name, role, is_active, created_at
)
SELECT 
    id, email, name, role, is_active, created_at
FROM users
ON CONFLICT (email) DO NOTHING;

-- 4. Migrate warehouse occupants and link them to users
UPDATE unified_users 
SET 
    warehouse_id = wo.warehouse_id,
    space_occupied = wo.space_occupied,
    floor_type = wo.floor_type,
    entry_date = wo.entry_date,
    expected_exit_date = wo.expected_exit_date,
    warehouse_status = wo.status,
    updated_at = NOW()
FROM warehouse_occupants wo
WHERE wo.name = unified_users.name 
  AND wo.contact_info = unified_users.email
  AND wo.status = 'active';

-- 5. Create indexes
CREATE INDEX idx_unified_users_email ON unified_users(email);
CREATE INDEX idx_unified_users_role ON unified_users(role);
CREATE INDEX idx_unified_users_warehouse_status ON unified_users(warehouse_status);

-- 6. Verify the migration - Simple queries only
SELECT '=== MIGRATION COMPLETE ===' as info;

-- Show all users
SELECT 
    'All Users:' as info,
    name,
    email,
    role,
    warehouse_status,
    space_occupied
FROM unified_users
ORDER BY role, name;

-- Show users with warehouse space
SELECT 
    'Users with Warehouse Space:' as info,
    name,
    email,
    space_occupied,
    floor_type,
    warehouse_status,
    entry_date
FROM unified_users
WHERE warehouse_status = 'active' AND space_occupied > 0;

-- Summary
SELECT 
    'Summary:' as info,
    COUNT(*) as total_users,
    COUNT(CASE WHEN warehouse_status = 'active' THEN 1 END) as users_with_warehouse,
    SUM(CASE WHEN warehouse_status = 'active' THEN space_occupied ELSE 0 END) as total_space_occupied
FROM unified_users
WHERE role = 'USER';

-- 7. Test data access (simple query)
SELECT 
    'Test Query:' as info,
    name,
    warehouse_id,
    space_occupied,
    warehouse_status
FROM unified_users
WHERE warehouse_status = 'active';
