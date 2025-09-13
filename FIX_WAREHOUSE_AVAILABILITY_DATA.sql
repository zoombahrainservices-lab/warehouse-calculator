-- Fix Warehouse Availability Data
-- This script ensures warehouse occupancy data is accurate and up-to-date

-- Step 1: Check current warehouse data
SELECT '=== CURRENT WAREHOUSE DATA ===' as status;
SELECT
    w.id,
    w.name,
    w.total_space,
    w.occupied_space,
    w.free_space,
    w.has_mezzanine,
    w.mezzanine_space,
    w.mezzanine_occupied,
    w.mezzanine_free
FROM warehouses w
ORDER BY w.name;

-- Step 2: Check current occupants data
SELECT '=== CURRENT OCCUPANTS DATA ===' as status;
SELECT
    wo.id,
    wo.warehouse_id,
    w.name as warehouse_name,
    wo.space_occupied,
    wo.floor_type,
    wo.status,
    wo.booking_status
FROM warehouse_occupants wo
LEFT JOIN warehouses w ON wo.warehouse_id = w.id
ORDER BY wo.warehouse_id, wo.floor_type;

-- Step 3: Calculate accurate occupancy for each warehouse
SELECT '=== CALCULATING ACCURATE OCCUPANCY ===' as status;

-- Calculate ground floor occupancy
SELECT
    wo.warehouse_id,
    w.name,
    COUNT(*) as occupant_count,
    SUM(wo.space_occupied) as total_occupied_ground,
    w.total_space as total_ground_space,
    (w.total_space - COALESCE(SUM(wo.space_occupied), 0)) as available_ground
FROM warehouse_occupants wo
LEFT JOIN warehouses w ON wo.warehouse_id = w.id
WHERE wo.floor_type = 'Ground Floor'
AND wo.status = 'active'
AND wo.booking_status = 'active'
GROUP BY wo.warehouse_id, w.name, w.total_space
ORDER BY w.name;

-- Calculate mezzanine occupancy
SELECT
    wo.warehouse_id,
    w.name,
    COUNT(*) as occupant_count,
    SUM(wo.space_occupied) as total_occupied_mezzanine,
    w.mezzanine_space as total_mezzanine_space,
    (w.mezzanine_space - COALESCE(SUM(wo.space_occupied), 0)) as available_mezzanine
FROM warehouse_occupants wo
LEFT JOIN warehouses w ON wo.warehouse_id = w.id
WHERE wo.floor_type = 'Mezzanine'
AND wo.status = 'active'
AND wo.booking_status = 'active'
GROUP BY wo.warehouse_id, w.name, w.mezzanine_space
ORDER BY w.name;

-- Step 4: Update warehouse occupancy with accurate data
UPDATE warehouses
SET occupied_space = COALESCE((
    SELECT SUM(wo.space_occupied)
    FROM warehouse_occupants wo
    WHERE wo.warehouse_id = warehouses.id
    AND wo.floor_type = 'Ground Floor'
    AND wo.status = 'active'
    AND wo.booking_status = 'active'
), 0);

UPDATE warehouses
SET mezzanine_occupied = COALESCE((
    SELECT SUM(wo.space_occupied)
    FROM warehouse_occupants wo
    WHERE wo.warehouse_id = warehouses.id
    AND wo.floor_type = 'Mezzanine'
    AND wo.status = 'active'
    AND wo.booking_status = 'active'
), 0);

-- Step 5: Verify the updates
SELECT '=== UPDATED WAREHOUSE DATA ===' as status;
SELECT
    w.id,
    w.name,
    w.total_space as ground_total,
    w.occupied_space as ground_occupied,
    (w.total_space - w.occupied_space) as ground_available,
    CASE WHEN w.total_space > 0 THEN ROUND((w.occupied_space::numeric / w.total_space) * 100, 1) ELSE 0 END as ground_utilization,
    w.has_mezzanine,
    w.mezzanine_space as mezz_total,
    w.mezzanine_occupied as mezz_occupied,
    CASE WHEN w.mezzanine_space > 0 THEN ROUND((w.mezzanine_occupied::numeric / w.mezzanine_space) * 100, 1) ELSE 0 END as mezz_utilization,
    (w.total_space + COALESCE(w.mezzanine_space, 0)) as total_space_all,
    (w.occupied_space + w.mezzanine_occupied) as total_occupied_all,
    CASE WHEN (w.total_space + COALESCE(w.mezzanine_space, 0)) > 0
         THEN ROUND(((w.occupied_space + w.mezzanine_occupied)::numeric / (w.total_space + COALESCE(w.mezzanine_space, 0))) * 100, 1)
         ELSE 0 END as total_utilization
FROM warehouses w
ORDER BY w.name;

-- Step 6: Test the availability function with updated data
SELECT '=== TESTING AVAILABILITY FUNCTION ===' as status;

-- Test ground floor for first warehouse
SELECT 'Ground Floor Test:' as test;
SELECT * FROM calculate_warehouse_availability_for_user(
    (SELECT id FROM warehouses ORDER BY name LIMIT 1),
    'Ground Floor'
);

-- Test mezzanine for first warehouse that has mezzanine
SELECT 'Mezzanine Test:' as test;
SELECT * FROM calculate_warehouse_availability_for_user(
    (SELECT id FROM warehouses WHERE has_mezzanine = true ORDER BY name LIMIT 1),
    'Mezzanine'
);

-- Step 7: Create a summary report
SELECT '=== FINAL SUMMARY ===' as status;
SELECT
    COUNT(*) as total_warehouses,
    SUM(total_space) as total_ground_space,
    SUM(occupied_space) as total_ground_occupied,
    SUM(mezzanine_space) as total_mezzanine_space,
    SUM(mezzanine_occupied) as total_mezzanine_occupied,
    SUM(total_space + COALESCE(mezzanine_space, 0)) as total_all_space,
    SUM(occupied_space + mezzanine_occupied) as total_all_occupied,
    ROUND(AVG(
        CASE WHEN (total_space + COALESCE(mezzanine_space, 0)) > 0
             THEN ((occupied_space + mezzanine_occupied)::numeric / (total_space + COALESCE(mezzanine_space, 0))) * 100
             ELSE 0 END
    ), 1) as avg_utilization
FROM warehouses;

SELECT '✅ Warehouse availability data has been fixed and updated!' as result;
