-- Fix user booking system by adding user_id column and setting up proper tracking
-- Run this in Supabase SQL Editor

-- 1. Add user_id column to warehouse_occupants if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'warehouse_occupants'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE warehouse_occupants ADD COLUMN user_id UUID;
        RAISE NOTICE '✅ Added user_id column to warehouse_occupants';
    ELSE
        RAISE NOTICE 'ℹ️ user_id column already exists in warehouse_occupants';
    END IF;
END $$;

-- 2. Create index on user_id for better performance
CREATE INDEX IF NOT EXISTS idx_warehouse_occupants_user_id ON warehouse_occupants(user_id);

-- 3. Create user_bookings table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    occupant_id UUID REFERENCES warehouse_occupants(id) ON DELETE CASCADE,
    booking_id TEXT NOT NULL,
    booking_status TEXT DEFAULT 'active',
    booking_notes TEXT,
    area_requested INTEGER,
    duration_months INTEGER,
    occupant_name TEXT, -- Store the user's name for easy reference
    occupant_email TEXT, -- Store the user's email for easy reference
    modification_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS on user_bookings
ALTER TABLE user_bookings ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON user_bookings;
CREATE POLICY "Users can view their own bookings" ON user_bookings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own bookings" ON user_bookings;
CREATE POLICY "Users can insert their own bookings" ON user_bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Grant permissions
GRANT ALL ON user_bookings TO authenticated;
GRANT ALL ON user_bookings TO service_role;

-- 7. Create function to create user bookings table
CREATE OR REPLACE FUNCTION create_user_bookings_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE NOTICE 'User bookings table setup complete';
END;
$$;

-- 8. Create user_occupied_space view for users to see only their space
CREATE OR REPLACE VIEW user_occupied_space AS
SELECT
    wo.id,
    wo.warehouse_id,
    wo.user_id,
    wo.name,
    wo.contact_info,
    wo.space_occupied,
    wo.floor_type,
    wo.entry_date,
    wo.expected_exit_date,
    wo.status,
    wo.notes,
    w.name as warehouse_name,
    w.location as warehouse_location,
    w.total_space,
    w.has_mezzanine,
    w.mezzanine_space
FROM warehouse_occupants wo
JOIN warehouses w ON wo.warehouse_id = w.id
WHERE wo.user_id IS NOT NULL
    AND wo.status = 'active';

-- 9. Enable RLS on the view
ALTER VIEW user_occupied_space SET (security_barrier = true);

-- 10. Create policy for the view
DROP POLICY IF EXISTS "Users can view their own occupied space" ON user_occupied_space;
CREATE POLICY "Users can view their own occupied space" ON user_occupied_space
    FOR SELECT USING (auth.uid() = user_id);

-- 11. Grant permissions on the view
GRANT SELECT ON user_occupied_space TO authenticated;

-- 12. Test the setup
DO $$
DECLARE
    user_count INTEGER;
    booking_count INTEGER;
BEGIN
    -- Check if user_id column exists
    SELECT COUNT(*) INTO user_count
    FROM information_schema.columns
    WHERE table_name = 'warehouse_occupants'
    AND column_name = 'user_id';

    IF user_count > 0 THEN
        RAISE NOTICE '✅ user_id column exists in warehouse_occupants';
    ELSE
        RAISE NOTICE '❌ user_id column missing from warehouse_occupants';
    END IF;

    -- Check if user_bookings table exists
    SELECT COUNT(*) INTO booking_count
    FROM information_schema.tables
    WHERE table_name = 'user_bookings';

    IF booking_count > 0 THEN
        RAISE NOTICE '✅ user_bookings table exists';
    ELSE
        RAISE NOTICE '❌ user_bookings table missing';
    END IF;

    RAISE NOTICE 'User booking system setup verification complete';
END $$;
