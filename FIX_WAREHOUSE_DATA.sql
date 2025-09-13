-- Fix Warehouse Data and Occupancy Information
-- This script ensures all warehouses have proper occupancy data and mezzanine information

-- 1. First, let's check current data
SELECT '=== CURRENT WAREHOUSE DATA ===' as info;
SELECT
    w.name as warehouse_name,
    w.id as warehouse_id,
    w.total_space,
    w.occupied_space,
    w.free_space,
    w.has_mezzanine,
    w.mezzanine_space,
    w.mezzanine_occupied,
    w.mezzanine_free
FROM warehouses w;

SELECT '=== CURRENT OCCUPANCY DATA ===' as info;
SELECT
    wo.name as occupant_name,
    wo.warehouse_id,
    wo.space_occupied,
    wo.floor_type,
    wo.status,
    wo.booking_status,
    w.name as warehouse_name
FROM warehouse_occupants wo
LEFT JOIN warehouses w ON wo.warehouse_id = w.id;

-- 2. Update existing warehouses to have mezzanine data
UPDATE warehouses
SET
    has_mezzanine = CASE
        WHEN id = 'wh-001' THEN true  -- Main warehouse has mezzanine
        WHEN id = 'wh-002' THEN false -- Annex doesn't have mezzanine
        WHEN id = 'wh-003' THEN false -- Cold storage doesn't have mezzanine
        ELSE false
    END,
    mezzanine_space = CASE
        WHEN id = 'wh-001' THEN 3000  -- 3000 m² mezzanine for main warehouse
        ELSE 0
    END,
    mezzanine_occupied = 0
WHERE has_mezzanine IS NULL OR mezzanine_space IS NULL;

-- 3. Update existing occupants to have proper floor_type
UPDATE warehouse_occupants
SET floor_type = CASE
    WHEN warehouse_id = 'wh-001' AND id IN ('occ-001', 'occ-002') THEN 'Ground Floor'
    WHEN warehouse_id = 'wh-001' AND id = 'occ-005' THEN 'Mezzanine'  -- We'll add this
    WHEN warehouse_id = 'wh-002' AND id = 'occ-003' THEN 'Ground Floor'
    WHEN warehouse_id = 'wh-003' AND id = 'occ-004' THEN 'Ground Floor'
    ELSE 'Ground Floor'
END
WHERE floor_type IS NULL OR floor_type = '';

-- 4. Add a mezzanine occupant to the main warehouse to show mezzanine occupancy
INSERT INTO warehouse_occupants (
    id, warehouse_id, name, contact_info, space_occupied,
    entry_date, expected_exit_date, status, floor_type,
    booking_id, booking_status, notes
) VALUES (
    'occ-005', 'wh-001', 'JKL Manufacturing', 'jkl@email.com | +973 5678 9012', 800,
    '2025-02-15', '2025-08-15', 'active', 'Mezzanine',
    'booking-mezz-001', 'active', 'Mezzanine storage for manufacturing equipment'
) ON CONFLICT (id) DO NOTHING;

-- 5. Update the warehouse occupied_space based on current occupants
-- First, reset occupied_space to 0
UPDATE warehouses SET occupied_space = 0, mezzanine_occupied = 0;

-- Then recalculate ground floor occupancy
UPDATE warehouses
SET occupied_space = COALESCE((
    SELECT SUM(wo.space_occupied)
    FROM warehouse_occupants wo
    WHERE wo.warehouse_id = warehouses.id
    AND wo.floor_type = 'Ground Floor'
    AND wo.status = 'active'
), 0);

-- Then recalculate mezzanine occupancy
UPDATE warehouses
SET mezzanine_occupied = COALESCE((
    SELECT SUM(wo.space_occupied)
    FROM warehouse_occupants wo
    WHERE wo.warehouse_id = warehouses.id
    AND wo.floor_type = 'Mezzanine'
    AND wo.status = 'active'
), 0);

-- 6. Add user_id to existing occupants (for testing)
UPDATE warehouse_occupants
SET user_id = (
    SELECT id FROM users
    WHERE email LIKE '%admin%'
    LIMIT 1
)
WHERE user_id IS NULL;

-- 7. Verify the updated data
SELECT '=== UPDATED WAREHOUSE DATA ===' as info;
SELECT
    w.name as warehouse_name,
    w.total_space as ground_total,
    w.occupied_space as ground_occupied,
    w.free_space as ground_free,
    ROUND((w.occupied_space::numeric / NULLIF(w.total_space, 0)) * 100, 1) as ground_utilization,
    w.has_mezzanine,
    w.mezzanine_space as mezz_total,
    w.mezzanine_occupied as mezz_occupied,
    w.mezzanine_free as mezz_free,
    ROUND((w.mezzanine_occupied::numeric / NULLIF(w.mezzanine_space, 0)) * 100, 1) as mezz_utilization
FROM warehouses w
ORDER BY w.name;

SELECT '=== UPDATED OCCUPANCY DATA ===' as info;
SELECT
    wo.name as occupant_name,
    w.name as warehouse_name,
    wo.space_occupied as space_m2,
    wo.floor_type,
    wo.status,
    wo.booking_status
FROM warehouse_occupants wo
LEFT JOIN warehouses w ON wo.warehouse_id = w.id
ORDER BY w.name, wo.floor_type, wo.name;

-- 8. Test the availability calculation function
SELECT '=== TESTING AVAILABILITY CALCULATION ===' as info;

-- Test each warehouse
SELECT 'Ground Floor - wh-001:' as test;
SELECT * FROM calculate_warehouse_availability_for_user('wh-001', 'Ground Floor');

SELECT 'Mezzanine - wh-001:' as test;
SELECT * FROM calculate_warehouse_availability_for_user('wh-001', 'Mezzanine');

SELECT 'Ground Floor - wh-002:' as test;
SELECT * FROM calculate_warehouse_availability_for_user('wh-002', 'Ground Floor');

SELECT 'Ground Floor - wh-003:' as test;
SELECT * FROM calculate_warehouse_availability_for_user('wh-003', 'Ground Floor');

-- 9. Summary
SELECT '=== SUMMARY ===' as info;
SELECT
    COUNT(*) as total_warehouses,
    SUM(total_space) as total_ground_space,
    SUM(occupied_space) as total_ground_occupied,
    SUM(mezzanine_space) as total_mezzanine_space,
    SUM(mezzanine_occupied) as total_mezzanine_occupied,
    SUM(total_space + mezzanine_space) as total_all_space,
    SUM(occupied_space + mezzanine_occupied) as total_all_occupied
FROM warehouses;

SELECT '✅ Warehouse data fix completed successfully!' as status;
