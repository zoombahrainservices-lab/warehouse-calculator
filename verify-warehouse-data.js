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

async function verifyWarehouseData() {
  console.log('🔍 Verifying warehouse data accuracy...\n');

  try {
    // 1. Check all warehouses
    console.log('🏭 Checking warehouses table:');
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
      console.log(`   Database values:`);
      console.log(`     - total_space: ${w.total_space || 0}`);
      console.log(`     - occupied_space: ${w.occupied_space || 0}`);
      console.log(`     - free_space: ${w.free_space || 0}`);
      console.log(`     - has_mezzanine: ${w.has_mezzanine}`);
      console.log(`     - mezzanine_space: ${w.mezzanine_space || 0}`);
      console.log(`     - mezzanine_occupied: ${w.mezzanine_occupied || 0}`);
      console.log('');
    });

    // 2. Check all occupants
    console.log('👥 Checking warehouse_occupants table:');
    const { data: occupants, error: oError } = await supabase
      .from('warehouse_occupants')
      .select('*')
      .order('warehouse_id, floor_type');

    if (oError) {
      console.log('❌ Occupants error:', oError);
      return;
    }

    console.log(`Found ${occupants.length} occupants:\n`);

    // Group by warehouse
    const groupedOccupants = occupants.reduce((acc, occ) => {
      if (!acc[occ.warehouse_id]) {
        acc[occ.warehouse_id] = { ground: [], mezzanine: [] };
      }
      if (occ.floor_type === 'Ground Floor') {
        acc[occ.warehouse_id].ground.push(occ);
      } else if (occ.floor_type === 'Mezzanine') {
        acc[occ.warehouse_id].mezzanine.push(occ);
      }
      return acc;
    }, {});

    // 3. Calculate actual occupancy for each warehouse
    console.log('🔢 Calculating actual occupancy:\n');
    warehouses.forEach(warehouse => {
      const warehouseOccs = groupedOccupants[warehouse.id] || { ground: [], mezzanine: [] };
      const actualGroundOccupied = warehouseOccs.ground
        .filter(occ => occ.status === 'active')
        .reduce((sum, occ) => sum + (occ.space_occupied || 0), 0);

      const actualMezzanineOccupied = warehouseOccs.mezzanine
        .filter(occ => occ.status === 'active')
        .reduce((sum, occ) => sum + (occ.space_occupied || 0), 0);

      const groundTotal = warehouse.total_space || 0;
      const mezzanineTotal = warehouse.mezzanine_space || 0;

      const groundAvailable = Math.max(0, groundTotal - actualGroundOccupied);
      const mezzanineAvailable = Math.max(0, mezzanineTotal - actualMezzanineOccupied);

      console.log(`${warehouse.name}:`);
      console.log(`  Ground Floor:`);
      console.log(`    Database: occupied=${warehouse.occupied_space || 0}, free=${warehouse.free_space || 0}`);
      console.log(`    Calculated: occupied=${actualGroundOccupied}, available=${groundAvailable}`);
      console.log(`    Match: ${actualGroundOccupied === (warehouse.occupied_space || 0) ? '✅' : '❌'}`);

      if (warehouse.has_mezzanine) {
        console.log(`  Mezzanine:`);
        console.log(`    Database: occupied=${warehouse.mezzanine_occupied || 0}`);
        console.log(`    Calculated: occupied=${actualMezzanineOccupied}, available=${mezzanineAvailable}`);
        console.log(`    Match: ${actualMezzanineOccupied === (warehouse.mezzanine_occupied || 0) ? '✅' : '❌'}`);
      }
      console.log('');
    });

    // 4. Test the availability function
    console.log('🔧 Testing availability function:\n');
    for (const warehouse of warehouses.slice(0, 2)) { // Test first 2 warehouses
      console.log(`Testing ${warehouse.name}...`);

      // Test ground floor
      try {
        const { data: groundData, error: groundError } = await supabase
          .rpc('calculate_warehouse_availability_for_user', {
            warehouse_uuid: warehouse.id,
            space_type_param: 'Ground Floor'
          });

        if (groundError) {
          console.log(`  ❌ Ground floor error: ${groundError.message}`);
        } else {
          const g = groundData?.[0];
          console.log(`  ✅ Ground floor: ${g?.available_space || 0}m² available (${g?.occupied_space || 0}m² occupied)`);
        }
      } catch (error) {
        console.log(`  ❌ Ground floor exception: ${error.message}`);
      }

      // Test mezzanine if exists
      if (warehouse.has_mezzanine) {
        try {
          const { data: mezzData, error: mezzError } = await supabase
            .rpc('calculate_warehouse_availability_for_user', {
              warehouse_uuid: warehouse.id,
              space_type_param: 'Mezzanine'
            });

          if (mezzError) {
            console.log(`  ❌ Mezzanine error: ${mezzError.message}`);
          } else {
            const m = mezzData?.[0];
            console.log(`  ✅ Mezzanine: ${m?.available_space || 0}m² available (${m?.occupied_space || 0}m² occupied)`);
          }
        } catch (error) {
          console.log(`  ❌ Mezzanine exception: ${error.message}`);
        }
      }
      console.log('');
    }

    // 5. Summary
    console.log('📊 SUMMARY:');
    const totalOccupants = occupants.filter(o => o.status === 'active').length;
    const totalOccupied = warehouses.reduce((sum, w) => sum + (w.occupied_space || 0) + (w.mezzanine_occupied || 0), 0);
    const totalSpace = warehouses.reduce((sum, w) => sum + (w.total_space || 0) + (w.mezzanine_space || 0), 0);

    console.log(`  ${warehouses.length} warehouses`);
    console.log(`  ${totalOccupants} active occupants`);
    console.log(`  ${totalSpace}m² total space`);
    console.log(`  ${totalOccupied}m² occupied space`);
    console.log(`  ${totalSpace - totalOccupied}m² available space`);
    console.log(`  ${(totalSpace > 0 ? ((totalOccupied / totalSpace) * 100).toFixed(1) : 0)}% utilization`);

  } catch (error) {
    console.error('❌ Verification error:', error);
  }
}

verifyWarehouseData();
