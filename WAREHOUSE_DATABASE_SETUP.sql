-- Warehouse Management Database Setup
-- Run this script in your Supabase SQL Editor

-- 1. Create warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,   
  total_space REAL NOT NULL,
  occupied_space REAL DEFAULT 0,
  free_space REAL GENERATED ALWAYS AS (total_space - occupied_space) STORED,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Create warehouse occupants table
CREATE TABLE IF NOT EXISTS warehouse_occupants (
  id TEXT PRIMARY KEY,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_info TEXT,
  space_occupied REAL NOT NULL,
  entry_date DATE NOT NULL,
  expected_exit_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'pending')),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_warehouses_status ON warehouses(status);
CREATE INDEX IF NOT EXISTS idx_warehouses_location ON warehouses(location);
CREATE INDEX IF NOT EXISTS idx_warehouse_occupants_warehouse_id ON warehouse_occupants(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_occupants_status ON warehouse_occupants(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_occupants_entry_date ON warehouse_occupants(entry_date);

-- 4. Create function to update warehouse occupied space
CREATE OR REPLACE FUNCTION update_warehouse_occupied_space()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE warehouses 
    SET occupied_space = occupied_space + NEW.space_occupied,
        updated_at = NOW()
    WHERE id = NEW.warehouse_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE warehouses 
    SET occupied_space = occupied_space - OLD.space_occupied + NEW.space_occupied,
        updated_at = NOW()
    WHERE id = NEW.warehouse_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE warehouses 
    SET occupied_space = occupied_space - OLD.space_occupied,
        updated_at = NOW()
    WHERE id = OLD.warehouse_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers to automatically update warehouse space
CREATE TRIGGER trigger_update_warehouse_space_insert
  AFTER INSERT ON warehouse_occupants
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_occupied_space();

CREATE TRIGGER trigger_update_warehouse_space_update
  AFTER UPDATE ON warehouse_occupants
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_occupied_space();

CREATE TRIGGER trigger_update_warehouse_space_delete
  AFTER DELETE ON warehouse_occupants
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_occupied_space();

-- 6. Insert sample warehouses
INSERT INTO warehouses (id, name, location, total_space, description) VALUES
  ('wh-001', 'Sitra Main Warehouse', 'Building No. 22, Road 401, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain', 8000, 'Main warehouse facility'),
  ('wh-002', 'Sitra Annex Warehouse', 'Building No. 25, Road 402, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain', 5000, 'Secondary warehouse facility'),
  ('wh-003', 'Sitra Cold Storage', 'Building No. 30, Road 405, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain', 3000, 'Temperature controlled storage');

-- 7. Insert sample occupants
INSERT INTO warehouse_occupants (id, warehouse_id, name, contact_info, space_occupied, entry_date, expected_exit_date, status) VALUES
  ('occ-001', 'wh-001', 'ABC Company', 'abc@email.com | +973 1234 5678', 1500, '2025-01-15', '2025-12-31', 'active'),
  ('occ-002', 'wh-001', 'XYZ Trading', 'xyz@email.com | +973 2345 6789', 2200, '2025-02-01', '2025-11-30', 'active'),
  ('occ-003', 'wh-002', 'DEF Logistics', 'def@email.com | +973 3456 7890', 1800, '2025-01-20', '2025-10-31', 'active'),
  ('occ-004', 'wh-003', 'GHI Foods', 'ghi@email.com | +973 4567 8901', 1200, '2025-03-01', '2025-09-30', 'active');

-- 8. Verify the setup
SELECT 
  'Warehouse Management Setup Complete' as status,
  COUNT(*) as total_warehouses,
  SUM(total_space) as total_warehouse_space,
  SUM(occupied_space) as total_occupied_space,
  SUM(free_space) as total_free_space
FROM warehouses;

-- 9. Show warehouse summary
SELECT 
  name as "Warehouse Name",
  location as "Location",
  total_space as "Total Space (m²)",
  occupied_space as "Occupied Space (m²)",
  free_space as "Free Space (m²)",
  ROUND(((occupied_space::numeric / total_space::numeric) * 100)::numeric, 1) as "Utilization %",
  (SELECT COUNT(*) FROM warehouse_occupants WHERE warehouse_id = warehouses.id AND status = 'active') as "Active Occupants"
FROM warehouses
ORDER BY name;
