const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('env.example', 'utf8');
const envLines = envContent.split('\n');
const envVars = {};

envLines.forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/['\"]/g, '');
  }
});

const supabase = createClient(envVars['NEXT_PUBLIC_SUPABASE_URL'], envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function testWarehouseDisplay() {
  console.log('🧪 Testing warehouse display data...\n');

  try {
    // Test the warehouse selection API endpoint
    console.log('🌐 Testing /api/user/warehouse-selection endpoint...\n');

    // Simulate the API call that the frontend makes
    const warehousesResponse = await fetch(`${envVars['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/warehouses?status=eq.active&select=*`, {
      headers: {
        'apikey': envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
        'Authorization': `Bearer ${envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']}`
      }
    });

    if (!warehousesResponse.ok) {
      console.log('❌ Failed to fetch warehouses');
      return;
    }

    const warehouses = await warehousesResponse.json();
    console.log('🏭 Warehouses from API:');
    warehouses.forEach(w => {
      console.log(`  ${w.name}:`);
      console.log(`    Total Space: ${w.total_space || 0}m²`);
      console.log(`    Occupied: ${w.occupied_space || 0}m²`);
      console.log(`    Free: ${w.free_space || 0}m²`);
      console.log(`    Has Mezzanine: ${w.has_mezzanine}`);
      if (w.has_mezzanine) {
        console.log(`    Mezzanine Total: ${w.mezzanine_space || 0}m²`);
        console.log(`    Mezzanine Occupied: ${w.mezzanine_occupied || 0}m²`);
        console.log(`    Mezzanine Free: ${w.mezzanine_free || 0}m²`);
      }
      console.log('');
    });

    // Test availability calculation for each warehouse
    console.log('🔧 Testing availability calculations:\n');

    for (const warehouse of warehouses) {
      console.log(`${warehouse.name} (${warehouse.id}):`);

      // Test ground floor
      try {
        const { data: groundData, error: groundError } = await supabase
          .rpc('calculate_warehouse_availability_for_user', {
            warehouse_uuid: warehouse.id,
            space_type_param: 'Ground Floor'
          });

        if (groundError) {
          console.log(`  ❌ Ground floor error: ${groundError.message}`);
        } else if (groundData && groundData.length > 0) {
          const g = groundData[0];
          console.log(`  ✅ Ground: ${g.available_space}m² available (${g.total_space}m² total, ${g.occupied_space}m² occupied, ${g.utilization_percentage.toFixed(1)}% utilized)`);
        } else {
          console.log(`  ❌ Ground floor: No data returned`);
        }
      } catch (error) {
        console.log(`  ❌ Ground floor exception: ${error.message}`);
      }

      // Test mezzanine if available
      if (warehouse.has_mezzanine) {
        try {
          const { data: mezzData, error: mezzError } = await supabase
            .rpc('calculate_warehouse_availability_for_user', {
              warehouse_uuid: warehouse.id,
              space_type_param: 'Mezzanine'
            });

          if (mezzError) {
            console.log(`  ❌ Mezzanine error: ${mezzError.message}`);
          } else if (mezzData && mezzData.length > 0) {
            const m = mezzData[0];
            console.log(`  ✅ Mezzanine: ${m.available_space}m² available (${m.total_space}m² total, ${m.occupied_space}m² occupied, ${m.utilization_percentage.toFixed(1)}% utilized)`);
          } else {
            console.log(`  ❌ Mezzanine: No data returned`);
          }
        } catch (error) {
          console.log(`  ❌ Mezzanine exception: ${error.message}`);
        }
      }

      console.log('');
    }

    // Calculate totals
    const totals = warehouses.reduce((acc, w) => {
      acc.totalGround += w.total_space || 0;
      acc.occupiedGround += w.occupied_space || 0;
      acc.totalMezzanine += w.mezzanine_space || 0;
      acc.occupiedMezzanine += w.mezzanine_occupied || 0;
      return acc;
    }, { totalGround: 0, occupiedGround: 0, totalMezzanine: 0, occupiedMezzanine: 0 });

    const totalSpace = totals.totalGround + totals.totalMezzanine;
    const totalOccupied = totals.occupiedGround + totals.occupiedMezzanine;
    const totalFree = totalSpace - totalOccupied;
    const utilization = totalSpace > 0 ? ((totalOccupied / totalSpace) * 100).toFixed(1) : '0.0';

    console.log('📊 OVERALL SUMMARY:');
    console.log(`  Total Space: ${totalSpace}m²`);
    console.log(`  Occupied: ${totalOccupied}m²`);
    console.log(`  Free: ${totalFree}m²`);
    console.log(`  Utilization: ${utilization}%`);
    console.log(`  Ground Floor: ${totals.totalGround}m² total, ${totals.occupiedGround}m² occupied`);
    console.log(`  Mezzanine: ${totals.totalMezzanine}m² total, ${totals.occupiedMezzanine}m² occupied`);

    console.log('\n✅ Warehouse display test completed!');

    if (totalOccupied > 0) {
      console.log('\n🎉 SUCCESS: Warehouses now show proper occupancy data!');
    } else {
      console.log('\n⚠️ WARNING: All warehouses still show 0 occupied space.');
      console.log('   This means either:');
      console.log('   1. No occupants are assigned to active status');
      console.log('   2. Floor types are not properly set');
      console.log('   3. Database needs to be updated with sample data');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testWarehouseDisplay();
