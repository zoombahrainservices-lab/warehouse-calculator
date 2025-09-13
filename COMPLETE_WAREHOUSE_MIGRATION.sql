-- Complete Warehouse Migration Script
-- Run this script in your Supabase SQL Editor to add all missing columns

-- ========================================
-- 1. ADD MISSING COLUMNS TO WAREHOUSES TABLE
-- ========================================

-- Add mezzanine columns to warehouses table
ALTER TABLE warehouses 
ADD COLUMN IF NOT EXISTS has_mezzanine BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mezzanine_space NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS mezzanine_occupied NUMERIC DEFAULT 0;

-- Fix mezzanine_free column (drop and recreate as generated column)
ALTER TABLE warehouses DROP COLUMN IF EXISTS mezzanine_free;
ALTER TABLE warehouses 
ADD COLUMN mezzanine_free NUMERIC GENERATED ALWAYS AS (mezzanine_space - mezzanine_occupied) STORED;

-- ========================================
-- 2. ADD MISSING COLUMNS TO WAREHOUSE_OCCUPANTS TABLE
-- ========================================

-- Add section and floor_type columns to warehouse_occupants table
ALTER TABLE warehouse_occupants 
ADD COLUMN IF NOT EXISTS section TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS floor_type TEXT DEFAULT 'ground' CHECK (floor_type IN ('ground', 'mezzanine'));

-- ========================================
-- 3. VERIFY ALL COLUMNS WERE ADDED
-- ========================================

-- Check warehouses table structure
SELECT 
  'warehouses' as table_name,
  column_name, 
  data_type, 
  is_nullable,
  column_default,
  generation_expression
FROM information_schema.columns 
WHERE table_name = 'warehouses' 
  AND column_name IN ('has_mezzanine', 'mezzanine_space', 'mezzanine_occupied', 'mezzanine_free')
ORDER BY column_name;

-- Check warehouse_occupants table structure
SELECT 
  'warehouse_occupants' as table_name,
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'warehouse_occupants' 
  AND column_name IN ('section', 'floor_type')
ORDER BY column_name;

-- ========================================
-- 4. SHOW SAMPLE DATA
-- ========================================

-- Show warehouses with mezzanine info
SELECT 
  id,
  name,
  has_mezzanine,
  mezzanine_space,
  mezzanine_occupied,
  mezzanine_free,
  total_space,
  occupied_space,
  free_space
FROM warehouses 
ORDER BY has_mezzanine DESC, name
LIMIT 5;

-- Show warehouse_occupants with new columns
SELECT 
  id,
  name,
  section,
  floor_type,
  space_occupied,
  status
FROM warehouse_occupants 
ORDER BY created_at DESC
LIMIT 5;

-- ========================================
-- 5. FINAL VERIFICATION
-- ========================================

-- Count warehouses with mezzanine
SELECT 
  'Warehouses with mezzanine' as description,
  COUNT(*) as count
FROM warehouses 
WHERE has_mezzanine = true

UNION ALL

-- Count occupants by floor type
SELECT 
  'Occupants on ' || floor_type || ' floor' as description,
  COUNT(*) as count
FROM warehouse_occupants 
GROUP BY floor_type

UNION ALL

-- Count total warehouses
SELECT 
  'Total warehouses' as description,
  COUNT(*) as count
FROM warehouses

UNION ALL

-- Count total occupants
SELECT 
  'Total occupants' as description,
  COUNT(*) as count
FROM warehouse_occupants;





