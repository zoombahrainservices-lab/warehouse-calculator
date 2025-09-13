// Comprehensive script to fix password login
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

async function fixPasswordLogin() {
  console.log('🔧 Fixing password login system...')
  
  try {
    // Step 1: Check current user structure
    console.log('\n📋 Step 1: Checking current user structure...')
    
    const { data: testUser, error: testError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
      .single()

    if (testError) {
      console.error('❌ Error accessing users table:', testError.message)
      return
    }

    console.log('✅ Users table accessible')
    console.log('Available fields:', Object.keys(testUser))

    // Step 2: Update existing users with password support
    console.log('\n👥 Step 2: Updating users with password support...')
    
    const users = [
      {
        email: 'support@zoombahrain.com',
        password: 'support123',
        role: 'SUPPORT'
      },
      {
        email: 'manager@zoombahrain.com', 
        password: 'manager123',
        role: 'MANAGER'
      },
      {
        email: 'admin@zoombahrain.com',
        password: 'admin123', 
        role: 'ADMIN'
      },
      {
        email: 'user@zoombahrain.com',
        password: 'user123',
        role: 'USER'
      }
    ]

    for (const userData of users) {
      try {
        // First check if user exists
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('*')
          .eq('email', userData.email)
          .single()

        if (checkError && checkError.code !== 'PGRST116') {
          console.error(`❌ Error checking ${userData.email}:`, checkError.message)
          continue
        }

        if (existingUser) {
          // User exists, update with password
          const updateData = {
            password_hash: userData.password,
            updated_at: new Date().toISOString()
          }

          // Only add these fields if they exist in the table
          if ('is_verified' in existingUser) {
            updateData.is_verified = true
          }
          if ('signup_method' in existingUser) {
            updateData.signup_method = 'email'
          }

          const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('email', userData.email)
            .select()

          if (error) {
            console.error(`❌ Error updating ${userData.email}:`, error.message)
          } else {
            console.log(`✅ Updated ${userData.email} (${userData.role}) with password`)
          }
        } else {
          // User doesn't exist, create new user
          console.log(`⚠️ User ${userData.email} not found, creating...`)
          
          const newUserData = {
            google_sub: `${userData.role.toLowerCase()}_dummy_${Date.now()}`,
            email: userData.email,
            name: `${userData.role} User`,
            role: userData.role,
            is_active: true,
            password_hash: userData.password,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          // Only add these fields if they exist in the table
          if ('is_verified' in testUser) {
            newUserData.is_verified = true
          }
          if ('signup_method' in testUser) {
            newUserData.signup_method = 'email'
          }

          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([newUserData])
            .select()

          if (createError) {
            console.error(`❌ Error creating ${userData.email}:`, createError.message)
          } else {
            console.log(`✅ Created ${userData.email} (${userData.role})`)
          }
        }
      } catch (err) {
        console.error(`❌ Error with ${userData.email}:`, err.message)
      }
    }

    // Step 3: Verify all users are ready
    console.log('\n🔍 Step 3: Verifying all users...')
    
    for (const userData of users) {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', userData.email)
        .single()

      if (error || !user) {
        console.log(`❌ ${userData.email}: User not found or error`)
      } else {
        console.log(`✅ ${userData.email}:`)
        console.log(`   Role: ${user.role}`)
        console.log(`   Active: ${user.is_active}`)
        console.log(`   Password: ${user.password_hash ? '✅ Set' : '❌ Missing'}`)
        if ('is_verified' in user) {
          console.log(`   Verified: ${user.is_verified ? '✅ Yes' : '❌ No'}`)
        }
        if ('signup_method' in user) {
          console.log(`   Method: ${user.signup_method || 'Not set'}`)
        }
      }
    }

    console.log('\n🎉 Password login system setup complete!')
    console.log('\n📝 Login credentials:')
    console.log('Support: support@zoombahrain.com / support123')
    console.log('Manager: manager@zoombahrain.com / manager123')
    console.log('Admin: admin@zoombahrain.com / admin123')
    console.log('User: user@zoombahrain.com / user123')
    
    console.log('\n💡 You can now login with email/password for all 4 roles!')
    console.log('\n⚠️ If you still get "Invalid email or password", you may need to:')
    console.log('1. Run the ADD_PASSWORD_SUPPORT.sql script in Supabase dashboard')
    console.log('2. Or manually add password_hash column to your users table')

  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

fixPasswordLogin().catch(console.error)
