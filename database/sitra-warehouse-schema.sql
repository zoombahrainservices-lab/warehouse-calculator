-- Sitra Warehouse Pricing Calculator - Real Price List Schema
-- Based on actual client price list

-- Drop existing tables if they exist
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS optional_services CASCADE;
DROP TABLE IF EXISTS ewa_settings CASCADE;
DROP TABLE IF EXISTS pricing_rates CASCADE;
DROP TABLE IF EXISTS office_pricing CASCADE;
DROP TABLE IF EXISTS space_types CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- System Settings Table (Global configurations)
CREATE TABLE system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Space Types Table
CREATE TABLE space_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Office Pricing Table
CREATE TABLE office_pricing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    space_type_id UUID REFERENCES space_types(id),
    tenure TEXT NOT NULL CHECK (tenure IN ('Short', 'Long', 'Very Short')),
    monthly_rate DECIMAL(8,2) NOT NULL,
    daily_rate DECIMAL(8,2) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing Rates Table (Based on Real Price List)
CREATE TABLE pricing_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    space_type_id UUID REFERENCES space_types(id),
    area_band_name TEXT NOT NULL, -- 'Small units', '1,000–1,499 m²', '1,500 m² and above', 'VERY SHORT SPECIAL'
    area_band_min INTEGER NOT NULL, -- Minimum area for this band
    area_band_max INTEGER, -- Maximum area for this band (NULL for unlimited)
    tenure TEXT NOT NULL CHECK (tenure IN ('Short', 'Long', 'Very Short')),
    tenure_description TEXT NOT NULL, -- 'Less than One Year', 'More or equal to 1 Year', 'Special'
    monthly_rate_per_sqm DECIMAL(6,3) NOT NULL, -- e.g., 3.500
    daily_rate_per_sqm DECIMAL(6,3) NOT NULL, -- e.g., 0.117
    min_chargeable_area INTEGER NOT NULL, -- e.g., 30
    package_starting_bhd INTEGER, -- e.g., 105
    package_range_from INTEGER, -- e.g., 3000
    package_range_to INTEGER, -- e.g., 4497
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EWA Settings Table (Based on Real Policy)
CREATE TABLE ewa_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_load_description TEXT NOT NULL DEFAULT 'House-load for lighting and low-power office devices (phones, laptops/PCs)',
    heavy_usage_description TEXT NOT NULL DEFAULT 'Heavy usage / Dedicated meter: EWA billed separately at government tariff',
    government_tariff_per_kwh DECIMAL(8,4) NOT NULL DEFAULT 0.045, -- Government tariff
    estimated_fixed_monthly_charges DECIMAL(8,2) NOT NULL DEFAULT 15.0,
    estimated_meter_deposit DECIMAL(8,2) NOT NULL DEFAULT 50.0,
    estimated_installation_fee DECIMAL(8,2) NOT NULL DEFAULT 100.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optional Services Table (Based on Real Services)
CREATE TABLE optional_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('movement', 'loading', 'transportation', 'customs', 'handling')),
    pricing_type TEXT NOT NULL CHECK (pricing_type IN ('fixed', 'hourly', 'per_event', 'on_request')),
    rate DECIMAL(10,2), -- NULL for 'on_request' services
    unit TEXT, -- 'per hour', 'per event', etc.
    time_restriction TEXT, -- e.g., '18:00–06:30'
    is_free BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotes Table (Enhanced for Real Use)
CREATE TABLE quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_number TEXT NOT NULL UNIQUE,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    warehouse_location TEXT NOT NULL DEFAULT 'Building No. 22, Road 401, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain',
    area_requested DECIMAL(8,2) NOT NULL,
    area_chargeable DECIMAL(8,2) NOT NULL,
    area_band_name TEXT NOT NULL,
    tenure TEXT NOT NULL,
    lease_start DATE NOT NULL,
    lease_end DATE NOT NULL,
    lease_duration_months DECIMAL(4,2) NOT NULL,
    monthly_rate_per_sqm DECIMAL(6,3) NOT NULL,
    daily_rate_per_sqm DECIMAL(6,3) NOT NULL,
    monthly_base_rent DECIMAL(10,2) NOT NULL,
    total_base_rent DECIMAL(10,2) NOT NULL,
    ewa_type TEXT NOT NULL CHECK (ewa_type IN ('house_load', 'dedicated_meter')),
    ewa_monthly_estimate DECIMAL(10,2) DEFAULT 0,
    ewa_total_estimate DECIMAL(10,2) DEFAULT 0,
    ewa_one_off_costs DECIMAL(10,2) DEFAULT 0,
    optional_services_total DECIMAL(10,2) DEFAULT 0,
    optional_services_details JSONB DEFAULT '{}',
    subtotal DECIMAL(10,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    vat_percentage DECIMAL(5,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    grand_total DECIMAL(10,2) NOT NULL,
    payment_terms TEXT DEFAULT 'Rent payable in advance on or before the first day of the lease month',
    quote_valid_until DATE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'expired')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert System Settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('default_vat_rate', '10', 'Default VAT percentage'),
('minimum_charge', '100', 'Minimum charge in BHD'),
('quote_validity_days', '30', 'Number of days quotes are valid'),
('warehouse_location', 'Building No. 22, Road 401, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain', 'Default warehouse location'),
('company_name', 'Sitra Warehouse', 'Company name for quotes'),
('contact_email', 'info@sitra-warehouse.com', 'Contact email'),
('contact_phone', '+973 1234 5678', 'Contact phone number');

-- Insert Space Types
INSERT INTO space_types (name, description, sort_order) VALUES
('Ground Floor', 'Ground floor warehouse space', 1),
('Mezzanine', 'Mezzanine level warehouse space', 2);

-- Insert Office Pricing
INSERT INTO office_pricing (space_type_id, tenure, monthly_rate, daily_rate, description) VALUES
((SELECT id FROM space_types WHERE name = 'Ground Floor'), 'Short', 200.00, 6.67, 'Office space for Ground Floor - Short term'),
((SELECT id FROM space_types WHERE name = 'Ground Floor'), 'Long', 180.00, 6.00, 'Office space for Ground Floor - Long term'),
((SELECT id FROM space_types WHERE name = 'Ground Floor'), 'Very Short', 200.00, 6.67, 'Office space for Ground Floor - Very Short term'),
((SELECT id FROM space_types WHERE name = 'Mezzanine'), 'Short', 180.00, 6.00, 'Office space for Mezzanine - Short term'),
((SELECT id FROM space_types WHERE name = 'Mezzanine'), 'Long', 160.00, 5.33, 'Office space for Mezzanine - Long term'),
((SELECT id FROM space_types WHERE name = 'Mezzanine'), 'Very Short', 180.00, 6.00, 'Office space for Mezzanine - Very Short term');

-- Insert Real Pricing Data
INSERT INTO pricing_rates (space_type_id, area_band_name, area_band_min, area_band_max, tenure, tenure_description, monthly_rate_per_sqm, daily_rate_per_sqm, min_chargeable_area, package_starting_bhd) VALUES
-- Ground Floor - Small units
((SELECT id FROM space_types WHERE name = 'Ground Floor'), 'Small units', 1, 999, 'Short', 'Less than One Year', 3.500, 0.117, 30, 105),
((SELECT id FROM space_types WHERE name = 'Ground Floor'), 'Small units', 1, 999, 'Long', 'More or equal to 1 Year', 3.000, 0.100, 35, 105),

-- Ground Floor - 1,000–1,499 m²
((SELECT id FROM space_types WHERE name = 'Ground Floor'), '1,000–1,499 m²', 1000, 1499, 'Short', 'Less than One Year', 3.000, 0.100, 1000, 3000),
((SELECT id FROM space_types WHERE name = 'Ground Floor'), '1,000–1,499 m²', 1000, 1499, 'Long', 'More or equal to 1 Year', 2.800, 0.093, 1000, 2800),

-- Ground Floor - 1,500 m² and above
((SELECT id FROM space_types WHERE name = 'Ground Floor'), '1,500 m² and above', 1500, NULL, 'Short', 'Less than One Year', 2.800, 0.093, 1500, 4200),
((SELECT id FROM space_types WHERE name = 'Ground Floor'), '1,500 m² and above', 1500, NULL, 'Long', 'More or equal to 1 Year', 2.600, 0.087, 1500, 3900),

-- Ground Floor - Very Short Special
((SELECT id FROM space_types WHERE name = 'Ground Floor'), 'VERY SHORT SPECIAL', 1, 999, 'Very Short', 'Special Rate', 4.500, 0.150, 25, 112),

-- Mezzanine - Small units
((SELECT id FROM space_types WHERE name = 'Mezzanine'), 'Small units', 1, 999, 'Short', 'Less than One Year', 2.800, 0.093, 30, 84),
((SELECT id FROM space_types WHERE name = 'Mezzanine'), 'Small units', 1, 999, 'Long', 'More or equal to 1 Year', 2.400, 0.080, 35, 84),

-- Mezzanine - 1,000–1,499 m²
((SELECT id FROM space_types WHERE name = 'Mezzanine'), '1,000–1,499 m²', 1000, 1499, 'Short', 'Less than One Year', 2.400, 0.080, 1000, 2400),
((SELECT id FROM space_types WHERE name = 'Mezzanine'), '1,000–1,499 m²', 1000, 1499, 'Long', 'More or equal to 1 Year', 2.240, 0.074, 1000, 2240),

-- Mezzanine - 1,500 m² and above
((SELECT id FROM space_types WHERE name = 'Mezzanine'), '1,500 m² and above', 1500, NULL, 'Short', 'Less than One Year', 2.240, 0.074, 1500, 3360),
((SELECT id FROM space_types WHERE name = 'Mezzanine'), '1,500 m² and above', 1500, NULL, 'Long', 'More or equal to 1 Year', 2.080, 0.070, 1500, 3120),

-- Mezzanine - Very Short Special
((SELECT id FROM space_types WHERE name = 'Mezzanine'), 'VERY SHORT SPECIAL', 1, 999, 'Very Short', 'Special Rate', 3.600, 0.120, 25, 90);

-- Insert EWA Settings
INSERT INTO ewa_settings (
    house_load_description,
    heavy_usage_description,
    government_tariff_per_kwh,
    estimated_fixed_monthly_charges,
    estimated_meter_deposit,
    estimated_installation_fee
) VALUES (
    'House-load for lighting and low-power office devices (phones, laptops/PCs). No EWA application or connection needed.',
    'Heavy usage / Dedicated meter: EWA billed separately at government tariff (per kWh) plus fixed monthly charges and one-off fees/deposit.',
    0.045,
    15.0,
    50.0,
    100.0
);

-- Insert Optional Services
INSERT INTO optional_services (name, description, category, pricing_type, rate, unit, time_restriction, is_free, active) VALUES
-- Movement services
('Goods Movement (Day)', 'Free access for moving goods during business hours', 'movement', 'fixed', 0, 'per movement', '07:00–18:00', true, true),
('Goods Movement (Night)', 'After-hours movement service', 'movement', 'hourly', 50, 'per hour', '18:00–06:30', false, true),

-- Loading & Unloading
('Loading & Unloading', 'Professional loading and unloading service', 'loading', 'on_request', NULL, 'on request', NULL, false, true),

-- Transportation
('Transportation', 'Transportation services', 'transportation', 'on_request', NULL, 'on request', NULL, false, true),
('Last-mile Delivery', 'Final delivery to customer location', 'transportation', 'on_request', NULL, 'on request', NULL, false, true),

-- Customs & Freight
('Freight Forwarding', 'Freight forwarding services', 'customs', 'on_request', NULL, 'on request', NULL, false, true),
('Customs Clearance', 'Import/export customs processing', 'customs', 'on_request', NULL, 'on request', NULL, false, true),

-- Warehouse Handling
('Warehouse Handling', 'Warehouse handling and value-added services', 'handling', 'on_request', NULL, 'on request', NULL, false, true);

-- Create Indexes
CREATE INDEX idx_pricing_rates_space_tenure ON pricing_rates(space_type_id, area_band_min, area_band_max, tenure, active);
CREATE INDEX idx_office_pricing_space_tenure ON office_pricing(space_type_id, tenure, active);
CREATE INDEX idx_quotes_status_date ON quotes(status, created_at DESC);
CREATE INDEX idx_quotes_client ON quotes(client_name, client_email);

-- Create Functions for Auto-updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create Triggers
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_space_types_updated_at BEFORE UPDATE ON space_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_office_pricing_updated_at BEFORE UPDATE ON office_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_rates_updated_at BEFORE UPDATE ON pricing_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ewa_settings_updated_at BEFORE UPDATE ON ewa_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_optional_services_updated_at BEFORE UPDATE ON optional_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate Quote Number Function
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    -- Get current date in YYYYMMDD format
    SELECT TO_CHAR(NOW(), 'YYYYMMDD') INTO new_number;
    
    -- Get count of quotes created today
    SELECT COUNT(*) + 1 INTO counter
    FROM quotes 
    WHERE DATE(created_at) = CURRENT_DATE;
    
    -- Format: SW-YYYYMMDD-001 (SW = Sitra Warehouse)
    RETURN 'SW-' || new_number || '-' || LPAD(counter::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
