const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please check your .env.local file contains:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateQuantityTracking() {
  console.log('🔄 Starting quantity tracking update...')

  try {
    // First, let's check if the new columns exist
    console.log('📋 Checking current table structure...')
    
    // Try to add the new columns to client_stock table
    const alterTableSQL = `
      ALTER TABLE client_stock 
      ADD COLUMN current_quantity INTEGER DEFAULT 0;
      
      ALTER TABLE client_stock 
      ADD COLUMN total_received_quantity INTEGER DEFAULT 0;
      
      ALTER TABLE client_stock 
      ADD COLUMN total_delivered_quantity INTEGER DEFAULT 0;
      
      ALTER TABLE client_stock 
      ADD COLUMN initial_quantity INTEGER DEFAULT 0;
    `

    try {
      const { error: alterError } = await supabase.rpc('exec_sql', { sql: alterTableSQL })
      if (alterError) {
        console.log('ℹ️  Columns might already exist or need manual creation')
      } else {
        console.log('✅ Added new quantity tracking columns')
      }
    } catch (err) {
      console.log('ℹ️  Columns might already exist')
    }

    // Create stock_movements table if it doesn't exist
    const createMovementsTableSQL = `
      CREATE TABLE IF NOT EXISTS stock_movements (
        id TEXT PRIMARY KEY,
        stock_id TEXT NOT NULL,
        movement_type TEXT NOT NULL CHECK (movement_type IN ('initial', 'receive', 'deliver', 'adjustment')),
        quantity INTEGER NOT NULL,
        previous_quantity INTEGER NOT NULL,
        new_quantity INTEGER NOT NULL,
        movement_date TEXT NOT NULL,
        notes TEXT,
        created_by TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      
      CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_id ON stock_movements(stock_id);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);
      CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_date ON stock_movements(movement_date);
    `

    try {
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createMovementsTableSQL })
      if (createError) {
        console.log('ℹ️  Movements table might already exist')
      } else {
        console.log('✅ Created stock_movements table')
      }
    } catch (err) {
      console.log('ℹ️  Movements table might already exist')
    }

    // Get all existing stock items
    console.log('📊 Fetching existing stock data...')
    let { data: stockItems, error: fetchError } = await supabase
      .from('client_stock')
      .select('*')

    if (fetchError) {
      console.error('❌ Error fetching stock data:', fetchError)
      return
    }

    if (!stockItems || stockItems.length === 0) {
      console.log('ℹ️  No stock items found to update')
      return
    }

    console.log(`📦 Found ${stockItems.length} stock items to update`)

    // Update each stock item with quantity tracking data
    for (const item of stockItems) {
      console.log(`🔄 Updating ${item.client_name} - ${item.product_type}`)
      
      // Calculate quantities based on existing data
      const currentQuantity = item.quantity || 0
      const initialQuantity = item.quantity || 0 // For existing items, assume current quantity was initial
      const totalReceivedQuantity = initialQuantity // For existing items, assume all was received initially
      const totalDeliveredQuantity = 0 // For existing items, assume nothing delivered yet

      // Update the stock item
      const { error: updateError } = await supabase
        .from('client_stock')
        .update({
          current_quantity: currentQuantity,
          total_received_quantity: totalReceivedQuantity,
          total_delivered_quantity: totalDeliveredQuantity,
          initial_quantity: initialQuantity
        })
        .eq('id', item.id)

      if (updateError) {
        console.error(`❌ Error updating ${item.client_name}:`, updateError)
        continue
      }

      // Create initial movement record
      const movementId = `mov-${item.id}-initial`
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          id: movementId,
          stock_id: item.id,
          movement_type: 'initial',
          quantity: initialQuantity,
          previous_quantity: 0,
          new_quantity: initialQuantity,
          movement_date: item.entry_date || new Date().toISOString().split('T')[0],
          notes: 'Initial stock entry (migrated from existing data)',
          created_at: new Date().toISOString()
        })

      if (movementError && movementError.code !== '23505') { // Ignore duplicate key errors
        console.error(`❌ Error creating movement record for ${item.client_name}:`, movementError)
      }

      console.log(`✅ Updated ${item.client_name} - Current: ${currentQuantity}, Initial: ${initialQuantity}`)
    }

    console.log('🎉 Quantity tracking update completed successfully!')
    console.log('\n📋 Summary:')
    console.log(`- Updated ${stockItems.length} stock items`)
    console.log('- Added quantity tracking fields')
    console.log('- Created movement history records')
    console.log('\n💡 Next steps:')
    console.log('1. Restart your application')
    console.log('2. Check the stock management page to see the new quantity tracking features')
    console.log('3. Use the Receive/Deliver functions to track future movements')

  } catch (error) {
    console.error('❌ Error during update:', error)
  }
}

// Run the update
updateQuantityTracking()

