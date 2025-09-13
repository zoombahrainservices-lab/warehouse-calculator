-- FINAL COMPLETE CALCULATOR FIX
-- This will restore your calculator with complete pricing

-- 1. Clean up and add missing rates
DELETE FROM pricing_rates WHERE space_type IS NULL OR tenure IS NULL;
DELETE FROM pricing_rates WHERE daily_rate_per_sqm IS NULL OR monthly_rate_per_sqm IS NULL;

-- 2. Add ALL missing pricing rates with realistic pricing
-- Ground Floor Very Short
INSERT INTO pricing_rates (id, space_type, tenure, area_band_name, area_band_min, area_band_max, monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd) VALUES 
(gen_random_uuid(), 'Ground Floor', 'Very Short', 'Small (0-50m²)', 0, 50, 0.600, 0.020, true, 30, 18.00),
(gen_random_uuid(), 'Ground Floor', 'Very Short', 'Medium (51-200m²)', 51, 200, 0.540, 0.018, true, 30, 16.20),
(gen_random_uuid(), 'Ground Floor', 'Very Short', 'Large (201-500m²)', 201, 500, 0.480, 0.016, true, 30, 14.40),
(gen_random_uuid(), 'Ground Floor', 'Very Short', 'Extra Large (501m²+)', 501, NULL, 0.420, 0.014, true, 30, 12.60)
ON CONFLICT DO NOTHING;

-- Ground Floor Short
INSERT INTO pricing_rates (id, space_type, tenure, area_band_name, area_band_min, area_band_max, monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd) VALUES 
(gen_random_uuid(), 'Ground Floor', 'Short', 'Small (0-50m²)', 0, 50, 0.540, 0.018, true, 30, 16.20),
(gen_random_uuid(), 'Ground Floor', 'Short', 'Medium (51-200m²)', 51, 200, 0.480, 0.016, true, 30, 14.40),
(gen_random_uuid(), 'Ground Floor', 'Short', 'Large (201-500m²)', 201, 500, 0.420, 0.014, true, 30, 12.60),
(gen_random_uuid(), 'Ground Floor', 'Short', 'Extra Large (501m²+)', 501, NULL, 0.360, 0.012, true, 30, 10.80)
ON CONFLICT DO NOTHING;

-- Ground Floor Long
INSERT INTO pricing_rates (id, space_type, tenure, area_band_name, area_band_min, area_band_max, monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd) VALUES 
(gen_random_uuid(), 'Ground Floor', 'Long', 'Small (0-50m²)', 0, 50, 0.480, 0.016, true, 30, 14.40),
(gen_random_uuid(), 'Ground Floor', 'Long', 'Medium (51-200m²)', 51, 200, 0.420, 0.014, true, 30, 12.60),
(gen_random_uuid(), 'Ground Floor', 'Long', 'Large (201-500m²)', 201, 500, 0.360, 0.012, true, 30, 10.80),
(gen_random_uuid(), 'Ground Floor', 'Long', 'Extra Large (501m²+)', 501, NULL, 0.300, 0.010, true, 30, 9.00)
ON CONFLICT DO NOTHING;

-- Mezzanine Very Short
INSERT INTO pricing_rates (id, space_type, tenure, area_band_name, area_band_min, area_band_max, monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd) VALUES 
(gen_random_uuid(), 'Mezzanine', 'Very Short', 'Small (0-50m²)', 0, 50, 0.480, 0.016, true, 30, 14.40),
(gen_random_uuid(), 'Mezzanine', 'Very Short', 'Medium (51-200m²)', 51, 200, 0.432, 0.014, true, 30, 12.96),
(gen_random_uuid(), 'Mezzanine', 'Very Short', 'Large (201-500m²)', 201, 500, 0.384, 0.013, true, 30, 11.52),
(gen_random_uuid(), 'Mezzanine', 'Very Short', 'Extra Large (501m²+)', 501, NULL, 0.336, 0.011, true, 30, 10.08)
ON CONFLICT DO NOTHING;

-- Mezzanine Short
INSERT INTO pricing_rates (id, space_type, tenure, area_band_name, area_band_min, area_band_max, monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd) VALUES 
(gen_random_uuid(), 'Mezzanine', 'Short', 'Small (0-50m²)', 0, 50, 0.432, 0.014, true, 30, 12.96),
(gen_random_uuid(), 'Mezzanine', 'Short', 'Medium (51-200m²)', 51, 200, 0.384, 0.013, true, 30, 11.52),
(gen_random_uuid(), 'Mezzanine', 'Short', 'Large (201-500m²)', 201, 500, 0.336, 0.011, true, 30, 10.08),
(gen_random_uuid(), 'Mezzanine', 'Short', 'Extra Large (501m²+)', 501, NULL, 0.288, 0.010, true, 30, 8.64)
ON CONFLICT DO NOTHING;

-- Mezzanine Long
INSERT INTO pricing_rates (id, space_type, tenure, area_band_name, area_band_min, area_band_max, monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd) VALUES 
(gen_random_uuid(), 'Mezzanine', 'Long', 'Small (0-50m²)', 0, 50, 0.384, 0.013, true, 30, 11.52),
(gen_random_uuid(), 'Mezzanine', 'Long', 'Medium (51-200m²)', 51, 200, 0.336, 0.011, true, 30, 10.08),
(gen_random_uuid(), 'Mezzanine', 'Long', 'Large (201-500m²)', 201, 500, 0.288, 0.010, true, 30, 8.64),
(gen_random_uuid(), 'Mezzanine', 'Long', 'Extra Large (501m²+)', 501, NULL, 0.240, 0.008, true, 30, 7.20)
ON CONFLICT DO NOTHING;

-- 3. Add system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('office_monthly_rate', '200.00', 'Monthly office rental rate in BHD'),
('minimum_charge', '50.00', 'Minimum charge for small areas in BHD'),
('days_per_month', '30', 'Number of days per month for daily rate calculations'),
('office_free_threshold', '200', 'Area threshold above which office is free (m²)')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- 4. Add EWA settings
INSERT INTO ewa_settings (id, house_load_description, dedicated_meter_description, estimated_setup_deposit, estimated_installation_fee) VALUES 
(gen_random_uuid(), 'House load electricity included in rent - up to 5kW', 'Dedicated meter with separate billing - setup required', 75.00, 50.00)
ON CONFLICT DO NOTHING;

-- 5. Add optional services
INSERT INTO optional_services (id, name, description, pricing, active) VALUES 
(gen_random_uuid(), 'Loading Dock Access', '24/7 access to loading dock', '75 BHD/month', true),
(gen_random_uuid(), 'Security Service', 'Additional security monitoring', '100 BHD/month', true),
(gen_random_uuid(), 'Climate Control', 'Temperature and humidity control', '250 BHD/month', true),
(gen_random_uuid(), 'Insurance Coverage', 'Basic warehouse insurance', '150 BHD/month', true)
ON CONFLICT DO NOTHING;

-- 6. Verify the fix
SELECT '=== VERIFICATION ===' as info;
SELECT 'Ground Floor Very Short (100m²):' as test, 
CASE WHEN EXISTS (SELECT 1 FROM pricing_rates WHERE space_type = 'Ground Floor' AND tenure = 'Very Short' AND active = true AND 100 >= area_band_min AND (area_band_max IS NULL OR 100 <= area_band_max)) 
THEN '✅ FIXED' ELSE '❌ BROKEN' END as result;
SELECT 'Mezzanine Very Short (100m²):' as test, 
CASE WHEN EXISTS (SELECT 1 FROM pricing_rates WHERE space_type = 'Mezzanine' AND tenure = 'Very Short' AND active = true AND 100 >= area_band_min AND (area_band_max IS NULL OR 100 <= area_band_max)) 
THEN '✅ FIXED' ELSE '❌ BROKEN' END as result;
SELECT 'Mezzanine Long (100m²):' as test, 
CASE WHEN EXISTS (SELECT 1 FROM pricing_rates WHERE space_type = 'Mezzanine' AND tenure = 'Long' AND active = true AND 100 >= area_band_min AND (area_band_max IS NULL OR 100 <= area_band_max)) 
THEN '✅ FIXED' ELSE '❌ BROKEN' END as result;





