-- CHECK PRICING TYPE CONSTRAINT
-- This will help us understand what values are allowed for pricing_type

SELECT '=== CHECKING PRICING TYPE CONSTRAINT ===' as info;

-- 1. Check the constraint definition
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'optional_services'::regclass 
  AND conname = 'optional_services_pricing_type_check';

-- 2. Check if table exists and show its structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'optional_services' 
  AND column_name = 'pricing_type';

-- 3. Try to see what values are currently in the table
SELECT DISTINCT pricing_type FROM optional_services WHERE pricing_type IS NOT NULL;

-- 4. Check if there are any existing records
SELECT COUNT(*) as total_records FROM optional_services;

-- 5. Show all columns in the table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'optional_services' 
ORDER BY ordinal_position;





