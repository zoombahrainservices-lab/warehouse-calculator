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

async function checkWarehouseData() {
  console.log('🔍 Checking warehouse occupancy data...\n');

  // Check warehouses
  const { data: warehouses, error: wError } = await supabase
    .from('warehouses')
    .select('*');

  if (wError) {
    console.log('❌ Warehouse error:', wError);
    return;
  }

  console.log('🏭 Warehouses:');
  warehouses.forEach(w => {
    console.log(`  ${w.name}:`);
    console.log(`    ID: ${w.id}`);
    console.log(`    Total: ${w.total_space || 0} m²`);
    console.log(`    Occupied: ${w.occupied_space || 0} m²`);
    console.log(`    Free: ${w.free_space || 0} m²`);
    console.log(`    Has Mezzanine: ${w.has_mezzanine}`);
    console.log(`    Mezzanine Total: ${w.mezzanine_space || 0} m²`);
    console.log(`    Mezzanine Occupied: ${w.mezzanine_occupied || 0} m²`);
    console.log(`    Mezzanine Free: ${w.mezzanine_free || 0} m²`);
    console.log('');
  });

  // Check occupants
  const { data: occupants, error: oError } = await supabase
    .from('warehouse_occupants')
    .select('*');

  if (oError) {
    console.log('❌ Occupants error:', oError);
    return;
  }

  console.log('👥 Warehouse Occupants:');
  occupants.forEach(o => {
    console.log(`  ${o.name}:`);
    console.log(`    Warehouse: ${o.warehouse_id}`);
    console.log(`    Space: ${o.space_occupied || 0} m²`);
    console.log(`    Floor: ${o.floor_type}`);
    console.log(`    Status: ${o.status}`);
    console.log(`    Booking Status: ${o.booking_status}`);
    console.log('');
  });

  // Test availability function
  if (warehouses.length > 0) {
    const warehouse = warehouses[0];
    console.log('🔧 Testing availability calculation for:', warehouse.name);

    // Test ground floor
    const { data: groundData, error: groundError } = await supabase
      .rpc('calculate_warehouse_availability_for_user', {
        warehouse_uuid: warehouse.id,
        space_type_param: 'Ground Floor'
      });

    console.log('Ground floor result:', { data: groundData, error: groundError });

    if (warehouse.has_mezzanine) {
      const { data: mezzData, error: mezzError } = await supabase
        .rpc('calculate_warehouse_availability_for_user', {
          warehouse_uuid: warehouse.id,
          space_type_param: 'Mezzanine'
        });

      console.log('Mezzanine result:', { data: mezzData, error: mezzError });
    }
  }
}

checkWarehouseData().catch(console.error);
