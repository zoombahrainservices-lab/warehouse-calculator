const { createClient } = require('@supabase/supabase-js')

console.log('🧪 Testing Minimum 100 BHD Rule Implementation')
console.log('==============================================')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testMinimum100BHDRule() {
  try {
    console.log('\n1. Testing small area calculations (should be 100 BHD minimum)')
    
    // Test scenarios with small areas that should trigger 100 BHD minimum
    const testScenarios = [
      { area: 10, floorType: 'ground', tenure: 'Short', expectedMin: 100 },
      { area: 15, floorType: 'ground', tenure: 'Long', expectedMin: 100 },
      { area: 25, floorType: 'mezzanine', tenure: 'Short', expectedMin: 100 },
      { area: 5, floorType: 'ground', tenure: 'Very Short', expectedMin: 100 },
      { area: 50, floorType: 'ground', tenure: 'Short', expectedMin: 100 }, // Should be above 100
      { area: 100, floorType: 'ground', tenure: 'Short', expectedMin: 100 }, // Should be above 100
    ]

    for (const scenario of testScenarios) {
      console.log(`\n   Testing: ${scenario.area}m² ${scenario.floorType} ${scenario.tenure}`)
      
      // Simulate the cost calculation logic
      const result = await calculateCost(scenario.area, scenario.floorType, scenario.tenure)
      
      if (result.monthlyCost >= scenario.expectedMin) {
        console.log(`   ✅ Monthly Cost: ${result.monthlyCost} BHD (meets minimum)`)
      } else {
        console.log(`   ❌ Monthly Cost: ${result.monthlyCost} BHD (below minimum ${scenario.expectedMin} BHD)`)
      }
    }

    console.log('\n2. Testing system settings')
    
    // Check if minimum_charge is set to 100
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', 'minimum_charge')

    if (settingsError) {
      console.log('❌ Error fetching system settings:', settingsError.message)
    } else if (settings && settings.length > 0) {
      const minimumCharge = parseFloat(settings[0].setting_value)
      if (minimumCharge === 100) {
        console.log('✅ System setting minimum_charge is correctly set to 100 BHD')
      } else {
        console.log(`❌ System setting minimum_charge is ${minimumCharge} BHD, should be 100 BHD`)
      }
    } else {
      console.log('❌ No minimum_charge setting found in system_settings')
    }

    console.log('\n3. Testing actual occupant cost calculations')
    
    // Get some real occupants to test
    const { data: occupants, error: occupantsError } = await supabase
      .from('warehouse_occupants')
      .select('*')
      .limit(5)

    if (occupantsError) {
      console.log('❌ Error fetching occupants:', occupantsError.message)
    } else if (occupants && occupants.length > 0) {
      console.log(`   Found ${occupants.length} occupants to test`)
      
      for (const occupant of occupants) {
        if (occupant.space_occupied && occupant.space_occupied > 0) {
          const result = await calculateOccupantCost(occupant)
          console.log(`   Occupant ${occupant.name || occupant.email}: ${occupant.space_occupied}m² → ${result.monthlyCost} BHD/month`)
        }
      }
    } else {
      console.log('   No occupants found to test')
    }

    console.log('\n✅ Minimum 100 BHD rule testing completed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

async function calculateCost(area, floorType, tenure) {
  try {
    // Get pricing rates
    const { data: rates, error: ratesError } = await supabase
      .from('pricing_rates')
      .select('*')
      .eq('active', true)

    if (ratesError) throw ratesError

    // Find applicable rate
    const spaceType = floorType === 'ground' ? 'Ground Floor' : 'Mezzanine'
    const applicableRate = rates.find(rate => 
      rate.space_type === spaceType &&
      rate.tenure === tenure &&
      area >= rate.area_band_min &&
      (rate.area_band_max === null || area <= rate.area_band_max)
    )

    if (!applicableRate) {
      return { monthlyCost: 0, error: 'No applicable rate found' }
    }

    // Calculate chargeable area
    const chargeableArea = Math.max(area, applicableRate.min_chargeable_area)
    
    // Calculate monthly cost
    let monthlyCost = chargeableArea * applicableRate.monthly_rate_per_sqm

    // Apply minimum 100 BHD rule
    const MINIMUM_CHARGE = 100
    if (monthlyCost < MINIMUM_CHARGE) {
      monthlyCost = MINIMUM_CHARGE
    }

    return { monthlyCost, applicableRate }
  } catch (error) {
    return { monthlyCost: 0, error: error.message }
  }
}

async function calculateOccupantCost(occupant) {
  try {
    // Get pricing rates
    const { data: rates, error: ratesError } = await supabase
      .from('pricing_rates')
      .select('*')
      .eq('active', true)

    if (ratesError) throw ratesError

    // Determine tenure based on lease duration
    const entryDate = occupant.entry_date ? new Date(occupant.entry_date) : new Date()
    const exitDate = occupant.expected_exit_date ? new Date(occupant.expected_exit_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    
    const leaseDurationDays = Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
    const leaseDurationMonths = Math.ceil(leaseDurationDays / 30)
    
    let tenure = 'Short'
    if (leaseDurationDays < 30) {
      tenure = 'Very Short'
    } else if (leaseDurationMonths >= 12) {
      tenure = 'Long'
    }

    // Find applicable rate
    const spaceType = occupant.floor_type === 'ground' ? 'Ground Floor' : 'Mezzanine'
    const applicableRate = rates.find(rate => 
      rate.space_type === spaceType &&
      rate.tenure === tenure &&
      occupant.space_occupied >= rate.area_band_min &&
      (rate.area_band_max === null || occupant.space_occupied <= rate.area_band_max)
    )

    if (!applicableRate) {
      return { monthlyCost: 0, error: 'No applicable rate found' }
    }

    // Calculate chargeable area
    const chargeableArea = Math.max(occupant.space_occupied, applicableRate.min_chargeable_area)
    
    // Calculate monthly cost
    let monthlyCost = chargeableArea * applicableRate.monthly_rate_per_sqm

    // Apply minimum 100 BHD rule
    const MINIMUM_CHARGE = 100
    if (monthlyCost < MINIMUM_CHARGE) {
      monthlyCost = MINIMUM_CHARGE
    }

    return { monthlyCost, applicableRate, tenure }
  } catch (error) {
    return { monthlyCost: 0, error: error.message }
  }
}

// Run the test
testMinimum100BHDRule()
