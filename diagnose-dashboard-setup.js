#!/usr/bin/env node

/**
 * Dashboard Setup Diagnostic Script
 * This script helps diagnose and fix issues with the user dashboard system
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

async function diagnoseSetup() {
  console.log('🔍 Diagnosing User Dashboard Setup...\n')

  const issues = []
  const fixes = []

  // Check 1: Required tables exist
  console.log('1. Checking database tables...')

  const requiredTables = [
    'warehouses',
    'warehouse_occupants',
    'client_stock',
    'users',
    'user_sessions',
    'user_warehouse_preferences',
    'user_dashboard_activity'
  ]

  const existingTables = []

  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (error && error.message.includes('does not exist')) {
        issues.push(`❌ Table '${table}' does not exist`)
        fixes.push(`   → Run the database schema setup script`)
      } else {
        existingTables.push(table)
        console.log(`   ✅ ${table}`)
      }
    } catch (err) {
      issues.push(`❌ Error checking table '${table}': ${err.message}`)
    }
  }

  // Check 2: Required columns exist
  console.log('\n2. Checking table columns...')

  if (existingTables.includes('warehouse_occupants')) {
    const requiredColumns = ['user_id', 'booking_id', 'booking_status', 'booking_notes']
    for (const column of requiredColumns) {
      try {
        const { data, error } = await supabase
          .from('warehouse_occupants')
          .select(column)
          .limit(1)

        if (error && error.message.includes('column') && error.message.includes('does not exist')) {
          issues.push(`❌ Column '${column}' missing in warehouse_occupants`)
          fixes.push(`   → Run the database schema setup script`)
        } else {
          console.log(`   ✅ warehouse_occupants.${column}`)
        }
      } catch (err) {
        issues.push(`❌ Error checking column '${column}': ${err.message}`)
      }
    }
  }

  if (existingTables.includes('client_stock')) {
    const requiredColumns = ['user_id', 'booking_id']
    for (const column of requiredColumns) {
      try {
        const { data, error } = await supabase
          .from('client_stock')
          .select(column)
          .limit(1)

        if (error && error.message.includes('column') && error.message.includes('does not exist')) {
          issues.push(`❌ Column '${column}' missing in client_stock`)
          fixes.push(`   → Run the database schema setup script`)
        } else {
          console.log(`   ✅ client_stock.${column}`)
        }
      } catch (err) {
        issues.push(`❌ Error checking column '${column}': ${err.message}`)
      }
    }
  }

  // Check 3: Database functions exist
  console.log('\n3. Checking database functions...')

  const requiredFunctions = [
    'get_user_active_bookings',
    'get_user_stock_by_booking',
    'calculate_warehouse_availability_for_user'
  ]

  for (const func of requiredFunctions) {
    try {
      // Try to call the function with dummy parameters
      let query
      if (func === 'get_user_active_bookings') {
        query = supabase.rpc(func, { user_uuid: '00000000-0000-0000-0000-000000000000' })
      } else if (func === 'get_user_stock_by_booking') {
        query = supabase.rpc(func, {
          user_uuid: '00000000-0000-0000-0000-000000000000',
          booking_id_param: null
        })
      } else if (func === 'calculate_warehouse_availability_for_user') {
        query = supabase.rpc(func, {
          warehouse_uuid: '00000000-0000-0000-0000-0000-000000000000',
          space_type_param: 'Ground Floor'
        })
      }

      const { data, error } = await query

      if (error && error.message.includes('function') && error.message.includes('does not exist')) {
        issues.push(`❌ Function '${func}' does not exist`)
        fixes.push(`   → Run the database schema setup script`)
      } else {
        console.log(`   ✅ ${func}`)
      }
    } catch (err) {
      issues.push(`❌ Error checking function '${func}': ${err.message}`)
    }
  }

  // Check 4: Sample data exists
  console.log('\n4. Checking sample data...')

  if (existingTables.includes('warehouses')) {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')

      if (error) {
        issues.push(`❌ Error checking warehouses: ${error.message}`)
      } else if (!data || data.length === 0) {
        issues.push(`⚠️  No warehouses found in database`)
        fixes.push(`   → Add warehouse data or run sample data setup`)
      } else {
        console.log(`   ✅ ${data.length} warehouse(s) found`)
      }
    } catch (err) {
      issues.push(`❌ Error checking warehouses: ${err.message}`)
    }
  }

  if (existingTables.includes('users')) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')

      if (error) {
        issues.push(`❌ Error checking users: ${error.message}`)
      } else if (!data || data.length === 0) {
        issues.push(`⚠️  No users found in database`)
        fixes.push(`   → Create user accounts for testing`)
      } else {
        console.log(`   ✅ ${data.length} user(s) found`)
      }
    } catch (err) {
      issues.push(`❌ Error checking users: ${err.message}`)
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📋 DIAGNOSTIC SUMMARY')
  console.log('='.repeat(50))

  if (issues.length === 0) {
    console.log('✅ All checks passed! Your dashboard should work correctly.')
    console.log('\n🚀 Next steps:')
    console.log('   1. Try logging in as a regular user (not admin)')
    console.log('   2. You should be redirected to /dashboard')
    console.log('   3. Test booking space and managing stock')
  } else {
    console.log(`❌ Found ${issues.length} issue(s) that need to be fixed:\n`)

    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`)
    })

    console.log('\n🔧 Recommended fixes:')
    const uniqueFixes = [...new Set(fixes)]
    uniqueFixes.forEach((fix, index) => {
      console.log(`${index + 1}. ${fix}`)
    })

    console.log('\n📖 Setup Instructions:')
    console.log('   1. Open your Supabase SQL Editor')
    console.log('   2. Run the contents of: database/USER_DASHBOARD_SCHEMA.sql')
    console.log('   3. Or run: SETUP_USER_DASHBOARD_SYSTEM.sql')
    console.log('   4. Re-run this diagnostic script')
  }

  console.log('\n' + '='.repeat(50))
  console.log('💡 Support:')
  console.log('   If you continue having issues, check:')
  console.log('   - Supabase connection settings')
  console.log('   - Database permissions')
  console.log('   - Environment variables')
  console.log('='.repeat(50))
}

// Run the diagnostic
diagnoseSetup().catch(error => {
  console.error('❌ Diagnostic failed:', error)
  process.exit(1)
})
