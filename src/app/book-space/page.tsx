'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { cleanNumberInput } from '@/lib/utils'

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

interface BookingForm {
  warehouseId: string
  spaceType: 'Ground Floor' | 'Mezzanine'
  areaRequested: number
  durationMonths: number
  entryDate: string
  expectedExitDate: string
  section: string
  notes: string
}

export default function BookSpace() {
  const { user, isLoading: authLoading, logout } = useAuth()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  const [areaValidation, setAreaValidation] = useState<{
    isValid: boolean
    message: string
    excess?: number
  } | null>(null)
  const [formData, setFormData] = useState<BookingForm>({
    warehouseId: '',
    spaceType: 'Ground Floor',
    areaRequested: 0,
    durationMonths: 1,
    entryDate: new Date().toISOString().split('T')[0],
    expectedExitDate: '',
    section: '',
    notes: ''
  })

  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      loadWarehouses()
    } else if (user && (user.role === 'ADMIN' || user.role === 'MANAGER')) {
      // Redirect admins/managers to admin dashboard
      window.location.href = '/warehouses'
      return
    }
  }, [user])

  // Calculate expected exit date when duration changes
  useEffect(() => {
    if (formData.entryDate && formData.durationMonths > 0) {
      const entryDate = new Date(formData.entryDate)
      const exitDate = new Date(entryDate)
      exitDate.setMonth(exitDate.getMonth() + formData.durationMonths)
      setFormData(prev => ({
        ...prev,
        expectedExitDate: exitDate.toISOString().split('T')[0]
      }))
    }
  }, [formData.entryDate, formData.durationMonths])

  const loadWarehouses = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/user/warehouse-selection')
      if (!response.ok) {
        throw new Error('Failed to load warehouses')
      }

      const data = await response.json()
      setWarehouses(data.warehouses || [])
      setError(null)
    } catch (err) {
      console.error('Error loading warehouses:', err)
      setError('Failed to load warehouses')
    } finally {
      setLoading(false)
    }
  }

  const handleWarehouseSelect = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse)
    setFormData(prev => ({
      ...prev,
      warehouseId: warehouse.id,
      spaceType: warehouse.has_mezzanine ? 'Ground Floor' : 'Ground Floor' // Default to ground floor
    }))
    // Reset area validation when warehouse changes
    setAreaValidation(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    // Handle number inputs specially to prevent leading zeros
    let newValue: string | number
    if (type === 'number') {
      newValue = cleanNumberInput(value)
    } else {
      newValue = value
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }))

    // Real-time validation for area field
    if (name === 'areaRequested' && selectedWarehouse) {
      const availability = formData.spaceType === 'Ground Floor'
        ? selectedWarehouse.availability.ground
        : selectedWarehouse.availability.mezzanine

      if (availability && Number(newValue) > 0) {
        const maxAllowed = availability.available_space
        const excess = Number(newValue) - maxAllowed

        if (Number(newValue) > maxAllowed) {
          setAreaValidation({
            isValid: false,
            message: `Maximum available: ${maxAllowed} m². You requested ${Number(newValue)} m².`,
            excess: excess
          })
        } else {
          setAreaValidation({
            isValid: true,
            message: `Available: ${maxAllowed} m². You requested ${Number(newValue)} m².`
          })
        }
      }
    }

    // Reset area validation when space type changes
    if (name === 'spaceType') {
      setAreaValidation(null)
    }
  }

  const validateForm = (): string | null => {
    if (!formData.warehouseId) return 'Please select a warehouse'
    if (!formData.spaceType) return 'Please select a space type'
    if (formData.areaRequested <= 0) return 'Please enter a valid area'
    if (formData.durationMonths <= 0) return 'Please enter a valid duration'
    if (!formData.entryDate) return 'Please select an entry date'

    // Check availability
    const availability = formData.spaceType === 'Ground Floor'
      ? selectedWarehouse?.availability.ground
      : selectedWarehouse?.availability.mezzanine

    if (!availability) return 'Warehouse availability information not available'

    if (Number(formData.areaRequested) > availability.available_space) {
      const excess = Number(formData.areaRequested) - availability.available_space
      const suggestions = []

      // Suggest alternative space type if available
      const alternativeType = formData.spaceType === 'Ground Floor' ? 'Mezzanine' : 'Ground Floor'
      const alternativeAvailability = alternativeType === 'Ground Floor'
        ? selectedWarehouse?.availability.ground
        : selectedWarehouse?.availability.mezzanine

      if (alternativeAvailability && alternativeAvailability.available_space >= formData.areaRequested) {
        suggestions.push(`Try ${alternativeType} floor (${alternativeAvailability.available_space} m² available)`)
      }

      if (excess <= 20) {
        suggestions.push(`Reduce by ${excess} m² to fit available space`)
      } else {
        suggestions.push(`Reduce by ${excess} m² or choose a different warehouse`)
      }

      return `🚫 Cannot book ${Number(formData.areaRequested)} m². Only ${availability.available_space} m² available in ${formData.spaceType}.\n\n💡 Suggestions:\n${suggestions.map(s => `• ${s}`).join('\n')}`
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/user/space-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create booking')
      }

      const data = await response.json()

      setSuccess(`Space booked successfully! Booking ID: ${data.bookingId}`)

      // Reset form
      setFormData({
        warehouseId: '',
        spaceType: 'Ground Floor',
        areaRequested: 0,
        durationMonths: 1,
        entryDate: new Date().toISOString().split('T')[0],
        expectedExitDate: '',
        section: '',
        notes: ''
      })
      setSelectedWarehouse(null)

      // Reload warehouses to update availability
      loadWarehouses()

    } catch (err) {
      console.error('Error creating booking:', err)
      setError(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => {
    logout()
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
          <p className="mt-4 text-gray-600">Loading warehouses...</p>
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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Book Warehouse Space</h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">Select a warehouse and book your space</p>
              {user && (
                <div className="mt-1">
                  <p className="text-blue-600 text-sm">Welcome, {user.firstName} {user.lastName}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
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
        {/* Success/Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-green-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <h3 className="text-lg font-medium text-green-800">Booking Successful!</h3>
                <p className="text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-red-800">Booking Error</h3>
                <div className="text-red-700 whitespace-pre-line mt-2">
                  {error}
                </div>
                {(error.includes('availability') || error.includes('space')) && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-blue-800 text-sm">
                      <strong>💡 Space Issue:</strong> {error.includes('exceeded') ?
                        'The requested space exceeds available capacity. Please reduce the area or choose a different floor.' :
                        'There may be an issue with space availability calculation. Please try again.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Warehouse Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Select Warehouse</h2>

            <div className="space-y-6">
              {warehouses.map((warehouse) => {
                const hasAvailableSpace = (
                  (warehouse.availability.ground && warehouse.availability.ground.available_space > 0) ||
                  (warehouse.availability.mezzanine && warehouse.availability.mezzanine.available_space > 0)
                )

                const totalAvailable = (
                  (warehouse.availability.ground?.available_space || 0) +
                  (warehouse.availability.mezzanine?.available_space || 0)
                )

                // Get total occupants count for this warehouse
                const totalOccupants = (
                  (warehouse.availability.ground?.occupied_space || 0) +
                  (warehouse.availability.mezzanine?.occupied_space || 0) > 0 ? 1 : 0
                ) // This is a simple estimate; in reality you'd query the occupants table

                return (
                  <div
                    key={warehouse.id}
                    className={`border-2 rounded-xl cursor-pointer transition-all duration-300 ${
                      selectedWarehouse?.id === warehouse.id
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : hasAvailableSpace
                        ? 'border-gray-200 hover:border-blue-300 hover:bg-blue-25 hover:shadow-md'
                        : 'border-red-300 bg-red-50 opacity-75 cursor-not-allowed'
                    }`}
                    onClick={() => hasAvailableSpace && handleWarehouseSelect(warehouse)}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start p-6 pb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{warehouse.name}</h3>
                        <p className="text-gray-600 text-sm mb-2">{warehouse.location}</p>
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            warehouse.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {warehouse.status}
                          </span>
                          {!hasAvailableSpace && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                              🚫 Fully Occupied
                            </span>
                          )}
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                            totalAvailable > 100 ? 'bg-green-100 text-green-800' :
                            totalAvailable > 50 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {totalAvailable.toFixed(0)} m² Available
                          </span>
                        </div>
                      </div>
                      {selectedWarehouse?.id === warehouse.id && (
                        <div className="ml-4">
                          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Quick Space Info */}
                    <div className="px-6 pb-4 text-center">
                      <div className="text-sm text-gray-600">
                        <span className="font-semibold text-green-600">
                          {(warehouse.availability.ground?.available_space || 0).toLocaleString()} m² available
                        </span>
                        {warehouse.has_mezzanine && warehouse.availability.mezzanine && (
                          <span className="ml-2">
                            • Mezzanine: {(warehouse.availability.mezzanine?.available_space || 0).toLocaleString()} m²
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ground Floor Details */}
                    {warehouse.availability.ground && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full ${
                              warehouse.availability.ground.available_space === 0 ? 'bg-red-500' :
                              warehouse.availability.ground.available_space < warehouse.availability.ground.total_space * 0.2 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}></div>
                            <span className="text-sm font-bold text-blue-900">Ground Floor</span>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-blue-600">
                              {warehouse.availability.ground.available_space} m²
                            </div>
                            <div className="text-xs text-blue-700">available space</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                          <div className="text-center">
                            <div className="font-bold text-blue-900">{warehouse.availability.ground.total_space} m²</div>
                            <div className="text-blue-700">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-orange-600">{warehouse.availability.ground.occupied_space} m²</div>
                            <div className="text-blue-700">Occupied</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-green-600">{warehouse.availability.ground.available_space} m²</div>
                            <div className="text-blue-700">Available</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-blue-700">
                            <span>Utilization</span>
                            <span>{warehouse.availability.ground.utilization_percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-blue-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all duration-500 ${
                                warehouse.availability.ground.available_space === 0 ? 'bg-red-600' :
                                warehouse.availability.ground.available_space < warehouse.availability.ground.total_space * 0.2 ? 'bg-yellow-600' :
                                'bg-green-600'
                              }`}
                              style={{
                                width: `${Math.min(100, ((warehouse.availability.ground.total_space - warehouse.availability.ground.occupied_space) / warehouse.availability.ground.total_space) * 100)}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mezzanine Floor Details */}
                    {warehouse.has_mezzanine && warehouse.availability.mezzanine && (
                      <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`w-4 h-4 rounded-full ${
                              warehouse.availability.mezzanine.available_space === 0 ? 'bg-red-500' :
                              warehouse.availability.mezzanine.available_space < warehouse.availability.mezzanine.total_space * 0.2 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}></div>
                            <span className="text-sm font-bold text-green-900">Mezzanine Floor</span>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              {warehouse.availability.mezzanine.available_space} m²
                            </div>
                            <div className="text-xs text-green-700">available space</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                          <div className="text-center">
                            <div className="font-bold text-green-900">{warehouse.availability.mezzanine.total_space} m²</div>
                            <div className="text-green-700">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-orange-600">{warehouse.availability.mezzanine.occupied_space} m²</div>
                            <div className="text-green-700">Occupied</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-green-600">{warehouse.availability.mezzanine.available_space} m²</div>
                            <div className="text-green-700">Available</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-green-700">
                            <span>Utilization</span>
                            <span>{warehouse.availability.mezzanine.utilization_percentage.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-green-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all duration-500 ${
                                warehouse.availability.mezzanine.available_space === 0 ? 'bg-red-600' :
                                warehouse.availability.mezzanine.available_space < warehouse.availability.mezzanine.total_space * 0.2 ? 'bg-yellow-600' :
                                'bg-green-600'
                              }`}
                              style={{
                                width: `${Math.min(100, ((warehouse.availability.mezzanine.total_space - warehouse.availability.mezzanine.occupied_space) / warehouse.availability.mezzanine.total_space) * 100)}%`
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Total Summary */}
                    <div className="pt-4 border-t-2 border-gray-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-lg font-bold text-gray-900">
                            Total Available Space
                          </div>
                          <div className="text-sm text-gray-600">
                            Across all floors
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-3xl font-bold ${
                            totalAvailable === 0 ? 'text-red-600' :
                            totalAvailable < 50 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {totalAvailable.toFixed(1)} m²
                          </div>
                          <div className={`text-sm ${
                            totalAvailable === 0 ? 'text-red-600' :
                            totalAvailable < 50 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {totalAvailable === 0 ? 'No space available' :
                             totalAvailable < 50 ? 'Limited space' :
                             'Good availability'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Selection Status */}
                    <div className="mt-4 text-center">
                      {selectedWarehouse?.id === warehouse.id ? (
                        <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 border-2 border-blue-300">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Selected for booking
                        </div>
                      ) : hasAvailableSpace ? (
                        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          Click to select this warehouse
                        </div>
                      ) : (
                        <div className="text-sm text-red-600 bg-red-100 px-3 py-1 rounded-full border border-red-300">
                          🚫 No space available in this warehouse
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Booking Form */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">Booking Details</h2>

            {/* Selected Warehouse Summary */}
            {selectedWarehouse && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="text-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedWarehouse.name}</h3>
                  <p className="text-gray-600 text-sm">{selectedWarehouse.location}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Ground Floor</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Total Space:</span>
                        <span className="font-semibold">{(selectedWarehouse.total_space || 0).toLocaleString()} m²</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Occupied:</span>
                        <span className="font-semibold text-orange-600">{(selectedWarehouse.availability.ground?.occupied_space || 0).toLocaleString()} m²</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Available:</span>
                        <span className="font-semibold text-green-600">{(selectedWarehouse.availability.ground?.available_space || 0).toLocaleString()} m²</span>
                      </div>
                    </div>
                  </div>

                  {selectedWarehouse.has_mezzanine && selectedWarehouse.availability.mezzanine && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Mezzanine Floor</h4>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Total Space:</span>
                          <span className="font-semibold">{(selectedWarehouse.mezzanine_space || 0).toLocaleString()} m²</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Occupied:</span>
                          <span className="font-semibold text-orange-600">{(selectedWarehouse.availability.mezzanine?.occupied_space || 0).toLocaleString()} m²</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Available:</span>
                          <span className="font-semibold text-green-600">{(selectedWarehouse.availability.mezzanine?.available_space || 0).toLocaleString()} m²</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 text-center text-sm text-gray-600">
                  <div className="flex justify-center space-x-4">
                    <span>Ground: {selectedWarehouse.availability.ground ?
                      ((selectedWarehouse.availability.ground.occupied_space / selectedWarehouse.availability.ground.total_space) * 100).toFixed(1) : '0'
                    }% utilized</span>
                    {selectedWarehouse.has_mezzanine && selectedWarehouse.availability.mezzanine && (
                      <span>• Mezzanine: {((selectedWarehouse.availability.mezzanine.occupied_space / selectedWarehouse.availability.mezzanine.total_space) * 100).toFixed(1)}% utilized</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedWarehouse ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selected Warehouse
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{selectedWarehouse.name}</p>
                    <p className="text-sm text-gray-600">{selectedWarehouse.location}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Space Type
                  </label>
                  <select
                    name="spaceType"
                    value={formData.spaceType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Ground Floor">Ground Floor</option>
                    {selectedWarehouse.has_mezzanine && (
                      <option value="Mezzanine">Mezzanine</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section/Rack Location
                  </label>
                  <input
                    type="text"
                    name="section"
                    value={formData.section}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., A-1, Rack 5, Shelf 3"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    📍 Optional: Specify exact location within the warehouse floor
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area Requested (m²)
                  </label>
                  <input
                    type="number"
                    name="areaRequested"
                    value={formData.areaRequested || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.1"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      (() => {
                        if (!selectedWarehouse || formData.areaRequested <= 0) return 'border-gray-300'
                        const availability = formData.spaceType === 'Ground Floor'
                          ? selectedWarehouse.availability.ground
                          : selectedWarehouse.availability.mezzanine
                        if (!availability) return 'border-gray-300'
                        return formData.areaRequested > availability.available_space
                          ? 'border-red-500 bg-red-50'
                          : 'border-green-500 bg-green-50'
                      })()
                    }`}
                    placeholder="Enter area in square meters"
                  />

                  {/* Real-time Validation Feedback */}
                  {areaValidation && formData.areaRequested > 0 && (
                    <div className="mt-2">
                      <div className={`border rounded-lg p-3 ${
                        areaValidation.isValid
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center space-x-2 text-sm font-medium mb-1">
                          <div className={`w-2 h-2 rounded-full ${
                            areaValidation.isValid ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span className={areaValidation.isValid ? 'text-green-800' : 'text-red-800'}>
                            {areaValidation.isValid ? '✅ Space Available' : '⚠️ Space Request Exceeds Availability'}
                          </span>
                        </div>
                        <div className={`text-sm space-y-1 ${
                          areaValidation.isValid ? 'text-green-700' : 'text-red-700'
                        }`}>
                          <p>{areaValidation.message}</p>
                          {areaValidation.excess && areaValidation.excess > 0 && (
                            <p className="text-xs mt-2">
                              💡 <em>Reduce your request by {areaValidation.excess} m² or select a different warehouse/floor</em>
                            </p>
                          )}
                          {selectedWarehouse && (
                            <p className="text-xs mt-1">
                              📊 Current utilization: {
                                (() => {
                                  const availability = formData.spaceType === 'Ground Floor'
                                    ? selectedWarehouse.availability.ground
                                    : selectedWarehouse.availability.mezzanine
                                  if (availability) {
                                    const utilizationPercent = ((availability.total_space - availability.available_space) / availability.total_space) * 100
                                    return <strong>{utilizationPercent.toFixed(1)}%</strong>
                                  }
                                  return 'N/A'
                                })()
                              }
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (Months)
                    </label>
                    <input
                      type="number"
                      name="durationMonths"
                      value={formData.durationMonths || ''}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Entry Date
                    </label>
                    <input
                      type="date"
                      name="entryDate"
                      value={formData.entryDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Exit Date
                  </label>
                  <input
                    type="date"
                    name="expectedExitDate"
                    value={formData.expectedExitDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Any special requirements or notes..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Booking...
                    </div>
                  ) : (
                    'Book Space'
                  )}
                </button>
              </form>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Warehouse</h3>
                <p className="text-gray-600">Choose a warehouse from the list to start booking your space.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
