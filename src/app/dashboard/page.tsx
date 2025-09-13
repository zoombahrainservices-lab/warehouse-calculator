'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface DashboardData {
  userId: string
  summary: {
    totalBookings: number
    totalStockItems: number
    totalAreaUsed: number
    totalStockValue: number
  }
  bookings: Booking[]
  stock: StockItem[]
  warehouses: Warehouse[]
  preferences: UserPreferences | null
  recentActivity: ActivityItem[]
}

interface Booking {
  id: string
  warehouse_id: string
  name: string
  space_occupied: number
  floor_type: string
  status: string
  entry_date: string
  expected_exit_date?: string
}

interface StockItem {
  id: string
  product_name: string
  product_type: string
  quantity: number
  unit: string
  area_used: number
  space_type: string
  status: string
  entry_date: string
  current_quantity?: number
  total_received_quantity?: number
  total_delivered_quantity?: number
  initial_quantity?: number
}

interface UserPreferences {
  selected_warehouse_id?: string
  default_space_type: string
  preferences: Record<string, unknown>
}

interface ActivityItem {
  id: string
  activity_type: string
  activity_details: Record<string, unknown>
  activity_date: string
}

interface Warehouse {
  id: string
  name: string
  location: string
  total_space: number
  has_mezzanine: boolean
  mezzanine_space: number
  status: string
  availability: {
    ground: {
      total_space: number
      occupied_space: number
      available_space: number
      utilization_percentage: number
    } | null
    mezzanine: {
      total_space: number
      occupied_space: number
      available_space: number
      utilization_percentage: number
    } | null
  }
}

interface QuickBookingData {
  warehouseId: string
  spaceType: 'Ground Floor' | 'Mezzanine'
  areaRequested: number
  durationMonths: number
  entryDate: string
  expectedExitDate: string
  notes: string
}

interface Booking {
  booking_id: string
  warehouse_name: string
  space_occupied: number
  floor_type: string
  entry_date: string
  expected_exit_date?: string
  status: string
  booking_status: string
}

interface StockItem {
  id: string
  product_name: string
  product_type: string
  quantity: number
  unit: string
  area_used: number
  space_type: string
  status: string
  booking_id: string
  current_quantity?: number
  total_received_quantity?: number
  total_delivered_quantity?: number
  initial_quantity?: number
}

export default function UserDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Quick booking state
  const [showQuickBooking, setShowQuickBooking] = useState(false)
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  const [bookingForm, setBookingForm] = useState<QuickBookingData>({
    warehouseId: '',
    spaceType: 'Ground Floor',
    areaRequested: 100,
    durationMonths: 6,
    entryDate: new Date().toISOString().split('T')[0],
    expectedExitDate: '',
    notes: ''
  })
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      if (!user || !user.id) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/user/dashboard?userEmail=${encodeURIComponent(user.email)}`, {
        credentials: 'include'
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load dashboard data')
      }

      const data = await response.json()
      setDashboardData(data)
      setError(null)
    } catch (err) {
      console.error('Error loading dashboard:', err)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
  }

  // Quick booking functions
  const handleQuickBooking = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse)
    setBookingForm(prev => ({
      ...prev,
      warehouseId: warehouse.id,
      spaceType: warehouse.has_mezzanine ? 'Ground Floor' : 'Ground Floor'
    }))
    setShowQuickBooking(true)
    setBookingError(null)
    setBookingSuccess(null)
  }

  const handleBookingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setBookingForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }))
  }

  // Calculate expected exit date when duration changes
  useEffect(() => {
    if (bookingForm.entryDate && bookingForm.durationMonths > 0) {
      const entryDate = new Date(bookingForm.entryDate)
      const exitDate = new Date(entryDate)
      exitDate.setMonth(exitDate.getMonth() + bookingForm.durationMonths)
      setBookingForm(prev => ({
        ...prev,
        expectedExitDate: exitDate.toISOString().split('T')[0]
      }))
    }
  }, [bookingForm.entryDate, bookingForm.durationMonths])

  const validateBooking = (): string | null => {
    if (!bookingForm.warehouseId) return 'Please select a warehouse'
    if (!bookingForm.spaceType) return 'Please select a space type'
    if (bookingForm.areaRequested <= 0) return 'Please enter a valid area'

    // Check availability
    const availability = bookingForm.spaceType === 'Ground Floor'
      ? selectedWarehouse?.availability.ground
      : selectedWarehouse?.availability.mezzanine

    if (!availability) return 'Warehouse availability information not available'
    if (bookingForm.areaRequested > availability.available_space) {
      return `Only ${availability.available_space} m² available in ${bookingForm.spaceType}`
    }

    return null
  }

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateBooking()
    if (validationError) {
      setBookingError(validationError)
      return
    }

    try {
      setBookingLoading(true)
      setBookingError(null)
      setBookingSuccess(null)

      const response = await fetch('/api/user/space-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingForm),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create booking')
      }

      const data = await response.json()

      setBookingSuccess(`Space booked successfully! Booking ID: ${data.bookingId}`)

      // Reset form and close modal
      setBookingForm({
        warehouseId: '',
        spaceType: 'Ground Floor',
        areaRequested: 100,
        durationMonths: 6,
        entryDate: new Date().toISOString().split('T')[0],
        expectedExitDate: '',
        notes: ''
      })
      setShowQuickBooking(false)
      setSelectedWarehouse(null)

      // Reload dashboard data to show the new booking
      loadDashboardData()

      // Auto-hide success message
      setTimeout(() => {
        setBookingSuccess(null)
      }, 5000)

    } catch (err) {
      console.error('Error creating booking:', err)
      setBookingError(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setBookingLoading(false)
    }
  }

  const resetBookingForm = () => {
    setBookingForm({
      warehouseId: '',
      spaceType: 'Ground Floor',
      areaRequested: 100,
      durationMonths: 6,
      entryDate: new Date().toISOString().split('T')[0],
      expectedExitDate: '',
      notes: ''
    })
    setSelectedWarehouse(null)
    setBookingError(null)
    setBookingSuccess(null)
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">Manage your warehouse space and stock</p>
              {user && (
                <div className="mt-1">
                  <p className="text-blue-600 text-sm">Welcome, {user.name}</p>
                  <p className="text-gray-500 text-xs">
                    Role: {user.role} • Last login: {new Date().toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/book-space"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Book Space
              </Link>
              <Link
                href="/my-stock"
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                My Stock
              </Link>
              {user && (user.role === 'ADMIN' || user.role === 'MANAGER') && (
                <Link
                  href="/warehouses"
                  className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  All Warehouses
                </Link>
              )}
              {user && user.role === 'SUPPORT' && (
                <Link
                  href="/supporter"
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Support Dashboard
                </Link>
              )}
              {user && user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin Panel
                </Link>
              )}
              {user && (
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-red-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="text-lg font-medium text-red-800">Error Loading Dashboard</h3>
                <p className="text-red-700">{error}</p>
                <button
                  onClick={loadDashboardData}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {dashboardData && (
          <>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.summary.totalBookings}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Stock Items</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.summary.totalStockItems}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Area Used (m²)</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.summary.totalAreaUsed}</p>
                  </div>
                </div>
              </div>


            </div>

          {/* Warehouse Availability Section */}
          {dashboardData?.warehouses && dashboardData.warehouses.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Available Warehouses</h2>
                <div className="text-sm text-gray-600">
                  {dashboardData.warehouses.length} warehouse{dashboardData.warehouses.length !== 1 ? 's' : ''} available
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dashboardData.warehouses.map((warehouse) => (
                  <div key={warehouse.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{warehouse.name}</h3>
                        <p className="text-gray-600 text-sm">{warehouse.location}</p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        warehouse.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {warehouse.status}
                      </span>
                    </div>

                    {/* Ground Floor */}
                    {warehouse.availability.ground && (
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">Ground Floor</span>
                          <span className="text-sm text-gray-600">
                            {warehouse.availability.ground.available_space} m² free
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full ${
                              warehouse.availability.ground.available_space > 0 ? 'bg-green-600' : 'bg-red-600'
                            }`}
                            style={{
                              width: `${Math.min(100, ((warehouse.availability.ground.total_space - warehouse.availability.ground.occupied_space) / warehouse.availability.ground.total_space) * 100)}%`
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {warehouse.availability.ground.occupied_space} / {warehouse.availability.ground.total_space} m² occupied
                        </div>
                      </div>
                    )}

                    {/* Mezzanine Floor */}
                    {warehouse.has_mezzanine && warehouse.availability.mezzanine && (
                      <div className="mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700">Mezzanine</span>
                          <span className="text-sm text-gray-600">
                            {warehouse.availability.mezzanine.available_space} m² free
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full ${
                              warehouse.availability.mezzanine.available_space > 0 ? 'bg-green-600' : 'bg-red-600'
                            }`}
                            style={{
                              width: `${Math.min(100, ((warehouse.availability.mezzanine.total_space - warehouse.availability.mezzanine.occupied_space) / warehouse.availability.mezzanine.total_space) * 100)}%`
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {warehouse.availability.mezzanine.occupied_space} / {warehouse.availability.mezzanine.total_space} m² occupied
                        </div>
                      </div>
                    )}

                    {/* Book Space Button */}
                    <button
                      onClick={() => handleQuickBooking(warehouse)}
                      disabled={
                        (!warehouse.availability.ground || warehouse.availability.ground.available_space <= 0) &&
                        (!warehouse.availability.mezzanine || warehouse.availability.mezzanine.available_space <= 0)
                      }
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                        (!warehouse.availability.ground || warehouse.availability.ground.available_space <= 0) &&
                        (!warehouse.availability.mezzanine || warehouse.availability.mezzanine.available_space <= 0)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {(!warehouse.availability.ground || warehouse.availability.ground.available_space <= 0) &&
                       (!warehouse.availability.mezzanine || warehouse.availability.mezzanine.available_space <= 0)
                        ? 'No Space Available'
                        : 'Book Space'
                      }
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Bookings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">My Active Bookings</h2>
                <Link
                  href="/book-space"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  Book New Space
                </Link>
              </div>

              {dashboardData.bookings.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Bookings</h3>
                  <p className="text-gray-600 mb-4">You haven&apos;t booked any warehouse space yet.</p>
                  <Link
                    href="/book-space"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Book Your First Space
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.bookings.map((booking: Booking) => (
                    <div key={booking.booking_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start space-y-2 md:space-y-0">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">{booking.warehouse_name}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              booking.booking_status === 'active' ? 'bg-green-100 text-green-800' :
                              booking.booking_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {booking.booking_status.charAt(0).toUpperCase() + booking.booking_status.slice(1)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Space:</span> {booking.space_occupied} m² ({booking.floor_type})
                            </div>
                            <div>
                              <span className="font-medium">Entry:</span> {new Date(booking.entry_date).toLocaleDateString()}
                            </div>
                            {booking.expected_exit_date && (
                              <div>
                                <span className="font-medium">Exit:</span> {new Date(booking.expected_exit_date).toLocaleDateString()}
                              </div>
                            )}
                            <div>
                              <span className="font-medium">Status:</span> {booking.status}
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Link
                            href={`/my-stock?bookingId=${booking.booking_id}`}
                            className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                          >
                            View Stock
                          </Link>
                          <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                            Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Stock Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Recent Stock Items</h2>
                <Link
                  href="/my-stock"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  View All Stock
                </Link>
              </div>

              {dashboardData.stock.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Stock Items</h3>
                  <p className="text-gray-600 mb-4">You haven&apos;t added any stock items yet.</p>
                  <Link
                    href="/my-stock"
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Add Your First Stock Item
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.stock.slice(0, 5).map((item: StockItem) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">{item.product_name}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-2">
                            <div>
                              <span className="font-medium">Type:</span> {item.product_type}
                            </div>
                            <div>
                              <span className="font-medium">Quantity:</span> {(item.total_received_quantity || item.quantity).toLocaleString()} {item.unit}
                            </div>
                            <div>
                              <span className="font-medium">Area:</span> {item.area_used} m²
                            </div>
                            <div>
                              <span className="font-medium">Space:</span> {item.space_type}
                            </div>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-4 ${
                          item.status === 'active' ? 'bg-green-100 text-green-800' :
                          item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Quick Booking Modal */}
      {showQuickBooking && selectedWarehouse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Book Space in {selectedWarehouse.name}</h3>
                <button
                  onClick={() => setShowQuickBooking(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Success/Error Messages */}
              {bookingSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-green-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-medium text-green-800">Booking Successful!</h3>
                      <p className="text-green-700">{bookingSuccess}</p>
                    </div>
                  </div>
                </div>
              )}

              {bookingError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-6 h-6 text-red-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-medium text-red-800">Booking Error</h3>
                      <p className="text-red-700">{bookingError}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitBooking} className="space-y-4">
                {/* Warehouse Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{selectedWarehouse.name}</h4>
                  <p className="text-sm text-gray-600">{selectedWarehouse.location}</p>
                </div>

                {/* Space Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Space Type
                  </label>
                  <select
                    name="spaceType"
                    value={bookingForm.spaceType}
                    onChange={handleBookingInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {selectedWarehouse.availability.ground && selectedWarehouse.availability.ground.available_space > 0 && (
                      <option value="Ground Floor">
                        Ground Floor ({selectedWarehouse.availability.ground.available_space} m² available)
                      </option>
                    )}
                    {selectedWarehouse.has_mezzanine && selectedWarehouse.availability.mezzanine && selectedWarehouse.availability.mezzanine.available_space > 0 && (
                      <option value="Mezzanine">
                        Mezzanine ({selectedWarehouse.availability.mezzanine.available_space} m² available)
                      </option>
                    )}
                  </select>
                </div>

                {/* Area Input with Validation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area Requested (m²)
                  </label>
                  <input
                    type="number"
                    name="areaRequested"
                    value={bookingForm.areaRequested}
                    onChange={handleBookingInputChange}
                    min="1"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter area in square meters"
                    required
                  />
                  {selectedWarehouse && (
                    <div className="mt-2 text-sm">
                      {(() => {
                        const availability = bookingForm.spaceType === 'Ground Floor'
                          ? selectedWarehouse.availability.ground
                          : selectedWarehouse.availability.mezzanine

                        if (availability) {
                          const maxAllowed = availability.available_space
                          const currentValue = bookingForm.areaRequested

                          if (currentValue > maxAllowed) {
                            return (
                              <p className="text-red-600">
                                ⚠️ Maximum available: {maxAllowed} m². You requested {currentValue} m².
                              </p>
                            )
                          } else {
                            return (
                              <p className="text-green-600">
                                ✅ Available: {maxAllowed} m². You requested {currentValue} m².
                              </p>
                            )
                          }
                        }
                        return null
                      })()}
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (Months)
                    </label>
                    <input
                      type="number"
                      name="durationMonths"
                      value={bookingForm.durationMonths}
                      onChange={handleBookingInputChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Exit Date
                    </label>
                    <input
                      type="date"
                      name="expectedExitDate"
                      value={bookingForm.expectedExitDate}
                      onChange={handleBookingInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      readOnly
                    />
                  </div>
                </div>

                {/* Entry Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entry Date
                  </label>
                  <input
                    type="date"
                    name="entryDate"
                    value={bookingForm.entryDate}
                    onChange={handleBookingInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={bookingForm.notes}
                    onChange={handleBookingInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Any special requirements or notes..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowQuickBooking(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      (() => {
                        const availability = bookingForm.spaceType === 'Ground Floor'
                          ? selectedWarehouse.availability.ground
                          : selectedWarehouse.availability.mezzanine
                        return availability && bookingForm.areaRequested > availability.available_space
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      })()
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {bookingLoading ? 'Creating Booking...' : 'Book Space'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
