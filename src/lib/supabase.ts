import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
}

if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client with service role key (bypasses RLS)
// Only create if service role key is available
let supabaseAdmin: any = null
let adminAccessStatus = 'not_configured'

if (supabaseServiceKey && supabaseServiceKey.trim() !== '') {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    adminAccessStatus = 'initialized'
    console.log('✅ Admin Supabase client initialized with service role')
  } catch (error) {
    console.warn('⚠️ Failed to initialize admin Supabase client:', error)
    supabaseAdmin = null
    adminAccessStatus = 'failed'
  }
} else {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not found - admin features will be limited')
  adminAccessStatus = 'missing_key'
}

export { supabaseAdmin }

// Helper function to check if admin client is available
export const hasAdminAccess = () => {
  return supabaseAdmin !== null
}

// Helper function to get admin access status
export const getAdminAccessStatus = () => {
  return adminAccessStatus
}

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
  optional_services_details: Record<string, unknown>
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

export interface StockData {
  id: string
  // Client Information
  client_name: string
  client_email?: string
  client_phone?: string
  client_company?: string
  client_address?: string
  
  // Product Information
  product_name: string
  product_type: 'food' | 'metals' | 'cargo' | 'electronics' | 'textiles' | 'general' | 'chemicals' | 'automotive' | 'pharmaceutical' | 'other'
  product_category?: string
  product_description?: string
  product_brand?: string
  product_model?: string
  
  // Quantity & Measurements
  quantity: number
  unit: 'pieces' | 'boxes' | 'pallets' | 'kg' | 'tons' | 'liters' | 'm3' | 'containers' | 'rolls' | 'bags'
  weight_kg?: number
  volume_m3?: number
  dimensions_length?: number
  dimensions_width?: number
  dimensions_height?: number
  
  // Storage Information
  storage_location?: string
  warehouse_section?: string
  rack_number?: string
  shelf_level?: string
  space_type: 'Ground Floor' | 'Mezzanine'
  area_occupied_m2: number
  temperature_controlled?: boolean
  humidity_controlled?: boolean
  special_requirements?: string
  
  // Dates & Timeline
  entry_date: string
  expected_exit_date?: string
  actual_exit_date?: string
  last_inspection_date?: string
  expiry_date?: string
  
  // Status & Tracking
  status: 'active' | 'pending' | 'completed' | 'expired' | 'damaged' | 'reserved'
  condition_status?: 'excellent' | 'good' | 'fair' | 'damaged' | 'expired'
  handling_instructions?: string
  insurance_value?: number
  customs_cleared?: boolean
  
  // Financial Information
  storage_rate_per_m2?: number
  monthly_storage_cost?: number
  total_storage_cost?: number
  deposit_amount?: number
  deposit_paid?: boolean
  
  // Additional Information
  barcode?: string
  qr_code?: string
  reference_number?: string
  purchase_order_number?: string
  invoice_number?: string
  notes?: string
  internal_notes?: string
  
  // System Fields
  created_at: string
  updated_at?: string
  created_by?: string
  updated_by?: string
}

export interface Client {
  id: string
  company_name: string
  contact_person?: string
  email?: string
  phone?: string
  fax?: string
  address?: string
  po_box?: string
  city?: string
  country?: string
  website?: string
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface ClientStock {
  id: string
  client_id: string
  
  // Packing List Details
  exp_pack_no?: string // Export Pack Number
  date_packed?: string
  vehicle_no?: string
  driver_name?: string
  uae_cont_no?: string
  export_cont?: string
  
  // Item Details
  po_no?: string // Purchase Order Number
  section?: string
  bundle_id?: string
  do_no?: string // Delivery Order Number
  temp_alloy?: string // Temperature/Alloy (like T6 6063)
  finish?: string // Finish type (like PC/SDF-7037)
  
  // Measurements
  cut_length?: number
  est_weight?: number
  order_length?: number
  no_of_pcs?: number
  no_of_bundles?: number
  total_pcs?: number
  total_weight?: number
  
  // Storage Info
  storage_location?: string
  space_type?: string
  area_used?: number
  
  // Dates
  entry_date?: string
  expected_exit_date?: string
  
  // Status
  status: 'active' | 'packed' | 'shipped' | 'completed' | 'cancelled'
  notes?: string
  
  // Timestamps
  created_at: string
  updated_at: string
}

export interface ClientStockWithClient extends ClientStock {
  client?: Client
}

