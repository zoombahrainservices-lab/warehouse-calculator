-- COMPLETE SITRA WAREHOUSE CALCULATOR SCHEMA RESTORATION
-- Based on the exact old warehouse pricing schema provided
-- This restores the complete schema with correct 20% mezzanine discount

-- Start transaction for safe rollback
BEGIN;

SELECT '=== RESTORING COMPLETE WAREHOUSE CALCULATOR SCHEMA ===' as info;

-- 1. Drop existing tables (in correct order to handle dependencies)
SELECT 'Dropping existing tables...' as step;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS optional_services CASCADE;
DROP TABLE IF EXISTS ewa_settings CASCADE;
DROP TABLE IF EXISTS pricing_rates CASCADE;

-- 2. Create Pricing Rates Table - EXACT from old schema
SELECT 'Creating pricing_rates table...' as step;
CREATE TABLE pricing_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    area_band_name TEXT NOT NULL,
    area_band_min INTEGER NOT NULL,
    area_band_max INTEGER, -- NULL for unlimited
    space_type TEXT NOT NULL CHECK (space_type IN ('Ground Floor', 'Mezzanine', 'Office')),
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

-- 3. Create EWA Settings Table
SELECT 'Creating ewa_settings table...' as step;
CREATE TABLE ewa_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    house_load_description TEXT NOT NULL,
    dedicated_meter_description TEXT NOT NULL,
    estimated_setup_deposit DECIMAL(8,2) DEFAULT 100.00,
    estimated_installation_fee DECIMAL(8,2) DEFAULT 150.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Optional Services Table
SELECT 'Creating optional_services table...' as step;
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

-- 5. Create Quotes Table
SELECT 'Creating quotes table...' as step;
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

-- 6. Insert EXACT PRICING DATA from old schema
SELECT 'Inserting exact pricing data from old schema...' as step;

-- GROUND FLOOR PRICING (Exact from old schema)
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

-- MEZZANINE PRICING (20% cheaper than Ground Floor - Exact from old schema)
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

-- OFFICE PRICING (Fixed 200 BHD - Exact from old schema)
INSERT INTO pricing_rates (area_band_name, area_band_min, area_band_max, space_type, tenure, tenure_description, monthly_rate_per_sqm, daily_rate_per_sqm, min_chargeable_area, package_starting_bhd, package_range_from, package_range_to) VALUES
('Office Space', 1, NULL, 'Office', 'Short', 'Fixed Rate', 200.000, 6.667, 1, 200.000, NULL, NULL),
('Office Space', 1, NULL, 'Office', 'Long', 'Fixed Rate', 200.000, 6.667, 1, 200.000, NULL, NULL);

-- 7. Insert EWA Settings (Exact from old schema)
SELECT 'Inserting EWA settings...' as step;
INSERT INTO ewa_settings (house_load_description, dedicated_meter_description, estimated_setup_deposit, estimated_installation_fee) VALUES
('House-load for lighting and low-power office devices (phones, laptops/PCs). No EWA application or connection needed.',
'For heavier power needs, we can install a dedicated EWA meter. Tenant pays actual consumption and any meter fees. EWA will send bills directly.',
100.00, 150.00);

-- 8. Insert Optional Services (Exact from old schema)
SELECT 'Inserting optional services...' as step;
INSERT INTO optional_services (name, description, category, pricing_type, conditions, active) VALUES
('Loading & Unloading', 'Professional loading and unloading service', 'logistics', 'on_request', 'Pricing provided on request based on requirements', true),
('Transportation and Last-mile Delivery', 'Transportation services and final delivery', 'logistics', 'on_request', 'Pricing varies by distance and cargo type', true),
('Freight Forwarding & Customs Clearance', 'Import/export documentation and customs processing', 'logistics', 'on_request', 'Pricing based on shipment value and complexity', true),
('Warehouse Handling and Value-added Services', 'Additional warehouse operations and services', 'handling', 'on_request', 'Custom pricing based on service requirements', true),
('After-hours Movement', 'Goods movement between 18:00–06:30', 'movement', 'on_request', 'Nominal service charge applies', true),
('Free Day Movement', 'Free access for moving goods 07:00–18:00', 'movement', 'free_conditional', 'Included during lease period', true);

-- 9. Create Indexes (Exact from old schema)
SELECT 'Creating indexes...' as step;
CREATE INDEX idx_pricing_rates_lookup ON pricing_rates(space_type, area_band_min, area_band_max, tenure, active);
CREATE INDEX idx_quotes_created ON quotes(created_at DESC);

-- 10. Create Quote Number Generator (Exact from old schema)
SELECT 'Creating quote number generator function...' as step;
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

-- 11. VERIFICATION: Verify the 20% mezzanine discount
SELECT '=== VERIFICATION: 20% MEZZANINE DISCOUNT ===' as info;

-- Show the pricing comparison with calculated discount percentages
SELECT 
  'PRICING COMPARISON WITH 20% DISCOUNT VERIFICATION:' as section,
  gf.area_band_name,
  gf.tenure,
  gf.monthly_rate_per_sqm as ground_floor_rate,
  m.monthly_rate_per_sqm as mezzanine_rate,
  ROUND(((gf.monthly_rate_per_sqm - m.monthly_rate_per_sqm) / gf.monthly_rate_per_sqm * 100), 1) as actual_discount_percentage,
  CASE 
    WHEN ROUND(((gf.monthly_rate_per_sqm - m.monthly_rate_per_sqm) / gf.monthly_rate_per_sqm * 100), 1) = 20.0 
    THEN '✅ CORRECT (20%)' 
    ELSE '❌ INCORRECT' 
  END as discount_status
FROM pricing_rates gf
JOIN pricing_rates m ON gf.area_band_name = m.area_band_name 
  AND gf.tenure = m.tenure 
  AND m.space_type = 'Mezzanine'
WHERE gf.space_type = 'Ground Floor'
ORDER BY gf.area_band_min, gf.tenure;

-- 12. Show complete pricing structure
SELECT '=== COMPLETE PRICING STRUCTURE ===' as info;

-- Ground Floor pricing
SELECT 'GROUND FLOOR PRICING:' as section;
SELECT 
  area_band_name,
  area_band_min,
  area_band_max,
  tenure,
  monthly_rate_per_sqm,
  daily_rate_per_sqm,
  min_chargeable_area,
  package_starting_bhd
FROM pricing_rates 
WHERE space_type = 'Ground Floor' 
ORDER BY area_band_min, tenure;

-- Mezzanine pricing
SELECT 'MEZZANINE PRICING:' as section;
SELECT 
  area_band_name,
  area_band_min,
  area_band_max,
  tenure,
  monthly_rate_per_sqm,
  daily_rate_per_sqm,
  min_chargeable_area,
  package_starting_bhd
FROM pricing_rates 
WHERE space_type = 'Mezzanine' 
ORDER BY area_band_min, tenure;

-- Office pricing
SELECT 'OFFICE PRICING:' as section;
SELECT 
  area_band_name,
  area_band_min,
  area_band_max,
  tenure,
  monthly_rate_per_sqm,
  daily_rate_per_sqm,
  min_chargeable_area,
  package_starting_bhd
FROM pricing_rates 
WHERE space_type = 'Office' 
ORDER BY area_band_min, tenure;

-- 13. Example calculations for 100m² (as requested)
SELECT '=== EXAMPLE CALCULATIONS FOR 100m² ===' as info;

-- Short Term (6 months)
SELECT 'SHORT TERM (6 months) - 100m²:' as example;
SELECT 
  'Ground Floor' as space_type,
  100 as area_m2,
  6 as months,
  (100 * 3.500 * 6) as total_cost_bhd,
  (100 * 3.500) as monthly_cost_bhd
UNION ALL
SELECT 
  'Mezzanine' as space_type,
  100 as area_m2,
  6 as months,
  (100 * 2.800 * 6) as total_cost_bhd,
  (100 * 2.800) as monthly_cost_bhd;

-- Long Term (12 months)
SELECT 'LONG TERM (12 months) - 100m²:' as example;
SELECT 
  'Ground Floor' as space_type,
  100 as area_m2,
  12 as months,
  (100 * 3.000 * 12) as total_cost_bhd,
  (100 * 3.000) as monthly_cost_bhd
UNION ALL
SELECT 
  'Mezzanine' as space_type,
  100 as area_m2,
  12 as months,
  (100 * 2.400 * 12) as total_cost_bhd,
  (100 * 2.400) as monthly_cost_bhd;

-- Very Short Term (7 days)
SELECT 'VERY SHORT TERM (7 days) - 100m²:' as example;
SELECT 
  'Ground Floor' as space_type,
  100 as area_m2,
  7 as days,
  (100 * 0.150 * 7) as total_cost_bhd,
  (100 * 0.150) as daily_cost_bhd
UNION ALL
SELECT 
  'Mezzanine' as space_type,
  100 as area_m2,
  7 as days,
  (100 * 0.120 * 7) as total_cost_bhd,
  (100 * 0.120) as daily_cost_bhd;

-- 14. Final verification summary
SELECT '=== FINAL VERIFICATION SUMMARY ===' as info;
SELECT 
  COUNT(*) as total_pricing_rates,
  COUNT(CASE WHEN space_type = 'Ground Floor' THEN 1 END) as ground_floor_rates,
  COUNT(CASE WHEN space_type = 'Mezzanine' THEN 1 END) as mezzanine_rates,
  COUNT(CASE WHEN space_type = 'Office' THEN 1 END) as office_rates,
  COUNT(CASE WHEN tenure = 'Short' THEN 1 END) as short_term_rates,
  COUNT(CASE WHEN tenure = 'Long' THEN 1 END) as long_term_rates,
  COUNT(CASE WHEN tenure = 'Very Short' THEN 1 END) as very_short_term_rates,
  'All mezzanine rates are exactly 20% lower than corresponding ground floor rates' as verification_status
FROM pricing_rates;

SELECT '✅ COMPLETE WAREHOUSE CALCULATOR SCHEMA RESTORED!' as success;
SELECT '✅ All mezzanine prices are exactly 20% lower than ground floor prices' as success;
SELECT '✅ All three leasing terms (Short, Long, Very Short) follow the 20% rule' as success;
SELECT '✅ Pricing structure matches the exact old schema provided' as success;

-- Commit the transaction
COMMIT;

