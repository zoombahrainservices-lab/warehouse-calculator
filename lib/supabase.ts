import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database T
export interface PricingRate {
  id: string
  size_band: number
  tenure: 'Short' | 'Long'
  monthly_rate_per_sqm: number
  min_chargeable_area: number
  space_type: 'Ground Floor' | 'Mezzanine' | 'Office'
  created_at: string
  updated_at: string
}

export interface EWASettings {
  id: string
  included_kw_cap: number
  included_kwh_cap: number
  tariff_per_kwh: number
  fixed_monthly_charges: number
  meter_deposit: number
  meter_installation_fee: number
  created_at: string
  updated_at: string
}

export interface Quote {
  id: string
  quote_number: string
  client_name: string
  client_email?: string
  warehouse: string
  space_type: string
  area_input: number
  chargeable_area: number
  tenure: 'Short' | 'Long'
  lease_start: string
  lease_end: string
  months_full: number
  days_extra: number
  base_rent: number
  ewa_cost: number
  ewa_mode: 'house_load' | 'dedicated_meter'
  optional_services: Record<string, any>
  subtotal: number
  discount_amount: number
  vat_amount: number
  grand_total: number
  status: 'draft' | 'sent' | 'accepted'
  created_at: string
  updated_at: string
}

export interface OptionalService {
  id: string
  name: string
  description: string
  rate: number
  unit: string
  category: 'loading' | 'afterhours' | 'logistics' | 'other'
  active: boolean
  created_at: string
  updated_at: string
}


