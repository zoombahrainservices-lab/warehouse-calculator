-- IMMEDIATE DIAGNOSIS - Check what's actually in your database
-- Run this first to see the current state

-- 1. Check if pricing_rates table exists and has data
SELECT '=== DATABASE STATE CHECK ===' as info;

SELECT 'Total pricing rates in database:' as metric, COUNT(*)::text as value FROM pricing_rates;

-- 2. Check what rates exist for the problematic combinations
SELECT '=== PROBLEMATIC COMBINATIONS CHECK ===' as info;

-- Check Ground Floor Very Short
SELECT 'Ground Floor Very Short rates:' as check_type;
SELECT 
  space_type,
  tenure,
  area_band_name,
  area_band_min,
  area_band_max,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  active,
  'Would match 100m²: ' || CASE 
    WHEN 100 >= area_band_min AND (area_band_max IS NULL OR 100 <= area_band_max) 
    THEN 'YES' 
    ELSE 'NO' 
  END as matches_100m2
FROM pricing_rates 
WHERE space_type = 'Ground Floor' AND tenure = 'Very Short';

-- Check Mezzanine Very Short
SELECT 'Mezzanine Very Short rates:' as check_type;
SELECT 
  space_type,
  tenure,
  area_band_name,
  area_band_min,
  area_band_max,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  active,
  'Would match 100m²: ' || CASE 
    WHEN 100 >= area_band_min AND (area_band_max IS NULL OR 100 <= area_band_max) 
    THEN 'YES' 
    ELSE 'NO' 
  END as matches_100m2
FROM pricing_rates 
WHERE space_type = 'Mezzanine' AND tenure = 'Very Short';

-- Check Mezzanine Long
SELECT 'Mezzanine Long rates:' as check_type;
SELECT 
  space_type,
  tenure,
  area_band_name,
  area_band_min,
  area_band_max,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  active,
  'Would match 100m²: ' || CASE 
    WHEN 100 >= area_band_min AND (area_band_max IS NULL OR 100 <= area_band_max) 
    THEN 'YES' 
    ELSE 'NO' 
  END as matches_100m2
FROM pricing_rates 
WHERE space_type = 'Mezzanine' AND tenure = 'Long';

-- 3. Check what the calculator actually loads (only active rates)
SELECT '=== WHAT CALCULATOR SEES ===' as info;
SELECT 'Active rates only (what calculator loads):' as check_type;
SELECT 
  space_type,
  tenure,
  COUNT(*) as rate_count,
  'Has rates: ' || CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as has_rates
FROM pricing_rates 
WHERE active = true
GROUP BY space_type, tenure
ORDER BY space_type, tenure;

-- 4. Check for any data issues
SELECT '=== DATA ISSUES CHECK ===' as info;

-- Check for null or zero rates
SELECT 'Rates with null or zero values:' as check_type;
SELECT 
  space_type,
  tenure,
  area_band_name,
  daily_rate_per_sqm,
  monthly_rate_per_sqm
FROM pricing_rates 
WHERE daily_rate_per_sqm IS NULL 
   OR monthly_rate_per_sqm IS NULL 
   OR daily_rate_per_sqm = 0 
   OR monthly_rate_per_sqm = 0;

-- Check for missing area bands
SELECT 'Missing area bands (null values):' as check_type;
SELECT 
  space_type,
  tenure,
  area_band_name,
  area_band_min,
  area_band_max
FROM pricing_rates 
WHERE area_band_min IS NULL OR area_band_max IS NULL;

-- 5. Test the exact calculator logic
SELECT '=== CALCULATOR LOGIC TEST ===' as info;

-- Test for Ground Floor Very Short (100m²)
SELECT 'Testing Ground Floor Very Short (100m²):' as test_case;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Ground Floor' 
        AND tenure = 'Very Short' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN 'WOULD FIND A RATE'
    ELSE 'NO RATE FOUND - THIS IS THE PROBLEM'
  END as result;

-- Test for Mezzanine Very Short (100m²)
SELECT 'Testing Mezzanine Very Short (100m²):' as test_case;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Mezzanine' 
        AND tenure = 'Very Short' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN 'WOULD FIND A RATE'
    ELSE 'NO RATE FOUND - THIS IS THE PROBLEM'
  END as result;

-- Test for Mezzanine Long (100m²)
SELECT 'Testing Mezzanine Long (100m²):' as test_case;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Mezzanine' 
        AND tenure = 'Long' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN 'WOULD FIND A RATE'
    ELSE 'NO RATE FOUND - THIS IS THE PROBLEM'
  END as result;
