const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndCreateSupportUser() {
  try {
    console.log('Checking for support user...')
    
    // Check if support user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'support@zoombahrain.com')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError)
      return
    }

    if (existingUser) {
      console.log('✅ Support user already exists:')
      console.log('Email:', existingUser.email)
      console.log('Role:', existingUser.role)
      console.log('Active:', existingUser.is_active)
      console.log('Password hash:', existingUser.password_hash)
      return
    }

    console.log('❌ Support user not found. Creating...')

    // Create support user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        google_sub: 'support_dummy_456',
        email: 'support@zoombahrain.com',
        name: 'Support User',
        role: 'SUPPORT',
        is_active: true,
        password_hash: 'support123',
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creating support user:', createError)
      return
    }

    console.log('✅ Support user created successfully:')
    console.log('Email:', newUser.email)
    console.log('Role:', newUser.role)
    console.log('Active:', newUser.is_active)

    // Also create manager user
    console.log('\nCreating manager user...')
    const { data: managerUser, error: managerError } = await supabase
      .from('users')
      .insert([{
        google_sub: 'manager_dummy_123',
        email: 'manager@zoombahrain.com',
        name: 'Manager User',
        role: 'MANAGER',
        is_active: true,
        password_hash: 'manager123',
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (managerError) {
      console.error('❌ Error creating manager user:', managerError)
    } else {
      console.log('✅ Manager user created successfully:', managerUser.email)
    }

    // Also create admin user
    console.log('\nCreating admin user...')
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .insert([{
        google_sub: 'admin_dummy_789',
        email: 'admin@zoombahrain.com',
        name: 'Admin User',
        role: 'ADMIN',
        is_active: true,
        password_hash: 'admin123',
        is_verified: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (adminError) {
      console.error('❌ Error creating admin user:', adminError)
    } else {
      console.log('✅ Admin user created successfully:', adminUser.email)
    }

    console.log('\n🎉 All dummy users created successfully!')
    console.log('\nLogin credentials:')
    console.log('Support: support@zoombahrain.com / support123')
    console.log('Manager: manager@zoombahrain.com / manager123')
    console.log('Admin: admin@zoombahrain.com / admin123')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkAndCreateSupportUser()
