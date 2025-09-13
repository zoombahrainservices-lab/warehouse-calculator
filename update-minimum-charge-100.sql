-- Update minimum charge to 100 BHD
-- This ensures all cost calculations use 100 BHD as the minimum charge

-- Update the minimum_charge setting to 100 BHD
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('minimum_charge', '100', 'Minimum monthly charge in BHD - updated to 100 BHD')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = '100',
  description = 'Minimum monthly charge in BHD - updated to 100 BHD',
  updated_at = NOW();

-- Verify the update
SELECT 
  setting_key,
  setting_value,
  description,
  updated_at
FROM system_settings 
WHERE setting_key = 'minimum_charge';

-- Show all current system settings
SELECT 
  setting_key,
  setting_value,
  description
FROM system_settings 
ORDER BY setting_key;
