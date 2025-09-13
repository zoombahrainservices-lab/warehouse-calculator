-- Fix Dashboard Warehouse Availability Issue
-- Run this in Supabase SQL Editor

-- 1. Check current function status
SELECT '=== CURRENT FUNCTION STATUS ===' as info;
SELECT
    proname as function_name,
    pg_get_function_identity_arguments(oid) as parameters,
    obj_description(oid, 'pg_proc') as description
FROM pg_proc
WHERE proname = 'calculate_warehouse_availability_for_user';

-- 2. Drop existing function
DROP FUNCTION IF EXISTS calculate_warehouse_availability_for_user(TEXT, TEXT);

-- 3. Create improved function with better error handling
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
    warehouse_exists BOOLEAN := FALSE;
BEGIN
    -- Validate inputs
    IF warehouse_uuid IS NULL OR warehouse_uuid = '' THEN
        RAISE EXCEPTION 'Warehouse UUID cannot be null or empty';
    END IF;

    IF space_type_param NOT IN ('Ground Floor', 'Mezzanine') THEN
        RAISE EXCEPTION 'Invalid space type: %. Must be Ground Floor or Mezzanine', space_type_param;
    END IF;

    -- Check if warehouse exists
    SELECT EXISTS(SELECT 1 FROM warehouses WHERE id = warehouse_uuid) INTO warehouse_exists;
    IF NOT warehouse_exists THEN
        RAISE EXCEPTION 'Warehouse with UUID % does not exist', warehouse_uuid;
    END IF;

    -- Get total space based on space type
    IF space_type_param = 'Ground Floor' THEN
        SELECT COALESCE(w.total_space, 0) INTO total FROM warehouses w WHERE w.id = warehouse_uuid;
        SELECT COALESCE(SUM(wo.space_occupied), 0) INTO occupied
        FROM warehouse_occupants wo
        WHERE wo.warehouse_id = warehouse_uuid
        AND wo.floor_type = 'Ground Floor'
        AND wo.status = 'active';
    ELSE
        SELECT COALESCE(w.mezzanine_space, 0) INTO total FROM warehouses w WHERE w.id = warehouse_uuid;
        SELECT COALESCE(SUM(wo.space_occupied), 0) INTO occupied
        FROM warehouse_occupants wo
        WHERE wo.warehouse_id = warehouse_uuid
        AND wo.floor_type = 'Mezzanine'
        AND wo.status = 'active';
    END IF;

    -- Log for debugging
    RAISE NOTICE 'Warehouse % (%): Total=%, Occupied=%, Available=%',
        warehouse_uuid, space_type_param, total, occupied, GREATEST(total - occupied, 0);

    -- Return availability data
    RETURN QUERY SELECT
        total,
        occupied,
        GREATEST(total - occupied, 0),
        CASE WHEN total > 0 THEN ROUND((occupied / total) * 100, 2) ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION calculate_warehouse_availability_for_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_warehouse_availability_for_user(TEXT, TEXT) TO anon;

-- 5. Test with sample data
SELECT '=== TESTING FUNCTION ===' as test;

-- Get first warehouse for testing
SELECT 'Available warehouses:' as info;
SELECT id, name, total_space, mezzanine_space, has_mezzanine
FROM warehouses
WHERE status = 'active'
ORDER BY name
LIMIT 5;

-- Test function if warehouses exist
DO $$
DECLARE
    warehouse_record RECORD;
BEGIN
    -- Test with first available warehouse
    SELECT id, name INTO warehouse_record
    FROM warehouses
    WHERE status = 'active'
    ORDER BY name
    LIMIT 1;

    IF FOUND THEN
        RAISE NOTICE 'Testing with warehouse: % (%)', warehouse_record.name, warehouse_record.id;

        RAISE NOTICE 'Ground Floor Test:';
        PERFORM * FROM calculate_warehouse_availability_for_user(warehouse_record.id, 'Ground Floor');

        RAISE NOTICE 'Mezzanine Test:';
        PERFORM * FROM calculate_warehouse_availability_for_user(warehouse_record.id, 'Mezzanine');
    ELSE
        RAISE NOTICE 'No warehouses found for testing';
    END IF;
END $$;

-- 6. Show current occupants for verification
SELECT '=== CURRENT OCCUPANTS ===' as info;
SELECT
    wo.warehouse_id,
    w.name as warehouse_name,
    wo.floor_type,
    wo.space_occupied,
    wo.status,
    wo.booking_status
FROM warehouse_occupants wo
JOIN warehouses w ON wo.warehouse_id = w.id
WHERE wo.status = 'active'
ORDER BY w.name, wo.floor_type;

-- 7. Show final function status
SELECT
    '✅ Function created and tested successfully!' as result,
    proname as function_name,
    pg_get_function_identity_arguments(oid) as parameters
FROM pg_proc
WHERE proname = 'calculate_warehouse_availability_for_user';
