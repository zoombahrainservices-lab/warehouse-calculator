-- Fix Warehouse Availability Calculation Function
-- This fixes the issue where the function was looking for incorrect floor_type values

-- Drop and recreate the function with correct floor_type values
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
    total DECIMAL := 0;
    occupied DECIMAL := 0;
BEGIN
    -- Get total space based on space type
    IF space_type_param = 'Ground Floor' THEN
        SELECT w.total_space INTO total FROM warehouses w WHERE w.id = warehouse_uuid;
        SELECT COALESCE(SUM(wo.space_occupied), 0) INTO occupied
        FROM warehouse_occupants wo
        WHERE wo.warehouse_id = warehouse_uuid
        AND wo.floor_type = 'Ground Floor'
        AND wo.status = 'active';
    ELSE
        SELECT w.mezzanine_space INTO total FROM warehouses w WHERE w.id = warehouse_uuid;
        SELECT COALESCE(SUM(wo.space_occupied), 0) INTO occupied
        FROM warehouse_occupants wo
        WHERE wo.warehouse_id = warehouse_uuid
        AND wo.floor_type = 'Mezzanine'
        AND wo.status = 'active';
    END IF;

    -- Return availability data
    RETURN QUERY SELECT
        total,
        occupied,
        GREATEST(total - occupied, 0),
        CASE WHEN total > 0 THEN (occupied / total) * 100 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Test the function to make sure it works
SELECT 'Testing warehouse availability function...' as status;

-- Test with a warehouse (assuming wh-001 exists)
SELECT
    'Ground Floor availability test:' as test,
    * FROM calculate_warehouse_availability_for_user('wh-001', 'Ground Floor');

-- Test mezzanine if warehouse has one
SELECT
    'Mezzanine availability test:' as test,
    * FROM calculate_warehouse_availability_for_user('wh-001', 'Mezzanine');

-- Show current warehouse status
SELECT
    w.name as "Warehouse",
    w.total_space as "Total Ground (m²)",
    w.occupied_space as "Occupied Ground (m²)",
    w.free_space as "Free Ground (m²)",
    w.has_mezzanine,
    w.mezzanine_space as "Total Mezzanine (m²)",
    w.mezzanine_occupied as "Occupied Mezzanine (m²)",
    w.mezzanine_free as "Free Mezzanine (m²)"
FROM warehouses w
ORDER BY w.name;
