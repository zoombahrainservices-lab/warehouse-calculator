#!/usr/bin/env node

/**
 * Quick Dashboard Fix Script
 * This script applies minimal fixes to get the dashboard working
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyQuickFixes() {
  console.log('🔧 Applying Quick Dashboard Fixes...\n')

  try {
    // Fix 1: Add missing columns to existing tables
    console.log('1. Adding missing columns to existing tables...')

    const columnQueries = [
      // warehouse_occupants columns
      `ALTER TABLE warehouse_occupants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);`,
      `ALTER TABLE warehouse_occupants ADD COLUMN IF NOT EXISTS booking_id TEXT;`,
      `ALTER TABLE warehouse_occupants ADD COLUMN IF NOT EXISTS booking_status TEXT DEFAULT 'active' CHECK (booking_status IN ('active', 'cancelled', 'completed', 'modified'));`,
      `ALTER TABLE warehouse_occupants ADD COLUMN IF NOT EXISTS booking_notes TEXT;`,
      `ALTER TABLE warehouse_occupants ADD COLUMN IF NOT EXISTS modification_history JSONB DEFAULT '[]';`,

      // client_stock columns
      `ALTER TABLE client_stock ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);`,
      `ALTER TABLE client_stock ADD COLUMN IF NOT EXISTS booking_id TEXT;`,

      // stock_data columns (if it exists)
      `ALTER TABLE stock_data ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);`,
      `ALTER TABLE stock_data ADD COLUMN IF NOT EXISTS booking_id TEXT;`
    ]

    for (const query of columnQueries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query })
        if (error && !error.message.includes('already exists')) {
          console.log(`   ⚠️  Could not add column: ${error.message}`)
        } else {
          console.log(`   ✅ Applied: ${query.split('ADD COLUMN')[1]?.split(';')[0] || 'column addition'}`)
        }
      } catch (err) {
        console.log(`   ⚠️  Skipped: ${query.split('ADD COLUMN')[1]?.split(';')[0] || 'column addition'}`)
      }
    }

    // Fix 2: Create missing tables
    console.log('\n2. Creating missing tables...')

    const tableQueries = [
      // user_warehouse_preferences table
      `CREATE TABLE IF NOT EXISTS user_warehouse_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        selected_warehouse_id UUID,
        default_space_type TEXT DEFAULT 'Ground Floor' CHECK (default_space_type IN ('Ground Floor', 'Mezzanine')),
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,

      // user_dashboard_activity table
      `CREATE TABLE IF NOT EXISTS user_dashboard_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_type TEXT NOT NULL CHECK (activity_type IN ('login', 'warehouse_selection', 'space_booking', 'stock_added', 'stock_modified', 'booking_modified', 'booking_cancelled')),
        activity_details JSONB DEFAULT '{}',
        activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    ]

    for (const query of tableQueries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query })
        if (error) {
          console.log(`   ⚠️  Could not create table: ${error.message}`)
        } else {
          const tableName = query.match(/CREATE TABLE.*?\b(\w+)\b/)?.[1] || 'table'
          console.log(`   ✅ Created table: ${tableName}`)
        }
      } catch (err) {
        const tableName = query.match(/CREATE TABLE.*?\b(\w+)\b/)?.[1] || 'table'
        console.log(`   ⚠️  Skipped table creation: ${tableName}`)
      }
    }

    // Fix 3: Create indexes
    console.log('\n3. Creating indexes...')

    const indexQueries = [
      `CREATE INDEX IF NOT EXISTS idx_warehouse_occupants_user_id ON warehouse_occupants(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_warehouse_occupants_booking_id ON warehouse_occupants(booking_id);`,
      `CREATE INDEX IF NOT EXISTS idx_client_stock_user_id ON client_stock(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_client_stock_booking_id ON client_stock(booking_id);`,
      `CREATE INDEX IF NOT EXISTS idx_user_warehouse_preferences_user_id ON user_warehouse_preferences(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_user_dashboard_activity_user_id ON user_dashboard_activity(user_id);`
    ]

    for (const query of indexQueries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query })
        if (error && !error.message.includes('already exists')) {
          console.log(`   ⚠️  Could not create index: ${error.message}`)
        } else {
          console.log(`   ✅ Created index: ${query.match(/idx_\w+/)?.[0] || 'index'}`)
        }
      } catch (err) {
        console.log(`   ⚠️  Skipped index creation`)
      }
    }

    // Fix 4: Create basic database functions
    console.log('\n4. Creating basic database functions...')

    const functionQueries = [
      // Simple booking function
      `CREATE OR REPLACE FUNCTION get_user_active_bookings(user_uuid UUID)
      RETURNS TABLE (
        booking_id TEXT,
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
          w.name as warehouse_name,
          wo.space_occupied,
          wo.floor_type,
          wo.entry_date::DATE,
          wo.expected_exit_date::DATE,
          wo.status,
          wo.booking_status
        FROM warehouse_occupants wo
        LEFT JOIN warehouses w ON wo.warehouse_id = w.id
        WHERE wo.user_id = user_uuid
        AND wo.booking_status = 'active'
        ORDER BY wo.created_at DESC;
      END;
      $$ LANGUAGE plpgsql;`,

      // Simple stock function
      `CREATE OR REPLACE FUNCTION get_user_stock_by_booking(user_uuid UUID, booking_id_param TEXT DEFAULT NULL)
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
        ORDER BY cs.created_at DESC;
      END;
      $$ LANGUAGE plpgsql;`,

      // Simple availability function
      `CREATE OR REPLACE FUNCTION calculate_warehouse_availability_for_user(
        warehouse_uuid UUID,
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
          AND wo.floor_type = 'ground'
          AND wo.booking_status = 'active';
        ELSE
          SELECT w.mezzanine_space INTO total FROM warehouses w WHERE w.id = warehouse_uuid;
          SELECT COALESCE(SUM(wo.space_occupied), 0) INTO occupied
          FROM warehouse_occupants wo
          WHERE wo.warehouse_id = warehouse_uuid
          AND wo.floor_type = 'mezzanine'
          AND wo.booking_status = 'active';
        END IF;

        -- Return availability data
        RETURN QUERY SELECT
          total,
          occupied,
          GREATEST(total - occupied, 0),
          CASE WHEN total > 0 THEN (occupied / total) * 100 ELSE 0 END;
      END;
      $$ LANGUAGE plpgsql;`
    ]

    for (const query of functionQueries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: query })
        if (error) {
          console.log(`   ⚠️  Could not create function: ${error.message}`)
        } else {
          const funcName = query.match(/FUNCTION\s+(\w+)/)?.[1] || 'function'
          console.log(`   ✅ Created function: ${funcName}`)
        }
      } catch (err) {
        const funcName = query.match(/FUNCTION\s+(\w+)/)?.[1] || 'function'
        console.log(`   ⚠️  Skipped function creation: ${funcName}`)
      }
    }

    // Fix 5: Update existing data with user IDs (if admin user exists)
    console.log('\n5. Updating existing data...')

    try {
      // Get admin user ID
      const { data: adminUser, error: adminError } = await supabase
        .from('users')
        .select('id')
        .eq('email', 'admin@zoomwarehouse.com')
        .single()

      if (adminUser && !adminError) {
        console.log(`   ✅ Found admin user, updating existing data...`)

        // Update existing warehouse_occupants
        await supabase
          .from('warehouse_occupants')
          .update({ user_id: adminUser.id })
          .is('user_id', null)

        // Update existing client_stock
        await supabase
          .from('client_stock')
          .update({ user_id: adminUser.id })
          .is('user_id', null)

        console.log(`   ✅ Updated existing data with admin user ID`)
      } else {
        console.log(`   ⚠️  Admin user not found, skipping data updates`)
      }
    } catch (err) {
      console.log(`   ⚠️  Could not update existing data: ${err.message}`)
    }

    console.log('\n' + '='.repeat(50))
    console.log('✅ Quick fixes applied!')
    console.log('='.repeat(50))
    console.log('\n🚀 Next steps:')
    console.log('   1. Try accessing the dashboard again')
    console.log('   2. If issues persist, run the full diagnostic:')
    console.log('      node diagnose-dashboard-setup.js')
    console.log('   3. Or apply the complete setup:')
    console.log('      Run SETUP_USER_DASHBOARD_SYSTEM.sql in Supabase')

  } catch (error) {
    console.error('❌ Error applying fixes:', error)
    console.log('\n🔧 Manual fix options:')
    console.log('   1. Run the complete setup script in Supabase SQL Editor')
    console.log('   2. Check your database permissions')
    console.log('   3. Verify your Supabase connection')
  }
}

// Run the quick fix
applyQuickFixes().catch(error => {
  console.error('❌ Quick fix failed:', error)
  process.exit(1)
})
