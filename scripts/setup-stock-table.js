#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
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

async function createStockTable() {
  console.log('🚀 Setting up stock_data table...')
  
  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '..', 'database', 'stock-table-schema.sql')
    const sqlSchema = fs.readFileSync(schemaPath, 'utf8')
    
    // Split SQL commands (basic split on semicolon)
    const sqlCommands = sqlSchema
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
    
    console.log(`📝 Executing ${sqlCommands.length} SQL commands...`)
    
    // Execute each SQL command
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i]
      if (command.trim()) {
        console.log(`   ${i + 1}. ${command.substring(0, 50)}...`)
        
        const { error } = await supabase.rpc('exec_sql', {
          sql_query: command
        })
        
        if (error) {
          console.error(`❌ Error executing command ${i + 1}:`, error)
          // Continue with other commands
        }
      }
    }
    
    // Verify table creation by checking if we can query it
    console.log('✅ Verifying table creation...')
    const { data, error } = await supabase
      .from('stock_data')
      .select('count(*)', { count: 'exact' })
      .limit(0)
    
    if (error) {
      console.error('❌ Table verification failed:', error)
      return
    }
    
    console.log('✅ Stock table created successfully!')
    
    // Get sample data count
    const { data: sampleData, error: sampleError } = await supabase
      .from('stock_data')
      .select('*')
      .limit(10)
    
    if (!sampleError && sampleData) {
      console.log(`📦 Sample data: ${sampleData.length} stock items loaded`)
      
      if (sampleData.length > 0) {
        console.log('\n📋 Sample stock items:')
        sampleData.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.client_name} - ${item.product_name} (${item.status})`)
        })
      }
    }
    
    console.log('\n🎉 Stock table setup completed successfully!')
    console.log('\n📊 Table Features:')
    console.log('   • Complete client information tracking')
    console.log('   • Detailed product specifications')
    console.log('   • Storage location management')
    console.log('   • Financial tracking (rates, costs)')
    console.log('   • Status and condition monitoring')
    console.log('   • Automated timestamps and triggers')
    console.log('   • Performance indexes')
    console.log('   • Reporting views')
    
    console.log('\n🚀 Next steps:')
    console.log('   • Visit http://localhost:3000/stock to manage inventory')
    console.log('   • Use the Stock Management interface to add/edit items')
    console.log('   • Generate PDF reports from the stock page')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

// Alternative method using direct SQL execution if rpc doesn't work
async function createStockTableDirect() {
  console.log('🚀 Setting up stock_data table (direct method)...')
  
  try {
    // Create the main table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS stock_data (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        client_name TEXT NOT NULL,
        client_email TEXT,
        client_phone TEXT,
        client_company TEXT,
        product_name TEXT NOT NULL,
        product_type TEXT NOT NULL DEFAULT 'general',
        quantity INTEGER NOT NULL DEFAULT 0,
        unit TEXT NOT NULL DEFAULT 'pieces',
        storage_location TEXT,
        space_type TEXT NOT NULL DEFAULT 'Ground Floor',
        area_occupied_m2 REAL NOT NULL DEFAULT 0,
        entry_date TEXT NOT NULL DEFAULT (date('now')),
        expected_exit_date TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        monthly_storage_cost REAL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `
    
    console.log('📝 Creating stock_data table...')
    const { error: tableError } = await supabase.rpc('exec_sql', { sql_query: createTableSQL })
    
    if (tableError) {
      console.error('❌ Error creating table:', tableError)
      return
    }
    
    console.log('✅ Table created successfully!')
    
    // Insert sample data using Supabase client
    const sampleData = [
      {
        id: 'stock-001',
        client_name: 'Ahmed Al-Mahmoud',
        client_email: 'ahmed@techimports.bh',
        client_phone: '+973-1234-5678',
        client_company: 'Tech Imports Bahrain',
        product_name: 'Dell Laptops',
        product_type: 'electronics',
        quantity: 250,
        unit: 'pieces',
        storage_location: 'Section A-1',
        space_type: 'Ground Floor',
        area_occupied_m2: 25.5,
        entry_date: '2024-01-15',
        expected_exit_date: '2024-06-15',
        status: 'active',
        monthly_storage_cost: 89.25,
        notes: 'Temperature sensitive items'
      },
      {
        id: 'stock-002',
        client_name: 'Gulf Food Company',
        client_email: 'info@gulffood.bh',
        client_phone: '+973-9876-5432',
        client_company: 'Gulf Food Distributors',
        product_name: 'Canned Goods',
        product_type: 'food',
        quantity: 500,
        unit: 'boxes',
        storage_location: 'Section B-2',
        space_type: 'Ground Floor',
        area_occupied_m2: 15.0,
        entry_date: '2024-01-10',
        expected_exit_date: '2024-07-10',
        status: 'active',
        monthly_storage_cost: 60.00,
        notes: 'Temperature controlled storage'
      }
    ]
    
    console.log('📦 Inserting sample data...')
    const { data, error: insertError } = await supabase
      .from('stock_data')
      .insert(sampleData)
    
    if (insertError) {
      console.error('❌ Error inserting sample data:', insertError)
    } else {
      console.log('✅ Sample data inserted successfully!')
    }
    
    console.log('\n🎉 Stock table setup completed!')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

// Run the setup
async function main() {
  console.log('🗄️  Stock Table Setup for Sitra Warehouse')
  console.log('==========================================\n')
  
  // Try the RPC method first, fallback to direct method
  try {
    await createStockTable()
  } catch (error) {
    console.log('\n⚠️  RPC method failed, trying direct method...')
    await createStockTableDirect()
  }
}

main()
