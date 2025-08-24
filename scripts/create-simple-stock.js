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

async function createSimpleStockTable() {
  console.log('🚀 Creating simple stock table for testing...')
  
  try {
    // Create sample data that matches the StockItem interface from the stock page
    const sampleData = [
      {
        id: 'stock-sample-1',
        client_name: 'Ahmed Al-Mahmoud',
        client_email: 'ahmed@techimports.bh',
        client_phone: '+973-1234-5678',
        product_type: 'electronics',
        quantity: 250,
        unit: 'pieces',
        description: 'Dell Latitude 5520 Business Laptops - Brand New',
        storage_location: 'Section A-1, Rack 1-5',
        space_type: 'Ground Floor',
        area_used: 25.5,
        entry_date: '2024-01-15',
        expected_exit_date: '2024-06-15',
        status: 'active',
        notes: 'Temperature sensitive - keep below 35°C',
        created_at: new Date().toISOString()
      },
      {
        id: 'stock-sample-2',
        client_name: 'Gulf Food Distributors',
        client_email: 'info@gulffood.bh',
        client_phone: '+973-9876-5432',
        product_type: 'food',
        quantity: 500,
        unit: 'boxes',
        description: 'Organic Canned Tomatoes - Various Brands',
        storage_location: 'Section B-2, Cold Storage',
        space_type: 'Ground Floor',
        area_used: 15.0,
        entry_date: '2024-01-10',
        expected_exit_date: '2024-07-10',
        status: 'active',
        notes: 'Temperature controlled storage required',
        created_at: new Date().toISOString()
      },
      {
        id: 'stock-sample-3',
        client_name: 'Bahrain Steel Works',
        client_email: 'orders@steelworks.bh',
        client_phone: '+973-5555-1234',
        product_type: 'metals',
        quantity: 100,
        unit: 'pieces',
        description: 'Galvanized Steel Pipes - Various Diameters',
        storage_location: 'Section C-1, Heavy Storage',
        space_type: 'Ground Floor',
        area_used: 100.0,
        entry_date: '2023-12-20',
        expected_exit_date: '2024-03-20',
        status: 'completed',
        notes: 'Heavy items - crane required for handling',
        created_at: new Date().toISOString()
      }
    ]

    // Try to insert into client_stock table (this will create it if it doesn't exist in some DB systems)
    console.log('📦 Attempting to create sample stock data...')
    
    // First, let's see what tables exist
    console.log('🔍 Checking available tables...')
    
    // Try different table names
    const tableNames = ['client_stock', 'stock_data', 'stock_items']
    let successfulTable = null
    
    for (const tableName of tableNames) {
      try {
        console.log(`   Testing table: ${tableName}`)
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)
        
        if (!error) {
          console.log(`   ✅ Table ${tableName} exists and is accessible`)
          successfulTable = tableName
          break
        } else {
          console.log(`   ❌ Table ${tableName} error: ${error.message}`)
        }
      } catch (err) {
        console.log(`   ❌ Table ${tableName} failed: ${err.message}`)
      }
    }
    
    if (successfulTable) {
      console.log(`🎯 Using table: ${successfulTable}`)
      
      // Insert sample data into the working table
      const { data, error } = await supabase
        .from(successfulTable)
        .insert(sampleData)
        .select()
      
      if (error) {
        console.error('❌ Error inserting sample data:', error)
      } else {
        console.log('✅ Sample data inserted successfully!')
        console.log(`📊 Inserted ${data?.length || 0} records`)
      }
      
    } else {
      console.log('❌ No accessible stock table found')
      console.log('\n💡 Solution options:')
      console.log('   1. Create the table manually in your Supabase dashboard')
      console.log('   2. Use the SQL editor in Supabase to run the schema files')
      console.log('   3. Check your database connection and permissions')
      
      console.log('\n📋 Manual table creation SQL:')
      console.log(`
CREATE TABLE client_stock (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  product_type TEXT NOT NULL DEFAULT 'general',
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pieces',
  description TEXT,
  storage_location TEXT,
  space_type TEXT NOT NULL DEFAULT 'Ground Floor',
  area_used REAL NOT NULL DEFAULT 0,
  entry_date TEXT NOT NULL,
  expected_exit_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
      `)
    }
    
    console.log('\n🎉 Setup attempt completed!')
    console.log('   • Try visiting http://localhost:3000/stock now')
    console.log('   • The error should be resolved or at least more informative')

  } catch (error) {
    console.error('❌ Setup failed:', error)
    
    console.log('\n🔧 Troubleshooting steps:')
    console.log('   1. Check your .env.local file has correct Supabase credentials')
    console.log('   2. Verify your Supabase project is active and accessible')
    console.log('   3. Check the Supabase dashboard for existing tables')
    console.log('   4. Try creating the table manually using the SQL editor')
  }
}

createSimpleStockTable()
