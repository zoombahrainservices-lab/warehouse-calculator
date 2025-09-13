-- Add floor_type column to warehouse_occupants table
-- This script adds the floor_type column that's needed for mezzanine floor functionality

-- Add floor_type column if it doesn't exist
ALTER TABLE warehouse_occupants 
ADD COLUMN IF NOT EXISTS floor_type TEXT DEFAULT 'Ground Floor';

-- Add a check constraint to ensure valid floor types
ALTER TABLE warehouse_occupants 
DROP CONSTRAINT IF EXISTS valid_floor_type;

ALTER TABLE warehouse_occupants 
ADD CONSTRAINT valid_floor_type 
CHECK (floor_type IN ('Ground Floor', 'Mezzanine'));

-- Update existing records to have 'Ground Floor' as default
UPDATE warehouse_occupants 
SET floor_type = 'Ground Floor' 
WHERE floor_type IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE warehouse_occupants 
ALTER COLUMN floor_type SET NOT NULL;

-- Add an index for better performance when filtering by floor type
CREATE INDEX IF NOT EXISTS idx_warehouse_occupants_floor_type 
ON warehouse_occupants(floor_type);

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'warehouse_occupants' 
AND column_name = 'floor_type';





