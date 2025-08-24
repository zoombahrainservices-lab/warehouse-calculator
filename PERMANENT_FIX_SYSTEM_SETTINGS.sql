-- ============================================
-- PERMANENT DYNAMIC SYSTEM SETTINGS FIX
-- ============================================
-- This creates a robust, dynamic system that auto-manages required settings

-- 1. Create or update system settings with proper UUIDs
-- Using INSERT ... ON CONFLICT to handle existing records dynamically

INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('office_monthly_rate', '200', 'Monthly rate for office space in BHD'),
('days_per_month', '30', 'Days per month for calculations'),
('office_free_threshold', '1000', 'Area threshold for free office (sqm)'),
('vat_rate', '10', 'VAT percentage rate')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 2. Verify all required settings exist
DO $$
DECLARE
    required_keys TEXT[] := ARRAY['office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold'];
    key TEXT;
    missing_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔍 Checking required system settings...';
    
    FOREACH key IN ARRAY required_keys
    LOOP
        IF NOT EXISTS (SELECT 1 FROM system_settings WHERE setting_key = key) THEN
            RAISE NOTICE '❌ Missing: %', key;
            missing_count := missing_count + 1;
        ELSE
            RAISE NOTICE '✅ Found: %', key;
        END IF;
    END LOOP;
    
    IF missing_count = 0 THEN
        RAISE NOTICE '🎉 All required system settings are present!';
    ELSE
        RAISE NOTICE '⚠️ Found % missing settings', missing_count;
    END IF;
END $$;

-- 3. Create a function to automatically ensure required settings exist
CREATE OR REPLACE FUNCTION ensure_required_system_settings()
RETURNS VOID AS $$
DECLARE
    required_settings JSONB := '[
        {"key": "office_monthly_rate", "value": "200", "description": "Monthly rate for office space in BHD"},
        {"key": "minimum_charge", "value": "50", "description": "Minimum monthly charge in BHD"},
        {"key": "days_per_month", "value": "30", "description": "Days per month for calculations"},
        {"key": "office_free_threshold", "value": "1000", "description": "Area threshold for free office (sqm)"},
        {"key": "default_vat_rate", "value": "10", "description": "Default VAT percentage"},
        {"key": "quote_validity_days", "value": "30", "description": "Number of days quotes are valid"},
        {"key": "warehouse_location", "value": "Building No. 22, Road 401, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain", "description": "Default warehouse location"},
        {"key": "company_name", "value": "Sitra Warehouse", "description": "Company name for quotes"},
        {"key": "contact_email", "value": "info@sitra-warehouse.com", "description": "Contact email"},
        {"key": "contact_phone", "value": "+973 1234 5678", "description": "Contact phone number"}
    ]'::JSONB;
    setting JSONB;
BEGIN
    FOR setting IN SELECT * FROM jsonb_array_elements(required_settings)
    LOOP
        INSERT INTO system_settings (setting_key, setting_value, description)
        VALUES (
            setting->>'key',
            setting->>'value',
            setting->>'description'
        )
        ON CONFLICT (setting_key) DO NOTHING; -- Don't overwrite existing values
    END LOOP;
    
    RAISE NOTICE 'System settings check completed';
END;
$$ LANGUAGE plpgsql;

-- 4. Run the function to ensure all settings exist
SELECT ensure_required_system_settings();

-- 5. Create a trigger to automatically validate required settings
CREATE OR REPLACE FUNCTION validate_required_settings()
RETURNS TRIGGER AS $$
DECLARE
    required_keys TEXT[] := ARRAY['office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold'];
    key TEXT;
BEGIN
    -- Only validate on DELETE operations
    IF TG_OP = 'DELETE' THEN
        IF OLD.setting_key = ANY(required_keys) THEN
            RAISE EXCEPTION 'Cannot delete required system setting: %', OLD.setting_key;
        END IF;
        RETURN OLD;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deletion of required settings
DROP TRIGGER IF EXISTS prevent_required_settings_deletion ON system_settings;
CREATE TRIGGER prevent_required_settings_deletion
    BEFORE DELETE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION validate_required_settings();

-- 6. Final verification query
SELECT 
    '🎉 SYSTEM SETTINGS FIXED!' as status,
    COUNT(*) as total_settings,
    COUNT(*) FILTER (WHERE setting_key IN ('office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold')) as required_settings_count
FROM system_settings;

-- 7. Show all current system settings
SELECT 
    setting_key,
    setting_value,
    description,
    CASE 
        WHEN setting_key IN ('office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold') 
        THEN '🔴 REQUIRED' 
        ELSE '🟢 Optional' 
    END as importance
FROM system_settings
ORDER BY 
    CASE WHEN setting_key IN ('office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold') THEN 1 ELSE 2 END,
    setting_key;
