-- Check warehouse_occupants table floor_type constraint
-- This will help us understand what values are accepted

-- First, let's see the table structure
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_name = 'warehouse_occupants'
    AND column_name = 'floor_type';

-- Check if there's a constraint on floor_type
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM
    information_schema.table_constraints tc
JOIN
    information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE
    tc.table_name = 'warehouse_occupants'
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%floor_type%';

-- Try to find existing floor_type values in the table
SELECT DISTINCT floor_type
FROM warehouse_occupants
WHERE floor_type IS NOT NULL
ORDER BY floor_type;

-- Test different floor_type values to see which ones work
-- (Run these one by one in Supabase SQL Editor)

-- Test 1: 'ground'
-- INSERT INTO warehouse_occupants (id, warehouse_id, name, space_occupied, floor_type, entry_date, status)
-- VALUES (gen_random_uuid(), 'warehouse-id-here', 'Test Ground', 100, 'ground', NOW(), 'active');

-- Test 2: 'mezzanine'
-- INSERT INTO warehouse_occupants (id, warehouse_id, name, space_occupied, floor_type, entry_date, status)
-- VALUES (gen_random_uuid(), 'warehouse-id-here', 'Test Mezzanine', 100, 'mezzanine', NOW(), 'active');

-- Test 3: 'Ground Floor' (should fail)
-- INSERT INTO warehouse_occupants (id, warehouse_id, name, space_occupied, floor_type, entry_date, status)
-- VALUES (gen_random_uuid(), 'warehouse-id-here', 'Test Ground Floor', 100, 'Ground Floor', NOW(), 'active');

-- Test 4: 'Mezzanine' (should fail)
-- INSERT INTO warehouse_occupants (id, warehouse_id, name, space_occupied, floor_type, entry_date, status)
-- VALUES (gen_random_uuid(), 'warehouse-id-here', 'Test Mezzanine Capital', 100, 'Mezzanine', NOW(), 'active');

-- Clean up test records (run after testing)
-- DELETE FROM warehouse_occupants WHERE name LIKE 'Test%';
