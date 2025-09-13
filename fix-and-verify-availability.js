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
  console.log('❌ Supabase credentials not found in env.example');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAndVerify() {
  console.log('🔧 Fixing and verifying warehouse availability...\n');

  try {
    // First, check current warehouse data
    console.log('🏭 Current warehouse data:');
    const { data: warehouses, error: wError } = await supabase
      .from('warehouses')
      .select('*');

    if (wError) {
      console.log('❌ Error fetching warehouses:', wError);
      return;
    }

    warehouses.forEach(w => {
      console.log(`  ${w.name}:`);
      console.log(`    ID: ${w.id}`);
      console.log(`    Total space: ${w.total_space}m²`);
      console.log(`    Occupied: ${w.occupied_space}m²`);
      console.log(`    Free: ${w.free_space}m²`);
      console.log(`    Has mezzanine: ${w.has_mezzanine}`);
      console.log(`    Mezzanine total: ${w.mezzanine_space}m²`);
      console.log(`    Mezzanine occupied: ${w.mezzanine_occupied}m²`);
      console.log(`    Mezzanine free: ${w.mezzanine_free}m²\n`);
    });

    // Check warehouse occupants
    console.log('👥 Current warehouse occupants:');
    const { data: occupants, error: oError } = await supabase
      .from('warehouse_occupants')
      .select('*');

    if (oError) {
      console.log('❌ Error fetching occupants:', oError);
    } else {
      occupants.forEach(o => {
        console.log(`  ${o.name}:`);
        console.log(`    Space: ${o.space_occupied}m²`);
        console.log(`    Floor: ${o.floor_type}`);
        console.log(`    Status: ${o.status}`);
        console.log(`    Warehouse: ${o.warehouse_id}\n`);
      });
    }

    // Test the availability function manually
    console.log('🔧 Testing availability calculation function...');
    if (warehouses.length > 0) {
      const warehouse = warehouses[0];

      console.log(`\nTesting warehouse: ${warehouse.name} (${warehouse.id})`);

      // Test ground floor
      console.log('\n📊 Ground Floor Calculation:');
      const { data: groundData, error: groundError } = await supabase
        .rpc('calculate_warehouse_availability_for_user', {
          warehouse_uuid: warehouse.id,
          space_type_param: 'Ground Floor'
        });

      if (groundError) {
        console.log('❌ Ground floor error:', groundError);
      } else if (groundData && groundData.length > 0) {
        const g = groundData[0];
        console.log(`✅ Ground floor: ${g.available_space}m² available (${g.total_space}m² total, ${g.occupied_space}m² occupied)`);
      } else {
        console.log('❌ No ground floor data returned');
      }

      // Test mezzanine if it exists
      if (warehouse.has_mezzanine) {
        console.log('\n📊 Mezzanine Calculation:');
        const { data: mezzData, error: mezzError } = await supabase
          .rpc('calculate_warehouse_availability_for_user', {
            warehouse_uuid: warehouse.id,
            space_type_param: 'Mezzanine'
          });

        if (mezzError) {
          console.log('❌ Mezzanine error:', mezzError);
        } else if (mezzData && mezzData.length > 0) {
          const m = mezzData[0];
          console.log(`✅ Mezzanine: ${m.available_space}m² available (${m.total_space}m² total, ${m.occupied_space}m² occupied)`);
        } else {
          console.log('❌ No mezzanine data returned');
        }
      }

      // Test API endpoint
      console.log('\n🌐 Testing API endpoint...');
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/calculate_warehouse_availability_for_user`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            warehouse_uuid: warehouse.id,
            space_type_param: 'Ground Floor'
          })
        });

        if (response.ok) {
          const apiData = await response.json();
          console.log('✅ API call successful:', apiData);
        } else {
          console.log('❌ API call failed:', response.status, response.statusText);
        }
      } catch (apiError) {
        console.log('❌ API test error:', apiError.message);
      }
    }

    console.log('\n🎉 Verification complete!');
    console.log('\nIf the function is working correctly, you should see:');
    console.log('1. ✅ Ground floor calculation with available space');
    console.log('2. ✅ Mezzanine calculation (if warehouse has mezzanine)');
    console.log('3. ✅ API calls returning data');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

fixAndVerify();
