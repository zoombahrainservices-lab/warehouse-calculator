'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { OptionalService } from '@/lib/supabase'

export default function AdminOptionalServices() {
  const [optionalServices, setOptionalServices] = useState<OptionalService[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state for new/edit service
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'movement' as 'movement' | 'loading' | 'transportation' | 'customs' | 'handling',
    pricing_type: 'fixed' as 'fixed' | 'hourly' | 'per_event' | 'on_request',
    rate: null as number | null,
    unit: '',
    time_restriction: '',
    is_free: false,
    active: true
  })

  useEffect(() => {
    loadOptionalServices()
  }, [])

  const loadOptionalServices = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('optional_services')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setOptionalServices(data || [])
    } catch (err) {
      setError('Failed to load optional services')
      console.error('Error loading optional services:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (service: OptionalService) => {
    setEditingId(service.id)
    setFormData({
      name: service.name,
      description: service.description || '',
      category: service.category,
      pricing_type: service.pricing_type,
      rate: service.rate,
      unit: service.unit || '',
      time_restriction: service.time_restriction || '',
      is_free: service.is_free,
      active: service.active
    })
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      if (editingId) {
        // Update existing service
        const { error } = await supabase
          .from('optional_services')
          .update(formData)
          .eq('id', editingId)

        if (error) throw error
        setSuccess('Optional service updated successfully')
      } else {
        // Create new service
        const { error } = await supabase
          .from('optional_services')
          .insert([formData])

        if (error) throw error
        setSuccess('Optional service created successfully')
      }

      // Reset form and reload data
      setEditingId(null)
      setShowAddForm(false)
      resetForm()
      await loadOptionalServices()
    } catch (err) {
      setError('Failed to save optional service')
      console.error('Error saving optional service:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this optional service?')) return

    try {
      const { error } = await supabase
        .from('optional_services')
        .delete()
        .eq('id', id)

      if (error) throw error
      setSuccess('Optional service deleted successfully')
      await loadOptionalServices()
    } catch (err) {
      setError('Failed to delete optional service')
      console.error('Error deleting optional service:', err)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'movement',
      pricing_type: 'fixed',
      rate: null,
      unit: '',
      time_restriction: '',
      is_free: false,
      active: true
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setShowAddForm(false)
    resetForm()
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      movement: '🚚',
      loading: '📦',
      transportation: '🚛',
      customs: '🏛️',
      handling: '🤝'
    }
    return icons[category as keyof typeof icons] || '📋'
  }

  const getPricingDisplay = (service: OptionalService) => {
    if (service.is_free) return 'Free'
    if (service.pricing_type === 'on_request') return 'On Request'
    if (service.rate && service.unit) return `${service.rate} BHD ${service.unit}`
    return 'Contact Us'
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading optional services...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Optional Services</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage additional services offered to warehouse customers
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add New Service
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingId ? 'Edit Optional Service' : 'Add New Optional Service'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Service Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Loading & Unloading"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="movement">Movement</option>
                <option value="loading">Loading</option>
                <option value="transportation">Transportation</option>
                <option value="customs">Customs</option>
                <option value="handling">Handling</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Service description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Pricing Type</label>
              <select
                value={formData.pricing_type}
                onChange={(e) => setFormData({...formData, pricing_type: e.target.value as any})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="fixed">Fixed Rate</option>
                <option value="hourly">Hourly Rate</option>
                <option value="per_event">Per Event</option>
                <option value="on_request">On Request</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Rate (BHD)</label>
              <input
                type="number"
                step="0.01"
                value={formData.rate || ''}
                onChange={(e) => setFormData({...formData, rate: e.target.value ? parseFloat(e.target.value) : null})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Leave empty for on request"
                disabled={formData.pricing_type === 'on_request'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., per hour, per event"
                disabled={formData.pricing_type === 'on_request'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Time Restriction</label>
              <input
                type="text"
                value={formData.time_restriction}
                onChange={(e) => setFormData({...formData, time_restriction: e.target.value})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 18:00-06:30"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_free}
                  onChange={(e) => setFormData({...formData, is_free: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Free Service</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Services by Category */}
      <div className="space-y-6">
        {['movement', 'loading', 'transportation', 'customs', 'handling'].map((category) => {
          const categoryServices = optionalServices.filter(service => service.category === category)
          if (categoryServices.length === 0) return null

          return (
            <div key={category} className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                  <span className="mr-2">{getCategoryIcon(category)}</span>
                  {category.charAt(0).toUpperCase() + category.slice(1)} Services
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pricing
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
                    {categoryServices.map((service) => (
                      <tr key={service.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {service.name}
                          {service.time_restriction && (
                            <>
                              <br />
                              <span className="text-xs text-gray-500">
                                {service.time_restriction}
                              </span>
                            </>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {service.description || 'No description'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            service.is_free 
                              ? 'bg-green-100 text-green-800'
                              : service.pricing_type === 'on_request'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {getPricingDisplay(service)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            service.active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {service.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(service)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
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
          )
        })}
      </div>
    </div>
  )
}
