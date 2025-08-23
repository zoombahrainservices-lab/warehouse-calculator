'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PricingRate } from '@/lib/supabase'

export default function EditPricingRate({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const [pricingRate, setPricingRate] = useState<PricingRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPricingRate()
  }, [resolvedParams.id])

  const loadPricingRate = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('pricing_rates')
        .select('*')
        .eq('id', resolvedParams.id)
        .single()

      if (error) throw error
      setPricingRate(data)
    } catch (err) {
      console.error('Error loading pricing rate:', err)
      setError('Failed to load pricing rate')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pricingRate) return

    try {
      setSaving(true)
      setError(null)

      // Send only updatable columns to avoid DB errors
      const payload = {
        area_band_name: pricingRate.area_band_name,
        area_band_min: pricingRate.area_band_min || 0,
        area_band_max: pricingRate.area_band_max,
        space_type: pricingRate.space_type,
        tenure: pricingRate.tenure,
        monthly_rate_per_sqm: pricingRate.monthly_rate_per_sqm || 0,
        daily_rate_per_sqm: pricingRate.daily_rate_per_sqm || 0,
        min_chargeable_area: pricingRate.min_chargeable_area || 0,
        active: pricingRate.active
      } as const

      const { data: updateData, error } = await supabase
        .from('pricing_rates')
        .update(payload)
        .eq('id', resolvedParams.id)
        .select()
        .single()

      if (error) throw error
      if (!updateData) throw new Error('No rows updated')

      // If this is the Office pricing row, sync to system_settings.office_monthly_rate
      if (pricingRate.space_type === 'Office') {
        const newOfficeRate = (pricingRate.monthly_rate_per_sqm || 0).toString()
        const { error: upsertErr } = await supabase
          .from('system_settings')
          .upsert({
            setting_key: 'office_monthly_rate',
            setting_value: newOfficeRate,
            description: 'Office space monthly rate in BHD'
          }, { onConflict: 'setting_key' })
        if (upsertErr) throw upsertErr
      }

      alert('Pricing rate updated successfully! The calculator will update automatically.')
      router.push('/admin')
    } catch (err) {
      const message = (err as any)?.message || JSON.stringify(err) || 'Unknown error'
      console.error('Error updating pricing rate:', err)
      setError(`Failed to update pricing rate: ${message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof PricingRate, value: any) => {
    if (!pricingRate) return
    setPricingRate({ ...pricingRate, [field]: value })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    )
  }

  if (!pricingRate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pricing Rate Not Found</h2>
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
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Edit Pricing Rate</h1>
            <p className="text-gray-600 mt-1">Update pricing rate details</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Admin Panel
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-medium">Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Area Band Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Area Band Name *
                </label>
                <input
                  type="text"
                  value={pricingRate.area_band_name}
                  onChange={(e) => handleChange('area_band_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Min Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Area (m²) *
                </label>
                <input
                  type="number"
                  value={pricingRate.area_band_min || ''}
                  onChange={(e) => handleChange('area_band_min', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Max Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Area (m²)
                </label>
                <input
                  type="number"
                  value={pricingRate.area_band_max || ''}
                  onChange={(e) => handleChange('area_band_max', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              {/* Space Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Space Type *
                </label>
                <select
                  value={pricingRate.space_type}
                  onChange={(e) => handleChange('space_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Ground Floor">Ground Floor</option>
                  <option value="Mezzanine">Mezzanine</option>
                </select>
              </div>

              {/* Tenure */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tenure *
                </label>
                <select
                  value={pricingRate.tenure}
                  onChange={(e) => handleChange('tenure', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Short">Short</option>
                  <option value="Long">Long</option>
                  <option value="Very Short">Very Short</option>
                </select>
              </div>

              {/* Monthly Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Rate (BHD/m²) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={pricingRate.monthly_rate_per_sqm || ''}
                  onChange={(e) => handleChange('monthly_rate_per_sqm', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Daily Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Rate (BHD/m²) *
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={pricingRate.daily_rate_per_sqm || ''}
                  onChange={(e) => handleChange('daily_rate_per_sqm', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Min Chargeable Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Chargeable Area (m²) *
                </label>
                <input
                  type="number"
                  value={pricingRate.min_chargeable_area || ''}
                  onChange={(e) => handleChange('min_chargeable_area', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Active Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={pricingRate.active ? 'true' : 'false'}
                  onChange={(e) => handleChange('active', e.target.value === 'true')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-8">
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
