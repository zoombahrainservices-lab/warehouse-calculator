'use client'

import { useState } from 'react'
import { type PricingRate, type EWASettings, type OptionalService, type Device } from '@/lib/supabase'
import { type CalculationInputs } from '@/lib/calculations'

interface QuoteFormProps {
  pricingRates: PricingRate[]
  ewaSettings: EWASettings
  optionalServices: OptionalService[]
  onCalculate: (inputs: CalculationInputs) => void
}

export default function QuoteForm({ pricingRates, ewaSettings, optionalServices, onCalculate }: QuoteFormProps) {
  const [area, setArea] = useState<number>(100)
  const [tenure, setTenure] = useState<'Short' | 'Long'>('Short')
  const [spaceType, setSpaceType] = useState<'Ground Floor' | 'Mezzanine' | 'Office'>('Ground Floor')
  const [leaseStart, setLeaseStart] = useState<string>(new Date().toISOString().split('T')[0])
  const [leaseEnd, setLeaseEnd] = useState<string>('')
  const [ewaMode, setEwaMode] = useState<'house_load' | 'dedicated_meter'>('house_load')
  const [devices, setDevices] = useState<Device[]>([])
  const [estimatedKwh, setEstimatedKwh] = useState<number>(0)
  const [selectedServices, setSelectedServices] = useState<Record<string, { quantity: number; rate: number }>>({})
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [discountFixed, setDiscountFixed] = useState<number>(0)
  const [vatRate, setVatRate] = useState<number>(10)
  const [showDeviceCalculator, setShowDeviceCalculator] = useState(false)

  const handleAddDevice = () => {
    setDevices([...devices, { name: '', watts: 0, hours_per_day: 8, quantity: 1 }])
  }

  const handleUpdateDevice = (index: number, field: keyof Device, value: string | number) => {
    const updatedDevices = [...devices]
    updatedDevices[index] = { ...updatedDevices[index], [field]: value }
    setDevices(updatedDevices)
  }

  const handleRemoveDevice = (index: number) => {
    setDevices(devices.filter((_, i) => i !== index))
  }

  const handleServiceToggle = (serviceId: string, service: OptionalService) => {
    if (selectedServices[serviceId]) {
      const { [serviceId]: _, ...rest } = selectedServices
      setSelectedServices(rest)
    } else {
      setSelectedServices({
        ...selectedServices,
        [serviceId]: { quantity: 1, rate: service.rate }
      })
    }
  }

  const handleServiceQuantityChange = (serviceId: string, quantity: number) => {
    if (selectedServices[serviceId]) {
      setSelectedServices({
        ...selectedServices,
        [serviceId]: { ...selectedServices[serviceId], quantity }
      })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!leaseEnd) {
      alert('Please select a lease end date')
      return
    }

    const inputs: CalculationInputs = {
      area,
      tenure,
      spaceType,
      leaseStart: new Date(leaseStart),
      leaseEnd: new Date(leaseEnd),
      ewaMode,
      devices,
      estimatedKwh: ewaMode === 'dedicated_meter' ? estimatedKwh : undefined,
      optionalServices: selectedServices,
      discountPercent: discountPercent || undefined,
      discountFixed: discountFixed || undefined,
      vatRate: vatRate || undefined
    }

    onCalculate(inputs)
  }

  // Calculate estimated power consumption from devices
  const totalEstimatedKwh = devices.reduce((total, device) => {
    return total + (device.watts * device.hours_per_day * 30 * device.quantity) / 1000
  }, 0)

  const totalEstimatedKw = devices.reduce((total, device) => {
    return total + (device.watts * device.quantity / 1000)
  }, 0)

  const withinLimits = totalEstimatedKw <= ewaSettings.included_kw_cap && totalEstimatedKwh <= ewaSettings.included_kwh_cap

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Property & Contract Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Property & Contract</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Area (m²)
            </label>
            <input
              type="number"
              value={area}
              onChange={(e) => setArea(Number(e.target.value))}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenure Type
            </label>
            <select
              value={tenure}
              onChange={(e) => setTenure(e.target.value as 'Short' | 'Long')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Short">Short Term</option>
              <option value="Long">Long Term</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Space Type
            </label>
            <select
              value={spaceType}
              onChange={(e) => setSpaceType(e.target.value as 'Ground Floor' | 'Mezzanine' | 'Office')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Ground Floor">Ground Floor</option>
              <option value="Mezzanine">Mezzanine</option>
              <option value="Office">Office</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lease Start Date
            </label>
            <input
              type="date"
              value={leaseStart}
              onChange={(e) => setLeaseStart(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lease End Date
            </label>
            <input
              type="date"
              value={leaseEnd}
              onChange={(e) => setLeaseEnd(e.target.value)}
              min={leaseStart}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Electricity & Water Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Electricity & Water (EWA)</h3>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="house_load"
              name="ewaMode"
              value="house_load"
              checked={ewaMode === 'house_load'}
              onChange={(e) => setEwaMode(e.target.value as 'house_load')}
              className="h-4 w-4 text-blue-600"
            />
            <label htmlFor="house_load" className="text-sm text-gray-700">
              House-load only (included) - for lights + low devices
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="dedicated_meter"
              name="ewaMode"
              value="dedicated_meter"
              checked={ewaMode === 'dedicated_meter'}
              onChange={(e) => setEwaMode(e.target.value as 'dedicated_meter')}
              className="h-4 w-4 text-blue-600"
            />
            <label htmlFor="dedicated_meter" className="text-sm text-gray-700">
              Dedicated meter (additional cost)
            </label>
          </div>
        </div>

        {/* Device Calculator */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Power Consumption Estimator</h4>
            <button
              type="button"
              onClick={() => setShowDeviceCalculator(!showDeviceCalculator)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showDeviceCalculator ? 'Hide' : 'Show'} Device Calculator
            </button>
          </div>

          <div className="text-xs text-gray-600 mb-3">
            Included limits: {ewaSettings.included_kw_cap} kW power, {ewaSettings.included_kwh_cap} kWh/month
          </div>

          {showDeviceCalculator && (
            <div className="space-y-3">
              {devices.map((device, index) => (
                <div key={index} className="grid grid-cols-5 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Device name"
                    value={device.name}
                    onChange={(e) => handleUpdateDevice(index, 'name', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Watts"
                    value={device.watts}
                    onChange={(e) => handleUpdateDevice(index, 'watts', Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Hours/day"
                    value={device.hours_per_day}
                    onChange={(e) => handleUpdateDevice(index, 'hours_per_day', Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={device.quantity}
                    onChange={(e) => handleUpdateDevice(index, 'quantity', Number(e.target.value))}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveDevice(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={handleAddDevice}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Device
              </button>

              {devices.length > 0 && (
                <div className="text-sm text-gray-600 bg-white p-2 rounded">
                  Estimated: {totalEstimatedKw.toFixed(2)} kW, {totalEstimatedKwh.toFixed(0)} kWh/month
                  {!withinLimits && (
                    <span className="text-orange-600 font-medium"> - Exceeds included limits</span>
                  )}
                </div>
              )}
            </div>
          )}

          {ewaMode === 'dedicated_meter' && !showDeviceCalculator && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Monthly kWh
              </label>
              <input
                type="number"
                value={estimatedKwh}
                onChange={(e) => setEstimatedKwh(Number(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Optional Services */}
      {optionalServices.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Optional Services</h3>
          
          <div className="space-y-3">
            {optionalServices.map((service) => (
              <div key={service.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={service.id}
                    checked={!!selectedServices[service.id]}
                    onChange={() => handleServiceToggle(service.id, service)}
                    className="h-4 w-4 text-blue-600"
                  />
                  <div>
                    <label htmlFor={service.id} className="text-sm font-medium text-gray-900">
                      {service.name}
                    </label>
                    <p className="text-xs text-gray-500">{service.description}</p>
                    <p className="text-xs text-gray-600">{service.rate} BHD {service.unit}</p>
                  </div>
                </div>

                {selectedServices[service.id] && (
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-gray-600">Qty:</label>
                    <input
                      type="number"
                      value={selectedServices[service.id].quantity}
                      onChange={(e) => handleServiceQuantityChange(service.id, Number(e.target.value))}
                      min="1"
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discounts & VAT */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Discounts & VAT</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Discount (%)
            </label>
            <input
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              min="0"
              max="100"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fixed Discount (BHD)
            </label>
            <input
              type="number"
              value={discountFixed}
              onChange={(e) => setDiscountFixed(Number(e.target.value))}
              min="0"
              step="0.001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              VAT Rate (%)
            </label>
            <input
              type="number"
              value={vatRate}
              onChange={(e) => setVatRate(Number(e.target.value))}
              min="0"
              max="100"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <div className="pt-4">
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 font-medium"
        >
          Calculate Quote
        </button>
      </div>
    </form>
  )
}


