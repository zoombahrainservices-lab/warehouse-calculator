'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, type EWASettings } from '@/lib/supabase'

export default function EditEWASettings({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [ewa, setEwa] = useState<EWASettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEwa()
  }, [resolvedParams.id])

  const loadEwa = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('ewa_settings')
        .select('*')
        .eq('id', resolvedParams.id)
        .single()

      if (error) throw error
      setEwa(data)
    } catch (err) {
      console.error('Error loading EWA settings:', err)
      setError('Failed to load EWA settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ewa) return

    try {
      setSaving(true)
      setError(null)

      const payload = {
        house_load_description: ewa.house_load_description,
        dedicated_meter_description: ewa.dedicated_meter_description,
        estimated_setup_deposit: ewa.estimated_setup_deposit,
        estimated_installation_fee: ewa.estimated_installation_fee
      } as const

      const { error } = await supabase
        .from('ewa_settings')
        .update(payload)
        .eq('id', resolvedParams.id)
        .select()
        .single()

      if (error) throw error

      alert('EWA settings updated successfully!')
      router.push('/admin')
    } catch (err) {
      const message = (err as any)?.message || 'Unknown error'
      console.error('Error updating EWA settings:', err)
      setError(`Failed to update EWA settings: ${message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof EWASettings, value: any) => {
    if (!ewa) return
    setEwa({ ...ewa, [field]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    )
  }

  if (!ewa) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">EWA Settings Not Found</h2>
          <button
            onClick={() => router.push('/admin')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Admin Panel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit EWA Settings</h1>
            <p className="text-gray-600 mt-1">Update electricity & water settings</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Admin Panel
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">House Load Description</label>
              <textarea
                value={ewa.house_load_description || ''}
                onChange={(e) => handleChange('house_load_description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dedicated Meter Description</label>
              <textarea
                value={ewa.dedicated_meter_description || ''}
                onChange={(e) => handleChange('dedicated_meter_description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Setup Deposit (BHD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={ewa.estimated_setup_deposit || ''}
                  onChange={(e) => handleChange('estimated_setup_deposit', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Installation Fee (BHD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={ewa.estimated_installation_fee || ''}
                  onChange={(e) => handleChange('estimated_installation_fee', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="px-6 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


