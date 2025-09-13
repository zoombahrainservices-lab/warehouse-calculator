'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

interface Warehouse {
  id: string
  name: string
  location: string
  total_space: number
  occupied_space: number
  free_space: number
  has_mezzanine: boolean
  mezzanine_space: number
  mezzanine_occupied: number
  mezzanine_free: number
  description?: string
  status: 'active' | 'inactive' | 'maintenance'
  created_at: string
  updated_at: string
}

interface WarehouseOccupant {
  id: string
  warehouse_id: string
  name: string
  contact_info?: string
  space_occupied: number
  floor_type: 'ground' | 'mezzanine'
  section?: string
  entry_date: string
  expected_exit_date?: string
  status: 'active' | 'completed' | 'pending'
  notes?: string
  created_at: string
  updated_at: string
}

export default function Warehouses() {
  console.log('🏭 Warehouse page initializing...')

  // Check URL parameters for debug mode
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const debugMode = urlParams.get('debug') === 'true'

  console.log('🏭 Debug mode:', debugMode)

  const { user, isLoading: authLoading, logout } = useAuth({
    requiredRole: 'ADMIN',
    redirectTo: '/login'
  })
  console.log('🏭 useAuth result:', { user, authLoading, userRole: user?.role })

  // Add manual role check as backup
  const hasAdminAccess = user && (user.role === 'ADMIN' || user.role === 'MANAGER' || user.role === 'SUPPORT')

  // If debug mode is enabled, bypass authentication
  const bypassAuth = debugMode && typeof window !== 'undefined'

  console.log('🏭 Admin access check:', {
    user: !!user,
    userRole: user?.role,
    hasAdminAccess: hasAdminAccess,
    authLoading: authLoading,
    bypassAuth: bypassAuth
  })

  // If in debug mode, simulate admin user
  const debugUser = bypassAuth ? {
    id: 'debug-admin',
    email: 'admin@debug.com',
    role: 'ADMIN' as const,
    firstName: 'Debug',
    lastName: 'Admin'
  } : null

  const debugHasAdminAccess = bypassAuth || hasAdminAccess

  // Add emergency manual authentication check
  useEffect(() => {
    if (!authLoading) {
      console.log('🏭 Manual auth check after loading complete')
      const sessionToken = localStorage.getItem('sessionToken')
      const userData = localStorage.getItem('user')

      if (sessionToken && userData) {
        try {
          const manualUser = JSON.parse(userData)
          console.log('🏭 Manual user check:', {
            role: manualUser.role,
            email: manualUser.email,
            hasAdminRole: ['ADMIN', 'MANAGER', 'SUPPORT'].includes(manualUser.role)
          })
        } catch (error) {
          console.error('🏭 Error parsing manual user data:', error)
        }
      } else {
        console.log('🏭 No manual session data found')
      }
    }
  }, [authLoading])

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseOccupants, setWarehouseOccupants] = useState<WarehouseOccupant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'maintenance'>('all')
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState(false)
  const [showAddOccupantModal, setShowAddOccupantModal] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)
  const [editingOccupant, setEditingOccupant] = useState<WarehouseOccupant | null>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check authentication status on component mount
  useEffect(() => {
    console.log('🏭 useEffect triggered:', {
      hasUser: !!user,
      authLoading: authLoading,
      userEmail: user?.email,
      userRole: user?.role,
      userObj: user,
      debugMode: bypassAuth,
      debugUser: debugUser?.email
    })

    if (user || bypassAuth) {
      const activeUser = bypassAuth ? debugUser : user
      console.log('✅ Admin warehouse page - User authenticated:', {
        email: activeUser?.email,
        role: activeUser?.role,
        fullUser: activeUser,
        isDebugMode: bypassAuth
      })

      // Since useAuth already checked the role, we can safely assume the user has admin access
      if (activeUser?.role === 'ADMIN' || activeUser?.role === 'MANAGER' || activeUser?.role === 'SUPPORT' || bypassAuth) {
        console.log('✅ User has admin-level access, granting access to warehouse management')
        setIsAdmin(true)
      } else {
        console.log('❌ User does not have admin access:', {
          role: activeUser?.role,
          expectedRoles: ['ADMIN', 'MANAGER', 'SUPPORT']
        })
        console.log('🔄 Redirecting to warehouse view due to insufficient permissions')
        // This shouldn't happen because useAuth should have redirected already
        window.location.href = '/warehouses/view'
      }
    } else if (!authLoading) {
      console.log('❌ No user found and not loading, should have been redirected by useAuth')
      console.log('🔄 Redirecting to login due to missing user')
      // useAuth should handle this case, but as a fallback
      window.location.href = '/login'
    } else {
      console.log('⏳ Still loading authentication...')
    }
  }, [user, authLoading, bypassAuth, debugUser])

  useEffect(() => {
    loadWarehouseData()
  }, [])

  const loadWarehouseData = async () => {
    try {
      setLoading(true)

      // Load warehouses
      const { data: warehousesData, error: warehousesError } = await supabase
        .from('warehouses')
        .select('*')
        .order('created_at', { ascending: false })

      if (warehousesError) {
        console.error('Error loading warehouses:', warehousesError)
        if (warehousesError.code === 'PGRST116') {
          setError('Database tables not found. Please run the WAREHOUSE_DATABASE_SETUP.sql script in your Supabase SQL Editor first.')
        } else {
          setError(`Failed to load warehouses: ${warehousesError.message}`)
        }
        return
      }

      setWarehouses(warehousesData || [])

      // Load all occupants (both admin and user bookings)
      const { data: occupantsData, error: occupantsError } = await supabase
        .from('warehouse_occupants')
        .select('*')
        .order('created_at', { ascending: false })

      if (occupantsError) {
        console.error('Error loading occupants:', occupantsError)
        setError('Failed to load occupants')
        return
      }

      // Also try to load user bookings if the table exists
      let allBookings = occupantsData || []
      try {
        const { data: userBookings, error: userBookingsError } = await supabase
          .from('user_bookings')
          .select(`
            *,
            warehouse_occupants (
              id,
              warehouse_id,
              user_id,
              name,
              contact_info,
              space_occupied,
              floor_type,
              entry_date,
              expected_exit_date,
              status,
              notes,
              created_at,
              updated_at
            )
          `)
          .order('created_at', { ascending: false })

        if (!userBookingsError && userBookings) {
          // Add user bookings to the list, avoiding duplicates
          const occupantIds = new Set(allBookings.map(b => b.id))
          const additionalBookings = userBookings
            .filter(booking => booking.warehouse_occupants && !occupantIds.has(booking.warehouse_occupants.id))
            .map(booking => ({
              ...booking.warehouse_occupants,
              booking_id: booking.booking_id,
              booking_status: booking.booking_status,
              booking_notes: booking.booking_notes,
              user_id: booking.user_id,
              is_user_booking: true
            }))

          allBookings = [...allBookings, ...additionalBookings]
          console.log('✅ Loaded additional user bookings:', additionalBookings.length)
        }
      } catch (userBookingError) {
        console.log('⚠️ Could not load user bookings (table may not exist):', userBookingError)
      }

      console.log('📊 Total occupants loaded:', allBookings.length)
      setWarehouseOccupants(allBookings)
      setError(null)
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load warehouse data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
  }

  const addWarehouse = async () => {
    try {
      const warehouseId = crypto.randomUUID()
      
      const warehouseData = {
        id: warehouseId,
        name: editingWarehouse?.name || '',
        location: editingWarehouse?.location || '',
        total_space: editingWarehouse?.total_space || 0,
        has_mezzanine: editingWarehouse?.has_mezzanine || false,
        mezzanine_space: editingWarehouse?.mezzanine_space || 0,
        mezzanine_occupied: 0,
        description: editingWarehouse?.description || '',
        status: editingWarehouse?.status || 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('Attempting to insert warehouse data:', warehouseData)

      // Try to insert into warehouses table
      console.log('Attempting to insert into warehouses table...')
      const { error } = await supabase
        .from('warehouses')
        .insert([warehouseData])

      if (error) {
        console.error('Error adding warehouse:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        alert(`Failed to add warehouse: ${error.message}`)
        return
      }

      // Reset form and close modal
      setEditingWarehouse({
        id: '',
        name: '',
        location: '',
        total_space: 0,
        occupied_space: 0,
        free_space: 0,
        has_mezzanine: false,
        mezzanine_space: 0,
        mezzanine_occupied: 0,
        mezzanine_free: 0,
        description: '',
        status: 'active',
        created_at: '',
        updated_at: ''
      })
      setShowAddWarehouseModal(false)
      loadWarehouseData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to add warehouse')
    }
  }

  const updateWarehouse = async () => {
    if (!editingWarehouse) return

    try {
      const { error } = await supabase
        .from('warehouses')
        .update({
          name: editingWarehouse.name,
          location: editingWarehouse.location,
          total_space: editingWarehouse.total_space,
          has_mezzanine: editingWarehouse.has_mezzanine,
          mezzanine_space: editingWarehouse.mezzanine_space,
          description: editingWarehouse.description,
          status: editingWarehouse.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingWarehouse.id)

      if (error) {
        console.error('Error updating warehouse:', error)
        alert('Failed to update warehouse')
        return
      }

      setEditingWarehouse(null)
      loadWarehouseData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to update warehouse')
    }
  }

  const deleteWarehouse = async (warehouseId: string) => {
    if (!confirm('Are you sure you want to delete this warehouse? This action cannot be undone.')) {
      return
    }

    try {
      // First delete all occupants for this warehouse
      const { error: occupantsError } = await supabase
        .from('warehouse_occupants')
        .delete()
        .eq('warehouse_id', warehouseId)

      if (occupantsError) {
        console.error('Error deleting occupants:', occupantsError)
        alert('Failed to delete warehouse occupants')
        return
      }

      // Then delete the warehouse
      const { error } = await supabase
        .from('warehouses')
        .delete()
        .eq('id', warehouseId)

      if (error) {
        console.error('Error deleting warehouse:', error)
        alert('Failed to delete warehouse')
        return
      }

      loadWarehouseData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to delete warehouse')
    }
  }

  const addOccupant = async () => {
    if (!selectedWarehouse || !editingOccupant) return

    // Validate space availability
    const validationError = validateOccupantSpace(editingOccupant, selectedWarehouse, warehouseOccupants)
    if (validationError) {
      alert(validationError)
      return
    }

    try {
      const occupantId = crypto.randomUUID()
      
      const occupantData = {
        id: occupantId,
        warehouse_id: selectedWarehouse.id,
        name: editingOccupant.name,
        contact_info: editingOccupant.contact_info || '',
        space_occupied: editingOccupant.space_occupied,
        floor_type: editingOccupant.floor_type,
        section: editingOccupant.section || '',
        entry_date: editingOccupant.entry_date,
        expected_exit_date: editingOccupant.expected_exit_date || '',
        status: editingOccupant.status,
        notes: editingOccupant.notes || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('Attempting to insert occupant data:', occupantData)

      // Try to insert into warehouse_occupants table
      console.log('Attempting to insert into warehouse_occupants table...')
      const { error } = await supabase
        .from('warehouse_occupants')
        .insert([occupantData])

      if (error) {
        console.error('Error adding occupant:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        alert(`Failed to add occupant: ${error.message}`)
        return
      }

      // Reset form and close modal
      setEditingOccupant(null)
      setShowAddOccupantModal(false)
      loadWarehouseData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to add occupant')
    }
  }

  const updateOccupant = async () => {
    if (!editingOccupant) return

    // Find the warehouse for this occupant
    const warehouse = warehouses.find(w => w.id === editingOccupant.warehouse_id)
    if (!warehouse) {
      alert('Warehouse not found for this occupant')
      return
    }

    // Validate space availability (excluding current occupant's space)
    const validationError = validateOccupantSpace(editingOccupant, warehouse, warehouseOccupants, editingOccupant.id)
    if (validationError) {
      alert(validationError)
      return
    }

    try {
      const { error } = await supabase
        .from('warehouse_occupants')
        .update({
          name: editingOccupant.name,
          contact_info: editingOccupant.contact_info,
          space_occupied: editingOccupant.space_occupied,
          floor_type: editingOccupant.floor_type,
          section: editingOccupant.section,
          entry_date: editingOccupant.entry_date,
          expected_exit_date: editingOccupant.expected_exit_date,
          status: editingOccupant.status,
          notes: editingOccupant.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingOccupant.id)

      if (error) {
        console.error('Error updating occupant:', error)
        alert('Failed to update occupant')
        return
      }

      setEditingOccupant(null)
      loadWarehouseData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to update occupant')
    }
  }

  const deleteOccupant = async (occupantId: string) => {
    if (!confirm('Are you sure you want to delete this occupant? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('warehouse_occupants')
        .delete()
        .eq('id', occupantId)

      if (error) {
        console.error('Error deleting occupant:', error)
        alert('Failed to delete occupant')
        return
      }

      loadWarehouseData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to delete occupant')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const initializeNewOccupant = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse)
    setEditingOccupant({
      id: '',
      warehouse_id: warehouse.id,
      name: '',
      contact_info: '',
      space_occupied: 0,
      floor_type: 'ground',
      section: '',
      entry_date: new Date().toISOString().split('T')[0],
      expected_exit_date: '',
      status: 'active',
      notes: '',
      created_at: '',
      updated_at: ''
    })
    setShowAddOccupantModal(true)
  }

  const validateOccupantSpace = (
    occupant: WarehouseOccupant, 
    warehouse: Warehouse, 
    allOccupants: WarehouseOccupant[], 
    excludeOccupantId?: string
  ): string | null => {
    // Get current occupants for this warehouse (excluding the one being edited if updating)
    const currentOccupants = allOccupants.filter(o => 
      o.warehouse_id === warehouse.id && 
      o.id !== excludeOccupantId &&
      o.status === 'active'
    )

    // Calculate current space usage by floor type
    const groundFloorOccupied = currentOccupants
      .filter(o => o.floor_type === 'ground')
      .reduce((sum, o) => sum + o.space_occupied, 0)
    
    const mezzanineOccupied = currentOccupants
      .filter(o => o.floor_type === 'mezzanine')
      .reduce((sum, o) => sum + o.space_occupied, 0)

    // Calculate available space
    const groundFloorAvailable = warehouse.total_space - groundFloorOccupied
    const mezzanineAvailable = warehouse.has_mezzanine ? warehouse.mezzanine_space - mezzanineOccupied : 0

    // Validate based on floor type
    if (occupant.floor_type === 'ground') {
      if (occupant.space_occupied > groundFloorAvailable) {
        return `Ground floor space exceeded! Available: ${groundFloorAvailable.toLocaleString()} m², Requested: ${occupant.space_occupied.toLocaleString()} m²`
      }
    } else if (occupant.floor_type === 'mezzanine') {
      if (!warehouse.has_mezzanine) {
        return 'This warehouse does not have a mezzanine floor'
      }
      if (occupant.space_occupied > mezzanineAvailable) {
        return `Mezzanine space exceeded! Available: ${mezzanineAvailable.toLocaleString()} m², Requested: ${occupant.space_occupied.toLocaleString()} m²`
      }
    }

    // Validate minimum space
    if (occupant.space_occupied <= 0) {
      return 'Space occupied must be greater than 0 m²'
    }

    // Validate maximum space (can't exceed warehouse total)
    if (occupant.space_occupied > warehouse.total_space) {
      return `Space occupied (${occupant.space_occupied.toLocaleString()} m²) cannot exceed warehouse total space (${warehouse.total_space.toLocaleString()} m²)`
    }

    return null // No validation errors
  }

  const getSpaceAvailability = (warehouse: Warehouse, floorType: 'ground' | 'mezzanine'): { available: number; occupied: number; total: number } => {
    const currentOccupants = warehouseOccupants.filter(o => 
      o.warehouse_id === warehouse.id && 
      o.status === 'active' &&
      o.floor_type === floorType
    )

    const occupied = currentOccupants.reduce((sum, o) => sum + o.space_occupied, 0)
    const total = floorType === 'ground' ? warehouse.total_space : (warehouse.has_mezzanine ? warehouse.mezzanine_space : 0)
    const available = total - occupied

    return { available, occupied, total }
  }

  // Filter warehouses based on search term and status
  const filteredWarehouses = warehouses.filter(warehouse => {
    const matchesSearch = warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         warehouse.location.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || warehouse.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Show loading while checking authentication
  if (authLoading) {
    console.log('🏭 Showing auth loading screen...')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking admin authentication...</p>
          <p className="mt-2 text-sm text-gray-500">This may take a few seconds...</p>
        </div>
      </div>
    )
  }

  // Check if user exists and has admin role (or debug mode)
  if ((!user || !hasAdminAccess) && !bypassAuth) {
    console.log('🏭 Access denied - showing auth required screen...')
    console.log('🏭 User data:', user)
    console.log('🏭 Has admin access:', hasAdminAccess)
    console.log('🏭 Auth loading:', authLoading)

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-red-600">Admin authentication required.</p>
          <p className="mt-2 text-sm text-gray-500">
            {!user ? 'No user session found.' : `User role: ${user.role} (requires ADMIN/MANAGER/SUPPORT)`}
          </p>
          <div className="mt-4 space-x-4">
            <button
              onClick={() => window.location.href = '/debug'}
              className="text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Debug Authentication
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="text-green-600 hover:text-green-800 text-sm underline"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    console.log('🏭 Showing data loading screen...')
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading warehouse data...</p>
        </div>
      </div>
    )
  }



  return (
    <div className="min-h-screen bg-gray-50">
      {bypassAuth && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-800">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Debug Mode Active:</strong> Authentication bypassed for testing. Remove <code>?debug=true</code> from URL to return to normal authentication.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {bypassAuth ? 'Warehouse Management (Debug Mode)' : 'Warehouse Management'}
              </h1>
                              <p className="text-gray-600 mt-1 text-sm md:text-base">
                  {bypassAuth ? 'Debug mode - authentication bypassed' : 'Manage warehouses, occupants, and space tracking'}
                </p>
              {(user || bypassAuth) && (
                <div className="mt-1">
                  <p className="text-blue-600 text-sm">
                    Welcome, {bypassAuth && debugUser ? 
                      `${debugUser.firstName} ${debugUser.lastName}` : 
                      user?.name || user?.email
                    }
                    {bypassAuth && <span className="text-yellow-600"> (Debug User)</span>}
                  </p>
                  <p className="text-gray-500 text-xs">Role: {user?.role} 🔴</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setEditingWarehouse({
                    id: '',
                    name: '',
                    location: '',
                    total_space: 0,
                    occupied_space: 0,
                    free_space: 0,
                    has_mezzanine: false,
                    mezzanine_space: 0,
                    mezzanine_occupied: 0,
                    mezzanine_free: 0,
                    description: '',
                    status: 'active',
                    created_at: '',
                    updated_at: ''
                  })
                  setShowAddWarehouseModal(true)
                }}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                + Add Warehouse
              </button>

              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
              <Link
                href="/calculator"
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                ← Back to Calculator
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6 md:mb-8">
          <div className="flex flex-col gap-3 md:flex-row md:gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search warehouses by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive' | 'maintenance')}
                className="w-full md:w-auto px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-red-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <h3 className="text-lg font-medium text-red-800">Database Setup Required</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Warehouses List */}
        <div className="space-y-4 md:space-y-6">
          {filteredWarehouses.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No warehouses found</h3>
              <p className="text-gray-600">No warehouses match your search criteria.</p>
            </div>
          ) : (
            filteredWarehouses.map(warehouse => {
              const currentWarehouseOccupants = warehouseOccupants.filter(occupant => occupant.warehouse_id === warehouse.id)
              
              return (
                <Link key={warehouse.id} href={`/warehouses/${warehouse.id}`} className="block">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    {/* Warehouse Header */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 md:px-6 py-4 border-b border-gray-200">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start space-y-2 md:space-y-0">
                        <div className="flex-1">
                          <h3 className="text-lg md:text-xl font-semibold text-gray-900">{warehouse.name}</h3>
                          <p className="text-gray-600 text-sm md:text-base">{warehouse.location}</p>
                          {warehouse.description && (
                            <p className="text-gray-500 text-sm mt-1">{warehouse.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            warehouse.status === 'active' ? 'bg-green-100 text-green-800' :
                            warehouse.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {warehouse.status.charAt(0).toUpperCase() + warehouse.status.slice(1)}
                          </span>
                          {user?.role === 'ADMIN' && (
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                initializeNewOccupant(warehouse)
                              }}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Add Occupant"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              setEditingWarehouse(warehouse)
                              setShowAddWarehouseModal(true)
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              deleteWarehouse(warehouse.id)
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Warehouse Space Summary */}
                    <div className="bg-blue-50 px-4 md:px-6 py-4 border-b border-blue-200">
                      <div className="flex items-center justify-center mb-2">
                        <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <h3 className="text-sm font-medium text-blue-900">Warehouse Space Summary</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
                        <div className="text-center">
                          <div className="text-base md:text-lg font-bold text-blue-600">{warehouse.total_space.toLocaleString()}</div>
                          <div className="text-xs text-gray-600">Ground Floor (m²)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-base md:text-lg font-bold text-orange-600">{warehouse.occupied_space.toLocaleString()}</div>
                          <div className="text-xs text-gray-600">Occupied (m²)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-base md:text-lg font-bold text-green-600">{warehouse.free_space.toLocaleString()}</div>
                          <div className="text-xs text-gray-600">Available (m²)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-base md:text-lg font-bold text-purple-600">{currentWarehouseOccupants.length}</div>
                          <div className="text-xs text-gray-600">Occupants</div>
                        </div>
                      </div>
                      {warehouse.has_mezzanine && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="text-xs text-blue-700 font-medium mb-2 text-center">Mezzanine Floor</div>
                          <div className="grid grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm">
                            <div className="text-center">
                              <div className="text-sm font-bold text-blue-600">{warehouse.mezzanine_space.toLocaleString()}</div>
                              <div className="text-xs text-gray-600">Total (m²)</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-bold text-orange-600">{warehouse.mezzanine_occupied.toLocaleString()}</div>
                              <div className="text-xs text-gray-600">Occupied (m²)</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-bold text-green-600">{warehouse.mezzanine_free.toLocaleString()}</div>
                              <div className="text-xs text-gray-600">Available (m²)</div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="mt-2 text-xs text-gray-500 text-center">
                        Ground Floor Utilization: {((warehouse.occupied_space / warehouse.total_space) * 100).toFixed(1)}%
                        {warehouse.has_mezzanine && (
                          <span className="ml-2">
                            • Mezzanine: {warehouse.mezzanine_space > 0 ? ((warehouse.mezzanine_occupied / warehouse.mezzanine_space) * 100).toFixed(1) : '0'}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Occupants Summary - Only for Admin */}
                    {user?.role === 'ADMIN' && (
                      <div className="px-4 md:px-6 py-4 bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">
                              {currentWarehouseOccupants.length} Occupant{currentWarehouseOccupants.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            Click warehouse to view details
                          </div>
                        </div>
                        
                        {currentWarehouseOccupants.length > 0 && (
                          <div className="space-y-2">
                            {currentWarehouseOccupants.slice(0, 3).map((occupant) => (
                              <div key={occupant.id} className="flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{occupant.name}</span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                  occupant.floor_type === 'ground' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {occupant.floor_type === 'ground' ? 'Ground' : 'Mezzanine'}
                                </span>
                                {occupant.section && (
                                  <span className="text-gray-500">({occupant.section})</span>
                                )}
                              </div>
                              <span className="text-gray-600">{occupant.space_occupied} m²</span>
                            </div>
                          ))}
                          {currentWarehouseOccupants.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{currentWarehouseOccupants.length - 3} more occupants
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                </Link>
              )
            })
          )}
        </div>

        {/* Summary Stats */}
        {filteredWarehouses.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Summary Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{filteredWarehouses.length}</div>
                <div className="text-sm text-gray-600">Total Warehouses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {filteredWarehouses.filter(w => w.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Active Warehouses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {filteredWarehouses.reduce((sum, w) => {
                    const totalSpace = w.total_space + (w.has_mezzanine ? w.mezzanine_space : 0)
                    return sum + totalSpace
                  }, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Space (m²)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {filteredWarehouses.reduce((sum, w) => {
                    const totalOccupied = w.occupied_space + (w.has_mezzanine ? w.mezzanine_occupied : 0)
                    return sum + totalOccupied
                  }, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Occupied (m²)</div>
              </div>
            </div>
            
            {/* Additional breakdown for ground floor and mezzanine */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="text-md font-medium text-gray-900 mb-3 text-center">Space Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {filteredWarehouses.reduce((sum, w) => sum + w.total_space, 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Ground Floor (m²)</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {filteredWarehouses.reduce((sum, w) => sum + w.occupied_space, 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Ground Occupied (m²)</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {filteredWarehouses.reduce((sum, w) => sum + (w.has_mezzanine ? w.mezzanine_space : 0), 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Mezzanine (m²)</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {filteredWarehouses.reduce((sum, w) => sum + (w.has_mezzanine ? w.mezzanine_occupied : 0), 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600">Mezzanine Occupied (m²)</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Warehouse Modal */}
      {showAddWarehouseModal && editingWarehouse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                {editingWarehouse.id ? 'Edit Warehouse' : 'Add New Warehouse'}
              </h2>
            </div>
            
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse Name *</label>
                  <input
                    type="text"
                    value={editingWarehouse.name}
                    onChange={(e) => setEditingWarehouse({...editingWarehouse, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <input
                    type="text"
                    value={editingWarehouse.location}
                    onChange={(e) => setEditingWarehouse({...editingWarehouse, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Space (m²) *</label>
                  <input
                    type="number"
                    value={editingWarehouse.total_space || ''}
                    onChange={(e) => setEditingWarehouse({...editingWarehouse, total_space: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    step="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editingWarehouse.status}
                    onChange={(e) => setEditingWarehouse({...editingWarehouse, status: e.target.value as 'active' | 'inactive' | 'maintenance'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Has Mezzanine Floor</label>
                  <select
                    value={editingWarehouse.has_mezzanine ? 'yes' : 'no'}
                    onChange={(e) => setEditingWarehouse({...editingWarehouse, has_mezzanine: e.target.value === 'yes'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
                {editingWarehouse.has_mezzanine && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mezzanine Space (m²) *</label>
                    <input
                      type="number"
                      value={editingWarehouse.mezzanine_space || ''}
                      onChange={(e) => setEditingWarehouse({...editingWarehouse, mezzanine_space: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      step="1"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingWarehouse.description || ''}
                  onChange={(e) => setEditingWarehouse({...editingWarehouse, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Optional description of the warehouse"
                />
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => {
                  setShowAddWarehouseModal(false)
                  setEditingWarehouse(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={editingWarehouse.id ? updateWarehouse : addWarehouse}
                disabled={!editingWarehouse.name || !editingWarehouse.location || editingWarehouse.total_space <= 0 || (editingWarehouse.has_mezzanine && editingWarehouse.mezzanine_space <= 0)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                {editingWarehouse.id ? 'Update Warehouse' : 'Add Warehouse'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Occupant Modal - Only for Admin */}
      {user?.role === 'ADMIN' && showAddOccupantModal && editingOccupant && selectedWarehouse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                {editingOccupant.id ? 'Edit Occupant' : `Add New Occupant to ${selectedWarehouse.name}`}
              </h2>
              {/* Warehouse space summary */}
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-blue-900">Ground Floor</div>
                    <div className="text-blue-700">
                      {(() => {
                        const groundInfo = getSpaceAvailability(selectedWarehouse, 'ground')
                        return `${groundInfo.occupied.toLocaleString()} / ${groundInfo.total.toLocaleString()} m² (${((groundInfo.occupied / groundInfo.total) * 100).toFixed(1)}%)`
                      })()}
                    </div>
                  </div>
                  {selectedWarehouse.has_mezzanine && (
                    <div>
                      <div className="font-medium text-blue-900">Mezzanine</div>
                      <div className="text-blue-700">
                        {(() => {
                          const mezzanineInfo = getSpaceAvailability(selectedWarehouse, 'mezzanine')
                          return `${mezzanineInfo.occupied.toLocaleString()} / ${mezzanineInfo.total.toLocaleString()} m² (${((mezzanineInfo.occupied / mezzanineInfo.total) * 100).toFixed(1)}%)`
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occupant Name *</label>
                  <input
                    type="text"
                    value={editingOccupant.name}
                    onChange={(e) => setEditingOccupant({...editingOccupant, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Information</label>
                  <input
                    type="text"
                    value={editingOccupant.contact_info || ''}
                    onChange={(e) => setEditingOccupant({...editingOccupant, contact_info: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Phone, email, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Space Occupied (m²) *</label>
                  <input
                    type="number"
                    value={editingOccupant.space_occupied || ''}
                    onChange={(e) => setEditingOccupant({...editingOccupant, space_occupied: Number(e.target.value)})}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      editingOccupant.space_occupied > 0 ? 
                        (validateOccupantSpace(editingOccupant, selectedWarehouse, warehouseOccupants, editingOccupant.id || undefined) ? 
                          'border-red-300 bg-red-50' : 
                          'border-green-300 bg-green-50') : 
                        'border-gray-300'
                    }`}
                    min="1"
                    step="1"
                    max={getSpaceAvailability(selectedWarehouse, editingOccupant.floor_type).available}
                    required
                  />
                  {/* Space availability info */}
                  {(() => {
                    const spaceInfo = getSpaceAvailability(selectedWarehouse, editingOccupant.floor_type)
                    const validationError = editingOccupant.space_occupied > 0 ? 
                      validateOccupantSpace(editingOccupant, selectedWarehouse, warehouseOccupants, editingOccupant.id || undefined) : null
                    
                    return (
                      <div className="mt-1 text-xs">
                        <div className="text-gray-600">
                          Available: {spaceInfo.available.toLocaleString()} m² | 
                          Occupied: {spaceInfo.occupied.toLocaleString()} m² | 
                          Total: {spaceInfo.total.toLocaleString()} m²
                        </div>
                        {editingOccupant.space_occupied > 0 && (
                          <>
                            {validationError ? (
                              <div className="text-red-600 font-medium mt-1 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {validationError}
                              </div>
                            ) : (
                              <div className="text-green-600 font-medium mt-1 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Space allocation valid
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Floor Type *</label>
                  <select
                    value={editingOccupant.floor_type}
                    onChange={(e) => setEditingOccupant({...editingOccupant, floor_type: e.target.value as 'ground' | 'mezzanine'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ground">Ground Floor</option>
                    {selectedWarehouse.has_mezzanine && <option value="mezzanine">Mezzanine</option>}
                  </select>
                  {/* Floor type info */}
                  <div className="mt-1 text-xs text-gray-600">
                    {editingOccupant.floor_type === 'ground' ? (
                      <span>Ground floor: {selectedWarehouse.total_space.toLocaleString()} m² total</span>
                    ) : (
                      <span>Mezzanine: {selectedWarehouse.has_mezzanine ? selectedWarehouse.mezzanine_space.toLocaleString() : '0'} m² total</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                  <input
                    type="text"
                    value={editingOccupant.section || ''}
                    onChange={(e) => setEditingOccupant({...editingOccupant, section: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="A, B, C, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editingOccupant.status}
                    onChange={(e) => setEditingOccupant({...editingOccupant, status: e.target.value as 'active' | 'completed' | 'pending'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entry Date *</label>
                  <input
                    type="date"
                    value={editingOccupant.entry_date}
                    onChange={(e) => setEditingOccupant({...editingOccupant, entry_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Exit Date</label>
                  <input
                    type="date"
                    value={editingOccupant.expected_exit_date || ''}
                    onChange={(e) => setEditingOccupant({...editingOccupant, expected_exit_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editingOccupant.notes || ''}
                  onChange={(e) => setEditingOccupant({...editingOccupant, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Additional notes about the occupant"
                />
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => {
                  setShowAddOccupantModal(false)
                  setEditingOccupant(null)
                  setSelectedWarehouse(null)
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={editingOccupant.id ? updateOccupant : addOccupant}
                disabled={
                  !editingOccupant.name || 
                  editingOccupant.space_occupied <= 0 ||
                  !!validateOccupantSpace(editingOccupant, selectedWarehouse, warehouseOccupants, editingOccupant.id || undefined)
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                {editingOccupant.id ? 'Update Occupant' : 'Add Occupant'}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}


