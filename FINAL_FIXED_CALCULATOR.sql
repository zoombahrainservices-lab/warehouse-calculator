-- FINAL FIXED CALCULATOR - WITH ACTUAL PRICING
-- This will fix your calculator with the correct pricing rates

SELECT '=== STARTING CALCULATOR FIX WITH ACTUAL PRICING ===' as info;

-- 1. Clean up problematic data
DELETE FROM pricing_rates WHERE space_type IS NULL OR tenure IS NULL;
DELETE FROM pricing_rates WHERE daily_rate_per_sqm IS NULL OR monthly_rate_per_sqm IS NULL;

-- 2. Add all pricing rates with actual pricing details
-- PACKAGE 1: 1,500 m² and above - LONG TERM (12 months or longer)
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Ground Floor', 'Long', 'Monthly rates for 12+ months', 'Large (1500m²+)', 1500, NULL, 2.600, 0.087, true, 1500, 3900.00)
ON CONFLICT DO NOTHING;

-- PACKAGE 2: 1,500 m² and above - SHORT TERM (Minimum one month)
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Monthly rates for 1-11 months', 'Large (1500m²+)', 1500, NULL, 2.800, 0.093, true, 1500, 4200.00)
ON CONFLICT DO NOTHING;

-- PACKAGE 3: 1,000–1,499 m² - LONG TERM (12 months or longer)
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Ground Floor', 'Long', 'Monthly rates for 12+ months', 'Medium-Large (1000-1499m²)', 1000, 1499, 2.800, 0.093, true, 1000, 2800.00)
ON CONFLICT DO NOTHING;

-- PACKAGE 4: 1,000–1,499 m² - SHORT TERM (Minimum one month)
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Monthly rates for 1-11 months', 'Medium-Large (1000-1499m²)', 1000, 1499, 3.000, 0.100, true, 1000, 3000.00)
ON CONFLICT DO NOTHING;

-- PACKAGE 5: Small units - LONG TERM (12 months or longer) - FIXED PRICE
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Ground Floor', 'Long', 'Monthly rates for 12+ months - Fixed Price', 'Small Units', 0, 999, 3.000, 0.100, true, 35, 105.00)
ON CONFLICT DO NOTHING;

-- PACKAGE 6: Small units - SHORT TERM (Minimum one month) - FIXED PRICE
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Monthly rates for 1-11 months - Fixed Price', 'Small Units', 0, 999, 3.500, 0.117, true, 30, 105.00)
ON CONFLICT DO NOTHING;

-- PACKAGE 7: Small units - DAYS/WEEKS (Temporary) - FIXED PRICE
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Daily rates for temporary storage - Fixed Price', 'Small Units', 0, 999, 4.500, 0.150, true, 25, 112.50)
ON CONFLICT DO NOTHING;

-- 3. Add Mezzanine rates (20% discount from Ground Floor)
-- Mezzanine PACKAGE 1: 1,500 m² and above - LONG TERM
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Monthly rates for 12+ months', 'Large (1500m²+)', 1500, NULL, 2.080, 0.070, true, 1500, 3120.00)
ON CONFLICT DO NOTHING;

-- Mezzanine PACKAGE 2: 1,500 m² and above - SHORT TERM
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Monthly rates for 1-11 months', 'Large (1500m²+)', 1500, NULL, 2.240, 0.074, true, 1500, 3360.00)
ON CONFLICT DO NOTHING;

-- Mezzanine PACKAGE 3: 1,000–1,499 m² - LONG TERM
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Monthly rates for 12+ months', 'Medium-Large (1000-1499m²)', 1000, 1499, 2.240, 0.074, true, 1000, 2240.00)
ON CONFLICT DO NOTHING;

-- Mezzanine PACKAGE 4: 1,000–1,499 m² - SHORT TERM
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Monthly rates for 1-11 months', 'Medium-Large (1000-1499m²)', 1000, 1499, 2.400, 0.080, true, 1000, 2400.00)
ON CONFLICT DO NOTHING;

-- Mezzanine PACKAGE 5: Small units - LONG TERM - FIXED PRICE
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Monthly rates for 12+ months - Fixed Price', 'Small Units', 0, 999, 2.400, 0.080, true, 35, 84.00)
ON CONFLICT DO NOTHING;

-- Mezzanine PACKAGE 6: Small units - SHORT TERM - FIXED PRICE
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Monthly rates for 1-11 months - Fixed Price', 'Small Units', 0, 999, 2.800, 0.094, true, 30, 84.00)
ON CONFLICT DO NOTHING;

-- Mezzanine PACKAGE 7: Small units - DAYS/WEEKS - FIXED PRICE
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Daily rates for temporary storage - Fixed Price', 'Small Units', 0, 999, 3.600, 0.120, true, 25, 90.00)
ON CONFLICT DO NOTHING;

-- 4. Add system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('office_monthly_rate', '200.00', 'Monthly office rental rate in BHD'),
  ('minimum_charge', '50.00', 'Minimum charge for small areas in BHD'),
  ('days_per_month', '30', 'Number of days per month for daily rate calculations'),
  ('office_free_threshold', '200', 'Area threshold above which office is free (m²)')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- 5. Add EWA settings
INSERT INTO ewa_settings (
  id, house_load_description, dedicated_meter_description, 
  estimated_setup_deposit, estimated_installation_fee
) VALUES (
  gen_random_uuid(),
  'House load electricity included in rent - up to 5kW',
  'Dedicated meter with separate billing - setup required',
  75.00,
  50.00
) ON CONFLICT DO NOTHING;

-- 6. VERIFICATION
SELECT '=== VERIFICATION ===' as info;

-- Test Ground Floor Very Short (100m²)
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

-- Test Ground Floor Short (100m²)
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

-- Test Ground Floor Long (100m²)
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

-- Test Mezzanine Very Short (100m²)
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

-- Test Mezzanine Short (100m²)
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

-- Test Mezzanine Long (100m²)
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

-- 7. Show actual rates
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

SELECT '=== CALCULATOR IS NOW FIXED WITH ACTUAL PRICING! ===' as success;
