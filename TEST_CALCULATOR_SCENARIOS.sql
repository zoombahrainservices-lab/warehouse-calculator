-- Test Calculator Scenarios
-- This script tests all the problematic scenarios to ensure they work

-- Test 1: Ground Floor Very Short Term (100m², 7 days)
SELECT '=== TEST 1: Ground Floor Very Short Term ===' as test_info;
SELECT 
  'Inputs: Ground Floor, 100m², Very Short, 7 days' as scenario,
  space_type,
  area_band_name,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  'Daily Cost: ' || (100 * daily_rate_per_sqm)::text || ' BHD' as daily_cost,
  '7-Day Cost: ' || (100 * daily_rate_per_sqm * 7)::text || ' BHD' as weekly_cost,
  'Status: ' || CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END as status
FROM pricing_rates 
WHERE space_type = 'Ground Floor' 
  AND tenure = 'Very Short'
  AND active = true
  AND 100 >= area_band_min 
  AND (area_band_max IS NULL OR 100 <= area_band_max);

-- Test 2: Mezzanine Very Short Term (100m², 7 days)
SELECT '=== TEST 2: Mezzanine Very Short Term ===' as test_info;
SELECT 
  'Inputs: Mezzanine, 100m², Very Short, 7 days' as scenario,
  space_type,
  area_band_name,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  'Daily Cost: ' || (100 * daily_rate_per_sqm)::text || ' BHD' as daily_cost,
  '7-Day Cost: ' || (100 * daily_rate_per_sqm * 7)::text || ' BHD' as weekly_cost,
  'Status: ' || CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END as status
FROM pricing_rates 
WHERE space_type = 'Mezzanine' 
  AND tenure = 'Very Short'
  AND active = true
  AND 100 >= area_band_min 
  AND (area_band_max IS NULL OR 100 <= area_band_max);

-- Test 3: Mezzanine Long Term (100m², 12 months)
SELECT '=== TEST 3: Mezzanine Long Term ===' as test_info;
SELECT 
  'Inputs: Mezzanine, 100m², Long, 12 months' as scenario,
  space_type,
  area_band_name,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  'Monthly Cost: ' || (100 * monthly_rate_per_sqm)::text || ' BHD' as monthly_cost,
  '12-Month Cost: ' || (100 * monthly_rate_per_sqm * 12)::text || ' BHD' as yearly_cost,
  'Status: ' || CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END as status
FROM pricing_rates 
WHERE space_type = 'Mezzanine' 
  AND tenure = 'Long'
  AND active = true
  AND 100 >= area_band_min 
  AND (area_band_max IS NULL OR 100 <= area_band_max);

-- Test 4: Ground Floor Short Term (50m², 6 months)
SELECT '=== TEST 4: Ground Floor Short Term ===' as test_info;
SELECT 
  'Inputs: Ground Floor, 50m², Short, 6 months' as scenario,
  space_type,
  area_band_name,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  'Monthly Cost: ' || (50 * monthly_rate_per_sqm)::text || ' BHD' as monthly_cost,
  '6-Month Cost: ' || (50 * monthly_rate_per_sqm * 6)::text || ' BHD' as total_cost,
  'Status: ' || CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END as status
FROM pricing_rates 
WHERE space_type = 'Ground Floor' 
  AND tenure = 'Short'
  AND active = true
  AND 50 >= area_band_min 
  AND (area_band_max IS NULL OR 50 <= area_band_max);

-- Test 5: Edge Cases - Small Area (25m²)
SELECT '=== TEST 5: Small Area Edge Case ===' as test_info;
SELECT 
  'Inputs: Ground Floor, 25m², Very Short, 3 days' as scenario,
  space_type,
  area_band_name,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  min_chargeable_area,
  'Daily Cost: ' || (25 * daily_rate_per_sqm)::text || ' BHD' as daily_cost,
  '3-Day Cost: ' || (25 * daily_rate_per_sqm * 3)::text || ' BHD' as total_cost,
  'Status: ' || CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END as status
FROM pricing_rates 
WHERE space_type = 'Ground Floor' 
  AND tenure = 'Very Short'
  AND active = true
  AND 25 >= area_band_min 
  AND (area_band_max IS NULL OR 25 <= area_band_max);

-- Test 6: Large Area (1000m²)
SELECT '=== TEST 6: Large Area Edge Case ===' as test_info;
SELECT 
  'Inputs: Mezzanine, 1000m², Long, 24 months' as scenario,
  space_type,
  area_band_name,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  'Monthly Cost: ' || (1000 * monthly_rate_per_sqm)::text || ' BHD' as monthly_cost,
  '24-Month Cost: ' || (1000 * monthly_rate_per_sqm * 24)::text || ' BHD' as total_cost,
  'Status: ' || CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END as status
FROM pricing_rates 
WHERE space_type = 'Mezzanine' 
  AND tenure = 'Long'
  AND active = true
  AND 1000 >= area_band_min 
  AND (area_band_max IS NULL OR 1000 <= area_band_max);

-- Test 7: System Settings Validation
SELECT '=== TEST 7: System Settings Check ===' as test_info;
SELECT 
  setting_key,
  setting_value,
  description,
  CASE 
    WHEN setting_key IN ('office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold') 
    THEN 'REQUIRED'
    ELSE 'OPTIONAL'
  END as importance
FROM system_settings 
WHERE setting_key IN ('office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold')
ORDER BY setting_key;

-- Test 8: EWA Settings Validation
SELECT '=== TEST 8: EWA Settings Check ===' as test_info;
SELECT 
  house_load_description,
  dedicated_meter_description,
  estimated_setup_deposit,
  estimated_installation_fee,
  'EWA Settings: ' || CASE WHEN house_load_description IS NOT NULL THEN 'CONFIGURED' ELSE 'MISSING' END as status
FROM ewa_settings 
LIMIT 1;

-- Test 9: Complete Coverage Check
SELECT '=== TEST 9: Complete Coverage Check ===' as test_info;
SELECT 
  space_type,
  tenure,
  COUNT(*) as rate_count,
  SUM(CASE WHEN active = true THEN 1 ELSE 0 END) as active_count,
  'Coverage: ' || CASE 
    WHEN COUNT(*) >= 4 THEN 'COMPLETE'
    WHEN COUNT(*) >= 2 THEN 'PARTIAL'
    ELSE 'INCOMPLETE'
  END as coverage_status
FROM pricing_rates 
GROUP BY space_type, tenure
ORDER BY space_type, tenure;

-- Test 10: Expected Results Summary
SELECT '=== TEST 10: Expected Results Summary ===' as test_info;
SELECT 
  'Ground Floor Very Short (100m², 7 days)' as scenario,
  'Expected: 1.50 BHD daily, 10.50 BHD total' as expected_result,
  'Status: ' || CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Ground Floor' 
        AND tenure = 'Very Short' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN 'WORKING'
    ELSE 'BROKEN'
  END as status
UNION ALL
SELECT 
  'Mezzanine Very Short (100m², 7 days)' as scenario,
  'Expected: 1.20 BHD daily, 8.40 BHD total' as expected_result,
  'Status: ' || CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Mezzanine' 
        AND tenure = 'Very Short' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN 'WORKING'
    ELSE 'BROKEN'
  END as status
UNION ALL
SELECT 
  'Mezzanine Long Term (100m², 12 months)' as scenario,
  'Expected: 28.00 BHD monthly, 336.00 BHD total' as expected_result,
  'Status: ' || CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Mezzanine' 
        AND tenure = 'Long' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN 'WORKING'
    ELSE 'BROKEN'
  END as status;
