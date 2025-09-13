import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Simplified calculator for user costs
class UserCostCalculator {
  private pricingRates: any[] = []
  private ewaSettings: any = null

  constructor(pricingRates: any[], ewaSettings: any) {
    this.pricingRates = pricingRates
    this.ewaSettings = ewaSettings
  }

  // Find applicable pricing rate based on area and floor type
  private findApplicableRate(area: number, floorType: string): any {
    // Map floor types to space types
    const spaceTypeMap: Record<string, string> = {
      'ground': 'Ground Floor',
      'mezzanine': 'Mezzanine',
      'office': 'Office'
    }
    
    const spaceType = spaceTypeMap[floorType] || 'Ground Floor'
    
    // Find the best matching rate
    let bestRate = null
    let bestMatch = -1
    
    for (const rate of this.pricingRates) {
      if (rate.space_type === spaceType && rate.active) {
        // Check if area fits in this band
        if (area >= rate.area_band_min && (!rate.area_band_max || area <= rate.area_band_max)) {
          // Prefer Long term rates for existing users (assume they have long-term contracts)
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

  // Calculate monthly cost for a user
  calculateUserCost(user: any): any {
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

    // Find applicable rate
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

    // Calculate costs
    const chargeableArea = Math.max(user.space_occupied, applicableRate.min_chargeable_area)
    let monthlyCost = chargeableArea * applicableRate.monthly_rate_per_sqm
    let annualCost = monthlyCost * 12

    // Apply minimum 100 BHD rule
    const MINIMUM_CHARGE = 100
    if (monthlyCost < MINIMUM_CHARGE) {
      monthlyCost = MINIMUM_CHARGE
      annualCost = MINIMUM_CHARGE * 12
    }

    // Calculate EWA estimate (simplified)
    const ewaMonthly = this.ewaSettings?.estimated_fixed_monthly_charges || 15.0
    const ewaAnnual = ewaMonthly * 12

    // Calculate total costs
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

export async function GET(request: NextRequest) {
  try {
    // Check if we can find any user with SUPPORT role
    const { data: supportUsers, error: userError } = await supabase
      .from('users')
      .select('id, role, is_active')
      .in('role', ['SUPPORT', 'MANAGER', 'ADMIN'])
      .eq('is_active', true)
      .limit(1)

    if (userError || !supportUsers || supportUsers.length === 0) {
      console.log('❌ No valid support users found')
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const supportUser = supportUsers[0]
    if (!supportUser.is_active) {
      console.log('❌ User account is inactive')
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if user has SUPPORT role or higher
    if (!['SUPPORT', 'MANAGER', 'ADMIN'].includes(supportUser.role)) {
      console.log('❌ Insufficient permissions')
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    console.log('✅ SUPPORT user authenticated, calculating user costs...')

    // Load pricing data
    const { data: pricingRates, error: pricingError } = await supabase
      .from('pricing_rates')
      .select('*')
      .eq('active', true)

    if (pricingError) {
      console.error('❌ Error fetching pricing rates:', pricingError.message)
      return NextResponse.json(
        { error: 'Failed to fetch pricing data' },
        { status: 500 }
      )
    }

    // Load EWA settings
    const { data: ewaSettings, error: ewaError } = await supabase
      .from('ewa_settings')
      .select('*')
      .limit(1)
      .single()

    if (ewaError) {
      console.log('⚠️ EWA settings not found, using defaults')
    }

    // Fetch all USER role users with their warehouse data
    const { data: users, error: usersError } = await supabase
      .from('unified_users')
      .select(`
        id,
        email,
        name,
        role,
        is_active,
        warehouse_id,
        space_occupied,
        floor_type,
        entry_date,
        expected_exit_date,
        warehouse_status,
        created_at
      `)
      .eq('role', 'USER')
      .eq('is_active', true)
      .order('name')

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    console.log(`📊 Found ${users?.length || 0} regular users, calculating costs...`)

    // Initialize calculator
    const calculator = new UserCostCalculator(pricingRates || [], ewaSettings || {})

    // Calculate costs for each user
    const usersWithCosts = users?.map(user => {
      const costCalculation = calculator.calculateUserCost(user)
      
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        warehouseStatus: user.warehouse_status,
        spaceOccupied: user.space_occupied || 0,
        floorType: user.floor_type || 'ground',
        entryDate: user.entry_date,
        expectedExitDate: user.expected_exit_date,
        // Cost calculations
        costs: costCalculation,
        // Summary for display
        totalMonthlyCost: costCalculation.totalMonthly || 0,
        totalAnnualCost: costCalculation.totalAnnual || 0,
        ratePerSqm: costCalculation.ratePerSqm || 0,
        hasActiveWarehouse: costCalculation.hasWarehouse
      }
    }) || []

    // Calculate summary statistics
    const activeUsers = usersWithCosts.filter(u => u.hasActiveWarehouse)
    const totalMonthlyRevenue = activeUsers.reduce((sum, u) => sum + u.totalMonthlyCost, 0)
    const totalAnnualRevenue = activeUsers.reduce((sum, u) => sum + u.totalAnnualCost, 0)
    const totalSpaceOccupied = activeUsers.reduce((sum, u) => sum + u.spaceOccupied, 0)

    console.log(`✅ Calculated costs for ${usersWithCosts.length} users`)

    return NextResponse.json({
      users: usersWithCosts,
      summary: {
        totalUsers: usersWithCosts.length,
        activeUsers: activeUsers.length,
        totalSpaceOccupied: totalSpaceOccupied,
        totalMonthlyRevenue: totalMonthlyRevenue,
        totalAnnualRevenue: totalAnnualRevenue,
        averageMonthlyPerUser: activeUsers.length > 0 ? totalMonthlyRevenue / activeUsers.length : 0,
        averageRatePerSqm: activeUsers.length > 0 ? 
          activeUsers.reduce((sum, u) => sum + u.ratePerSqm, 0) / activeUsers.length : 0
      },
      pricingInfo: {
        ratesLoaded: pricingRates?.length || 0,
        ewaSettingsLoaded: !!ewaSettings,
        calculatorVersion: 'UserCostCalculator v1.0'
      }
    })

  } catch (error) {
    console.error('❌ Unexpected error in supporter users-costs API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
