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

async function populateWarehouseData() {
  console.log('🏭 Populating warehouse data...\n');

  try {
    // 1. Check current warehouses
    const { data: existingWarehouses, error: wError } = await supabase
      .from('warehouses')
      .select('*');

    if (wError) {
      console.log('❌ Error checking warehouses:', wError);
      return;
    }

    if (!existingWarehouses || existingWarehouses.length === 0) {
      console.log('📦 No warehouses found, creating sample data...');

      // Insert sample warehouses
      const { error: insertWError } = await supabase
        .from('warehouses')
        .insert([
          {
            id: 'wh-001',
            name: 'Sitra Main Warehouse',
            location: 'Building No. 22, Road 401, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain',
            total_space: 8000,
            occupied_space: 0,
            has_mezzanine: true,
            mezzanine_space: 3000,
            mezzanine_occupied: 0,
            status: 'active'
          },
          {
            id: 'wh-002',
            name: 'Sitra Annex Warehouse',
            location: 'Building No. 25, Road 402, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain',
            total_space: 5000,
            occupied_space: 0,
            has_mezzanine: false,
            mezzanine_space: 0,
            mezzanine_occupied: 0,
            status: 'active'
          },
          {
            id: 'wh-003',
            name: 'Sitra Cold Storage',
            location: 'Building No. 30, Road 405, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain',
            total_space: 3000,
            occupied_space: 0,
            has_mezzanine: false,
            mezzanine_space: 0,
            mezzanine_occupied: 0,
            status: 'active'
          }
        ]);

      if (insertWError) {
        console.log('❌ Error inserting warehouses:', insertWError);
        return;
      }

      console.log('✅ Sample warehouses created');
    } else {
      console.log(`✅ Found ${existingWarehouses.length} existing warehouses`);

      // Update existing warehouses with mezzanine data
      for (const warehouse of existingWarehouses) {
        const updateData = {
          has_mezzanine: warehouse.id === 'wh-001', // Only main warehouse has mezzanine
          mezzanine_space: warehouse.id === 'wh-001' ? 3000 : 0,
          mezzanine_occupied: 0
        };

        const { error: updateError } = await supabase
          .from('warehouses')
          .update(updateData)
          .eq('id', warehouse.id);

        if (updateError) {
          console.log(`❌ Error updating warehouse ${warehouse.id}:`, updateError);
        } else {
          console.log(`✅ Updated warehouse ${warehouse.name}`);
        }
      }
    }

    // 2. Check current occupants
    const { data: existingOccupants, error: oError } = await supabase
      .from('warehouse_occupants')
      .select('*');

    if (oError) {
      console.log('❌ Error checking occupants:', oError);
      return;
    }

    if (!existingOccupants || existingOccupants.length === 0) {
      console.log('👥 No occupants found, creating sample data...');

      // Get admin user ID for assigning to occupants
      const { data: adminUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .ilike('email', '%admin%')
        .single();

      const userId = adminUser?.id || null;

      // Insert sample occupants
      const { error: insertOError } = await supabase
        .from('warehouse_occupants')
        .insert([
          {
            id: 'occ-001',
            warehouse_id: 'wh-001',
            user_id: userId,
            name: 'ABC Company',
            contact_info: 'abc@email.com | +973 1234 5678',
            space_occupied: 1500,
            floor_type: 'Ground Floor',
            entry_date: '2025-01-15',
            expected_exit_date: '2025-12-31',
            status: 'active',
            booking_status: 'active',
            booking_id: 'booking-001'
          },
          {
            id: 'occ-002',
            warehouse_id: 'wh-001',
            user_id: userId,
            name: 'XYZ Trading',
            contact_info: 'xyz@email.com | +973 2345 6789',
            space_occupied: 2200,
            floor_type: 'Ground Floor',
            entry_date: '2025-02-01',
            expected_exit_date: '2025-11-30',
            status: 'active',
            booking_status: 'active',
            booking_id: 'booking-002'
          },
          {
            id: 'occ-003',
            warehouse_id: 'wh-002',
            user_id: userId,
            name: 'DEF Logistics',
            contact_info: 'def@email.com | +973 3456 7890',
            space_occupied: 1800,
            floor_type: 'Ground Floor',
            entry_date: '2025-01-20',
            expected_exit_date: '2025-10-31',
            status: 'active',
            booking_status: 'active',
            booking_id: 'booking-003'
          },
          {
            id: 'occ-004',
            warehouse_id: 'wh-003',
            user_id: userId,
            name: 'GHI Foods',
            contact_info: 'ghi@email.com | +973 4567 8901',
            space_occupied: 1200,
            floor_type: 'Ground Floor',
            entry_date: '2025-03-01',
            expected_exit_date: '2025-09-30',
            status: 'active',
            booking_status: 'active',
            booking_id: 'booking-004'
          },
          {
            id: 'occ-005',
            warehouse_id: 'wh-001',
            user_id: userId,
            name: 'JKL Manufacturing',
            contact_info: 'jkl@email.com | +973 5678 9012',
            space_occupied: 800,
            floor_type: 'Mezzanine',
            entry_date: '2025-02-15',
            expected_exit_date: '2025-08-15',
            status: 'active',
            booking_status: 'active',
            booking_id: 'booking-005'
          }
        ]);

      if (insertOError) {
        console.log('❌ Error inserting occupants:', insertOError);
        return;
      }

      console.log('✅ Sample occupants created');
    } else {
      console.log(`✅ Found ${existingOccupants.length} existing occupants`);

      // Update existing occupants with proper floor_type if missing
      for (const occupant of existingOccupants) {
        if (!occupant.floor_type) {
          const updateData = {
            floor_type: occupant.warehouse_id === 'wh-001' && Math.random() > 0.7 ? 'Mezzanine' : 'Ground Floor',
            booking_status: 'active',
            booking_id: occupant.booking_id || `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          };

          const { error: updateError } = await supabase
            .from('warehouse_occupants')
            .update(updateData)
            .eq('id', occupant.id);

          if (updateError) {
            console.log(`❌ Error updating occupant ${occupant.id}:`, updateError);
          } else {
            console.log(`✅ Updated occupant ${occupant.name}`);
          }
        }
      }
    }

    // 3. Recalculate warehouse occupancy
    console.log('\n🔄 Recalculating warehouse occupancy...');

    const { data: allWarehouses, error: allWError } = await supabase
      .from('warehouses')
      .select('*');

    if (!allWError && allWarehouses) {
      for (const warehouse of allWarehouses) {
        // Calculate ground floor occupancy
        const { data: groundOccupants, error: gError } = await supabase
          .from('warehouse_occupants')
          .select('space_occupied')
          .eq('warehouse_id', warehouse.id)
          .eq('floor_type', 'Ground Floor')
          .eq('status', 'active');

        const groundOccupied = groundOccupants?.reduce((sum, occ) => sum + (occ.space_occupied || 0), 0) || 0;

        // Calculate mezzanine occupancy
        const { data: mezzanineOccupants, error: mError } = await supabase
          .from('warehouse_occupants')
          .select('space_occupied')
          .eq('warehouse_id', warehouse.id)
          .eq('floor_type', 'Mezzanine')
          .eq('status', 'active');

        const mezzanineOccupied = mezzanineOccupants?.reduce((sum, occ) => sum + (occ.space_occupied || 0), 0) || 0;

        // Update warehouse
        const { error: updateWError } = await supabase
          .from('warehouses')
          .update({
            occupied_space: groundOccupied,
            mezzanine_occupied: mezzanineOccupied
          })
          .eq('id', warehouse.id);

        if (updateWError) {
          console.log(`❌ Error updating warehouse ${warehouse.id} occupancy:`, updateWError);
        } else {
          console.log(`✅ Updated ${warehouse.name}: Ground=${groundOccupied}m², Mezzanine=${mezzanineOccupied}m²`);
        }
      }
    }

    // 4. Final verification
    console.log('\n📊 Final warehouse status:');
    const { data: finalWarehouses, error: finalError } = await supabase
      .from('warehouses')
      .select('*');

    if (!finalError && finalWarehouses) {
      finalWarehouses.forEach(w => {
        const totalSpace = (w.total_space || 0) + (w.mezzanine_space || 0);
        const totalOccupied = (w.occupied_space || 0) + (w.mezzanine_occupied || 0);
        const totalFree = totalSpace - totalOccupied;
        const utilization = totalSpace > 0 ? ((totalOccupied / totalSpace) * 100).toFixed(1) : '0.0';

        console.log(`${w.name}:`);
        console.log(`  Total: ${totalSpace}m² | Occupied: ${totalOccupied}m² | Free: ${totalFree}m² | Utilization: ${utilization}%`);
        if (w.has_mezzanine) {
          console.log(`  Ground: ${(w.total_space || 0) - (w.occupied_space || 0)}m² free | Mezzanine: ${(w.mezzanine_space || 0) - (w.mezzanine_occupied || 0)}m² free`);
        } else {
          console.log(`  Ground: ${(w.total_space || 0) - (w.occupied_space || 0)}m² free`);
        }
        console.log('');
      });
    }

    console.log('✅ Warehouse data population completed!');

  } catch (error) {
    console.error('❌ Error populating warehouse data:', error);
  }
}

populateWarehouseData();
