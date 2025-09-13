const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = 'env.example';
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
const envVars = {};

envLines.forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/['\"]/g, '');
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.log('Supabase credentials not found in env.example');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('🔍 Checking warehouse availability data...\n');

  // Check warehouses table
  const { data: warehouses, error: wError } = await supabase
    .from('warehouses')
    .select('*');

  if (wError) {
    console.log('❌ Error fetching warehouses:', wError);
    return;
  }

  console.log('🏭 Warehouses:');
  warehouses.forEach(w => {
    console.log(`  ${w.name}: Total: ${w.total_space}m², Mezzanine: ${w.mezzanine_space}m², Has Mezzanine: ${w.has_mezzanine}`);
  });

  // Check warehouse_occupants table
  const { data: occupants, error: oError } = await supabase
    .from('warehouse_occupants')
    .select('floor_type, space_occupied, booking_status');

  if (oError) {
    console.log('❌ Error fetching occupants:', oError);
    return;
  }

  console.log('\n👥 Warehouse Occupants:');
  const floorTypes = {};
  occupants.forEach(o => {
    if (!floorTypes[o.floor_type]) floorTypes[o.floor_type] = 0;
    floorTypes[o.floor_type] += o.space_occupied || 0;
    console.log(`  Floor: ${o.floor_type}, Space: ${o.space_occupied}m², Status: ${o.booking_status}`);
  });

  console.log('\n📊 Floor Type Summary:');
  Object.keys(floorTypes).forEach(type => {
    console.log(`  ${type}: ${floorTypes[type]}m² total occupied`);
  });

  // Test the function
  console.log('\n🔧 Testing availability calculation function...');
  if (warehouses.length > 0) {
    const warehouseId = warehouses[0].id;
    console.log(`Testing warehouse: ${warehouses[0].name} (${warehouseId})`);

    const { data: groundData, error: groundError } = await supabase
      .rpc('calculate_warehouse_availability_for_user', {
        warehouse_uuid: warehouseId,
        space_type_param: 'Ground Floor'
      });

    if (groundError) {
      console.log('❌ Ground floor calculation error:', groundError);
    } else {
      console.log('✅ Ground floor availability:', groundData);
    }

    if (warehouses[0].has_mezzanine) {
      const { data: mezzData, error: mezzError } = await supabase
        .rpc('calculate_warehouse_availability_for_user', {
          warehouse_uuid: warehouseId,
          space_type_param: 'Mezzanine'
        });

      if (mezzError) {
        console.log('❌ Mezzanine calculation error:', mezzError);
      } else {
        console.log('✅ Mezzanine availability:', mezzData);
      }
    }
  }
}

checkData().catch(console.error);
