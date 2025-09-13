-- FIXED UNIFIED USERS TABLE - Handles Type Mismatch
-- This fixes the UUID vs TEXT type issue with warehouse_id

-- 1. First, let's see what we currently have
SELECT '=== CURRENT STATE ===' as info;

SELECT 'Users table:' as table_name, COUNT(*) as count FROM users;
SELECT 'Warehouse occupants table:' as table_name, COUNT(*) as count FROM warehouse_occupants;

-- Check the data types
SELECT 
    'warehouse_occupants.warehouse_id type:' as info,
    data_type 
FROM information_schema.columns 
WHERE table_name = 'warehouse_occupants' AND column_name = 'warehouse_id';

SELECT 
    'warehouses.id type:' as info,
    data_type 
FROM information_schema.columns 
WHERE table_name = 'warehouses' AND column_name = 'id';

-- 2. Create the unified table WITHOUT the foreign key constraint initially
CREATE TABLE IF NOT EXISTS unified_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'MANAGER', 'SUPPORT', 'USER')),
    is_active BOOLEAN DEFAULT true,
    
    -- Warehouse-specific fields (using TEXT to match existing data)
    warehouse_id TEXT, -- Changed from UUID to TEXT to match existing data
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

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_unified_users_email ON unified_users(email);
CREATE INDEX IF NOT EXISTS idx_unified_users_role ON unified_users(role);
CREATE INDEX IF NOT EXISTS idx_unified_users_warehouse_status ON unified_users(warehouse_status);
CREATE INDEX IF NOT EXISTS idx_unified_users_warehouse_id ON unified_users(warehouse_id);

-- 6. Verify the migration
SELECT '=== AFTER MIGRATION ===' as info;

SELECT 
    'All Users (Unified):' as info,
    name,
    email,
    role,
    warehouse_status,
    space_occupied,
    warehouse_id
FROM unified_users
ORDER BY role, name;

-- 7. Show users with warehouse space
SELECT 
    'Users with Warehouse Space:' as info,
    name,
    email,
    space_occupied,
    floor_type,
    warehouse_status,
    entry_date,
    warehouse_id
FROM unified_users
WHERE warehouse_status = 'active' AND space_occupied > 0;

-- 8. Test the relationship (without foreign key constraint)
SELECT 
    'Warehouse Data Test:' as info,
    u.name,
    u.warehouse_id,
    w.name as warehouse_name,
    w.location as warehouse_location
FROM unified_users u
LEFT JOIN warehouses w ON w.id::text = u.warehouse_id
WHERE u.warehouse_status = 'active' AND u.space_occupied > 0;

-- 9. Summary statistics
SELECT 
    'Summary:' as info,
    COUNT(*) as total_users,
    COUNT(CASE WHEN warehouse_status = 'active' THEN 1 END) as users_with_warehouse,
    SUM(CASE WHEN warehouse_status = 'active' THEN space_occupied ELSE 0 END) as total_space_occupied
FROM unified_users
WHERE role = 'USER';

-- 10. Optional: If you want to add foreign key constraint later, you can:
-- First convert warehouse_id to UUID type, then add the constraint
-- (This is optional and can be done later if needed)

-- ALTER TABLE unified_users ALTER COLUMN warehouse_id TYPE UUID USING warehouse_id::uuid;
-- ALTER TABLE unified_users ADD CONSTRAINT unified_users_warehouse_id_fkey 
--     FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
