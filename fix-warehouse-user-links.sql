-- Fix Warehouse User Links
-- This script links existing warehouse occupants to their user accounts
-- Run this in your Supabase SQL Editor

-- 1. First, let's see what we have
SELECT '=== CURRENT STATE ===' as info;

SELECT 
    'Users' as table_name,
    id,
    name,
    email,
    role
FROM users 
WHERE role = 'USER' AND is_active = true;

SELECT 
    'Warehouse Occupants' as table_name,
    id,
    name,
    contact_info,
    space_occupied,
    warehouse_id,
    user_id,
    status
FROM warehouse_occupants 
WHERE status = 'active';

-- 2. Link Jango John to his warehouse occupancy
-- Find Jango John's user ID
DO $$
DECLARE
    jango_user_id UUID;
    jango_occupant_id TEXT;
BEGIN
    -- Get Jango John's user ID
    SELECT id INTO jango_user_id 
    FROM users 
    WHERE email = 'jangojohn@gmail.com' AND role = 'USER';
    
    -- Get Jango John's warehouse occupant ID
    SELECT id INTO jango_occupant_id 
    FROM warehouse_occupants 
    WHERE name = 'Jango John' AND contact_info = 'jangojohn@gmail.com';
    
    -- Update the warehouse occupant to link to the user
    IF jango_user_id IS NOT NULL AND jango_occupant_id IS NOT NULL THEN
        UPDATE warehouse_occupants 
        SET user_id = jango_user_id
        WHERE id = jango_occupant_id;
        
        RAISE NOTICE '✅ Linked Jango John (user_id: %) to warehouse occupant (id: %)', jango_user_id, jango_occupant_id;
    ELSE
        RAISE NOTICE '❌ Could not find Jango John user or warehouse occupant';
    END IF;
END $$;

-- 3. Create user_bookings table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    occupant_id TEXT NOT NULL REFERENCES warehouse_occupants(id) ON DELETE CASCADE,
    booking_id TEXT NOT NULL,
    booking_status TEXT DEFAULT 'active' CHECK (booking_status IN ('active', 'cancelled', 'completed', 'modified')),
    booking_notes TEXT,
    area_requested INTEGER,
    duration_months INTEGER,
    modification_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_bookings_user_id ON user_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bookings_occupant_id ON user_bookings(occupant_id);
CREATE INDEX IF NOT EXISTS idx_user_bookings_booking_id ON user_bookings(booking_id);

-- 5. Create a sample user booking for Jango John
DO $$
DECLARE
    jango_user_id UUID;
    jango_occupant_id TEXT;
BEGIN
    -- Get Jango John's user ID
    SELECT id INTO jango_user_id 
    FROM users 
    WHERE email = 'jangojohn@gmail.com' AND role = 'USER';
    
    -- Get Jango John's warehouse occupant ID
    SELECT id INTO jango_occupant_id 
    FROM warehouse_occupants 
    WHERE name = 'Jango John' AND contact_info = 'jangojohn@gmail.com';
    
    -- Create a user booking record
    IF jango_user_id IS NOT NULL AND jango_occupant_id IS NOT NULL THEN
        INSERT INTO user_bookings (
            user_id, 
            occupant_id, 
            booking_id, 
            booking_status, 
            area_requested, 
            duration_months,
            booking_notes
        ) VALUES (
            jango_user_id,
            jango_occupant_id,
            'booking-jango-001',
            'active',
            1000,
            12,
            'Jango John warehouse space booking'
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Created user booking for Jango John';
    ELSE
        RAISE NOTICE '❌ Could not create user booking - missing user or occupant';
    END IF;
END $$;

-- 6. Verify the fixes
SELECT '=== AFTER FIXES ===' as info;

SELECT 
    'Linked Warehouse Occupants' as table_name,
    wo.id,
    wo.name,
    wo.contact_info,
    wo.space_occupied,
    wo.warehouse_id,
    wo.user_id,
    u.name as user_name,
    u.email as user_email
FROM warehouse_occupants wo
LEFT JOIN users u ON wo.user_id = u.id
WHERE wo.status = 'active';

SELECT 
    'User Bookings' as table_name,
    ub.id,
    ub.user_id,
    ub.booking_id,
    ub.booking_status,
    ub.area_requested,
    ub.duration_months,
    u.name as user_name,
    u.email as user_email
FROM user_bookings ub
LEFT JOIN users u ON ub.user_id = u.id;

-- 7. Summary
SELECT '=== SUMMARY ===' as info;
SELECT 
    'Total users with warehouse space' as metric,
    COUNT(DISTINCT wo.user_id) as count
FROM warehouse_occupants wo
WHERE wo.status = 'active' AND wo.user_id IS NOT NULL

UNION ALL

SELECT 
    'Total user bookings' as metric,
    COUNT(*) as count
FROM user_bookings ub
WHERE ub.booking_status = 'active';
