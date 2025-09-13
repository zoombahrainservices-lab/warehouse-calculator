-- Add mezzanine floor columns to warehouses and warehouse_occupants tables
-- Run this script in your Supabase SQL Editor

-- Add mezzanine columns to warehouses table
ALTER TABLE warehouses 
ADD COLUMN IF NOT EXISTS has_mezzanine BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mezzanine_space NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS mezzanine_occupied NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS mezzanine_free NUMERIC DEFAULT 0;

-- Add floor_type column to warehouse_occupants table
ALTER TABLE warehouse_occupants 
ADD COLUMN IF NOT EXISTS floor_type TEXT DEFAULT 'ground' CHECK (floor_type IN ('ground', 'mezzanine'));

-- Update existing warehouses to have mezzanine_free = total_space if not set
UPDATE warehouses 
SET mezzanine_free = mezzanine_space 
WHERE mezzanine_free = 0 AND mezzanine_space > 0;

-- Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'warehouses' 
  AND column_name IN ('has_mezzanine', 'mezzanine_space', 'mezzanine_occupied', 'mezzanine_free');

SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_name = 'warehouse_occupants' 
  AND column_name = 'floor_type';

-- Show sample data with the new columns
SELECT 
  id,
  name,
  has_mezzanine,
  mezzanine_space,
  mezzanine_occupied,
  mezzanine_free,
  total_space,
  occupied_space,
  free_space
FROM warehouses 
LIMIT 5;

SELECT 
  id,
  name,
  floor_type,
  section,
  space_occupied,
  status
FROM warehouse_occupants 
LIMIT 5;





