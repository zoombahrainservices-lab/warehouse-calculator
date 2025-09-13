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

async function checkDatabaseFunctions() {
  console.log('🔍 Checking database functions...\n');

  try {
    // Check if the function exists
    console.log('1. Checking if calculate_warehouse_availability_for_user function exists...\n');

    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_name', 'calculate_warehouse_availability_for_user')
      .eq('routine_type', 'FUNCTION');

    if (funcError) {
      console.log('❌ Error checking functions:', funcError);
    } else if (functions && functions.length > 0) {
      console.log('✅ Function exists:', functions[0]);
    } else {
      console.log('❌ Function does not exist in database!');
      console.log('🔧 Need to create the function...');
    }

    // Try to call the function directly
    console.log('\n2. Testing function call...\n');

    try {
      const { data: testData, error: testError } = await supabase
        .rpc('calculate_warehouse_availability_for_user', {
          warehouse_uuid: 'wh-001',
          space_type_param: 'Ground Floor'
        });

      if (testError) {
        console.log('❌ Function call failed:', testError);
        console.log('Error details:', {
          message: testError.message,
          code: testError.code,
          details: testError.details
        });
      } else {
        console.log('✅ Function call successful:', testData);
      }
    } catch (callError) {
      console.log('❌ Function call exception:', callError.message);
    }

    // Check available functions
    console.log('\n3. Listing all available functions...\n');

    const { data: allFunctions, error: allError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_type', 'FUNCTION')
      .like('routine_name', '%warehouse%')
      .limit(10);

    if (allError) {
      console.log('❌ Error listing functions:', allError);
    } else {
      console.log('Warehouse-related functions:');
      allFunctions.forEach(func => {
        console.log(`  - ${func.routine_name}`);
      });
    }

    // Check if we can run raw SQL
    console.log('\n4. Testing raw SQL execution...\n');

    const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION calculate_warehouse_availability_for_user(
        warehouse_uuid TEXT,
        space_type_param TEXT DEFAULT 'Ground Floor'
    )
    RETURNS TABLE (
        total_space DECIMAL,
        occupied_space DECIMAL,
        available_space DECIMAL,
        utilization_percentage DECIMAL
    ) AS $$
    DECLARE
        total DECIMAL := 0;
        occupied DECIMAL := 0;
    BEGIN
        -- Get total space based on space type
        IF space_type_param = 'Ground Floor' THEN
            SELECT w.total_space INTO total FROM warehouses w WHERE w.id = warehouse_uuid;
            SELECT COALESCE(SUM(wo.space_occupied), 0) INTO occupied
            FROM warehouse_occupants wo
            WHERE wo.warehouse_id = warehouse_uuid
            AND wo.floor_type = 'Ground Floor'
            AND wo.status = 'active';
        ELSE
            SELECT w.mezzanine_space INTO total FROM warehouses w WHERE w.id = warehouse_uuid;
            SELECT COALESCE(SUM(wo.space_occupied), 0) INTO occupied
            FROM warehouse_occupants wo
            WHERE wo.warehouse_id = warehouse_uuid
            AND wo.floor_type = 'Mezzanine'
            AND wo.status = 'active';
        END IF;

        -- Return availability data
        RETURN QUERY SELECT
            total,
            occupied,
            GREATEST(total - occupied, 0),
            CASE WHEN total > 0 THEN (occupied / total) * 100 ELSE 0 END;
    END;
    $$ LANGUAGE plpgsql;
    `;

    try {
      const { error: sqlError } = await supabase.rpc('exec_sql', {
        sql: createFunctionSQL
      });

      if (sqlError) {
        console.log('❌ Could not create function via SQL:', sqlError);
      } else {
        console.log('✅ Function created successfully via SQL');
      }
    } catch (sqlException) {
      console.log('❌ SQL execution failed:', sqlException.message);
      console.log('💡 This means we need to run the SQL directly in Supabase dashboard');
    }

  } catch (error) {
    console.error('❌ Error during function check:', error);
  }
}

checkDatabaseFunctions();
