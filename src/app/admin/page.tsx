'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { PricingRate, EWASettings, OptionalService, SystemSettings } from '@/lib/supabase'

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'pricing' | 'ewa' | 'services' | 'settings'>('pricing')
  const [pricingRates, setPricingRates] = useState<PricingRate[]>([])
  const [ewaSettings, setEwaSettings] = useState<EWASettings | null>(null)
  const [optionalServices, setOptionalServices] = useState<OptionalService[]>([])
  const [systemSettings, setSystemSettings] = useState<SystemSettings[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)



  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [ratesResult, ewaResult, servicesResult, settingsResult] = await Promise.all([
        supabase.from('pricing_rates').select('*').order('area_band_min'),
        supabase.from('ewa_settings').select('*').limit(1).single(),
        supabase.from('optional_services').select('*').order('name'),
        supabase.from('system_settings').select('*')
      ])

      if (ratesResult.error) throw ratesResult.error
      if (ewaResult.error) throw ewaResult.error
      if (servicesResult.error) throw servicesResult.error
      if (settingsResult.error) throw settingsResult.error

      setPricingRates(ratesResult.data || [])
      setEwaSettings(ewaResult.data)
      setOptionalServices(servicesResult.data || [])
      setSystemSettings(settingsResult.data || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handlePricingEdit = (rate: PricingRate) => {
    window.location.href = `/admin/pricing/${rate.id}`
  }

  const handlePricingDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing rate?')) return
    
    try {
      setError(null)
      const { error } = await supabase
        .from('pricing_rates')
        .delete()
        .eq('id', id)
      if (error) throw error
      await loadData()
      alert('Pricing rate deleted successfully! The calculator will update automatically.')
    } catch (err) {
      console.error('Error deleting pricing:', err)
      setError('Failed to delete pricing rate')
    }
  }

  const handleServiceEdit = (service: OptionalService) => {
    window.location.href = `/admin/services/${service.id}`
  }

  const handleServiceDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return
    
    try {
      setError(null)
      const { error } = await supabase
        .from('optional_services')
        .delete()
        .eq('id', id)
      if (error) throw error
      await loadData()
      alert('Service deleted successfully! The calculator will update automatically.')
    } catch (err) {
      console.error('Error deleting service:', err)
      setError('Failed to delete service')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading Admin Panel...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sitra Warehouse Admin Panel</h1>
            <p className="text-gray-600 mt-1">Manage pricing, services, and offers</p>
          </div>
          <Link 
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Calculator
          </Link>
        </div>

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

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
                             {[
                 { id: 'pricing', label: 'Pricing Rates', count: pricingRates.length },
                 { id: 'ewa', label: 'EWA Settings', count: 1 },
                 { id: 'services', label: 'Optional Services', count: optionalServices.length },
                 { id: 'settings', label: 'System Settings', count: systemSettings.length }
               ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'pricing' | 'ewa' | 'services' | 'settings')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {activeTab === 'pricing' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Pricing Rates</h2>
                <button
                  onClick={async () => {
                    const newAreaBand = prompt('Enter Area Band Name:')
                    const newMinArea = prompt('Enter Min Area (m²):')
                    const newMaxArea = prompt('Enter Max Area (m²) (leave empty for unlimited):')
                    const newSpaceType = prompt('Enter Space Type (Ground Floor/Mezzanine):')
                    const newTenure = prompt('Enter Tenure (Short/Long/Very Short):')
                    const newMonthlyRate = prompt('Enter Monthly Rate (BHD/m²):')
                    const newDailyRate = prompt('Enter Daily Rate (BHD/m²):')
                    const newMinChargeable = prompt('Enter Min Chargeable Area (m²):')

                    if (newAreaBand && newMinArea && newSpaceType && newTenure && newMonthlyRate && newDailyRate && newMinChargeable) {
                      try {
                        const newRate = {
                          area_band_name: newAreaBand,
                          area_band_min: parseInt(newMinArea),
                          area_band_max: newMaxArea ? parseInt(newMaxArea) : null,
                          space_type: newSpaceType as 'Ground Floor' | 'Mezzanine',
                          tenure: newTenure as 'Short' | 'Long' | 'Very Short',
                          monthly_rate_per_sqm: parseFloat(newMonthlyRate),
                          daily_rate_per_sqm: parseFloat(newDailyRate),
                          min_chargeable_area: parseInt(newMinChargeable),
                          active: true
                        }

                        const { error } = await supabase
                          .from('pricing_rates')
                          .insert(newRate)

                        if (error) throw error

                        await loadData()
                        alert('Pricing rate added successfully! The calculator will update automatically.')
                      } catch (err) {
                        console.error('Error adding pricing rate:', err)
                        setError('Failed to add pricing rate')
                      }
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Add New Rate
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area Band</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Space Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenure</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Daily Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Area</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pricingRates.map((rate) => (
                      <tr key={rate.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{rate.area_band_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{rate.space_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{rate.tenure}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{rate.monthly_rate_per_sqm} BHD/m²</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{rate.daily_rate_per_sqm} BHD/m²</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{rate.min_chargeable_area} m²</td>
                        <td className="px-6 py-4 text-sm font-medium space-x-2">
                          <button 
                            onClick={() => handlePricingEdit(rate)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handlePricingDelete(rate.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'ewa' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">EWA Settings</h2>
              {ewaSettings && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900">House Load Description</h3>
                      <p className="text-sm text-gray-600">{ewaSettings.house_load_description}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Dedicated Meter Description</h3>
                      <p className="text-sm text-gray-600">{ewaSettings.dedicated_meter_description}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Setup Deposit</h3>
                      <p className="text-sm text-gray-600">{ewaSettings.estimated_setup_deposit} BHD</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Installation Fee</h3>
                      <p className="text-sm text-gray-600">{ewaSettings.estimated_installation_fee} BHD</p>
                    </div>
                  </div>
                  <a 
                    href={`/admin/ewa/${ewaSettings.id}`}
                    className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Edit Settings
                  </a>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'services' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Optional Services</h2>
                <button
                  onClick={async () => {
                    const newName = prompt('Enter Service Name:')
                    const newDescription = prompt('Enter Description:')
                    const newCategory = prompt('Enter Category (movement/transportation/customs/handling/security):')
                    const newPricingType = prompt('Enter Pricing Type (fixed/hourly/per_event/on_request):')
                    const newRate = prompt('Enter Rate (BHD):')
                    const newUnit = prompt('Enter Unit (e.g., per hour, per event):')

                    if (newName && newCategory && newPricingType) {
                      try {
                        const newService = {
                          name: newName,
                          description: newDescription || '',
                          category: newCategory,
                          pricing_type: newPricingType as 'fixed' | 'hourly' | 'per_event' | 'on_request',
                          rate: parseFloat(newRate || '0') || 0,
                          unit: newUnit || '',
                          active: true
                        }

                        const { error } = await supabase
                          .from('optional_services')
                          .insert(newService)

                        if (error) throw error

                        await loadData()
                        alert('Service added successfully! The calculator will update automatically.')
                      } catch (err) {
                        console.error('Error adding service:', err)
                        setError('Failed to add service')
                      }
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Add New Service
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pricing</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {optionalServices.map((service) => (
                      <tr key={service.id}>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{service.name}</div>
                            <div className="text-sm text-gray-500">{service.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{service.category}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{service.pricing_type}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {service.rate ? `${service.rate} ${service.unit || 'BHD'}` : 'On request'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium space-x-2">
                          <button 
                            onClick={() => handleServiceEdit(service)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleServiceDelete(service.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">System Settings</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {systemSettings.map((setting) => (
                    <div key={setting.id} className="bg-white p-4 rounded border">
                      <h3 className="font-medium text-gray-900 mb-2">{setting.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                      <p className="text-sm text-gray-600 mb-2">{setting.description}</p>
                      <p className="text-sm font-mono bg-gray-100 p-2 rounded">Current: {setting.setting_value}</p>
                      <a
                        href={`/admin/settings/${setting.id}`}
                        className="mt-2 inline-block bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                      >
                        Edit
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
