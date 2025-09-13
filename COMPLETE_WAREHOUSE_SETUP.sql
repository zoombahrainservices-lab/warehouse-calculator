-- Complete Warehouse Management System Setup
-- This script creates all necessary tables and columns for the warehouse management system

-- Create warehouses table if it doesn't exist
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  total_space NUMERIC NOT NULL DEFAULT 0,
  occupied_space NUMERIC NOT NULL DEFAULT 0,
  free_space NUMERIC GENERATED ALWAYS AS (total_space - occupied_space) STORED,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  has_mezzanine BOOLEAN DEFAULT FALSE,
  mezzanine_space NUMERIC DEFAULT 0,
  mezzanine_occupied NUMERIC DEFAULT 0,
  mezzanine_free NUMERIC GENERATED ALWAYS AS (mezzanine_space - mezzanine_occupied) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create warehouse_occupants table if it doesn't exist
CREATE TABLE IF NOT EXISTS warehouse_occupants (
  id TEXT PRIMARY KEY,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_info TEXT,
  space_occupied NUMERIC NOT NULL DEFAULT 0,
  entry_date TEXT NOT NULL,
  expected_exit_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'pending')),
  notes TEXT,
  floor_type TEXT DEFAULT 'Ground Floor' CHECK (floor_type IN ('Ground Floor', 'Mezzanine')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add missing columns to warehouses table if they don't exist
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS has_mezzanine BOOLEAN DEFAULT FALSE;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS mezzanine_space NUMERIC DEFAULT 0;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS mezzanine_occupied NUMERIC DEFAULT 0;

-- Recreate mezzanine_free as generated column if it doesn't exist or is not generated
DO $$ 
BEGIN
  -- Drop existing mezzanine_free column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouses' AND column_name = 'mezzanine_free') THEN
    ALTER TABLE warehouses DROP COLUMN mezzanine_free;
  END IF;
  
  -- Add mezzanine_free as generated column
  ALTER TABLE warehouses ADD COLUMN mezzanine_free NUMERIC GENERATED ALWAYS AS (mezzanine_space - mezzanine_occupied) STORED;
EXCEPTION
  WHEN duplicate_column THEN
    -- Column already exists, do nothing
    NULL;
END $$;

-- Add missing columns to warehouse_occupants table if they don't exist
ALTER TABLE warehouse_occupants ADD COLUMN IF NOT EXISTS floor_type TEXT DEFAULT 'Ground Floor';
ALTER TABLE warehouse_occupants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add check constraints
ALTER TABLE warehouse_occupants DROP CONSTRAINT IF EXISTS valid_floor_type;
ALTER TABLE warehouse_occupants ADD CONSTRAINT valid_floor_type CHECK (floor_type IN ('Ground Floor', 'Mezzanine'));

-- Update existing records to have proper defaults
UPDATE warehouse_occupants SET floor_type = 'Ground Floor' WHERE floor_type IS NULL;
UPDATE warehouses SET has_mezzanine = FALSE WHERE has_mezzanine IS NULL;
UPDATE warehouses SET mezzanine_space = 0 WHERE mezzanine_space IS NULL;
UPDATE warehouses SET mezzanine_occupied = 0 WHERE mezzanine_occupied IS NULL;

-- Make important columns NOT NULL
ALTER TABLE warehouse_occupants ALTER COLUMN floor_type SET NOT NULL;
ALTER TABLE warehouses ALTER COLUMN has_mezzanine SET NOT NULL;
ALTER TABLE warehouses ALTER COLUMN mezzanine_space SET NOT NULL;
ALTER TABLE warehouses ALTER COLUMN mezzanine_occupied SET NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_warehouses_status ON warehouses(status);
CREATE INDEX IF NOT EXISTS idx_warehouses_has_mezzanine ON warehouses(has_mezzanine);
CREATE INDEX IF NOT EXISTS idx_warehouse_occupants_warehouse_id ON warehouse_occupants(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_occupants_status ON warehouse_occupants(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_occupants_floor_type ON warehouse_occupants(floor_type);

-- Create trigger function to update warehouse occupied space
CREATE OR REPLACE FUNCTION update_warehouse_occupied_space()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update warehouse space based on floor type
    IF NEW.floor_type = 'Mezzanine' THEN
      UPDATE warehouses 
      SET mezzanine_occupied = mezzanine_occupied + NEW.space_occupied,
          updated_at = NOW()
      WHERE id = NEW.warehouse_id;
    ELSE
      UPDATE warehouses 
      SET occupied_space = occupied_space + NEW.space_occupied,
          updated_at = NOW()
      WHERE id = NEW.warehouse_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle space changes
    IF NEW.floor_type = OLD.floor_type THEN
      -- Same floor, just update the difference
      IF NEW.floor_type = 'Mezzanine' THEN
        UPDATE warehouses 
        SET mezzanine_occupied = mezzanine_occupied + (NEW.space_occupied - OLD.space_occupied),
            updated_at = NOW()
        WHERE id = NEW.warehouse_id;
      ELSE
        UPDATE warehouses 
        SET occupied_space = occupied_space + (NEW.space_occupied - OLD.space_occupied),
            updated_at = NOW()
        WHERE id = NEW.warehouse_id;
      END IF;
    ELSE
      -- Different floor, remove from old floor and add to new floor
      IF OLD.floor_type = 'Mezzanine' THEN
        UPDATE warehouses 
        SET mezzanine_occupied = mezzanine_occupied - OLD.space_occupied,
            occupied_space = occupied_space + NEW.space_occupied,
            updated_at = NOW()
        WHERE id = NEW.warehouse_id;
      ELSE
        UPDATE warehouses 
        SET occupied_space = occupied_space - OLD.space_occupied,
            mezzanine_occupied = mezzanine_occupied + NEW.space_occupied,
            updated_at = NOW()
        WHERE id = NEW.warehouse_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Remove space when occupant is deleted
    IF OLD.floor_type = 'Mezzanine' THEN
      UPDATE warehouses 
      SET mezzanine_occupied = mezzanine_occupied - OLD.space_occupied,
          updated_at = NOW()
      WHERE id = OLD.warehouse_id;
    ELSE
      UPDATE warehouses 
      SET occupied_space = occupied_space - OLD.space_occupied,
          updated_at = NOW()
      WHERE id = OLD.warehouse_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for warehouse_occupants
DROP TRIGGER IF EXISTS trigger_update_warehouse_occupied_space ON warehouse_occupants;
CREATE TRIGGER trigger_update_warehouse_occupied_space
  AFTER INSERT OR UPDATE OR DELETE ON warehouse_occupants
  FOR EACH ROW EXECUTE FUNCTION update_warehouse_occupied_space();

-- Verify the setup
SELECT 'Warehouses table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'warehouses' 
ORDER BY ordinal_position;

SELECT 'Warehouse occupants table columns:' as info;
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'warehouse_occupants' 
ORDER BY ordinal_position;





