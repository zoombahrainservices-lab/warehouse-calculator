import { PricingRate, EWASettings } from './supabase'

export interface CalculationInputs {
  area: number
  tenure: 'Short' | 'Long' | 'Very Short'
  leaseStart: Date
  leaseEnd: Date
  ewaMode: 'house_load' | 'dedicated_meter'
  estimatedKwh?: number
  estimatedMonthlyEwaCost?: number
  optionalServices: Record<string, { quantity: number; rate: number; isFree?: boolean }>
  discountPercent?: number
  discountFixed?: number
  vatRate?: number
}

export interface CalculationResult {
  // Basic area and pricing
  areaRequested: number
  chargeableArea: number
  areaBandName: string
  monthlyRatePerSqm: number
  dailyRatePerSqm: number
  
  // Duration
  leaseDurationMonths: number
  monthsFull: number
  daysExtra: number
  proRataFraction: number
  
  // Base rent calculation
  monthlyBaseRent: number
  totalBaseRent: number
  
  // EWA breakdown
  ewaBreakdown: {
    type: 'house_load' | 'dedicated_meter'
    description: string
    monthlyEstimate: number
    termEstimate: number
    oneOffCosts: number
  }
  
  // Optional services
  optionalServicesTotal: number
  optionalServicesBreakdown: Array<{
    name: string
    quantity: number
    rate: number
    total: number
    isFree: boolean
  }>
  
  // Totals
  subtotal: number
  discountAmount: number
  vatAmount: number
  grandTotal: number
  
  // Additional info
  packageStarting?: number
  paymentTerms: string
}

export class SitraWarehouseCalculator {
  constructor(
    private pricingRates: PricingRate[],
    private ewaSettings: EWASettings
  ) {}

  calculate(inputs: CalculationInputs): CalculationResult {
    // Find applicable pricing rate using new logic
    const applicableRate = this.findApplicableRate(inputs.area, inputs.tenure)

    if (!applicableRate) {
      throw new Error(`No pricing rate found for ${inputs.area}m² ${inputs.tenure} term`)
    }

    // Calculate chargeable area (max of requested area and minimum chargeable area)
    const chargeableArea = Math.max(inputs.area, applicableRate.min_chargeable_area)

    // Calculate duration
    const duration = this.calculateDuration(inputs.leaseStart, inputs.leaseEnd)

    // Calculate base rent
    const monthlyBaseRent = chargeableArea * applicableRate.monthly_rate_per_sqm
    const totalBaseRent = monthlyBaseRent * duration.totalMonths

    // Calculate EWA
    const ewaBreakdown = this.calculateEWA(inputs, duration.totalMonths)

    // Calculate optional services
    const { total: optionalServicesTotal, breakdown: optionalServicesBreakdown } = 
      this.calculateOptionalServices(inputs.optionalServices)

    // Calculate totals
    const subtotal = totalBaseRent + ewaBreakdown.termEstimate + ewaBreakdown.oneOffCosts + optionalServicesTotal
    
    const discountAmount = (inputs.discountFixed || 0) + (subtotal * (inputs.discountPercent || 0) / 100)
    const discountedSubtotal = subtotal - discountAmount
    
    const vatAmount = inputs.vatRate ? (discountedSubtotal * inputs.vatRate / 100) : 0
    const grandTotal = discountedSubtotal + vatAmount

    return {
      // Basic area and pricing
      areaRequested: inputs.area,
      chargeableArea,
      areaBandName: applicableRate.area_band_name,
      monthlyRatePerSqm: applicableRate.monthly_rate_per_sqm,
      dailyRatePerSqm: applicableRate.daily_rate_per_sqm,
      
      // Duration
      leaseDurationMonths: duration.totalMonths,
      monthsFull: duration.monthsFull,
      daysExtra: duration.daysExtra,
      proRataFraction: duration.proRataFraction,
      
      // Base rent calculation
      monthlyBaseRent,
      totalBaseRent,
      
      // EWA breakdown
      ewaBreakdown,
      
      // Optional services
      optionalServicesTotal,
      optionalServicesBreakdown,
      
      // Totals
      subtotal,
      discountAmount,
      vatAmount,
      grandTotal,
      
      // Additional info
      packageStarting: applicableRate.package_starting_bhd || undefined,
      paymentTerms: 'Rent payable in advance on or before the first day of the lease month'
    }
  }

  private findApplicableRate(
    area: number,
    tenure: 'Short' | 'Long' | 'Very Short'
  ): PricingRate | null {
    console.log('Finding rate for:', { area, tenure })
    console.log('Available rates:', this.pricingRates)

    // Check if we're using the old database structure
    const isOldStructure = this.pricingRates.length > 0 && 
                          this.pricingRates[0].hasOwnProperty('size_band')

    if (isOldStructure) {
      console.log('Using old database structure compatibility mode')
      // Fallback to old logic for backward compatibility
      const oldRates = this.pricingRates as PricingRate[]
      const applicableRates = oldRates
        .filter(rate => {
          const tenureMatch = rate.tenure === tenure
          const areaFits = rate.size_band >= area
          console.log(`Old rate ${rate.size_band}m²: tenure=${tenureMatch}, fits=${areaFits}`)
          return tenureMatch && areaFits
        })
        .sort((a, b) => a.size_band - b.size_band)

      if (applicableRates.length > 0) {
        // Convert old structure to new structure for compatibility
        const oldRate = applicableRates[0]
        return {
          ...oldRate,
          area_band_name: `${oldRate.size_band}m² band`,
          area_band_min: 1,
          area_band_max: oldRate.size_band,
          tenure_description: tenure === 'Short' ? 'Less than One Year' : 'More or equal to 1 Year',
          monthly_rate_per_sqm: oldRate.monthly_rate_per_sqm,
          daily_rate_per_sqm: oldRate.monthly_rate_per_sqm / 30,
          min_chargeable_area: oldRate.min_chargeable_area,
          package_starting_bhd: null,
          package_range_from: null,
          package_range_to: null,
          active: true
        }
      }
      return null
    }

    // New structure logic
    const applicableRates = this.pricingRates
      .filter(rate => {
        const tenureMatch = rate.tenure === tenure
        const areaInRange = area >= rate.area_band_min && 
                           (rate.area_band_max === null || area <= rate.area_band_max)
        const isActive = rate.active
        
        console.log(`Rate ${rate.area_band_name}: tenure=${tenureMatch}, area=${areaInRange}, active=${isActive}`)
        
        return tenureMatch && areaInRange && isActive
      })
      .sort((a, b) => a.area_band_min - b.area_band_min)

    console.log('Filtered applicable rates:', applicableRates)
    return applicableRates[0] || null
  }

  private calculateDuration(startDate: Date, endDate: Date) {
    const diffTime = endDate.getTime() - startDate.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    const monthsFull = Math.floor(diffDays / 30)
    const daysExtra = diffDays % 30
    const proRataFraction = daysExtra / 30
    const totalMonths = monthsFull + proRataFraction

    return {
      monthsFull,
      daysExtra,
      proRataFraction,
      totalMonths
    }
  }

  private calculateEWA(inputs: CalculationInputs, termInMonths: number) {
    if (inputs.ewaMode === 'house_load') {
      return {
        type: 'house_load' as const,
        description: this.ewaSettings.house_load_description,
        monthlyEstimate: 0,
        termEstimate: 0,
        oneOffCosts: 0
      }
    } else {
      // Dedicated meter
      const monthlyEstimate = inputs.estimatedMonthlyEwaCost || 
        ((inputs.estimatedKwh || 100) * this.ewaSettings.government_tariff_per_kwh + 
         this.ewaSettings.estimated_fixed_monthly_charges)
      
      const termEstimate = monthlyEstimate * termInMonths
      const oneOffCosts = this.ewaSettings.estimated_meter_deposit + 
                         this.ewaSettings.estimated_installation_fee

      return {
        type: 'dedicated_meter' as const,
        description: this.ewaSettings.heavy_usage_description,
        monthlyEstimate,
        termEstimate,
        oneOffCosts
      }
    }
  }

  private calculateOptionalServices(services: Record<string, { quantity: number; rate: number; isFree?: boolean }>) {
    const breakdown: Array<{
      name: string
      quantity: number
      rate: number
      total: number
      isFree: boolean
    }> = []

    let total = 0

    Object.entries(services).forEach(([serviceName, service]) => {
      const serviceTotal = service.isFree ? 0 : (service.quantity * service.rate)
      
      breakdown.push({
        name: serviceName,
        quantity: service.quantity,
        rate: service.rate,
        total: serviceTotal,
        isFree: service.isFree || false
      })

      total += serviceTotal
    })

    return { total, breakdown }
  }
}

// Export the new calculator as the default
export const WarehouseCalculator = SitraWarehouseCalculator

// Utility functions
export const generateQuoteNumber = (): string => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `SW-${date}-${random}` // SW = Sitra Warehouse
}

export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0.000 BHD'
  }
  return `${amount.toFixed(3)} BHD`
}

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

