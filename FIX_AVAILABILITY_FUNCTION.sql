-- Fix Warehouse Availability Function
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Drop the function if it exists (to ensure clean recreation)
DROP FUNCTION IF EXISTS calculate_warehouse_availability_for_user(TEXT, TEXT);

-- Step 2: Create the function with proper error handling
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
    -- Validate inputs
    IF warehouse_uuid IS NULL OR warehouse_uuid = '' THEN
        RAISE EXCEPTION 'Warehouse UUID cannot be null or empty';
    END IF;

    IF space_type_param NOT IN ('Ground Floor', 'Mezzanine') THEN
        RAISE EXCEPTION 'Invalid space type: %. Must be Ground Floor or Mezzanine', space_type_param;
    END IF;

    -- Get total space based on space type
    IF space_type_param = 'Ground Floor' THEN
        SELECT COALESCE(w.total_space, 0) INTO total
        FROM warehouses w
        WHERE w.id = warehouse_uuid;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Warehouse not found: %', warehouse_uuid;
        END IF;

        SELECT COALESCE(SUM(wo.space_occupied), 0) INTO occupied
        FROM warehouse_occupants wo
        WHERE wo.warehouse_id = warehouse_uuid
        AND wo.floor_type = 'Ground Floor'
        AND wo.status = 'active'
        AND wo.booking_status = 'active';

    ELSE -- Mezzanine
        SELECT COALESCE(w.mezzanine_space, 0) INTO total
        FROM warehouses w
        WHERE w.id = warehouse_uuid;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Warehouse not found: %', warehouse_uuid;
        END IF;

        SELECT COALESCE(SUM(wo.space_occupied), 0) INTO occupied
        FROM warehouse_occupants wo
        WHERE wo.warehouse_id = warehouse_uuid
        AND wo.floor_type = 'Mezzanine'
        AND wo.status = 'active'
        AND wo.booking_status = 'active';
    END IF;

    -- Return availability data
    RETURN QUERY SELECT
        total,
        occupied,
        GREATEST(total - occupied, 0),
        CASE WHEN total > 0 THEN ROUND((occupied / total) * 100, 2) ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_warehouse_availability_for_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_warehouse_availability_for_user(TEXT, TEXT) TO anon;

-- Step 4: Test the function
SELECT '=== FUNCTION CREATION TEST ===' as test;

-- Test with sample data (adjust warehouse IDs as needed)
DO $$
DECLARE
    test_warehouse_id TEXT := 'wh-001';
    ground_result RECORD;
    mezzanine_result RECORD;
BEGIN
    -- Test ground floor
    SELECT * INTO ground_result
    FROM calculate_warehouse_availability_for_user(test_warehouse_id, 'Ground Floor');

    RAISE NOTICE 'Ground Floor Test Result: Total=%, Occupied=%, Available=%, Utilization=%',
        ground_result.total_space, ground_result.occupied_space,
        ground_result.available_space, ground_result.utilization_percentage;

    -- Test mezzanine
    SELECT * INTO mezzanine_result
    FROM calculate_warehouse_availability_for_user(test_warehouse_id, 'Mezzanine');

    RAISE NOTICE 'Mezzanine Test Result: Total=%, Occupied=%, Available=%, Utilization=%',
        mezzanine_result.total_space, mezzanine_result.occupied_space,
        mezzanine_result.available_space, mezzanine_result.utilization_percentage;

    RAISE NOTICE '✅ Function created and tested successfully!';
END $$;

-- Step 5: Show function details
SELECT
    'Function created successfully!' as status,
    proname as function_name,
    pg_get_function_identity_arguments(oid) as parameters,
    obj_description(oid, 'pg_proc') as description
FROM pg_proc
WHERE proname = 'calculate_warehouse_availability_for_user';
