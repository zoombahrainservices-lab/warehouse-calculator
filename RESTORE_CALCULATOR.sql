-- ============================================
-- RESTORE SITRA WAREHOUSE CALCULATOR DATABASE
-- ============================================
-- This will fix your calculator by creating all required tables

-- 1. Create EWA Settings Table
DROP TABLE IF EXISTS ewa_settings CASCADE;
CREATE TABLE ewa_settings (
  id TEXT PRIMARY KEY,
  house_load_description TEXT NOT NULL,
  dedicated_meter_description TEXT NOT NULL,
  estimated_setup_deposit REAL NOT NULL DEFAULT 0,
  estimated_installation_fee REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO ewa_settings (
  id,
  house_load_description,
  dedicated_meter_description,
  estimated_setup_deposit,
  estimated_installation_fee
) VALUES (
  'ewa-settings-1',
  'Shared electrical connection with estimated monthly charges',
  'Dedicated electrical meter with actual consumption billing',
  500.0,
  1000.0
);

-- 2. Create Pricing Rates Table
DROP TABLE IF EXISTS pricing_rates CASCADE;
CREATE TABLE pricing_rates (
  id TEXT PRIMARY KEY,
  space_type TEXT NOT NULL,
  area_band_name TEXT NOT NULL,
  area_band_min REAL NOT NULL,
  area_band_max REAL,
  tenure TEXT NOT NULL CHECK (tenure IN ('Short', 'Long', 'Very Short')),
  tenure_description TEXT NOT NULL,
  monthly_rate_per_sqm REAL NOT NULL,
  daily_rate_per_sqm REAL NOT NULL,
  min_chargeable_area REAL NOT NULL,
  package_starting_bhd REAL,
  package_range_from REAL,
  package_range_to REAL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert Ground Floor Pricing Rates
INSERT INTO pricing_rates (
  id, space_type, area_band_name, area_band_min, area_band_max, tenure, tenure_description,
  monthly_rate_per_sqm, daily_rate_per_sqm, min_chargeable_area, active
) VALUES 
-- Ground Floor - Short Term
('gf-small-short', 'Ground Floor', 'Small units', 0, 999, 'Short', '1-11 months', 3.5, 0.12, 100, true),
('gf-medium-short', 'Ground Floor', '1,000–1,499 m²', 1000, 1499, 'Short', '1-11 months', 3.2, 0.11, 1000, true),
('gf-large-short', 'Ground Floor', '1,500–2,999 m²', 1500, 2999, 'Short', '1-11 months', 3.0, 0.10, 1500, true),
('gf-xlarge-short', 'Ground Floor', '3,000+ m²', 3000, null, 'Short', '1-11 months', 2.8, 0.09, 3000, true),

-- Ground Floor - Long Term
('gf-small-long', 'Ground Floor', 'Small units', 0, 999, 'Long', '12+ months', 3.0, 0.10, 100, true),
('gf-medium-long', 'Ground Floor', '1,000–1,499 m²', 1000, 1499, 'Long', '12+ months', 2.8, 0.09, 1000, true),
('gf-large-long', 'Ground Floor', '1,500–2,999 m²', 1500, 2999, 'Long', '12+ months', 2.6, 0.09, 1500, true),
('gf-xlarge-long', 'Ground Floor', '3,000+ m²', 3000, null, 'Long', '12+ months', 2.4, 0.08, 3000, true),

-- Ground Floor - Very Short Term
('gf-small-vshort', 'Ground Floor', 'Small units', 0, 999, 'Very Short', '1-30 days', 4.0, 0.15, 100, true),
('gf-medium-vshort', 'Ground Floor', '1,000–1,499 m²', 1000, 1499, 'Very Short', '1-30 days', 3.8, 0.14, 1000, true),
('gf-large-vshort', 'Ground Floor', '1,500–2,999 m²', 1500, 2999, 'Very Short', '1-30 days', 3.6, 0.13, 1500, true),
('gf-xlarge-vshort', 'Ground Floor', '3,000+ m²', 3000, null, 'Very Short', '1-30 days', 3.4, 0.12, 3000, true),

-- Mezzanine - Short Term
('mz-small-short', 'Mezzanine', 'Small units', 0, 999, 'Short', '1-11 months', 4.0, 0.14, 100, true),
('mz-medium-short', 'Mezzanine', '1,000–1,499 m²', 1000, 1499, 'Short', '1-11 months', 3.7, 0.13, 1000, true),
('mz-large-short', 'Mezzanine', '1,500–2,999 m²', 1500, 2999, 'Short', '1-11 months', 3.5, 0.12, 1500, true),
('mz-xlarge-short', 'Mezzanine', '3,000+ m²', 3000, null, 'Short', '1-11 months', 3.3, 0.11, 3000, true),

-- Mezzanine - Long Term
('mz-small-long', 'Mezzanine', 'Small units', 0, 999, 'Long', '12+ months', 3.5, 0.12, 100, true),
('mz-medium-long', 'Mezzanine', '1,000–1,499 m²', 1000, 1499, 'Long', '12+ months', 3.3, 0.11, 1000, true),
('mz-large-long', 'Mezzanine', '1,500–2,999 m²', 1500, 2999, 'Long', '12+ months', 3.1, 0.10, 1500, true),
('mz-xlarge-long', 'Mezzanine', '3,000+ m²', 3000, null, 'Long', '12+ months', 2.9, 0.09, 3000, true),

-- Mezzanine - Very Short Term
('mz-small-vshort', 'Mezzanine', 'Small units', 0, 999, 'Very Short', '1-30 days', 4.5, 0.16, 100, true),
('mz-medium-vshort', 'Mezzanine', '1,000–1,499 m²', 1000, 1499, 'Very Short', '1-30 days', 4.3, 0.15, 1000, true),
('mz-large-vshort', 'Mezzanine', '1,500–2,999 m²', 1500, 2999, 'Very Short', '1-30 days', 4.1, 0.14, 1500, true),
('mz-xlarge-vshort', 'Mezzanine', '3,000+ m²', 3000, null, 'Very Short', '1-30 days', 3.9, 0.13, 3000, true);

-- 3. Create Optional Services Table
DROP TABLE IF EXISTS optional_services CASCADE;
CREATE TABLE optional_services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('movement', 'loading', 'transportation', 'customs', 'handling')),
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('fixed', 'hourly', 'per_event', 'on_request')),
  rate REAL,
  unit TEXT,
  time_restriction TEXT,
  is_free BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert Optional Services
INSERT INTO optional_services (
  id, name, description, category, pricing_type, rate, unit, is_free, active
) VALUES 
('forklift-service', 'Forklift Service', 'Professional forklift operation for loading/unloading', 'movement', 'hourly', 25.0, 'per hour', false, true),
('crane-service', 'Crane Service', 'Heavy lifting crane service for large items', 'movement', 'hourly', 45.0, 'per hour', false, true),
('loading-supervision', 'Loading Supervision', 'Professional supervision during loading operations', 'loading', 'per_event', 50.0, 'per session', false, true),
('customs-clearance', 'Customs Clearance Support', 'Assistance with customs documentation and clearance', 'customs', 'on_request', null, 'quoted separately', false, true),
('packaging-service', 'Professional Packaging', 'Expert packaging and wrapping services', 'handling', 'per_event', 15.0, 'per item', false, true),
('basic-handling', 'Basic Material Handling', 'Standard loading and unloading assistance', 'handling', 'per_event', 0.0, 'included', true, true);

-- 4. Ensure System Settings exist
INSERT INTO system_settings (id, setting_key, setting_value, description) VALUES 
('office-monthly-rate', 'office_monthly_rate', '200', 'Monthly rate for office space in BHD'),
('minimum-charge', 'minimum_charge', '50', 'Minimum monthly charge in BHD'),
('days-per-month', 'days_per_month', '30', 'Days per month for calculations'),
('office-free-threshold', 'office_free_threshold', '1000', 'Area threshold for free office (sqm)'),
('vat-rate', 'vat_rate', '10', 'VAT percentage rate')
ON CONFLICT (id) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();

-- 5. Verify all tables are working
SELECT 
  'SUCCESS! Calculator database restored!' as status,
  (SELECT COUNT(*) FROM pricing_rates) as pricing_rates_count,
  (SELECT COUNT(*) FROM ewa_settings) as ewa_settings_count,
  (SELECT COUNT(*) FROM optional_services) as optional_services_count,
  (SELECT COUNT(*) FROM system_settings) as system_settings_count;
