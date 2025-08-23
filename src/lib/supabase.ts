import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types - Updated for Real Sitra Warehouse Pricing
export interface SystemSettings {
  id: string
  setting_key: string
  setting_value: string
  description?: string
  created_at: string
  updated_at: string
}

export interface SpaceType {
  id: string
  name: string
  description?: string
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface OfficePricing {
  id: string
  space_type_id: string
  tenure: 'Short' | 'Long' | 'Very Short'
  monthly_rate: number
  daily_rate: number
  description?: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface PricingRate {
  id: string
  space_type: string
  area_band_name: string // 'Small units', '1,000–1,499 m²', etc.
  area_band_min: number
  area_band_max: number | null
  tenure: 'Short' | 'Long' | 'Very Short'
  tenure_description: string
  monthly_rate_per_sqm: number
  daily_rate_per_sqm: number
  min_chargeable_area: number
  package_starting_bhd: number | null
  package_range_from: number | null
  package_range_to: number | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface EWASettings {
  id: string
  house_load_description: string
  dedicated_meter_description: string
  estimated_setup_deposit: number
  estimated_installation_fee: number
  created_at: string
  updated_at: string
}

export interface Quote {
  id: string
  quote_number: string
  client_name: string
  client_email?: string
  client_phone?: string
  warehouse_location: string
  area_requested: number
  area_chargeable: number
  area_band_name: string
  tenure: string
  lease_start: string
  lease_end: string
  lease_duration_months: number
  monthly_rate_per_sqm: number
  daily_rate_per_sqm: number
  monthly_base_rent: number
  total_base_rent: number
  ewa_type: 'house_load' | 'dedicated_meter'
  ewa_monthly_estimate: number
  ewa_total_estimate: number
  ewa_one_off_costs: number
  optional_services_total: number
  optional_services_details: any
  subtotal: number
  discount_percentage: number
  discount_amount: number
  vat_percentage: number
  vat_amount: number
  grand_total: number
  payment_terms: string
  quote_valid_until?: string
  status: 'draft' | 'sent' | 'accepted' | 'expired'
  notes?: string
  created_at: string
  updated_at: string
}

export interface OptionalService {
  id: string
  name: string
  description: string | null
  category: 'movement' | 'loading' | 'transportation' | 'customs' | 'handling'
  pricing_type: 'fixed' | 'hourly' | 'per_event' | 'on_request'
  rate: number | null
  unit: string | null
  time_restriction: string | null
  is_free: boolean
  active: boolean
  created_at: string
  updated_at: string
}

export interface Device {
  name: string
  watts: number
  hours_per_day: number
  quantity: number
}

