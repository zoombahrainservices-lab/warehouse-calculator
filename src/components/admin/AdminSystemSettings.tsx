'use client'

import { useState, useEffect } from 'react'
import { supabase, SystemSettings } from '@/lib/supabase'

export default function AdminSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key')

      if (error) throw error
      setSettings(data || [])
    } catch (err) {
      console.error('Error loading settings:', err)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (id: string, value: string) => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: value })
        .eq('id', id)

      if (error) throw error
      setMessage({ type: 'success', text: 'Setting updated successfully' })
      
      // Reload settings to get updated data
      await loadSettings()
    } catch (err) {
      console.error('Error updating setting:', err)
      setMessage({ type: 'error', text: 'Failed to update setting' })
    } finally {
      setSaving(false)
    }
  }

  const handleValueChange = (id: string, newValue: string) => {
    setSettings(prev => prev.map(setting => 
      setting.id === id ? { ...setting, setting_value: newValue } : setting
    ))
  }

  const handleSave = async (setting: SystemSettings) => {
    await updateSetting(setting.id, setting.setting_value)
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
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <button
          onClick={loadSettings}
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

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Global Configuration</h3>
          <p className="text-sm text-gray-500">Manage system-wide settings and defaults</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {settings.map((setting) => (
            <div key={setting.id} className="px-6 py-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                  {setting.description && (
                    <p className="text-sm text-gray-500 mb-2">{setting.description}</p>
                  )}
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={setting.setting_value}
                      onChange={(e) => handleValueChange(setting.id, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter value"
                    />
                    <button
                      onClick={() => handleSave(setting)}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">About System Settings</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Default VAT Rate:</strong> Percentage applied to quotes</li>
          <li>• <strong>Minimum Charge:</strong> Minimum amount in BHD for any quote</li>
          <li>• <strong>Quote Validity Days:</strong> How long quotes remain valid</li>
          <li>• <strong>Warehouse Location:</strong> Default address for quotes</li>
          <li>• <strong>Company Name:</strong> Business name displayed on quotes</li>
          <li>• <strong>Contact Email/Phone:</strong> Business contact information</li>
        </ul>
      </div>
    </div>
  )
}
