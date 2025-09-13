-- CHECK CURRENT DATABASE STATE
-- This will show us exactly what's in your database right now

SELECT '=== CURRENT DATABASE STATE ===' as info;

-- 1. Check if pricing_rates table exists and has data
SELECT 'Total pricing rates in database:' as metric, COUNT(*)::text as value FROM pricing_rates;

-- 2. Show all current pricing rates
SELECT '=== ALL CURRENT PRICING RATES ===' as info;
SELECT 
  space_type,
  tenure,
  area_band_name,
  area_band_min,
  area_band_max,
  daily_rate_per_sqm,
  monthly_rate_per_sqm,
  active,
  min_chargeable_area,
  package_starting_bhd
FROM pricing_rates 
ORDER BY space_type, tenure, area_band_min;

-- 3. Check system settings
SELECT '=== SYSTEM SETTINGS ===' as info;
SELECT 
  setting_key,
  setting_value,
  description
FROM system_settings 
ORDER BY setting_key;

-- 4. Check EWA settings
SELECT '=== EWA SETTINGS ===' as info;
SELECT 
  house_load_description,
  dedicated_meter_description,
  estimated_setup_deposit,
  estimated_installation_fee
FROM ewa_settings 
LIMIT 1;

-- 5. Check optional services
SELECT '=== OPTIONAL SERVICES ===' as info;
SELECT 
  name,
  description,
  pricing,
  active
FROM optional_services 
ORDER BY name;

-- 6. Test specific problematic scenarios
SELECT '=== PROBLEMATIC SCENARIOS TEST ===' as info;

-- Test Ground Floor Very Short
SELECT 'Ground Floor Very Short (100m²):' as test_case;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Ground Floor' 
        AND tenure = 'Very Short' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN '✅ HAS RATE'
    ELSE '❌ NO RATE FOUND'
  END as result;

-- Test Mezzanine Very Short
SELECT 'Mezzanine Very Short (100m²):' as test_case;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Mezzanine' 
        AND tenure = 'Very Short' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN '✅ HAS RATE'
    ELSE '❌ NO RATE FOUND'
  END as result;

-- Test Mezzanine Long
SELECT 'Mezzanine Long (100m²):' as test_case;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pricing_rates 
      WHERE space_type = 'Mezzanine' 
        AND tenure = 'Long' 
        AND active = true 
        AND 100 >= area_band_min 
        AND (area_band_max IS NULL OR 100 <= area_band_max)
    ) THEN '✅ HAS RATE'
    ELSE '❌ NO RATE FOUND'
  END as result;

-- 7. Summary of what's missing
SELECT '=== WHAT IS MISSING ===' as info;
SELECT 
  'Ground Floor Very Short rates:' as check_type,
  COUNT(*)::text as count
FROM pricing_rates 
WHERE space_type = 'Ground Floor' AND tenure = 'Very Short'
UNION ALL
SELECT 
  'Mezzanine Very Short rates:' as check_type,
  COUNT(*)::text as count
FROM pricing_rates 
WHERE space_type = 'Mezzanine' AND tenure = 'Very Short'
UNION ALL
SELECT 
  'Mezzanine Long rates:' as check_type,
  COUNT(*)::text as count
FROM pricing_rates 
WHERE space_type = 'Mezzanine' AND tenure = 'Long'
UNION ALL
SELECT 
  'Required system settings:' as check_type,
  COUNT(*)::text as count
FROM system_settings 
WHERE setting_key IN ('office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold');





