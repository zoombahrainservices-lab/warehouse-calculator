'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase, supabaseAdmin, hasAdminAccess, getAdminAccessStatus } from '@/lib/supabase'
import { PricingRate, EWASettings, OptionalService, SystemSettings } from '@/lib/supabase'

// Stock Item Interface
interface StockItem {
  id: string
  client_name: string
  client_email: string
  client_phone?: string
  product_type: string
  quantity: number
  unit: string
  description: string
  storage_location?: string
  space_type: 'Ground Floor' | 'Mezzanine'
  area_used: number
  entry_date: string
  expected_exit_date?: string
  status: 'active' | 'completed' | 'pending'
  notes?: string
  created_at: string
  current_quantity?: number
  total_received_quantity?: number
  total_delivered_quantity?: number
  initial_quantity?: number
}

// User Interface for Admin Management
interface AdminUser {
  id: string
  email: string
  first_name?: string
  last_name?: string
  name?: string
  role: string
  is_active: boolean
  created_at: string
  google_sub?: string
}
import { useAuth } from '@/hooks/useAuth'

export default function AdminPanel() {
  const { user, isLoading: authLoading, logout } = useAuth({ requiredRole: 'ADMIN' })
  const [activeTab, setActiveTab] = useState<'pricing' | 'ewa' | 'services' | 'settings' | 'stock' | 'users' | 'occupant-costs'>('pricing')
  const [pricingRates, setPricingRates] = useState<PricingRate[]>([])
  const [ewaSettings, setEwaSettings] = useState<EWASettings | null>(null)
  const [optionalServices, setOptionalServices] = useState<OptionalService[]>([])
  const [systemSettings, setSystemSettings] = useState<SystemSettings[]>([])
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [occupantCosts, setOccupantCosts] = useState<any[]>([])
  const [revenueSummary, setRevenueSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)



  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Admin panel: Loading data...')

      // Use regular client for all operations
      const adminClient = supabase

      const [ratesResult, ewaResult, servicesResult, settingsResult, stockResult, usersResult] = await Promise.all([
        supabase.from('pricing_rates').select('*').order('area_band_min'),
        supabase.from('ewa_settings').select('*').limit(1).single(),
        supabase.from('optional_services').select('*').order('name'),
        supabase.from('system_settings').select('*'),
        adminClient.from('client_stock').select('*').order('created_at', { ascending: false }).limit(100),
        adminClient.from('users').select('*').order('created_at', { ascending: false })
      ])

      console.log('📊 Admin panel: Query results:', {
        pricing: { count: ratesResult.data?.length, error: ratesResult.error },
        ewa: { data: ewaResult.data, error: ewaResult.error },
        services: { count: servicesResult.data?.length, error: servicesResult.error },
        settings: { count: settingsResult.data?.length, error: settingsResult.error },
        stock: {
          count: stockResult.data?.length || 0,
          error: stockResult.error,
          hasData: !!stockResult.data && stockResult.data.length > 0
        },
        users: {
          count: usersResult.data?.length || 0,
          error: usersResult.error,
          hasData: !!usersResult.data && usersResult.data.length > 0
        }
      })

      if (ratesResult.error) throw ratesResult.error
      if (ewaResult.error) throw ewaResult.error
      if (servicesResult.error) throw servicesResult.error
      if (settingsResult.error) throw settingsResult.error

      // Handle stock query errors more gracefully
      if (stockResult.error && stockResult.error.code !== 'PGRST116') {
        console.error('⚠️ Stock query error:', stockResult.error)
      }

      // Handle users query errors
      if (usersResult.error && usersResult.error.code !== 'PGRST116') {
        console.error('⚠️ Users query error:', usersResult.error)
      }

      setPricingRates(ratesResult.data || [])
      setEwaSettings(ewaResult.data)
      setOptionalServices(servicesResult.data || [])
      setSystemSettings(settingsResult.data || [])
      setStockItems(stockResult.data || [])
      setUsers(usersResult.data || [])

      console.log('✅ Admin panel: Data loaded successfully')
      console.log('📊 Final stock items count:', stockItems.length)
    } catch (err) {
      console.error('❌ Admin panel: Error loading data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadOccupantCosts = async () => {
    try {
      console.log('💰 Loading occupant costs...')
      const response = await fetch('/api/admin/occupant-costs')
      
      if (!response.ok) {
        throw new Error('Failed to load occupant costs')
      }
      
      const data = await response.json()
      setOccupantCosts(data.occupants || [])
      setRevenueSummary(data.revenueSummary || null)
      console.log('✅ Occupant costs loaded:', data.occupants?.length || 0)
    } catch (error) {
      console.error('❌ Error loading occupant costs:', error)
      setError('Failed to load occupant costs')
    }
  }

  const handlePricingEdit = (rate: PricingRate) => {
    window.location.href = `/admin/pricing/${rate.id}`
  }

  // Debug function to test stock data
  const testStockData = async () => {
    console.log('🔍 Testing stock data access...')

    try {
      // Test direct database queries
      console.log('📋 Testing direct database queries...')
      try {
        // Test if we can connect to Supabase at all
        const connectionTest = await supabase.from('pricing_rates').select('count', { count: 'exact', head: true })
        console.log('🔗 Supabase connection test:', connectionTest)

        // Test if client_stock table exists
        const stockTableTest = await supabase.from('client_stock').select('count', { count: 'exact', head: true })
        console.log('📊 client_stock table test:', stockTableTest)

        // Test with a simple select
        const simpleStockQuery = await supabase
          .from('client_stock')
          .select('id, client_name, created_at')
          .limit(3)
        console.log('📋 Simple stock query result:', {
          data: simpleStockQuery.data,
          error: simpleStockQuery.error,
          count: simpleStockQuery.data?.length || 0
        })

      } catch (tableError) {
        console.log('📋 Database test error:', tableError)
      }


      // Test with regular client
      console.log('🔧 Testing with regular client...')
      const regularResult = await supabase
        .from('client_stock')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      console.log('📊 Regular client stock data:', regularResult.data)
      console.log('📊 Regular client stock error:', regularResult.error)
      console.log('📊 Regular client count:', regularResult.data?.length || 0)

      // Test environment variables
      console.log('🔧 Environment check:')
      console.log('  - NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log('  - NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

      alert('Check browser console (F12 → Console) for detailed stock data debug information')
    } catch (error) {
      console.error('❌ Stock data test failed:', error)
      alert('Error testing stock data. Check console for details.')
    }
  }

  const handlePricingDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing rate?')) return
    
    try {
      setError(null)
      const { error } = await supabase
        .from('pricing_rates')
        .delete()
        .eq('id', id)
      if (error) throw error
      await loadData()
      alert('Pricing rate deleted successfully! The calculator will update automatically.')
    } catch (err) {
      console.error('Error deleting pricing:', err)
      setError('Failed to delete pricing rate')
    }
  }

  const handleServiceEdit = (service: OptionalService) => {
    window.location.href = `/admin/services/${service.id}`
  }

  const handleServiceDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return
    
    try {
      setError(null)
      const { error } = await supabase
        .from('optional_services')
        .delete()
        .eq('id', id)
      if (error) throw error
      await loadData()
      alert('Service deleted successfully! The calculator will update automatically.')
    } catch (err) {
      console.error('Error deleting service:', err)
      setError('Failed to delete service')
    }
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Checking authentication...</span>
      </div>
    )
  }

  // Show loading while loading data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading Admin Panel...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Warehouse Calculator Admin Panel</h1>
            <p className="text-gray-600 mt-1">Manage pricing, services, and offers</p>
            {user && (
              <p className="text-blue-600 text-sm mt-1">
                Welcome, {user.name} (Admin)
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link 
              href="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Back to Calculator
            </Link>
            <Link 
              href="/warehouses"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              Warehouses
            </Link>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>


        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
            <button
              onClick={loadData}
              className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
                             {[
                 { id: 'pricing', label: 'Pricing Rates', count: pricingRates.length },
                 { id: 'ewa', label: 'EWA Settings', count: 1 },
                 { id: 'services', label: 'Optional Services', count: optionalServices.length },
                 { id: 'stock', label: 'Stock Management', count: stockItems.length },
                 { id: 'users', label: 'User Management', count: users.length },
                 { id: 'occupant-costs', label: 'Occupant Costs', count: occupantCosts.length },
                 { id: 'settings', label: 'System Settings', count: systemSettings.length }
               ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as 'pricing' | 'ewa' | 'services' | 'settings' | 'stock' | 'users' | 'occupant-costs')
                    if (tab.id === 'occupant-costs') {
                      loadOccupantCosts()
                    }
                  }}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {activeTab === 'pricing' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Pricing Rates</h2>
                <Link
                  href="/admin/pricing/new"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Add New Rate
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area Band</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Space Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenure</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Area</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pricingRates.map((rate) => (
                      <tr key={rate.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{rate.area_band_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{rate.space_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{rate.tenure}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{rate.monthly_rate_per_sqm} BHD/m²</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{rate.daily_rate_per_sqm} BHD/m²</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{rate.min_chargeable_area} m²</td>
                        <td className="px-6 py-4 text-sm font-medium space-x-2">
                          <button 
                            onClick={() => handlePricingEdit(rate)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handlePricingDelete(rate.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'ewa' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">EWA Settings</h2>
              {ewaSettings && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900">House Load Description</h3>
                      <p className="text-sm text-gray-600">{ewaSettings.house_load_description}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Dedicated Meter Description</h3>
                      <p className="text-sm text-gray-600">{ewaSettings.dedicated_meter_description}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Setup Deposit</h3>
                      <p className="text-sm text-gray-600">{ewaSettings.estimated_setup_deposit} BHD</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Installation Fee</h3>
                      <p className="text-sm text-gray-600">{ewaSettings.estimated_installation_fee} BHD</p>
                    </div>
                  </div>
                  <a 
                    href={`/admin/ewa/${ewaSettings.id}`}
                    className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Edit Settings
                  </a>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'services' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Optional Services</h2>
                <button
                  onClick={async () => {
                    const newName = prompt('Enter Service Name:')
                    const newDescription = prompt('Enter Description:')
                    const newCategory = prompt('Enter Category (movement/transportation/customs/handling/security):')
                    const newPricingType = prompt('Enter Pricing Type (fixed/hourly/per_event/on_request):')
                    const newRate = prompt('Enter Rate (BHD):')
                    const newUnit = prompt('Enter Unit (e.g., per hour, per event):')

                    if (newName && newCategory && newPricingType) {
                      try {
                        const newService = {
                          name: newName,
                          description: newDescription || '',
                          category: newCategory,
                          pricing_type: newPricingType as 'fixed' | 'hourly' | 'per_event' | 'on_request',
                          rate: parseFloat(newRate || '0') || 0,
                          unit: newUnit || '',
                          active: true
                        }

                        const { error } = await supabase
                          .from('optional_services')
                          .insert(newService)

                        if (error) throw error

                        await loadData()
                        alert('Service added successfully! The calculator will update automatically.')
                      } catch (err) {
                        console.error('Error adding service:', err)
                        setError('Failed to add service')
                      }
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Add New Service
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pricing</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {optionalServices.map((service) => (
                      <tr key={service.id}>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{service.name}</div>
                            <div className="text-sm text-gray-500">{service.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{service.category}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{service.pricing_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {service.rate ? `${service.rate} ${service.unit || 'BHD'}` : 'On request'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium space-x-2">
                          <button 
                            onClick={() => handleServiceEdit(service)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleServiceDelete(service.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Stock Management</h2>
                <div className="flex space-x-3">
                  <Link
                    href="/admin/stock-reports"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Stock Reports
                  </Link>
                  <Link
                    href="/stock"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Advanced Stock Management
                  </Link>
                </div>
              </div>

                                {stockItems.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Stock Items</h3>
                  <p className="text-gray-600 mb-4">
                    No stock items have been added yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Space</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Section</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entry Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stockItems.slice(0, 20).map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.client_name}</div>
                              <div className="text-sm text-gray-500">{item.client_email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.description}</div>
                              <div className="text-sm text-gray-500">{item.product_type}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {item.space_type} ({item.area_used} m²)
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {(item as any).section || item.storage_location?.split(' - ')[0] || 'Not specified'}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.status === 'active' ? 'bg-green-100 text-green-800' :
                              item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(item.entry_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {stockItems.length > 20 && (
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        Showing 20 of {stockItems.length} stock items
                      </p>
                      <Link
                        href="/stock"
                        className="mt-2 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                      >
                        View All Stock
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
                <div className="text-sm text-gray-600">
                  {users.length} registered user{users.length !== 1 ? 's' : ''}
                </div>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
                  <p className="text-gray-600">No users have been registered yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.first_name && user.last_name
                                  ? `${user.first_name} ${user.last_name}`
                                  : user.name || 'Unnamed User'
                                }
                              </div>
                              <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {user.email}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                              user.role === 'MANAGER' ? 'bg-blue-100 text-blue-800' :
                              user.role === 'SUPPORT' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium space-x-2">
                            <button
                              onClick={async () => {
                                if (!confirm(`Are you sure you want to delete user "${user.email}"? This will also delete all their stock data and reclaim their warehouse space.`)) return

                                try {
                                  const adminClient = supabaseAdmin
                                  console.log('🗑️ Starting user deletion process for:', user.email)

                                  // Step 1: Calculate and log space reclamation
                                  console.log('📊 Calculating space reclamation...')

                                  // Get user's total stock space before deletion
                                  const { data: userStock, error: stockQueryError } = await adminClient
                                    .from('client_stock')
                                    .select('area_used, space_type, notes')
                                    .ilike('notes', `%User: ${user.id}%`)
                                    .eq('status', 'active')

                                  let totalStockSpace = 0
                                  const spaceByType: Record<string, number> = {}

                                  if (!stockQueryError && userStock) {
                                    for (const stock of userStock) {
                                      totalStockSpace += stock.area_used || 0
                                      const spaceType = stock.space_type || 'Unknown'
                                      spaceByType[spaceType] = (spaceByType[spaceType] || 0) + (stock.area_used || 0)
                                    }
                                  }

                                  console.log('📊 Space reclamation calculation:', {
                                    userId: user.id,
                                    totalStockSpace,
                                    spaceByType,
                                    stockItemCount: userStock?.length || 0
                                  })

                                  // Step 2: Get user's warehouse bookings to understand space allocation
                                  const { data: userBookings, error: bookingsError } = await adminClient
                                    .from('user_bookings')
                                    .select(`
                                      booking_id,
                                      area_requested,
                                      warehouse_occupants!inner (
                                        warehouse_id,
                                        space_occupied,
                                        floor_type,
                                        warehouses (
                                          name,
                                          total_space,
                                          occupied_space,
                                          mezzanine_space,
                                          mezzanine_occupied
                                        )
                                      )
                                    `)
                                    .eq('user_id', user.id)
                                    .eq('booking_status', 'active')

                                  console.log('🏢 User bookings for space reclamation:', userBookings?.length || 0)

                                  // Step 3: Delete user's stock data first
                                  console.log('🗑️ Deleting user stock data...')
                                  const { error: stockDeleteError } = await adminClient
                                    .from('client_stock')
                                    .delete()
                                    .ilike('notes', `%User: ${user.id}%`)

                                  if (stockDeleteError) {
                                    console.error('❌ Error deleting stock:', stockDeleteError)
                                    throw new Error('Failed to delete user stock')
                                  }

                                  // Step 4: Update warehouse space availability (reclaim space)
                                  if (!bookingsError && userBookings) {
                                    for (const userBooking of userBookings) {
                                      if (userBooking.warehouse_occupants?.warehouses) {
                                        const warehouse = userBooking.warehouse_occupants.warehouses
                                        const floorType = userBooking.warehouse_occupants.floor_type

                                        try {
                                          if (floorType === 'ground' || floorType === 'Ground Floor') {
                                            // Reclaim ground floor space
                                            const newOccupiedSpace = Math.max(0, (warehouse.occupied_space || 0) - totalStockSpace)
                                            await adminClient
                                              .from('warehouses')
                                              .update({
                                                occupied_space: newOccupiedSpace,
                                                updated_at: new Date().toISOString()
                                              })
                                              .eq('id', warehouse.id)

                                            console.log('✅ Reclaimed ground floor space:', {
                                              warehouseId: warehouse.id,
                                              warehouseName: warehouse.name,
                                              previousOccupied: warehouse.occupied_space,
                                              newOccupied: newOccupiedSpace,
                                              reclaimed: totalStockSpace
                                            })
                                          } else if (floorType === 'mezzanine' || floorType === 'Mezzanine') {
                                            // Reclaim mezzanine space
                                            const newMezzanineOccupied = Math.max(0, (warehouse.mezzanine_occupied || 0) - totalStockSpace)
                                            await adminClient
                                              .from('warehouses')
                                              .update({
                                                mezzanine_occupied: newMezzanineOccupied,
                                                updated_at: new Date().toISOString()
                                              })
                                              .eq('id', warehouse.id)

                                            console.log('✅ Reclaimed mezzanine space:', {
                                              warehouseId: warehouse.id,
                                              warehouseName: warehouse.name,
                                              previousOccupied: warehouse.mezzanine_occupied,
                                              newOccupied: newMezzanineOccupied,
                                              reclaimed: totalStockSpace
                                            })
                                          }
                                        } catch (warehouseError) {
                                          console.error('⚠️ Error updating warehouse space:', warehouseError)
                                          // Continue with deletion even if warehouse update fails
                                        }
                                      }
                                    }
                                  }

                                  // Step 5: Delete user's bookings
                                  console.log('🗑️ Deleting user bookings...')
                                  const { error: bookingsDeleteError } = await adminClient
                                    .from('user_bookings')
                                    .delete()
                                    .eq('user_id', user.id)

                                  if (bookingsDeleteError) {
                                    console.warn('⚠️ Error deleting bookings:', bookingsDeleteError)
                                    // Continue with deletion
                                  }

                                  // Step 6: Delete warehouse occupants created by this user
                                  console.log('🗑️ Deleting warehouse occupants...')
                                  const { error: occupantsDeleteError } = await adminClient
                                    .from('warehouse_occupants')
                                    .delete()
                                    .ilike('notes', `%USER:${user.id}%`)

                                  if (occupantsDeleteError) {
                                    console.warn('⚠️ Error deleting occupants:', occupantsDeleteError)
                                    // Continue with deletion
                                  }

                                  // Step 7: Delete user sessions
                                  console.log('🗑️ Deleting user sessions...')
                                  const { error: sessionsDeleteError } = await adminClient
                                    .from('user_sessions')
                                    .delete()
                                    .eq('user_id', user.id)

                                  if (sessionsDeleteError) {
                                    console.warn('⚠️ Error deleting sessions:', sessionsDeleteError)
                                    // Continue with deletion
                                  }

                                  // Step 8: Finally delete the user
                                  console.log('🗑️ Deleting user account...')
                                  const { error: userDeleteError } = await adminClient
                                    .from('users')
                                    .delete()
                                    .eq('id', user.id)

                                  if (userDeleteError) {
                                    console.error('❌ Error deleting user:', userDeleteError)
                                    throw new Error('Failed to delete user account')
                                  }

                                  console.log('✅ User deletion completed successfully:', {
                                    userId: user.id,
                                    email: user.email,
                                    totalStockSpaceReclaimed: totalStockSpace,
                                    spaceByType
                                  })

                                  // Reload data
                                  await loadData()
                                  alert(`User deleted successfully! Reclaimed ${totalStockSpace} m² of warehouse space.`)
                                } catch (error) {
                                  console.error('❌ Error during user deletion:', error)
                                  alert(`Error deleting user: ${error instanceof Error ? error.message : 'Unknown error'}`)
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'occupant-costs' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Occupant Cost Analysis</h2>
                <button
                  onClick={loadOccupantCosts}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Refresh Costs
                </button>
              </div>

              {/* Revenue Summary */}
              {revenueSummary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-green-800 text-sm font-medium">Total Monthly Revenue</div>
                    <div className="text-2xl font-bold text-green-900">
                      BHD {revenueSummary.totalMonthlyRevenue.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="text-blue-800 text-sm font-medium">Total Annual Revenue</div>
                    <div className="text-2xl font-bold text-blue-900">
                      BHD {revenueSummary.totalAnnualRevenue.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="text-purple-800 text-sm font-medium">Active Occupants</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {revenueSummary.activeOccupants}
                    </div>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="text-orange-800 text-sm font-medium">Avg Monthly Cost</div>
                    <div className="text-2xl font-bold text-orange-900">
                      BHD {revenueSummary.averageMonthlyCost.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Occupant Costs Table */}
              {occupantCosts.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Occupant Data</h3>
                  <p className="text-gray-600 mb-4">
                    No active occupants found to calculate costs for.
                  </p>
                  <button
                    onClick={loadOccupantCosts}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Load Occupant Costs
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Occupant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Warehouse
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Space Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monthly Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Annual Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rate/Sqm
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {occupantCosts.map((occupant) => (
                        <tr key={occupant.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {occupant.name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {occupant.contact_info || 'No contact info'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {occupant.warehouses?.name || 'Unknown Warehouse'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {occupant.warehouses?.location || 'Unknown Location'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {occupant.space_occupied} m²
                              </div>
                              <div className="text-sm text-gray-500">
                                {occupant.floor_type === 'ground' ? 'Ground Floor' : 'Mezzanine'}
                                {occupant.section && ` • ${occupant.section}`}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              BHD {occupant.costCalculation?.totalMonthlyCost?.toLocaleString() || '0'}
                            </div>
                            <div className="text-xs text-gray-500">
                              (Warehouse: BHD {occupant.costCalculation?.monthlyCost?.toLocaleString() || '0'})
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              BHD {occupant.costCalculation?.totalAnnualCost?.toLocaleString() || '0'}
                            </div>
                            <div className="text-xs text-gray-500">
                              (Warehouse: BHD {occupant.costCalculation?.annualCost?.toLocaleString() || '0'})
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              BHD {occupant.costCalculation?.ratePerSqm?.toFixed(2) || '0.00'}
                            </div>
                            <div className="text-xs text-gray-500">
                              per m²/month
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              occupant.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {occupant.status || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/admin/occupant-stock/${occupant.id}`}
                              className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md transition-colors"
                            >
                              View Stock
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">System Settings</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {systemSettings.map((setting) => (
                    <div key={setting.id} className="bg-white p-4 rounded border">
                      <h3 className="font-medium text-gray-900 mb-2">{setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                      <p className="text-sm text-gray-600 mb-2">{setting.description}</p>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded">Current: {setting.setting_value}</p>
                      <a
                        href={`/admin/settings/${setting.id}`}
                        className="mt-2 inline-block bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Edit
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
