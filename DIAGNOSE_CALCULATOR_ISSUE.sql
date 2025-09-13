-- Comprehensive Calculator Issue Diagnosis
-- This script will identify exactly what's wrong with the calculator

-- 1. Check what pricing rates actually exist in the database
SELECT '=== ACTUAL DATABASE STATE ===' as info;

SELECT 'All Pricing Rates in Database:' as info;
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
  package_starting_bhd,
  created_at
FROM pricing_rates 
ORDER BY space_type, tenure, area_band_min;

-- 2. Check what the calculator is actually loading (only active rates)
SELECT '=== WHAT CALCULATOR LOADS ===' as info;
SELECT 'Active Pricing Rates (what calculator sees):' as info;
SELECT 
  space_type,
  tenure,
  area_band_name,
  area_band_min,
  area_band_max,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  active
FROM pricing_rates 
WHERE active = true
ORDER BY space_type, tenure, area_band_min;

-- 3. Check for the specific problematic scenarios
SELECT '=== PROBLEMATIC SCENARIOS CHECK ===' as info;

-- Scenario 1: Ground Floor Very Short (100m²)
SELECT 'Scenario 1: Ground Floor Very Short (100m²)' as scenario;
SELECT 
  space_type,
  tenure,
  area_band_name,
  daily_rate_per_sqm,
  'Would Match: ' || CASE 
    WHEN space_type = 'Ground Floor' 
      AND tenure = 'Very Short' 
      AND active = true 
      AND 100 >= area_band_min 
      AND (area_band_max IS NULL OR 100 <= area_band_max)
    THEN 'YES'
    ELSE 'NO'
  END as match_status
FROM pricing_rates 
WHERE space_type = 'Ground Floor' AND tenure = 'Very Short';

-- Scenario 2: Mezzanine Very Short (100m²)
SELECT 'Scenario 2: Mezzanine Very Short (100m²)' as scenario;
SELECT 
  space_type,
  tenure,
  area_band_name,
  daily_rate_per_sqm,
  'Would Match: ' || CASE 
    WHEN space_type = 'Mezzanine' 
      AND tenure = 'Very Short' 
      AND active = true 
      AND 100 >= area_band_min 
      AND (area_band_max IS NULL OR 100 <= area_band_max)
    THEN 'YES'
    ELSE 'NO'
  END as match_status
FROM pricing_rates 
WHERE space_type = 'Mezzanine' AND tenure = 'Very Short';

-- Scenario 3: Mezzanine Long (100m²)
SELECT 'Scenario 3: Mezzanine Long (100m²)' as scenario;
SELECT 
  space_type,
  tenure,
  area_band_name,
  monthly_rate_per_sqm,
  'Would Match: ' || CASE 
    WHEN space_type = 'Mezzanine' 
      AND tenure = 'Long' 
      AND active = true 
      AND 100 >= area_band_min 
      AND (area_band_max IS NULL OR 100 <= area_band_max)
    THEN 'YES'
    ELSE 'NO'
  END as match_status
FROM pricing_rates 
WHERE space_type = 'Mezzanine' AND tenure = 'Long';

-- 4. Check system settings
SELECT '=== SYSTEM SETTINGS CHECK ===' as info;
SELECT 
  setting_key,
  setting_value,
  description,
  'Required: ' || CASE 
    WHEN setting_key IN ('office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold') 
    THEN 'YES'
    ELSE 'NO'
  END as required
FROM system_settings 
ORDER BY setting_key;

-- 5. Check EWA settings
SELECT '=== EWA SETTINGS CHECK ===' as info;
SELECT 
  house_load_description,
  dedicated_meter_description,
  estimated_setup_deposit,
  estimated_installation_fee,
  'Configured: ' || CASE WHEN house_load_description IS NOT NULL THEN 'YES' ELSE 'NO' END as configured
FROM ewa_settings 
LIMIT 1;

-- 6. Simulate the exact calculator logic
SELECT '=== CALCULATOR LOGIC SIMULATION ===' as info;

-- Simulate findApplicableRate for Ground Floor Very Short (100m²)
SELECT 'Simulating findApplicableRate for Ground Floor Very Short (100m²):' as simulation;
SELECT 
  space_type,
  tenure,
  area_band_name,
  daily_rate_per_sqm,
  'Match Conditions:' as conditions,
  'space_type = Ground Floor: ' || CASE WHEN space_type = 'Ground Floor' THEN 'TRUE' ELSE 'FALSE' END as condition1,
  'tenure = Very Short: ' || CASE WHEN tenure = 'Very Short' THEN 'TRUE' ELSE 'FALSE' END as condition2,
  'active = true: ' || CASE WHEN active = true THEN 'TRUE' ELSE 'FALSE' END as condition3,
  'area >= area_band_min: ' || CASE WHEN 100 >= area_band_min THEN 'TRUE' ELSE 'FALSE' END as condition4,
  'area <= area_band_max: ' || CASE WHEN area_band_max IS NULL OR 100 <= area_band_max THEN 'TRUE' ELSE 'FALSE' END as condition5,
  'ALL CONDITIONS: ' || CASE 
    WHEN space_type = 'Ground Floor' 
      AND tenure = 'Very Short' 
      AND active = true 
      AND 100 >= area_band_min 
      AND (area_band_max IS NULL OR 100 <= area_band_max)
    THEN 'TRUE - WOULD MATCH'
    ELSE 'FALSE - NO MATCH'
  END as final_result
FROM pricing_rates 
WHERE space_type = 'Ground Floor' OR tenure = 'Very Short'
ORDER BY space_type, tenure;

-- 7. Check for any data inconsistencies
SELECT '=== DATA INCONSISTENCIES CHECK ===' as info;

-- Check for null values in critical fields
SELECT 'Null values in critical fields:' as check_type;
SELECT 
  'space_type' as field,
  COUNT(*) as null_count
FROM pricing_rates 
WHERE space_type IS NULL
UNION ALL
SELECT 
  'tenure' as field,
  COUNT(*) as null_count
FROM pricing_rates 
WHERE tenure IS NULL
UNION ALL
SELECT 
  'daily_rate_per_sqm' as field,
  COUNT(*) as null_count
FROM pricing_rates 
WHERE daily_rate_per_sqm IS NULL
UNION ALL
SELECT 
  'monthly_rate_per_sqm' as field,
  COUNT(*) as null_count
FROM pricing_rates 
WHERE monthly_rate_per_sqm IS NULL;

-- Check for zero rates
SELECT 'Zero rates (potential issue):' as check_type;
SELECT 
  space_type,
  tenure,
  area_band_name,
  daily_rate_per_sqm,
  monthly_rate_per_sqm
FROM pricing_rates 
WHERE (daily_rate_per_sqm = 0 OR daily_rate_per_sqm IS NULL)
   OR (monthly_rate_per_sqm = 0 OR monthly_rate_per_sqm IS NULL);

-- 8. Summary of issues
SELECT '=== ISSUE SUMMARY ===' as info;

SELECT 
  'Ground Floor Very Short' as scenario,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Ground Floor' 
        AND tenure = 'Very Short' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN 'WORKING'
    ELSE 'BROKEN - No matching rate found'
  END as status
UNION ALL
SELECT 
  'Mezzanine Very Short' as scenario,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Mezzanine' 
        AND tenure = 'Very Short' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN 'WORKING'
    ELSE 'BROKEN - No matching rate found'
  END as status
UNION ALL
SELECT 
  'Mezzanine Long' as scenario,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Mezzanine' 
        AND tenure = 'Long' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN 'WORKING'
    ELSE 'BROKEN - No matching rate found'
  END as status;

-- 9. Check if the issue is with the database or the application
SELECT '=== ROOT CAUSE ANALYSIS ===' as info;

SELECT 
  'Total pricing rates in database:' as metric,
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
FROM pricing_rates WHERE tenure = 'Very Short'
UNION ALL
SELECT 
  'Mezzanine rates:' as metric,
  COUNT(*)::text as value
FROM pricing_rates WHERE space_type = 'Mezzanine'
UNION ALL
SELECT 
  'Required system settings:' as metric,
  COUNT(*)::text as value
FROM system_settings 
WHERE setting_key IN ('office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold');





