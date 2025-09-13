// Test script to check user login

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

async function testLogin() {
  console.log('🔍 Testing login for support@zoombahrain.com...')
  
  try {
    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'support@zoombahrain.com')
      .eq('is_active', true)
      .single()

    if (userError) {
      console.error('❌ Error checking user:', userError)
      return
    }

    if (!user) {
      console.log('❌ User not found!')
      return
    }

    console.log('✅ User found:')
    console.log('ID:', user.id)
    console.log('Email:', user.email)
    console.log('Name:', user.name)
    console.log('Role:', user.role)
    console.log('Active:', user.is_active)
    console.log('Password hash:', user.password_hash)
    console.log('Is verified:', user.is_verified)
    console.log('Signup method:', user.signup_method)
    console.log('Created at:', user.created_at)

    // Test password check
    const testPassword = 'support123'
    console.log('\n🔐 Testing password:', testPassword)
    
    if (user.password_hash === testPassword) {
      console.log('✅ Password matches!')
    } else {
      console.log('❌ Password does not match!')
      console.log('Expected:', testPassword)
      console.log('Found:', user.password_hash)
    }

    // Check table structure
    console.log('\n📋 Checking table structure...')
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'users' })
      .catch(() => ({ data: null, error: 'RPC not available' }))

    if (columnsError) {
      console.log('Could not get table structure via RPC, checking manually...')
      console.log('Available fields in user object:')
      Object.keys(user).forEach(key => {
        console.log(`  - ${key}: ${typeof user[key]}`)
      })
    } else {
      console.log('Table columns:', columns)
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

testLogin().catch(console.error)
