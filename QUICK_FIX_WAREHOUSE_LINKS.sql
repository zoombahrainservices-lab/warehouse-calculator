-- QUICK FIX: Link Warehouse Occupants to Users
-- Run this in your Supabase SQL Editor to fix the supporter dashboard

-- 1. Link Jango John to his warehouse occupancy
UPDATE warehouse_occupants 
SET user_id = (
    SELECT id FROM users 
    WHERE email = 'jangojohn@gmail.com' AND role = 'USER'
)
WHERE name = 'Jango John' AND contact_info = 'jangojohn@gmail.com';

-- 2. Create user_bookings table
CREATE TABLE IF NOT EXISTS user_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    occupant_id TEXT NOT NULL REFERENCES warehouse_occupants(id) ON DELETE CASCADE,
    booking_id TEXT NOT NULL,
    booking_status TEXT DEFAULT 'active',
    area_requested INTEGER,
    duration_months INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create a sample booking for Jango John
INSERT INTO user_bookings (
    user_id, 
    occupant_id, 
    booking_id, 
    area_requested, 
    duration_months
) 
SELECT 
    u.id,
    wo.id,
    'booking-jango-001',
    wo.space_occupied,
    12
FROM users u
JOIN warehouse_occupants wo ON wo.name = u.name AND wo.contact_info = u.email
WHERE u.email = 'jangojohn@gmail.com'
ON CONFLICT DO NOTHING;

-- 4. Verify the fix
SELECT 
    'Users with Warehouse Space:' as info,
    u.name,
    u.email,
    wo.space_occupied,
    wo.warehouse_id
FROM users u
JOIN warehouse_occupants wo ON u.id = wo.user_id
WHERE wo.status = 'active';
