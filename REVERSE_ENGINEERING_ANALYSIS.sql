-- REVERSE ENGINEERING ANALYSIS
-- This script will analyze the current database structure and pricing algorithm

SELECT '=== REVERSE ENGINEERING ANALYSIS STARTED ===' as info;

-- 1. Check current database structure
SELECT '=== CURRENT DATABASE STRUCTURE ===' as section;

-- Check if tables exist
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('pricing_rates', 'ewa_settings', 'optional_services', 'system_settings', 'quotes');

-- 2. Analyze pricing_rates table structure
SELECT '=== PRICING_RATES TABLE STRUCTURE ===' as section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'pricing_rates' 
ORDER BY ordinal_position;

-- 3. Check current pricing data
SELECT '=== CURRENT PRICING DATA ===' as section;

SELECT 
  space_type,
  tenure,
  area_band_name,
  area_band_min,
  area_band_max,
  monthly_rate_per_sqm,
  daily_rate_per_sqm,
  min_chargeable_area,
  package_starting_bhd,
  active,
  COUNT(*) as count
FROM pricing_rates 
GROUP BY 
  space_type, tenure, area_band_name, area_band_min, area_band_max,
  monthly_rate_per_sqm, daily_rate_per_sqm, min_chargeable_area, 
  package_starting_bhd, active
ORDER BY space_type, tenure, area_band_min;

-- 4. Analyze the original schema pricing logic
SELECT '=== ORIGINAL SCHEMA PRICING LOGIC ===' as section;

-- The original schema shows this pricing structure:
-- size_band: 500, 1000, 1500, 2000
-- tenure: 'Short', 'Long'
-- space_type: 'Ground Floor', 'Mezzanine', 'Office'
-- Sample rates from original schema:
-- (500, 'Short', 2.500, 30, 'Ground Floor')
-- (500, 'Long', 3.000, 30, 'Ground Floor')
-- (1000, 'Short', 3.000, 50, 'Ground Floor')
-- (1000, 'Long', 2.800, 50, 'Ground Floor')
-- (1500, 'Short', 2.800, 75, 'Ground Floor')
-- (1500, 'Long', 2.600, 75, 'Ground Floor')
-- (2000, 'Short', 2.600, 100, 'Ground Floor')
-- (2000, 'Long', 2.400, 100, 'Ground Floor')

SELECT 'ORIGINAL PRICING PATTERN:' as info;
SELECT 'Size Band -> Min Chargeable Area -> Rate' as pattern;
SELECT '500m² -> 30m² -> 2.500-3.000 BHD/m²' as example1;
SELECT '1000m² -> 50m² -> 2.800-3.000 BHD/m²' as example2;
SELECT '1500m² -> 75m² -> 2.600-2.800 BHD/m²' as example3;
SELECT '2000m² -> 100m² -> 2.400-2.600 BHD/m²' as example4;

-- 5. Check system settings
SELECT '=== SYSTEM SETTINGS ===' as section;

SELECT 
  setting_key,
  setting_value,
  description
FROM system_settings 
ORDER BY setting_key;

-- 6. Check EWA settings
SELECT '=== EWA SETTINGS ===' as section;

SELECT 
  included_kw_cap,
  included_kwh_cap,
  tariff_per_kwh,
  fixed_monthly_charges,
  meter_deposit,
  meter_installation_fee
FROM ewa_settings 
LIMIT 1;

-- 7. Analyze the calculator algorithm
SELECT '=== CALCULATOR ALGORITHM ANALYSIS ===' as section;

SELECT 'ALGORITHM STEPS:' as info;
SELECT '1. Find applicable rate based on space_type, area, tenure' as step1;
SELECT '2. Calculate chargeable area (max of requested or min_chargeable_area)' as step2;
SELECT '3. Calculate warehouse rent (chargeable_area * rate)' as step3;
SELECT '4. Handle Very Short term with daily rates' as step4;
SELECT '5. Add office costs if included' as step5;
SELECT '6. Add EWA setup costs for dedicated meter' as step6;
SELECT '7. Apply minimum charge if needed' as step7;
SELECT '8. Calculate totals and discounts' as step8;

-- 8. Identify the real pricing pattern
SELECT '=== REAL PRICING PATTERN IDENTIFIED ===' as section;

SELECT 'BASED ON ORIGINAL SCHEMA AND USER REQUIREMENTS:' as info;
SELECT 'Area Bands: 0-499m², 500-999m², 1000-1499m², 1500m²+' as bands;
SELECT 'Tenures: Very Short (daily), Short (1-11 months), Long (12+ months)' as tenures;
SELECT 'Space Types: Ground Floor, Mezzanine (20% discount)' as spaces;
SELECT 'Pricing: Volume discounts for larger areas' as pricing;
SELECT 'Fixed Price: Small units have minimum charges' as fixed;

-- 9. Generate the correct pricing structure
SELECT '=== CORRECT PRICING STRUCTURE ===' as section;

SELECT 'GROUND FLOOR PRICING:' as ground_floor;
SELECT '0-499m²: 3.500-4.500 BHD/m² (Small units - Fixed Price)' as small;
SELECT '500-999m²: 3.000-3.500 BHD/m² (Medium units)' as medium;
SELECT '1000-1499m²: 2.800-3.000 BHD/m² (Large units)' as large;
SELECT '1500m²+: 2.600-2.800 BHD/m² (Extra Large - Negotiable)' as xlarge;

SELECT 'MEZZANINE PRICING (20% discount):' as mezzanine;
SELECT '0-499m²: 2.800-3.600 BHD/m²' as small_m;
SELECT '500-999m²: 2.400-2.800 BHD/m²' as medium_m;
SELECT '1000-1499m²: 2.240-2.400 BHD/m²' as large_m;
SELECT '1500m²+: 2.080-2.240 BHD/m²' as xlarge_m;

SELECT '=== REVERSE ENGINEERING COMPLETE ===' as success;
