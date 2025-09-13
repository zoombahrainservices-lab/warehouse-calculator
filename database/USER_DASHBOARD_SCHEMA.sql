-- User Dashboard System - Database Schema Updates
-- This script adds user-specific fields to enable the user dashboard functionality

-- =============================================================================
-- PHASE 1: DATABASE UPDATES - Add user_id to existing tables
-- =============================================================================

-- Add user_id to warehouses table for user preferences
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Add user_id to warehouse_occupants table for user space bookings
ALTER TABLE warehouse_occupants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Add booking management fields to warehouse_occupants
ALTER TABLE warehouse_occupants ADD COLUMN IF NOT EXISTS booking_id TEXT;
ALTER TABLE warehouse_occupants ADD COLUMN IF NOT EXISTS booking_status TEXT DEFAULT 'active' CHECK (booking_status IN ('active', 'cancelled', 'completed', 'modified'));
ALTER TABLE warehouse_occupants ADD COLUMN IF NOT EXISTS booking_notes TEXT;
ALTER TABLE warehouse_occupants ADD COLUMN IF NOT EXISTS modification_history JSONB DEFAULT '[]';

-- Add user_id to client_stock table for user-specific stock tracking
ALTER TABLE client_stock ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE client_stock ADD COLUMN IF NOT EXISTS booking_id TEXT; -- Link stock to specific warehouse booking

-- Add user_id to stock_data table for user-specific stock tracking
ALTER TABLE stock_data ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE stock_data ADD COLUMN IF NOT EXISTS booking_id TEXT; -- Link stock to specific warehouse booking

-- =============================================================================
-- PHASE 1.5: USER WAREHOUSE PREFERENCES TABLE
-- =============================================================================

-- User warehouse preferences and selections
CREATE TABLE IF NOT EXISTS user_warehouse_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    selected_warehouse_id UUID, -- Currently selected warehouse
    default_space_type TEXT DEFAULT 'Ground Floor' CHECK (default_space_type IN ('Ground Floor', 'Mezzanine')),
    preferences JSONB DEFAULT '{}', -- User preferences for warehouse selection
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user warehouse preferences
CREATE INDEX IF NOT EXISTS idx_user_warehouse_preferences_user_id ON user_warehouse_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_warehouse_preferences_selected_warehouse ON user_warehouse_preferences(selected_warehouse_id);

-- =============================================================================
-- PHASE 1.6: USER DASHBOARD ACTIVITY LOG
-- =============================================================================

-- Track user activities for dashboard analytics
CREATE TABLE IF NOT EXISTS user_dashboard_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'warehouse_selection', 'space_booking', 'stock_added', 'stock_modified', 'booking_modified', 'booking_cancelled')),
    activity_details JSONB DEFAULT '{}',
    activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for activity tracking
CREATE INDEX IF NOT EXISTS idx_user_dashboard_activity_user_id ON user_dashboard_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dashboard_activity_type ON user_dashboard_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_dashboard_activity_date ON user_dashboard_activity(activity_date);

-- =============================================================================
-- PHASE 1.7: CREATE INDEXES FOR PERFORMANCE
-- =============================================================================

-- Indexes for user-scoped queries
CREATE INDEX IF NOT EXISTS idx_warehouse_occupants_user_id ON warehouse_occupants(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_occupants_booking_id ON warehouse_occupants(booking_id);
CREATE INDEX IF NOT EXISTS idx_client_stock_user_id ON client_stock(user_id);
CREATE INDEX IF NOT EXISTS idx_client_stock_booking_id ON client_stock(booking_id);
CREATE INDEX IF NOT EXISTS idx_stock_data_user_id ON stock_data(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_data_booking_id ON stock_data(booking_id);

-- =============================================================================
-- PHASE 1.8: UPDATE TRIGGERS
-- =============================================================================

-- Update trigger for user_warehouse_preferences
CREATE OR REPLACE FUNCTION update_user_warehouse_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_warehouse_preferences_updated_at
    BEFORE UPDATE ON user_warehouse_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_warehouse_preferences_updated_at();

-- =============================================================================
-- PHASE 1.9: UTILITY FUNCTIONS
-- =============================================================================

-- Function to get user's active bookings
CREATE OR REPLACE FUNCTION get_user_active_bookings(user_uuid UUID)
RETURNS TABLE (
    booking_id TEXT,
    warehouse_id UUID,
    warehouse_name TEXT,
    space_occupied DECIMAL,
    floor_type TEXT,
    entry_date DATE,
    expected_exit_date DATE,
    status TEXT,
    booking_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wo.booking_id,
        w.id as warehouse_id,
        w.name as warehouse_name,
        wo.space_occupied,
        wo.floor_type,
        wo.entry_date::DATE,
        wo.expected_exit_date::DATE,
        wo.status,
        wo.booking_status
    FROM warehouse_occupants wo
    JOIN warehouses w ON wo.warehouse_id = w.id
    WHERE wo.user_id = user_uuid
    AND wo.booking_status = 'active'
    ORDER BY wo.entry_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's stock by warehouse booking
CREATE OR REPLACE FUNCTION get_user_stock_by_booking(user_uuid UUID, booking_id_param TEXT DEFAULT NULL)
RETURNS TABLE (
    id TEXT,
    product_name TEXT,
    product_type TEXT,
    quantity INTEGER,
    unit TEXT,
    area_used REAL,
    space_type TEXT,
    status TEXT,
    booking_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cs.id,
        cs.product_name,
        cs.product_type,
        cs.quantity,
        cs.unit,
        cs.area_used,
        cs.space_type,
        cs.status,
        cs.booking_id
    FROM client_stock cs
    WHERE cs.user_id = user_uuid
    AND (booking_id_param IS NULL OR cs.booking_id = booking_id_param)
    ORDER BY cs.entry_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate warehouse availability for user
CREATE OR REPLACE FUNCTION calculate_warehouse_availability_for_user(
    warehouse_uuid TEXT,
    space_type_param TEXT DEFAULT 'Ground Floor'
)
RETURNS TABLE (
    total_space DECIMAL,
    occupied_space DECIMAL,
    available_space DECIMAL,
    utilization_percentage DECIMAL
) AS $$
DECLARE
    total DECIMAL := 0;
    occupied DECIMAL := 0;
BEGIN
    -- Get total space based on space type
    IF space_type_param = 'Ground Floor' THEN
        SELECT w.total_space INTO total FROM warehouses w WHERE w.id = warehouse_uuid;
        SELECT COALESCE(SUM(wo.space_occupied), 0) INTO occupied
        FROM warehouse_occupants wo
        WHERE wo.warehouse_id = warehouse_uuid
        AND wo.floor_type = 'Ground Floor'
        AND wo.status = 'active';
    ELSE
        SELECT w.mezzanine_space INTO total FROM warehouses w WHERE w.id = warehouse_uuid;
        SELECT COALESCE(SUM(wo.space_occupied), 0) INTO occupied
        FROM warehouse_occupants wo
        WHERE wo.warehouse_id = warehouse_uuid
        AND wo.floor_type = 'Mezzanine'
        AND wo.status = 'active';
    END IF;

    -- Return availability data
    RETURN QUERY SELECT
        total,
        occupied,
        GREATEST(total - occupied, 0),
        CASE WHEN total > 0 THEN (occupied / total) * 100 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- PHASE 1.10: SAMPLE DATA FOR TESTING
-- =============================================================================

-- Insert sample user warehouse preferences
INSERT INTO user_warehouse_preferences (user_id, selected_warehouse_id, default_space_type, preferences)
SELECT
    u.id as user_id,
    w.id as selected_warehouse_id,
    'Ground Floor' as default_space_type,
    '{"theme": "light", "notifications": true}' as preferences
FROM users u
CROSS JOIN (SELECT id FROM warehouses LIMIT 1) w
WHERE u.email LIKE '%@%'
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- PHASE 1.11: UPDATE EXISTING DATA
-- =============================================================================

-- Update existing warehouse_occupants with sample user_id (for testing)
-- This will be replaced with actual user assignments during implementation
UPDATE warehouse_occupants
SET user_id = (
    SELECT id FROM users WHERE email = 'admin@zoomwarehouse.com' LIMIT 1
)
WHERE user_id IS NULL;

-- Update existing client_stock with sample user_id (for testing)
UPDATE client_stock
SET user_id = (
    SELECT id FROM users WHERE email = 'admin@zoomwarehouse.com' LIMIT 1
)
WHERE user_id IS NULL;

-- Update existing stock_data with sample user_id (for testing)
UPDATE stock_data
SET user_id = (
    SELECT id FROM users WHERE email = 'admin@zoomwarehouse.com' LIMIT 1
)
WHERE user_id IS NULL;

-- Generate booking_ids for existing occupants
UPDATE warehouse_occupants
SET booking_id = CONCAT('booking-', LOWER(HEX(RANDOM()::INT)))
WHERE booking_id IS NULL;

-- Link stock to bookings (sample data)
UPDATE client_stock
SET booking_id = (
    SELECT booking_id FROM warehouse_occupants
    WHERE user_id = client_stock.user_id
    LIMIT 1
)
WHERE booking_id IS NULL;

UPDATE stock_data
SET booking_id = (
    SELECT booking_id FROM warehouse_occupants
    WHERE user_id = stock_data.user_id
    LIMIT 1
)
WHERE booking_id IS NULL;

-- =============================================================================
-- PHASE 1.12: GRANT PERMISSIONS (if using RLS)
-- =============================================================================

-- Note: Enable Row Level Security on tables if needed for production
-- ALTER TABLE warehouse_occupants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE client_stock ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_data ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_warehouse_preferences ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_dashboard_activity ENABLE ROW LEVEL SECURITY;

-- Create policies to ensure users only see their own data
-- (Policies would be added here in production)
