import { PricingRate, EWASettings, OptionalService, SystemSettings } from './supabase'

export interface SitraCalculationInputs {
  spaceType: 'Ground Floor' | 'Mezzanine'
  areaRequested: number
  tenure: 'Short' | 'Long' | 'Very Short'
  leaseDurationMonths: number
  includeOffice: boolean
  ewaType: 'house_load' | 'dedicated_meter'
  selectedServices: string[]
  discountPercent?: number
  discountFixed?: number
}

export interface SitraCalculationResult {
  // Input Summary
  spaceType: string
  areaRequested: number
  areaChargeable: number
  areaBand: string
  tenure: string
  leaseDurationMonths: number
  
  // Pricing Breakdown
  monthlyRatePerSqm: number
  dailyRatePerSqm: number
  monthlyWarehouseRent: number
  dailyWarehouseRent: number
  totalWarehouseRent: number
  
  // Office
  officeIncluded: boolean
  officeMonthlyRate: number
  officeTotalCost: number
  
  // EWA
  ewaType: 'house_load' | 'dedicated_meter'
  ewaDescription: string
  ewaSetupCosts: number
  
  // Services
  selectedServicesDetails: Array<{
    name: string
    description: string
    pricing: string
  }>
  
  // Totals
  monthlyTotal: number
  subtotal: number
  discountAmount: number
  grandTotal: number
  
  // Smart Suggestions
  suggestions: Array<{
    type: 'area_optimization' | 'tenure_savings' | 'space_alternative' | 'pricing_tier'
    message: string
    currentCost: number
    suggestedCost: number
    savings: number
  }>
  
  // Monthly Breakdown (for long term)
  monthlyBreakdown: Array<{
    month: number
    warehouseRent: number
    officeRent: number
    total: number
  }>
  
  // Package Info
  packageStarting: number
  minChargeableArea: number
}

export class SitraWarehouseCalculator {
  private systemSettings: Map<string, string> = new Map()

  constructor(
    private pricingRates: PricingRate[],
    private ewaSettings: EWASettings,
    private optionalServices: OptionalService[],
    systemSettings: SystemSettings[] = []
  ) {
    // Convert system settings array to Map for easy lookup
    systemSettings.forEach(setting => {
      this.systemSettings.set(setting.setting_key, setting.setting_value)
    })
  }

  // Helper methods to get REQUIRED system settings (no hardcoded fallbacks)
  private getOfficeMonthlyRate(): number {
    const value = this.systemSettings.get('office_monthly_rate')
    if (value === undefined) {
      throw new Error('Missing system setting: office_monthly_rate')
    }
    return parseFloat(value)
  }

  private getMinimumCharge(): number {
    const value = this.systemSettings.get('minimum_charge')
    if (value === undefined) {
      throw new Error('Missing system setting: minimum_charge')
    }
    return parseFloat(value)
  }

  private getDaysPerMonth(): number {
    const value = this.systemSettings.get('days_per_month')
    if (value === undefined) {
      throw new Error('Missing system setting: days_per_month')
    }
    return parseFloat(value)
  }

  private getOfficeFreeThreshold(): number {
    const value = this.systemSettings.get('office_free_threshold')
    if (value === undefined) {
      throw new Error('Missing system setting: office_free_threshold')
    }
    return parseFloat(value)
  }

  calculate(inputs: SitraCalculationInputs): SitraCalculationResult {
    // Only auto-adjust lease duration for Long term (business requirement)
    const adjustedInputs = { ...inputs }
    if (inputs.tenure === 'Long' && inputs.leaseDurationMonths < 12) {
      adjustedInputs.leaseDurationMonths = 12
    }

    // Handle zero area - return zero calculations
    if (adjustedInputs.areaRequested <= 0) {
      return this.createZeroResult(adjustedInputs)
    }

    // Ensure minimum lease duration of 1
    if (adjustedInputs.leaseDurationMonths < 1) {
      adjustedInputs.leaseDurationMonths = 1
    }

    // Find applicable rate
    const applicableRate = this.findApplicableRate(adjustedInputs.spaceType, adjustedInputs.areaRequested, adjustedInputs.tenure)
    
    if (!applicableRate) {
      // Return a special result indicating no pricing available
      return this.createNoPricingResult(adjustedInputs)
    }

    // Calculate chargeable area
    const areaChargeable = Math.max(adjustedInputs.areaRequested, applicableRate.min_chargeable_area)
    
    // Calculate warehouse rent
    const monthlyWarehouseRent = areaChargeable * applicableRate.monthly_rate_per_sqm
    
    // Handle Very Short term with daily rates
    let totalWarehouseRent
    if (adjustedInputs.tenure === 'Very Short') {
      // Use daily rate for Very Short term
      const dailyWarehouseRent = areaChargeable * applicableRate.daily_rate_per_sqm
      totalWarehouseRent = dailyWarehouseRent * adjustedInputs.leaseDurationMonths // leaseDurationMonths contains days
    } else {
      // Use monthly rate for Short/Long term
      totalWarehouseRent = monthlyWarehouseRent * adjustedInputs.leaseDurationMonths
    }
    
    // Calculate office costs (dynamic from system settings)
    const officeMonthlyRate = adjustedInputs.includeOffice ? this.getOfficeMonthlyRate() : 0
    let officeTotalCost
    if (adjustedInputs.tenure === 'Very Short') {
      // For Very Short term, calculate daily office rate
      const officeDailyRate = this.getOfficeMonthlyRate() / this.getDaysPerMonth()
      officeTotalCost = officeDailyRate * adjustedInputs.leaseDurationMonths // leaseDurationMonths contains days
    } else {
      // For Short/Long term, use monthly calculation
      officeTotalCost = officeMonthlyRate * adjustedInputs.leaseDurationMonths
    }
    
    // Calculate EWA setup costs
    const ewaSetupCosts = adjustedInputs.ewaType === 'dedicated_meter' ? 
      (this.ewaSettings.estimated_setup_deposit || 0) + (this.ewaSettings.estimated_installation_fee || 0) : 0
    
    // Get selected services details
    const selectedServicesDetails = this.getServicesDetails(adjustedInputs.selectedServices)
    
    // Calculate totals (per period = day for Very Short, month otherwise)
    let monthlyTotal
    if (adjustedInputs.tenure === 'Very Short') {
      const dailyWarehouseRent = areaChargeable * applicableRate.daily_rate_per_sqm
      const dailyOfficeRate = this.getOfficeMonthlyRate() / this.getDaysPerMonth()
      monthlyTotal = dailyWarehouseRent + dailyOfficeRate
    } else {
      monthlyTotal = monthlyWarehouseRent + officeMonthlyRate
    }
    let subtotal = totalWarehouseRent + officeTotalCost + ewaSetupCosts
    
    // Enforce minimum charge
    const minimumCharge = this.getMinimumCharge()
    if (adjustedInputs.areaRequested < 30 && adjustedInputs.areaRequested > 0) {
      const minimumMonthlyTotal = minimumCharge / adjustedInputs.leaseDurationMonths
      if (monthlyTotal < minimumMonthlyTotal) {
        monthlyTotal = minimumMonthlyTotal
        subtotal = minimumCharge + ewaSetupCosts
      }
    }
    
    // Ensure no total is less than minimum charge
    if (subtotal < minimumCharge) {
      subtotal = minimumCharge
      monthlyTotal = minimumCharge / adjustedInputs.leaseDurationMonths
    }
    
    const discountAmount = (adjustedInputs.discountFixed || 0) + (subtotal * (adjustedInputs.discountPercent || 0) / 100)
    let grandTotal = subtotal - discountAmount
    
    // Ensure grand total is never less than minimum charge
    if (grandTotal < minimumCharge) {
      grandTotal = minimumCharge
    }
    
    // Generate suggestions
    const suggestions = this.generateSuggestions(adjustedInputs, applicableRate, monthlyWarehouseRent)
    
    // Generate payment breakdown per period (day for Very Short, month otherwise)
    const perPeriodWarehouse = adjustedInputs.tenure === 'Very Short'
      ? (areaChargeable * applicableRate.daily_rate_per_sqm)
      : monthlyWarehouseRent
    const perPeriodOffice = adjustedInputs.tenure === 'Very Short'
      ? (this.getOfficeMonthlyRate() / this.getDaysPerMonth())
      : officeMonthlyRate
    const monthlyBreakdown = this.generateMonthlyBreakdown(
      adjustedInputs.leaseDurationMonths,
      perPeriodWarehouse,
      perPeriodOffice
    )
    
    return {
      // Input Summary
      spaceType: adjustedInputs.spaceType,
      areaRequested: adjustedInputs.areaRequested,
      areaChargeable,
      areaBand: applicableRate.area_band_name,
      tenure: adjustedInputs.tenure,
      leaseDurationMonths: adjustedInputs.leaseDurationMonths,
      
      // Pricing Breakdown
      monthlyRatePerSqm: applicableRate.monthly_rate_per_sqm,
      dailyRatePerSqm: applicableRate.daily_rate_per_sqm,
      monthlyWarehouseRent,
      dailyWarehouseRent: areaChargeable * applicableRate.daily_rate_per_sqm,
      totalWarehouseRent,
      
      // Office
      officeIncluded: adjustedInputs.includeOffice,
      officeMonthlyRate,
      officeTotalCost,
      
      // EWA
      ewaType: adjustedInputs.ewaType,
      ewaDescription: adjustedInputs.ewaType === 'house_load' ? 
        this.ewaSettings.house_load_description : 
        this.ewaSettings.dedicated_meter_description,
      ewaSetupCosts,
      
      // Services
      selectedServicesDetails,
      
      // Totals
      monthlyTotal,
      subtotal,
      discountAmount,
      grandTotal,
      
      // Smart Features
      suggestions,
      monthlyBreakdown,
      
      // Package Info
      packageStarting: applicableRate.package_starting_bhd || 0,
      minChargeableArea: applicableRate.min_chargeable_area
    }
  }

  private findApplicableRate(spaceType: string, area: number, tenure: string): PricingRate | null {
    // Special handling for Mezzanine + Very Short term
    if (spaceType === 'Mezzanine' && tenure === 'Very Short') {
      // Look up Ground Floor Very Short rate and apply 20% discount
      const groundFloorRate = this.pricingRates.find(rate => 
        rate.space_type === 'Ground Floor' && 
        rate.tenure === 'Very Short' &&
        rate.active &&
        area >= rate.area_band_min && 
        (rate.area_band_max === null || area <= rate.area_band_max)
      )
      
      if (groundFloorRate) {
        // Return a modified rate with 20% discount applied
        return {
          ...groundFloorRate,
          space_type: 'Mezzanine',
          monthly_rate_per_sqm: groundFloorRate.monthly_rate_per_sqm * 0.8, // 20% discount
          daily_rate_per_sqm: groundFloorRate.daily_rate_per_sqm * 0.8 // 20% discount
        }
      }
    }

    // Regular rate lookup
    return this.pricingRates.find(rate => 
      rate.space_type === spaceType && 
      rate.tenure === tenure &&
      rate.active &&
      area >= rate.area_band_min && 
      (rate.area_band_max === null || area <= rate.area_band_max)
    ) || null
  }

  private createZeroResult(inputs: SitraCalculationInputs): SitraCalculationResult {
    return {
      // Input Summary
      spaceType: inputs.spaceType,
      areaRequested: inputs.areaRequested,
      areaChargeable: 0,
      areaBand: 'N/A',
      tenure: inputs.tenure,
      leaseDurationMonths: inputs.leaseDurationMonths,
      
      // Pricing Breakdown
      monthlyRatePerSqm: 0,
      dailyRatePerSqm: 0,
      monthlyWarehouseRent: 0,
      dailyWarehouseRent: 0,
      totalWarehouseRent: 0,
      
      // Office
      officeIncluded: inputs.includeOffice,
      officeMonthlyRate: 0,
      officeTotalCost: 0,
      
      // EWA
      ewaType: inputs.ewaType,
      ewaDescription: inputs.ewaType === 'house_load' ? 
        this.ewaSettings.house_load_description : 
        this.ewaSettings.dedicated_meter_description,
      ewaSetupCosts: 0,
      
      // Services
      selectedServicesDetails: [],
      
      // Totals
      monthlyTotal: 0,
      subtotal: 0,
      discountAmount: 0,
      grandTotal: 0,
      
      // Smart Features
      suggestions: [],
      monthlyBreakdown: [],
      
      // Package Info
      packageStarting: 0,
      minChargeableArea: 0
    }
  }

  private createNoPricingResult(inputs: SitraCalculationInputs): SitraCalculationResult {
    return {
      // Input Summary
      spaceType: inputs.spaceType,
      areaRequested: inputs.areaRequested,
      areaChargeable: inputs.areaRequested,
      areaBand: 'Pricing Not Available',
      tenure: inputs.tenure,
      leaseDurationMonths: inputs.leaseDurationMonths,
      
      // Pricing Breakdown
      monthlyRatePerSqm: 0,
      dailyRatePerSqm: 0,
      monthlyWarehouseRent: 0,
      dailyWarehouseRent: 0,
      totalWarehouseRent: 0,
      
      // Office
      officeIncluded: inputs.includeOffice,
      officeMonthlyRate: 0,
      officeTotalCost: 0,
      
      // EWA
      ewaType: inputs.ewaType,
      ewaDescription: inputs.ewaType === 'house_load' ? 
        this.ewaSettings.house_load_description : 
        this.ewaSettings.dedicated_meter_description,
      ewaSetupCosts: 0,
      
      // Services
      selectedServicesDetails: [],
      
      // Totals
      monthlyTotal: 0,
      subtotal: 0,
      discountAmount: 0,
      grandTotal: 0,
      
      // Smart Features
      suggestions: [{
        type: 'pricing_tier',
        message: 'Pricing not available for this combination. Please contact us for a custom quote.',
        currentCost: 0,
        suggestedCost: 0,
        savings: 0
      }],
      monthlyBreakdown: [],
      
      // Package Info
      packageStarting: 0,
      minChargeableArea: 0
    }
  }

  private getServicesDetails(selectedServiceIds: string[]): Array<{name: string, description: string, pricing: string}> {
    return selectedServiceIds.map(serviceId => {
      const service = this.optionalServices.find(s => s.id === serviceId)
      if (!service) return { name: 'Unknown Service', description: '', pricing: 'Contact us' }
      
      let pricing = 'Contact us'
      if (service.is_free) {
        pricing = 'Included'
      } else if (service.pricing_type === 'on_request') {
        pricing = 'On request'
      } else if (service.rate) {
        pricing = `${formatCurrency(service.rate)} ${service.unit || ''}`
      }
      
      return {
        name: service.name,
        description: service.description || '',
        pricing
      }
    })
  }

  private generateSuggestions(inputs: SitraCalculationInputs, currentRate: PricingRate, currentMonthlyRent: number): Array<{
    type: 'area_optimization' | 'tenure_savings' | 'space_alternative' | 'pricing_tier'
    message: string
    currentCost: number
    suggestedCost: number
    savings: number
  }> {
    const suggestions: Array<{
      type: 'area_optimization' | 'tenure_savings' | 'space_alternative' | 'pricing_tier'
      message: string
      currentCost: number
      suggestedCost: number
      savings: number
    }> = []

    // Area optimization suggestions
    if (inputs.areaRequested < currentRate.min_chargeable_area) {
      const suggestedArea = currentRate.min_chargeable_area
      const suggestedMonthlyRent = suggestedArea * currentRate.monthly_rate_per_sqm
      const savings = currentMonthlyRent - suggestedMonthlyRent
      
      suggestions.push({
        type: 'area_optimization',
        message: `Consider ${suggestedArea} m² for the same price - you get ${suggestedArea - inputs.areaRequested} m² more space!`,
        currentCost: currentMonthlyRent,
        suggestedCost: suggestedMonthlyRent,
        savings: Math.abs(savings)
      })
    }

         // Tenure savings suggestions
     if (inputs.tenure === 'Short' && inputs.leaseDurationMonths >= 12) {
       const longTermRate = this.pricingRates.find(rate => 
         rate.space_type === inputs.spaceType && 
         rate.tenure === 'Long' &&
         rate.active &&
         inputs.areaRequested >= rate.area_band_min && 
         (rate.area_band_max === null || inputs.areaRequested <= rate.area_band_max)
       )
      
      if (longTermRate && longTermRate.monthly_rate_per_sqm < currentRate.monthly_rate_per_sqm) {
        const longTermMonthlyRent = inputs.areaRequested * longTermRate.monthly_rate_per_sqm
        const savings = currentMonthlyRent - longTermMonthlyRent
        
        suggestions.push({
          type: 'tenure_savings',
          message: `Switch to Long term for ${formatCurrency(savings)}/month savings`,
          currentCost: currentMonthlyRent,
          suggestedCost: longTermMonthlyRent,
          savings
        })
      }
    }

         // Space alternative suggestions
     if (inputs.spaceType === 'Ground Floor') {
       const mezzanineRate = this.pricingRates.find(rate => 
         rate.space_type === 'Mezzanine' && 
         rate.tenure === inputs.tenure &&
         rate.active &&
         inputs.areaRequested >= rate.area_band_min && 
         (rate.area_band_max === null || inputs.areaRequested <= rate.area_band_max)
       )
      
      if (mezzanineRate) {
        const mezzanineMonthlyRent = inputs.areaRequested * mezzanineRate.monthly_rate_per_sqm
        const savings = currentMonthlyRent - mezzanineMonthlyRent
        
        if (savings > 0) {
          suggestions.push({
            type: 'space_alternative',
            message: `Consider Mezzanine space for ${formatCurrency(savings)}/month savings`,
            currentCost: currentMonthlyRent,
            suggestedCost: mezzanineMonthlyRent,
            savings
          })
        }
      }
    }

    return suggestions
  }

  private generateMonthlyBreakdown(months: number, monthlyWarehouseRent: number, monthlyOfficeRent: number): Array<{
    month: number
    warehouseRent: number
    officeRent: number
    total: number
  }> {
    const breakdown = []
    for (let i = 1; i <= months; i++) {
      breakdown.push({
        month: i,
        warehouseRent: monthlyWarehouseRent,
        officeRent: monthlyOfficeRent,
        total: monthlyWarehouseRent + monthlyOfficeRent
      })
    }
    return breakdown
  }
}

// Utility functions
export function formatCurrency(amount: number): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0.000 BHD'
  }
  return `${amount.toFixed(3)} BHD`
}

export function formatArea(area: number): string {
  if (area === null || area === undefined || isNaN(area)) {
    return '0 m²'
  }
  return `${area.toFixed(1)} m²`
}
