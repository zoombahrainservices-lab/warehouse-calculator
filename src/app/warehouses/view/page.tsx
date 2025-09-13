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

export default function WarehouseView() {
  const { user, isLoading: authLoading, logout } = useAuth()
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'maintenance'>('all')

  // Check if user is admin or manager and redirect if needed
  useEffect(() => {
    if (user) {
      // If admin or manager, redirect to admin view
      if (user.role === 'ADMIN' || user.role === 'MANAGER') {
            window.location.href = '/warehouses'
            return
          }
    }
  }, [user])

  const handleLogout = () => {
    logout()
  }

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
      setError(null)
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load warehouse data')
    } finally {
      setLoading(false)
    }
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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Warehouse Overview</h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">View warehouse information and access calculator</p>
              {user && (
                <div className="mt-1">
                  <p className="text-blue-600 text-sm">Welcome, {user.firstName} {user.lastName}</p>
                  <p className="text-gray-500 text-xs">
                    Role: {user.role} 
                    {(user.role === 'ADMIN' || user.role === 'MANAGER') && ' 🔴'}
                    {user.role === 'MANAGER' && ' 🟡'}
                    {user.role === 'SUPPORT' && ' 🟢'}
                    {user.role === 'USER' && ' 🔵'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                </svg>
                My Dashboard
              </Link>
              <Link
                href="/book-space"
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Book Space
              </Link>
              <Link
                href="/my-stock"
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                My Stock
              </Link>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
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
            filteredWarehouses.map(warehouse => (
              <div key={warehouse.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                    </div>
                  </div>
                </div>

                {/* Ground Floor Space Summary */}
                <div className="bg-blue-50 px-4 md:px-6 py-4 border-b border-blue-200">
                  <div className="flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <h3 className="text-sm font-medium text-blue-900">Ground Floor Space Summary</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
                    <div className="text-center">
                      <div className="text-base md:text-lg font-bold text-blue-600">{warehouse.total_space.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">Total Space (m²)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base md:text-lg font-bold text-orange-600">{warehouse.occupied_space.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">Occupied Space (m²)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base md:text-lg font-bold text-green-600">{warehouse.free_space.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">Available Space (m²)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base md:text-lg font-bold text-purple-600">{((warehouse.occupied_space / warehouse.total_space) * 100).toFixed(1)}%</div>
                      <div className="text-xs text-gray-600">Utilization</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    Ground Floor Utilization: {((warehouse.occupied_space / warehouse.total_space) * 100).toFixed(1)}%
                  </div>
                </div>

                {/* Mezzanine Floor Space Summary */}
                {warehouse.has_mezzanine && (
                  <div className="bg-green-50 px-4 md:px-6 py-4 border-b border-green-200">
                    <div className="flex items-center justify-center mb-2">
                      <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5v4m8-4v4M8 11h8M8 15h8" />
                      </svg>
                      <h3 className="text-sm font-medium text-green-900">Mezzanine Floor Space Summary</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
                      <div className="text-center">
                        <div className="text-base md:text-lg font-bold text-green-600">{warehouse.mezzanine_space.toLocaleString()}</div>
                        <div className="text-xs text-gray-600">Total Mezzanine (m²)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-base md:text-lg font-bold text-orange-600">{warehouse.mezzanine_occupied.toLocaleString()}</div>
                        <div className="text-xs text-gray-600">Occupied Mezzanine (m²)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-base md:text-lg font-bold text-green-600">{warehouse.mezzanine_free.toLocaleString()}</div>
                        <div className="text-xs text-gray-600">Available Mezzanine (m²)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-base md:text-lg font-bold text-purple-600">
                          {warehouse.mezzanine_space > 0 ? ((warehouse.mezzanine_occupied / warehouse.mezzanine_space) * 100).toFixed(1) : '0.0'}%
                        </div>
                        <div className="text-xs text-gray-600">Mezzanine Utilization</div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      Mezzanine Utilization: {warehouse.mezzanine_space > 0 ? ((warehouse.mezzanine_occupied / warehouse.mezzanine_space) * 100).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                )}

                {/* Overall Warehouse Summary */}
                <div className="bg-purple-50 px-4 md:px-6 py-4 border-b border-purple-200">
                  <div className="flex items-center justify-center mb-2">
                    <svg className="w-4 h-4 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="text-sm font-medium text-purple-900">Overall Warehouse Summary</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
                    <div className="text-center">
                      <div className="text-base md:text-lg font-bold text-purple-600">
                        {(warehouse.total_space + warehouse.mezzanine_space).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Total Combined (m²)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base md:text-lg font-bold text-orange-600">
                        {(warehouse.occupied_space + warehouse.mezzanine_occupied).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Total Occupied (m²)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base md:text-lg font-bold text-green-600">
                        {(warehouse.free_space + warehouse.mezzanine_free).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Total Available (m²)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-base md:text-lg font-bold text-purple-600">
                        {((warehouse.occupied_space + warehouse.mezzanine_occupied) / (warehouse.total_space + warehouse.mezzanine_space) * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-600">Overall Utilization</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 text-center">
                    Overall Warehouse Utilization: {((warehouse.occupied_space + warehouse.mezzanine_occupied) / (warehouse.total_space + warehouse.mezzanine_space) * 100).toFixed(1)}%
                  </div>
                </div>

                {/* Access Restricted Notice */}
                <div className="px-4 md:px-6 py-4 bg-yellow-50 border-l-4 border-yellow-400">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Access Restricted</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Detailed occupant and stock management is only available to administrators. 
                        Contact your administrator for full access.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
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
                  {filteredWarehouses.reduce((sum, w) => sum + w.total_space + w.mezzanine_space, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Combined Space (m²)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {filteredWarehouses.reduce((sum, w) => sum + w.occupied_space + w.mezzanine_occupied, 0).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Occupied (m²)</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}




