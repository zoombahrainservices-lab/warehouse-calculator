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

async function debugWarehouseOccupancy() {
  console.log('🔍 Debugging warehouse occupancy issue...\n');

  try {
    // 1. Check all warehouses
    console.log('1. Checking all warehouses...');
    const { data: warehouses, error: wError } = await supabase
      .from('warehouses')
      .select('*')
      .order('name');

    if (wError) {
      console.log('❌ Warehouses error:', wError);
      return;
    }

    console.log(`Found ${warehouses.length} warehouses:\n`);
    warehouses.forEach((w, index) => {
      console.log(`${index + 1}. ${w.name} (${w.id}):`);
      console.log(`   Total: ${w.total_space || 0}m²`);
      console.log(`   Occupied: ${w.occupied_space || 0}m²`);
      console.log(`   Free: ${w.free_space || 0}m²`);
      console.log(`   Has Mezzanine: ${w.has_mezzanine}`);
      if (w.has_mezzanine) {
        console.log(`   Mezzanine Total: ${w.mezzanine_space || 0}m²`);
        console.log(`   Mezzanine Occupied: ${w.mezzanine_occupied || 0}m²`);
        console.log(`   Mezzanine Free: ${w.mezzanine_free || 0}m²`);
      }
      console.log('');
    });

    // 2. Check all occupants
    console.log('2. Checking all warehouse occupants...');
    const { data: occupants, error: oError } = await supabase
      .from('warehouse_occupants')
      .select('*')
      .order('warehouse_id, floor_type');

    if (oError) {
      console.log('❌ Occupants error:', oError);
      return;
    }

    console.log(`Found ${occupants.length} occupants:\n`);
    occupants.forEach((o, index) => {
      console.log(`${index + 1}. ${o.name}:`);
      console.log(`   Warehouse: ${o.warehouse_id}`);
      console.log(`   Space: ${o.space_occupied || 0}m²`);
      console.log(`   Floor: ${o.floor_type}`);
      console.log(`   Status: ${o.status}`);
      console.log(`   Booking Status: ${o.booking_status}`);
      console.log('');
    });

    // 3. Check if function exists
    console.log('3. Checking if availability function exists...');
    try {
      const { data: funcData, error: funcError } = await supabase
        .rpc('calculate_warehouse_availability_for_user', {
          warehouse_uuid: warehouses[0]?.id || 'test',
          space_type_param: 'Ground Floor'
        });

      if (funcError) {
        console.log('❌ Function error:', funcError.message);
      } else {
        console.log('✅ Function works:', funcData);
      }
    } catch (error) {
      console.log('❌ Function call failed:', error.message);
    }

    // 4. Manual calculation test
    console.log('\n4. Manual occupancy calculation...');
    if (warehouses.length > 0 && occupants.length > 0) {
      const warehouseGroups = {};

      // Group occupants by warehouse and floor
      occupants.forEach(occ => {
        if (!warehouseGroups[occ.warehouse_id]) {
          warehouseGroups[occ.warehouse_id] = {
            ground: [],
            mezzanine: []
          };
        }

        if (occ.floor_type === 'Ground Floor') {
          warehouseGroups[occ.warehouse_id].ground.push(occ);
        } else if (occ.floor_type === 'Mezzanine') {
          warehouseGroups[occ.warehouse_id].mezzanine.push(occ);
        }
      });

      // Calculate for each warehouse
      warehouses.forEach(warehouse => {
        const group = warehouseGroups[warehouse.id] || { ground: [], mezzanine: [] };
        const groundOccupied = group.ground.reduce((sum, occ) => sum + (occ.space_occupied || 0), 0);
        const mezzanineOccupied = group.mezzanine.reduce((sum, occ) => sum + (occ.space_occupied || 0), 0);

        console.log(`${warehouse.name}:`);
        console.log(`  Ground Floor: ${groundOccupied}m² occupied (${group.ground.length} occupants)`);
        console.log(`  Mezzanine: ${mezzanineOccupied}m² occupied (${group.mezzanine.length} occupants)`);
        console.log(`  Total Occupied: ${groundOccupied + mezzanineOccupied}m²`);
        console.log('');
      });
    }

    // 5. Recommendations
    console.log('5. Analysis and recommendations:');
    console.log('');

    let totalOccupants = 0;
    let totalOccupiedSpace = 0;

    warehouses.forEach(w => {
      const warehouseOccupants = occupants.filter(o => o.warehouse_id === w.id);
      const warehouseOccupied = warehouseOccupants.reduce((sum, o) => sum + (o.space_occupied || 0), 0);

      totalOccupants += warehouseOccupants.length;
      totalOccupiedSpace += warehouseOccupied;

      console.log(`${w.name}:`);
      console.log(`  - ${warehouseOccupants.length} occupants`);
      console.log(`  - ${warehouseOccupied}m² occupied`);
      console.log(`  - Database shows: ${w.occupied_space || 0}m²`);
      console.log(`  - Match: ${warehouseOccupied === (w.occupied_space || 0) ? '✅' : '❌'}`);
      console.log('');
    });

    console.log('SUMMARY:');
    console.log(`Total occupants: ${totalOccupants}`);
    console.log(`Total occupied space: ${totalOccupiedSpace}m²`);
    console.log(`Warehouses: ${warehouses.length}`);

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugWarehouseOccupancy();
