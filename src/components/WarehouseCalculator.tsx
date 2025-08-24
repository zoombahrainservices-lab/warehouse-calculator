'use client'

import { useState, useEffect } from 'react'
import { supabase, type PricingRate, type EWASettings, type OptionalService } from '@/lib/supabase'
import { WarehouseCalculator as Calculator, type CalculationInputs, type CalculationResult } from '@/lib/calculations'
import QuoteForm from './QuoteForm'
import QuoteDisplay from './QuoteDisplay'

export default function WarehouseCalculator() {
  const [pricingRates, setPricingRates] = useState<PricingRate[]>([])
  const [ewaSettings, setEwaSettings] = useState<EWASettings | null>(null)
  const [optionalServices, setOptionalServices] = useState<OptionalService[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null)
  const [currentInputs, setCurrentInputs] = useState<CalculationInputs | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Load pricing rates
      const { data: rates, error: ratesError } = await supabase
        .from('pricing_rates')
        .select('*')
        .order('size_band', { ascending: true })

      if (ratesError) throw ratesError

      // Load EWA settings
      const { data: ewa, error: ewaError } = await supabase
        .from('ewa_settings')
        .select('*')
        .limit(1)
        .single()

      if (ewaError) throw ewaError

      // Load optional services
      const { data: services, error: servicesError } = await supabase
        .from('optional_services')
        .select('*')
        .eq('active', true)
        .order('category', { ascending: true })

      if (servicesError) throw servicesError

      setPricingRates(rates || [])
      setEwaSettings(ewa)
      setOptionalServices(services || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCalculate = (inputs: CalculationInputs) => {
    if (!ewaSettings) {
      setError('EWA settings not loaded')
      return
    }

    try {
      const calculator = new Calculator(pricingRates, ewaSettings)
      const result = calculator.calculate(inputs)
      
      setCalculationResult(result)
      setCurrentInputs(inputs)
      setError(null)
    } catch (err) {
      console.error('Calculation error:', err)
      setError(err instanceof Error ? err.message : 'Calculation failed')
    }
  }

  const handleSaveQuote = async (clientName: string, clientEmail?: string) => {
    if (!calculationResult || !currentInputs) return

    try {
      const quoteData = {
        quote_number: `WH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        client_name: clientName,
        client_email: clientEmail,
        warehouse: 'Sitra Warehouse',
        space_type: currentInputs.spaceType,
        area_input: currentInputs.area,
        chargeable_area: calculationResult.chargeableArea,
        tenure: currentInputs.tenure,
        lease_start: currentInputs.leaseStart.toISOString().split('T')[0],
        lease_end: currentInputs.leaseEnd.toISOString().split('T')[0],
        months_full: calculationResult.monthsFull,
        days_extra: calculationResult.daysExtra,
        base_rent: calculationResult.baseRentTotal,
        ewa_cost: calculationResult.ewaBreakdown.termEwaCost,
        ewa_mode: calculationResult.ewaBreakdown.mode,
        optional_services: currentInputs.optionalServices,
        subtotal: calculationResult.subtotal,
        discount_amount: calculationResult.discountAmount,
        vat_amount: calculationResult.vatAmount,
        grand_total: calculationResult.grandTotal,
        status: 'draft'
      }

      const { error } = await supabase
        .from('quotes')
        .insert([quoteData])

      if (error) throw error

      alert('Quote saved successfully!')
    } catch (err) {
      console.error('Error saving quote:', err)
      alert('Failed to save quote: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading calculator...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
              <p className="mt-2">
                Make sure you've:
                <br />• Created your Supabase database
                <br />• Run the schema.sql file
                <br />• Set up your environment variables
              </p>
            </div>
            <div className="mt-4">
              <button
                onClick={loadInitialData}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Quote Details</h2>
            <p className="text-sm text-gray-600 mt-1">Enter the rental requirements</p>
          </div>
          <div className="p-6">
            <QuoteForm
              pricingRates={pricingRates}
              ewaSettings={ewaSettings!}
              optionalServices={optionalServices}
              onCalculate={handleCalculate}
            />
          </div>
        </div>

        {/* Results Display */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Quote Summary</h2>
            <p className="text-sm text-gray-600 mt-1">Professional rental quote</p>
          </div>
          <div className="p-6">
            {calculationResult && currentInputs ? (
              <QuoteDisplay
                result={calculationResult}
                inputs={currentInputs}
                onSaveQuote={handleSaveQuote}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p>Fill in the quote details to see the calculation</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


