'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { EWASettings } from '@/lib/supabase'

export default function AdminEWASettings() {
  const [ewaSettings, setEwaSettings] = useState<EWASettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    house_load_description: '',
    heavy_usage_description: '',
    government_tariff_per_kwh: 0,
    estimated_fixed_monthly_charges: 0,
    estimated_meter_deposit: 0,
    estimated_installation_fee: 0
  })

  useEffect(() => {
    loadEWASettings()
  }, [])

  const loadEWASettings = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('ewa_settings')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 is "no rows returned"
      
      if (data) {
        setEwaSettings(data)
        setFormData({
          house_load_description: data.house_load_description,
          heavy_usage_description: data.heavy_usage_description,
          government_tariff_per_kwh: data.government_tariff_per_kwh,
          estimated_fixed_monthly_charges: data.estimated_fixed_monthly_charges,
          estimated_meter_deposit: data.estimated_meter_deposit,
          estimated_installation_fee: data.estimated_installation_fee
        })
      }
    } catch (err) {
      setError('Failed to load EWA settings')
      console.error('Error loading EWA settings:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      if (ewaSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('ewa_settings')
          .update(formData)
          .eq('id', ewaSettings.id)

        if (error) throw error
        setSuccess('EWA settings updated successfully')
      } else {
        // Create new settings
        const { error } = await supabase
          .from('ewa_settings')
          .insert([formData])

        if (error) throw error
        setSuccess('EWA settings created successfully')
      }

      await loadEWASettings()
    } catch (err) {
      setError('Failed to save EWA settings')
      console.error('Error saving EWA settings:', err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading EWA settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">EWA Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage Electricity and Water Authority settings and descriptions
        </p>
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

      {/* Settings Form */}
      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          EWA Configuration
        </h3>
        
        <div className="space-y-6">
          {/* Descriptions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                House Load Description
              </label>
              <textarea
                value={formData.house_load_description}
                onChange={(e) => setFormData({...formData, house_load_description: e.target.value})}
                rows={4}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Description for house load electricity usage..."
              />
              <p className="mt-1 text-xs text-gray-500">
                This description will be shown to customers when they select house load option
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Heavy Usage Description
              </label>
              <textarea
                value={formData.heavy_usage_description}
                onChange={(e) => setFormData({...formData, heavy_usage_description: e.target.value})}
                rows={4}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Description for heavy usage/dedicated meter..."
              />
              <p className="mt-1 text-xs text-gray-500">
                This description will be shown to customers when they select dedicated meter option
              </p>
            </div>
          </div>

          {/* Rates and Fees */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Government Tariff (BHD/kWh)
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.government_tariff_per_kwh}
                onChange={(e) => setFormData({...formData, government_tariff_per_kwh: parseFloat(e.target.value) || 0})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Official government electricity tariff
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fixed Monthly Charges (BHD)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.estimated_fixed_monthly_charges}
                onChange={(e) => setFormData({...formData, estimated_fixed_monthly_charges: parseFloat(e.target.value) || 0})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Estimated fixed monthly EWA charges
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Meter Deposit (BHD)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.estimated_meter_deposit}
                onChange={(e) => setFormData({...formData, estimated_meter_deposit: parseFloat(e.target.value) || 0})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                One-time meter deposit fee
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Installation Fee (BHD)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.estimated_installation_fee}
                onChange={(e) => setFormData({...formData, estimated_installation_fee: parseFloat(e.target.value) || 0})}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                One-time installation fee
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Current Settings Display */}
      {ewaSettings && (
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Current Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">House Load</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {ewaSettings.house_load_description}
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Heavy Usage</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                {ewaSettings.heavy_usage_description}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-blue-900">Government Tariff</div>
              <div className="text-2xl font-bold text-blue-600">
                {ewaSettings.government_tariff_per_kwh} BHD/kWh
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-green-900">Monthly Charges</div>
              <div className="text-2xl font-bold text-green-600">
                {ewaSettings.estimated_fixed_monthly_charges} BHD
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-yellow-900">Meter Deposit</div>
              <div className="text-2xl font-bold text-yellow-600">
                {ewaSettings.estimated_meter_deposit} BHD
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm font-medium text-purple-900">Installation Fee</div>
              <div className="text-2xl font-bold text-purple-600">
                {ewaSettings.estimated_installation_fee} BHD
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
