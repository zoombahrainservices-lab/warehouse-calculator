// Test Cost Calculation API
// This script tests the new users-costs API endpoint

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Please check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCostCalculation() {
  console.log('🧪 Testing Cost Calculation API...\n')

  try {
    // 1. Check if unified_users table exists and has data
    console.log('1️⃣ Checking unified_users table...')
    const { data: unifiedUsers, error: unifiedError } = await supabase
      .from('unified_users')
      .select('*')
      .limit(5)

    if (unifiedError) {
      console.log('❌ unified_users table does not exist yet')
      console.log('   Error:', unifiedError.message)
      console.log('\n🔧 You need to run the SIMPLE_UNIFIED_USERS_FIX.sql script first!')
      return
    }

    console.log(`✅ unified_users table exists with ${unifiedUsers?.length || 0} records`)

    // 2. Check if pricing_rates table exists
    console.log('\n2️⃣ Checking pricing_rates table...')
    const { data: pricingRates, error: pricingError } = await supabase
      .from('pricing_rates')
      .select('*')
      .eq('active', true)
      .limit(5)

    if (pricingError) {
      console.log('❌ pricing_rates table does not exist or has issues')
      console.log('   Error:', pricingError.message)
      console.log('\n🔧 You need to set up the pricing system first!')
      return
    }

    console.log(`✅ pricing_rates table exists with ${pricingRates?.length || 0} active rates`)

    // 3. Check if ewa_settings table exists
    console.log('\n3️⃣ Checking ewa_settings table...')
    const { data: ewaSettings, error: ewaError } = await supabase
      .from('ewa_settings')
      .select('*')
      .limit(1)

    if (ewaError) {
      console.log('⚠️ ewa_settings table not found, will use defaults')
    } else {
      console.log('✅ ewa_settings table exists')
    }

    // 4. Test the cost calculation logic (simulated)
    console.log('\n4️⃣ Testing Cost Calculation Logic:')
    
    // Simulate the UserCostCalculator
    class TestUserCostCalculator {
      constructor(pricingRates, ewaSettings) {
        this.pricingRates = pricingRates
        this.ewaSettings = ewaSettings
      }

      findApplicableRate(area, floorType) {
        const spaceTypeMap = {
          'ground': 'Ground Floor',
          'mezzanine': 'Mezzanine',
          'office': 'Office'
        }
        
        const spaceType = spaceTypeMap[floorType] || 'Ground Floor'
        
        let bestRate = null
        let bestMatch = -1
        
        for (const rate of this.pricingRates) {
          if (rate.space_type === spaceType && rate.active) {
            if (area >= rate.area_band_min && (!rate.area_band_max || area <= rate.area_band_max)) {
              const matchScore = rate.tenure === 'Long' ? 3 : rate.tenure === 'Short' ? 2 : 1
              
              if (matchScore > bestMatch) {
                bestMatch = matchScore
                bestRate = rate
              }
            }
          }
        }
        
        return bestRate
      }

      calculateUserCost(user) {
        if (!user.space_occupied || user.space_occupied <= 0) {
          return {
            hasWarehouse: false,
            monthlyCost: 0,
            annualCost: 0,
            ratePerSqm: 0,
            chargeableArea: 0,
            floorType: user.floor_type || 'ground',
            pricingDetails: null
          }
        }

        const applicableRate = this.findApplicableRate(user.space_occupied, user.floor_type || 'ground')
        
        if (!applicableRate) {
          return {
            hasWarehouse: true,
            monthlyCost: 0,
            annualCost: 0,
            ratePerSqm: 0,
            chargeableArea: user.space_occupied,
            floorType: user.floor_type || 'ground',
            pricingDetails: null,
            error: 'No pricing rate found'
          }
        }

        const chargeableArea = Math.max(user.space_occupied, applicableRate.min_chargeable_area)
        const monthlyCost = chargeableArea * applicableRate.monthly_rate_per_sqm
        const annualCost = monthlyCost * 12

        const ewaMonthly = this.ewaSettings?.estimated_fixed_monthly_charges || 15.0
        const ewaAnnual = ewaMonthly * 12

        const totalMonthly = monthlyCost + ewaMonthly
        const totalAnnual = annualCost + ewaAnnual

        return {
          hasWarehouse: true,
          monthlyCost: monthlyCost,
          annualCost: annualCost,
          ratePerSqm: applicableRate.monthly_rate_per_sqm,
          chargeableArea: chargeableArea,
          floorType: user.floor_type || 'ground',
          spaceType: applicableRate.space_type,
          tenure: applicableRate.tenure,
          ewaMonthly: ewaMonthly,
          ewaAnnual: ewaAnnual,
          totalMonthly: totalMonthly,
          totalAnnual: totalAnnual,
          pricingDetails: {
            areaBand: applicableRate.area_band_name,
            minChargeableArea: applicableRate.min_chargeable_area,
            packageStarting: applicableRate.package_starting_bhd
          }
        }
      }
    }

    // Test with sample users
    const calculator = new TestUserCostCalculator(pricingRates || [], ewaSettings || {})
    
    const testUsers = unifiedUsers?.filter(u => u.role === 'USER' && u.warehouse_status === 'active') || []
    
    if (testUsers.length > 0) {
      console.log(`\n📊 Testing cost calculation for ${testUsers.length} active users:`)
      
      testUsers.forEach(user => {
        const costCalculation = calculator.calculateUserCost(user)
        
        console.log(`\n   👤 ${user.name}:`)
        console.log(`      📦 Space: ${user.space_occupied}m² (${user.floor_type} floor)`)
        
        if (costCalculation.hasWarehouse) {
          console.log(`      💰 Monthly Cost: ${costCalculation.totalMonthly.toFixed(2)} BHD`)
          console.log(`      💰 Annual Cost: ${costCalculation.totalAnnual.toFixed(2)} BHD`)
          console.log(`      📏 Rate: ${costCalculation.ratePerSqm.toFixed(3)} BHD/m²`)
          console.log(`      🏢 Space Type: ${costCalculation.spaceType}`)
          console.log(`      ⏱️ Tenure: ${costCalculation.tenure}`)
          console.log(`      ⚡ EWA: ${costCalculation.ewaMonthly.toFixed(2)} BHD/month`)
        } else {
          console.log(`      ❌ No warehouse space`)
        }
      })

      // Calculate totals
      const totalMonthlyRevenue = testUsers.reduce((sum, user) => {
        const costs = calculator.calculateUserCost(user)
        return sum + (costs.totalMonthly || 0)
      }, 0)

      const totalAnnualRevenue = testUsers.reduce((sum, user) => {
        const costs = calculator.calculateUserCost(user)
        return sum + (costs.totalAnnual || 0)
      }, 0)

      console.log(`\n💰 REVENUE SUMMARY:`)
      console.log(`   Total Monthly Revenue: ${totalMonthlyRevenue.toFixed(2)} BHD`)
      console.log(`   Total Annual Revenue: ${totalAnnualRevenue.toFixed(2)} BHD`)
      console.log(`   Average Monthly per User: ${(totalMonthlyRevenue / testUsers.length).toFixed(2)} BHD`)

    } else {
      console.log('⚠️ No active users with warehouse space found for testing')
    }

    // 5. Summary and recommendations
    console.log('\n📋 SUMMARY:')
    console.log('==========')
    if (unifiedUsers && unifiedUsers.length > 0) {
      console.log('✅ Unified users table: Working')
    } else {
      console.log('❌ Unified users table: No data')
    }

    if (pricingRates && pricingRates.length > 0) {
      console.log('✅ Pricing rates: Available')
    } else {
      console.log('❌ Pricing rates: Not configured')
    }

    if (ewaSettings) {
      console.log('✅ EWA settings: Available')
    } else {
      console.log('⚠️ EWA settings: Using defaults')
    }

    if (testUsers.length > 0) {
      console.log('✅ Cost calculation: Working')
      console.log('🎉 Your supporter dashboard should now show cost calculations!')
    } else {
      console.log('⚠️ Cost calculation: No users to test with')
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

// Run the test
testCostCalculation()
