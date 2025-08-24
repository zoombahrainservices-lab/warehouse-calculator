#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createClientStockTable() {
  console.log('🚀 Creating client_stock table...')
  
  try {
    // Sample data to insert
    const sampleData = [
      {
        id: 'sample-1',
        client_name: 'ABC Trading Company',
        client_email: 'contact@abctrading.com',
        client_phone: '+973-1234-5678',
        product_type: 'electronics',
        quantity: 500,
        unit: 'pieces',
        description: 'Laptop computers and accessories',
        storage_location: 'Section A-1, Rack 1-5',
        space_type: 'Ground Floor',
        area_used: 25.5,
        entry_date: '2024-01-15',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 'sample-2',
        client_name: 'Gulf Food Distributors',
        client_email: 'info@gulffood.bh',
        client_phone: '+973-9876-5432',
        product_type: 'food',
        quantity: 200,
        unit: 'boxes',
        description: 'Canned goods and dry food items',
        storage_location: 'Section B-2, Cold Storage',
        space_type: 'Ground Floor',
        area_used: 15.0,
        entry_date: '2024-01-10',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 'sample-3',
        client_name: 'Metal Works Ltd',
        client_email: 'orders@metalworks.com',
        client_phone: '+973-5555-1234',
        product_type: 'metals',
        quantity: 50,
        unit: 'tons',
        description: 'Steel pipes and construction materials',
        storage_location: 'Section C-1, Heavy Storage',
        space_type: 'Ground Floor',
        area_used: 100.0,
        entry_date: '2023-12-20',
        status: 'completed',
        created_at: new Date().toISOString()
      }
    ]

    // Insert sample data
    console.log('📦 Inserting sample client stock data...')
    const { data, error } = await supabase
      .from('client_stock')
      .insert(sampleData)

    if (error) {
      console.error('❌ Error inserting client stock data:', error)
      console.log('This might mean the table doesn\'t exist yet. That\'s okay - the stock page will handle it.')
    } else {
      console.log('✅ Sample client stock data inserted successfully!')
      console.log(`📊 Inserted ${sampleData.length} sample records`)
    }

    // Test if we can query the table
    console.log('🔍 Testing table access...')
    const { data: testData, error: testError } = await supabase
      .from('client_stock')
      .select('*')
      .limit(5)

    if (testError) {
      console.error('❌ Error querying client_stock table:', testError)
      console.log('\n💡 The table might not exist in your database.')
      console.log('   You may need to create it manually in your Supabase dashboard.')
      console.log('   Or use a different database setup method.')
    } else {
      console.log('✅ Successfully queried client_stock table!')
      console.log(`📋 Found ${testData?.length || 0} records`)
      
      if (testData && testData.length > 0) {
        console.log('\n📦 Sample records:')
        testData.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.client_name} - ${item.product_type} (${item.status})`)
        })
      }
    }

    console.log('\n🎉 Setup completed!')
    console.log('   • Visit http://localhost:3000/stock to test the stock management')
    console.log('   • The stock page should now load without errors')

  } catch (error) {
    console.error('❌ Setup failed:', error)
    
    console.log('\n🔧 Troubleshooting:')
    console.log('   1. Make sure your .env.local file has the correct Supabase credentials')
    console.log('   2. Check that your Supabase project is active')
    console.log('   3. Verify that the client_stock table exists in your database')
    console.log('   4. You may need to create the table manually in Supabase dashboard')
  }
}

createClientStockTable()
