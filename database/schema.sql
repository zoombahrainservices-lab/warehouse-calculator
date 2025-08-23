-- Warehouse Pricing Calculator Database Schema
-- Run this in your Supabase SQL Editor

-- Enable Row Level Security (Skip - not needed for basic setup)

-- Pricing Rates Table
CREATE TABLE pricing_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    size_band INTEGER NOT NULL,
    tenure TEXT NOT NULL CHECK (tenure IN ('Short', 'Long')),
    monthly_rate_per_sqm DECIMAL(10,3) NOT NULL,
    min_chargeable_area INTEGER NOT NULL,
    space_type TEXT NOT NULL CHECK (space_type IN ('Ground Floor', 'Mezzanine', 'Office')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EWA Settings Table
CREATE TABLE ewa_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    included_kw_cap DECIMAL(8,2) NOT NULL DEFAULT 2.0,
    included_kwh_cap DECIMAL(8,2) NOT NULL DEFAULT 100.0,
    tariff_per_kwh DECIMAL(8,4) NOT NULL DEFAULT 0.045,
    fixed_monthly_charges DECIMAL(8,2) NOT NULL DEFAULT 15.0,
    meter_deposit DECIMAL(8,2) NOT NULL DEFAULT 50.0,
    meter_installation_fee DECIMAL(8,2) NOT NULL DEFAULT 100.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optional Services Table
CREATE TABLE optional_services (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    rate DECIMAL(10,2) NOT NULL,
    unit TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('loading', 'afterhours', 'logistics', 'other')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotes Table
CREATE TABLE quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_number TEXT NOT NULL UNIQUE,
    client_name TEXT NOT NULL,
    client_email TEXT,
    warehouse TEXT NOT NULL DEFAULT 'Sitra Warehouse',
    space_type TEXT NOT NULL,
    area_input DECIMAL(8,2) NOT NULL,
    chargeable_area DECIMAL(8,2) NOT NULL,
    tenure TEXT NOT NULL CHECK (tenure IN ('Short', 'Long')),
    lease_start DATE NOT NULL,
    lease_end DATE NOT NULL,
    months_full INTEGER NOT NULL DEFAULT 0,
    days_extra INTEGER NOT NULL DEFAULT 0,
    base_rent DECIMAL(10,2) NOT NULL,
    ewa_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    ewa_mode TEXT NOT NULL CHECK (ewa_mode IN ('house_load', 'dedicated_meter')),
    optional_services JSONB DEFAULT '{}',
    subtotal DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    grand_total DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Sample Data
INSERT INTO pricing_rates (size_band, tenure, monthly_rate_per_sqm, min_chargeable_area, space_type) VALUES
(500, 'Short', 2.500, 30, 'Ground Floor'),
(500, 'Long', 3.000, 30, 'Ground Floor'),
(1000, 'Short', 3.000, 50, 'Ground Floor'),
(1000, 'Long', 2.800, 50, 'Ground Floor'),
(1500, 'Short', 2.800, 75, 'Ground Floor'),
(1500, 'Long', 2.600, 75, 'Ground Floor'),
(2000, 'Short', 2.600, 100, 'Ground Floor'),
(2000, 'Long', 2.400, 100, 'Ground Floor');

-- Insert Default EWA Settings
INSERT INTO ewa_settings (included_kw_cap, included_kwh_cap, tariff_per_kwh, fixed_monthly_charges, meter_deposit, meter_installation_fee) VALUES
(2.0, 100.0, 0.045, 15.0, 50.0, 100.0);

-- Insert Sample Optional Services
INSERT INTO optional_services (name, description, rate, unit, category, active) VALUES
('Loading/Unloading', 'Standard loading and unloading service', 25.00, 'per event', 'loading', true),
('After-hours Movement', 'Movement services between 18:00-06:30', 50.00, 'per hour', 'afterhours', true),
('Last Mile Delivery', 'Final delivery to customer location', 30.00, 'per delivery', 'logistics', true),
('Customs Clearance', 'Import/export customs processing', 75.00, 'per shipment', 'logistics', true),
('Storage Racking', 'Additional storage rack rental', 15.00, 'per month', 'other', true);

-- Create Indexes for Performance
CREATE INDEX idx_pricing_rates_lookup ON pricing_rates(size_band, tenure, space_type);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);

-- Create Functions for Auto-updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create Triggers
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
    
    -- Format: WH-YYYYMMDD-001
    RETURN 'WH-' || new_number || '-' || LPAD(counter::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
