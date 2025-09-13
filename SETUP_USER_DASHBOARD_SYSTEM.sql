-- =============================================================================
-- USER DASHBOARD SYSTEM SETUP SCRIPT
-- Run this script in your Supabase SQL Editor to set up the user dashboard system
-- =============================================================================

-- Step 1: Run the database schema updates
\i database/USER_DASHBOARD_SCHEMA.sql

-- Step 2: Optional - Clean up any existing data if needed
-- Uncomment the following lines if you want to reset the system:

-- DELETE FROM user_dashboard_activity;
-- DELETE FROM user_warehouse_preferences;
-- UPDATE warehouse_occupants SET user_id = NULL, booking_id = NULL, booking_status = 'active', booking_notes = NULL, modification_history = '[]';
-- UPDATE client_stock SET user_id = NULL, booking_id = NULL;
-- UPDATE stock_data SET user_id = NULL, booking_id = NULL;

-- Step 3: Verify the setup by running these queries:

-- Check if new tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user_warehouse_preferences', 'user_dashboard_activity');

-- Check if new columns exist:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'warehouse_occupants' AND column_name IN ('user_id', 'booking_id', 'booking_status', 'booking_notes', 'modification_history');

-- Check if functions exist:
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'get_user_%';

-- Step 4: Test the system by:
-- 1. Creating a regular user account (not admin/manager)
-- 2. Logging in as that user
-- 3. The user should be redirected to /dashboard
-- 4. Try booking space and adding stock

-- =============================================================================
-- TROUBLESHOOTING
-- =============================================================================

-- If you encounter permission errors, make sure your database user has sufficient privileges:
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;

-- If you get "function does not exist" errors, make sure all SQL functions were created successfully.

-- If you get "column does not exist" errors, verify that all ALTER TABLE statements executed correctly.

-- =============================================================================
-- POST-SETUP CHECKLIST
-- =============================================================================

-- [ ] Database schema updates applied successfully
-- [ ] New tables created (user_warehouse_preferences, user_dashboard_activity)
-- [ ] New columns added to existing tables
-- [ ] Database functions created
-- [ ] Indexes created for performance
-- [ ] Test user can log in and access dashboard
-- [ ] User can book warehouse space
-- [ ] User can add/manage stock items
-- [ ] User data is properly isolated (privacy)

COMMIT;
