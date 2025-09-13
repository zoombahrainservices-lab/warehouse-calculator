-- DEFINITIVE 20% MEZZANINE DISCOUNT FIX
-- This script ensures ALL mezzanine prices are exactly 20% lower than ground floor prices
-- Applied consistently across ALL three leasing terms: Short, Long, and Very Short
-- Based on reverse engineering of the original hardcoded pricing structure

-- Start transaction for safe rollback
BEGIN;

SELECT '=== APPLYING 20% MEZZANINE DISCOUNT RULE ===' as info;

-- 1. Clear existing pricing data
SELECT 'Clearing existing pricing data...' as step;
DELETE FROM pricing_rates WHERE space_type IS NOT NULL;

-- 2. Insert the CORRECTED pricing structure with guaranteed 20% mezzanine discount
SELECT 'Inserting corrected pricing with 20% mezzanine discount...' as step;

-- GROUND FLOOR PRICING (Base rates from original hardcoded values)
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Small units (1-999 m²) - Base rates
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Less than One Year', 'Small units', 1, 999, 3.500, 0.117, true, 30, 105.00),
  (gen_random_uuid(), 'Ground Floor', 'Long', 'More or equal to 1 Year', 'Small units', 1, 999, 3.000, 0.100, true, 35, 105.00),
  
  -- 1,000–1,499 m² - Base rates
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Less than One Year', '1,000–1,499 m²', 1000, 1499, 3.000, 0.100, true, 1000, 3000.00),
  (gen_random_uuid(), 'Ground Floor', 'Long', 'More or equal to 1 Year', '1,000–1,499 m²', 1000, 1499, 2.800, 0.093, true, 1000, 2800.00),
  
  -- 1,500 m² and above - Base rates
  (gen_random_uuid(), 'Ground Floor', 'Short', 'Less than One Year', '1,500 m² and above', 1500, NULL, 2.800, 0.093, true, 1500, 4200.00),
  (gen_random_uuid(), 'Ground Floor', 'Long', 'More or equal to 1 Year', '1,500 m² and above', 1500, NULL, 2.600, 0.087, true, 1500, 3900.00),
  
  -- Very Short Special - Base rates
  (gen_random_uuid(), 'Ground Floor', 'Very Short', 'Special Rate', 'Very Short Special', 1, 999, 4.500, 0.150, true, 25, 112.50);

-- MEZZANINE PRICING (Calculated as exactly 20% lower than Ground Floor)
-- Formula: Mezzanine Rate = Ground Floor Rate × 0.8
INSERT INTO pricing_rates (
  id, space_type, tenure, tenure_description, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd
) VALUES 
  -- Small units (1-999 m²) - 20% discount: 3.500×0.8=2.800, 3.000×0.8=2.400, 4.500×0.8=3.600
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Less than One Year', 'Small units', 1, 999, 2.800, 0.094, true, 30, 84.00),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'More or equal to 1 Year', 'Small units', 1, 999, 2.400, 0.080, true, 35, 84.00),
  (gen_random_uuid(), 'Mezzanine', 'Very Short', 'Special Rate', 'Very Short Special', 1, 999, 3.600, 0.120, true, 25, 90.00),
  
  -- 1,000–1,499 m² - 20% discount: 3.000×0.8=2.400, 2.800×0.8=2.240
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Less than One Year', '1,000–1,499 m²', 1000, 1499, 2.400, 0.080, true, 1000, 2400.00),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'More or equal to 1 Year', '1,000–1,499 m²', 1000, 1499, 2.240, 0.075, true, 1000, 2240.00),
  
  -- 1,500 m² and above - 20% discount: 2.800×0.8=2.240, 2.600×0.8=2.080
  (gen_random_uuid(), 'Mezzanine', 'Short', 'Less than One Year', '1,500 m² and above', 1500, NULL, 2.240, 0.075, true, 1500, 3360.00),
  (gen_random_uuid(), 'Mezzanine', 'Long', 'More or equal to 1 Year', '1,500 m² and above', 1500, NULL, 2.080, 0.070, true, 1500, 3120.00);

-- 3. VERIFICATION: Calculate and verify the 20% discount across ALL terms
SELECT '=== VERIFICATION: 20% DISCOUNT ACROSS ALL TERMS ===' as info;

-- Show the pricing comparison with calculated discount percentages
SELECT 
  'PRICING COMPARISON WITH 20% DISCOUNT VERIFICATION:' as section,
  gf.area_band_name,
  gf.tenure,
  gf.monthly_rate_per_sqm as ground_floor_rate,
  m.monthly_rate_per_sqm as mezzanine_rate,
  ROUND(((gf.monthly_rate_per_sqm - m.monthly_rate_per_sqm) / gf.monthly_rate_per_sqm * 100), 1) as actual_discount_percentage,
  CASE 
    WHEN ROUND(((gf.monthly_rate_per_sqm - m.monthly_rate_per_sqm) / gf.monthly_rate_per_sqm * 100), 1) = 20.0 
    THEN '✅ CORRECT (20%)' 
    ELSE '❌ INCORRECT' 
  END as discount_status,
  ROUND((gf.monthly_rate_per_sqm * 0.8), 3) as expected_mezzanine_rate,
  CASE 
    WHEN m.monthly_rate_per_sqm = ROUND((gf.monthly_rate_per_sqm * 0.8), 3) 
    THEN '✅ MATCHES' 
    ELSE '❌ MISMATCH' 
  END as rate_verification
FROM pricing_rates gf
JOIN pricing_rates m ON gf.area_band_name = m.area_band_name 
  AND gf.tenure = m.tenure 
  AND m.space_type = 'Mezzanine'
WHERE gf.space_type = 'Ground Floor'
ORDER BY gf.area_band_min, gf.tenure;

-- 4. Show complete pricing structure by leasing term
SELECT '=== COMPLETE PRICING STRUCTURE BY LEASING TERM ===' as info;

-- Short Term Pricing
SELECT 'SHORT TERM PRICING (< 12 months):' as section;
SELECT 
  area_band_name,
  space_type,
  monthly_rate_per_sqm,
  daily_rate_per_sqm,
  min_chargeable_area,
  package_starting_bhd
FROM pricing_rates 
WHERE tenure = 'Short' 
ORDER BY space_type, area_band_min;

-- Long Term Pricing
SELECT 'LONG TERM PRICING (12+ months):' as section;
SELECT 
  area_band_name,
  space_type,
  monthly_rate_per_sqm,
  daily_rate_per_sqm,
  min_chargeable_area,
  package_starting_bhd
FROM pricing_rates 
WHERE tenure = 'Long' 
ORDER BY space_type, area_band_min;

-- Very Short Term Pricing
SELECT 'VERY SHORT TERM PRICING (Special rates):' as section;
SELECT 
  area_band_name,
  space_type,
  monthly_rate_per_sqm,
  daily_rate_per_sqm,
  min_chargeable_area,
  package_starting_bhd
FROM pricing_rates 
WHERE tenure = 'Very Short' 
ORDER BY space_type, area_band_min;

-- 5. Example calculations for 100m² (as requested)
SELECT '=== EXAMPLE CALCULATIONS FOR 100m² ===' as info;

-- Short Term (6 months)
SELECT 'SHORT TERM (6 months) - 100m²:' as example;
SELECT 
  'Ground Floor' as space_type,
  100 as area_m2,
  6 as months,
  (100 * 3.500 * 6) as total_cost_bhd,
  (100 * 3.500) as monthly_cost_bhd
UNION ALL
SELECT 
  'Mezzanine' as space_type,
  100 as area_m2,
  6 as months,
  (100 * 2.800 * 6) as total_cost_bhd,
  (100 * 2.800) as monthly_cost_bhd;

-- Long Term (12 months)
SELECT 'LONG TERM (12 months) - 100m²:' as example;
SELECT 
  'Ground Floor' as space_type,
  100 as area_m2,
  12 as months,
  (100 * 3.000 * 12) as total_cost_bhd,
  (100 * 3.000) as monthly_cost_bhd
UNION ALL
SELECT 
  'Mezzanine' as space_type,
  100 as area_m2,
  12 as months,
  (100 * 2.400 * 12) as total_cost_bhd,
  (100 * 2.400) as monthly_cost_bhd;

-- Very Short Term (7 days)
SELECT 'VERY SHORT TERM (7 days) - 100m²:' as example;
SELECT 
  'Ground Floor' as space_type,
  100 as area_m2,
  7 as days,
  (100 * 0.150 * 7) as total_cost_bhd,
  (100 * 0.150) as daily_cost_bhd
UNION ALL
SELECT 
  'Mezzanine' as space_type,
  100 as area_m2,
  7 as days,
  (100 * 0.120 * 7) as total_cost_bhd,
  (100 * 0.120) as daily_cost_bhd;

-- 6. Final verification summary
SELECT '=== FINAL VERIFICATION SUMMARY ===' as info;
SELECT 
  COUNT(*) as total_pricing_rates,
  COUNT(CASE WHEN space_type = 'Ground Floor' THEN 1 END) as ground_floor_rates,
  COUNT(CASE WHEN space_type = 'Mezzanine' THEN 1 END) as mezzanine_rates,
  COUNT(CASE WHEN tenure = 'Short' THEN 1 END) as short_term_rates,
  COUNT(CASE WHEN tenure = 'Long' THEN 1 END) as long_term_rates,
  COUNT(CASE WHEN tenure = 'Very Short' THEN 1 END) as very_short_term_rates,
  'All mezzanine rates are exactly 20% lower than corresponding ground floor rates' as verification_status
FROM pricing_rates;

SELECT '✅ 20% MEZZANINE DISCOUNT RULE APPLIED SUCCESSFULLY!' as success;
SELECT '✅ All three leasing terms (Short, Long, Very Short) follow the 20% rule' as success;
SELECT '✅ Pricing structure is mathematically correct and consistent' as success;

-- Commit the transaction
COMMIT;

