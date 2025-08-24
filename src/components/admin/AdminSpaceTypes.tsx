'use client'

import { useState, useEffect } from 'react'
import { supabase, SpaceType } from '@/lib/supabase'

export default function AdminSpaceTypes() {
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newSpaceType, setNewSpaceType] = useState({
    name: '',
    description: '',
    sort_order: 0
  })

  useEffect(() => {
    loadSpaceTypes()
  }, [])

  const loadSpaceTypes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('space_types')
        .select('*')
        .order('sort_order')

      if (error) throw error
      setSpaceTypes(data || [])
    } catch (err) {
      console.error('Error loading space types:', err)
      setMessage({ type: 'error', text: 'Failed to load space types' })
    } finally {
      setLoading(false)
    }
  }

  const addSpaceType = async () => {
    if (!newSpaceType.name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' })
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('space_types')
        .insert([newSpaceType])

      if (error) throw error
      
      setMessage({ type: 'success', text: 'Space type added successfully' })
      setNewSpaceType({ name: '', description: '', sort_order: 0 })
      await loadSpaceTypes()
    } catch (err) {
      console.error('Error adding space type:', err)
      setMessage({ type: 'error', text: 'Failed to add space type' })
    } finally {
      setSaving(false)
    }
  }

  const updateSpaceType = async (spaceType: SpaceType) => {
    try {
      setSaving(true)
      const { error } = await supabase
        .from('space_types')
        .update({
          name: spaceType.name,
          description: spaceType.description,
          sort_order: spaceType.sort_order,
          active: spaceType.active
        })
        .eq('id', spaceType.id)

      if (error) throw error
      
      setMessage({ type: 'success', text: 'Space type updated successfully' })
      setEditingId(null)
      await loadSpaceTypes()
    } catch (err) {
      console.error('Error updating space type:', err)
      setMessage({ type: 'error', text: 'Failed to update space type' })
    } finally {
      setSaving(false)
    }
  }

  const deleteSpaceType = async (id: string) => {
    if (!confirm('Are you sure you want to delete this space type? This will also delete related pricing rates and office pricing.')) {
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('space_types')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setMessage({ type: 'success', text: 'Space type deleted successfully' })
      await loadSpaceTypes()
    } catch (err) {
      console.error('Error deleting space type:', err)
      setMessage({ type: 'error', text: 'Failed to delete space type' })
    } finally {
      setSaving(false)
    }
  }

  const handleSpaceTypeChange = (id: string, field: keyof SpaceType, value: string | number | boolean) => {
    setSpaceTypes(prev => prev.map(st => 
      st.id === id ? { ...st, [field]: value } : st
    ))
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
        <h2 className="text-2xl font-bold text-gray-900">Space Types</h2>
        <button
          onClick={loadSpaceTypes}
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

      {/* Add New Space Type */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Add New Space Type</h3>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={newSpaceType.name}
                onChange={(e) => setNewSpaceType(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Ground Floor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                value={newSpaceType.description}
                onChange={(e) => setNewSpaceType(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Ground floor warehouse space"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                value={newSpaceType.sort_order}
                onChange={(e) => setNewSpaceType(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={addSpaceType}
                disabled={saving || !newSpaceType.name.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {saving ? 'Adding...' : 'Add Space Type'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Space Types List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Manage Space Types</h3>
          <p className="text-sm text-gray-500">Edit or delete existing space types</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sort Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {spaceTypes.map((spaceType) => (
                <tr key={spaceType.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === spaceType.id ? (
                      <input
                        type="text"
                        value={spaceType.name}
                        onChange={(e) => handleSpaceTypeChange(spaceType.id, 'name', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{spaceType.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === spaceType.id ? (
                      <input
                        type="text"
                        value={spaceType.description || ''}
                        onChange={(e) => handleSpaceTypeChange(spaceType.id, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="text-sm text-gray-500">{spaceType.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === spaceType.id ? (
                      <input
                        type="number"
                        value={spaceType.sort_order}
                        onChange={(e) => handleSpaceTypeChange(spaceType.id, 'sort_order', parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="text-sm text-gray-900">{spaceType.sort_order}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === spaceType.id ? (
                      <select
                        value={spaceType.active ? 'true' : 'false'}
                        onChange={(e) => handleSpaceTypeChange(spaceType.id, 'active', e.target.value === 'true')}
                        className="px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    ) : (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        spaceType.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {spaceType.active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {editingId === spaceType.id ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateSpaceType(spaceType)}
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
                          onClick={() => setEditingId(spaceType.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSpaceType(spaceType.id)}
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
        <h4 className="text-sm font-medium text-blue-900 mb-2">About Space Types</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Name:</strong> Display name for the space type (e.g., &quot;Ground Floor&quot;, &quot;Mezzanine&quot;)</li>
          <li>• <strong>Description:</strong> Optional description of the space type</li>
          <li>• <strong>Sort Order:</strong> Order in which space types appear in the calculator</li>
          <li>• <strong>Status:</strong> Active space types are available in the calculator</li>
          <li>• <strong>Note:</strong> Deleting a space type will also delete related pricing rates and office pricing</li>
        </ul>
      </div>
    </div>
  )
}
