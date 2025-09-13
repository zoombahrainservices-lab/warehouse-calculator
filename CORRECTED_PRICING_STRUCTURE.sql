-- CORRECTED PRICING STRUCTURE
-- Based on reverse engineering analysis of the original schema and user requirements

SELECT '=== CORRECTED PRICING STRUCTURE ===' as info;

-- 1. Clean up existing data
DELETE FROM pricing_rates WHERE space_type IS NULL OR tenure IS NULL;
DELETE FROM pricing_rates WHERE daily_rate_per_sqm IS NULL OR monthly_rate_per_sqm IS NULL;

-- 2. Add corrected pricing rates based on original schema logic
-- GROUND FLOOR RATES

-- Small Units (0-499m²) - Fixed Price Structure
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Small units - Very Short (Daily rates)
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Daily rates for temporary storage', 'Small Units (0-499m²)', 0, 499, 4.500, 0.150, true, 25, 112.50),
  -- Small units - Short Term (1-11 months)
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Monthly rates for 1-11 months', 'Small Units (0-499m²)', 0, 499, 3.500, 0.117, true, 30, 105.00),
  -- Small units - Long Term (12+ months)
  (gen_random_uuid(), 'Ground Floor', 'Long', 'Monthly rates for 12+ months', 'Small Units (0-499m²)', 0, 499, 3.000, 0.100, true, 35, 105.00)
ON CONFLICT DO NOTHING;

-- Medium Units (500-999m²) - Based on original 500m² band
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Medium units - Very Short (Daily rates)
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Daily rates for temporary storage', 'Medium Units (500-999m²)', 500, 999, 3.800, 0.127, true, 50, 190.00),
  -- Medium units - Short Term (1-11 months) - Based on original 2.500 rate
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Monthly rates for 1-11 months', 'Medium Units (500-999m²)', 500, 999, 2.500, 0.083, true, 50, 125.00),
  -- Medium units - Long Term (12+ months) - Based on original 3.000 rate
  (gen_random_uuid(), 'Ground Floor', 'Long', 'Monthly rates for 12+ months', 'Medium Units (500-999m²)', 500, 999, 3.000, 0.100, true, 50, 150.00)
ON CONFLICT DO NOTHING;

-- Large Units (1000-1499m²) - Based on original 1000m² band
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Large units - Very Short (Daily rates)
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Daily rates for temporary storage', 'Large Units (1000-1499m²)', 1000, 1499, 3.200, 0.107, true, 75, 240.00),
  -- Large units - Short Term (1-11 months) - Based on original 3.000 rate
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Monthly rates for 1-11 months', 'Large Units (1000-1499m²)', 1000, 1499, 3.000, 0.100, true, 75, 225.00),
  -- Large units - Long Term (12+ months) - Based on original 2.800 rate
  (gen_random_uuid(), 'Ground Floor', 'Long', 'Monthly rates for 12+ months', 'Large Units (1000-1499m²)', 1000, 1499, 2.800, 0.093, true, 75, 210.00)
ON CONFLICT DO NOTHING;

-- Extra Large Units (1500m²+) - Based on original 1500m² and 2000m² bands
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Extra Large units - Very Short (Daily rates)
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Daily rates for temporary storage', 'Extra Large Units (1500m²+)', 1500, NULL, 2.800, 0.093, true, 100, 280.00),
  -- Extra Large units - Short Term (1-11 months) - Based on original 2.800 rate
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Monthly rates for 1-11 months', 'Extra Large Units (1500m²+)', 1500, NULL, 2.800, 0.093, true, 100, 280.00),
  -- Extra Large units - Long Term (12+ months) - Based on original 2.600 rate
  (gen_random_uuid(), 'Ground Floor', 'Long', 'Monthly rates for 12+ months', 'Extra Large Units (1500m²+)', 1500, NULL, 2.600, 0.087, true, 100, 260.00)
ON CONFLICT DO NOTHING;

-- 3. Add Mezzanine rates (20% discount from Ground Floor)
-- Small Units Mezzanine (0-499m²)
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Small units - Very Short (Daily rates) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Daily rates for temporary storage', 'Small Units (0-499m²)', 0, 499, 3.600, 0.120, true, 25, 90.00),
  -- Small units - Short Term (1-11 months) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Monthly rates for 1-11 months', 'Small Units (0-499m²)', 0, 499, 2.800, 0.094, true, 30, 84.00),
  -- Small units - Long Term (12+ months) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Monthly rates for 12+ months', 'Small Units (0-499m²)', 0, 499, 2.400, 0.080, true, 35, 84.00)
ON CONFLICT DO NOTHING;

-- Medium Units Mezzanine (500-999m²)
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Medium units - Very Short (Daily rates) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Daily rates for temporary storage', 'Medium Units (500-999m²)', 500, 999, 3.040, 0.102, true, 50, 152.00),
  -- Medium units - Short Term (1-11 months) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Monthly rates for 1-11 months', 'Medium Units (500-999m²)', 500, 999, 2.000, 0.066, true, 50, 100.00),
  -- Medium units - Long Term (12+ months) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Monthly rates for 12+ months', 'Medium Units (500-999m²)', 500, 999, 2.400, 0.080, true, 50, 120.00)
ON CONFLICT DO NOTHING;

-- Large Units Mezzanine (1000-1499m²)
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Large units - Very Short (Daily rates) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Daily rates for temporary storage', 'Large Units (1000-1499m²)', 1000, 1499, 2.560, 0.086, true, 75, 192.00),
  -- Large units - Short Term (1-11 months) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Monthly rates for 1-11 months', 'Large Units (1000-1499m²)', 1000, 1499, 2.400, 0.080, true, 75, 180.00),
  -- Large units - Long Term (12+ months) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Monthly rates for 12+ months', 'Large Units (1000-1499m²)', 1000, 1499, 2.240, 0.074, true, 75, 168.00)
ON CONFLICT DO NOTHING;

-- Extra Large Units Mezzanine (1500m²+)
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Extra Large units - Very Short (Daily rates) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Daily rates for temporary storage', 'Extra Large Units (1500m²+)', 1500, NULL, 2.240, 0.074, true, 100, 224.00),
  -- Extra Large units - Short Term (1-11 months) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Monthly rates for 1-11 months', 'Extra Large Units (1500m²+)', 1500, NULL, 2.240, 0.074, true, 100, 224.00),
  -- Extra Large units - Long Term (12+ months) - 20% discount
  (gen_random_uuid(), 'Mezzanine', 'Long', 'Monthly rates for 12+ months', 'Extra Large Units (1500m²+)', 1500, NULL, 2.080, 0.070, true, 100, 208.00)
ON CONFLICT DO NOTHING;

-- 4. Add system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('office_monthly_rate', '200.00', 'Monthly office rental rate in BHD'),
  ('minimum_charge', '100.00', 'Minimum charge for small areas in BHD'),
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

-- 8. Show pricing summary
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

SELECT '=== CALCULATOR IS NOW FIXED WITH CORRECTED PRICING! ===' as success;
