-- Fix Quantity Tracking Data
-- Run this script in your Supabase SQL Editor to fix the quantity tracking

-- 1. Fix the quantity tracking data for existing records
UPDATE client_stock 
SET 
  current_quantity = quantity,
  total_received_quantity = quantity,
  total_delivered_quantity = 0,
  initial_quantity = quantity
WHERE current_quantity = 0 OR total_received_quantity = 0 OR initial_quantity = 0;

-- 2. Create initial movement records for existing stock items
INSERT INTO stock_movements (
  id, stock_id, movement_type, quantity, previous_quantity, new_quantity, movement_date, notes
)
SELECT 
  'mov-' || id || '-initial',
  id,
  'initial',
  quantity,
  0,
  quantity,
  entry_date,
  'Initial stock entry (migrated from existing data)'
FROM client_stock
WHERE id NOT IN (SELECT DISTINCT stock_id FROM stock_movements WHERE movement_type = 'initial')
ON CONFLICT (id) DO NOTHING;

-- 3. Verify the fix
SELECT 
  'Data Fix Complete' as status,
  COUNT(*) as total_stock_items,
  COUNT(CASE WHEN current_quantity > 0 THEN 1 END) as items_with_current_qty,
  COUNT(CASE WHEN total_received_quantity > 0 THEN 1 END) as items_with_total_received,
  COUNT(CASE WHEN initial_quantity > 0 THEN 1 END) as items_with_initial_qty,
  (SELECT COUNT(*) FROM stock_movements) as total_movements
FROM client_stock;

-- 4. Show the corrected data
SELECT 
  id,
  client_name,
  product_type,
  quantity as original_quantity,
  current_quantity,
  total_received_quantity,
  total_delivered_quantity,
  initial_quantity,
  CASE 
    WHEN current_quantity = total_received_quantity - total_delivered_quantity THEN '✓ Accurate'
    ELSE '⚠ Inconsistent'
  END as tracking_status
FROM client_stock
ORDER BY client_name, product_type
LIMIT 10;
