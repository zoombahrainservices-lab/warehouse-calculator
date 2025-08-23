'use client'

import { useState, useEffect } from 'react'
import { supabase, OfficePricing, SpaceType } from '@/lib/supabase'

export default function AdminOfficePricing() {
  const [officePricing, setOfficePricing] = useState<OfficePricing[]>([])
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newPricing, setNewPricing] = useState({
    space_type_id: '',
    tenure: 'Short' as 'Short' | 'Long' | 'Very Short',
    monthly_rate: 0,
    daily_rate: 0,
    description: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [pricingResult, spaceTypesResult] = await Promise.all([
        supabase.from('office_pricing').select('*').order('space_type_id'),
        supabase.from('space_types').select('*').eq('active', true).order('sort_order')
      ])

      if (pricingResult.error) throw pricingResult.error
      if (spaceTypesResult.error) throw spaceTypesResult.error

      setOfficePricing(pricingResult.data || [])
      setSpaceTypes(spaceTypesResult.data || [])
      
      // Set default space type for new pricing
      if (spaceTypesResult.data && spaceTypesResult.data.length > 0) {
        setNewPricing(prev => ({ ...prev, space_type_id: spaceTypesResult.data[0].id }))
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const addPricing = async () => {
    if (!newPricing.space_type_id || newPricing.monthly_rate <= 0 || newPricing.daily_rate <= 0) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('office_pricing')
        .insert([newPricing])

      if (error) throw error
      
      setMessage({ type: 'success', text: 'Office pricing added successfully' })
      setNewPricing({
        space_type_id: spaceTypes[0]?.id || '',
        tenure: 'Short',
        monthly_rate: 0,
        daily_rate: 0,
        description: ''
      })
      await loadData()
    } catch (err) {
      console.error('Error adding office pricing:', err)
      setMessage({ type: 'error', text: 'Failed to add office pricing' })
    } finally {
      setSaving(false)
    }
  }

  const updatePricing = async (pricing: OfficePricing) => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('office_pricing')
        .update({
          space_type_id: pricing.space_type_id,
          tenure: pricing.tenure,
          monthly_rate: pricing.monthly_rate,
          daily_rate: pricing.daily_rate,
          description: pricing.description,
          active: pricing.active
        })
        .eq('id', pricing.id)

      if (error) throw error
      
      setMessage({ type: 'success', text: 'Office pricing updated successfully' })
      setEditingId(null)
      await loadData()
    } catch (err) {
      console.error('Error updating office pricing:', err)
      setMessage({ type: 'error', text: 'Failed to update office pricing' })
    } finally {
      setSaving(false)
    }
  }

  const deletePricing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this office pricing?')) {
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('office_pricing')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setMessage({ type: 'success', text: 'Office pricing deleted successfully' })
      await loadData()
    } catch (err) {
      console.error('Error deleting office pricing:', err)
      setMessage({ type: 'error', text: 'Failed to delete office pricing' })
    } finally {
      setSaving(false)
    }
  }

  const handlePricingChange = (id: string, field: keyof OfficePricing, value: any) => {
    setOfficePricing(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ))
  }

  const getSpaceTypeName = (spaceTypeId: string) => {
    return spaceTypes.find(st => st.id === spaceTypeId)?.name || 'Unknown'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Office Pricing</h2>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Add New Office Pricing */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Add New Office Pricing</h3>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Space Type</label>
              <select
                value={newPricing.space_type_id}
                onChange={(e) => setNewPricing(prev => ({ ...prev, space_type_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Space Type</option>
                {spaceTypes.map((spaceType) => (
                  <option key={spaceType.id} value={spaceType.id}>
                    {spaceType.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenure</label>
              <select
                value={newPricing.tenure}
                onChange={(e) => setNewPricing(prev => ({ ...prev, tenure: e.target.value as 'Short' | 'Long' | 'Very Short' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Short">Short</option>
                <option value="Long">Long</option>
                <option value="Very Short">Very Short</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rate (BHD)</label>
              <input
                type="number"
                value={newPricing.monthly_rate}
                onChange={(e) => setNewPricing(prev => ({ ...prev, monthly_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate (BHD)</label>
              <input
                type="number"
                value={newPricing.daily_rate}
                onChange={(e) => setNewPricing(prev => ({ ...prev, daily_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newPricing.description}
                onChange={(e) => setNewPricing(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addPricing}
                disabled={saving || !newPricing.space_type_id || newPricing.monthly_rate <= 0 || newPricing.daily_rate <= 0}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Pricing'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Office Pricing List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Manage Office Pricing</h3>
          <p className="text-sm text-gray-500">Edit or delete existing office pricing</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Space Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {officePricing.map((pricing) => (
                <tr key={pricing.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === pricing.id ? (
                      <select
                        value={pricing.space_type_id}
                        onChange={(e) => handlePricingChange(pricing.id, 'space_type_id', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {spaceTypes.map((spaceType) => (
                          <option key={spaceType.id} value={spaceType.id}>
                            {spaceType.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{getSpaceTypeName(pricing.space_type_id)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === pricing.id ? (
                      <select
                        value={pricing.tenure}
                        onChange={(e) => handlePricingChange(pricing.id, 'tenure', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Short">Short</option>
                        <option value="Long">Long</option>
                        <option value="Very Short">Very Short</option>
                      </select>
                    ) : (
                      <div className="text-sm text-gray-900">{pricing.tenure}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === pricing.id ? (
                      <input
                        type="number"
                        value={pricing.monthly_rate}
                        onChange={(e) => handlePricingChange(pricing.id, 'monthly_rate', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.01"
                        min="0"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{pricing.monthly_rate.toFixed(2)} BHD</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === pricing.id ? (
                      <input
                        type="number"
                        value={pricing.daily_rate}
                        onChange={(e) => handlePricingChange(pricing.id, 'daily_rate', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.01"
                        min="0"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{pricing.daily_rate.toFixed(2)} BHD</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === pricing.id ? (
                      <input
                        type="text"
                        value={pricing.description || ''}
                        onChange={(e) => handlePricingChange(pricing.id, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="text-sm text-gray-500">{pricing.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === pricing.id ? (
                      <select
                        value={pricing.active ? 'true' : 'false'}
                        onChange={(e) => handlePricingChange(pricing.id, 'active', e.target.value === 'true')}
                        className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    ) : (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        pricing.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {pricing.active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingId === pricing.id ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updatePricing(pricing)}
                          disabled={saving}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingId(pricing.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deletePricing(pricing.id)}
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">About Office Pricing</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Space Type:</strong> The warehouse space type this pricing applies to</li>
          <li>• <strong>Tenure:</strong> Lease term (Short, Long, or Very Short)</li>
          <li>• <strong>Monthly Rate:</strong> Fixed monthly rate for office space in BHD</li>
          <li>• <strong>Daily Rate:</strong> Daily rate for Very Short term leases in BHD</li>
          <li>• <strong>Description:</strong> Optional description of the pricing</li>
          <li>• <strong>Status:</strong> Active pricing is available in the calculator</li>
        </ul>
      </div>
    </div>
  )
}
