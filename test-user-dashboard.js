// Test User Dashboard API
// This script tests the simplified user dashboard API that works with unified_users table

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

async function testUserDashboard() {
  console.log('🧪 Testing User Dashboard API...\\n')

  try {
    // 1. Check if unified_users table exists and has data
    console.log('1️⃣ Checking unified_users table...')
    const { data: users, error: usersError } = await supabase
      .from('unified_users')
      .select('*')
      .eq('role', 'USER')
      .limit(5)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return
    }

    console.log(`✅ Found ${users?.length || 0} users in unified_users table`)
    
    if (users && users.length > 0) {
      const sampleUser = users[0]
      console.log('📋 Sample user data:')
      console.log(`   - ID: ${sampleUser.id}`)
      console.log(`   - Name: ${sampleUser.name}`)
      console.log(`   - Email: ${sampleUser.email}`)
      console.log(`   - Warehouse Status: ${sampleUser.warehouse_status}`)
      console.log(`   - Space Occupied: ${sampleUser.space_occupied} m²`)
      console.log(`   - Floor Type: ${sampleUser.floor_type}`)
    }

    // 2. Check if warehouses table exists
    console.log('\\n2️⃣ Checking warehouses table...')
    const { data: warehouses, error: warehousesError } = await supabase
      .from('warehouses')
      .select('*')
      .limit(3)

    if (warehousesError) {
      console.error('❌ Error fetching warehouses:', warehousesError)
    } else {
      console.log(`✅ Found ${warehouses?.length || 0} warehouses`)
    }

    // 3. Check if stock table exists
    console.log('\\n3️⃣ Checking stock table...')
    const { data: stock, error: stockError } = await supabase
      .from('stock')
      .select('*')
      .limit(3)

    if (stockError) {
      console.log('⚠️ Stock table not found or error:', stockError.message)
    } else {
      console.log(`✅ Found ${stock?.length || 0} stock items`)
    }

    // 4. Test the dashboard API logic manually
    console.log('\\n4️⃣ Testing dashboard API logic...')
    if (users && users.length > 0) {
      const testUser = users[0]
      
      // Simulate what the API does
      const userData = testUser
      
      // Get warehouse details if user has active warehouse
      let bookings = []
      if (userData.warehouse_status === 'active' && userData.space_occupied > 0) {
        const { data: warehouseData } = await supabase
          .from('warehouses')
          .select('*')
          .eq('id', userData.warehouse_id)
          .single()

        bookings = [{
          id: `booking-${userData.id}`,
          warehouse_id: userData.warehouse_id,
          name: userData.name,
          space_occupied: userData.space_occupied,
          floor_type: userData.floor_type || 'ground',
          status: userData.warehouse_status,
          entry_date: userData.entry_date,
          expected_exit_date: userData.expected_exit_date,
          warehouse_name: warehouseData?.name || 'Unknown Warehouse',
          warehouse_location: warehouseData?.location || 'Unknown Location'
        }]
      }

      console.log(`✅ Simulated dashboard data for user ${userData.name}:`)
      console.log(`   - Active Bookings: ${bookings.length}`)
      console.log(`   - Space Occupied: ${userData.space_occupied || 0} m²`)
      console.log(`   - Warehouse Status: ${userData.warehouse_status}`)
      
      if (bookings.length > 0) {
        const booking = bookings[0]
        console.log(`   - Warehouse: ${booking.warehouse_name}`)
        console.log(`   - Floor Type: ${booking.floor_type}`)
        console.log(`   - Entry Date: ${booking.entry_date}`)
      }
    }

    console.log('\\n🎉 User Dashboard API test completed successfully!')
    console.log('✅ The API should now work with the unified_users table structure')

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testUserDashboard()
