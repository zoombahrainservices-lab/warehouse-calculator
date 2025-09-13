'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

interface OptionalService {
  id: string
  name: string
  description: string
  category: 'movement' | 'transportation' | 'customs' | 'handling' | 'security'
  pricing_type: 'fixed' | 'hourly' | 'per_event' | 'on_request'
  rate: number
  unit: string
  active: boolean
  created_at: string
  updated_at: string
}

export default function AdminOptionalServices() {
  const { user, isLoading: authLoading, logout } = useAuth({ requiredRole: 'ADMIN' })
  const [services, setServices] = useState<OptionalService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingService, setEditingService] = useState<OptionalService | null>(null)
  const [newService, setNewService] = useState<Partial<OptionalService>>({
    name: '',
    description: '',
    category: 'movement',
    pricing_type: 'fixed',
    rate: 0,
    unit: '',
    active: true
  })

  useEffect(() => {
    if (!authLoading) {
      loadData()
    }
  }, [authLoading])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const { data: servicesData, error: servicesError } = await supabase
        .from('optional_services')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (servicesError) throw servicesError

      setServices(servicesData || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const addService = async () => {
    try {
      if (!newService.name || !newService.category || !newService.pricing_type) {
        alert('Please fill in all required fields')
        return
      }

      const { error } = await supabase
        .from('optional_services')
        .insert([{
          ...newService,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) throw error

      setShowAddModal(false)
      setNewService({
        name: '',
        description: '',
        category: 'movement',
        pricing_type: 'fixed',
        rate: 0,
        unit: '',
        active: true
      })
      loadData()
      alert('Optional service added successfully!')
    } catch (err) {
      console.error('Error adding service:', err)
      alert('Failed to add optional service: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const updateService = async (service: OptionalService) => {
    try {
      const { error } = await supabase
        .from('optional_services')
        .update({
          name: service.name,
          description: service.description,
          category: service.category,
          pricing_type: service.pricing_type,
          rate: service.rate,
          unit: service.unit,
          active: service.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', service.id)

      if (error) throw error

      setEditingService(null)
      loadData()
      alert('Optional service updated successfully!')
    } catch (err) {
      console.error('Error updating service:', err)
      alert('Failed to update optional service: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const deleteService = async (id: string) => {
    if (!confirm('Are you sure you want to delete this optional service? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('optional_services')
        .delete()
        .eq('id', id)

      if (error) throw error

      loadData()
      alert('Optional service deleted successfully!')
    } catch (err) {
      console.error('Error deleting service:', err)
      alert('Failed to delete optional service: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'movement': return 'bg-blue-100 text-blue-800'
      case 'transportation': return 'bg-green-100 text-green-800'
      case 'customs': return 'bg-purple-100 text-purple-800'
      case 'handling': return 'bg-orange-100 text-orange-800'
      case 'security': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPricingTypeColor = (pricingType: string) => {
    switch (pricingType) {
      case 'fixed': return 'bg-green-100 text-green-800'
      case 'hourly': return 'bg-blue-100 text-blue-800'
      case 'per_event': return 'bg-purple-100 text-purple-800'
      case 'on_request': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading optional services...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Optional Services Management</h1>
            <p className="text-gray-600 mt-1">Manage additional services and their pricing</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              Add New Service
            </button>
            <Link 
              href="/admin"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Back to Admin
            </Link>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">
              Logged in as: <span className="font-semibold">{user.firstName} {user.lastName}</span> ({user.role})
            </p>
          </div>
        )}

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

        {/* Optional Services Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Optional Services</h2>
            <p className="text-sm text-gray-600 mt-1">Additional services available for warehouse customers</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {editingService?.id === service.id ? (
                            <input
                              type="text"
                              value={editingService.name}
                              onChange={(e) => setEditingService({
                                ...editingService,
                                name: e.target.value
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            service.name
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {editingService?.id === service.id ? (
                            <textarea
                              value={editingService.description}
                              onChange={(e) => setEditingService({
                                ...editingService,
                                description: e.target.value
                              })}
                              rows={2}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            service.description
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingService?.id === service.id ? (
                        <select
                          value={editingService.category}
                          onChange={(e) => setEditingService({
                            ...editingService,
                            category: e.target.value as 'movement' | 'transportation' | 'customs' | 'handling' | 'security'
                          })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="movement">Movement</option>
                          <option value="transportation">Transportation</option>
                          <option value="customs">Customs</option>
                          <option value="handling">Handling</option>
                          <option value="security">Security</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(service.category)}`}>
                          {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingService?.id === service.id ? (
                        <select
                          value={editingService.pricing_type}
                          onChange={(e) => setEditingService({
                            ...editingService,
                            pricing_type: e.target.value as 'fixed' | 'hourly' | 'per_event' | 'on_request'
                          })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="fixed">Fixed</option>
                          <option value="hourly">Hourly</option>
                          <option value="per_event">Per Event</option>
                          <option value="on_request">On Request</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPricingTypeColor(service.pricing_type)}`}>
                          {service.pricing_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {editingService?.id === service.id ? (
                        <div className="space-y-1">
                          <input
                            type="number"
                            step="0.001"
                            value={editingService.rate}
                            onChange={(e) => setEditingService({
                              ...editingService,
                              rate: parseFloat(e.target.value) || 0
                            })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            disabled={service.pricing_type === 'on_request'}
                          />
                          <input
                            type="text"
                            value={editingService.unit}
                            onChange={(e) => setEditingService({
                              ...editingService,
                              unit: e.target.value
                            })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Unit"
                          />
                        </div>
                      ) : (
                        service.pricing_type === 'on_request' ? (
                          'On Request'
                        ) : (
                          `${service.rate} ${service.unit || 'BHD'}`
                        )
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingService?.id === service.id ? (
                        <select
                          value={editingService.active ? 'true' : 'false'}
                          onChange={(e) => setEditingService({
                            ...editingService,
                            active: e.target.value === 'true'
                          })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          service.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {service.active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingService?.id === service.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updateService(editingService)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingService(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingService(service)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteService(service.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add New Service Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Add New Optional Service</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Name *</label>
                  <input
                    type="text"
                    value={newService.name}
                    onChange={(e) => setNewService({...newService, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Forklift Service"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newService.description}
                    onChange={(e) => setNewService({...newService, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Service description..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      value={newService.category}
                      onChange={(e) => setNewService({...newService, category: e.target.value as 'movement' | 'transportation' | 'customs' | 'handling' | 'security'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="movement">Movement</option>
                      <option value="transportation">Transportation</option>
                      <option value="customs">Customs</option>
                      <option value="handling">Handling</option>
                      <option value="security">Security</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pricing Type *</label>
                    <select
                      value={newService.pricing_type}
                      onChange={(e) => setNewService({...newService, pricing_type: e.target.value as 'fixed' | 'hourly' | 'per_event' | 'on_request'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="fixed">Fixed</option>
                      <option value="hourly">Hourly</option>
                      <option value="per_event">Per Event</option>
                      <option value="on_request">On Request</option>
                    </select>
                  </div>
                </div>

                {newService.pricing_type !== 'on_request' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rate (BHD) *</label>
                      <input
                        type="number"
                        step="0.001"
                        value={newService.rate || ''}
                        onChange={(e) => setNewService({...newService, rate: parseFloat(e.target.value) || 0})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                      <input
                        type="text"
                        value={newService.unit}
                        onChange={(e) => setNewService({...newService, unit: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., per hour, per event"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addService}
                  disabled={!newService.name || !newService.category || !newService.pricing_type || (newService.pricing_type !== 'on_request' && !newService.rate)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                  Add Service
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



