-- ============================================
-- SITRA WAREHOUSE CLIENT & STOCK SYSTEM
-- ============================================
-- This creates a proper client-based system where each client has separate stock data

-- 1. Create CLIENTS table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  fax TEXT,
  address TEXT,
  po_box TEXT,
  city TEXT DEFAULT 'UMM AL QUWAIN',
  country TEXT DEFAULT 'UAE',
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Create CLIENT_STOCK table (linked to clients)
DROP TABLE IF EXISTS client_stock CASCADE;
CREATE TABLE client_stock (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Packing List Details
  exp_pack_no TEXT, -- Export Pack Number
  date_packed DATE DEFAULT CURRENT_DATE,
  vehicle_no TEXT,
  driver_name TEXT,
  uae_cont_no TEXT,
  export_cont TEXT,
  
  -- Item Details
  po_no TEXT, -- Purchase Order Number
  section TEXT,
  bundle_id TEXT,
  do_no TEXT, -- Delivery Order Number
  temp_alloy TEXT, -- Temperature/Alloy (like T6 6063)
  finish TEXT, -- Finish type (like PC/SDF-7037)
  
  -- Measurements
  cut_length REAL,
  est_weight REAL,
  order_length REAL,
  no_of_pcs INTEGER DEFAULT 0,
  no_of_bundles INTEGER DEFAULT 0,
  total_pcs INTEGER DEFAULT 0,
  total_weight REAL DEFAULT 0,
  
  -- Storage Info
  storage_location TEXT,
  space_type TEXT DEFAULT 'Ground Floor',
  area_used REAL DEFAULT 0,
  
  -- Dates
  entry_date DATE DEFAULT CURRENT_DATE,
  expected_exit_date DATE,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'packed', 'shipped', 'completed', 'cancelled')),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_client_stock_client_id ON client_stock(client_id);
CREATE INDEX IF NOT EXISTS idx_client_stock_exp_pack_no ON client_stock(exp_pack_no);
CREATE INDEX IF NOT EXISTS idx_client_stock_status ON client_stock(status);
CREATE INDEX IF NOT EXISTS idx_client_stock_date_packed ON client_stock(date_packed);

-- 4. Create update triggers
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_client_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();

CREATE TRIGGER IF NOT EXISTS update_client_stock_updated_at
  BEFORE UPDATE ON client_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_client_stock_updated_at();

-- 5. Insert sample clients
INSERT INTO clients (
  id, company_name, contact_person, email, phone, fax, address, po_box, website
) VALUES 
(
  'client-arabian-extrusions',
  'Arabian Extrusions Factory',
  'Ahmed Al-Rashid',
  'ahmed@arabianextrusion.com',
  '(009716)7646152',
  '(009716)7646252, 7664034',
  'Industrial Area, Umm Al Quwain',
  'P.O.Box 1999',
  'www.arabianextrusion.com'
),
(
  'client-gulf-aluminum',
  'Gulf Aluminum Industries',
  'Fatima Al-Zahra',
  'info@gulfaluminum.ae',
  '+971-6-7555000',
  '+971-6-7555001',
  'Ras Al Khaimah Industrial City',
  'P.O.Box 2500',
  'www.gulfaluminum.ae'
),
(
  'client-emirates-metal',
  'Emirates Metal Works LLC',
  'Omar Hassan',
  'omar@emiratesmetal.com',
  '+971-4-3456789',
  '+971-4-3456790',
  'Dubai Industrial City',
  'P.O.Box 5500',
  'www.emiratesmetal.com'
);

-- 6. Insert sample stock data for Arabian Extrusions Factory (matching your image)
INSERT INTO client_stock (
  id, client_id, exp_pack_no, date_packed, po_no, section, bundle_id, do_no, 
  temp_alloy, finish, cut_length, est_weight, order_length, no_of_pcs, no_of_bundles, 
  total_pcs, total_weight, storage_location, status
) VALUES 
('stock-ae-001', 'client-arabian-extrusions', '009862825', '2025-02-08', '86259/25', '84125', '780944', '1184762/25', 'T6 6063', 'PC/SDF-7037', 6.50, 0.978, 37.00, 2, 18, 36, 228.852, 'Section A-1', 'active'),
('stock-ae-002', 'client-arabian-extrusions', '009862825', '2025-02-08', '86259/25', '84125', '780944', '1184762/25', 'T6 6063', 'PC/SDF-7037', 6.50, 0.978, 37.00, 1, 1, 1, 6.357, 'Section A-1', 'active'),
('stock-ae-003', 'client-arabian-extrusions', '009862825', '2025-02-08', '86259/25', '84097', '780944', '1184762/25', 'T6 6063', 'PC/SDF-7037', 6.50, 0.797, 30.00, 2, 15, 30, 154.145, 'Section A-2', 'active'),
('stock-ae-004', 'client-arabian-extrusions', '009862825', '2025-02-08', '86259/25', '84098', '780944', '1184762/25', 'T6 6063', 'PC/SDF-7037', 6.50, 0.868, 30.00, 2, 15, 30, 169.280, 'Section A-2', 'active'),
('stock-ae-005', 'client-arabian-extrusions', '009862825', '2025-02-08', '86259/25', '84098', '780944', '1184762/25', 'T6 6063', 'PC/SDF-7037', 6.50, 0.868, 30.00, 1, 1, 1, 5.642, 'Section A-2', 'active');

-- 7. Insert sample stock for other clients
INSERT INTO client_stock (
  id, client_id, exp_pack_no, date_packed, po_no, section, temp_alloy, finish, 
  cut_length, est_weight, order_length, no_of_pcs, total_pcs, total_weight, 
  storage_location, status
) VALUES 
('stock-ga-001', 'client-gulf-aluminum', 'GA-2025-001', '2025-02-08', 'GA-PO-001', 'AL6061', 'T6 6061', 'Anodized', 8.00, 1.250, 40.00, 100, 100, 125.0, 'Section B-1', 'active'),
('stock-em-001', 'client-emirates-metal', 'EM-2025-001', '2025-02-08', 'EM-PO-001', 'ST304', 'Stainless Steel', 'Polished', 12.00, 2.500, 60.00, 50, 50, 125.0, 'Section C-1', 'active');

-- 8. Create a view for easy client stock reporting
CREATE OR REPLACE VIEW client_stock_report AS
SELECT 
  c.company_name,
  c.contact_person,
  c.email,
  c.phone,
  c.address,
  c.po_box,
  cs.*,
  COUNT(*) OVER (PARTITION BY cs.client_id) as total_items_for_client,
  SUM(cs.total_weight) OVER (PARTITION BY cs.client_id) as total_weight_for_client
FROM clients c
JOIN client_stock cs ON c.id = cs.client_id
ORDER BY c.company_name, cs.exp_pack_no, cs.created_at;

-- Success message
SELECT 
  'Client system created successfully!' as message,
  (SELECT COUNT(*) FROM clients) as total_clients,
  (SELECT COUNT(*) FROM client_stock) as total_stock_items;
