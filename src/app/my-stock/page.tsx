'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

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
  section?: string
  description?: string
  entry_date: string
  expected_exit_date?: string
  updated_at?: string
  current_quantity?: number
  total_received_quantity?: number
  total_delivered_quantity?: number
  initial_quantity?: number
  warehouse_occupants?: {
    name: string
    warehouses: {
      name: string
      location: string
    }
  }
}

interface Booking {
  booking_id: string
  warehouse_name: string
  space_occupied: number
  floor_type: string
  status: string
  booking_status: string
}

interface StockForm {
  bookingId: string
  productName: string
  productType: string
  quantity: number
  unit: string
  description: string
  areaUsed: number
  section: string
}

export default function MyStock() {
  const { user, isLoading: authLoading, logout } = useAuth()
  const searchParams = useSearchParams()
  const bookingIdParam = searchParams.get('bookingId')

  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStock, setEditingStock] = useState<StockItem | null>(null)
  const [selectedBookingId, setSelectedBookingId] = useState<string>(bookingIdParam || '')
  const [formData, setFormData] = useState<StockForm>({
    bookingId: bookingIdParam || '',
    productName: '',
    productType: 'general',
    quantity: 0.0,
    unit: 'pieces',
    description: '',
    areaUsed: 0.0,
    section: ''
  })

  // Simple space warning state
  const [spaceWarning, setSpaceWarning] = useState<string | null>(null)
  
  // Add refresh state for better UX
  const [refreshing, setRefreshing] = useState(false)
  
  // Add notification state for admin updates
  const [adminUpdateNotification, setAdminUpdateNotification] = useState<string | null>(null)

  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      loadData()

      // Disabled aggressive polling - will use manual refresh instead
      // Users can click "Refresh Data" button when needed
      console.log('ℹ️ Polling disabled - use manual refresh when needed')
      
      // Auto-refresh disabled to prevent frequent page refreshes
      // Users can manually refresh when needed
      console.log('ℹ️ Auto-refresh disabled - use manual refresh when needed')

    } else if (user && (user.role === 'ADMIN' || user.role === 'MANAGER')) {
      // Load data for admin users without redirecting
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Clear any admin update notifications when refreshing
      setAdminUpdateNotification(null)

      // Load user's bookings
      const bookingsResponse = await fetch('/api/user/space-bookings')
      let userBookings = []
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json()
        userBookings = bookingsData.bookings || []
        setBookings(userBookings)
        console.log('📋 Loaded user bookings:', userBookings.length)
      } else {
        console.log('⚠️ Could not load user bookings')
      }

      // Load user's stock with strong cache-busting and force refresh
      if (userBookings.length > 0 || !selectedBookingId) {
        const timestamp = Date.now() + Math.random() // Unique timestamp to prevent caching
        const forceRefresh = Math.random() > 0.7 // 30% chance of force refresh for consistency
        const queryParams = new URLSearchParams({
          t: timestamp.toString(),
          ...(forceRefresh && { force: 'true' }),
          ...(selectedBookingId && { bookingId: selectedBookingId })
        })

        console.log('🔄 Fetching stock with cache-busting:', { timestamp, forceRefresh, bookingId: selectedBookingId })

        const stockResponse = await fetch(`/api/user/stock?${queryParams}`, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Requested-With': 'XMLHttpRequest',
            'X-Timestamp': timestamp.toString()
          },
          cache: 'no-store' // Force fresh fetch
        })

        if (stockResponse.ok) {
          const stockData = await stockResponse.json()
          const newStockItems = stockData.stock || []

          // Check if there are quantity changes that might indicate admin updates
          const hasQuantityChanges = stockItems.some(existingItem => {
            const newItem = newStockItems.find((item: StockItem) => item.id === existingItem.id)
            return newItem && (newItem.quantity !== existingItem.quantity ||
                             newItem.updated_at !== existingItem.updated_at)
          })

          if (hasQuantityChanges && stockItems.length > 0) {
            console.log('🔄 Detected quantity changes - possible admin update')
            setAdminUpdateNotification('🔄 Stock quantities have been updated by admin! Click "Refresh Now" to see the latest changes.')
            // Don't auto-dismiss admin update notifications - let user decide
          }

          // Log detailed comparison for debugging
          console.log('📊 Stock data comparison:', {
            existingItems: stockItems.length,
            newItems: newStockItems.length,
            hasChanges: hasQuantityChanges,
            changes: stockItems.map(existingItem => {
              const newItem = newStockItems.find((item: StockItem) => item.id === existingItem.id)
              if (newItem) {
                return {
                  id: existingItem.id,
                  quantityChanged: existingItem.quantity !== newItem.quantity,
                  oldQuantity: existingItem.quantity,
                  newQuantity: newItem.quantity,
                  updatedAtChanged: existingItem.updated_at !== newItem.updated_at
                }
              }
              return null
            }).filter(Boolean)
          })

          setStockItems(newStockItems)
          console.log('📦 Loaded user stock:', newStockItems.length, 'at', stockData.timestamp, 'serverTime:', stockData.serverTime)
        } else {
          console.log('⚠️ Could not load user stock:', stockResponse.status)
          setStockItems([])
        }
      } else {
        console.log('ℹ️ No bookings available, skipping stock load')
        setStockItems([])
      }

      setError(null)
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Function to calculate available space for live validation
  const calculateAvailableSpace = (bookingId: string): number => {
    const booking = bookings.find(b => b.booking_id === bookingId)
    if (!booking) return 0

    // Calculate current usage for this booking
    const currentUsage = stockItems
      .filter(item => item.booking_id === bookingId)
      .reduce((total, item) => total + item.area_used, 0)

    return Math.max(0, booking.space_occupied - currentUsage)
  }

  // Function to show space warning in real-time
  const showSpaceWarning = (bookingId: string, requestedArea: number) => {
    if (!bookingId || requestedArea <= 0) {
      setSpaceWarning(null)
      return
    }

    const availableSpace = calculateAvailableSpace(bookingId)

    if (requestedArea > availableSpace) {
      setSpaceWarning(`⚠️ You can only use ${availableSpace.toFixed(2)} m². Reduce by ${(requestedArea - availableSpace).toFixed(2)} m²`)
    } else {
      setSpaceWarning(null)
    }
  }



  // Function to check booking status and provide diagnostic information
  const checkBookingStatus = async () => {
    try {
      console.log('🔍 Checking user booking status...')
      const response = await fetch('/api/user/space-bookings')
      if (!response.ok) {
        console.error('❌ Failed to fetch bookings:', response.status)
        alert('Failed to check booking status. Please try again.')
        return
      }

      const data = await response.json()
      console.log('📊 User booking status:', {
        totalBookings: data.bookings?.length || 0,
        activeBookings: data.bookings?.filter((b: any) => b.status === 'active').length || 0,
        totalSpace: data.bookings?.reduce((sum: number, b: any) => sum + (b.space_occupied || 0), 0) || 0,
        bookings: data.bookings?.map((b: any) => ({
          id: b.id,
          space_occupied: b.space_occupied,
          floor_type: b.floor_type,
          status: b.status,
          booking_id: b.booking_id
        }))
      })

      const activeBookings = data.bookings?.filter((b: any) => b.status === 'active') || []
      const totalSpace = activeBookings.reduce((sum: number, b: any) => sum + (b.space_occupied || 0), 0)

      alert(`Booking Status Check:\n` +
        `• Total Bookings: ${data.bookings?.length || 0}\n` +
        `• Active Bookings: ${activeBookings.length}\n` +
        `• Total Allocated Space: ${totalSpace} m²\n\n` +
        `Check browser console (F12 → Console) for detailed information.`)
    } catch (error) {
      console.error('❌ Booking status check failed:', error)
      alert('Failed to check booking status. Check console for details.')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    if (type === 'number') {
      // For number inputs, handle empty values and convert to number properly
      const numericValue = value === '' ? 0 : parseFloat(value)
      const finalValue = isNaN(numericValue) ? 0 : numericValue

      setFormData(prev => ({
        ...prev,
        [name]: finalValue
      }))

      // Show live warning for areaUsed field
      if (name === 'areaUsed') {
        setTimeout(() => {
          showSpaceWarning(formData.bookingId, finalValue)
        }, 100) // Small delay to allow state update
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))

      // Clear warning when booking changes
      if (name === 'bookingId') {
        setSpaceWarning(null)
      }
    }
  }

  const handleBookingFilter = (bookingId: string) => {
    setSelectedBookingId(bookingId)
    const newUrl = bookingId ? `/my-stock?bookingId=${bookingId}` : '/my-stock'
    window.history.replaceState({}, '', newUrl)
    loadData()
    // Clear space warning when booking changes
    setSpaceWarning(null)
  }

  // Function to manually check for admin updates
  const checkForAdminUpdates = async () => {
    try {
      setRefreshing(true)
      console.log('🔍 Manually checking for admin updates...')
      
      const timestamp = Date.now() + Math.random()
      const response = await fetch(`/api/user/stock?t=${timestamp}&force=true`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Timestamp': timestamp.toString()
        },
        cache: 'no-store'
      })

      if (response.ok) {
        const data = await response.json()
        const newStockItems = data.stock || []
        
        // Compare with current stock items
        const hasChanges = stockItems.some(existingItem => {
          const newItem = newStockItems.find((item: StockItem) => item.id === existingItem.id)
          return newItem && (newItem.quantity !== existingItem.quantity ||
                           newItem.updated_at !== existingItem.updated_at)
        })

        if (hasChanges) {
          setAdminUpdateNotification('🔄 Admin updates detected! Your stock data has been refreshed.')
          setStockItems(newStockItems)
        } else {
          setSuccess('✅ Stock data is up-to-date. No admin changes detected.')
          setTimeout(() => setSuccess(null), 3000)
        }

        // Log detailed comparison for debugging
        console.log('📊 Admin update check result:', {
          currentItems: stockItems.length,
          newItems: newStockItems.length,
          hasChanges,
          changes: stockItems.map(existingItem => {
            const newItem = newStockItems.find((item: StockItem) => item.id === existingItem.id)
            if (newItem) {
              return {
                id: existingItem.id,
                quantityChanged: existingItem.quantity !== newItem.quantity,
                oldQuantity: existingItem.quantity,
                newQuantity: newItem.quantity,
                updatedAtChanged: existingItem.updated_at !== newItem.updated_at,
                oldUpdatedAt: existingItem.updated_at,
                newUpdatedAt: newItem.updated_at
              }
            }
            return null
          }).filter(Boolean)
        })
      }
    } catch (error) {
      console.error('Error checking for admin updates:', error)
      setError('Failed to check for admin updates')
    } finally {
      setRefreshing(false)
    }
  }

  // Function to detect table synchronization issues
  const detectTableSyncIssues = async () => {
    try {
      console.log('🔍 Detecting table synchronization issues...')
      
      // Check if we can access the stock data
      const response = await fetch('/api/user/stock?t=diagnostic', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Table sync diagnostic:', {
          stockCount: data.stock?.length || 0,
          timestamp: data.timestamp,
          serverTime: data.serverTime,
          dataVersion: data.dataVersion
        })
        
        // Check for potential sync issues
        if (data.stock && data.stock.length > 0) {
          const hasSyncIssues = data.stock.some((item: StockItem) => {
            // Check if item has all required fields
            return !item.id || !item.product_name || item.quantity === undefined
          })
          
          if (hasSyncIssues) {
            console.warn('⚠️ Potential table sync issues detected - some items missing required fields')
            setError('⚠️ Table synchronization issues detected. Some stock items may be corrupted.')
          } else {
            console.log('✅ Table synchronization appears healthy')
            setSuccess('✅ Table synchronization is healthy!')
            setTimeout(() => setSuccess(null), 3000)
          }
        }
      }
    } catch (error) {
      console.error('Error detecting table sync issues:', error)
      setError('Failed to detect table sync issues')
    }
  }

  const validateForm = (): string | null => {
    if (!formData.bookingId) return 'Please select a booking'
    if (!formData.productName.trim()) return 'Please enter a product name'
    if (!formData.productType) return 'Please select a product type'
    if (formData.quantity <= 0) return 'Please enter a valid quantity'
    if (!formData.unit) return 'Please select a unit'
    if (formData.areaUsed < 0) return 'Area used cannot be negative'

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

      const url = editingStock
        ? `/api/user/stock/${editingStock.id}`
        : '/api/user/stock'

      const method = editingStock ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save stock item')
      }

      const data = await response.json()

      setSuccess(editingStock ? 'Stock item updated successfully!' : 'Stock item added successfully!')

      // Reset form and close modal
      setFormData({
        bookingId: selectedBookingId || '',
        productName: '',
        productType: 'general',
        quantity: 0.0,
        unit: 'pieces',
        description: '',
        areaUsed: 0.0,
        section: ''
      })
      setShowAddModal(false)
      setEditingStock(null)

      // Reload data
      loadData()

    } catch (err) {
      console.error('Error saving stock item:', err)
      setError(err instanceof Error ? err.message : 'Failed to save stock item')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (stock: StockItem) => {
    setEditingStock(stock)
    setFormData({
      bookingId: stock.booking_id,
      productName: stock.product_name,
      productType: stock.product_type,
      quantity: stock.quantity,
      unit: stock.unit,
      description: stock.description || '',
      areaUsed: stock.area_used,
      section: (stock as any).section || '' // Handle case where section might not exist in older records
    })

    // Show space warning for existing stock
    setTimeout(() => {
      showSpaceWarning(stock.booking_id, stock.area_used)
    }, 200)

    setShowAddModal(true)
  }

  const handleDelete = async (stockId: string) => {
    if (!confirm('Are you sure you want to delete this stock item? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/user/stock/${stockId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete stock item')
      }

      setSuccess('Stock item deleted successfully!')

      // Reload data
      loadData()

    } catch (err) {
      console.error('Error deleting stock item:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete stock item')
    }
  }

  const handleLogout = () => {
    logout()
  }

  const resetForm = () => {
    setFormData({
      bookingId: selectedBookingId || '',
      productName: '',
      productType: 'general',
      quantity: 0.0,
      unit: 'pieces',
      description: '',
      areaUsed: 0.0,
      section: ''
    })
    setEditingStock(null)
    setError(null)
    setSuccess(null)
    setSpaceWarning(null) // Clear space warning
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
          <p className="mt-4 text-gray-600">Loading your stock...</p>
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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Stock</h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">Manage your warehouse stock items</p>
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
                Dashboard
              </Link>

              <Link
                href="/book-space"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Book Space
              </Link>
              <button
                onClick={() => {
                  resetForm()
                  setShowAddModal(true)
                }}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Stock
              </button>
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
                <h3 className="text-lg font-medium text-green-800">Success!</h3>
                <p className="text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Admin Update Notification */}
        {adminUpdateNotification && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-blue-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-blue-800">Admin Update Detected!</h3>
                <p className="text-blue-700">{adminUpdateNotification}</p>
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => {
                      setRefreshing(true)
                      loadData().finally(() => setRefreshing(false))
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    🔄 Refresh Now
                  </button>
                  <button
                    onClick={() => setAdminUpdateNotification(null)}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-red-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-red-800">Error</h3>
                <div className="text-red-700 whitespace-pre-line mt-2">
                  {error}
                </div>
                {(error.includes('space') || error.includes('booking')) && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-blue-800 text-sm">
                      <strong>💡 Space Issue:</strong> {error.includes('active bookings') ?
                        'You don\'t have any active warehouse bookings. Please book warehouse space first.' :
                        'There may be an issue with space availability calculation.'}
                    </p>
                    <div className="mt-2 flex space-x-2">
                      <Link
                        href="/book-space"
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        📍 Book Space
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Booking Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter by Booking</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBookingFilter('')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedBookingId === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Bookings
            </button>
            {bookings.map((booking) => (
              <button
                key={booking.booking_id}
                onClick={() => handleBookingFilter(booking.booking_id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  selectedBookingId === booking.booking_id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {booking.warehouse_name} ({booking.floor_type}) - {booking.space_occupied}m²
              </button>
            ))}
          </div>
        </div>

        {/* Data Management Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Data Management</h2>
              <p className="text-gray-600 text-sm">Keep your stock data synchronized and healthy</p>
            </div>
          </div>
          
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800 text-sm">
              <strong>💡 Tip:</strong> 
              • Data refreshes automatically every 30 seconds
              • Stock data is synchronized with admin panel
              • All operations use the same database table
            </p>
          </div>
        </div>

        {/* Stock Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900">
              Stock Items {selectedBookingId && '(Filtered)'}
            </h2>
            <div className="text-sm text-gray-600">
              Total: {stockItems.length} items
            </div>
          </div>

          {stockItems.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Stock Items</h3>
              <p className="text-gray-600 mb-4">
                {selectedBookingId
                  ? 'No stock items found for this booking.'
                  : 'You haven\'t added any stock items yet.'
                }
              </p>
              <button
                onClick={() => {
                  resetForm()
                  setShowAddModal(true)
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Add Your First Stock Item
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {stockItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start space-y-4 md:space-y-0">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{item.product_name}</h3>
                          <p className="text-gray-600 text-sm">{item.description}</p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-4 ${
                          item.status === 'active' ? 'bg-green-100 text-green-800' :
                          item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                        </span>
                      </div>

                                                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Type:</span> {item.product_type}
                          </div>
                          <div>
                            <span className="font-medium">Current:</span> {(item.current_quantity || item.quantity).toLocaleString()} {item.unit}
                          </div>
                          <div>
                            <span className="font-medium">Area:</span> {item.area_used} m²
                          </div>
                          <div>
                            <span className="font-medium">Space:</span> {item.space_type}
                          </div>
                        </div>

                       {/* Enhanced Quantity Tracking Display */}
                       <div className="grid grid-cols-3 gap-4 text-sm mt-3 p-3 bg-gray-50 rounded-lg">
                         <div>
                           <span className="font-medium text-gray-700">Current:</span>
                           <p className="text-gray-600 font-semibold">{(item.current_quantity || item.quantity).toLocaleString()} {item.unit}</p>
                         </div>
                         <div>
                           <span className="font-medium text-gray-700">Received:</span>
                           <p className="text-blue-600 font-semibold">{(item.total_received_quantity || item.quantity).toLocaleString()} {item.unit}</p>
                         </div>
                         <div>
                           <span className="font-medium text-gray-700">Delivered:</span>
                           <p className="text-red-600 font-semibold">{(item.total_delivered_quantity || 0).toLocaleString()} {item.unit}</p>
                         </div>
                       </div>

                      {item.warehouse_occupants && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Booking:</span> {item.warehouse_occupants.warehouses.name} - {item.warehouse_occupants.name}
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingStock ? 'Edit Stock Item' : 'Add New Stock Item'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warehouse Booking
                  </label>
                  <select
                    name="bookingId"
                    value={formData.bookingId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a booking...</option>
                    {bookings.filter(b => b.booking_status === 'active').map((booking) => (
                      <option key={booking.booking_id} value={booking.booking_id}>
                        {booking.warehouse_name} - {booking.floor_type} ({booking.space_occupied}m²)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name
                  </label>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Type
                    </label>
                    <select
                      name="productType"
                      value={formData.productType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="general">General</option>
                      <option value="electronics">Electronics</option>
                      <option value="food">Food</option>
                      <option value="metals">Metals</option>
                      <option value="textiles">Textiles</option>
                      <option value="chemicals">Chemicals</option>
                      <option value="automotive">Automotive</option>
                      <option value="pharmaceutical">Pharmaceutical</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity || ''}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter quantity"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit
                    </label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="pieces">Pieces</option>
                      <option value="boxes">Boxes</option>
                      <option value="pallets">Pallets</option>
                      <option value="kg">Kilograms</option>
                      <option value="tons">Tons</option>
                      <option value="liters">Liters</option>
                      <option value="m3">Cubic Meters</option>
                      <option value="containers">Containers</option>
                      <option value="rolls">Rolls</option>
                      <option value="bags">Bags</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area Used (m²) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="areaUsed"
                    value={formData.areaUsed || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    required
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      spaceWarning ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Area occupied in square meters"
                  />

                  {/* Simple Space Warning */}
                  {spaceWarning && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      <div className="flex items-center space-x-2">
                        <span className="text-red-500">⚠️</span>
                        <span>{spaceWarning}</span>
                      </div>
                    </div>
                  )}

                  {!spaceWarning && formData.bookingId && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Enter area to see available space
                    </p>
                  )}
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
                    📍 Optional: Specify exact location within the warehouse
                  </p>
                </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional details about the stock item..."
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Saving...' : (editingStock ? 'Update Stock' : 'Add Stock')}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 