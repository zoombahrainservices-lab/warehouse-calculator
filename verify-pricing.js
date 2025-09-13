#!/usr/bin/env node

/**
 * Verify Calculator Pricing Script
 * Shows the current pricing data to verify the fix worked
 */

const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyPricing() {
  console.log('🔍 Verifying Calculator Pricing Data...\n')

  try {
    // Get space types first
    const { data: spaceTypes, error: spaceTypeError } = await supabase
      .from('space_types')
      .select('id, name')
      .eq('active', true)

    if (spaceTypeError) {
      console.error('❌ Error getting space types:', spaceTypeError.message)
      return
    }

    const groundFloorId = spaceTypes?.find(st => st.name === 'Ground Floor')?.id
    const mezzanineId = spaceTypes?.find(st => st.name === 'Mezzanine')?.id

    // Get all active pricing rates
    const { data: pricingRates, error: pricingError } = await supabase
      .from('pricing_rates')
      .select('*')
      .eq('active', true)
      .order('space_type_id, area_band_min, tenure')

    if (pricingError) {
      console.error('❌ Error getting pricing rates:', pricingError.message)
      return
    }

    // Get system settings
    const { data: systemSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')

    // Get EWA settings
    const { data: ewaSettings, error: ewaError } = await supabase
      .from('ewa_settings')
      .select('*')
      .limit(1)
      .single()

    console.log('📊 CURRENT PRICING DATA VERIFICATION')
    console.log('='.repeat(60))

    // Show pricing rates by space type
    console.log('\n🏢 GROUND FLOOR PRICING RATES:')
    console.log('-'.repeat(40))

    const groundFloorRates = pricingRates?.filter(r => r.space_type_id === groundFloorId) || []
    displayPricingRates(groundFloorRates, 'Ground Floor')

    console.log('\n🏢 MEZZANINE PRICING RATES:')
    console.log('-'.repeat(40))

    const mezzanineRates = pricingRates?.filter(r => r.space_type_id === mezzanineId) || []
    displayPricingRates(mezzanineRates, 'Mezzanine')

    // Show system settings
    console.log('\n⚙️  SYSTEM SETTINGS:')
    console.log('-'.repeat(40))

    const keySettings = ['office_monthly_rate', 'minimum_charge', 'days_per_month', 'vat_rate']
    keySettings.forEach(key => {
      const setting = systemSettings?.find(s => s.setting_key === key)
      if (setting) {
        console.log(`   ${key}: ${setting.setting_value} ${key.includes('rate') ? '%' : 'BHD'}`)
      } else {
        console.log(`   ❌ ${key}: MISSING`)
      }
    })

    // Show EWA settings
    console.log('\n⚡ EWA SETTINGS:')
    console.log('-'.repeat(40))

    if (ewaSettings && !ewaError) {
      console.log(`   Government Tariff: ${ewaSettings.government_tariff_per_kwh} BHD/kWh`)
      console.log(`   Fixed Monthly Charges: ${ewaSettings.estimated_fixed_monthly_charges} BHD`)
      console.log(`   Setup Deposit: ${ewaSettings.estimated_setup_deposit} BHD`)
      console.log(`   Installation Fee: ${ewaSettings.estimated_installation_fee} BHD`)
    } else {
      console.log('   ❌ EWA settings missing or error:', ewaError?.message)
    }

    // Summary
    console.log('\n📈 SUMMARY:')
    console.log('-'.repeat(40))
    console.log(`   Total Active Pricing Rates: ${pricingRates?.length || 0}`)
    console.log(`   Ground Floor Rates: ${groundFloorRates.length}`)
    console.log(`   Mezzanine Rates: ${mezzanineRates.length}`)
    console.log(`   Very Short Term Rates: ${pricingRates?.filter(r => r.tenure === 'Very Short').length || 0}`)
    console.log(`   System Settings: ${systemSettings?.length || 0}`)
    console.log(`   Space Types: ${spaceTypes?.length || 0}`)

    // Check for common issues
    console.log('\n🔍 ISSUE CHECK:')
    console.log('-'.repeat(40))

    const issues = []

    if (!pricingRates || pricingRates.length === 0) {
      issues.push('❌ No pricing rates found')
    }

    if (groundFloorRates.length === 0) {
      issues.push('❌ No Ground Floor pricing rates')
    }

    if (mezzanineRates.length === 0) {
      issues.push('❌ No Mezzanine pricing rates')
    }

    if (pricingRates?.filter(r => r.tenure === 'Very Short').length === 0) {
      issues.push('❌ No Very Short term pricing rates')
    }

    if (!ewaSettings || ewaError) {
      issues.push('❌ EWA settings missing')
    }

    const missingSettings = keySettings.filter(key =>
      !systemSettings?.find(s => s.setting_key === key)
    )
    if (missingSettings.length > 0) {
      issues.push(`❌ Missing system settings: ${missingSettings.join(', ')}`)
    }

    if (issues.length === 0) {
      console.log('   ✅ No issues found!')
      console.log('\n🎉 Calculator pricing appears to be correctly configured!')
    } else {
      issues.forEach(issue => console.log(`   ${issue}`))
      console.log('\n🔧 Run the pricing fix script:')
      console.log('   node fix-calculator-pricing.js')
    }

  } catch (error) {
    console.error('❌ Error verifying pricing:', error)
  }
}

function displayPricingRates(rates, spaceType) {
  if (rates.length === 0) {
    console.log(`   ❌ No ${spaceType} pricing rates found`)
    return
  }

  // Group by tenure
  const tenures = ['Short', 'Long', 'Very Short']

  tenures.forEach(tenure => {
    const tenureRates = rates.filter(r => r.tenure === tenure)
    if (tenureRates.length > 0) {
      console.log(`\n   📅 ${tenure} Term:`)

      tenureRates.forEach(rate => {
        const areaRange = rate.area_band_max
          ? `${rate.area_band_min}-${rate.area_band_max} m²`
          : `${rate.area_band_min}+ m²`

        console.log(`      ${rate.area_band_name}: ${rate.monthly_rate_per_sqm} BHD/m²/month (${rate.daily_rate_per_sqm} BHD/m²/day)`)
        console.log(`         Area: ${areaRange}, Min: ${rate.min_chargeable_area} m², Package: ${rate.package_starting_bhd} BHD`)
      })
    }
  })

  console.log(`\n   📊 Total ${spaceType} Rates: ${rates.length}`)
}

// Run the verification
verifyPricing().catch(error => {
  console.error('❌ Verification failed:', error)
  process.exit(1)
})
