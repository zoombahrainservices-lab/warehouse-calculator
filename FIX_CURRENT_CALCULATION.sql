-- Fix Current Stock Calculation
-- Run this script in your Supabase SQL Editor

-- 1. Fix current_quantity calculation: Current = Total Received - Total Delivered
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
  current_quantity as "Current Stock",
  (total_received_quantity - total_delivered_quantity) as "Calculated Current",
  CASE 
    WHEN current_quantity = (total_received_quantity - total_delivered_quantity) THEN '✅ Correct'
    ELSE '❌ Wrong'
  END as status
FROM client_stock
ORDER BY client_name, product_type;

-- 4. Show summary by client
SELECT 
  client_name,
  COUNT(*) as total_items,
  SUM(total_received_quantity) as total_received,
  SUM(total_delivered_quantity) as total_delivered,
  SUM(current_quantity) as total_current,
  SUM(total_received_quantity - total_delivered_quantity) as calculated_current
FROM client_stock
GROUP BY client_name
ORDER BY client_name;





