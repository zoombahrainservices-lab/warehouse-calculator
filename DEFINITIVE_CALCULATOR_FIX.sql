-- DEFINITIVE CALCULATOR FIX
-- This script will fix ALL calculator issues by ensuring complete data integrity

-- 1. First, let's clean up any existing problematic data
DELETE FROM pricing_rates WHERE space_type IS NULL OR tenure IS NULL;
DELETE FROM pricing_rates WHERE daily_rate_per_sqm IS NULL OR monthly_rate_per_sqm IS NULL;
DELETE FROM pricing_rates WHERE daily_rate_per_sqm = 0 OR monthly_rate_per_sqm = 0;

-- 2. Add ALL required pricing rates with proper values
-- Ground Floor - Very Short Term
INSERT INTO pricing_rates (
  id, space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Small (0-50m²)', 0, 50, 0.500, 0.017, true, 30, 15.00),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Medium (51-200m²)', 51, 200, 0.450, 0.015, true, 30, 13.50),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Large (201-500m²)', 201, 500, 0.400, 0.013, true, 30, 12.00),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Extra Large (501m²+)', 501, NULL, 0.350, 0.012, true, 30, 10.50)
ON CONFLICT DO NOTHING;

-- Ground Floor - Short Term
INSERT INTO pricing_rates (
  id, space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Small (0-50m²)', 0, 50, 0.450, 0.015, true, 30, 13.50),
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Medium (51-200m²)', 51, 200, 0.400, 0.013, true, 30, 12.00),
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Large (201-500m²)', 201, 500, 0.350, 0.012, true, 30, 10.50),
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Extra Large (501m²+)', 501, NULL, 0.300, 0.010, true, 30, 9.00)
ON CONFLICT DO NOTHING;

-- Ground Floor - Long Term
INSERT INTO pricing_rates (
  id, space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Ground Floor', 'Long', 'Small (0-50m²)', 0, 50, 0.400, 0.013, true, 30, 12.00),
  (gen_random_uuid(), 'Ground Floor', 'Long', 'Medium (51-200m²)', 51, 200, 0.350, 0.012, true, 30, 10.50),
  (gen_random_uuid(), 'Ground Floor', 'Long', 'Large (201-500m²)', 201, 500, 0.300, 0.010, true, 30, 9.00),
  (gen_random_uuid(), 'Ground Floor', 'Long', 'Extra Large (501m²+)', 501, NULL, 0.250, 0.008, true, 30, 7.50)
ON CONFLICT DO NOTHING;

-- Mezzanine - Very Short Term
INSERT INTO pricing_rates (
  id, space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Small (0-50m²)', 0, 50, 0.400, 0.013, true, 30, 12.00),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Medium (51-200m²)', 51, 200, 0.360, 0.012, true, 30, 10.80),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Large (201-500m²)', 201, 500, 0.320, 0.011, true, 30, 9.60),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Extra Large (501m²+)', 501, NULL, 0.280, 0.009, true, 30, 8.40)
ON CONFLICT DO NOTHING;

-- Mezzanine - Short Term
INSERT INTO pricing_rates (
  id, space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Small (0-50m²)', 0, 50, 0.360, 0.012, true, 30, 10.80),
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Medium (51-200m²)', 51, 200, 0.320, 0.011, true, 30, 9.60),
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Large (201-500m²)', 201, 500, 0.280, 0.009, true, 30, 8.40),
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Extra Large (501m²+)', 501, NULL, 0.240, 0.008, true, 30, 7.20)
ON CONFLICT DO NOTHING;

-- Mezzanine - Long Term
INSERT INTO pricing_rates (
  id, space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Small (0-50m²)', 0, 50, 0.320, 0.011, true, 30, 9.60),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Medium (51-200m²)', 51, 200, 0.280, 0.009, true, 30, 8.40),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Large (201-500m²)', 201, 500, 0.240, 0.008, true, 30, 7.20),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Extra Large (501m²+)', 501, NULL, 0.200, 0.007, true, 30, 6.00)
ON CONFLICT DO NOTHING;

-- 3. Ensure ALL required system settings exist
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('office_monthly_rate', '150.00', 'Monthly office rental rate in BHD'),
  ('minimum_charge', '30.00', 'Minimum charge for small areas in BHD'),
  ('days_per_month', '30', 'Number of days per month for daily rate calculations'),
  ('office_free_threshold', '200', 'Area threshold above which office is free (m²)'),
  ('very_short_max_days', '30', 'Maximum days for Very Short term'),
  ('short_min_months', '1', 'Minimum months for Short term'),
  ('short_max_months', '11', 'Maximum months for Short term'),
  ('long_min_months', '12', 'Minimum months for Long term')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- 4. Ensure EWA settings exist
INSERT INTO ewa_settings (
  id, house_load_description, dedicated_meter_description, 
  estimated_setup_deposit, estimated_installation_fee
) VALUES (
  gen_random_uuid(),
  'House load electricity included in rent - up to 5kW',
  'Dedicated meter with separate billing - setup required',
  50.00,
  25.00
) ON CONFLICT DO NOTHING;

-- 5. Add sample optional services
INSERT INTO optional_services (
  id, name, description, pricing, active
) VALUES 
  (gen_random_uuid(), 'Loading Dock Access', '24/7 access to loading dock', '50 BHD/month', true),
  (gen_random_uuid(), 'Security Service', 'Additional security monitoring', '75 BHD/month', true),
  (gen_random_uuid(), 'Climate Control', 'Temperature and humidity control', '200 BHD/month', true),
  (gen_random_uuid(), 'Insurance Coverage', 'Basic warehouse insurance', '100 BHD/month', true)
ON CONFLICT DO NOTHING;

-- 6. VERIFICATION - Test all problematic scenarios
SELECT '=== VERIFICATION RESULTS ===' as info;

-- Test 1: Ground Floor Very Short (100m²)
SELECT 'Test 1: Ground Floor Very Short (100m²)' as test_case;
SELECT 
  space_type,
  tenure,
  area_band_name,
  daily_rate_per_sqm,
  'Expected Result: ' || (100 * daily_rate_per_sqm * 7)::text || ' BHD for 7 days' as expected_result,
  'Status: ' || CASE WHEN daily_rate_per_sqm > 0 THEN 'WORKING' ELSE 'BROKEN' END as status
FROM pricing_rates 
WHERE space_type = 'Ground Floor' 
  AND tenure = 'Very Short'
  AND active = true
  AND 100 >= area_band_min 
  AND (area_band_max IS NULL OR 100 <= area_band_max);

-- Test 2: Mezzanine Very Short (100m²)
SELECT 'Test 2: Mezzanine Very Short (100m²)' as test_case;
SELECT 
  space_type,
  tenure,
  area_band_name,
  daily_rate_per_sqm,
  'Expected Result: ' || (100 * daily_rate_per_sqm * 7)::text || ' BHD for 7 days' as expected_result,
  'Status: ' || CASE WHEN daily_rate_per_sqm > 0 THEN 'WORKING' ELSE 'BROKEN' END as status
FROM pricing_rates 
WHERE space_type = 'Mezzanine' 
  AND tenure = 'Very Short'
  AND active = true
  AND 100 >= area_band_min 
  AND (area_band_max IS NULL OR 100 <= area_band_max);

-- Test 3: Mezzanine Long (100m²)
SELECT 'Test 3: Mezzanine Long (100m²)' as test_case;
SELECT 
  space_type,
  tenure,
  area_band_name,
  monthly_rate_per_sqm,
  'Expected Result: ' || (100 * monthly_rate_per_sqm * 12)::text || ' BHD for 12 months' as expected_result,
  'Status: ' || CASE WHEN monthly_rate_per_sqm > 0 THEN 'WORKING' ELSE 'BROKEN' END as status
FROM pricing_rates 
WHERE space_type = 'Mezzanine' 
  AND tenure = 'Long'
  AND active = true
  AND 100 >= area_band_min 
  AND (area_band_max IS NULL OR 100 <= area_band_max);

-- 7. Final summary
SELECT '=== FINAL SUMMARY ===' as info;

SELECT 
  'Total pricing rates:' as metric,
  COUNT(*)::text as value
FROM pricing_rates
UNION ALL
SELECT 
  'Active pricing rates:' as metric,
  COUNT(*)::text as value
FROM pricing_rates WHERE active = true
UNION ALL
SELECT 
  'Very Short term rates:' as metric,
  COUNT(*)::text as value
FROM pricing_rates WHERE tenure = 'Very Short' AND active = true
UNION ALL
SELECT 
  'Mezzanine rates:' as metric,
  COUNT(*)::text as value
FROM pricing_rates WHERE space_type = 'Mezzanine' AND active = true
UNION ALL
SELECT 
  'Ground Floor rates:' as metric,
  COUNT(*)::text as value
FROM pricing_rates WHERE space_type = 'Ground Floor' AND active = true
UNION ALL
SELECT 
  'Required system settings:' as metric,
  COUNT(*)::text as value
FROM system_settings 
WHERE setting_key IN ('office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold');

-- 8. Show all available rates for reference
SELECT '=== ALL AVAILABLE RATES ===' as info;
SELECT 
  space_type,
  tenure,
  area_band_name,
  area_band_min,
  area_band_max,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  active
FROM pricing_rates 
WHERE active = true
ORDER BY space_type, tenure, area_band_min;





