'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

interface EWASettings {
  id: string
  house_load_description: string
  dedicated_meter_description: string
  estimated_setup_deposit: number
  estimated_installation_fee: number
  created_at: string
  updated_at: string
}

export default function AdminEWASettings() {
  const { user, isLoading: authLoading, logout } = useAuth({ requiredRole: 'ADMIN' })
  const [ewaSettings, setEwaSettings] = useState<EWASettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedSettings, setEditedSettings] = useState<Partial<EWASettings>>({})

  useEffect(() => {
    if (!authLoading) {
      loadData()
    }
  }, [authLoading])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const { data: settings, error: settingsError } = await supabase
        .from('ewa_settings')
        .select('*')
        .limit(1)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError

      setEwaSettings(settings)
      if (settings) {
        setEditedSettings(settings)
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      if (!editedSettings.house_load_description || !editedSettings.dedicated_meter_description) {
        alert('Please fill in all required fields')
        return
      }

      if (ewaSettings) {
        // Update existing settings
        const { error } = await supabase
          .from('ewa_settings')
          .update({
            house_load_description: editedSettings.house_load_description,
            dedicated_meter_description: editedSettings.dedicated_meter_description,
            estimated_setup_deposit: editedSettings.estimated_setup_deposit || 0,
            estimated_installation_fee: editedSettings.estimated_installation_fee || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', ewaSettings.id)

        if (error) throw error
      } else {
        // Create new settings
        const { error } = await supabase
          .from('ewa_settings')
          .insert([{
            id: crypto.randomUUID(),
            house_load_description: editedSettings.house_load_description,
            dedicated_meter_description: editedSettings.dedicated_meter_description,
            estimated_setup_deposit: editedSettings.estimated_setup_deposit || 0,
            estimated_installation_fee: editedSettings.estimated_installation_fee || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])

        if (error) throw error
      }

      setIsEditing(false)
      loadData()
      alert('EWA settings saved successfully!')
    } catch (err) {
      console.error('Error saving settings:', err)
      alert('Failed to save EWA settings: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    if (ewaSettings) {
      setEditedSettings(ewaSettings)
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
        <span className="ml-3 text-gray-600">Loading EWA settings...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">EWA Settings</h1>
            <p className="text-gray-600 mt-1">Manage EWA (Electricity and Water Authority) settings</p>
          </div>
          <div className="flex space-x-3">
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

        {/* EWA Settings Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">EWA Settings</h2>
                <p className="text-sm text-gray-600 mt-1">Configure electricity and water authority settings for the calculator</p>
              </div>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Edit Settings
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {isEditing ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    House Load Description *
                  </label>
                  <textarea
                    value={editedSettings.house_load_description || ''}
                    onChange={(e) => setEditedSettings({
                      ...editedSettings,
                      house_load_description: e.target.value
                    })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the house load requirements..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dedicated Meter Description *
                  </label>
                  <textarea
                    value={editedSettings.dedicated_meter_description || ''}
                    onChange={(e) => setEditedSettings({
                      ...editedSettings,
                      dedicated_meter_description: e.target.value
                    })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe the dedicated meter setup..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Setup Deposit (BHD)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={editedSettings.estimated_setup_deposit || ''}
                      onChange={(e) => setEditedSettings({
                        ...editedSettings,
                        estimated_setup_deposit: parseFloat(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Installation Fee (BHD)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={editedSettings.estimated_installation_fee || ''}
                      onChange={(e) => setEditedSettings({
                        ...editedSettings,
                        estimated_installation_fee: parseFloat(e.target.value) || 0
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveSettings}
                    disabled={!editedSettings.house_load_description || !editedSettings.dedicated_meter_description}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    Save Settings
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {ewaSettings ? (
                  <>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">House Load Description</h3>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {ewaSettings.house_load_description}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">Dedicated Meter Description</h3>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {ewaSettings.dedicated_meter_description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium text-gray-900 mb-2">Estimated Setup Deposit</h3>
                        <p className="text-2xl font-bold text-blue-600">
                          {ewaSettings.estimated_setup_deposit} BHD
                        </p>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium text-gray-900 mb-2">Estimated Installation Fee</h3>
                        <p className="text-2xl font-bold text-blue-600">
                          {ewaSettings.estimated_installation_fee} BHD
                        </p>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500 mt-4">
                      Last updated: {new Date(ewaSettings.updated_at).toLocaleString()}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No EWA settings found. Click &apos;Edit Settings&apos; to create them.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


