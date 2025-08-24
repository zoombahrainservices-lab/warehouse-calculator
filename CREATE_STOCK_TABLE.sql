-- ============================================
-- SITRA WAREHOUSE STOCK TABLE CREATION SCRIPT
-- ============================================
-- Copy and paste this entire script into your Supabase SQL Editor

-- Create the client_stock table
CREATE TABLE IF NOT EXISTS client_stock (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  product_type TEXT NOT NULL DEFAULT 'general' CHECK (product_type IN ('food', 'metals', 'cargo', 'electronics', 'textiles', 'general', 'chemicals', 'automotive', 'pharmaceutical', 'other')),
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pieces' CHECK (unit IN ('pieces', 'boxes', 'pallets', 'kg', 'tons', 'liters', 'm3', 'containers', 'rolls', 'bags')),
  description TEXT,
  storage_location TEXT,
  space_type TEXT NOT NULL DEFAULT 'Ground Floor' CHECK (space_type IN ('Ground Floor', 'Mezzanine')),
  area_used REAL NOT NULL DEFAULT 0,
  entry_date TEXT NOT NULL,
  expected_exit_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'pending', 'expired', 'damaged')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_stock_client_name ON client_stock(client_name);
CREATE INDEX IF NOT EXISTS idx_client_stock_status ON client_stock(status);
CREATE INDEX IF NOT EXISTS idx_client_stock_product_type ON client_stock(product_type);
CREATE INDEX IF NOT EXISTS idx_client_stock_entry_date ON client_stock(entry_date);
CREATE INDEX IF NOT EXISTS idx_client_stock_created_at ON client_stock(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_client_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_client_stock_updated_at
  BEFORE UPDATE ON client_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_client_stock_updated_at();

-- Insert sample data for testing
INSERT INTO client_stock (
  id, client_name, client_email, client_phone, product_type, quantity, unit,
  description, storage_location, space_type, area_used, entry_date, expected_exit_date, status, notes
) VALUES 
(
  'sample-1',
  'ABC Trading Company',
  'contact@abctrading.com',
  '+973-1234-5678',
  'electronics',
  500,
  'pieces',
  'Dell Latitude laptops and accessories for corporate clients',
  'Section A-1, Rack 1-5',
  'Ground Floor',
  25.5,
  '2024-01-15',
  '2024-06-15',
  'active',
  'Temperature sensitive - keep below 35°C, high value items'
),
(
  'sample-2',
  'Gulf Food Distributors',
  'info@gulffood.bh',
  '+973-9876-5432',
  'food',
  200,
  'boxes',
  'Organic canned goods and dry food items for retail distribution',
  'Section B-2, Cold Storage Area',
  'Ground Floor',
  15.0,
  '2024-01-10',
  '2024-07-10',
  'active',
  'Temperature controlled storage required - FIFO rotation'
),
(
  'sample-3',
  'Metal Works Ltd',
  'orders@metalworks.com',
  '+973-5555-1234',
  'metals',
  50,
  'tons',
  'Galvanized steel pipes and construction materials',
  'Section C-1, Heavy Storage Zone',
  'Ground Floor',
  100.0,
  '2023-12-20',
  '2024-02-20',
  'completed',
  'Heavy items - crane required for handling. Project completed successfully.'
),
(
  'sample-4',
  'Fashion Hub Bahrain',
  'sarah@fashionhub.bh',
  '+973-7777-8888',
  'textiles',
  150,
  'boxes',
  'High-end fashion clothing collection - Spring 2024',
  'Section D-3, Climate Controlled',
  'Mezzanine',
  35.0,
  '2024-02-01',
  '2024-05-01',
  'active',
  'Humidity controlled environment required - Premium items'
),
(
  'sample-5',
  'Pharma Distribution Co.',
  'omar@pharmadist.bh',
  '+973-3333-4444',
  'pharmaceutical',
  75,
  'boxes',
  'Medical supplies and pharmaceutical products',
  'Section E-1, Secure Storage',
  'Ground Floor',
  20.0,
  '2024-01-25',
  '2024-04-25',
  'active',
  'Requires special handling - Medical grade storage conditions'
);

-- Enable Row Level Security (RLS) if needed
-- ALTER TABLE client_stock ENABLE ROW LEVEL SECURITY;

-- Create a simple policy for authenticated users (optional)
-- CREATE POLICY "Enable all operations for authenticated users" ON client_stock
--   FOR ALL USING (auth.role() = 'authenticated');

-- Verify the table was created successfully
SELECT 'Table created successfully!' as message, count(*) as sample_records FROM client_stock;
