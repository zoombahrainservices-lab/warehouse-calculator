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

async function checkBookingData() {
  console.log('🔍 Checking booking data for warehouse: 7ca93974-45cd-4497-9286-e7f7a60a9e0f\n');

  const warehouseId = '7ca93974-45cd-4497-9286-e7f7a60a9e0f';

  try {
    // 1. Check if warehouse exists
    console.log('1. Checking warehouse existence...');
    const { data: warehouse, error: wError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', warehouseId)
      .single();

    if (wError) {
      console.log('❌ Warehouse query error:', wError);
      return;
    }

    if (!warehouse) {
      console.log('❌ Warehouse not found!');
      return;
    }

    console.log('✅ Warehouse found:', {
      id: warehouse.id,
      name: warehouse.name,
      total_space: warehouse.total_space,
      occupied_space: warehouse.occupied_space,
      free_space: warehouse.free_space,
      has_mezzanine: warehouse.has_mezzanine,
      mezzanine_space: warehouse.mezzanine_space,
      mezzanine_occupied: warehouse.mezzanine_occupied
    });

    // 2. Check ground floor occupants
    console.log('\n2. Checking Ground Floor occupants...');
    const { data: groundOccupants, error: gError } = await supabase
      .from('warehouse_occupants')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .eq('floor_type', 'Ground Floor')
      .eq('status', 'active');

    if (gError) {
      console.log('❌ Ground floor occupants query error:', gError);
    } else {
      console.log(`✅ Found ${groundOccupants?.length || 0} ground floor occupants:`);
      groundOccupants?.forEach(occ => {
        console.log(`  - ${occ.name}: ${occ.space_occupied}m² (${occ.status}, ${occ.booking_status})`);
      });

      const totalGroundOccupied = groundOccupants?.reduce((sum, occ) => sum + (occ.space_occupied || 0), 0) || 0;
      console.log(`📊 Total Ground Floor Occupied: ${totalGroundOccupied}m²`);
    }

    // 3. Check mezzanine occupants (if warehouse has mezzanine)
    if (warehouse.has_mezzanine) {
      console.log('\n3. Checking Mezzanine occupants...');
      const { data: mezzanineOccupants, error: mError } = await supabase
        .from('warehouse_occupants')
        .select('*')
        .eq('warehouse_id', warehouseId)
        .eq('floor_type', 'Mezzanine')
        .eq('status', 'active');

      if (mError) {
        console.log('❌ Mezzanine occupants query error:', mError);
      } else {
        console.log(`✅ Found ${mezzanineOccupants?.length || 0} mezzanine occupants:`);
        mezzanineOccupants?.forEach(occ => {
          console.log(`  - ${occ.name}: ${occ.space_occupied}m² (${occ.status}, ${occ.booking_status})`);
        });

        const totalMezzanineOccupied = mezzanineOccupants?.reduce((sum, occ) => sum + (occ.space_occupied || 0), 0) || 0;
        console.log(`📊 Total Mezzanine Occupied: ${totalMezzanineOccupied}m²`);
      }
    }

    // 4. Manual calculation simulation
    console.log('\n4. Manual calculation simulation...');

    const totalGroundOccupied = groundOccupants?.reduce((sum, occ) => sum + (occ.space_occupied || 0), 0) || 0;
    const groundTotal = warehouse.total_space || 0;
    const groundAvailable = Math.max(0, groundTotal - totalGroundOccupied);
    const groundUtilization = groundTotal > 0 ? (totalGroundOccupied / groundTotal) * 100 : 0;

    console.log('Ground Floor Calculation:');
    console.log(`  Total Space: ${groundTotal}m²`);
    console.log(`  Occupied Space: ${totalGroundOccupied}m²`);
    console.log(`  Available Space: ${groundAvailable}m²`);
    console.log(`  Utilization: ${groundUtilization.toFixed(1)}%`);

    if (warehouse.has_mezzanine) {
      const { data: mezzanineOccupants } = await supabase
        .from('warehouse_occupants')
        .select('space_occupied')
        .eq('warehouse_id', warehouseId)
        .eq('floor_type', 'Mezzanine')
        .eq('status', 'active');

      const totalMezzanineOccupied = mezzanineOccupants?.reduce((sum, occ) => sum + (occ.space_occupied || 0), 0) || 0;
      const mezzanineTotal = warehouse.mezzanine_space || 0;
      const mezzanineAvailable = Math.max(0, mezzanineTotal - totalMezzanineOccupied);
      const mezzanineUtilization = mezzanineTotal > 0 ? (totalMezzanineOccupied / mezzanineTotal) * 100 : 0;

      console.log('\nMezzanine Calculation:');
      console.log(`  Total Space: ${mezzanineTotal}m²`);
      console.log(`  Occupied Space: ${totalMezzanineOccupied}m²`);
      console.log(`  Available Space: ${mezzanineAvailable}m²`);
      console.log(`  Utilization: ${mezzanineUtilization.toFixed(1)}%`);
    }

    // 5. Test the function if it exists
    console.log('\n5. Testing availability function...');
    try {
      const { data: funcData, error: funcError } = await supabase
        .rpc('calculate_warehouse_availability_for_user', {
          warehouse_uuid: warehouseId,
          space_type_param: 'Ground Floor'
        });

      if (funcError) {
        console.log('❌ Function call failed:', funcError.message);
      } else {
        console.log('✅ Function call successful:', funcData);
      }
    } catch (error) {
      console.log('❌ Function call exception:', error.message);
    }

  } catch (error) {
    console.error('❌ Error during data check:', error);
  }
}

checkBookingData();
