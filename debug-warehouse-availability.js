// Debug script to test warehouse availability calculation
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugWarehouseAvailability() {
  console.log('🔧 Testing warehouse availability calculation...\n')

  try {
    // Get all warehouses first
    console.log('📍 Getting all warehouses...')
    const { data: warehouses, error: warehouseError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('status', 'active')

    if (warehouseError) {
      console.error('❌ Error fetching warehouses:', warehouseError)
      return
    }

    console.log(`✅ Found ${warehouses.length} active warehouses:`)
    warehouses.forEach((w, i) => {
      console.log(`  ${i + 1}. ${w.name} (${w.id}) - Total: ${w.total_space}, Mezzanine: ${w.mezzanine_space}`)
    })

    console.log('\n' + '='.repeat(50))

    // Test availability calculation for each warehouse
    for (const warehouse of warehouses.slice(0, 3)) { // Test first 3 warehouses
      console.log(`\n🏭 Testing availability for: ${warehouse.name}`)
      console.log(`   Warehouse ID: ${warehouse.id}`)
      console.log(`   Has Mezzanine: ${warehouse.has_mezzanine}`)
      console.log(`   Total Space: ${warehouse.total_space}`)
      console.log(`   Mezzanine Space: ${warehouse.mezzanine_space}`)

      // Test ground floor
      console.log('\n   🏠 GROUND FLOOR:')
      try {
        const { data: groundData, error: groundError } = await supabase
          .rpc('calculate_warehouse_availability_for_user', {
            warehouse_uuid: warehouse.id,
            space_type_param: 'Ground Floor'
          })

        if (groundError) {
          console.error(`   ❌ Ground floor error:`, groundError.message)
        } else if (groundData && groundData.length > 0) {
          const availability = groundData[0]
          console.log(`   ✅ Ground floor data:`, {
            total: availability.total_space,
            occupied: availability.occupied_space,
            available: availability.available_space,
            utilization: `${availability.utilization_percentage}%`
          })
        } else {
          console.warn(`   ⚠️ No ground floor data returned`)
        }
      } catch (err) {
        console.error(`   ❌ Ground floor exception:`, err.message)
      }

      // Test mezzanine if exists
      if (warehouse.has_mezzanine) {
        console.log('\n   🏢 MEZZANINE:')
        try {
          const { data: mezzData, error: mezzError } = await supabase
            .rpc('calculate_warehouse_availability_for_user', {
              warehouse_uuid: warehouse.id,
              space_type_param: 'Mezzanine'
            })

          if (mezzError) {
            console.error(`   ❌ Mezzanine error:`, mezzError.message)
          } else if (mezzData && mezzData.length > 0) {
            const availability = mezzData[0]
            console.log(`   ✅ Mezzanine data:`, {
              total: availability.total_space,
              occupied: availability.occupied_space,
              available: availability.available_space,
              utilization: `${availability.utilization_percentage}%`
            })
          } else {
            console.warn(`   ⚠️ No mezzanine data returned`)
          }
        } catch (err) {
          console.error(`   ❌ Mezzanine exception:`, err.message)
        }
      } else {
        console.log('\n   🏢 MEZZANINE: Skipped (no mezzanine)')
      }

      console.log('   ' + '-'.repeat(30))
    }

  } catch (error) {
    console.error('❌ Script error:', error)
  }
}

// Run the debug function
debugWarehouseAvailability()
  .then(() => {
    console.log('\n✅ Debug script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Debug script failed:', error)
    process.exit(1)
  })
