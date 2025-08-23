'use client'

import { useState } from 'react'
import { type CalculationResult, type CalculationInputs, formatCurrency, formatDate } from '@/lib/calculations'

interface QuoteDisplayProps {
  result: CalculationResult
  inputs: CalculationInputs
  onSaveQuote: (clientName: string, clientEmail?: string) => void
}

export default function QuoteDisplay({ result, inputs, onSaveQuote }: QuoteDisplayProps) {
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')

  const handleSave = () => {
    if (!clientName.trim()) {
      alert('Please enter client name')
      return
    }
    
    onSaveQuote(clientName, clientEmail || undefined)
    setShowSaveForm(false)
    setClientName('')
    setClientEmail('')
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Quote Header */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-semibold text-gray-900">Warehouse Rental Quote</h3>
        <p className="text-sm text-gray-600">Sitra Warehouse</p>
        <p className="text-xs text-gray-500 mt-1">
          Generated on {formatDate(new Date())}
        </p>
      </div>

      {/* Property Details */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">Property Details</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-600">Area Band:</span>
            <span className="ml-2 font-medium">{result.areaBandName}</span>
          </div>
          <div>
            <span className="text-gray-600">Tenure:</span>
            <span className="ml-2 font-medium">{inputs.tenure} Term</span>
          </div>
          <div>
            <span className="text-gray-600">Requested Area:</span>
            <span className="ml-2 font-medium">{result.areaRequested} m²</span>
          </div>
          <div>
            <span className="text-gray-600">Chargeable Area:</span>
            <span className="ml-2 font-medium">{result.chargeableArea} m²</span>
          </div>
          <div>
            <span className="text-gray-600">Lease Period:</span>
            <span className="ml-2 font-medium">
              {formatDate(inputs.leaseStart)} to {formatDate(inputs.leaseEnd)}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Duration:</span>
            <span className="ml-2 font-medium">
              {result.monthsFull} months {result.daysExtra > 0 && `+ ${result.daysExtra} days`}
            </span>
          </div>
        </div>
      </div>

      {/* Pricing Breakdown */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Pricing Breakdown</h4>
        
        {/* Base Rent */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Base Rent</span>
            <span className="font-medium">{formatCurrency(result.totalBaseRent)}</span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Area Band:</span>
              <span>{result.areaBandName}</span>
            </div>
            <div className="flex justify-between">
              <span>Monthly rate per m²:</span>
              <span>{formatCurrency(result.monthlyRatePerSqm)}</span>
            </div>
            <div className="flex justify-between">
              <span>Daily rate per m²:</span>
              <span>{formatCurrency(result.dailyRatePerSqm)}</span>
            </div>
            <div className="flex justify-between">
              <span>Chargeable area:</span>
              <span>{result.chargeableArea} m²</span>
            </div>
            <div className="flex justify-between">
              <span>Monthly base rent:</span>
              <span>{formatCurrency(result.monthlyBaseRent)}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{result.leaseDurationMonths.toFixed(2)} months</span>
            </div>
          </div>
        </div>

        {/* EWA */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Electricity & Water (EWA)</span>
            <span className="font-medium">
              {formatCurrency(result.ewaBreakdown.termEstimate + result.ewaBreakdown.oneOffCosts)}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span>Type:</span>
              <span className="capitalize">
                {result.ewaBreakdown.type === 'house_load' ? 'House-load (Included)' : 'Dedicated Meter'}
              </span>
            </div>
            <div className="text-xs text-gray-500 mb-2">
              {result.ewaBreakdown.description}
            </div>
            {result.ewaBreakdown.type === 'dedicated_meter' && (
              <>
                <div className="flex justify-between">
                  <span>Monthly estimate:</span>
                  <span>{formatCurrency(result.ewaBreakdown.monthlyEstimate)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Term estimate:</span>
                  <span>{formatCurrency(result.ewaBreakdown.termEstimate)}</span>
                </div>
                {result.ewaBreakdown.oneOffCosts > 0 && (
                  <div className="flex justify-between">
                    <span>One-off costs:</span>
                    <span>{formatCurrency(result.ewaBreakdown.oneOffCosts)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Optional Services */}
        {result.optionalServicesTotal > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Optional Services</span>
              <span className="font-medium">{formatCurrency(result.optionalServicesTotal)}</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              {result.optionalServicesBreakdown.map((service, index) => (
                <div key={index} className="flex justify-between">
                  <span>
                    {service.name} (Qty: {service.quantity})
                    {service.isFree && <span className="text-green-600 ml-1">(Free)</span>}:
                  </span>
                  <span>{formatCurrency(service.total)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatCurrency(result.subtotal)}</span>
          </div>
          
          {result.discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount:</span>
              <span>-{formatCurrency(result.discountAmount)}</span>
            </div>
          )}
          
          {result.vatAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span>VAT:</span>
              <span>{formatCurrency(result.vatAmount)}</span>
            </div>
          )}
          
          <div className="border-t border-gray-300 pt-2">
            <div className="flex justify-between font-semibold text-lg">
              <span>Grand Total:</span>
              <span className="text-blue-600">{formatCurrency(result.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Terms & Conditions</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• <strong>Payment:</strong> {result.paymentTerms}</p>
          <p>• <strong>Included:</strong> Electricity (house-load), municipal tax, on-site security, and basic building insurance.</p>
          <p>• <strong>EWA:</strong> No connection required for light/normal usage. Heavy usage requires dedicated meter at government tariff.</p>
          <p>• <strong>Movement:</strong> Free access 07:00–18:00. After-hours movement (18:00–06:30) incurs service charges.</p>
          <p>• <strong>Pro-rata:</strong> Partial months charged based on 30-day month calculation.</p>
          <p>• <strong>Location:</strong> Building No. 22, Road 401, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain</p>
          <p>• All prices in Bahraini Dinars (BHD). Quote valid for 30 days from generation date.</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <button
          onClick={() => setShowSaveForm(!showSaveForm)}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium"
        >
          Save Quote
        </button>
        <button
          onClick={handlePrint}
          className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 font-medium"
        >
          Print Quote
        </button>
      </div>

      {/* Save Form */}
      {showSaveForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-3">Save Quote</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter client name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-800 mb-1">
                Client Email (optional)
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter client email"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium"
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveForm(false)}
                className="bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


