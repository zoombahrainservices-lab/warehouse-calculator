#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

console.log('🔍 Testing Supabase Connection...')
console.log('=====================================')

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('📋 Environment Check:')
console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ Found' : '❌ Missing'}`)
console.log(`   SERVICE_KEY: ${supabaseKey ? '✅ Found' : '❌ Missing'}`)

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ Environment variables missing!')
  console.log('Please check your .env.local file has:')
  console.log('   NEXT_PUBLIC_SUPABASE_URL=your_url_here')
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_key_here')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('\n🔌 Testing database connection...')
    
    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5)
    
    if (connectionError) {
      console.log('❌ Connection failed:', connectionError.message)
      return false
    }
    
    console.log('✅ Database connection successful!')
    console.log(`📊 Found ${connectionTest?.length || 0} public tables`)
    
    // List existing tables
    if (connectionTest && connectionTest.length > 0) {
      console.log('\n📋 Existing tables:')
      connectionTest.forEach(table => {
        console.log(`   • ${table.table_name}`)
      })
    }
    
    // Test for stock tables specifically
    console.log('\n🔍 Checking for stock tables...')
    const stockTables = ['client_stock', 'stock_data', 'stock_items']
    
    for (const tableName of stockTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count(*)')
          .limit(0)
        
        if (error) {
          console.log(`   ❌ ${tableName}: ${error.message}`)
        } else {
          console.log(`   ✅ ${tableName}: Table exists and accessible`)
          
          // Get record count
          const { count } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })
          
          console.log(`      📊 Records: ${count || 0}`)
          return true // Found a working table
        }
      } catch (err) {
        console.log(`   ❌ ${tableName}: ${err.message}`)
      }
    }
    
    console.log('\n💡 No stock tables found. You need to create one.')
    return false
    
  } catch (error) {
    console.log('❌ Connection test failed:', error.message)
    return false
  }
}

async function createTableInstructions() {
  console.log('\n🔧 SOLUTION: Create the Stock Table')
  console.log('=====================================')
  console.log('1. Go to your Supabase Dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Copy the contents of CREATE_STOCK_TABLE.sql')
  console.log('4. Paste and run the SQL script')
  console.log('5. Refresh your stock management page')
  
  console.log('\n📁 File location:')
  console.log('   CREATE_STOCK_TABLE.sql (in your project root)')
  
  console.log('\n🚀 After creating the table:')
  console.log('   • Visit http://localhost:3000/stock')
  console.log('   • The error should be resolved')
  console.log('   • You should see 5 sample stock items')
}

async function main() {
  const hasWorkingTable = await testConnection()
  
  if (!hasWorkingTable) {
    await createTableInstructions()
  } else {
    console.log('\n🎉 Everything looks good!')
    console.log('   Your stock management should work now.')
    console.log('   Visit: http://localhost:3000/stock')
  }
}

main().catch(console.error)
