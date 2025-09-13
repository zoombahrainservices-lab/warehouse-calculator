-- Add section column to warehouse_occupants table
-- Run this script in your Supabase SQL Editor

-- Add section column to warehouse_occupants table
ALTER TABLE warehouse_occupants 
ADD COLUMN IF NOT EXISTS section TEXT;

-- Update existing records to have a default section if needed
-- UPDATE warehouse_occupants 
-- SET section = 'General' 
-- WHERE section IS NULL OR section = '';

-- Verify the column was added
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'warehouse_occupants' 
  AND column_name = 'section';

-- Show sample data with the new column
SELECT 
  id,
  name,
  section,
  contact_info,
  space_occupied,
  status,
  created_at
FROM warehouse_occupants 
LIMIT 5;





