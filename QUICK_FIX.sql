-- QUICK CALCULATOR FIX
-- Add missing pricing rates

-- Ground Floor Very Short
INSERT INTO pricing_rates (id, space_type, tenure, area_band_name, area_band_min, area_band_max, monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd) VALUES 
(gen_random_uuid(), 'Ground Floor', 'Very Short', 'Medium (51-200m²)', 51, 200, 0.540, 0.018, true, 30, 16.20)
ON CONFLICT DO NOTHING;

-- Mezzanine Very Short
INSERT INTO pricing_rates (id, space_type, tenure, area_band_name, area_band_min, area_band_max, monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd) VALUES 
(gen_random_uuid(), 'Mezzanine', 'Very Short', 'Medium (51-200m²)', 51, 200, 0.432, 0.014, true, 30, 12.96)
ON CONFLICT DO NOTHING;

-- Mezzanine Long
INSERT INTO pricing_rates (id, space_type, tenure, area_band_name, area_band_min, area_band_max, monthly_rate_per_sqm, daily_rate_per_sqm, active, min_chargeable_area, package_starting_bhd) VALUES 
(gen_random_uuid(), 'Mezzanine', 'Long', 'Medium (51-200m²)', 51, 200, 0.336, 0.011, true, 30, 10.08)
ON CONFLICT DO NOTHING;

-- Add system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('office_monthly_rate', '200.00', 'Monthly office rental rate in BHD'),
('minimum_charge', '50.00', 'Minimum charge for small areas in BHD'),
('days_per_month', '30', 'Number of days per month for daily rate calculations'),
('office_free_threshold', '200', 'Area threshold above which office is free (m²)')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Add EWA settings
INSERT INTO ewa_settings (id, house_load_description, dedicated_meter_description, estimated_setup_deposit, estimated_installation_fee) VALUES 
(gen_random_uuid(), 'House load electricity included in rent - up to 5kW', 'Dedicated meter with separate billing - setup required', 75.00, 50.00)
ON CONFLICT DO NOTHING;





