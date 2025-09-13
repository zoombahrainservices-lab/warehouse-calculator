'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

interface SystemSetting {
  id: string
  setting_key: string
  setting_value: string
  description: string
  data_type: 'string' | 'number' | 'boolean' | 'json'
  created_at: string
  updated_at: string
}

export default function AdminSystemSettings() {
  const { user, isLoading: authLoading, logout } = useAuth({ requiredRole: 'ADMIN' })
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null)
  const [newSetting, setNewSetting] = useState<Partial<SystemSetting>>({
    setting_key: '',
    setting_value: '',
    description: '',
    data_type: 'string'
  })

  useEffect(() => {
    if (!authLoading) {
      loadData()
    }
  }, [authLoading])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_key', { ascending: true })

      if (settingsError) throw settingsError

      setSettings(settingsData || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const addSetting = async () => {
    try {
      if (!newSetting.setting_key || !newSetting.setting_value || !newSetting.description) {
        alert('Please fill in all required fields')
        return
      }

      // Validate setting value based on data type
      if (newSetting.data_type === 'number' && isNaN(Number(newSetting.setting_value))) {
        alert('Setting value must be a valid number')
        return
      }

      if (newSetting.data_type === 'boolean' && !['true', 'false', '1', '0'].includes(newSetting.setting_value.toLowerCase())) {
        alert('Setting value must be true/false, 1/0, or yes/no')
        return
      }

      if (newSetting.data_type === 'json') {
        try {
          JSON.parse(newSetting.setting_value)
        } catch {
          alert('Setting value must be valid JSON')
          return
        }
      }

      const { error } = await supabase
        .from('system_settings')
        .insert([{
          ...newSetting,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) throw error

      setShowAddModal(false)
      setNewSetting({
        setting_key: '',
        setting_value: '',
        description: '',
        data_type: 'string'
      })
      loadData()
      alert('System setting added successfully!')
    } catch (err) {
      console.error('Error adding setting:', err)
      alert('Failed to add system setting: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const updateSetting = async (setting: SystemSetting) => {
    try {
      // Validate setting value based on data type
      if (setting.data_type === 'number' && isNaN(Number(setting.setting_value))) {
        alert('Setting value must be a valid number')
        return
      }

      if (setting.data_type === 'boolean' && !['true', 'false', '1', '0'].includes(setting.setting_value.toLowerCase())) {
        alert('Setting value must be true/false, 1/0, or yes/no')
        return
      }

      if (setting.data_type === 'json') {
        try {
          JSON.parse(setting.setting_value)
        } catch {
          alert('Setting value must be valid JSON')
          return
        }
      }

      const { error } = await supabase
        .from('system_settings')
        .update({
          setting_key: setting.setting_key,
          setting_value: setting.setting_value,
          description: setting.description,
          data_type: setting.data_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', setting.id)

      if (error) throw error

      setEditingSetting(null)
      loadData()
      alert('System setting updated successfully!')
    } catch (err) {
      console.error('Error updating setting:', err)
      alert('Failed to update system setting: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const deleteSetting = async (id: string) => {
    if (!confirm('Are you sure you want to delete this system setting? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('system_settings')
        .delete()
        .eq('id', id)

      if (error) throw error

      loadData()
      alert('System setting deleted successfully!')
    } catch (err) {
      console.error('Error deleting setting:', err)
      alert('Failed to delete system setting: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const getDataTypeColor = (dataType: string) => {
    switch (dataType) {
      case 'string': return 'bg-blue-100 text-blue-800'
      case 'number': return 'bg-green-100 text-green-800'
      case 'boolean': return 'bg-purple-100 text-purple-800'
      case 'json': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatSettingValue = (setting: SystemSetting) => {
    switch (setting.data_type) {
      case 'boolean':
        return setting.setting_value.toLowerCase() === 'true' || setting.setting_value === '1' ? 'Yes' : 'No'
      case 'json':
        try {
          return JSON.stringify(JSON.parse(setting.setting_value), null, 2)
        } catch {
          return setting.setting_value
        }
      default:
        return setting.setting_value
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
        <span className="ml-3 text-gray-600">Loading system settings...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
            <p className="text-gray-600 mt-1">Manage system configuration and settings</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              Add New Setting
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

        {/* System Settings Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">System Settings</h2>
            <p className="text-sm text-gray-600 mt-1">Global configuration settings for the warehouse management system</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Setting Key</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {settings.map((setting) => (
                  <tr key={setting.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {editingSetting?.id === setting.id ? (
                        <input
                          type="text"
                          value={editingSetting.setting_key}
                          onChange={(e) => setEditingSetting({
                            ...editingSetting,
                            setting_key: e.target.value
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        setting.setting_key
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingSetting?.id === setting.id ? (
                        setting.data_type === 'boolean' ? (
                          <select
                            value={editingSetting.setting_value}
                            onChange={(e) => setEditingSetting({
                              ...editingSetting,
                              setting_value: e.target.value
                            })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        ) : setting.data_type === 'json' ? (
                          <textarea
                            value={editingSetting.setting_value}
                            onChange={(e) => setEditingSetting({
                              ...editingSetting,
                              setting_value: e.target.value
                            })}
                            rows={3}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm font-mono text-xs"
                            placeholder='{"key": "value"}'
                          />
                        ) : (
                          <input
                            type={setting.data_type === 'number' ? 'number' : 'text'}
                            step={setting.data_type === 'number' ? 'any' : undefined}
                            value={editingSetting.setting_value}
                            onChange={(e) => setEditingSetting({
                              ...editingSetting,
                              setting_value: e.target.value
                            })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        )
                      ) : (
                        <div className="text-sm text-gray-900">
                          {setting.data_type === 'json' ? (
                            <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded max-w-xs overflow-x-auto">
                              {formatSettingValue(setting)}
                            </pre>
                          ) : (
                            formatSettingValue(setting)
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {editingSetting?.id === setting.id ? (
                        <textarea
                          value={editingSetting.description}
                          onChange={(e) => setEditingSetting({
                            ...editingSetting,
                            description: e.target.value
                          })}
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        setting.description
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingSetting?.id === setting.id ? (
                        <select
                          value={editingSetting.data_type}
                          onChange={(e) => setEditingSetting({
                            ...editingSetting,
                            data_type: e.target.value as 'string' | 'number' | 'boolean' | 'json'
                          })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="json">JSON</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDataTypeColor(setting.data_type)}`}>
                          {setting.data_type.charAt(0).toUpperCase() + setting.data_type.slice(1)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingSetting?.id === setting.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => updateSetting(editingSetting)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingSetting(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingSetting(setting)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteSetting(setting.id)}
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

        {/* Add New Setting Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Add New System Setting</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Setting Key *</label>
                  <input
                    type="text"
                    value={newSetting.setting_key}
                    onChange={(e) => setNewSetting({...newSetting, setting_key: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., default_currency"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                  <textarea
                    value={newSetting.description}
                    onChange={(e) => setNewSetting({...newSetting, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Description of what this setting controls..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data Type *</label>
                    <select
                      value={newSetting.data_type}
                      onChange={(e) => setNewSetting({...newSetting, data_type: e.target.value as 'string' | 'number' | 'boolean' | 'json'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Setting Value *</label>
                    {newSetting.data_type === 'boolean' ? (
                      <select
                        value={newSetting.setting_value}
                        onChange={(e) => setNewSetting({...newSetting, setting_value: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select...</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : newSetting.data_type === 'json' ? (
                      <textarea
                        value={newSetting.setting_value}
                        onChange={(e) => setNewSetting({...newSetting, setting_value: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder='{"key": "value"}'
                      />
                    ) : (
                      <input
                        type={newSetting.data_type === 'number' ? 'number' : 'text'}
                        step={newSetting.data_type === 'number' ? 'any' : undefined}
                        value={newSetting.setting_value}
                        onChange={(e) => setNewSetting({...newSetting, setting_value: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={newSetting.data_type === 'number' ? '0' : 'Enter value...'}
                      />
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Data Type Guidelines:</h3>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li><strong>String:</strong> Text values (e.g., &quot;BHD&quot;, &quot;en&quot;)</li>
                    <li><strong>Number:</strong> Numeric values (e.g., 100, 3.14)</li>
                    <li><strong>Boolean:</strong> True/False values (e.g., true, false)</li>
                    <li><strong>JSON:</strong> Complex data structures (e.g., &#123;&apos;key&apos;: &apos;value&apos;&#125;)</li>
                  </ul>
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
                  onClick={addSetting}
                  disabled={!newSetting.setting_key || !newSetting.setting_value || !newSetting.description}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                  Add Setting
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



