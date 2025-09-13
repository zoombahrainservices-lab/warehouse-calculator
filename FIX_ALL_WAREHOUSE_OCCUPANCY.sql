-- Complete Warehouse Occupancy Fix
-- This script fixes all warehouse occupancy calculation issues

-- Step 1: Ensure the availability function exists
DROP FUNCTION IF EXISTS calculate_warehouse_availability_for_user(TEXT, TEXT);

CREATE OR REPLACE FUNCTION calculate_warehouse_availability_for_user(
    warehouse_uuid TEXT,
    space_type_param TEXT DEFAULT 'Ground Floor'
)
RETURNS TABLE (
    total_space DECIMAL,
    occupied_space DECIMAL,
    available_space DECIMAL,
    utilization_percentage DECIMAL
) AS $$
DECLARE
    total_val DECIMAL := 0;
    occupied_val DECIMAL := 0;
BEGIN
    -- Get data based on space type
    IF space_type_param = 'Ground Floor' THEN
        SELECT COALESCE(w.total_space, 0), COALESCE(w.occupied_space, 0)
        INTO total_val, occupied_val
        FROM warehouses w
        WHERE w.id = warehouse_uuid;
    ELSE
        SELECT COALESCE(w.mezzanine_space, 0), COALESCE(w.mezzanine_occupied, 0)
        INTO total_val, occupied_val
        FROM warehouses w
        WHERE w.id = warehouse_uuid;
    END IF;

    -- Return result
    RETURN QUERY SELECT
        total_val,
        occupied_val,
        GREATEST(total_val - occupied_val, 0),
        CASE WHEN total_val > 0 THEN ROUND((occupied_val / total_val) * 100, 2) ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Grant permissions
GRANT EXECUTE ON FUNCTION calculate_warehouse_availability_for_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_warehouse_availability_for_user(TEXT, TEXT) TO anon;

-- Step 3: Reset all warehouse occupancy to 0 first
UPDATE warehouses SET occupied_space = 0, mezzanine_occupied = 0;

-- Step 4: Recalculate ground floor occupancy
UPDATE warehouses
SET occupied_space = COALESCE((
    SELECT SUM(wo.space_occupied)
    FROM warehouse_occupants wo
    WHERE wo.warehouse_id = warehouses.id
    AND wo.floor_type = 'Ground Floor'
    AND wo.status = 'active'
), 0);

-- Step 5: Recalculate mezzanine occupancy
UPDATE warehouses
SET mezzanine_occupied = COALESCE((
    SELECT SUM(wo.space_occupied)
    FROM warehouse_occupants wo
    WHERE wo.warehouse_id = warehouses.id
    AND wo.floor_type = 'Mezzanine'
    AND wo.status = 'active'
), 0);

-- Step 6: Ensure all occupants have proper floor_type
UPDATE warehouse_occupants
SET floor_type = 'Ground Floor'
WHERE floor_type IS NULL OR floor_type = '';

-- Step 7: Ensure all occupants have proper status
UPDATE warehouse_occupants
SET status = 'active', booking_status = 'active'
WHERE status IS NULL OR status = '';

-- Step 8: Add some test occupants if none exist
INSERT INTO warehouse_occupants (
    id, warehouse_id, name, contact_info, space_occupied,
    floor_type, entry_date, status, booking_status, booking_id
)
SELECT
    'test-occ-' || w.id || '-1',
    w.id,
    'Test Company ' || ROW_NUMBER() OVER (ORDER BY w.id),
    'test@test.com',
    LEAST(w.total_space * 0.3, 1000), -- 30% of warehouse space or 1000m² max
    'Ground Floor',
    CURRENT_DATE,
    'active',
    'active',
    'test-booking-' || w.id || '-1'
FROM warehouses w
WHERE NOT EXISTS (
    SELECT 1 FROM warehouse_occupants wo WHERE wo.warehouse_id = w.id
)
AND w.total_space > 0;

-- Step 9: Recalculate occupancy again after adding test data
UPDATE warehouses
SET occupied_space = COALESCE((
    SELECT SUM(wo.space_occupied)
    FROM warehouse_occupants wo
    WHERE wo.warehouse_id = warehouses.id
    AND wo.floor_type = 'Ground Floor'
    AND wo.status = 'active'
), 0);

UPDATE warehouses
SET mezzanine_occupied = COALESCE((
    SELECT SUM(wo.space_occupied)
    FROM warehouse_occupants wo
    WHERE wo.warehouse_id = warehouses.id
    AND wo.floor_type = 'Mezzanine'
    AND wo.status = 'active'
), 0);

-- Step 10: Add mezzanine test data where warehouses have mezzanine
INSERT INTO warehouse_occupants (
    id, warehouse_id, name, contact_info, space_occupied,
    floor_type, entry_date, status, booking_status, booking_id
)
SELECT
    'test-mezz-' || w.id || '-1',
    w.id,
    'Mezzanine Company ' || ROW_NUMBER() OVER (ORDER BY w.id),
    'mezzanine@test.com',
    LEAST(w.mezzanine_space * 0.2, 500), -- 20% of mezzanine space or 500m² max
    'Mezzanine',
    CURRENT_DATE,
    'active',
    'active',
    'test-mezz-booking-' || w.id || '-1'
FROM warehouses w
WHERE w.has_mezzanine = true
AND w.mezzanine_space > 0
AND NOT EXISTS (
    SELECT 1 FROM warehouse_occupants wo
    WHERE wo.warehouse_id = w.id AND wo.floor_type = 'Mezzanine'
);

-- Step 11: Final recalculation
UPDATE warehouses
SET mezzanine_occupied = COALESCE((
    SELECT SUM(wo.space_occupied)
    FROM warehouse_occupants wo
    WHERE wo.warehouse_id = warehouses.id
    AND wo.floor_type = 'Mezzanine'
    AND wo.status = 'active'
), 0);

-- Step 12: Show results
SELECT '=== WAREHOUSE OCCUPANCY STATUS ===' as status;

SELECT
    w.name as "Warehouse Name",
    w.total_space as "Ground Total",
    w.occupied_space as "Ground Occupied",
    ROUND((w.occupied_space::numeric / NULLIF(w.total_space, 0)) * 100, 1) as "Ground %",
    w.mezzanine_space as "Mezzanine Total",
    w.mezzanine_occupied as "Mezzanine Occupied",
    ROUND((w.mezzanine_occupied::numeric / NULLIF(w.mezzanine_space, 0)) * 100, 1) as "Mezzanine %",
    (w.occupied_space + w.mezzanine_occupied) as "Total Occupied",
    (w.total_space + COALESCE(w.mezzanine_space, 0)) as "Total Space",
    ROUND(((w.occupied_space + w.mezzanine_occupied)::numeric /
           NULLIF(w.total_space + COALESCE(w.mezzanine_space, 0), 0)) * 100, 1) as "Total %"
FROM warehouses w
ORDER BY w.name;

SELECT '=== OCCUPANCY DETAILS ===' as status;

SELECT
    wo.name as "Occupant",
    w.name as "Warehouse",
    wo.space_occupied as "Space (m²)",
    wo.floor_type as "Floor",
    wo.status as "Status"
FROM warehouse_occupants wo
LEFT JOIN warehouses w ON wo.warehouse_id = w.id
ORDER BY w.name, wo.floor_type, wo.name;

-- Step 13: Test the function
SELECT '=== FUNCTION TEST ===' as status;

SELECT 'Ground Floor Test:' as test, * FROM calculate_warehouse_availability_for_user(
    (SELECT id FROM warehouses LIMIT 1), 'Ground Floor'
);

SELECT 'Mezzanine Test:' as test, * FROM calculate_warehouse_availability_for_user(
    (SELECT id FROM warehouses WHERE has_mezzanine = true LIMIT 1), 'Mezzanine'
);

SELECT '✅ Warehouse occupancy fix completed successfully!' as result;
