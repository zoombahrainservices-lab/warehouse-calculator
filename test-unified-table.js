// Test Unified Users Table
// Simple test to verify the unified table is working

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUnifiedTable() {
  console.log('🧪 Testing Unified Users Table...\n')

  try {
    // 1. Check if unified_users table exists and has data
    console.log('1️⃣ Checking unified_users table...')
    const { data: users, error: usersError } = await supabase
      .from('unified_users')
      .select('*')
      .limit(10)

    if (usersError) {
      console.error('❌ Error accessing unified_users table:', usersError.message)
      console.log('\n🔧 You need to run the SIMPLE_UNIFIED_USERS_FIX.sql script first!')
      return
    }

    console.log(`✅ unified_users table exists with ${users?.length || 0} records`)

    // 2. Show all users
    console.log('\n2️⃣ All Users in Unified Table:')
    if (users && users.length > 0) {
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`)
        if (user.warehouse_status === 'active') {
          console.log(`     🏢 Warehouse: ${user.space_occupied}m² - Floor: ${user.floor_type}`)
        }
      })
    }

    // 3. Check users with warehouse space
    console.log('\n3️⃣ Users with Warehouse Space:')
    const { data: warehouseUsers, error: warehouseError } = await supabase
      .from('unified_users')
      .select('*')
      .eq('warehouse_status', 'active')
      .gt('space_occupied', 0)

    if (warehouseError) {
      console.error('❌ Error fetching warehouse users:', warehouseError.message)
    } else {
      console.log(`✅ Found ${warehouseUsers?.length || 0} users with warehouse space`)
      if (warehouseUsers && warehouseUsers.length > 0) {
        warehouseUsers.forEach(user => {
          console.log(`   - ${user.name}: ${user.space_occupied}m² at ${user.floor_type} floor`)
          console.log(`     Entry: ${user.entry_date} - Exit: ${user.expected_exit_date || 'Not set'}`)
        })
      }
    }

    // 4. Test the API endpoint logic
    console.log('\n4️⃣ Testing API Logic:')
    const { data: regularUsers, error: regularError } = await supabase
      .from('unified_users')
      .select(`
        id,
        email,
        name,
        role,
        is_active,
        warehouse_id,
        space_occupied,
        floor_type,
        entry_date,
        expected_exit_date,
        warehouse_status,
        created_at
      `)
      .eq('role', 'USER')
      .eq('is_active', true)
      .order('name')

    if (regularError) {
      console.error('❌ Error fetching regular users:', regularError.message)
    } else {
      console.log(`✅ Found ${regularUsers?.length || 0} regular users`)
      
      // Simulate the data processing
      const processedUsers = regularUsers?.map(user => {
        const totalSpaceOccupied = user.space_occupied || 0
        const totalBookings = user.warehouse_status === 'active' ? 1 : 0
        const userStatus = totalSpaceOccupied > 0 ? 'Active' : 'Inactive'
        
        return {
          name: user.name,
          email: user.email,
          totalSpaceOccupied,
          totalBookings,
          userStatus
        }
      }) || []

      console.log('\n📊 Processed User Data:')
      processedUsers.forEach(user => {
        console.log(`   - ${user.name}: ${user.totalSpaceOccupied}m² - ${user.userStatus}`)
      })
    }

    // 5. Summary
    console.log('\n📋 SUMMARY:')
    console.log('==========')
    if (users && users.length > 0) {
      console.log('✅ Unified users table is working')
      const activeWarehouseUsers = users.filter(u => u.warehouse_status === 'active').length
      console.log(`✅ ${activeWarehouseUsers} users have warehouse space`)
      
      if (activeWarehouseUsers > 0) {
        console.log('🎉 Your supporter dashboard should now show warehouse data!')
        console.log('   Refresh the dashboard to see the changes.')
      } else {
        console.log('⚠️  No users have warehouse space yet')
      }
    } else {
      console.log('❌ Unified users table is empty or not working')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testUnifiedTable()
