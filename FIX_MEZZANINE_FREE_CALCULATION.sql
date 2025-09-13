-- Fix mezzanine_free calculation by making it a GENERATED ALWAYS column
-- Run this script in your Supabase SQL Editor

-- First, check the current state of the mezzanine_free column
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default,
  generation_expression
FROM information_schema.columns 
WHERE table_name = 'warehouses' 
  AND column_name = 'mezzanine_free';

-- Drop the existing mezzanine_free column if it's not a generated column
-- This will remove any existing data in that column
ALTER TABLE warehouses DROP COLUMN IF EXISTS mezzanine_free;

-- Add mezzanine_free as a GENERATED ALWAYS column
-- This will automatically calculate mezzanine_space - mezzanine_occupied
ALTER TABLE warehouses 
ADD COLUMN mezzanine_free NUMERIC GENERATED ALWAYS AS (mezzanine_space - mezzanine_occupied) STORED;

-- Verify the column was added correctly as a generated column
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default,
  generation_expression
FROM information_schema.columns 
WHERE table_name = 'warehouses' 
  AND column_name = 'mezzanine_free';

-- Show sample data to confirm the calculation is working
SELECT 
  id,
  name,
  mezzanine_space,
  mezzanine_occupied,
  mezzanine_free
FROM warehouses 
WHERE has_mezzanine = true
LIMIT 5;

-- Update any existing warehouses to ensure mezzanine_occupied is 0 if not set
UPDATE warehouses 
SET mezzanine_occupied = 0 
WHERE has_mezzanine = true AND mezzanine_occupied IS NULL;

-- Show final verification
SELECT 
  id,
  name,
  has_mezzanine,
  mezzanine_space,
  mezzanine_occupied,
  mezzanine_free,
  CASE 
    WHEN has_mezzanine = true THEN 
      'Mezzanine: ' || mezzanine_space || 'm² total, ' || 
      mezzanine_occupied || 'm² occupied, ' || 
      mezzanine_free || 'm² free'
    ELSE 'No mezzanine'
  END as mezzanine_summary
FROM warehouses 
ORDER BY has_mezzanine DESC, name;





