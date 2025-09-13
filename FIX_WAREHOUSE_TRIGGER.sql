-- Fix warehouse trigger function to handle mezzanine floors
-- Run this script in your Supabase SQL Editor

-- First, let's see the current trigger function
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'update_warehouse_occupied_space';

-- Drop the existing trigger function and recreate it
DROP FUNCTION IF EXISTS update_warehouse_occupied_space() CASCADE;

-- Create the updated trigger function that handles both ground and mezzanine floors
CREATE OR REPLACE FUNCTION update_warehouse_occupied_space()
RETURNS TRIGGER AS $$
BEGIN
  -- Update ground floor occupied space
  UPDATE warehouses 
  SET occupied_space = (
    SELECT COALESCE(SUM(space_occupied), 0)
    FROM warehouse_occupants 
    WHERE warehouse_id = COALESCE(NEW.warehouse_id, OLD.warehouse_id)
      AND floor_type = 'ground'
      AND status = 'active'
  )
  WHERE id = COALESCE(NEW.warehouse_id, OLD.warehouse_id);
  
  -- Update mezzanine occupied space
  UPDATE warehouses 
  SET mezzanine_occupied = (
    SELECT COALESCE(SUM(space_occupied), 0)
    FROM warehouse_occupants 
    WHERE warehouse_id = COALESCE(NEW.warehouse_id, OLD.warehouse_id)
      AND floor_type = 'mezzanine'
      AND status = 'active'
  )
  WHERE id = COALESCE(NEW.warehouse_id, OLD.warehouse_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for warehouse_occupants table
DROP TRIGGER IF EXISTS update_warehouse_occupied_space_insert ON warehouse_occupants;
DROP TRIGGER IF EXISTS update_warehouse_occupied_space_update ON warehouse_occupants;
DROP TRIGGER IF EXISTS update_warehouse_occupied_space_delete ON warehouse_occupants;

CREATE TRIGGER update_warehouse_occupied_space_insert
  AFTER INSERT ON warehouse_occupants
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_occupied_space();

CREATE TRIGGER update_warehouse_occupied_space_update
  AFTER UPDATE ON warehouse_occupants
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_occupied_space();

CREATE TRIGGER update_warehouse_occupied_space_delete
  AFTER DELETE ON warehouse_occupants
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_occupied_space();

-- Verify the function was created
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'update_warehouse_occupied_space';

-- Show current triggers
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'warehouse_occupants'
  AND trigger_name LIKE '%update_warehouse_occupied_space%';

-- Test the function by recalculating all warehouse occupied spaces
UPDATE warehouses 
SET 
  occupied_space = (
    SELECT COALESCE(SUM(space_occupied), 0)
    FROM warehouse_occupants 
    WHERE warehouse_id = warehouses.id
      AND floor_type = 'ground'
      AND status = 'active'
  ),
  mezzanine_occupied = (
    SELECT COALESCE(SUM(space_occupied), 0)
    FROM warehouse_occupants 
    WHERE warehouse_id = warehouses.id
      AND floor_type = 'mezzanine'
      AND status = 'active'
  );

-- Show the results
SELECT 
  id,
  name,
  has_mezzanine,
  total_space,
  occupied_space,
  free_space,
  mezzanine_space,
  mezzanine_occupied,
  mezzanine_free
FROM warehouses 
ORDER BY name;

