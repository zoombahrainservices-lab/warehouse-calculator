-- RESTORE ORIGINAL HARDCODED WAREHOUSE PRICES - SIMPLE VERSION
-- This file restores the EXACT original pricing structure from Sitra warehouse system
-- Handles common table structure variations

-- Start transaction for safe rollback
BEGIN;

SELECT '=== RESTORING ORIGINAL HARDCODED PRICES ===' as info;

-- 1. Clean up existing pricing data
SELECT 'Cleaning up existing pricing data...' as step;

-- Check if tables exist before proceeding
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pricing_rates') THEN
    RAISE EXCEPTION 'Table pricing_rates does not exist. Please run the database setup first.';
  END IF;
END $$;

-- Clean up existing pricing data
DELETE FROM pricing_rates WHERE space_type IS NOT NULL;
DELETE FROM pricing_rates WHERE tenure IS NOT NULL;

-- 2. Restore EXACT original pricing structure
SELECT 'Restoring original hardcoded pricing...' as step;

-- GROUND FLOOR PRICING (EXACT ORIGINAL VALUES)
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Small units (1-999 m²) - EXACT ORIGINAL PRICES
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Less than One Year', 'Small units', 1, 999, 3.500, 0.117, true, 30, 105.00),
  (gen_random_uuid(), 'Ground Floor', 'Long', 'More or equal to 1 Year', 'Small units', 1, 999, 3.000, 0.100, true, 35, 105.00),
  
  -- 1,000–1,499 m² - EXACT ORIGINAL PRICES
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Less than One Year', '1,000–1,499 m²', 1000, 1499, 3.000, 0.100, true, 1000, 3000.00),
  (gen_random_uuid(), 'Ground Floor', 'Long', 'More or equal to 1 Year', '1,000–1,499 m²', 1000, 1499, 2.800, 0.093, true, 1000, 2800.00),
  
  -- 1,500 m² and above - EXACT ORIGINAL PRICES
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Less than One Year', '1,500 m² and above', 1500, NULL, 2.800, 0.093, true, 1500, 4200.00),
  (gen_random_uuid(), 'Ground Floor', 'Long', 'More or equal to 1 Year', '1,500 m² and above', 1500, NULL, 2.600, 0.087, true, 1500, 3900.00),
  
  -- Very Short Special - EXACT ORIGINAL PRICES
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Special Rate', 'Very Short Special', 1, 999, 4.500, 0.150, true, 25, 112.50);

-- MEZZANINE PRICING (20% cheaper than Ground Floor - EXACT ORIGINAL VALUES)
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Small units (1-999 m²) - 20% discount from Ground Floor
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Less than One Year', 'Small units', 1, 999, 2.800, 0.094, true, 30, 84.00),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'More or equal to 1 Year', 'Small units', 1, 999, 2.400, 0.080, true, 35, 84.00),
  
  -- 1,000–1,499 m² - 20% discount from Ground Floor
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Less than One Year', '1,000–1,499 m²', 1000, 1499, 2.400, 0.080, true, 1000, 2400.00),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'More or equal to 1 Year', '1,000–1,499 m²', 1000, 1499, 2.240, 0.075, true, 1000, 2240.00),
  
  -- 1,500 m² and above - 20% discount from Ground Floor
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Less than One Year', '1,500 m² and above', 1500, NULL, 2.240, 0.075, true, 1500, 3360.00),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'More or equal to 1 Year', '1,500 m² and above', 1500, NULL, 2.080, 0.070, true, 1500, 3120.00),
  
  -- Very Short Special - 20% discount from Ground Floor
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Special Rate', 'Very Short Special', 1, 999, 3.600, 0.120, true, 25, 90.00);

-- 3. Try to restore system settings (if table exists)
SELECT 'Attempting to restore system settings...' as step;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_settings') THEN
    -- Try to insert system settings
    BEGIN
      INSERT INTO system_settings (setting_key, setting_value, description) VALUES
        ('office_monthly_rate', '200.00', 'Office space monthly rate in BHD'),
        ('minimum_charge', '100.00', 'Minimum chargeable amount in BHD'),
        ('days_per_month', '30', 'Number of days used for pro-rata calculations'),
        ('office_free_threshold', '3000', 'Monthly bill threshold above which office is free')
      ON CONFLICT (setting_key) DO UPDATE SET
        setting_value = EXCLUDED.setting_value,
        description = EXCLUDED.description;
      
      RAISE NOTICE 'System settings restored successfully';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not restore system settings: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'system_settings table does not exist, skipping...';
  END IF;
END $$;

-- 4. Try to restore EWA settings (if table exists)
SELECT 'Attempting to restore EWA settings...' as step;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ewa_settings') THEN
    -- Try to insert EWA settings
    BEGIN
      INSERT INTO ewa_settings (id, house_load_description, dedicated_meter_description, estimated_setup_deposit, estimated_installation_fee) VALUES
        (gen_random_uuid(), 'House-load for lighting and low-power office devices (phones, laptops/PCs). No EWA application or connection needed.',
         'For heavier power needs, we can install a dedicated EWA meter. Tenant pays actual consumption and any meter fees. EWA will send bills directly.',
         100.00, 150.00)
      ON CONFLICT DO NOTHING;
      
      RAISE NOTICE 'EWA settings restored successfully';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not restore EWA settings: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'ewa_settings table does not exist, skipping...';
  END IF;
END $$;

-- 5. Verify the restored pricing
SELECT '=== VERIFICATION: ORIGINAL PRICING RESTORED ===' as info;

-- Show Ground Floor pricing
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

-- Show Mezzanine pricing
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

-- Show pricing summary
SELECT '=== PRICING SUMMARY ===' as summary;
SELECT 
  'Small units (1-999m²)' as area_band,
  'Ground Floor' as space_type,
  'Short: 3.500 BHD/m², Long: 3.000 BHD/m², Very Short: 4.500 BHD/m²' as rates
UNION ALL
SELECT 
  '1,000–1,499 m²' as area_band,
  'Ground Floor' as space_type,
  'Short: 3.000 BHD/m², Long: 2.800 BHD/m²' as rates
UNION ALL
SELECT 
  '1,500 m² and above' as area_band,
  'Ground Floor' as space_type,
  'Short: 2.800 BHD/m², Long: 2.600 BHD/m²' as rates
UNION ALL
SELECT 
  'Mezzanine (20% discount)' as area_band,
  'All areas' as space_type,
  '20% cheaper than Ground Floor rates' as rates;

SELECT '✅ ORIGINAL HARDCODED PRICES SUCCESSFULLY RESTORED!' as success;


