
-- FIX CALCULATOR RATES AND ADD ADMIN FUNCTIONALITY
-- This script fixes the calculator rates and adds admin panel functionality

SELECT '=== STARTING CALCULATOR RATES FIX AND ADMIN SETUP ===' as info;

-- 1. First, let's clean up and add the correct pricing rates
DELETE FROM pricing_rates WHERE space_type IS NULL OR tenure IS NULL;
DELETE FROM pricing_rates WHERE daily_rate_per_sqm IS NULL OR monthly_rate_per_sqm IS NULL;

-- 2. Add COMPLETE pricing rate matrix with corrected rates
-- GROUND FLOOR RATES (Corrected based on market analysis)

-- Small Units (1-999m²) - Fixed Price Structure
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Small units - Very Short (Daily rates for temporary storage)
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Daily rates for temporary storage (up to 30 days)', 'Small Units (1-999m²)', 1, 999, 4.500, 0.150, true, 25, 112.50),
  -- Small units - Short Term (1-11 months)
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Monthly rates for 1-11 months', 'Small Units (1-999m²)', 1, 999, 3.500, 0.117, true, 30, 105.00),
  -- Small units - Long Term (12+ months)
  (gen_random_uuid(), 'Ground Floor', 'Long', 'Monthly rates for 12+ months', 'Small Units (1-999m²)', 1, 999, 3.000, 0.100, true, 35, 105.00)
ON CONFLICT DO NOTHING;

-- Medium Units (1000-1499m²) - Volume discount
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Medium units - Very Short (Daily rates)
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Daily rates for temporary storage (up to 30 days)', 'Medium Units (1000-1499m²)', 1000, 1499, 3.800, 0.127, true, 1000, 3800.00),
  -- Medium units - Short Term (1-11 months)
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Monthly rates for 1-11 months', 'Medium Units (1000-1499m²)', 1000, 1499, 3.000, 0.100, true, 1000, 3000.00),
  -- Medium units - Long Term (12+ months)
  (gen_random_uuid(), 'Ground Floor', 'Long', 'Monthly rates for 12+ months', 'Medium Units (1000-1499m²)', 1000, 1499, 2.800, 0.093, true, 1000, 2800.00)
ON CONFLICT DO NOTHING;

-- Large Units (1500m²+) - Maximum volume discount
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Large units - Very Short (Daily rates)
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Daily rates for temporary storage (up to 30 days)', 'Large Units (1500m²+)', 1500, NULL, 3.200, 0.107, true, 1500, 4800.00),
  -- Large units - Short Term (1-11 months)
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Monthly rates for 1-11 months', 'Large Units (1500m²+)', 1500, NULL, 2.800, 0.093, true, 1500, 4200.00),
  -- Large units - Long Term (12+ months)
  (gen_random_uuid(), 'Ground Floor', 'Long', 'Monthly rates for 12+ months', 'Large Units (1500m²+)', 1500, NULL, 2.600, 0.087, true, 1500, 3900.00)
ON CONFLICT DO NOTHING;

-- MEZZANINE RATES (20% discount from Ground Floor)

-- Small Units Mezzanine (1-999m²)
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Small units - Very Short (Daily rates) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Daily rates for temporary storage (up to 30 days)', 'Small Units (1-999m²)', 1, 999, 3.600, 0.120, true, 25, 90.00),
  -- Small units - Short Term (1-11 months) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Monthly rates for 1-11 months', 'Small Units (1-999m²)', 1, 999, 2.800, 0.094, true, 30, 84.00),
  -- Small units - Long Term (12+ months) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Monthly rates for 12+ months', 'Small Units (1-999m²)', 1, 999, 2.400, 0.080, true, 35, 84.00)
ON CONFLICT DO NOTHING;

-- Medium Units Mezzanine (1000-1499m²)
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Medium units - Very Short (Daily rates) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Daily rates for temporary storage (up to 30 days)', 'Medium Units (1000-1499m²)', 1000, 1499, 3.040, 0.102, true, 1000, 3040.00),
  -- Medium units - Short Term (1-11 months) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Monthly rates for 1-11 months', 'Medium Units (1000-1499m²)', 1000, 1499, 2.400, 0.080, true, 1000, 2400.00),
  -- Medium units - Long Term (12+ months) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Monthly rates for 12+ months', 'Medium Units (1000-1499m²)', 1000, 1499, 2.240, 0.075, true, 1000, 2240.00)
ON CONFLICT DO NOTHING;

-- Large Units Mezzanine (1500m²+)
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Large units - Very Short (Daily rates) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Daily rates for temporary storage (up to 30 days)', 'Large Units (1500m²+)', 1500, NULL, 2.560, 0.086, true, 1500, 3840.00),
  -- Large units - Short Term (1-11 months) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Monthly rates for 1-11 months', 'Large Units (1500m²+)', 1500, NULL, 2.240, 0.075, true, 1500, 3360.00),
  -- Large units - Long Term (12+ months) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Monthly rates for 12+ months', 'Large Units (1500m²+)', 1500, NULL, 2.080, 0.070, true, 1500, 3120.00)
ON CONFLICT DO NOTHING;

-- 3. Update system settings with correct values
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('office_monthly_rate', '200.00', 'Monthly office rental rate in BHD'),
  ('minimum_charge', '100.00', 'Minimum charge for small areas in BHD'),
  ('days_per_month', '30', 'Number of days per month for daily rate calculations'),
  ('office_free_threshold', '3000', 'Monthly bill threshold above which office is free (m²)'),
  ('vat_rate', '10', 'Default VAT rate percentage'),
  ('currency', 'BHD', 'Default currency for all calculations'),
  ('company_name', 'Sitra Warehouse', 'Company name for quotes'),
  ('contact_email', 'info@sitra-warehouse.com', 'Contact email for inquiries'),
  ('contact_phone', '+973 1234 5678', 'Contact phone number')
ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- 4. Update EWA settings
INSERT INTO ewa_settings (
  id, house_load_description, dedicated_meter_description, 
  estimated_setup_deposit, estimated_installation_fee
) VALUES (
  gen_random_uuid(),
  'House-load electricity included in rent - up to 5kW for lighting and basic office equipment',
  'Dedicated EWA meter with separate billing - setup required for heavy power usage',
  100.00,
  150.00
) ON CONFLICT DO NOTHING;

-- 5. Add optional services with realistic pricing
INSERT INTO optional_services (
  id, name, description, category, pricing_type, rate, unit, time_restriction, conditions, active
) VALUES
  (gen_random_uuid(), 'Loading & Unloading', 'Professional loading and unloading service with forklift', 'logistics', 'fixed', 50.00, 'per hour', '07:00-18:00', 'Minimum 2 hours booking required', true),
  (gen_random_uuid(), 'Transportation', 'Transportation services within Bahrain', 'logistics', 'on_request', NULL, 'per km', '07:00-18:00', 'Pricing varies by distance and cargo type', true),
  (gen_random_uuid(), 'Customs Clearance', 'Import/export documentation and customs processing', 'logistics', 'on_request', NULL, 'per shipment', 'Business hours', 'Pricing based on shipment value and complexity', true),
  (gen_random_uuid(), 'Warehouse Handling', 'Additional warehouse operations and value-added services', 'handling', 'on_request', NULL, 'per service', '07:00-18:00', 'Custom pricing based on service requirements', true),
  (gen_random_uuid(), 'After-hours Movement', 'Goods movement between 18:00–06:30', 'movement', 'fixed', 100.00, 'per hour', '18:00-06:30', 'Minimum 1 hour booking required', true),
  (gen_random_uuid(), 'Free Day Movement', 'Free access for moving goods during business hours', 'movement', 'free_conditional', 0.00, 'included', '07:00-18:00', 'Included during lease period', true)
ON CONFLICT DO NOTHING;

-- 6. Create admin pricing management functions
CREATE OR REPLACE FUNCTION update_pricing_rate(
  rate_id UUID,
  new_monthly_rate DECIMAL(6,3),
  new_daily_rate DECIMAL(6,3),
  new_min_chargeable_area INTEGER,
  new_package_starting_bhd DECIMAL(8,3),
  new_active BOOLEAN
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE pricing_rates 
  SET 
    monthly_rate_per_sqm = new_monthly_rate,
    daily_rate_per_sqm = new_daily_rate,
    min_chargeable_area = new_min_chargeable_area,
    package_starting_bhd = new_package_starting_bhd,
    active = new_active,
    updated_at = NOW()
  WHERE id = rate_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to add new pricing rate
CREATE OR REPLACE FUNCTION add_pricing_rate(
  space_type TEXT,
  tenure TEXT,
  area_band_name TEXT,
  area_band_min INTEGER,
  area_band_max INTEGER,
  monthly_rate DECIMAL(6,3),
  daily_rate DECIMAL(6,3),
  min_chargeable_area INTEGER,
  package_starting_bhd DECIMAL(8,3)
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO pricing_rates (
    id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
    monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
  ) VALUES (
    gen_random_uuid(), space_type, tenure, 
    CASE 
      WHEN tenure = 'Very Short' THEN 'Daily rates for temporary storage (up to 30 days)'
      WHEN tenure = 'Short' THEN 'Monthly rates for 1-11 months'
      WHEN tenure = 'Long' THEN 'Monthly rates for 12+ months'
      ELSE 'Custom rate'
    END,
    area_band_name, area_band_min, area_band_max,
    monthly_rate, daily_rate, true, min_chargeable_area, package_starting_bhd
  ) RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to get pricing summary
CREATE OR REPLACE FUNCTION get_pricing_summary()
RETURNS TABLE (
  space_type TEXT,
  tenure TEXT,
  area_band_name TEXT,
  monthly_rate DECIMAL(6,3),
  daily_rate DECIMAL(6,3),
  min_area INTEGER,
  max_area INTEGER,
  package_starting DECIMAL(8,3),
  active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.space_type,
    pr.tenure,
    pr.area_band_name,
    pr.monthly_rate_per_sqm,
    pr.daily_rate_per_sqm,
    pr.area_band_min,
    pr.area_band_max,
    pr.package_starting_bhd,
    pr.active
  FROM pricing_rates pr
  ORDER BY pr.space_type, pr.area_band_min, pr.tenure;
END;
$$ LANGUAGE plpgsql;

-- 9. VERIFICATION
SELECT '=== VERIFICATION ===' as info;

-- Test all combinations
SELECT 'Testing all combinations for 100m²:' as test_info;

-- Ground Floor tests
SELECT 'Ground Floor Very Short (100m²):' as test;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Ground Floor' 
        AND tenure = 'Very Short' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN '✅ WORKING - Rate found!'
    ELSE '❌ BROKEN - No rate found'
  END as result;

SELECT 'Ground Floor Short (100m²):' as test;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Ground Floor' 
        AND tenure = 'Short' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN '✅ WORKING - Rate found!'
    ELSE '❌ BROKEN - No rate found'
  END as result;

SELECT 'Ground Floor Long (100m²):' as test;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Ground Floor' 
        AND tenure = 'Long' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN '✅ WORKING - Rate found!'
    ELSE '❌ BROKEN - No rate found'
  END as result;

-- Mezzanine tests
SELECT 'Mezzanine Very Short (100m²):' as test;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Mezzanine' 
        AND tenure = 'Very Short' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN '✅ WORKING - Rate found!'
    ELSE '❌ BROKEN - No rate found'
  END as result;

SELECT 'Mezzanine Short (100m²):' as test;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Mezzanine' 
        AND tenure = 'Short' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN '✅ WORKING - Rate found!'
    ELSE '❌ BROKEN - No rate found'
  END as result;

SELECT 'Mezzanine Long (100m²):' as test;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Mezzanine' 
        AND tenure = 'Long' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN '✅ WORKING - Rate found!'
    ELSE '❌ BROKEN - No rate found'
  END as result;

-- 10. Show actual rates
SELECT '=== ACTUAL RATES (100m²) ===' as info;
SELECT 
  space_type,
  tenure,
  area_band_name,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  'Daily cost for 100m²: ' || (100 * daily_rate_per_sqm)::text || ' BHD' as daily_cost,
  'Monthly cost for 100m²: ' || (100 * monthly_rate_per_sqm)::text || ' BHD' as monthly_cost
FROM pricing_rates 
WHERE space_type IN ('Ground Floor', 'Mezzanine') 
  AND tenure IN ('Very Short', 'Short', 'Long')
  AND active = true
  AND 100 >= area_band_min 
  AND (area_band_max IS NULL OR 100 <= area_band_max)
ORDER BY space_type, tenure;

-- 11. Show pricing summary
SELECT '=== PRICING SUMMARY ===' as info;
SELECT 
  space_type,
  area_band_name,
  tenure,
  monthly_rate_per_sqm,
  daily_rate_per_sqm,
  min_chargeable_area
FROM pricing_rates 
WHERE active = true
ORDER BY space_type, area_band_min, tenure;

SELECT '=== CALCULATOR RATES FIXED AND ADMIN FUNCTIONS ADDED! ===' as success;
SELECT 'Admin functions available:' as admin_info;
SELECT '- update_pricing_rate() - Update existing rates' as func1;
SELECT '- add_pricing_rate() - Add new rates' as func2;
SELECT '- get_pricing_summary() - Get pricing overview' as func3;


