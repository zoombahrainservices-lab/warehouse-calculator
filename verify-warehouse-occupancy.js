// Debug script to verify warehouse occupancy calculations
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugWarehouseOccupancy() {
  console.log('🔧 Verifying warehouse occupancy calculations...\n')

  try {
    // Get all warehouses first
    console.log('📍 Getting all warehouses...')
    const { data: warehouses, error: warehouseError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (warehouseError) {
      console.error('❌ Error fetching warehouses:', warehouseError)
      return
    }

    console.log(`✅ Found ${warehouses.length} active warehouses:\n`)

    // Check each warehouse's occupancy
    for (const warehouse of warehouses) {
      console.log(`🏭 ${warehouse.name} (${warehouse.id})`)
      console.log(`   Total Space: ${warehouse.total_space} m²`)
      console.log(`   Mezzanine Space: ${warehouse.mezzanine_space} m²`)
      console.log(`   Has Mezzanine: ${warehouse.has_mezzanine}`)

      // Check ground floor occupants
      console.log('\n   🏠 GROUND FLOOR:')
      const { data: groundOccupants, error: groundError } = await supabase
        .from('warehouse_occupants')
        .select('id, name, space_occupied, status, booking_status, floor_type')
        .eq('warehouse_id', warehouse.id)
        .eq('floor_type', 'Ground Floor')
        .eq('status', 'active')

      if (groundError) {
        console.error(`   ❌ Error fetching ground floor occupants:`, groundError)
      } else {
        const totalGroundOccupied = groundOccupants.reduce((sum, occ) => sum + (occ.space_occupied || 0), 0)
        const groundAvailable = Math.max((warehouse.total_space || 0) - totalGroundOccupied, 0)
        const groundUtilization = warehouse.total_space > 0 ? (totalGroundOccupied / warehouse.total_space) * 100 : 0

        console.log(`   📊 Occupants: ${groundOccupants.length}`)
        console.log(`   📏 Occupied: ${totalGroundOccupied} m²`)
        console.log(`   ✅ Available: ${groundAvailable} m²`)
        console.log(`   📈 Utilization: ${groundUtilization.toFixed(2)}%`)

        if (groundOccupants.length > 0) {
          console.log('   📋 Details:')
          groundOccupants.forEach((occ, i) => {
            console.log(`      ${i + 1}. ${occ.name}: ${occ.space_occupied} m² (${occ.status}/${occ.booking_status})`)
          })
        }
      }

      // Check mezzanine occupants if warehouse has mezzanine
      if (warehouse.has_mezzanine) {
        console.log('\n   🏢 MEZZANINE:')
        const { data: mezzOccupants, error: mezzError } = await supabase
          .from('warehouse_occupants')
          .select('id, name, space_occupied, status, booking_status, floor_type')
          .eq('warehouse_id', warehouse.id)
          .eq('floor_type', 'Mezzanine')
          .eq('status', 'active')

        if (mezzError) {
          console.error(`   ❌ Error fetching mezzanine occupants:`, mezzError)
        } else {
          const totalMezzOccupied = mezzOccupants.reduce((sum, occ) => sum + (occ.space_occupied || 0), 0)
          const mezzAvailable = Math.max((warehouse.mezzanine_space || 0) - totalMezzOccupied, 0)
          const mezzUtilization = warehouse.mezzanine_space > 0 ? (totalMezzOccupied / warehouse.mezzanine_space) * 100 : 0

          console.log(`   📊 Occupants: ${mezzOccupants.length}`)
          console.log(`   📏 Occupied: ${totalMezzOccupied} m²`)
          console.log(`   ✅ Available: ${mezzAvailable} m²`)
          console.log(`   📈 Utilization: ${mezzUtilization.toFixed(2)}%`)

          if (mezzOccupants.length > 0) {
            console.log('   📋 Details:')
            mezzOccupants.forEach((occ, i) => {
              console.log(`      ${i + 1}. ${occ.name}: ${occ.space_occupied} m² (${occ.status}/${occ.booking_status})`)
            })
          }
        }
      }

      console.log('\n   ' + '='.repeat(60))
    }

    // Summary
    console.log('\n📊 SUMMARY:')
    console.log(`Total warehouses: ${warehouses.length}`)

    let totalGroundCapacity = 0
    let totalGroundOccupied = 0
    let totalMezzCapacity = 0
    let totalMezzOccupied = 0

    for (const warehouse of warehouses) {
      totalGroundCapacity += warehouse.total_space || 0
      totalMezzCapacity += warehouse.mezzanine_space || 0

      // Calculate actual occupied space
      const { data: groundOcc } = await supabase
        .from('warehouse_occupants')
        .select('space_occupied')
        .eq('warehouse_id', warehouse.id)
        .eq('floor_type', 'Ground Floor')
        .eq('status', 'active')

      const { data: mezzOcc } = await supabase
        .from('warehouse_occupants')
        .select('space_occupied')
        .eq('warehouse_id', warehouse.id)
        .eq('floor_type', 'Mezzanine')
        .eq('status', 'active')

      totalGroundOccupied += groundOcc?.reduce((sum, occ) => sum + (occ.space_occupied || 0), 0) || 0
      totalMezzOccupied += mezzOcc?.reduce((sum, occ) => sum + (occ.space_occupied || 0), 0) || 0
    }

    console.log(`Ground Floor - Capacity: ${totalGroundCapacity} m², Occupied: ${totalGroundOccupied} m², Available: ${totalGroundCapacity - totalGroundOccupied} m²`)
    console.log(`Mezzanine - Capacity: ${totalMezzCapacity} m², Occupied: ${totalMezzOccupied} m², Available: ${totalMezzCapacity - totalMezzOccupied} m²`)

  } catch (error) {
    console.error('❌ Script error:', error)
  }
}

// Run the debug function
debugWarehouseOccupancy()
  .then(() => {
    console.log('\n✅ Debug script completed successfully')
    console.log('📋 Use this data to verify dashboard calculations')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Debug script failed:', error)
    process.exit(1)
  })
