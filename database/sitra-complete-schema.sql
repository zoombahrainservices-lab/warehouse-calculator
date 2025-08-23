-- COMPLETE SITRA WAREHOUSE CALCULATOR SCHEMA
-- Exact pricing from client price list

-- Drop existing tables
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS optional_services CASCADE;
DROP TABLE IF EXISTS ewa_settings CASCADE;
DROP TABLE IF EXISTS pricing_rates CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;

-- System Settings Table - Configurable values
CREATE TABLE system_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key TEXT NOT NULL UNIQUE,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing Rates Table - EXACT from price list
CREATE TABLE pricing_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    area_band_name TEXT NOT NULL,
    area_band_min INTEGER NOT NULL,
    area_band_max INTEGER, -- NULL for unlimited
    space_type TEXT NOT NULL CHECK (space_type IN ('Ground Floor', 'Mezzanine')),
    tenure TEXT NOT NULL CHECK (tenure IN ('Short', 'Long', 'Very Short')),
    tenure_description TEXT NOT NULL,
    monthly_rate_per_sqm DECIMAL(6,3) NOT NULL,
    daily_rate_per_sqm DECIMAL(6,3) NOT NULL,
    min_chargeable_area INTEGER NOT NULL,
    package_starting_bhd DECIMAL(8,3) NOT NULL,
    package_range_from DECIMAL(8,0),
    package_range_to DECIMAL(8,0),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EWA Settings
CREATE TABLE ewa_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_load_description TEXT NOT NULL,
    dedicated_meter_description TEXT NOT NULL,
    estimated_setup_deposit DECIMAL(8,2) DEFAULT 100.00,
    estimated_installation_fee DECIMAL(8,2) DEFAULT 150.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optional Services
CREATE TABLE optional_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    pricing_type TEXT NOT NULL CHECK (pricing_type IN ('fixed', 'on_request', 'free_conditional')),
    rate DECIMAL(10,2),
    unit TEXT,
    time_restriction TEXT,
    conditions TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotes Table
CREATE TABLE quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_number TEXT NOT NULL UNIQUE,
    client_name TEXT NOT NULL,
    client_email TEXT,
    
    -- Space Details
    space_type TEXT NOT NULL,
    area_requested DECIMAL(8,2) NOT NULL,
    area_chargeable DECIMAL(8,2) NOT NULL,
    area_band_name TEXT NOT NULL,
    
    -- Pricing
    tenure TEXT NOT NULL,
    lease_duration_months DECIMAL(4,2) NOT NULL,
    monthly_rate_per_sqm DECIMAL(6,3) NOT NULL,
    monthly_warehouse_rent DECIMAL(10,2) NOT NULL,
    total_warehouse_rent DECIMAL(10,2) NOT NULL,
    
    -- Office
    office_included BOOLEAN DEFAULT false,
    office_monthly_cost DECIMAL(8,2) DEFAULT 0,
    office_total_cost DECIMAL(10,2) DEFAULT 0,
    
    -- EWA
    ewa_type TEXT NOT NULL CHECK (ewa_type IN ('house_load', 'dedicated_meter')),
    ewa_setup_costs DECIMAL(8,2) DEFAULT 0,
    
    -- Services & Totals
    optional_services_total DECIMAL(10,2) DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    grand_total DECIMAL(10,2) NOT NULL,
    
    -- Quote Info
    monthly_breakdown JSONB,
    suggestions JSONB,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INSERT SYSTEM SETTINGS
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('office_monthly_rate', '200', 'Office space monthly rate in BHD'),
('minimum_charge', '100', 'Minimum chargeable amount in BHD'),
('days_per_month', '30', 'Number of days used for pro-rata calculations'),
('office_free_threshold', '3000', 'Monthly bill threshold above which office is free');

-- INSERT EXACT PRICING DATA FROM PRICE LIST

-- GROUND FLOOR PRICING
INSERT INTO pricing_rates (area_band_name, area_band_min, area_band_max, space_type, tenure, tenure_description, monthly_rate_per_sqm, daily_rate_per_sqm, min_chargeable_area, package_starting_bhd, package_range_from, package_range_to) VALUES

-- Small units
('Small units', 1, 999, 'Ground Floor', 'Short', 'Less than One Year', 3.500, 0.117, 30, 105.000, NULL, NULL),
('Small units', 1, 999, 'Ground Floor', 'Long', 'More or equal to 1 Year', 3.000, 0.100, 35, 105.000, NULL, NULL),

-- 1,000–1,499 m²
('1,000–1,499 m²', 1000, 1499, 'Ground Floor', 'Short', 'Less than One Year', 3.000, 0.100, 1000, 3000.000, 3000, 4497),
('1,000–1,499 m²', 1000, 1499, 'Ground Floor', 'Long', 'More or equal to 1 Year', 2.800, 0.093, 1000, 2800.000, 2800, 4197),

-- 1,500 m² and above
('1,500 m² and above', 1500, NULL, 'Ground Floor', 'Short', 'Less than One Year', 2.800, 0.093, 1500, 4200.000, NULL, NULL),
('1,500 m² and above', 1500, NULL, 'Ground Floor', 'Long', 'More or equal to 1 Year', 2.600, 0.087, 1500, 3900.000, NULL, NULL),

-- Very Short Special
('Very Short Special', 1, 999, 'Ground Floor', 'Very Short', 'Special Rate', 4.500, 0.150, 25, 112.500, NULL, NULL);

-- MEZZANINE PRICING (20% cheaper than Ground Floor)
INSERT INTO pricing_rates (area_band_name, area_band_min, area_band_max, space_type, tenure, tenure_description, monthly_rate_per_sqm, daily_rate_per_sqm, min_chargeable_area, package_starting_bhd, package_range_from, package_range_to) VALUES

-- Small units (20% discount)
('Small units', 1, 999, 'Mezzanine', 'Short', 'Less than One Year', 2.800, 0.094, 30, 84.000, NULL, NULL),
('Small units', 1, 999, 'Mezzanine', 'Long', 'More or equal to 1 Year', 2.400, 0.080, 35, 84.000, NULL, NULL),

-- 1,000–1,499 m² (20% discount)
('1,000–1,499 m²', 1000, 1499, 'Mezzanine', 'Short', 'Less than One Year', 2.400, 0.080, 1000, 2400.000, 2400, 3597),
('1,000–1,499 m²', 1000, 1499, 'Mezzanine', 'Long', 'More or equal to 1 Year', 2.240, 0.075, 1000, 2240.000, 2240, 3357),

-- 1,500 m² and above (20% discount)
('1,500 m² and above', 1500, NULL, 'Mezzanine', 'Short', 'Less than One Year', 2.240, 0.075, 1500, 3360.000, NULL, NULL),
('1,500 m² and above', 1500, NULL, 'Mezzanine', 'Long', 'More or equal to 1 Year', 2.080, 0.070, 1500, 3120.000, NULL, NULL),

-- Very Short Special (20% discount)
('Very Short Special', 1, 999, 'Mezzanine', 'Very Short', 'Special Rate', 3.600, 0.120, 25, 90.000, NULL, NULL);

-- OFFICE PRICING - Handled as 200 BHD fixed add-on, not in pricing_rates table

-- EWA Settings
INSERT INTO ewa_settings (house_load_description, dedicated_meter_description, estimated_setup_deposit, estimated_installation_fee) VALUES
('House-load for lighting and low-power office devices (phones, laptops/PCs). No EWA application or connection needed.',
'For heavier power needs, we can install a dedicated EWA meter. Tenant pays actual consumption and any meter fees. EWA will send bills directly.',
100.00, 150.00);

-- Optional Services
INSERT INTO optional_services (name, description, category, pricing_type, conditions, active) VALUES
('Loading & Unloading', 'Professional loading and unloading service', 'logistics', 'on_request', 'Pricing provided on request based on requirements', true),
('Transportation and Last-mile Delivery', 'Transportation services and final delivery', 'logistics', 'on_request', 'Pricing varies by distance and cargo type', true),
('Freight Forwarding & Customs Clearance', 'Import/export documentation and customs processing', 'logistics', 'on_request', 'Pricing based on shipment value and complexity', true),
('Warehouse Handling and Value-added Services', 'Additional warehouse operations and services', 'handling', 'on_request', 'Custom pricing based on service requirements', true),
('After-hours Movement', 'Goods movement between 18:00–06:30', 'movement', 'on_request', 'Nominal service charge applies', true),
('Free Day Movement', 'Free access for moving goods 07:00–18:00', 'movement', 'free_conditional', 'Included during lease period', true);

-- Create Indexes
CREATE INDEX idx_pricing_rates_lookup ON pricing_rates(space_type, area_band_min, area_band_max, tenure, active);
CREATE INDEX idx_quotes_created ON quotes(created_at DESC);

-- Quote Number Generator
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    SELECT TO_CHAR(NOW(), 'YYYYMMDD') INTO new_number;
    SELECT COUNT(*) + 1 INTO counter FROM quotes WHERE DATE(created_at) = CURRENT_DATE;
    RETURN 'SW-' || new_number || '-' || LPAD(counter::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
