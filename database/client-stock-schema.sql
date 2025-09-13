-- Client Stock Management Table with Enhanced Quantity Tracking
CREATE TABLE IF NOT EXISTS client_stock (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  product_type TEXT NOT NULL DEFAULT 'general',
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pieces',
  description TEXT,
  storage_location TEXT,
  space_type TEXT NOT NULL DEFAULT 'Ground Floor' CHECK (space_type IN ('Ground Floor', 'Mezzanine')),
  area_used REAL NOT NULL DEFAULT 0,
  entry_date TEXT NOT NULL,
  expected_exit_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'pending')),
  notes TEXT,
  
  -- Enhanced Quantity Tracking Fields
  current_quantity INTEGER NOT NULL DEFAULT 0,
  total_received_quantity INTEGER NOT NULL DEFAULT 0,
  total_delivered_quantity INTEGER NOT NULL DEFAULT 0,
  initial_quantity INTEGER NOT NULL DEFAULT 0,
  
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Quantity Movement History Table
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  FOREIGN KEY (stock_id) REFERENCES client_stock(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_stock_client_name ON client_stock(client_name);
CREATE INDEX IF NOT EXISTS idx_client_stock_status ON client_stock(status);
CREATE INDEX IF NOT EXISTS idx_client_stock_product_type ON client_stock(product_type);
CREATE INDEX IF NOT EXISTS idx_client_stock_entry_date ON client_stock(entry_date);
CREATE INDEX IF NOT EXISTS idx_client_stock_created_at ON client_stock(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_id ON stock_movements(stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_date ON stock_movements(movement_date);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_client_stock_updated_at
  AFTER UPDATE ON client_stock
  FOR EACH ROW
BEGIN
  UPDATE client_stock SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to automatically update quantity tracking fields
CREATE TRIGGER IF NOT EXISTS update_quantity_tracking
  AFTER UPDATE ON client_stock
  FOR EACH ROW
BEGIN
  -- Update current_quantity to match quantity field
  UPDATE client_stock SET current_quantity = NEW.quantity WHERE id = NEW.id;
END;

-- Insert some sample data for testing with enhanced quantity tracking
INSERT OR IGNORE INTO client_stock (
  id, client_name, client_email, client_phone, product_type, quantity, unit,
  description, storage_location, space_type, area_used, entry_date, status,
  current_quantity, total_received_quantity, total_delivered_quantity, initial_quantity
) VALUES 
(
  'sample-1',
  'ABC Trading Company',
  'contact@abctrading.com',
  '+973-1234-5678',
  'electronics',
  350,
  'pieces',
  'Laptop computers and accessories',
  'Section A-1, Rack 1-5',
  'Ground Floor',
  25.5,
  '2024-01-15',
  'active',
  350,
  500,
  150,
  500
),
(
  'sample-2',
  'Gulf Food Distributors',
  'info@gulffood.bh',
  '+973-9876-5432',
  'food',
  150,
  'boxes',
  'Canned goods and dry food items',
  'Section B-2, Cold Storage',
  'Ground Floor',
  15.0,
  '2024-01-10',
  'active',
  150,
  200,
  50,
  200
),
(
  'sample-3',
  'Metal Works Ltd',
  'orders@metalworks.com',
  '+973-5555-1234',
  'metals',
  0,
  'tons',
  'Steel pipes and construction materials',
  'Section C-1, Heavy Storage',
  'Ground Floor',
  100.0,
  '2023-12-20',
  'completed',
  0,
  50,
  50,
  50
);

-- Insert sample movement history
INSERT OR IGNORE INTO stock_movements (
  id, stock_id, movement_type, quantity, previous_quantity, new_quantity, movement_date, notes
) VALUES 
-- ABC Trading Company movements
('mov-1', 'sample-1', 'initial', 500, 0, 500, '2024-01-15', 'Initial stock entry'),
('mov-2', 'sample-1', 'deliver', 100, 500, 400, '2024-02-01', 'Delivered to client warehouse'),
('mov-3', 'sample-1', 'deliver', 50, 400, 350, '2024-02-15', 'Regular delivery'),

-- Gulf Food Distributors movements
('mov-4', 'sample-2', 'initial', 200, 0, 200, '2024-01-10', 'Initial stock entry'),
('mov-5', 'sample-2', 'deliver', 30, 200, 170, '2024-01-25', 'Restaurant delivery'),
('mov-6', 'sample-2', 'deliver', 20, 170, 150, '2024-02-10', 'Supermarket delivery'),

-- Metal Works Ltd movements
('mov-7', 'sample-3', 'initial', 50, 0, 50, '2023-12-20', 'Initial stock entry'),
('mov-8', 'sample-3', 'deliver', 50, 50, 0, '2024-01-30', 'Complete delivery - project completed');
