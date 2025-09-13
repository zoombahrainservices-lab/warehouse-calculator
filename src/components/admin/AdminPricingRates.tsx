'use client'

import { useState, useEffect } from 'react'

import { supabase } from '@/lib/supabase'

interface PricingRate {
  id: string
  space_type: 'Ground Floor' | 'Mezzanine'
  tenure: 'Very Short' | 'Short' | 'Long'
  area_band_name: string
  area_band_min: number
  area_band_max: number | null
  monthly_rate_per_sqm: number
  daily_rate_per_sqm: number
  min_chargeable_area: number
  package_starting_bhd: number
  active: boolean
  created_at: string
  updated_at: string
}

interface SystemSetting {
  setting_key: string
  setting_value: string
  description: string
}

export default function AdminPricingRates() {
  const [pricingRates, setPricingRates] = useState<PricingRate[]>([])
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingRate, setEditingRate] = useState<PricingRate | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newRate, setNewRate] = useState<Partial<PricingRate>>({
    space_type: 'Ground Floor',
    tenure: 'Short',
    area_band_name: '',
    area_band_min: 0,
    area_band_max: null,
    monthly_rate_per_sqm: 0,
    daily_rate_per_sqm: 0,
    min_chargeable_area: 0,
    package_starting_bhd: 0,
    active: true
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load pricing rates
      const { data: rates, error: ratesError } = await supabase
        .from('pricing_rates')
        .select('*')
        .order('space_type', { ascending: true })
        .order('area_band_min', { ascending: true })
        .order('tenure', { ascending: true })

      if (ratesError) throw ratesError

      // Load system settings
      const { data: settings, error: settingsError } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key', { ascending: true })

      if (settingsError) throw settingsError

      setPricingRates(rates || [])
      setSystemSettings(settings || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const updateRate = async (rate: PricingRate) => {
    try {
      const { error } = await supabase
        .from('pricing_rates')
        .update({
          monthly_rate_per_sqm: rate.monthly_rate_per_sqm,
          daily_rate_per_sqm: rate.daily_rate_per_sqm,
          min_chargeable_area: rate.min_chargeable_area,
          package_starting_bhd: rate.package_starting_bhd,
          active: rate.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', rate.id)

      if (error) throw error

      setEditingRate(null)
      loadData()
      alert('Pricing rate updated successfully!')
    } catch (err) {
      console.error('Error updating rate:', err)
      alert('Failed to update pricing rate: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const addRate = async () => {
    try {
      if (!newRate.space_type || !newRate.tenure || !newRate.area_band_name) {
        alert('Please fill in all required fields')
        return
      }

      const { error } = await supabase
        .from('pricing_rates')
        .insert([{
          ...newRate,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) throw error

      setShowAddModal(false)
      setNewRate({
        space_type: 'Ground Floor',
        tenure: 'Short',
        area_band_name: '',
        area_band_min: 0,
        area_band_max: null,
        monthly_rate_per_sqm: 0,
        daily_rate_per_sqm: 0,
        min_chargeable_area: 0,
        package_starting_bhd: 0,
        active: true
      })
      loadData()
      alert('Pricing rate added successfully!')
    } catch (err) {
      console.error('Error adding rate:', err)
      alert('Failed to add pricing rate: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const deleteRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing rate? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('pricing_rates')
        .delete()
        .eq('id', id)

      if (error) throw error

      loadData()
      alert('Pricing rate deleted successfully!')
    } catch (err) {
      console.error('Error deleting rate:', err)
      alert('Failed to delete pricing rate: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const updateSystemSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: value })
        .eq('setting_key', key)

      if (error) throw error

      loadData()
      alert('System setting updated successfully!')
    } catch (err) {
      console.error('Error updating setting:', err)
      alert('Failed to update system setting: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading pricing rates...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadData}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pricing Rates Management</h2>
            <p className="text-gray-600 mt-1">Manage warehouse pricing rates and system settings</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Rate
          </button>
        </div>
      </div>

      {/* Pricing Rates Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Pricing Rates</h3>
          <p className="text-sm text-gray-600 mt-1">Current pricing rates for all space types and tenures</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Space Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Band</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Area</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package Starting</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pricingRates.map((rate) => (
                <tr key={rate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {rate.space_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rate.tenure}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rate.area_band_name}
                    <br />
                    <span className="text-xs text-gray-500">
                      {rate.area_band_min}-{rate.area_band_max || '∞'} m²
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingRate?.id === rate.id ? (
                      <input
                        type="number"
                        step="0.001"
                        value={editingRate.monthly_rate_per_sqm}
                        onChange={(e) => setEditingRate({
                          ...editingRate,
                          monthly_rate_per_sqm: parseFloat(e.target.value)
                        })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      `${rate.monthly_rate_per_sqm} BHD/m²`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingRate?.id === rate.id ? (
                      <input
                        type="number"
                        step="0.001"
                        value={editingRate.daily_rate_per_sqm}
                        onChange={(e) => setEditingRate({
                          ...editingRate,
                          daily_rate_per_sqm: parseFloat(e.target.value)
                        })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      `${rate.daily_rate_per_sqm} BHD/m²`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingRate?.id === rate.id ? (
                      <input
                        type="number"
                        value={editingRate.min_chargeable_area}
                        onChange={(e) => setEditingRate({
                          ...editingRate,
                          min_chargeable_area: parseInt(e.target.value)
                        })}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      `${rate.min_chargeable_area} m²`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {editingRate?.id === rate.id ? (
                      <input
                        type="number"
                        step="0.001"
                        value={editingRate.package_starting_bhd}
                        onChange={(e) => setEditingRate({
                          ...editingRate,
                          package_starting_bhd: parseFloat(e.target.value)
                        })}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      `${rate.package_starting_bhd} BHD`
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRate?.id === rate.id ? (
                      <select
                        value={editingRate.active ? 'true' : 'false'}
                        onChange={(e) => setEditingRate({
                          ...editingRate,
                          active: e.target.value === 'true'
                        })}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rate.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rate.active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingRate?.id === rate.id ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateRate(editingRate)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingRate(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingRate(rate)}
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

      {/* System Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
          <p className="text-sm text-gray-600 mt-1">Global system configuration values</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {systemSettings.map((setting) => (
              <div key={setting.setting_key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </label>
                <input
                  type="text"
                  value={setting.setting_value}
                  onChange={(e) => {
                    const updatedSettings = systemSettings.map(s => 
                      s.setting_key === setting.setting_key 
                        ? { ...s, setting_value: e.target.value }
                        : s
                    )
                    setSystemSettings(updatedSettings)
                  }}
                  onBlur={() => updateSystemSetting(setting.setting_key, setting.setting_value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500">{setting.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add New Rate Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New Pricing Rate</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Space Type *</label>
                  <select
                    value={newRate.space_type}
                    onChange={(e) => setNewRate({...newRate, space_type: e.target.value as 'Ground Floor' | 'Mezzanine'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="Mezzanine">Mezzanine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenure *</label>
                  <select
                    value={newRate.tenure}
                    onChange={(e) => setNewRate({...newRate, tenure: e.target.value as 'Very Short' | 'Short' | 'Long'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Very Short">Very Short</option>
                    <option value="Short">Short</option>
                    <option value="Long">Long</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area Band Name *</label>
                  <input
                    type="text"
                    value={newRate.area_band_name}
                    onChange={(e) => setNewRate({...newRate, area_band_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Small Units (1-999m²)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Area (m²) *</label>
                  <input
                    type="number"
                    value={newRate.area_band_min || ''}
                    onChange={(e) => setNewRate({...newRate, area_band_min: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Area (m²)</label>
                  <input
                    type="number"
                    value={newRate.area_band_max || ''}
                    onChange={(e) => setNewRate({...newRate, area_band_max: e.target.value ? parseInt(e.target.value) : null})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    placeholder="Leave empty for unlimited"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Chargeable Area (m²) *</label>
                  <input
                    type="number"
                    value={newRate.min_chargeable_area || ''}
                    onChange={(e) => setNewRate({...newRate, min_chargeable_area: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rate (BHD/m²) *</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newRate.monthly_rate_per_sqm || ''}
                    onChange={(e) => setNewRate({...newRate, monthly_rate_per_sqm: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate (BHD/m²) *</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newRate.daily_rate_per_sqm || ''}
                    onChange={(e) => setNewRate({...newRate, daily_rate_per_sqm: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Package Starting Price (BHD) *</label>
                <input
                  type="number"
                  step="0.001"
                  value={newRate.package_starting_bhd || ''}
                  onChange={(e) => setNewRate({...newRate, package_starting_bhd: parseFloat(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addRate}
                disabled={!newRate.space_type || !newRate.tenure || !newRate.area_band_name || !newRate.monthly_rate_per_sqm || !newRate.daily_rate_per_sqm}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                Add Rate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
