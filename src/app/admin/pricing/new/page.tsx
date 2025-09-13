'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { PricingRate } from '@/lib/supabase'

export default function NewPricingRatePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<PricingRate, 'id'>>({
    area_band_name: '',
    area_band_min: 0,
    area_band_max: null,
    space_type: 'Ground Floor' as PricingRate['space_type'],
    tenure: 'Short' as PricingRate['tenure'],
    monthly_rate_per_sqm: 0,
    daily_rate_per_sqm: 0,
    min_chargeable_area: 0,
    active: true
  })

  const handleChange = (field: keyof typeof form, value: string | number | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)

      const payload = {
        area_band_name: form.area_band_name,
        area_band_min: form.area_band_min || 0,
        area_band_max: form.area_band_max,
        space_type: form.space_type,
        tenure: form.tenure,
        monthly_rate_per_sqm: form.monthly_rate_per_sqm || 0,
        daily_rate_per_sqm: form.daily_rate_per_sqm || 0,
        min_chargeable_area: form.min_chargeable_area || 0,
        active: form.active
      }

      const { error } = await supabase
        .from('pricing_rates')
        .insert(payload)

      if (error) throw error

      alert('Pricing rate created!')
      router.push('/admin')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to create pricing rate: ${message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Add New Pricing Rate</h1>
            <p className="text-gray-600 mt-1">Create a new pricing rate row</p>
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
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Area Band Name *</label>
                <input
                  type="text"
                  value={form.area_band_name}
                  onChange={(e) => handleChange('area_band_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Area (m²) *</label>
                <input
                  type="number"
                  value={form.area_band_min || ''}
                  onChange={(e) => handleChange('area_band_min', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Area (m²)</label>
                <input
                  type="number"
                  value={form.area_band_max || ''}
                  onChange={(e) => handleChange('area_band_max', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Space Type *</label>
                <select
                  value={form.space_type}
                  onChange={(e) => handleChange('space_type', e.target.value as PricingRate['space_type'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Ground Floor">Ground Floor</option>
                  <option value="Mezzanine">Mezzanine</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tenure *</label>
                <select
                  value={form.tenure}
                  onChange={(e) => handleChange('tenure', e.target.value as PricingRate['tenure'])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Short">Short</option>
                  <option value="Long">Long</option>
                  <option value="Very Short">Very Short</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rate (BHD/m²) *</label>
                <input
                  type="number"
                  step="0.001"
                  value={form.monthly_rate_per_sqm || ''}
                  onChange={(e) => handleChange('monthly_rate_per_sqm', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Daily Rate (BHD/m²) *</label>
                <input
                  type="number"
                  step="0.001"
                  value={form.daily_rate_per_sqm || ''}
                  onChange={(e) => handleChange('daily_rate_per_sqm', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Chargeable Area (m²) *</label>
                <input
                  type="number"
                  value={form.min_chargeable_area || ''}
                  onChange={(e) => handleChange('min_chargeable_area', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={form.active ? 'true' : 'false'}
                  onChange={(e) => handleChange('active', e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-4 mt-8">
              <button
                type="button"
                onClick={() => router.push('/admin')}
                className="px-6 py-2 text-gray-700 bg-gray-200 hover:bg-gray-3 00 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg"
              >
                {saving ? 'Saving...' : 'Create Rate'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


