-- Fix Total Received and Initial Quantity (These should NEVER change)
-- Run this script in your Supabase SQL Editor

-- 1. Fix total_received_quantity and initial_quantity to match the original quantity
-- These values should NEVER change once set
UPDATE client_stock 
SET 
  total_received_quantity = quantity,
  initial_quantity = quantity
WHERE total_received_quantity != quantity OR initial_quantity != quantity;

-- 2. Verify the fix - these values should now match the original quantity
SELECT 
  'Total Received Fix Complete' as status,
  COUNT(*) as total_items,
  COUNT(CASE WHEN total_received_quantity = quantity THEN 1 END) as correct_total_received,
  COUNT(CASE WHEN initial_quantity = quantity THEN 1 END) as correct_initial_quantity
FROM client_stock;

-- 3. Show the corrected data
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
    WHEN total_received_quantity = quantity AND initial_quantity = quantity THEN '✓ Fixed'
    ELSE '⚠ Still needs fixing'
  END as status
FROM client_stock
ORDER BY client_name, product_type
LIMIT 10;





