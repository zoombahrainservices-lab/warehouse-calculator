-- Fix Current Stock Calculation
-- Run this script in your Supabase SQL Editor

-- 1. Fix current_quantity to show remaining stock in warehouse
-- Current Stock = Total Received - Total Delivered
UPDATE client_stock 
SET 
  current_quantity = total_received_quantity - total_delivered_quantity
WHERE current_quantity != (total_received_quantity - total_delivered_quantity);

-- 2. Verify the fix
SELECT 
  'Current Stock Fix Complete' as status,
  COUNT(*) as total_items,
  COUNT(CASE WHEN current_quantity = (total_received_quantity - total_delivered_quantity) THEN 1 END) as correct_current_stock
FROM client_stock;

-- 3. Show the corrected data with clear examples
SELECT 
  id,
  client_name,
  product_type,
  quantity as original_quantity,
  total_received_quantity as "Total Received",
  total_delivered_quantity as "Total Delivered", 
  current_quantity as "Current Stock (Remaining)",
  initial_quantity as "Initial Quantity",
  CASE 
    WHEN current_quantity = (total_received_quantity - total_delivered_quantity) THEN '✓ Correct'
    ELSE '⚠ Wrong Calculation'
  END as calculation_status
FROM client_stock
ORDER BY client_name, product_type
LIMIT 10;





