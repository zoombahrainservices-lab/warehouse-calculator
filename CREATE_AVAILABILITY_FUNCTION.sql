-- Create the missing calculate_warehouse_availability_for_user function
-- This function calculates warehouse availability for users

DROP FUNCTION IF EXISTS calculate_warehouse_availability_for_user(TEXT, TEXT);

CREATE OR REPLACE FUNCTION calculate_warehouse_availability_for_user(
    warehouse_uuid TEXT,
    space_type_param TEXT
)
RETURNS TABLE (
    total_space NUMERIC,
    occupied_space NUMERIC,
    available_space NUMERIC,
    utilization_percentage NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    warehouse_record RECORD;
    total_space_val NUMERIC := 0;
    occupied_space_val NUMERIC := 0;
    available_space_val NUMERIC := 0;
    utilization_val NUMERIC := 0;
BEGIN
    -- Get warehouse details
    SELECT * INTO warehouse_record
    FROM warehouses
    WHERE id = warehouse_uuid::UUID;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Warehouse not found: %', warehouse_uuid;
    END IF;
    
    -- Set total space based on space type
    IF space_type_param = 'Ground Floor' THEN
        total_space_val := COALESCE(warehouse_record.total_space, 0);
    ELSIF space_type_param = 'Mezzanine' THEN
        total_space_val := COALESCE(warehouse_record.mezzanine_space, 0);
    ELSE
        RAISE EXCEPTION 'Invalid space type: %. Must be "Ground Floor" or "Mezzanine"', space_type_param;
    END IF;
    
    -- Calculate occupied space
    SELECT COALESCE(SUM(space_occupied), 0) INTO occupied_space_val
    FROM warehouse_occupants
    WHERE warehouse_id = warehouse_uuid::UUID
      AND floor_type = CASE 
          WHEN space_type_param = 'Ground Floor' THEN 'ground'
          WHEN space_type_param = 'Mezzanine' THEN 'mezzanine'
      END
      AND status = 'active';
    
    -- Calculate available space and utilization
    available_space_val := GREATEST(total_space_val - occupied_space_val, 0);
    utilization_val := CASE 
        WHEN total_space_val > 0 THEN (occupied_space_val / total_space_val) * 100
        ELSE 0
    END;
    
    -- Return results
    RETURN QUERY SELECT 
        total_space_val,
        occupied_space_val,
        available_space_val,
        ROUND(utilization_val, 2);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_warehouse_availability_for_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_warehouse_availability_for_user(TEXT, TEXT) TO anon;

-- Test the function
SELECT 'Function created successfully' as status;

-- Verify the function exists
SELECT 
    proname as function_name,
    proargtypes::regtype[] as parameter_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'calculate_warehouse_availability_for_user';
