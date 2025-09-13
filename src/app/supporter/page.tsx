'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

interface UserSpaceData {
  id: string
  email: string
  name: string
  role: string
  totalSpaceOccupied: number
  warehouseDetails: {
    warehouseId: string
    warehouseName: string
    spaceOccupied: number
    floorType: string
    entryDate: string
    status: string
  }[]
  totalBookings: number
  lastActivity: string
}

export default function SupporterDashboard() {
  const { user, isLoading: authLoading, logout } = useAuth()
  const [usersData, setUsersData] = useState<UserSpaceData[]>([])
  const [usersWithCosts, setUsersWithCosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'space' | 'bookings' | 'activity' | 'monthlyCost'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')


  useEffect(() => {
    console.log('🔐 Auth state changed:', { user, authLoading })
    if (user && (user.role === 'SUPPORT' || user.role === 'MANAGER' || user.role === 'ADMIN')) {
      console.log('✅ User authorized, loading data...')
      loadUsersData()
      loadUsersWithCosts()
    } else if (user) {
      console.log('❌ User not authorized:', user.role)
    }
  }, [user, authLoading])

  const loadUsersData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔄 Loading regular users data...')
      const response = await fetch('/api/supporter/users-space')
      console.log('📡 Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ API Error:', errorData)
        throw new Error(errorData.error || 'Failed to load users data')
      }

      const data = await response.json()
      console.log('📊 Loaded regular users data:', data)
      
      if (data.users && Array.isArray(data.users)) {
        setUsersData(data.users)
        console.log(`✅ Set ${data.users.length} regular users to state`)
      } else {
        console.warn('⚠️ No users array in response:', data)
        setUsersData([])
      }
    } catch (err) {
      console.error('❌ Error loading users data:', err)
      setError('Failed to load users data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadUsersWithCosts = async () => {
    try {
      setError(null)
      console.log('💰 Loading users with cost calculations...')
      
      const response = await fetch('/api/supporter/users-costs')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load cost data')
      }

      const data = await response.json()
      console.log('💰 Loaded cost data:', data)
      
      if (data.users && Array.isArray(data.users)) {
        setUsersWithCosts(data.users)
        console.log(`✅ Set ${data.users.length} users with costs to state`)
      } else {
        setUsersWithCosts([])
      }
    } catch (err) {
      console.error('❌ Error loading cost data:', err)
      setError('Failed to load cost data. Please try again.')
    }
  }

  const handleLogout = () => {
    logout()
  }

  const filteredAndSortedUsers = usersData
    .filter(user => 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: string | number
      let bValue: string | number

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'space':
          aValue = a.totalSpaceOccupied
          bValue = b.totalSpaceOccupied
          break
        case 'bookings':
          aValue = a.totalBookings
          bValue = b.totalBookings
          break
        case 'activity':
          aValue = new Date(a.lastActivity).getTime()
          bValue = new Date(b.lastActivity).getTime()
          break
        case 'monthlyCost':
          const aCost = usersWithCosts.find(u => u.id === a.id)?.totalMonthlyCost || 0
          const bCost = usersWithCosts.find(u => u.id === b.id)?.totalMonthlyCost || 0
          aValue = aCost
          bValue = bCost
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })



  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading authentication...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-4">Please log in to access the supporter dashboard.</p>
          <Link
            href="/login"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  if (!['SUPPORT', 'MANAGER', 'ADMIN'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <p className="text-sm text-gray-500 mb-4">Your role: {user.role}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Dashboard
          </Link>
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
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Support Dashboard</h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">Monitor regular users and their warehouse space usage</p>
              {user && (
                <div className="mt-1">
                  <p className="text-green-600 text-sm">Welcome, {user.name}</p>
                  <p className="text-gray-500 text-xs">
                    Role: {user.role} • Last login: {new Date().toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/warehouses"
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Warehouses
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Regular Users
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
                           <div className="flex gap-2">
               <div>
                <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                                     <option value="name">Name</option>
                   <option value="space">Space Occupied</option>
                   <option value="bookings">Total Bookings</option>
                   <option value="activity">Last Activity</option>
                   <option value="monthlyCost">Monthly Cost</option>
                </select>
              </div>
              <div>
                <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-2">
                  Order
                </label>
                <select
                  id="sortOrder"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Summary */}
        {usersWithCosts.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-green-800 mb-3">💰 Revenue Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="text-sm text-green-600 font-medium">Active Users</div>
                <div className="text-2xl font-bold text-green-800">
                  {usersWithCosts.filter(u => u.hasActiveWarehouse).length}
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="text-sm text-green-600 font-medium">Total Monthly Revenue</div>
                <div className="text-2xl font-bold text-green-800">
                  {usersWithCosts.reduce((sum, u) => sum + (u.totalMonthlyCost || 0), 0).toFixed(2)} BHD
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="text-sm text-green-600 font-medium">Total Annual Revenue</div>
                <div className="text-2xl font-bold text-green-800">
                  {usersWithCosts.reduce((sum, u) => sum + (u.totalAnnualCost || 0), 0).toFixed(2)} BHD
                </div>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-200">
                <div className="text-sm text-green-600 font-medium">Avg Monthly per User</div>
                <div className="text-2xl font-bold text-green-800">
                  {(() => {
                    const activeUsers = usersWithCosts.filter(u => u.hasActiveWarehouse)
                    const totalMonthly = usersWithCosts.reduce((sum, u) => sum + (u.totalMonthlyCost || 0), 0)
                    return activeUsers.length > 0 ? (totalMonthly / activeUsers.length).toFixed(2) : '0.00'
                  })()} BHD
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading regular users data...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadUsersData}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredAndSortedUsers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No regular users found.</p>
              {usersData.length === 0 && (
                <p className="text-sm text-gray-500 mt-2">No regular user data available. Please check your database connection.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Regular User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Space Occupied
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Bookings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Activity
                    </th>
                                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Monthly Cost
                     </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedUsers.map((userData) => (
                    <tr key={userData.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{userData.name}</div>
                          <div className="text-sm text-gray-500">{userData.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {userData.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {userData.totalSpaceOccupied.toFixed(2)} m²
                        </div>
                        {userData.totalSpaceOccupied > 0 && (
                          <div className="text-xs text-gray-500">
                            {userData.warehouseDetails.length} warehouse{userData.warehouseDetails.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {userData.totalBookings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(userData.lastActivity).toLocaleDateString()}
                      </td>
                                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                         {(() => {
                           const userCosts = usersWithCosts.find(u => u.id === userData.id)
                           if (userCosts && userCosts.totalMonthlyCost > 0) {
                             return (
                               <div>
                                 <div className="font-medium text-green-600">
                                   {userCosts.totalMonthlyCost.toFixed(2)} BHD
                                 </div>
                                 <div className="text-xs text-gray-500">
                                   {userCosts.ratePerSqm.toFixed(3)} BHD/m²
                                 </div>
                                 <div className="text-xs text-gray-500">
                                   Annual: {userCosts.totalAnnualCost.toFixed(2)} BHD
                                 </div>
                               </div>
                             )
                           } else {
                             return (
                               <div className="text-gray-400">
                                 No warehouse
                               </div>
                             )
                           }
                         })()}
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            userData.totalSpaceOccupied > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {userData.totalSpaceOccupied > 0 ? 'Active' : 'Inactive'}
                          </span>
                          
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Statistics */}
        {!loading && !error && usersData.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500">Total Regular Users</div>
              <div className="text-2xl font-bold text-gray-900">{usersData.length}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500">Active Users</div>
              <div className="text-2xl font-bold text-green-600">
                {usersData.filter(u => u.totalSpaceOccupied > 0).length}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500">Total Space Used</div>
              <div className="text-2xl font-bold text-blue-600">
                {usersData.reduce((sum, u) => sum + u.totalSpaceOccupied, 0).toFixed(2)} m²
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-500">Total Bookings</div>
              <div className="text-2xl font-bold text-purple-600">
                {usersData.reduce((sum, u) => sum + u.totalBookings, 0)}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions for Support */}
        {!loading && !error && usersData.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Support Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-blue-600 text-2xl font-bold mb-2">
                  {usersData.filter(u => u.totalSpaceOccupied > 0).length}
                </div>
                <div className="text-blue-800 font-medium">Active Users</div>
                <div className="text-blue-600 text-sm">Currently using warehouse space</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-green-600 text-2xl font-bold mb-2">
                  {usersData.filter(u => u.totalBookings > 0).length}
                </div>
                <div className="text-green-800 font-medium">Users with Bookings</div>
                <div className="text-green-600 text-sm">Have active warehouse bookings</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="text-purple-600 text-2xl font-bold mb-2">
                  {usersData.length}
                </div>
                <div className="text-purple-800 font-medium">Regular Users</div>
                <div className="text-purple-600 text-sm">Total warehouse customers</div>
              </div>
            </div>
          </div>
        )}

        {/* User Details Section */}
        {!loading && !error && usersData.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Regular User Details & Warehouse Usage</h2>
            <div className="space-y-4">
              {filteredAndSortedUsers.map((userData) => (
                <div key={userData.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-3 lg:space-y-0">
                    {/* User Basic Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{userData.name}</h3>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {userData.role}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{userData.email}</p>
                      
                      {/* User Statistics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Space Occupied:</span>
                          <div className="text-lg font-semibold text-blue-600">
                            {userData.totalSpaceOccupied.toFixed(2)} m²
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Active Bookings:</span>
                          <div className="text-lg font-semibold text-green-600">
                            {userData.totalBookings}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Warehouses:</span>
                          <div className="text-lg font-semibold text-purple-600">
                            {userData.warehouseDetails.length}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Last Activity:</span>
                          <div className="text-sm text-gray-600">
                            {new Date(userData.lastActivity).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Warehouse Details */}
                    <div className="lg:ml-6 lg:w-80">
                      <h4 className="font-medium text-gray-900 mb-2">Warehouse Details</h4>
                      {userData.warehouseDetails.length > 0 ? (
                        <div className="space-y-2">
                          {userData.warehouseDetails.map((warehouse, index) => (
                            <div key={index} className="bg-gray-50 rounded p-3 text-sm">
                              <div className="font-medium text-gray-900">{warehouse.warehouseName}</div>
                              <div className="text-gray-600">
                                {warehouse.spaceOccupied} m² • {warehouse.floorType}
                              </div>
                              <div className="text-gray-500 text-xs">
                                Entry: {new Date(warehouse.entryDate).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 text-sm italic">No active warehouse usage</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
