-- Client Stock Management Table
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
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_stock_client_name ON client_stock(client_name);
CREATE INDEX IF NOT EXISTS idx_client_stock_status ON client_stock(status);
CREATE INDEX IF NOT EXISTS idx_client_stock_product_type ON client_stock(product_type);
CREATE INDEX IF NOT EXISTS idx_client_stock_entry_date ON client_stock(entry_date);
CREATE INDEX IF NOT EXISTS idx_client_stock_created_at ON client_stock(created_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_client_stock_updated_at
  AFTER UPDATE ON client_stock
  FOR EACH ROW
BEGIN
  UPDATE client_stock SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Insert some sample data for testing
INSERT OR IGNORE INTO client_stock (
  id, client_name, client_email, client_phone, product_type, quantity, unit,
  description, storage_location, space_type, area_used, entry_date, status
) VALUES 
(
  'sample-1',
  'ABC Trading Company',
  'contact@abctrading.com',
  '+973-1234-5678',
  'electronics',
  500,
  'pieces',
  'Laptop computers and accessories',
  'Section A-1, Rack 1-5',
  'Ground Floor',
  25.5,
  '2024-01-15',
  'active'
),
(
  'sample-2',
  'Gulf Food Distributors',
  'info@gulffood.bh',
  '+973-9876-5432',
  'food',
  200,
  'boxes',
  'Canned goods and dry food items',
  'Section B-2, Cold Storage',
  'Ground Floor',
  15.0,
  '2024-01-10',
  'active'
),
(
  'sample-3',
  'Metal Works Ltd',
  'orders@metalworks.com',
  '+973-5555-1234',
  'metals',
  50,
  'tons',
  'Steel pipes and construction materials',
  'Section C-1, Heavy Storage',
  'Ground Floor',
  100.0,
  '2023-12-20',
  'completed'
);
