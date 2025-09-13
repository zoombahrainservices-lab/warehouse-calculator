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

async function addQuantityColumns() {
  console.log('🔄 Adding quantity tracking columns...')

  try {
    // Add columns one by one to avoid conflicts
    const columns = [
      'current_quantity INTEGER DEFAULT 0',
      'total_received_quantity INTEGER DEFAULT 0', 
      'total_delivered_quantity INTEGER DEFAULT 0',
      'initial_quantity INTEGER DEFAULT 0'
    ]

    for (const column of columns) {
      const columnName = column.split(' ')[0]
      console.log(`📋 Adding column: ${columnName}`)
      
      try {
        // Try to add the column
        const { error } = await supabase.rpc('exec_sql', { 
          sql: `ALTER TABLE client_stock ADD COLUMN ${column};` 
        })
        
        if (error) {
          console.log(`ℹ️  Column ${columnName} might already exist: ${error.message}`)
        } else {
          console.log(`✅ Added column: ${columnName}`)
        }
      } catch (err) {
        console.log(`ℹ️  Column ${columnName} might already exist`)
      }
    }

    // Create stock_movements table
    console.log('📋 Creating stock_movements table...')
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
    `

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: createMovementsTableSQL })
      if (error) {
        console.log('ℹ️  Movements table might already exist')
      } else {
        console.log('✅ Created stock_movements table')
      }
    } catch (err) {
      console.log('ℹ️  Movements table might already exist')
    }

    // Create indexes
    console.log('📋 Creating indexes...')
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_id ON stock_movements(stock_id);',
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);',
      'CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_date ON stock_movements(movement_date);'
    ]

    for (const index of indexes) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: index })
        if (error) {
          console.log(`ℹ️  Index might already exist: ${error.message}`)
        } else {
          console.log('✅ Created index')
        }
      } catch (err) {
        console.log('ℹ️  Index might already exist')
      }
    }

    console.log('🎉 Database schema update completed!')
    console.log('\n💡 Next steps:')
    console.log('1. Run the update script again to populate the new columns')
    console.log('2. Restart your application')
    console.log('3. Check the stock management page')

  } catch (error) {
    console.error('❌ Error during schema update:', error)
  }
}

// Run the update
addQuantityColumns()

