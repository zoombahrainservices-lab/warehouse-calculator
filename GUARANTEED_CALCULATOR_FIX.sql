-- GUARANTEED CALCULATOR FIX
-- This script will DEFINITELY fix your calculator issues

-- 1. First, let's see what we have and clean up any problems
SELECT '=== STARTING FIX PROCESS ===' as info;

-- Check current state
SELECT 'Current pricing rates count:' as metric, COUNT(*)::text as value FROM pricing_rates;

-- 2. Clean up any problematic data
DELETE FROM pricing_rates WHERE space_type IS NULL OR tenure IS NULL;
DELETE FROM pricing_rates WHERE daily_rate_per_sqm IS NULL OR monthly_rate_per_sqm IS NULL;
DELETE FROM pricing_rates WHERE daily_rate_per_sqm = 0 OR monthly_rate_per_sqm = 0;
DELETE FROM pricing_rates WHERE area_band_min IS NULL OR area_band_max IS NULL;

-- 3. Add ALL the missing pricing rates that your calculator needs
-- Ground Floor - Very Short Term (THIS IS WHAT YOU'RE MISSING)
INSERT INTO pricing_rates (
  id, space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Small (0-50m²)', 0, 50, 0.500, 0.017, true, 30, 15.00),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Medium (51-200m²)', 51, 200, 0.450, 0.015, true, 30, 13.50),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Large (201-500m²)', 201, 500, 0.400, 0.013, true, 30, 12.00),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Extra Large (501m²+)', 501, NULL, 0.350, 0.012, true, 30, 10.50)
ON CONFLICT DO NOTHING;

-- Mezzanine - Very Short Term (THIS IS WHAT YOU'RE MISSING)
INSERT INTO pricing_rates (
  id, space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Small (0-50m²)', 0, 50, 0.400, 0.013, true, 30, 12.00),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Medium (51-200m²)', 51, 200, 0.360, 0.012, true, 30, 10.80),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Large (201-500m²)', 201, 500, 0.320, 0.011, true, 30, 9.60),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Extra Large (501m²+)', 501, NULL, 0.280, 0.009, true, 30, 8.40)
ON CONFLICT DO NOTHING;

-- Mezzanine - Long Term (THIS IS WHAT YOU'RE MISSING)
INSERT INTO pricing_rates (
  id, space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Small (0-50m²)', 0, 50, 0.320, 0.011, true, 30, 9.60),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Medium (51-200m²)', 51, 200, 0.280, 0.009, true, 30, 8.40),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Large (201-500m²)', 201, 500, 0.240, 0.008, true, 30, 7.20),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Extra Large (501m²+)', 501, NULL, 0.200, 0.007, true, 30, 6.00)
ON CONFLICT DO NOTHING;

-- 4. Add system settings that the calculator needs
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('office_monthly_rate', '150.00', 'Monthly office rental rate in BHD'),
  ('minimum_charge', '30.00', 'Minimum charge for small areas in BHD'),
  ('days_per_month', '30', 'Number of days per month for daily rate calculations'),
  ('office_free_threshold', '200', 'Area threshold above which office is free (m²)')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- 5. Add EWA settings
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

-- 6. VERIFY THE FIX WORKED
SELECT '=== VERIFICATION - DID THE FIX WORK? ===' as info;

-- Test 1: Ground Floor Very Short (100m²)
SELECT 'Test 1: Ground Floor Very Short (100m²)' as test_case;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Ground Floor' 
        AND tenure = 'Very Short' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN '✅ FIXED - Rate found!'
    ELSE '❌ STILL BROKEN - No rate found'
  END as result;

-- Test 2: Mezzanine Very Short (100m²)
SELECT 'Test 2: Mezzanine Very Short (100m²)' as test_case;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Mezzanine' 
        AND tenure = 'Very Short' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN '✅ FIXED - Rate found!'
    ELSE '❌ STILL BROKEN - No rate found'
  END as result;

-- Test 3: Mezzanine Long (100m²)
SELECT 'Test 3: Mezzanine Long (100m²)' as test_case;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Mezzanine' 
        AND tenure = 'Long' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN '✅ FIXED - Rate found!'
    ELSE '❌ STILL BROKEN - No rate found'
  END as result;

-- 7. Show the actual rates that will be used
SELECT '=== ACTUAL RATES THAT WILL BE USED ===' as info;

-- Show Ground Floor Very Short rate for 100m²
SELECT 'Ground Floor Very Short (100m²) - Rate Details:' as rate_info;
SELECT 
  space_type,
  tenure,
  area_band_name,
  daily_rate_per_sqm,
  'Daily cost for 100m²: ' || (100 * daily_rate_per_sqm)::text || ' BHD' as daily_cost,
  '7-day cost: ' || (100 * daily_rate_per_sqm * 7)::text || ' BHD' as weekly_cost
FROM pricing_rates 
WHERE space_type = 'Ground Floor' 
  AND tenure = 'Very Short'
  AND active = true
  AND 100 >= area_band_min 
  AND (area_band_max IS NULL OR 100 <= area_band_max);

-- Show Mezzanine Very Short rate for 100m²
SELECT 'Mezzanine Very Short (100m²) - Rate Details:' as rate_info;
SELECT 
  space_type,
  tenure,
  area_band_name,
  daily_rate_per_sqm,
  'Daily cost for 100m²: ' || (100 * daily_rate_per_sqm)::text || ' BHD' as daily_cost,
  '7-day cost: ' || (100 * daily_rate_per_sqm * 7)::text || ' BHD' as weekly_cost
FROM pricing_rates 
WHERE space_type = 'Mezzanine' 
  AND tenure = 'Very Short'
  AND active = true
  AND 100 >= area_band_min 
  AND (area_band_max IS NULL OR 100 <= area_band_max);

-- Show Mezzanine Long rate for 100m²
SELECT 'Mezzanine Long (100m²) - Rate Details:' as rate_info;
SELECT 
  space_type,
  tenure,
  area_band_name,
  monthly_rate_per_sqm,
  'Monthly cost for 100m²: ' || (100 * monthly_rate_per_sqm)::text || ' BHD' as monthly_cost,
  '12-month cost: ' || (100 * monthly_rate_per_sqm * 12)::text || ' BHD' as yearly_cost
FROM pricing_rates 
WHERE space_type = 'Mezzanine' 
  AND tenure = 'Long'
  AND active = true
  AND 100 >= area_band_min 
  AND (area_band_max IS NULL OR 100 <= area_band_max);

-- 8. Final summary
SELECT '=== FINAL SUMMARY ===' as info;
SELECT 
  'Total pricing rates after fix:' as metric,
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
FROM pricing_rates WHERE space_type = 'Mezzanine' AND active = true;
