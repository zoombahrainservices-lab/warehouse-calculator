// Quick script to create dummy users
// Run this after setting up your .env.local file

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!')
  console.log('Please create a .env.local file with your Supabase credentials:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createDummyUsers() {
  console.log('🚀 Creating dummy users...')
  
  const users = [
    {
      google_sub: 'support_dummy_456',
      email: 'support@zoombahrain.com',
      name: 'Support User',
      role: 'SUPPORT',
      is_active: true,
      password_hash: 'support123',
      is_verified: true
    },
    {
      google_sub: 'manager_dummy_123',
      email: 'manager@zoombahrain.com',
      name: 'Manager User',
      role: 'MANAGER',
      is_active: true,
      password_hash: 'manager123',
      is_verified: true
    },
    {
      google_sub: 'admin_dummy_789',
      email: 'admin@zoombahrain.com',
      name: 'Admin User',
      role: 'ADMIN',
      is_active: true,
      password_hash: 'admin123',
      is_verified: true
    }
  ]

  for (const user of users) {
    try {
      // Check if user exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single()

      if (existing) {
        console.log(`✅ ${user.email} already exists`)
        continue
      }

      // Create user
      const { data, error } = await supabase
        .from('users')
        .insert([{
          ...user,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()

      if (error) {
        console.error(`❌ Error creating ${user.email}:`, error.message)
      } else {
        console.log(`✅ Created ${user.email} (${user.role})`)
      }
    } catch (err) {
      console.error(`❌ Error with ${user.email}:`, err.message)
    }
  }

  console.log('\n🎉 Dummy users setup complete!')
  console.log('\nLogin credentials:')
  console.log('Support: support@zoombahrain.com / support123')
  console.log('Manager: manager@zoombahrain.com / manager123')
  console.log('Admin: admin@zoombahrain.com / admin123')
}

createDummyUsers().catch(console.error)
