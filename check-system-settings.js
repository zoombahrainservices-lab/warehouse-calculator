#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSystemSettings() {
  console.log('🔍 REVERSE ENGINEERING THE ISSUE...')
  console.log('=====================================')
  
  console.log('📋 From your console logs:')
  console.log('   ✅ EWA settings: Found')
  console.log('   ✅ Optional services: 6 found')
  console.log('   ✅ System settings: 7 found')
  console.log('   ❌ ERROR: "Missing required system settings"')
  
  console.log('\n🔍 The issue is in SitraCalculator.tsx line 56-57:')
  console.log('   Required keys: office_monthly_rate, minimum_charge, days_per_month, office_free_threshold')
  
  // Check what system settings actually exist
  try {
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
    
    if (error) {
      console.log('❌ Error loading system_settings:', error.message)
      return
    }
    
    console.log(`\n📊 Found ${settings.length} system settings:`)
    settings.forEach(setting => {
      console.log(`   • ${setting.setting_key} = "${setting.setting_value}"`)
    })
    
    // Check which required keys are missing
    const requiredKeys = ['office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold']
    const existingKeys = settings.map(s => s.setting_key)
    
    console.log('\n🔍 REQUIRED vs ACTUAL:')
    requiredKeys.forEach(key => {
      const exists = existingKeys.includes(key)
      console.log(`   ${exists ? '✅' : '❌'} ${key} ${exists ? '(found)' : '(MISSING!)'}`)
    })
    
    const missingKeys = requiredKeys.filter(key => !existingKeys.includes(key))
    
    if (missingKeys.length > 0) {
      console.log(`\n🎯 ROOT CAUSE: Missing ${missingKeys.length} required system settings:`)
      missingKeys.forEach(key => console.log(`   ❌ ${key}`))
      
      console.log('\n🔧 SOLUTION: Insert missing system settings:')
      console.log(`
INSERT INTO system_settings (id, setting_key, setting_value, description) VALUES`)
      
      const inserts = []
      if (!existingKeys.includes('office_monthly_rate')) {
        inserts.push(`('office-monthly-rate', 'office_monthly_rate', '200', 'Monthly rate for office space in BHD')`)
      }
      if (!existingKeys.includes('minimum_charge')) {
        inserts.push(`('minimum-charge', 'minimum_charge', '50', 'Minimum monthly charge in BHD')`)
      }
      if (!existingKeys.includes('days_per_month')) {
        inserts.push(`('days-per-month', 'days_per_month', '30', 'Days per month for calculations')`)
      }
      if (!existingKeys.includes('office_free_threshold')) {
        inserts.push(`('office-free-threshold', 'office_free_threshold', '1000', 'Area threshold for free office (sqm)')`)
      }
      
      console.log(inserts.join(',\n'))
      console.log(';')
      
    } else {
      console.log('\n✅ All required system settings exist!')
      console.log('🤔 The issue might be elsewhere...')
    }
    
  } catch (err) {
    console.log('❌ Error:', err.message)
  }
}

checkSystemSettings().catch(console.error)
