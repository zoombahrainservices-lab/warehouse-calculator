#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables!')
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env.local file')
  console.error('\nExample .env.local file:')
  console.error('NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co')
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here')
  console.error('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// System Settings Data
const systemSettings = [
  { setting_key: 'default_vat_rate', setting_value: '10', description: 'Default VAT percentage' },
  { setting_key: 'minimum_charge', setting_value: '100', description: 'Minimum charge in BHD' },
  { setting_key: 'quote_validity_days', setting_value: '30', description: 'Number of days quotes are valid' },
  { setting_key: 'warehouse_location', setting_value: 'Building No. 22, Road 401, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain', description: 'Default warehouse location' },
  { setting_key: 'company_name', setting_value: 'Sitra Warehouse', description: 'Company name for quotes' },
  { setting_key: 'contact_email', setting_value: 'info@sitra-warehouse.com', description: 'Contact email' },
  { setting_key: 'contact_phone', setting_value: '+973 1234 5678', description: 'Contact phone number' }
]

// Space Types Data
const spaceTypes = [
  { name: 'Ground Floor', description: 'Ground floor warehouse space', sort_order: 1 },
  { name: 'Mezzanine', description: 'Mezzanine level warehouse space', sort_order: 2 }
]

// Office Pricing Data
const officePricing = [
  // Ground Floor
  { space_type_name: 'Ground Floor', tenure: 'Short', monthly_rate: 200.00, daily_rate: 6.67, description: 'Office space for Ground Floor - Short term' },
  { space_type_name: 'Ground Floor', tenure: 'Long', monthly_rate: 180.00, daily_rate: 6.00, description: 'Office space for Ground Floor - Long term' },
  { space_type_name: 'Ground Floor', tenure: 'Very Short', monthly_rate: 200.00, daily_rate: 6.67, description: 'Office space for Ground Floor - Very Short term' },
  // Mezzanine
  { space_type_name: 'Mezzanine', tenure: 'Short', monthly_rate: 180.00, daily_rate: 6.00, description: 'Office space for Mezzanine - Short term' },
  { space_type_name: 'Mezzanine', tenure: 'Long', monthly_rate: 160.00, daily_rate: 5.33, description: 'Office space for Mezzanine - Long term' },
  { space_type_name: 'Mezzanine', tenure: 'Very Short', monthly_rate: 180.00, daily_rate: 6.00, description: 'Office space for Mezzanine - Very Short term' }
]

// Warehouse Data
const pricingRates = [
  // Ground Floor - Small units
  { space_type_name: 'Ground Floor', area_band_name: 'Small units', area_band_min: 1, area_band_max: 999, tenure: 'Short', tenure_description: 'Less than One Year', monthly_rate_per_sqm: 3.500, daily_rate_per_sqm: 0.117, min_chargeable_area: 30, package_starting_bhd: 105 },
  { space_type_name: 'Ground Floor', area_band_name: 'Small units', area_band_min: 1, area_band_max: 999, tenure: 'Long', tenure_description: 'More or equal to 1 Year', monthly_rate_per_sqm: 3.000, daily_rate_per_sqm: 0.100, min_chargeable_area: 35, package_starting_bhd: 105 },

  // Ground Floor - 1,000–1,499 m²
  { space_type_name: 'Ground Floor', area_band_name: '1,000–1,499 m²', area_band_min: 1000, area_band_max: 1499, tenure: 'Short', tenure_description: 'Less than One Year', monthly_rate_per_sqm: 3.000, daily_rate_per_sqm: 0.100, min_chargeable_area: 1000, package_starting_bhd: 3000 },
  { space_type_name: 'Ground Floor', area_band_name: '1,000–1,499 m²', area_band_min: 1000, area_band_max: 1499, tenure: 'Long', tenure_description: 'More or equal to 1 Year', monthly_rate_per_sqm: 2.800, daily_rate_per_sqm: 0.093, min_chargeable_area: 1000, package_starting_bhd: 2800 },

  // Ground Floor - 1,500 m² and above
  { space_type_name: 'Ground Floor', area_band_name: '1,500 m² and above', area_band_min: 1500, area_band_max: null, tenure: 'Short', tenure_description: 'Less than One Year', monthly_rate_per_sqm: 2.800, daily_rate_per_sqm: 0.093, min_chargeable_area: 1500, package_starting_bhd: 4200 },
  { space_type_name: 'Ground Floor', area_band_name: '1,500 m² and above', area_band_min: 1500, area_band_max: null, tenure: 'Long', tenure_description: 'More or equal to 1 Year', monthly_rate_per_sqm: 2.600, daily_rate_per_sqm: 0.087, min_chargeable_area: 1500, package_starting_bhd: 3900 },

  // Ground Floor - Very Short Special
  { space_type_name: 'Ground Floor', area_band_name: 'VERY SHORT SPECIAL', area_band_min: 1, area_band_max: 999, tenure: 'Very Short', tenure_description: 'Special Rate', monthly_rate_per_sqm: 4.500, daily_rate_per_sqm: 0.150, min_chargeable_area: 25, package_starting_bhd: 112 },

  // Mezzanine - Small units
  { space_type_name: 'Mezzanine', area_band_name: 'Small units', area_band_min: 1, area_band_max: 999, tenure: 'Short', tenure_description: 'Less than One Year', monthly_rate_per_sqm: 2.800, daily_rate_per_sqm: 0.093, min_chargeable_area: 30, package_starting_bhd: 84 },
  { space_type_name: 'Mezzanine', area_band_name: 'Small units', area_band_min: 1, area_band_max: 999, tenure: 'Long', tenure_description: 'More or equal to 1 Year', monthly_rate_per_sqm: 2.400, daily_rate_per_sqm: 0.080, min_chargeable_area: 35, package_starting_bhd: 84 },

  // Mezzanine - 1,000–1,499 m²
  { space_type_name: 'Mezzanine', area_band_name: '1,000–1,499 m²', area_band_min: 1000, area_band_max: 1499, tenure: 'Short', tenure_description: 'Less than One Year', monthly_rate_per_sqm: 2.400, daily_rate_per_sqm: 0.080, min_chargeable_area: 1000, package_starting_bhd: 2400 },
  { space_type_name: 'Mezzanine', area_band_name: '1,000–1,499 m²', area_band_min: 1000, area_band_max: 1499, tenure: 'Long', tenure_description: 'More or equal to 1 Year', monthly_rate_per_sqm: 2.240, daily_rate_per_sqm: 0.074, min_chargeable_area: 1000, package_starting_bhd: 2240 },

  // Mezzanine - 1,500 m² and above
  { space_type_name: 'Mezzanine', area_band_name: '1,500 m² and above', area_band_min: 1500, area_band_max: null, tenure: 'Short', tenure_description: 'Less than One Year', monthly_rate_per_sqm: 2.240, daily_rate_per_sqm: 0.074, min_chargeable_area: 1500, package_starting_bhd: 3360 },
  { space_type_name: 'Mezzanine', area_band_name: '1,500 m² and above', area_band_min: 1500, area_band_max: null, tenure: 'Long', tenure_description: 'More or equal to 1 Year', monthly_rate_per_sqm: 2.080, daily_rate_per_sqm: 0.070, min_chargeable_area: 1500, package_starting_bhd: 3120 },

  // Mezzanine - Very Short Special
  { space_type_name: 'Mezzanine', area_band_name: 'VERY SHORT SPECIAL', area_band_min: 1, area_band_max: 999, tenure: 'Very Short', tenure_description: 'Special Rate', monthly_rate_per_sqm: 3.600, daily_rate_per_sqm: 0.120, min_chargeable_area: 25, package_starting_bhd: 90 }
]

const ewaSettings = {
  house_load_description: 'House-load for lighting and low-power office devices (phones, laptops/PCs). No EWA application or connection needed.',
  heavy_usage_description: 'Heavy usage / Dedicated meter: EWA billed separately at government tariff (per kWh) plus fixed monthly charges and one-off fees/deposit.',
  government_tariff_per_kwh: 0.045,
  estimated_fixed_monthly_charges: 15.0,
  estimated_meter_deposit: 50.0,
  estimated_installation_fee: 100.0
}

const optionalServices = [
  // Movement services
  { name: 'Goods Movement (Day)', description: 'Free access for moving goods during business hours', category: 'movement', pricing_type: 'fixed', rate: 0, unit: 'per movement', time_restriction: '07:00–18:00', is_free: true, active: true },
  { name: 'Goods Movement (Night)', description: 'After-hours movement service', category: 'movement', pricing_type: 'hourly', rate: 50, unit: 'per hour', time_restriction: '18:00–06:30', is_free: false, active: true },

  // Loading & Unloading
  { name: 'Loading & Unloading', description: 'Professional loading and unloading service', category: 'loading', pricing_type: 'on_request', rate: null, unit: 'on request', time_restriction: null, is_free: false, active: true },

  // Transportation
  { name: 'Transportation', description: 'Transportation services', category: 'transportation', pricing_type: 'on_request', rate: null, unit: 'on request', time_restriction: null, is_free: false, active: true },
  { name: 'Last-mile Delivery', description: 'Final delivery to customer location', category: 'transportation', pricing_type: 'on_request', rate: null, unit: 'on request', time_restriction: null, is_free: false, active: true },

  // Customs & Freight
  { name: 'Freight Forwarding', description: 'Freight forwarding services', category: 'customs', pricing_type: 'on_request', rate: null, unit: 'on request', time_restriction: null, is_free: false, active: true },
  { name: 'Customs Clearance', description: 'Import/export customs processing', category: 'customs', pricing_type: 'on_request', rate: null, unit: 'on request', time_restriction: null, is_free: false, active: true },

  // Warehouse Handling
  { name: 'Warehouse Handling', description: 'Warehouse handling and value-added services', category: 'handling', pricing_type: 'on_request', rate: null, unit: 'on request', time_restriction: null, is_free: false, active: true }
]

async function setupDatabase() {
  console.log('🚀 Setting up warehouse database...')
  console.log(`📡 Connecting to: ${supabaseUrl}`)
  
  try {
    // 1. Clear existing data
    console.log('📝 Clearing existing data...')
    await supabase.from('quotes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('optional_services').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('ewa_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('pricing_rates').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('office_pricing').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('space_types').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('system_settings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    // 2. Insert System Settings
    console.log('⚙️ Inserting system settings...')
    const { data: systemData, error: systemError } = await supabase
      .from('system_settings')
      .insert(systemSettings)
    
    if (systemError) {
      console.error('❌ Error inserting system settings:', systemError)
      return
    }
    console.log(`✅ Inserted ${systemData?.length || 0} system settings`)
    
    // 3. Insert Space Types
    console.log('🏢 Inserting space types...')
    const { data: spaceTypesData, error: spaceTypesError } = await supabase
      .from('space_types')
      .insert(spaceTypes)
    
    if (spaceTypesError) {
      console.error('❌ Error inserting space types:', spaceTypesError)
      return
    }
    console.log(`✅ Inserted ${spaceTypesData?.length || 0} space types`)
    
    // 4. Insert Office Pricing (with space type IDs)
    console.log('🏢 Inserting office pricing...')
    const officePricingWithIds = officePricing.map(op => {
      const spaceType = spaceTypesData?.find(st => st.name === op.space_type_name)
      return {
        space_type_id: spaceType?.id,
        tenure: op.tenure,
        monthly_rate: op.monthly_rate,
        daily_rate: op.daily_rate,
        description: op.description
      }
    }).filter(op => op.space_type_id) // Only include if space type was found
    
    const { data: officeData, error: officeError } = await supabase
      .from('office_pricing')
      .insert(officePricingWithIds)
    
    if (officeError) {
      console.error('❌ Error inserting office pricing:', officeError)
      return
    }
    console.log(`✅ Inserted ${officeData?.length || 0} office pricing entries`)
    
    // 5. Insert Pricing Rates (with space type IDs)
    console.log('💰 Inserting pricing rates...')
    const pricingRatesWithIds = pricingRates.map(pr => {
      const spaceType = spaceTypesData?.find(st => st.name === pr.space_type_name)
      return {
        space_type_id: spaceType?.id,
        area_band_name: pr.area_band_name,
        area_band_min: pr.area_band_min,
        area_band_max: pr.area_band_max,
        tenure: pr.tenure,
        tenure_description: pr.tenure_description,
        monthly_rate_per_sqm: pr.monthly_rate_per_sqm,
        daily_rate_per_sqm: pr.daily_rate_per_sqm,
        min_chargeable_area: pr.min_chargeable_area,
        package_starting_bhd: pr.package_starting_bhd
      }
    }).filter(pr => pr.space_type_id) // Only include if space type was found
    
    const { data: pricingData, error: pricingError } = await supabase
      .from('pricing_rates')
      .insert(pricingRatesWithIds)
    
    if (pricingError) {
      console.error('❌ Error inserting pricing rates:', pricingError)
      return
    }
    console.log(`✅ Inserted ${pricingData?.length || 0} pricing rates`)
    
    // 6. Insert EWA Settings
    console.log('⚡ Inserting EWA settings...')
    const { data: ewaData, error: ewaError } = await supabase
      .from('ewa_settings')
      .insert([ewaSettings])
    
    if (ewaError) {
      console.error('❌ Error inserting EWA settings:', ewaError)
      return
    }
    console.log('✅ Inserted EWA settings')
    
    // 7. Insert Optional Services
    console.log('🛠️ Inserting optional services...')
    const { data: servicesData, error: servicesError } = await supabase
      .from('optional_services')
      .insert(optionalServices)
    
    if (servicesError) {
      console.error('❌ Error inserting optional services:', servicesError)
      return
    }
    console.log(`✅ Inserted ${servicesData?.length || 0} optional services`)
    
    console.log('\n🎉 Database setup completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   • ${systemSettings.length} system settings`)
    console.log(`   • ${spaceTypes.length} space types`)
    console.log(`   • ${officePricing.length} office pricing entries`)
    console.log(`   • ${pricingRates.length} pricing rates`)
    console.log(`   • 1 EWA settings configuration`)
    console.log(`   • ${optionalServices.length} optional services`)
    console.log('\n🔗 Next steps:')
    console.log('   1. Start your development server: npm run dev')
    console.log('   2. Visit your admin panel: http://localhost:3000/admin')
    console.log('   3. Test the calculator and manage your data!')
    
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    console.error('\n💡 Make sure you have:')
    console.error('   1. Created the database tables using the SQL schema')
    console.error('   2. Set up your .env.local file with correct Supabase credentials')
    console.error('   3. Have proper permissions in your Supabase project')
  }
}

// Run the setup
setupDatabase()
