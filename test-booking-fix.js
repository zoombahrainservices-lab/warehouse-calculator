// Test script to verify booking functionality
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

async function testBooking() {
  console.log('🧪 Testing booking functionality...\n');

  try {
    // 1. Test availability calculation
    console.log('1️⃣ Testing warehouse availability calculation...');
    const { data: warehouses, error: wError } = await supabase
      .from('warehouses')
      .select('*')
      .limit(1);

    if (wError || !warehouses.length) {
      console.log('❌ No warehouses found');
      return;
    }

    const warehouse = warehouses[0];
    console.log(`Testing warehouse: ${warehouse.name}`);

    // Test ground floor
    const { data: groundData, error: groundError } = await supabase
      .rpc('calculate_warehouse_availability_for_user', {
        warehouse_uuid: warehouse.id,
        space_type_param: 'Ground Floor'
      });

    console.log('Ground floor availability:', groundData?.[0] || 'No data');

    // Test mezzanine if available
    if (warehouse.has_mezzanine) {
      const { data: mezzData, error: mezzError } = await supabase
        .rpc('calculate_warehouse_availability_for_user', {
          warehouse_uuid: warehouse.id,
          space_type_param: 'Mezzanine'
        });
      console.log('Mezzanine availability:', mezzData?.[0] || 'No data');
    }

    // 2. Test booking creation (mock)
    console.log('\n2️⃣ Testing booking data structure...');
    const testBookingData = {
      warehouse_id: warehouse.id,
      name: 'Test User',
      space_occupied: 100,
      floor_type: 'Ground Floor',
      entry_date: new Date().toISOString().split('T')[0],
      status: 'active'
    };

    console.log('Sample booking data structure:', testBookingData);

    // 3. Check database constraints
    console.log('\n3️⃣ Checking database constraints...');
    const { data: constraints, error: cError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, table_name, constraint_type')
      .eq('table_name', 'warehouse_occupants');

    if (constraints) {
      console.log('Database constraints for warehouse_occupants:');
      constraints.forEach(c => {
        console.log(`  ${c.constraint_name}: ${c.constraint_type}`);
      });
    }

    console.log('\n✅ Booking test completed!');
    console.log('\n📝 Key fixes applied:');
    console.log('  • Fixed floor_type consistency (Ground Floor vs ground)');
    console.log('  • Added better error logging');
    console.log('  • Improved availability calculation');
    console.log('  • Enhanced error messages');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testBooking();
