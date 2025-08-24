#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

console.log('🔧 PERMANENT SYSTEM SETTINGS MANAGER')
console.log('====================================')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Define all required system settings dynamically
const REQUIRED_SETTINGS = [
  {
    key: 'office_monthly_rate',
    value: '200',
    description: 'Monthly rate for office space in BHD'
  },
  {
    key: 'minimum_charge',
    value: '50',
    description: 'Minimum monthly charge in BHD'
  },
  {
    key: 'days_per_month',
    value: '30',
    description: 'Days per month for calculations'
  },
  {
    key: 'office_free_threshold',
    value: '1000',
    description: 'Area threshold for free office (sqm)'
  },
  {
    key: 'default_vat_rate',
    value: '10',
    description: 'Default VAT percentage'
  },
  {
    key: 'quote_validity_days',
    value: '30',
    description: 'Number of days quotes are valid'
  },
  {
    key: 'warehouse_location',
    value: 'Building No. 22, Road 401, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain',
    description: 'Default warehouse location'
  },
  {
    key: 'company_name',
    value: 'Sitra Warehouse',
    description: 'Company name for quotes'
  },
  {
    key: 'contact_email',
    value: 'info@sitra-warehouse.com',
    description: 'Contact email'
  },
  {
    key: 'contact_phone',
    value: '+973 1234 5678',
    description: 'Contact phone number'
  }
]

// Critical settings that the calculator requires
const CALCULATOR_CRITICAL_SETTINGS = [
  'office_monthly_rate',
  'minimum_charge', 
  'days_per_month',
  'office_free_threshold'
]

async function ensureSystemSettings() {
  try {
    console.log('📋 Checking current system settings...')
    
    // Get all existing settings
    const { data: existingSettings, error: fetchError } = await supabase
      .from('system_settings')
      .select('*')
    
    if (fetchError) {
      console.error('❌ Error fetching settings:', fetchError.message)
      return false
    }
    
    console.log(`✅ Found ${existingSettings.length} existing settings`)
    
    const existingKeys = existingSettings.map(s => s.setting_key)
    const missingSettings = REQUIRED_SETTINGS.filter(setting => 
      !existingKeys.includes(setting.key)
    )
    
    console.log(`📊 Analysis:`)
    console.log(`   • Existing: ${existingKeys.length}`)
    console.log(`   • Required: ${REQUIRED_SETTINGS.length}`)
    console.log(`   • Missing: ${missingSettings.length}`)
    
    if (missingSettings.length > 0) {
      console.log('\n🔧 Inserting missing settings...')
      
      for (const setting of missingSettings) {
        console.log(`   Adding: ${setting.key} = "${setting.value}"`)
        
        const { error: insertError } = await supabase
          .from('system_settings')
          .insert({
            setting_key: setting.key,
            setting_value: setting.value,
            description: setting.description
          })
        
        if (insertError) {
          console.error(`   ❌ Failed to insert ${setting.key}:`, insertError.message)
        } else {
          console.log(`   ✅ Inserted ${setting.key}`)
        }
      }
    }
    
    // Verify critical calculator settings
    console.log('\n🎯 Verifying calculator-critical settings...')
    const { data: finalSettings, error: verifyError } = await supabase
      .from('system_settings')
      .select('*')
      .in('setting_key', CALCULATOR_CRITICAL_SETTINGS)
    
    if (verifyError) {
      console.error('❌ Error verifying settings:', verifyError.message)
      return false
    }
    
    const criticalKeys = finalSettings.map(s => s.setting_key)
    const stillMissing = CALCULATOR_CRITICAL_SETTINGS.filter(key => 
      !criticalKeys.includes(key)
    )
    
    if (stillMissing.length > 0) {
      console.log('❌ Still missing critical settings:', stillMissing)
      return false
    }
    
    console.log('✅ All calculator-critical settings present!')
    
    // Show final summary
    console.log('\n📊 FINAL STATUS:')
    finalSettings.forEach(setting => {
      console.log(`   ✅ ${setting.setting_key} = "${setting.setting_value}"`)
    })
    
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    return false
  }
}

async function testCalculatorRequirements() {
  console.log('\n🧪 Testing calculator requirements...')
  
  try {
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
    
    if (error) {
      console.error('❌ Error loading settings:', error.message)
      return false
    }
    
    // Simulate the calculator's check
    const hasRequiredSettings = CALCULATOR_CRITICAL_SETTINGS
      .every(key => settings.some(s => s.setting_key === key))
    
    if (hasRequiredSettings) {
      console.log('✅ Calculator requirements: PASSED')
      console.log('🎉 Your calculator should work now!')
      return true
    } else {
      console.log('❌ Calculator requirements: FAILED')
      const missing = CALCULATOR_CRITICAL_SETTINGS.filter(key => 
        !settings.some(s => s.setting_key === key)
      )
      console.log('   Missing:', missing)
      return false
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    return false
  }
}

async function main() {
  const settingsOk = await ensureSystemSettings()
  const testPassed = await testCalculatorRequirements()
  
  if (settingsOk && testPassed) {
    console.log('\n🎉 SUCCESS: System settings are properly configured!')
    console.log('📱 Your calculator at http://localhost:3001 should work now!')
    console.log('🔄 Refresh the page if it\'s still showing errors.')
  } else {
    console.log('\n❌ FAILED: There are still issues with system settings.')
    console.log('🔧 Check the error messages above for details.')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('💥 Fatal error:', error)
  process.exit(1)
})
