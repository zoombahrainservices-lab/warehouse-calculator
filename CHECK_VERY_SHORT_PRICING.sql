-- Check and Fix Very Short Term Pricing Rates
-- This script helps identify and fix issues with Very Short term pricing

-- 1. Check current pricing rates for Very Short term
SELECT 'Current Very Short Term Pricing Rates:' as info;
SELECT 
  id,
  space_type,
  tenure,
  area_band_name,
  area_band_min,
  area_band_max,
  monthly_rate_per_sqm,
  daily_rate_per_sqm,
  active,
  min_chargeable_area,
  package_starting_bhd
FROM pricing_rates 
WHERE tenure = 'Very Short' 
ORDER BY space_type, area_band_min;

-- 2. Check if there are any Very Short rates at all
SELECT 'Very Short Term Rates Count:' as info;
SELECT 
  space_type,
  COUNT(*) as rate_count,
  SUM(CASE WHEN active = true THEN 1 ELSE 0 END) as active_count
FROM pricing_rates 
WHERE tenure = 'Very Short'
GROUP BY space_type;

-- 3. Check for gaps in area bands for Very Short term
SELECT 'Area Band Gaps for Very Short Term:' as info;
SELECT 
  space_type,
  area_band_min,
  area_band_max,
  LAG(area_band_max) OVER (PARTITION BY space_type ORDER BY area_band_min) as previous_max,
  CASE 
    WHEN LAG(area_band_max) OVER (PARTITION BY space_type ORDER BY area_band_min) IS NOT NULL 
    AND area_band_min > LAG(area_band_max) OVER (PARTITION BY space_type ORDER BY area_band_min) + 1
    THEN 'GAP DETECTED'
    ELSE 'OK'
  END as status
FROM pricing_rates 
WHERE tenure = 'Very Short' AND active = true
ORDER BY space_type, area_band_min;

-- 4. Sample Very Short term rates to add (if none exist)
-- Uncomment and modify these INSERT statements if you need to add Very Short term rates

/*
-- Example: Add Ground Floor Very Short term rates
INSERT INTO pricing_rates (
  id, space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Small (0-50m²)', 0, 50, 0.500, 0.017, true, 30, 15.00),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Medium (51-200m²)', 51, 200, 0.450, 0.015, true, 30, 13.50),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Large (201-500m²)', 201, 500, 0.400, 0.013, true, 30, 12.00),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Extra Large (501m²+)', 501, NULL, 0.350, 0.012, true, 30, 10.50);

-- Example: Add Mezzanine Very Short term rates (or they will use Ground Floor with 20% discount)
INSERT INTO pricing_rates (
  id, space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Small (0-50m²)', 0, 50, 0.400, 0.013, true, 30, 12.00),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Medium (51-200m²)', 51, 200, 0.360, 0.012, true, 30, 10.80),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Large (201-500m²)', 201, 500, 0.320, 0.011, true, 30, 9.60),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Extra Large (501m²+)', 501, NULL, 0.280, 0.009, true, 30, 8.40);
*/

-- 5. Check system settings required for Very Short term calculations
SELECT 'Required System Settings for Very Short Term:' as info;
SELECT 
  setting_key,
  setting_value,
  CASE 
    WHEN setting_key IN ('office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold') 
    THEN 'REQUIRED'
    ELSE 'OPTIONAL'
  END as status
FROM system_settings 
WHERE setting_key IN ('office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold')
ORDER BY setting_key;

-- 6. Add missing system settings if needed
-- Uncomment and modify these INSERT statements if system settings are missing

/*
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('office_monthly_rate', '150.00', 'Monthly office rental rate in BHD'),
  ('minimum_charge', '30.00', 'Minimum charge for small areas in BHD'),
  ('days_per_month', '30', 'Number of days per month for daily rate calculations'),
  ('office_free_threshold', '200', 'Area threshold above which office is free (m²)')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;
*/

-- 7. Verify EWA settings exist
SELECT 'EWA Settings Check:' as info;
SELECT 
  house_load_description,
  dedicated_meter_description,
  estimated_setup_deposit,
  estimated_installation_fee
FROM ewa_settings 
LIMIT 1;

-- 8. Test calculation for 100m² Very Short term (7 days)
SELECT 'Test Calculation Data:' as info;
SELECT 
  'Inputs' as test_type,
  'Ground Floor' as space_type,
  100 as area_requested,
  'Very Short' as tenure,
  7 as lease_duration_days;

-- Show what rate would be used for 100m² Very Short term
SELECT 'Rate for 100m² Very Short Term:' as info;
SELECT 
  space_type,
  area_band_name,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  min_chargeable_area
FROM pricing_rates 
WHERE tenure = 'Very Short' 
  AND active = true
  AND 100 >= area_band_min 
  AND (area_band_max IS NULL OR 100 <= area_band_max)
ORDER BY space_type, area_band_min;





