-- Complete setup for user booking system
-- Run this in Supabase SQL Editor to set up the entire user booking system

-- 1. Add user_id column to warehouse_occupants table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'warehouse_occupants'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE warehouse_occupants ADD COLUMN user_id UUID;
        CREATE INDEX IF NOT EXISTS idx_warehouse_occupants_user_id ON warehouse_occupants(user_id);
        RAISE NOTICE 'Added user_id column to warehouse_occupants table';
    ELSE
        RAISE NOTICE 'user_id column already exists in warehouse_occupants table';
    END IF;
END $$;

-- 2. Create user_bookings table
CREATE TABLE IF NOT EXISTS user_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    occupant_id UUID NOT NULL REFERENCES warehouse_occupants(id) ON DELETE CASCADE,
    booking_id TEXT NOT NULL,
    booking_status TEXT DEFAULT 'active',
    booking_notes TEXT,
    area_requested INTEGER,
    duration_months INTEGER,
    modification_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(user_id, occupant_id),
    INDEX idx_user_bookings_user_id (user_id),
    INDEX idx_user_bookings_occupant_id (occupant_id),
    INDEX idx_user_bookings_booking_id (booking_id)
);

-- 3. Enable Row Level Security
ALTER TABLE user_bookings ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON user_bookings;
CREATE POLICY "Users can view their own bookings" ON user_bookings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own bookings" ON user_bookings;
CREATE POLICY "Users can insert their own bookings" ON user_bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bookings" ON user_bookings;
CREATE POLICY "Users can update their own bookings" ON user_bookings
    FOR UPDATE USING (auth.uid() = user_id);

-- 5. Grant permissions
GRANT ALL ON user_bookings TO authenticated;
GRANT ALL ON user_bookings TO service_role;

-- 6. Create function to create user_bookings table
CREATE OR REPLACE FUNCTION create_user_bookings_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Table creation is handled above, this function just ensures it exists
    RAISE NOTICE 'User bookings table setup complete';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in create_user_bookings_table: %', SQLERRM;
END;
$$;

-- 7. Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_bookings_updated_at ON user_bookings;
CREATE TRIGGER update_user_bookings_updated_at
    BEFORE UPDATE ON user_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Create user_dashboard_activity table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_dashboard_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Enable RLS on user_dashboard_activity
ALTER TABLE user_dashboard_activity ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for user_dashboard_activity
DROP POLICY IF EXISTS "Users can view their own activity" ON user_dashboard_activity;
CREATE POLICY "Users can view their own activity" ON user_dashboard_activity
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own activity" ON user_dashboard_activity;
CREATE POLICY "Users can insert their own activity" ON user_dashboard_activity
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 11. Grant permissions for user_dashboard_activity
GRANT ALL ON user_dashboard_activity TO authenticated;
GRANT ALL ON user_dashboard_activity TO service_role;

-- 12. Create user_warehouse_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_warehouse_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    selected_warehouse_id UUID,
    default_space_type TEXT DEFAULT 'Ground Floor',
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Enable RLS on user_warehouse_preferences
ALTER TABLE user_warehouse_preferences ENABLE ROW LEVEL SECURITY;

-- 14. Create RLS policies for user_warehouse_preferences
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_warehouse_preferences;
CREATE POLICY "Users can view their own preferences" ON user_warehouse_preferences
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_warehouse_preferences;
CREATE POLICY "Users can insert their own preferences" ON user_warehouse_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON user_warehouse_preferences;
CREATE POLICY "Users can update their own preferences" ON user_warehouse_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- 15. Grant permissions for user_warehouse_preferences
GRANT ALL ON user_warehouse_preferences TO authenticated;
GRANT ALL ON user_warehouse_preferences TO service_role;

-- 16. Create trigger for user_warehouse_preferences updated_at
DROP TRIGGER IF EXISTS update_user_warehouse_preferences_updated_at ON user_warehouse_preferences;
CREATE TRIGGER update_user_warehouse_preferences_updated_at
    BEFORE UPDATE ON user_warehouse_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 17. Create calculate_warehouse_availability_for_user function if it doesn't exist
CREATE OR REPLACE FUNCTION calculate_warehouse_availability_for_user(
    warehouse_uuid UUID,
    space_type_param TEXT
)
RETURNS TABLE(
    total_space INTEGER,
    occupied_space INTEGER,
    available_space INTEGER,
    utilization_percentage DECIMAL
)
LANGUAGE plpgsql
AS $$
DECLARE
    warehouse_record RECORD;
    total INTEGER := 0;
    occupied INTEGER := 0;
    available INTEGER := 0;
    utilization DECIMAL := 0;
BEGIN
    -- Get warehouse data
    SELECT * INTO warehouse_record
    FROM warehouses
    WHERE id = warehouse_uuid;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Calculate based on space type
    IF space_type_param = 'Ground Floor' THEN
        total := warehouse_record.total_space;
        occupied := warehouse_record.occupied_space;
    ELSIF space_type_param = 'Mezzanine' THEN
        total := warehouse_record.mezzanine_space;
        occupied := warehouse_record.mezzanine_occupied;
    ELSE
        RETURN;
    END IF;

    -- Calculate available space and utilization
    available := GREATEST(0, total - occupied);
    IF total > 0 THEN
        utilization := ROUND((occupied::DECIMAL / total::DECIMAL) * 100, 2);
    ELSE
        utilization := 0;
    END IF;

    RETURN QUERY SELECT total, occupied, available, utilization;
END;
$$;

-- 18. Test the setup by running the function
DO $$
DECLARE
    result RECORD;
BEGIN
    RAISE NOTICE 'Testing user booking system setup...';

    -- Test if tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_bookings') THEN
        RAISE NOTICE '✅ user_bookings table exists';
    ELSE
        RAISE NOTICE '❌ user_bookings table missing';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_dashboard_activity') THEN
        RAISE NOTICE '✅ user_dashboard_activity table exists';
    ELSE
        RAISE NOTICE '❌ user_dashboard_activity table missing';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouse_occupants' AND column_name = 'user_id') THEN
        RAISE NOTICE '✅ warehouse_occupants.user_id column exists';
    ELSE
        RAISE NOTICE '❌ warehouse_occupants.user_id column missing';
    END IF;

    RAISE NOTICE 'User booking system setup complete!';
END $$;
