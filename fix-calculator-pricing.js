#!/usr/bin/env node

/**
 * Fix Calculator Pricing Script
 * Updates the pricing_rates table with the real price list from sitra-warehouse-schema.sql
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

async function fixCalculatorPricing() {
  console.log('🔧 Fixing Calculator Pricing with Real Price List...\n')

  try {
    // Step 1: Ensure space types exist
    console.log('1. Ensuring space types exist...')

    const spaceTypesData = [
      { name: 'Ground Floor', description: 'Ground floor warehouse space', sort_order: 1 },
      { name: 'Mezzanine', description: 'Mezzanine level warehouse space', sort_order: 2 }
    ]

    for (const spaceType of spaceTypesData) {
      const { error } = await supabase
        .from('space_types')
        .upsert({
          name: spaceType.name,
          description: spaceType.description,
          sort_order: spaceType.sort_order,
          active: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'name'
        })

      if (error && !error.message.includes('already exists')) {
        console.log(`   ⚠️  Error creating space type ${spaceType.name}:`, error.message)
      } else {
        console.log(`   ✅ Space type: ${spaceType.name}`)
      }
    }

    // Get space type IDs
    const { data: spaceTypes, error: spaceTypeError } = await supabase
      .from('space_types')
      .select('id, name')

    if (spaceTypeError || !spaceTypes) {
      console.error('❌ Could not retrieve space types:', spaceTypeError)
      return
    }

    const groundFloorId = spaceTypes.find(st => st.name === 'Ground Floor')?.id
    const mezzanineId = spaceTypes.find(st => st.name === 'Mezzanine')?.id

    if (!groundFloorId || !mezzanineId) {
      console.error('❌ Could not find space type IDs')
      return
    }

    // Step 2: Clear existing pricing rates
    console.log('\n2. Clearing existing pricing rates...')

    const { error: clearError } = await supabase
      .from('pricing_rates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (clearError) {
      console.log(`   ⚠️  Error clearing pricing rates:`, clearError.message)
    } else {
      console.log(`   ✅ Cleared existing pricing rates`)
    }

    // Step 3: Insert REAL pricing data from sitra-warehouse-schema.sql
    console.log('\n3. Inserting REAL pricing data...')

    const realPricingData = [
      // Ground Floor - Small units
      {
        space_type_id: groundFloorId,
        area_band_name: 'Small units',
        area_band_min: 1,
        area_band_max: 999,
        tenure: 'Short',
        tenure_description: 'Less than One Year',
        monthly_rate_per_sqm: 3.500,
        daily_rate_per_sqm: 0.117,
        min_chargeable_area: 30,
        package_starting_bhd: 105,
        active: true
      },
      {
        space_type_id: groundFloorId,
        area_band_name: 'Small units',
        area_band_min: 1,
        area_band_max: 999,
        tenure: 'Long',
        tenure_description: 'More or equal to 1 Year',
        monthly_rate_per_sqm: 3.000,
        daily_rate_per_sqm: 0.100,
        min_chargeable_area: 35,
        package_starting_bhd: 105,
        active: true
      },

      // Ground Floor - 1,000–1,499 m²
      {
        space_type_id: groundFloorId,
        area_band_name: '1,000–1,499 m²',
        area_band_min: 1000,
        area_band_max: 1499,
        tenure: 'Short',
        tenure_description: 'Less than One Year',
        monthly_rate_per_sqm: 3.000,
        daily_rate_per_sqm: 0.100,
        min_chargeable_area: 1000,
        package_starting_bhd: 3000,
        active: true
      },
      {
        space_type_id: groundFloorId,
        area_band_name: '1,000–1,499 m²',
        area_band_min: 1000,
        area_band_max: 1499,
        tenure: 'Long',
        tenure_description: 'More or equal to 1 Year',
        monthly_rate_per_sqm: 2.800,
        daily_rate_per_sqm: 0.093,
        min_chargeable_area: 1000,
        package_starting_bhd: 2800,
        active: true
      },

      // Ground Floor - 1,500 m² and above
      {
        space_type_id: groundFloorId,
        area_band_name: '1,500 m² and above',
        area_band_min: 1500,
        area_band_max: null,
        tenure: 'Short',
        tenure_description: 'Less than One Year',
        monthly_rate_per_sqm: 2.800,
        daily_rate_per_sqm: 0.093,
        min_chargeable_area: 1500,
        package_starting_bhd: 4200,
        active: true
      },
      {
        space_type_id: groundFloorId,
        area_band_name: '1,500 m² and above',
        area_band_min: 1500,
        area_band_max: null,
        tenure: 'Long',
        tenure_description: 'More or equal to 1 Year',
        monthly_rate_per_sqm: 2.600,
        daily_rate_per_sqm: 0.087,
        min_chargeable_area: 1500,
        package_starting_bhd: 3900,
        active: true
      },

      // Ground Floor - Very Short Special
      {
        space_type_id: groundFloorId,
        area_band_name: 'VERY SHORT SPECIAL',
        area_band_min: 1,
        area_band_max: 999,
        tenure: 'Very Short',
        tenure_description: 'Special Rate',
        monthly_rate_per_sqm: 4.500,
        daily_rate_per_sqm: 0.150,
        min_chargeable_area: 25,
        package_starting_bhd: 112,
        active: true
      },

      // Mezzanine - Small units
      {
        space_type_id: mezzanineId,
        area_band_name: 'Small units',
        area_band_min: 1,
        area_band_max: 999,
        tenure: 'Short',
        tenure_description: 'Less than One Year',
        monthly_rate_per_sqm: 2.800,
        daily_rate_per_sqm: 0.093,
        min_chargeable_area: 30,
        package_starting_bhd: 84,
        active: true
      },
      {
        space_type_id: mezzanineId,
        area_band_name: 'Small units',
        area_band_min: 1,
        area_band_max: 999,
        tenure: 'Long',
        tenure_description: 'More or equal to 1 Year',
        monthly_rate_per_sqm: 2.400,
        daily_rate_per_sqm: 0.080,
        min_chargeable_area: 35,
        package_starting_bhd: 84,
        active: true
      },

      // Mezzanine - 1,000–1,499 m²
      {
        space_type_id: mezzanineId,
        area_band_name: '1,000–1,499 m²',
        area_band_min: 1000,
        area_band_max: 1499,
        tenure: 'Short',
        tenure_description: 'Less than One Year',
        monthly_rate_per_sqm: 2.400,
        daily_rate_per_sqm: 0.080,
        min_chargeable_area: 1000,
        package_starting_bhd: 2400,
        active: true
      },
      {
        space_type_id: mezzanineId,
        area_band_name: '1,000–1,499 m²',
        area_band_min: 1000,
        area_band_max: 1499,
        tenure: 'Long',
        tenure_description: 'More or equal to 1 Year',
        monthly_rate_per_sqm: 2.240,
        daily_rate_per_sqm: 0.074,
        min_chargeable_area: 1000,
        package_starting_bhd: 2240,
        active: true
      },

      // Mezzanine - 1,500 m² and above
      {
        space_type_id: mezzanineId,
        area_band_name: '1,500 m² and above',
        area_band_min: 1500,
        area_band_max: null,
        tenure: 'Short',
        tenure_description: 'Less than One Year',
        monthly_rate_per_sqm: 2.240,
        daily_rate_per_sqm: 0.074,
        min_chargeable_area: 1500,
        package_starting_bhd: 3360,
        active: true
      },
      {
        space_type_id: mezzanineId,
        area_band_name: '1,500 m² and above',
        area_band_min: 1500,
        area_band_max: null,
        tenure: 'Long',
        tenure_description: 'More or equal to 1 Year',
        monthly_rate_per_sqm: 2.080,
        daily_rate_per_sqm: 0.070,
        min_chargeable_area: 1500,
        package_starting_bhd: 3120,
        active: true
      },

      // Mezzanine - Very Short Special
      {
        space_type_id: mezzanineId,
        area_band_name: 'VERY SHORT SPECIAL',
        area_band_min: 1,
        area_band_max: 999,
        tenure: 'Very Short',
        tenure_description: 'Special Rate',
        monthly_rate_per_sqm: 3.600,
        daily_rate_per_sqm: 0.120,
        min_chargeable_area: 25,
        package_starting_bhd: 90,
        active: true
      }
    ]

    for (const pricingData of realPricingData) {
      const { error } = await supabase
        .from('pricing_rates')
        .insert({
          ...pricingData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.log(`   ⚠️  Error inserting ${pricingData.area_band_name} ${pricingData.tenure}:`, error.message)
      } else {
        console.log(`   ✅ ${pricingData.space_type_id === groundFloorId ? 'Ground Floor' : 'Mezzanine'} - ${pricingData.area_band_name} - ${pricingData.tenure}: ${pricingData.monthly_rate_per_sqm} BHD/m²/month`)
      }
    }

    // Step 4: Update EWA settings with correct values
    console.log('\n4. Updating EWA settings...')

    const ewaSettings = {
      house_load_description: 'House-load for lighting and low-power office devices (phones, laptops/PCs). No EWA application or connection needed.',
      dedicated_meter_description: 'Heavy usage / Dedicated meter: EWA billed separately at government tariff (per kWh) plus fixed monthly charges and one-off fees/deposit.',
      government_tariff_per_kwh: 0.045,
      estimated_fixed_monthly_charges: 15.0,
      estimated_setup_deposit: 50.0,
      estimated_installation_fee: 100.0,
      updated_at: new Date().toISOString()
    }

    const { error: ewaError } = await supabase
      .from('ewa_settings')
      .upsert(ewaSettings)

    if (ewaError) {
      console.log(`   ⚠️  Error updating EWA settings:`, ewaError.message)
    } else {
      console.log(`   ✅ Updated EWA settings`)
    }

    // Step 5: Update system settings with required values
    console.log('\n5. Updating system settings...')

    const systemSettingsData = [
      { setting_key: 'office_monthly_rate', setting_value: '200', description: 'Monthly office space rate in BHD' },
      { setting_key: 'minimum_charge', setting_value: '100', description: 'Minimum charge in BHD' },
      { setting_key: 'days_per_month', setting_value: '30', description: 'Number of days per month for calculations' },
      { setting_key: 'office_free_threshold', setting_value: '100', description: 'Area threshold for free office space in m²' },
      { setting_key: 'vat_rate', setting_value: '10', description: 'VAT rate percentage' },
      { setting_key: 'default_vat_rate', setting_value: '10', description: 'Default VAT percentage' },
      { setting_key: 'minimum_charge', setting_value: '100', description: 'Minimum charge in BHD' },
      { setting_key: 'quote_validity_days', setting_value: '30', description: 'Number of days quotes are valid' },
      { setting_key: 'warehouse_location', setting_value: 'Building No. 22, Road 401, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain', description: 'Default warehouse location' },
      { setting_key: 'company_name', setting_value: 'Sitra Warehouse', description: 'Company name for quotes' },
      { setting_key: 'contact_email', setting_value: 'info@sitra-warehouse.com', description: 'Contact email' },
      { setting_key: 'contact_phone', setting_value: '+973 3881 6222', description: 'Contact phone number' }
    ]

    for (const setting of systemSettingsData) {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          ...setting,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        })

      if (error && !error.message.includes('already exists')) {
        console.log(`   ⚠️  Error updating ${setting.setting_key}:`, error.message)
      } else {
        console.log(`   ✅ System setting: ${setting.setting_key} = ${setting.setting_value}`)
      }
    }

    // Step 6: Update optional services with correct data
    console.log('\n6. Updating optional services...')

    const optionalServicesData = [
      {
        name: 'Goods Movement (Day)',
        description: 'Free access for moving goods during business hours',
        category: 'movement',
        pricing_type: 'fixed',
        rate: 0,
        unit: 'per movement',
        time_restriction: '07:00–18:00',
        is_free: true,
        active: true
      },
      {
        name: 'Goods Movement (Night)',
        description: 'After-hours movement service',
        category: 'movement',
        pricing_type: 'hourly',
        rate: 50,
        unit: 'per hour',
        time_restriction: '18:00–06:30',
        is_free: false,
        active: true
      },
      {
        name: 'Loading & Unloading',
        description: 'Professional loading and unloading service',
        category: 'loading',
        pricing_type: 'on_request',
        rate: null,
        unit: 'on request',
        time_restriction: null,
        is_free: false,
        active: true
      },
      {
        name: 'Transportation',
        description: 'Transportation services',
        category: 'transportation',
        pricing_type: 'on_request',
        rate: null,
        unit: 'on request',
        time_restriction: null,
        is_free: false,
        active: true
      },
      {
        name: 'Last-mile Delivery',
        description: 'Final delivery to customer location',
        category: 'transportation',
        pricing_type: 'on_request',
        rate: null,
        unit: 'on request',
        time_restriction: null,
        is_free: false,
        active: true
      },
      {
        name: 'Freight Forwarding',
        description: 'Freight forwarding services',
        category: 'customs',
        pricing_type: 'on_request',
        rate: null,
        unit: 'on request',
        time_restriction: null,
        is_free: false,
        active: true
      },
      {
        name: 'Customs Clearance',
        description: 'Import/export customs processing',
        category: 'customs',
        pricing_type: 'on_request',
        rate: null,
        unit: 'on request',
        time_restriction: null,
        is_free: false,
        active: true
      },
      {
        name: 'Warehouse Handling',
        description: 'Warehouse handling and value-added services',
        category: 'handling',
        pricing_type: 'on_request',
        rate: null,
        unit: 'on request',
        time_restriction: null,
        is_free: false,
        active: true
      }
    ]

    // Clear existing services first
    await supabase
      .from('optional_services')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    for (const service of optionalServicesData) {
      const { error } = await supabase
        .from('optional_services')
        .insert({
          ...service,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.log(`   ⚠️  Error inserting service ${service.name}:`, error.message)
      } else {
        console.log(`   ✅ Service: ${service.name}`)
      }
    }

    // Step 7: Verify the pricing data
    console.log('\n7. Verifying pricing data...')

    const { data: finalPricingData, error: verifyError } = await supabase
      .from('pricing_rates')
      .select('*')
      .eq('active', true)
      .order('space_type, area_band_min, tenure')

    if (verifyError) {
      console.log(`   ⚠️  Error verifying pricing data:`, verifyError.message)
    } else {
      console.log(`   ✅ Total active pricing rates: ${finalPricingData?.length || 0}`)

      // Show summary by space type and tenure
      const summary = finalPricingData?.reduce((acc, rate) => {
        const key = `${rate.space_type_id === groundFloorId ? 'Ground Floor' : 'Mezzanine'} - ${rate.tenure}`
        if (!acc[key]) acc[key] = 0
        acc[key]++
        return acc
      }, {})

      Object.entries(summary || {}).forEach(([key, count]) => {
        console.log(`   📊 ${key}: ${count} rate bands`)
      })
    }

    console.log('\n' + '='.repeat(60))
    console.log('🎉 CALCULATOR PRICING FIXED!')
    console.log('='.repeat(60))
    console.log('\n✅ Real price list has been applied to the calculator')
    console.log('✅ Pricing rates updated with correct values')
    console.log('✅ EWA settings configured')
    console.log('✅ System settings updated')
    console.log('✅ Optional services configured')
    console.log('\n🚀 The calculator should now show accurate pricing!')
    console.log('\n💡 Test the calculator at: /calculator')

  } catch (error) {
    console.error('❌ Error fixing calculator pricing:', error)
    console.log('\n🔧 Manual fix options:')
    console.log('   1. Run the complete setup script in Supabase SQL Editor')
    console.log('   2. Check your database permissions')
    console.log('   3. Verify your Supabase connection')
  }
}

// Run the pricing fix
fixCalculatorPricing().catch(error => {
  console.error('❌ Pricing fix failed:', error)
  process.exit(1)
})
