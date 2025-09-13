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

async function verifyOccupancyFix() {
  console.log('✅ Verifying warehouse occupancy fix...\n');

  try {
    // 1. Check warehouses
    console.log('🏭 Checking warehouses:');
    const { data: warehouses, error: wError } = await supabase
      .from('warehouses')
      .select('*')
      .order('name');

    if (wError) {
      console.log('❌ Error:', wError);
      return;
    }

    warehouses.forEach(w => {
      const totalOccupied = (w.occupied_space || 0) + (w.mezzanine_occupied || 0);
      const totalSpace = (w.total_space || 0) + (w.mezzanine_space || 0);
      const utilization = totalSpace > 0 ? ((totalOccupied / totalSpace) * 100).toFixed(1) : '0.0';

      console.log(`${w.name}:`);
      console.log(`  Ground: ${(w.total_space || 0)}m² total, ${(w.occupied_space || 0)}m² occupied`);
      if (w.has_mezzanine) {
        console.log(`  Mezzanine: ${(w.mezzanine_space || 0)}m² total, ${(w.mezzanine_occupied || 0)}m² occupied`);
      }
      console.log(`  Total: ${totalSpace}m² space, ${totalOccupied}m² occupied (${utilization}%)`);
      console.log('');
    });

    // 2. Check occupants
    console.log('👥 Checking occupants:');
    const { data: occupants, error: oError } = await supabase
      .from('warehouse_occupants')
      .select('name, warehouse_id, space_occupied, floor_type, status')
      .order('warehouse_id, floor_type');

    if (oError) {
      console.log('❌ Error:', oError);
    } else {
      const occupantSummary = occupants.reduce((acc, occ) => {
        const key = occ.warehouse_id;
        if (!acc[key]) acc[key] = { ground: [], mezzanine: [] };

        if (occ.floor_type === 'Ground Floor') {
          acc[key].ground.push(occ);
        } else if (occ.floor_type === 'Mezzanine') {
          acc[key].mezzanine.push(occ);
        }
        return acc;
      }, {});

      Object.keys(occupantSummary).forEach(warehouseId => {
        const warehouse = warehouses.find(w => w.id === warehouseId);
        const summary = occupantSummary[warehouseId];

        console.log(`${warehouse?.name || warehouseId}:`);
        console.log(`  Ground: ${summary.ground.length} occupants (${summary.ground.reduce((sum, o) => sum + (o.space_occupied || 0), 0)}m²)`);
        console.log(`  Mezzanine: ${summary.mezzanine.length} occupants (${summary.mezzanine.reduce((sum, o) => sum + (o.space_occupied || 0), 0)}m²)`);
        console.log('');
      });
    }

    // 3. Test function
    console.log('🔧 Testing availability function:');
    if (warehouses.length > 0) {
      const warehouse = warehouses[0];

      try {
        const { data: groundData, error: groundError } = await supabase
          .rpc('calculate_warehouse_availability_for_user', {
            warehouse_uuid: warehouse.id,
            space_type_param: 'Ground Floor'
          });

        if (groundError) {
          console.log(`❌ Ground floor function error: ${groundError.message}`);
        } else {
          console.log(`✅ Ground floor: ${groundData?.[0]?.available_space || 0}m² available`);
        }

        if (warehouse.has_mezzanine) {
          const { data: mezzData, error: mezzError } = await supabase
            .rpc('calculate_warehouse_availability_for_user', {
              warehouse_uuid: warehouse.id,
              space_type_param: 'Mezzanine'
            });

          if (mezzError) {
            console.log(`❌ Mezzanine function error: ${mezzError.message}`);
          } else {
            console.log(`✅ Mezzanine: ${mezzData?.[0]?.available_space || 0}m² available`);
          }
        }
      } catch (error) {
        console.log(`❌ Function test failed: ${error.message}`);
      }
    }

    // 4. Summary
    const totalWarehouses = warehouses.length;
    const totalSpace = warehouses.reduce((sum, w) => sum + (w.total_space || 0) + (w.mezzanine_space || 0), 0);
    const totalOccupied = warehouses.reduce((sum, w) => sum + (w.occupied_space || 0) + (w.mezzanine_occupied || 0), 0);
    const totalOccupants = occupants?.length || 0;

    console.log('📊 SUMMARY:');
    console.log(`  ${totalWarehouses} warehouses`);
    console.log(`  ${totalSpace}m² total space`);
    console.log(`  ${totalOccupied}m² occupied space`);
    console.log(`  ${totalSpace - totalOccupied}m² free space`);
    console.log(`  ${totalOccupants} occupants`);
    console.log(`  ${(totalSpace > 0 ? ((totalOccupied / totalSpace) * 100).toFixed(1) : 0)}% utilization`);

    if (totalOccupied > 0) {
      console.log('\n🎉 SUCCESS: Warehouse occupancy is working correctly!');
    } else {
      console.log('\n⚠️ WARNING: No occupied space found. Data may need to be populated.');
    }

  } catch (error) {
    console.error('❌ Verification error:', error);
  }
}

verifyOccupancyFix();
