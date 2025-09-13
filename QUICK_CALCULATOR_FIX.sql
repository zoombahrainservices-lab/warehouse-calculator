-- Quick Calculator Fix
-- This script provides immediate fixes for the broken calculator scenarios

-- 1. Add missing Very Short term rates (the main issue)
INSERT INTO pricing_rates (
  id, space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Ground Floor Very Short
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Small (0-50m²)', 0, 50, 0.500, 0.017, true, 30, 15.00),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Medium (51-200m²)', 51, 200, 0.450, 0.015, true, 30, 13.50),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Large (201-500m²)', 201, 500, 0.400, 0.013, true, 30, 12.00),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Extra Large (501m²+)', 501, NULL, 0.350, 0.012, true, 30, 10.50),
  
  -- Mezzanine Very Short
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Small (0-50m²)', 0, 50, 0.400, 0.013, true, 30, 12.00),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Medium (51-200m²)', 51, 200, 0.360, 0.012, true, 30, 10.80),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Large (201-500m²)', 201, 500, 0.320, 0.011, true, 30, 9.60),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Extra Large (501m²+)', 501, NULL, 0.280, 0.009, true, 30, 8.40),
  
  -- Mezzanine Long (if missing)
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Small (0-50m²)', 0, 50, 0.320, 0.011, true, 30, 9.60),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Medium (51-200m²)', 51, 200, 0.280, 0.009, true, 30, 8.40),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Large (201-500m²)', 201, 500, 0.240, 0.008, true, 30, 7.20),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Extra Large (501m²+)', 501, NULL, 0.200, 0.007, true, 30, 6.00)
ON CONFLICT DO NOTHING;

-- 2. Add essential system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('office_monthly_rate', '150.00', 'Monthly office rental rate in BHD'),
  ('minimum_charge', '30.00', 'Minimum charge for small areas in BHD'),
  ('days_per_month', '30', 'Number of days per month for daily rate calculations'),
  ('office_free_threshold', '200', 'Area threshold above which office is free (m²)')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- 3. Ensure EWA settings exist
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

-- 4. Verify the fix worked
SELECT '=== QUICK FIX VERIFICATION ===' as info;

-- Check if Very Short rates now exist
SELECT 'Very Short Term Rates Status:' as check_type;
SELECT 
  space_type,
  COUNT(*) as rate_count,
  'Status: ' || CASE WHEN COUNT(*) > 0 THEN 'FIXED' ELSE 'STILL BROKEN' END as status
FROM pricing_rates 
WHERE tenure = 'Very Short' AND active = true
GROUP BY space_type;

-- Test the specific problematic scenario
SELECT 'Test: Mezzanine Very Short (100m², 7 days)' as test_case;
SELECT 
  space_type,
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

-- Show all available rates for reference
SELECT 'All Available Rates:' as info;
SELECT 
  space_type,
  tenure,
  area_band_name,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  active
FROM pricing_rates 
WHERE active = true
ORDER BY space_type, tenure, area_band_min;
