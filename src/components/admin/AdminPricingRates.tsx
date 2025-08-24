'use client'

import { useState, useEffect } from 'react'
import { supabase, PricingRate, SpaceType } from '@/lib/supabase'

export default function AdminPricingRates() {
  const [pricingRates, setPricingRates] = useState<PricingRate[]>([])
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newRate, setNewRate] = useState({
    space_type_id: '',
    area_band_name: '',
    area_band_min: 0,
    area_band_max: null as number | null,
    tenure: 'Short' as 'Short' | 'Long' | 'Very Short',
    tenure_description: '',
    monthly_rate_per_sqm: 0,
    daily_rate_per_sqm: 0,
    min_chargeable_area: 0,
    package_starting_bhd: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [ratesResult, spaceTypesResult] = await Promise.all([
        supabase.from('pricing_rates').select('*').order('area_band_min'),
        supabase.from('space_types').select('*').eq('active', true).order('sort_order')
      ])

      if (ratesResult.error) throw ratesResult.error
      if (spaceTypesResult.error) throw spaceTypesResult.error

      setPricingRates(ratesResult.data || [])
      setSpaceTypes(spaceTypesResult.data || [])
      
      // Set default space type for new rate
      if (spaceTypesResult.data && spaceTypesResult.data.length > 0) {
        setNewRate(prev => ({ ...prev, space_type_id: spaceTypesResult.data[0].id }))
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const addRate = async () => {
    if (!newRate.space_type_id || !newRate.area_band_name || newRate.monthly_rate_per_sqm <= 0) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('pricing_rates')
        .insert([newRate])

      if (error) throw error
      
      setMessage({ type: 'success', text: 'Pricing rate added successfully' })
      setNewRate({
        space_type_id: spaceTypes[0]?.id || '',
        area_band_name: '',
        area_band_min: 0,
        area_band_max: null,
        tenure: 'Short',
        tenure_description: '',
        monthly_rate_per_sqm: 0,
        daily_rate_per_sqm: 0,
        min_chargeable_area: 0,
        package_starting_bhd: 0
      })
      await loadData()
    } catch (err) {
      console.error('Error adding pricing rate:', err)
      setMessage({ type: 'error', text: 'Failed to add pricing rate' })
    } finally {
      setSaving(false)
    }
  }

  const updateRate = async (rate: PricingRate) => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('pricing_rates')
        .update({
          space_type_id: rate.space_type_id,
          area_band_name: rate.area_band_name,
          area_band_min: rate.area_band_min,
          area_band_max: rate.area_band_max,
          tenure: rate.tenure,
          tenure_description: rate.tenure_description,
          monthly_rate_per_sqm: rate.monthly_rate_per_sqm,
          daily_rate_per_sqm: rate.daily_rate_per_sqm,
          min_chargeable_area: rate.min_chargeable_area,
          package_starting_bhd: rate.package_starting_bhd,
          active: rate.active
        })
        .eq('id', rate.id)

      if (error) throw error
      
      setMessage({ type: 'success', text: 'Pricing rate updated successfully' })
      setEditingId(null)
      await loadData()
    } catch (err) {
      console.error('Error updating pricing rate:', err)
      setMessage({ type: 'error', text: 'Failed to update pricing rate' })
    } finally {
      setSaving(false)
    }
  }

  const deleteRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing rate?')) {
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('pricing_rates')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setMessage({ type: 'success', text: 'Pricing rate deleted successfully' })
      await loadData()
    } catch (err) {
      console.error('Error deleting pricing rate:', err)
      setMessage({ type: 'error', text: 'Failed to delete pricing rate' })
    } finally {
      setSaving(false)
    }
  }

  const handleRateChange = (id: string, field: keyof PricingRate, value: string | number | boolean | null) => {
    setPricingRates(prev => prev.map(rate => 
      rate.id === id ? { ...rate, [field]: value } : rate
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
        <h2 className="text-2xl font-bold text-gray-900">Pricing Rates</h2>
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

      {/* Add New Pricing Rate */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Add New Pricing Rate</h3>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Space Type</label>
              <select
                value={newRate.space_type_id}
                onChange={(e) => setNewRate(prev => ({ ...prev, space_type_id: e.target.value }))}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Area Band</label>
              <input
                type="text"
                value={newRate.area_band_name}
                onChange={(e) => setNewRate(prev => ({ ...prev, area_band_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Small units"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Area (m²)</label>
              <input
                type="number"
                value={newRate.area_band_min}
                onChange={(e) => setNewRate(prev => ({ ...prev, area_band_min: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Area (m²)</label>
              <input
                type="number"
                value={newRate.area_band_max || ''}
                onChange={(e) => setNewRate(prev => ({ ...prev, area_band_max: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Leave empty for unlimited"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenure</label>
              <select
                value={newRate.tenure}
                onChange={(e) => setNewRate(prev => ({ ...prev, tenure: e.target.value as 'Short' | 'Long' | 'Very Short' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Very Short">Very Short</option>
                <option value="Short">Short</option>
                <option value="Long">Long</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rate (BHD/m²)</label>
              <input
                type="number"
                value={newRate.monthly_rate_per_sqm}
                onChange={(e) => setNewRate(prev => ({ ...prev, monthly_rate_per_sqm: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.000"
                step="0.001"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate (BHD/m²)</label>
              <input
                type="number"
                value={newRate.daily_rate_per_sqm}
                onChange={(e) => setNewRate(prev => ({ ...prev, daily_rate_per_sqm: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.000"
                step="0.001"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Chargeable Area (m²)</label>
              <input
                type="number"
                value={newRate.min_chargeable_area}
                onChange={(e) => setNewRate(prev => ({ ...prev, min_chargeable_area: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package Starting (BHD)</label>
              <input
                type="number"
                value={newRate.package_starting_bhd}
                onChange={(e) => setNewRate(prev => ({ ...prev, package_starting_bhd: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenure Description</label>
              <input
                type="text"
                value={newRate.tenure_description}
                onChange={(e) => setNewRate(prev => ({ ...prev, tenure_description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Less than One Year"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addRate}
                disabled={saving || !newRate.space_type_id || !newRate.area_band_name || newRate.monthly_rate_per_sqm <= 0}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Rate'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Rates List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Manage Pricing Rates</h3>
          <p className="text-sm text-gray-500">Edit or delete existing pricing rates</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Space Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Band</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Range</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Area</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pricingRates.map((rate) => (
                <tr key={rate.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === rate.id ? (
                      <select
                        value={rate.space_type_id}
                        onChange={(e) => handleRateChange(rate.id, 'space_type_id', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {spaceTypes.map((spaceType) => (
                          <option key={spaceType.id} value={spaceType.id}>
                            {spaceType.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{getSpaceTypeName(rate.space_type_id)}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === rate.id ? (
                      <input
                        type="text"
                        value={rate.area_band_name}
                        onChange={(e) => handleRateChange(rate.id, 'area_band_name', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{rate.area_band_name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {rate.area_band_min} - {rate.area_band_max || '∞'} m²
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === rate.id ? (
                      <select
                        value={rate.tenure}
                        onChange={(e) => handleRateChange(rate.id, 'tenure', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Very Short">Very Short</option>
                        <option value="Short">Short</option>
                        <option value="Long">Long</option>
                      </select>
                    ) : (
                      <div className="text-sm text-gray-900">{rate.tenure}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === rate.id ? (
                      <input
                        type="number"
                        value={rate.monthly_rate_per_sqm}
                        onChange={(e) => handleRateChange(rate.id, 'monthly_rate_per_sqm', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.001"
                        min="0"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{rate.monthly_rate_per_sqm.toFixed(3)} BHD</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === rate.id ? (
                      <input
                        type="number"
                        value={rate.daily_rate_per_sqm}
                        onChange={(e) => handleRateChange(rate.id, 'daily_rate_per_sqm', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        step="0.001"
                        min="0"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{rate.daily_rate_per_sqm.toFixed(3)} BHD</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === rate.id ? (
                      <input
                        type="number"
                        value={rate.min_chargeable_area}
                        onChange={(e) => handleRateChange(rate.id, 'min_chargeable_area', parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{rate.min_chargeable_area} m²</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === rate.id ? (
                      <input
                        type="number"
                        value={rate.package_starting_bhd || 0}
                        onChange={(e) => handleRateChange(rate.id, 'package_starting_bhd', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{rate.package_starting_bhd || 0} BHD</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === rate.id ? (
                      <select
                        value={rate.active ? 'true' : 'false'}
                        onChange={(e) => handleRateChange(rate.id, 'active', e.target.value === 'true')}
                        className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    ) : (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        rate.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {rate.active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingId === rate.id ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateRate(rate)}
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
                          onClick={() => setEditingId(rate.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteRate(rate.id)}
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
        <h4 className="text-sm font-medium text-blue-900 mb-2">About Pricing Rates</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Space Type:</strong> The warehouse space type this rate applies to</li>
          <li>• <strong>Area Band:</strong> Name for the area range (e.g., &quot;Small units&quot;, &quot;1,000–1,499 m²&quot;)</li>
          <li>• <strong>Area Range:</strong> Minimum and maximum area this rate applies to</li>
          <li>• <strong>Tenure:</strong> Lease term (Short, Long, or Very Short)</li>
          <li>• <strong>Monthly Rate:</strong> Rate per square meter per month in BHD</li>
          <li>• <strong>Daily Rate:</strong> Rate per square meter per day for Very Short term</li>
          <li>• <strong>Min Chargeable Area:</strong> Minimum area that will be charged</li>
          <li>• <strong>Package Starting:</strong> Starting price for this area band</li>
        </ul>
      </div>
    </div>
  )
}
