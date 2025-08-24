-- Stock Management Table for Sitra Warehouse
-- This table stores all client stock/inventory information

CREATE TABLE IF NOT EXISTS stock_data (
  -- Primary Key
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  
  -- Client Information
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_company TEXT,
  client_address TEXT,
  
  -- Product Information
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'general' CHECK (product_type IN ('food', 'metals', 'cargo', 'electronics', 'textiles', 'general', 'chemicals', 'automotive', 'pharmaceutical', 'other')),
  product_category TEXT,
  product_description TEXT,
  product_brand TEXT,
  product_model TEXT,
  
  -- Quantity & Measurements
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pieces' CHECK (unit IN ('pieces', 'boxes', 'pallets', 'kg', 'tons', 'liters', 'm3', 'containers', 'rolls', 'bags')),
  weight_kg REAL DEFAULT 0,
  volume_m3 REAL DEFAULT 0,
  dimensions_length REAL DEFAULT 0,
  dimensions_width REAL DEFAULT 0,
  dimensions_height REAL DEFAULT 0,
  
  -- Storage Information
  storage_location TEXT,
  warehouse_section TEXT,
  rack_number TEXT,
  shelf_level TEXT,
  space_type TEXT NOT NULL DEFAULT 'Ground Floor' CHECK (space_type IN ('Ground Floor', 'Mezzanine')),
  area_occupied_m2 REAL NOT NULL DEFAULT 0,
  temperature_controlled BOOLEAN DEFAULT FALSE,
  humidity_controlled BOOLEAN DEFAULT FALSE,
  special_requirements TEXT,
  
  -- Dates & Timeline
  entry_date TEXT NOT NULL DEFAULT (date('now')),
  expected_exit_date TEXT,
  actual_exit_date TEXT,
  last_inspection_date TEXT,
  expiry_date TEXT,
  
  -- Status & Tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed', 'expired', 'damaged', 'reserved')),
  condition_status TEXT DEFAULT 'good' CHECK (condition_status IN ('excellent', 'good', 'fair', 'damaged', 'expired')),
  handling_instructions TEXT,
  insurance_value REAL DEFAULT 0,
  customs_cleared BOOLEAN DEFAULT FALSE,
  
  -- Financial Information
  storage_rate_per_m2 REAL DEFAULT 0,
  monthly_storage_cost REAL DEFAULT 0,
  total_storage_cost REAL DEFAULT 0,
  deposit_amount REAL DEFAULT 0,
  deposit_paid BOOLEAN DEFAULT FALSE,
  
  -- Additional Information
  barcode TEXT,
  qr_code TEXT,
  reference_number TEXT,
  purchase_order_number TEXT,
  invoice_number TEXT,
  notes TEXT,
  internal_notes TEXT,
  
  -- System Fields
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT DEFAULT 'system',
  updated_by TEXT DEFAULT 'system'
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_client_name ON stock_data(client_name);
CREATE INDEX IF NOT EXISTS idx_stock_product_type ON stock_data(product_type);
CREATE INDEX IF NOT EXISTS idx_stock_status ON stock_data(status);
CREATE INDEX IF NOT EXISTS idx_stock_entry_date ON stock_data(entry_date);
CREATE INDEX IF NOT EXISTS idx_stock_expected_exit ON stock_data(expected_exit_date);
CREATE INDEX IF NOT EXISTS idx_stock_space_type ON stock_data(space_type);
CREATE INDEX IF NOT EXISTS idx_stock_warehouse_section ON stock_data(warehouse_section);
CREATE INDEX IF NOT EXISTS idx_stock_reference_number ON stock_data(reference_number);
CREATE INDEX IF NOT EXISTS idx_stock_created_at ON stock_data(created_at);

-- Create unique index for barcode (if provided)
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_barcode ON stock_data(barcode) WHERE barcode IS NOT NULL;

-- Create unique index for QR code (if provided)
CREATE UNIQUE INDEX IF NOT EXISTS idx_stock_qr_code ON stock_data(qr_code) WHERE qr_code IS NOT NULL;

-- Trigger to automatically update the updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_stock_data_updated_at
  AFTER UPDATE ON stock_data
  FOR EACH ROW
BEGIN
  UPDATE stock_data SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Trigger to automatically set actual_exit_date when status changes to completed
CREATE TRIGGER IF NOT EXISTS set_actual_exit_date
  AFTER UPDATE OF status ON stock_data
  FOR EACH ROW
  WHEN NEW.status = 'completed' AND OLD.status != 'completed'
BEGIN
  UPDATE stock_data SET actual_exit_date = date('now') WHERE id = NEW.id;
END;

-- Insert sample stock data for testing
INSERT OR IGNORE INTO stock_data (
  id, client_name, client_email, client_phone, client_company,
  product_name, product_type, product_description,
  quantity, unit, weight_kg, volume_m3,
  storage_location, warehouse_section, space_type, area_occupied_m2,
  entry_date, expected_exit_date, status, condition_status,
  storage_rate_per_m2, monthly_storage_cost, reference_number, notes
) VALUES 
(
  'stock-001',
  'Ahmed Al-Mahmoud',
  'ahmed@techimports.bh',
  '+973-1234-5678',
  'Tech Imports Bahrain',
  'Dell Laptops',
  'electronics',
  'Dell Latitude 5520 Business Laptops - Brand New in Original Packaging',
  250,
  'pieces',
  1000.0,
  15.0,
  'Section A-1, Rack 1-5',
  'Electronics Zone',
  'Ground Floor',
  25.5,
  '2024-01-15',
  '2024-06-15',
  'active',
  'excellent',
  3.50,
  89.25,
  'TI-2024-001',
  'Temperature sensitive - keep below 35°C'
),
(
  'stock-002',
  'Fatima Al-Zahra',
  'fatima@gulffoodco.com',
  '+973-9876-5432',
  'Gulf Food Company',
  'Canned Tomatoes',
  'food',
  'Organic Canned Tomatoes - Various Brands, 400g cans',
  500,
  'boxes',
  2000.0,
  8.0,
  'Section B-2, Cold Storage Area',
  'Food Storage',
  'Ground Floor',
  15.0,
  '2024-01-10',
  '2024-07-10',
  'active',
  'good',
  4.00,
  60.00,
  'GFC-2024-002',
  'Expiry date: July 2025 - First in, first out rotation required'
),
(
  'stock-003',
  'Mohammed Al-Rashid',
  'orders@steelworks.bh',
  '+973-5555-1234',
  'Bahrain Steel Works',
  'Steel Pipes',
  'metals',
  'Galvanized Steel Pipes - Various diameters for construction',
  100,
  'pieces',
  15000.0,
  45.0,
  'Section C-1, Heavy Storage',
  'Industrial Materials',
  'Ground Floor',
  100.0,
  '2023-12-20',
  '2024-03-20',
  'completed',
  'good',
  2.80,
  280.00,
  'BSW-2023-003',
  'Heavy items - crane required for handling. Project completed successfully.'
),
(
  'stock-004',
  'Sarah Al-Mansoori',
  'sarah@fashionhub.bh',
  '+973-7777-8888',
  'Fashion Hub Bahrain',
  'Designer Clothing',
  'textiles',
  'High-end fashion clothing collection - Spring 2024',
  150,
  'boxes',
  300.0,
  20.0,
  'Section D-3, Climate Controlled',
  'Fashion Storage',
  'Mezzanine',
  35.0,
  '2024-02-01',
  '2024-05-01',
  'active',
  'excellent',
  2.80,
  98.00,
  'FHB-2024-004',
  'Humidity controlled environment required - High value items'
),
(
  'stock-005',
  'Omar Al-Khalifa',
  'omar@pharmadist.bh',
  '+973-3333-4444',
  'Pharma Distribution Co.',
  'Medical Supplies',
  'pharmaceutical',
  'Various medical supplies and equipment for hospitals',
  75,
  'boxes',
  500.0,
  12.0,
  'Section E-1, Secure Storage',
  'Medical Zone',
  'Ground Floor',
  20.0,
  '2024-01-25',
  '2024-04-25',
  'pending',
  'excellent',
  5.00,
  100.00,
  'PDC-2024-005',
  'Requires special handling - Medical grade storage conditions'
);

-- Create a view for easy stock reporting
CREATE VIEW IF NOT EXISTS stock_summary AS
SELECT 
  status,
  space_type,
  product_type,
  COUNT(*) as item_count,
  SUM(area_occupied_m2) as total_area_m2,
  SUM(monthly_storage_cost) as total_monthly_cost,
  AVG(storage_rate_per_m2) as avg_rate_per_m2
FROM stock_data
GROUP BY status, space_type, product_type
ORDER BY status, space_type, product_type;

-- Create a view for active stock only
CREATE VIEW IF NOT EXISTS active_stock AS
SELECT *
FROM stock_data
WHERE status = 'active'
ORDER BY entry_date DESC;

-- Create a view for expiring stock (items expiring in next 30 days)
CREATE VIEW IF NOT EXISTS expiring_stock AS
SELECT *
FROM stock_data
WHERE status = 'active' 
  AND expected_exit_date IS NOT NULL 
  AND date(expected_exit_date) <= date('now', '+30 days')
ORDER BY expected_exit_date ASC;
