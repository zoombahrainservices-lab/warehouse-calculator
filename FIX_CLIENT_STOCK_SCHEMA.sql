-- ============================================
-- FIX CLIENT_STOCK TABLE SCHEMA
-- ============================================
-- This script fixes the client_stock table to match the application requirements

-- 1. Add missing columns to client_stock table
ALTER TABLE client_stock ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE client_stock ADD COLUMN IF NOT EXISTS current_quantity INTEGER DEFAULT 0;
ALTER TABLE client_stock ADD COLUMN IF NOT EXISTS total_received_quantity INTEGER DEFAULT 0;
ALTER TABLE client_stock ADD COLUMN IF NOT EXISTS total_delivered_quantity INTEGER DEFAULT 0;
ALTER TABLE client_stock ADD COLUMN IF NOT EXISTS initial_quantity INTEGER DEFAULT 0;

-- 2. Update existing records to have product_name (use product_type as fallback)
UPDATE client_stock 
SET product_name = COALESCE(product_name, product_type, 'General Product')
WHERE product_name IS NULL;

-- 3. Update existing records to have proper quantity tracking
UPDATE client_stock 
SET 
  current_quantity = COALESCE(current_quantity, quantity),
  total_received_quantity = COALESCE(total_received_quantity, quantity),
  total_delivered_quantity = COALESCE(total_delivered_quantity, 0),
  initial_quantity = COALESCE(initial_quantity, quantity)
WHERE current_quantity IS NULL OR total_received_quantity IS NULL OR total_delivered_quantity IS NULL OR initial_quantity IS NULL;

-- 4. Create stock_movements table if it doesn't exist
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  stock_id TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('received', 'delivered')),
  quantity INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_id ON stock_movements(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

-- 6. Insert sample data for testing (if table is empty)
INSERT INTO client_stock (
  id, client_name, client_email, client_phone, product_name, product_type, quantity, unit,
  description, storage_location, area_used, entry_date, expected_exit_date, status, notes,
  current_quantity, total_received_quantity, total_delivered_quantity, initial_quantity
) VALUES 
(
  'sample-1',
  'ABC Trading Company',
  'contact@abctrading.com',
  '+973-1234-5678',
  'Laptop Computers',
  'electronics',
  500,
  'pieces',
  'Dell Latitude laptops and accessories for corporate clients',
  'Section A-1, Rack 1-5',
  25.5,
  '2024-01-15',
  '2024-06-15',
  'active',
  'Temperature sensitive - keep below 35°C, high value items',
  500,
  500,
  0,
  500
),
(
  'sample-2',
  'Gulf Food Distributors',
  'info@gulffood.bh',
  '+973-9876-5432',
  'Organic Canned Goods',
  'food',
  200,
  'boxes',
  'Organic canned goods and dry food items for retail distribution',
  'Section B-2, Cold Storage Area',
  15.0,
  '2024-01-10',
  '2024-07-10',
  'active',
  'Temperature controlled storage required - FIFO rotation',
  200,
  200,
  0,
  200
),
(
  'sample-3',
  'Metal Works Ltd',
  'orders@metalworks.com',
  '+973-5555-1234',
  'Galvanized Steel Pipes',
  'metals',
  50,
  'tons',
  'Galvanized steel pipes and construction materials',
  'Section C-1, Heavy Storage Zone',
  100.0,
  '2023-12-20',
  '2024-02-20',
  'completed',
  'Heavy items - crane required for handling. Project completed successfully.',
  0,
  50,
  50,
  50
)
ON CONFLICT (id) DO NOTHING;

-- 7. Success message
SELECT 
  'Client stock table schema fixed successfully!' as message,
  (SELECT COUNT(*) FROM client_stock) as total_stock_items,
  (SELECT COUNT(*) FROM stock_movements) as total_movements;
