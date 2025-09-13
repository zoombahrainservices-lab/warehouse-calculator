-- Quick Fix for Warehouse Availability Function
-- Run this SQL in Supabase SQL Editor

-- Create the function that the booking system needs
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
    -- Simple calculation based on space type
    IF space_type_param = 'Ground Floor' THEN
        -- Get ground floor data
        SELECT COALESCE(w.total_space, 0), COALESCE(w.occupied_space, 0)
        INTO total_val, occupied_val
        FROM warehouses w
        WHERE w.id = warehouse_uuid;
    ELSE
        -- Get mezzanine data
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
        CASE WHEN total_val > 0 THEN (occupied_val / total_val) * 100 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Test the function
SELECT 'Function created! Testing...' as status;
SELECT * FROM calculate_warehouse_availability_for_user('7ca93974-45cd-4497-9286-e7f7a60a9e0f', 'Ground Floor');
