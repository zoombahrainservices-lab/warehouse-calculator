-- Function to create user_bookings table if it doesn't exist
CREATE OR REPLACE FUNCTION create_user_bookings_table()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Create user_bookings table if it doesn't exist
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

        -- Add unique constraint to prevent duplicate bookings
        UNIQUE(user_id, occupant_id),

        -- Add index for better performance
        INDEX idx_user_bookings_user_id (user_id),
        INDEX idx_user_bookings_occupant_id (occupant_id),
        INDEX idx_user_bookings_booking_id (booking_id)
    );

    -- Enable Row Level Security
    ALTER TABLE user_bookings ENABLE ROW LEVEL SECURITY;

    -- Create policy for users to only see their own bookings
    DROP POLICY IF EXISTS "Users can view their own bookings" ON user_bookings;
    CREATE POLICY "Users can view their own bookings" ON user_bookings
        FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert their own bookings" ON user_bookings;
    CREATE POLICY "Users can insert their own bookings" ON user_bookings
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can update their own bookings" ON user_bookings;
    CREATE POLICY "Users can update their own bookings" ON user_bookings
        FOR UPDATE USING (auth.uid() = user_id);

    -- Grant necessary permissions
    GRANT ALL ON user_bookings TO authenticated;
    GRANT ALL ON user_bookings TO service_role;

    -- Add trigger to update updated_at timestamp
    DROP TRIGGER IF EXISTS update_user_bookings_updated_at ON user_bookings;
    CREATE TRIGGER update_user_bookings_updated_at
        BEFORE UPDATE ON user_bookings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    RAISE NOTICE 'User bookings table created successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating user bookings table: %', SQLERRM;
END;
$$;
