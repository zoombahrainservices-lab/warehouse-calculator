-- Manual Database Update for Accurate Stock Tracking
-- Run this script in your Supabase SQL Editor

-- 1. Add new columns to client_stock table if they don't exist
ALTER TABLE client_stock ADD COLUMN IF NOT EXISTS current_quantity INTEGER DEFAULT 0;
ALTER TABLE client_stock ADD COLUMN IF NOT EXISTS total_received_quantity INTEGER DEFAULT 0;
ALTER TABLE client_stock ADD COLUMN IF NOT EXISTS total_delivered_quantity INTEGER DEFAULT 0;
ALTER TABLE client_stock ADD COLUMN IF NOT EXISTS initial_quantity INTEGER DEFAULT 0;

-- 2. Create stock_movements table if it doesn't exist
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  stock_id TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('initial', 'receive', 'deliver', 'adjustment')),
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  movement_date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_id ON stock_movements(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_date ON stock_movements(movement_date);

-- 4. Update existing records to have proper quantity tracking
-- Set initial values for existing stock items
UPDATE client_stock 
SET 
  current_quantity = COALESCE(current_quantity, quantity),
  total_received_quantity = COALESCE(total_received_quantity, quantity),
  total_delivered_quantity = COALESCE(total_delivered_quantity, 0),
  initial_quantity = COALESCE(initial_quantity, quantity)
WHERE current_quantity IS NULL OR total_received_quantity IS NULL OR total_delivered_quantity IS NULL OR initial_quantity IS NULL;

-- 5. Create initial movement records for existing stock items (if they don't exist)
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

-- 6. Verify the update
SELECT 
  'Schema Update Complete' as status,
  COUNT(*) as total_stock_items,
  COUNT(CASE WHEN current_quantity IS NOT NULL THEN 1 END) as items_with_current_qty,
  COUNT(CASE WHEN total_received_quantity IS NOT NULL THEN 1 END) as items_with_total_received,
  COUNT(CASE WHEN total_delivered_quantity IS NOT NULL THEN 1 END) as items_with_total_delivered,
  COUNT(CASE WHEN initial_quantity IS NOT NULL THEN 1 END) as items_with_initial_qty,
  (SELECT COUNT(*) FROM stock_movements) as total_movements
FROM client_stock;

-- 7. Show sample data to verify tracking
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
LIMIT 10;
