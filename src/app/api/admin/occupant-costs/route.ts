import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSessionFromRequest } from '@/lib/auth'

class OccupantCostCalculator {
  private pricingRates: any[] = []
  private ewaSettings: any = null

  constructor(pricingRates: any[], ewaSettings: any) {
    this.pricingRates = pricingRates
    this.ewaSettings = ewaSettings
  }

  // Find applicable pricing rate for an occupant
  private findApplicableRate(area: number, floorType: string): any {
    let bestRate = null
    let bestMatch = -1

    for (const rate of this.pricingRates) {
      // Check if floor type matches (ground/mezzanine)
      const rateFloorType = rate.space_type?.toLowerCase() || 'ground'
      const occupantFloorType = floorType?.toLowerCase() || 'ground'
      
      if (rateFloorType !== occupantFloorType) continue

      // Check if area falls within the band
      const minArea = rate.area_band_min || 0
      const maxArea = rate.area_band_max || Infinity
      
      if (area >= minArea && area <= maxArea) {
        // Prefer rates with smaller bands (more specific)
        const bandSize = maxArea - minArea
        if (bestMatch === -1 || bandSize < bestMatch) {
          bestRate = rate
          bestMatch = bandSize
        }
      }
    }
    
    return bestRate
  }

  // Calculate cost for a single occupant
  calculateOccupantCost(occupant: any): any {
    if (!occupant.space_occupied || occupant.space_occupied <= 0) {
      return {
        hasWarehouse: false,
        monthlyCost: 0,
        annualCost: 0,
        ratePerSqm: 0,
        chargeableArea: 0,
        floorType: occupant.floor_type || 'ground',
        pricingDetails: null,
        ewaCost: 0,
        totalMonthlyCost: 0,
        totalAnnualCost: 0
      }
    }

    // Find applicable rate
    const applicableRate = this.findApplicableRate(occupant.space_occupied, occupant.floor_type || 'ground')
    
    if (!applicableRate) {
      return {
        hasWarehouse: true,
        monthlyCost: 0,
        annualCost: 0,
        ratePerSqm: 0,
        chargeableArea: occupant.space_occupied,
        floorType: occupant.floor_type || 'ground',
        pricingDetails: null,
        ewaCost: 0,
        totalMonthlyCost: 0,
        totalAnnualCost: 0,
        error: 'No pricing rate found'
      }
    }

    // Calculate costs
    const chargeableArea = Math.max(occupant.space_occupied, applicableRate.min_chargeable_area)
    let monthlyCost = chargeableArea * applicableRate.monthly_rate_per_sqm
    let annualCost = monthlyCost * 12

    // Apply minimum 100 BHD rule
    const MINIMUM_CHARGE = 100
    if (monthlyCost < MINIMUM_CHARGE) {
      monthlyCost = MINIMUM_CHARGE
      annualCost = MINIMUM_CHARGE * 12
    }

    // Calculate EWA estimate
    const ewaMonthly = this.ewaSettings?.estimated_fixed_monthly_charges || 15.0
    const ewaAnnual = ewaMonthly * 12

    // Calculate total costs
    const totalMonthlyCost = monthlyCost + ewaMonthly
    const totalAnnualCost = annualCost + ewaAnnual

    return {
      hasWarehouse: true,
      monthlyCost: monthlyCost,
      annualCost: annualCost,
      ratePerSqm: applicableRate.monthly_rate_per_sqm,
      chargeableArea: chargeableArea,
      floorType: occupant.floor_type || 'ground',
      pricingDetails: {
        areaBand: applicableRate.area_band_name,
        tenure: applicableRate.tenure,
        monthlyRatePerSqm: applicableRate.monthly_rate_per_sqm,
        minChargeableArea: applicableRate.min_chargeable_area
      },
      ewaCost: ewaMonthly,
      totalMonthlyCost: totalMonthlyCost,
      totalAnnualCost: totalAnnualCost
    }
  }

  // Calculate costs for all occupants
  calculateAllOccupantCosts(occupants: any[]): any[] {
    return occupants.map(occupant => {
      const costCalculation = this.calculateOccupantCost(occupant)
      return {
        ...occupant,
        costCalculation
      }
    })
  }

  // Calculate revenue summary
  calculateRevenueSummary(occupantsWithCosts: any[]): any {
    const activeOccupants = occupantsWithCosts.filter(o => o.costCalculation.hasWarehouse)
    
    const totalMonthlyRevenue = activeOccupants.reduce((sum, o) => sum + o.costCalculation.totalMonthlyCost, 0)
    const totalAnnualRevenue = activeOccupants.reduce((sum, o) => sum + o.costCalculation.totalAnnualCost, 0)
    const totalWarehouseRevenue = activeOccupants.reduce((sum, o) => sum + o.costCalculation.monthlyCost, 0)
    const totalEWARevenue = activeOccupants.reduce((sum, o) => sum + o.costCalculation.ewaCost, 0)
    
    const averageMonthlyCost = activeOccupants.length > 0 ? totalMonthlyRevenue / activeOccupants.length : 0
    const totalAreaOccupied = activeOccupants.reduce((sum, o) => sum + o.space_occupied, 0)

    return {
      totalOccupants: occupantsWithCosts.length,
      activeOccupants: activeOccupants.length,
      totalMonthlyRevenue,
      totalAnnualRevenue,
      totalWarehouseRevenue,
      totalEWARevenue,
      averageMonthlyCost,
      totalAreaOccupied
    }
  }
}

// GET /api/admin/occupant-costs - Get cost calculations for all occupants
export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const sessionValidation = await validateSessionFromRequest(request)
    if (!sessionValidation.isValid || !sessionValidation.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user to check admin role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', sessionValidation.userId)
      .single()

    if (userError || !user || !['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Load pricing rates and EWA settings
    const [ratesResult, ewaResult, occupantsResult] = await Promise.all([
      supabase.from('pricing_rates').select('*').order('area_band_min'),
      supabase.from('ewa_settings').select('*').limit(1).single(),
      supabase.from('warehouse_occupants')
        .select(`
          *,
          warehouses (
            id,
            name,
            location,
            total_space,
            has_mezzanine,
            mezzanine_space,
            status
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
    ])

    if (ratesResult.error) throw ratesResult.error
    if (ewaResult.error) throw ewaResult.error
    if (occupantsResult.error) throw occupantsResult.error

    // Initialize calculator
    const calculator = new OccupantCostCalculator(ratesResult.data || [], ewaResult.data)

    // Calculate costs for all occupants
    const occupantsWithCosts = calculator.calculateAllOccupantCosts(occupantsResult.data || [])

    // Calculate revenue summary
    const revenueSummary = calculator.calculateRevenueSummary(occupantsWithCosts)

    return NextResponse.json({
      occupants: occupantsWithCosts,
      revenueSummary,
      pricingRates: ratesResult.data,
      ewaSettings: ewaResult.data
    })

  } catch (error) {
    console.error('❌ Occupant costs API error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate occupant costs' },
      { status: 500 }
    )
  }
}




