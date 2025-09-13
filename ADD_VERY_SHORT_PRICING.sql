-- Add Very Short Term Pricing Rates

-- This script adds sample pricing rates for Very Short term to fix live calculation issues

-- Add Ground Floor Very Short term rates
INSERT INTO pricing_rates (
  id, space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Small (0-50m²)', 0, 50, 0.500, 0.017, true, 30, 15.00),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Medium (51-200m²)', 51, 200, 0.450, 0.015, true, 30, 13.50),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Large (201-500m²)', 201, 500, 0.400, 0.013, true, 30, 12.00),
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Extra Large (501m²+)', 501, NULL, 0.350, 0.012, true, 30, 10.50)
ON CONFLICT DO NOTHING;

-- Add Mezzanine Very Short term rates
INSERT INTO pricing_rates (
  id, space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Small (0-50m²)', 0, 50, 0.400, 0.013, true, 30, 12.00),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Medium (51-200m²)', 51, 200, 0.360, 0.012, true, 30, 10.80),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Large (201-500m²)', 201, 500, 0.320, 0.011, true, 30, 9.60),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Extra Large (501m²+)', 501, NULL, 0.280, 0.009, true, 30, 8.40)
ON CONFLICT DO NOTHING;

-- Add required system settings if they don't exist
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
  ('office_monthly_rate', '150.00', 'Monthly office rental rate in BHD'),
  ('minimum_charge', '30.00', 'Minimum charge for small areas in BHD'),
  ('days_per_month', '30', 'Number of days per month for daily rate calculations'),
  ('office_free_threshold', '200', 'Area threshold above which office is free (m²)')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- Verify the Very Short term rates were added
SELECT 'Very Short Term Rates Added:' as info;
SELECT 
  space_type,
  area_band_name,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  active
FROM pricing_rates 
WHERE tenure = 'Very Short' 
ORDER BY space_type, area_band_min;

-- Test calculation for 100m² Very Short term (7 days)
SELECT 'Test: Rate for 100m² Very Short Term:' as info;
SELECT 
  space_type,
  area_band_name,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  min_chargeable_area,
  'Expected daily cost: ' || (100 * daily_rate_per_sqm)::text || ' BHD' as daily_cost,
  'Expected 7-day cost: ' || (100 * daily_rate_per_sqm * 7)::text || ' BHD' as weekly_cost
FROM pricing_rates 
WHERE tenure = 'Very Short' 
  AND active = true
  AND 100 >= area_band_min 
  AND (area_band_max IS NULL OR 100 <= area_band_max)
ORDER BY space_type, area_band_min;





