-- Add user_id column to warehouse_occupants table if it doesn't exist
-- This allows us to link user bookings to the warehouse occupants table

-- Check if user_id column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'warehouse_occupants'
        AND column_name = 'user_id'
    ) THEN
        -- Add user_id column
        ALTER TABLE warehouse_occupants ADD COLUMN user_id UUID;

        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_warehouse_occupants_user_id ON warehouse_occupants(user_id);

        RAISE NOTICE 'Added user_id column to warehouse_occupants table';
    ELSE
        RAISE NOTICE 'user_id column already exists in warehouse_occupants table';
    END IF;
END $$;

-- Update existing records to have user_id = NULL for backwards compatibility
-- This ensures existing admin bookings still work

-- Grant permissions for the new column
GRANT SELECT, INSERT, UPDATE ON warehouse_occupants TO authenticated;
GRANT ALL ON warehouse_occupants TO service_role;
