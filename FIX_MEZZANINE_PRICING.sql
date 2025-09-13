-- FIX MEZZANINE PRICING - RESTORE 20% DISCOUNT
-- This script fixes the mezzanine pricing to be 20% cheaper than ground floor
-- Run this in your Supabase SQL Editor

-- Start transaction for safe rollback
BEGIN;

SELECT '=== FIXING MEZZANINE PRICING ===' as info;

-- 1. Clear existing pricing data
SELECT 'Clearing existing pricing data...' as step;
DELETE FROM pricing_rates WHERE space_type IS NOT NULL;

-- 2. Insert corrected pricing with proper 20% mezzanine discount
SELECT 'Inserting corrected pricing...' as step;

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

-- MEZZANINE PRICING (20% cheaper than Ground Floor - CORRECTED VALUES)
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

-- 3. Verify the corrected pricing
SELECT '=== VERIFICATION: CORRECTED PRICING ===' as info;

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

-- Show pricing comparison
SELECT 'PRICING COMPARISON (Ground Floor vs Mezzanine):' as section;
SELECT 
  gf.area_band_name,
  gf.tenure,
  gf.monthly_rate_per_sqm as ground_floor_rate,
  m.monthly_rate_per_sqm as mezzanine_rate,
  ROUND(((gf.monthly_rate_per_sqm - m.monthly_rate_per_sqm) / gf.monthly_rate_per_sqm * 100), 1) as discount_percentage
FROM pricing_rates gf
JOIN pricing_rates m ON gf.area_band_name = m.area_band_name 
  AND gf.tenure = m.tenure 
  AND m.space_type = 'Mezzanine'
WHERE gf.space_type = 'Ground Floor'
ORDER BY gf.area_band_min, gf.tenure;

SELECT '✅ MEZZANINE PRICING FIXED - 20% DISCOUNT RESTORED!' as success;

-- Commit the transaction
COMMIT;

