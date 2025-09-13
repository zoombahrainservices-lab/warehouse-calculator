require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please create a .env.local file with:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=your-project-url')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...\n')
  
  try {
    // Check if users table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (tableError) {
      console.log('❌ Users table does not exist or is not accessible')
      console.log('Error:', tableError.message)
      return
    }
    
    console.log('✅ Users table exists')
    
    // Get table structure
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'users' })
      .catch(() => {
        // Fallback: try to get sample data to infer structure
        return supabase.from('users').select('*').limit(1)
      })
    
    if (columnsError) {
      console.log('⚠️  Could not get exact column structure, trying sample data...')
      
      // Try to get sample data
      const { data: sampleData, error: sampleError } = await supabase
        .from('users')
        .select('*')
        .limit(1)
      
      if (sampleError) {
        console.log('❌ Could not access users table:', sampleError.message)
        return
      }
      
      if (sampleData && sampleData.length > 0) {
        console.log('📋 Current users table structure (inferred from sample data):')
        console.log(JSON.stringify(sampleData[0], null, 2))
      } else {
        console.log('📋 Users table exists but is empty')
      }
    } else {
      console.log('📋 Current users table structure:')
      console.log(JSON.stringify(columns, null, 2))
    }
    
    // Check for specific columns that signup needs
    console.log('\n🔍 Checking for required columns...')
    
    const { data: testUser, error: testError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single()
    
    if (testError && testError.code === 'PGRST116') {
      console.log('📋 Users table is empty, checking structure by attempting insert...')
      
      // Try to insert a test record to see what columns are available
      const testData = {
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone: '+1234567890',
        company: 'Test Company',
        password_hash: 'test123',
        is_verified: true,
        is_active: true,
        role: 'USER'
      }
      
      const { error: insertError } = await supabase
        .from('users')
        .insert([testData])
      
      if (insertError) {
        console.log('❌ Insert failed - this shows the schema mismatch:')
        console.log('Error:', insertError.message)
        console.log('\n💡 This means the signup page is trying to insert columns that don\'t exist')
      } else {
        console.log('✅ Test insert succeeded - schema appears to be compatible')
        // Clean up test data
        await supabase.from('users').delete().eq('email', 'test@example.com')
      }
    } else if (testUser) {
      console.log('📋 Sample user data:')
      console.log(JSON.stringify(testUser, null, 2))
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error.message)
  }
}

checkDatabaseSchema()
