'use client'

import { useState, useEffect } from 'react'
import { supabase, type PricingRate, type EWASettings, type OptionalService, type SystemSettings } from '@/lib/supabase'
import { SitraWarehouseCalculator, type SitraCalculationInputs, type SitraCalculationResult, formatCurrency, formatArea } from '@/lib/sitra-calculator'
import { generateSitraQuotePDF, generatePDFFromElement } from '@/lib/pdf-generator'

export default function SitraCalculator() {
  // Database data
  const [pricingRates, setPricingRates] = useState<PricingRate[]>([])
  const [ewaSettings, setEwaSettings] = useState<EWASettings | null>(null)
  const [optionalServices, setOptionalServices] = useState<OptionalService[]>([])
  const [systemSettings, setSystemSettings] = useState<SystemSettings[]>([])
  const [loading, setLoading] = useState(true)
  const [hasUpdates, setHasUpdates] = useState(false)

  // Form inputs with real-time updates
  const [spaceType, setSpaceType] = useState<'Ground Floor' | 'Mezzanine'>('Ground Floor')
  const [areaRequested, setAreaRequested] = useState<number>(100)
  const [tenure, setTenure] = useState<'Short' | 'Long' | 'Very Short'>('Short')
  const [leaseDurationMonths, setLeaseDurationMonths] = useState<number>(6)
  const [includeOffice, setIncludeOffice] = useState<boolean>(false)
  const [ewaType, setEwaType] = useState<'house_load' | 'dedicated_meter'>('house_load')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [discountPercent, setDiscountPercent] = useState<number>(0)
  const [discountFixed, setDiscountFixed] = useState<number>(0)

  // Results and error handling
  const [result, setResult] = useState<SitraCalculationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showWelcomeMessage, setShowWelcomeMessage] = useState<boolean>(true)
  
  // Welcome message quick answers
  const [welcomeAnswers, setWelcomeAnswers] = useState({
    spaceType: null as 'Ground Floor' | 'Mezzanine' | null,
    productType: null as 'food' | 'metals' | 'cargo' | 'electronics' | 'textiles' | 'general' | null,
    needOffice: null as boolean | null,
    duration: null as 'days' | 'months' | 'year+' | null,
    estimatedArea: null as string | null,
    customArea: '' as string
  })

  // Auto-adjust lease duration when tenure changes
  useEffect(() => {
    if (tenure === 'Long' && leaseDurationMonths < 12) {
      setLeaseDurationMonths(12)
    } else if (tenure === 'Short' && leaseDurationMonths >= 12) {
      setLeaseDurationMonths(6)
    } else if (tenure === 'Very Short') {
      setLeaseDurationMonths(7)
    }
  }, [tenure])

  // Real-time calculation whenever inputs change
  useEffect(() => {
    const hasRequiredSettings = ['office_monthly_rate', 'minimum_charge', 'days_per_month', 'office_free_threshold']
      .every(key => systemSettings.some(s => s.setting_key === key))

    if (pricingRates.length > 0 && ewaSettings && hasRequiredSettings) {
      calculateQuote()
    } else if (pricingRates.length > 0 && ewaSettings && !hasRequiredSettings) {
      setResult(null)
      setError('Missing required system settings. Please configure in Admin > System Settings.')
    }
  }, [spaceType, areaRequested, tenure, leaseDurationMonths, includeOffice, ewaType, selectedServices, discountPercent, discountFixed, pricingRates, ewaSettings, systemSettings])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [ratesResult, ewaResult, servicesResult, settingsResult] = await Promise.all([
        supabase.from('pricing_rates').select('*').eq('active', true).order('area_band_min'),
        supabase.from('ewa_settings').select('*').limit(1).single(),
        supabase.from('optional_services').select('*').eq('active', true).order('name'),
        supabase.from('system_settings').select('*')
      ])

      if (ratesResult.error) console.error('pricing_rates load error:', ratesResult.error)
      if (ewaResult.error) console.error('ewa_settings load error:', ewaResult.error)
      if (servicesResult.error) console.error('optional_services load error:', servicesResult.error)
      if (settingsResult.error) console.error('system_settings load error:', settingsResult.error)

      console.log('Loaded pricing rates:', ratesResult.data?.length || 0)
      console.log('Loaded EWA settings:', ewaResult.data)
      console.log('Loaded optional services:', servicesResult.data?.length || 0)
      console.log('Loaded system settings:', settingsResult.data?.length || 0)
      
      setPricingRates(ratesResult.data || [])
      setEwaSettings(ewaResult.data || null)
      setOptionalServices(servicesResult.data || [])
      setSystemSettings(settingsResult.data || [])
      setError(null)
    } catch (err) {
      const message = (err as any)?.message || JSON.stringify(err) || 'Failed to load pricing data'
      console.error('Error loading data:', err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Subscribe to realtime DB changes; enable Refresh button when updates arrive
  useEffect(() => {
    const channel = supabase.channel('db-updates')
    ;['pricing_rates', 'ewa_settings', 'optional_services', 'system_settings'].forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        setHasUpdates(true)
      })
    })
    channel.subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const calculateQuote = () => {
    try {
      console.log('Calculating quote with:', {
        pricingRates: pricingRates.length,
        ewaSettings: !!ewaSettings,
        optionalServices: optionalServices.length,
        systemSettings: systemSettings.length,
        inputs: {
          spaceType,
          areaRequested,
          tenure,
          leaseDurationMonths,
          includeOffice,
          ewaType,
          selectedServices
        }
      })
      
      const calculator = new SitraWarehouseCalculator(pricingRates, ewaSettings!, optionalServices, systemSettings)
      
      const inputs: SitraCalculationInputs = {
        spaceType,
        areaRequested,
        tenure,
        leaseDurationMonths,
        includeOffice,
        ewaType,
        selectedServices,
        discountPercent: discountPercent || undefined,
        discountFixed: discountFixed || undefined
      }
      
      const calculationResult = calculator.calculate(inputs)
      console.log('Calculation result:', calculationResult)
      setResult(calculationResult)
      setError(null)
    } catch (err) {
      console.error('Calculation error:', err)
      setError(err instanceof Error ? err.message : 'Calculation failed')
      setResult(null)
    }
  }

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  // Apply welcome answers to form and close welcome message
  const applyWelcomeAnswers = () => {
    if (welcomeAnswers.spaceType) {
      setSpaceType(welcomeAnswers.spaceType)
    }
    if (welcomeAnswers.needOffice !== null) {
      setIncludeOffice(welcomeAnswers.needOffice)
    }
    if (welcomeAnswers.duration) {
      if (welcomeAnswers.duration === 'days') {
        setTenure('Very Short')
        setLeaseDurationMonths(7)
      } else if (welcomeAnswers.duration === 'months') {
        setTenure('Short')
        setLeaseDurationMonths(6)
      } else if (welcomeAnswers.duration === 'year+') {
        setTenure('Long')
        setLeaseDurationMonths(12)
      }
    }
    if (welcomeAnswers.estimatedArea) {
      if (welcomeAnswers.estimatedArea === 'custom' && welcomeAnswers.customArea) {
        const area = parseInt(welcomeAnswers.customArea)
        if (!isNaN(area) && area > 0) {
          setAreaRequested(area)
        }
      } else if (welcomeAnswers.estimatedArea !== 'custom') {
        const area = parseInt(welcomeAnswers.estimatedArea)
        if (!isNaN(area) && area > 0) {
          setAreaRequested(area)
        }
      }
      // If custom is selected but no custom area entered, skip setting area
      // User can enter it manually in the main form
    }
    setShowWelcomeMessage(false)
  }

  const updateWelcomeAnswer = <K extends keyof typeof welcomeAnswers>(
    key: K, 
    value: typeof welcomeAnswers[K]
  ) => {
    setWelcomeAnswers(prev => ({ ...prev, [key]: value }))
  }

  const handleDownloadPDF = async () => {
    if (!result) return
    
    try {
      await generateSitraQuotePDF(result, {
        companyName: 'Sitra Warehouse',
        filename: `sitra-warehouse-quote-${new Date().toISOString().split('T')[0]}.pdf`
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  const handleDownloadPDFFromElement = async () => {
    if (!result) return
    
    try {
      await generatePDFFromElement('quote-preview-content', {
        filename: `sitra-warehouse-quote-${new Date().toISOString().split('T')[0]}.pdf`
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF. Please try again.')
    }
  }

  // Helper to read numeric system settings strictly (no fallbacks)
  const getSettingNumber = (key: string): number | null => {
    const setting = systemSettings.find(s => s.setting_key === key)
    if (!setting) return null
    const num = parseFloat(setting.setting_value)
    return Number.isFinite(num) ? num : null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading Sitra Warehouse Calculator...</span>
      </div>
    )
  }

  if (error && !result) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error</h3>
        <p className="text-red-700 text-sm mt-1">{error}</p>
        <button 
          onClick={loadData}
          className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

    return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Title - Always at Top */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <div className="flex justify-between items-start mb-4">
              <div></div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Sitra Warehouse Calculator</h1>
                <p className="text-lg text-gray-600 mb-2">Building No. 22, Road 401, Block 604, Al-Qarya, Sitra, Kingdom of Bahrain</p>
                <div className="text-sm text-gray-500">
                  Ground Floor: 2,184 m² • Mezzanine: 1,250 m² • Land: 4,135 m²
                </div>
              </div>
              <div className="flex space-x-2">
                <a
                  href="/stock"
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Stock Management
                </a>
                <a
                  href="/admin"
                  className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Admin
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Message - Below Title */}
      {/* {showWelcomeMessage && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="container mx-auto px-4 py-6">
            <div className="max-w-5xl mx-auto">
              <div className="bg-white border border-blue-200 rounded-lg p-6 shadow-sm relative">
                <button
                  onClick={() => setShowWelcomeMessage(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Dismiss welcome message"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="pr-8">
                  <h2 className="text-xl font-bold text-blue-900 mb-2">
                    👋 Welcome to Sitra Warehouse Calculator
                  </h2>
                  <p className="text-blue-800 mb-5">
                    To get your personalized warehouse rental quote, answer these quick questions:
                  </p>
                  
                  {/* Interactive Questions */}
                  {/* <div className="space-y-5">
                    {/* Question 1: Where will you store? */}
                    {/* <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-blue-600 font-medium">🏢</span>
                        <span className="text-blue-700 font-medium">Where will you store?</span>
                      </div>
                      <div className="flex space-x-3 ml-6">
                        <button
                          onClick={() => updateWelcomeAnswer('spaceType', 'Ground Floor')}
                          className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                            welcomeAnswers.spaceType === 'Ground Floor'
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          Ground Floor
                        </button>
                        <button
                          onClick={() => updateWelcomeAnswer('spaceType', 'Mezzanine')}
                          className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                            welcomeAnswers.spaceType === 'Mezzanine'
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          Mezzanine <span className="text-green-600 text-xs">(20% cheaper)</span>
                        </button>
                      </div>
                    </div>

                    {/* Question 2: What products will you store? */}
                    {/* <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-blue-600 font-medium">📦</span>
                        <span className="text-blue-700 font-medium">What products will you store?</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 ml-6">
                        <button
                          onClick={() => updateWelcomeAnswer('productType', 'food')}
                          className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                            welcomeAnswers.productType === 'food'
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          🍎 Food Items
                        </button>
                        <button
                          onClick={() => updateWelcomeAnswer('productType', 'metals')}
                          className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                            welcomeAnswers.productType === 'metals'
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          🔩 Metals
                        </button>
                        <button
                          onClick={() => updateWelcomeAnswer('productType', 'cargo')}
                          className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                            welcomeAnswers.productType === 'cargo'
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          📦 Cargo/Freight
                        </button>
                        <button
                          onClick={() => updateWelcomeAnswer('productType', 'electronics')}
                          className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                            welcomeAnswers.productType === 'electronics'
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          💻 Electronics
                        </button>
                        <button
                          onClick={() => updateWelcomeAnswer('productType', 'textiles')}
                          className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                            welcomeAnswers.productType === 'textiles'
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          👕 Textiles
                        </button>
                        <button
                          onClick={() => updateWelcomeAnswer('productType', 'general')}
                          className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                            welcomeAnswers.productType === 'general'
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          📋 General Goods
                        </button>
                      </div>
                    </div>

                    {/* Question 3: How much space? */}
                    {/* <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-blue-600 font-medium">📏</span>
                        <span className="text-blue-700 font-medium">How much space do you need?</span>
                      </div>
                      <div className="flex space-x-3 ml-6">
                        {['50', '100', '200', '500'].map((area) => (
                          <button
                            key={area}
                            onClick={() => updateWelcomeAnswer('estimatedArea', area)}
                            className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                              welcomeAnswers.estimatedArea === area
                                ? 'border-blue-500 bg-blue-100 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            }`}
                          >
                            {area}m²
                          </button>
                        ))}
                        <button
                          onClick={() => updateWelcomeAnswer('estimatedArea', 'custom')}
                          className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                            welcomeAnswers.estimatedArea === 'custom'
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                      {/* Custom Area Input */}
                      {/* {welcomeAnswers.estimatedArea === 'custom' && (
                        <div className="mt-3 ml-6">
                          <input
                            type="number"
                            value={welcomeAnswers.customArea}
                            onChange={(e) => updateWelcomeAnswer('customArea', e.target.value)}
                            placeholder="Enter area in m²"
                            min="1"
                            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* Question 4: How long? */}
                    {/* <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-blue-600 font-medium">⏰</span>
                        <span className="text-blue-700 font-medium">How long do you need it?</span>
                      </div>
                      <div className="flex space-x-3 ml-6">
                        <button
                          onClick={() => updateWelcomeAnswer('duration', 'days')}
                          className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                            welcomeAnswers.duration === 'days'
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          Few Days
                        </button>
                        <button
                          onClick={() => updateWelcomeAnswer('duration', 'months')}
                          className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                            welcomeAnswers.duration === 'months'
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          Few Months
                        </button>
                        <button
                          onClick={() => updateWelcomeAnswer('duration', 'year+')}
                          className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                            welcomeAnswers.duration === 'year+'
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          1+ Year
                        </button>
                      </div>
                    </div>

                    {/* Question 5: Need office? */}
                    {/* <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-blue-600 font-medium">🏢</span>
                        <span className="text-blue-700 font-medium">Do you need office space?</span>
                      </div>
                      <div className="flex space-x-3 ml-6">
                        <button
                          onClick={() => updateWelcomeAnswer('needOffice', true)}
                          className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                            welcomeAnswers.needOffice === true
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => updateWelcomeAnswer('needOffice', false)}
                          className={`px-4 py-2 rounded-lg border-2 text-sm transition-all ${
                            welcomeAnswers.needOffice === false
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Action Buttons */}
                  {/* <div className="mt-6 flex space-x-3">
                    <button
                      onClick={applyWelcomeAnswers}
                      disabled={!welcomeAnswers.spaceType}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      Get My Quote →
                    </button>
                    <button
                      onClick={() => setShowWelcomeMessage(false)}
                      className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Pro tip:</strong> Your quote updates in real-time as you make changes!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )} */}

      <div className="container mx-auto px-4 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* LEFT PANEL - INPUT FORM */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Configure Your Space</h2>
              <p className="text-sm text-gray-600 mt-1">Real-time pricing as you type</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Space Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Warehouse Space Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Ground Floor', 'Mezzanine'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSpaceType(type)}
                      className={`p-3 text-sm font-medium rounded-lg border-2 transition-all ${
                        spaceType === type
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {type}
                      {type === 'Mezzanine' && <div className="text-xs text-green-600 mt-1">20% cheaper</div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Area Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Area Required (m²)
                </label>
                <input
                  type="number"





                  value={areaRequested || ''}
                  onChange={(e) => {
                    // Handle empty input
                    if (e.target.value === '') {
                      setAreaRequested(0)
                      return
                    }
                    
                    // Remove leading zeros and convert to number
                    const cleanValue = e.target.value.replace(/^0+/, '') || '0'
                    const newValue = Number(cleanValue)
                    setAreaRequested(newValue)
                  }}
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                  placeholder="Enter area (30m² recommended)"
                />
                {areaRequested < 30 && areaRequested > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>ℹ️ Minimum Charge:</strong> Areas below 30m² have a minimum charge of 100 BHD
                    </p>
                  </div>
                )}
                {areaRequested === 0 && (
                  <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>ℹ️ Info:</strong> Enter area to see pricing calculations
                    </p>
                  </div>
                )}
                {result && result.areaRequested < result.minChargeableArea && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Minimum billing:</strong> {result.minChargeableArea} m² ({formatCurrency(result.packageStarting)})
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      You can use up to {result.minChargeableArea} m² for the same price!
                    </p>
                  </div>
                )}
              </div>

              {/* Tenure Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Lease Term</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['Very Short', 'Short', 'Long'] as const).map((term) => (
                    <button
                      key={term}
                      onClick={() => setTenure(term)}
                      className={`p-3 text-sm font-medium rounded-lg border-2 transition-all ${
                        tenure === term
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {term}
                      <div className="text-xs mt-1 text-gray-500">
                        {term === 'Short' && '< 12 months'}
                        {term === 'Long' && '12+ months minimum'}
                        {term === 'Very Short' && 'Premium rate'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lease Duration ({tenure === 'Very Short' ? 'Days' : 'Months'})
                </label>
                <input
                  type="number"
                  value={leaseDurationMonths || ''}
                  onChange={(e) => {
                    // Handle empty input
                    if (e.target.value === '') {
                      setLeaseDurationMonths(0)
                      return
                    }
                    
                    // Remove leading zeros and convert to number
                    const cleanValue = e.target.value.replace(/^0+/, '') || '0'
                    const newValue = Number(cleanValue)
                    // Round up to whole number (no decimals) and ensure minimum 1
                    const roundedValue = Math.max(1, Math.ceil(newValue))
                    
                    // Handle Very Short term with days
                    if (tenure === 'Very Short') {
                      // If days >= 30, convert to months and switch to Short term
                      if (roundedValue >= 30) {
                        const months = Math.ceil(roundedValue / 30)
                        setLeaseDurationMonths(months)
                        setTenure('Short')
                      } else {
                        // Keep as days for Very Short term
                        setLeaseDurationMonths(roundedValue)
                      }
                    } else {
                      // Regular month-based logic
                      setLeaseDurationMonths(roundedValue)
                      
                      // Auto-switch tenure based on duration
                      if (roundedValue >= 12 && roundedValue > 0) {
                        setTenure('Long')
                      } else if (roundedValue > 0 && roundedValue < 12) {
                        setTenure('Short')
                      }
                    }
                  }}
                  min="1"
                  step="1"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={tenure === 'Very Short' ? "Enter days (minimum 1 day)" : "Enter months (minimum 1 month)"}
                />
                {leaseDurationMonths > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>ℹ️ Auto-selected:</strong> {
                        tenure === 'Very Short' ? 'Very Short term' :
                        leaseDurationMonths >= 12 ? 'Long term' : 'Short term'
                      } 
                      ({tenure === 'Very Short' ? `${leaseDurationMonths} days` : 
                        leaseDurationMonths >= 12 ? '12+ months' : '< 12 months'})
                    </p>
                  </div>
                )}
                {tenure === 'Long' && leaseDurationMonths < 12 && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>⚠️ Warning:</strong> Long term contracts require minimum 12 months duration
                    </p>
                  </div>
                )}
              </div>

              {/* Office Add-on */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={includeOffice}
                    onChange={(e) => setIncludeOffice(e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Add Office Space</span>
                    {getSettingNumber('office_monthly_rate') !== null && (
                      <div className="text-xs text-gray-500">{getSettingNumber('office_monthly_rate')!.toFixed(3)} BHD/month fixed rate</div>
                    )}
                    {systemSettings.length > 0 && (
                      <div className="text-xs text-green-600 mt-1">✓ Dynamic pricing from database</div>
                    )}
                  </div>
                </label>
              </div>

              {/* EWA Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Electricity & Water (EWA)</label>
                <div className="space-y-3">
                  <label className="flex items-start space-x-3">
                    <input
                      type="radio"
                      name="ewa"
                      checked={ewaType === 'house_load'}
                      onChange={() => setEwaType('house_load')}
                      className="h-4 w-4 text-blue-600 mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">House-load (Included)</div>
                      <div className="text-xs text-gray-500">Lights, phones, laptops, small devices</div>
                    </div>
                  </label>
                  <label className="flex items-start space-x-3">
                    <input
                      type="radio"
                      name="ewa"
                      checked={ewaType === 'dedicated_meter'}
                      onChange={() => setEwaType('dedicated_meter')}
                      className="h-4 w-4 text-blue-600 mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">Dedicated Meter</div>
                      <div className="text-xs text-gray-500">Heavy usage, AC, machinery - EWA bills directly</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Optional Services */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Optional Services</label>
                <div className="space-y-2">
                  {optionalServices.map((service) => (
                    <label key={service.id} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={selectedServices.includes(service.id)}
                        onChange={() => handleServiceToggle(service.id)}
                        className="h-4 w-4 text-blue-600 mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{service.name}</div>
                        <div className="text-xs text-gray-500">{service.description}</div>
                                                 <div className="text-xs text-blue-600">
                           {service.pricing_type === 'on_request' && 'Pricing on request'}
                           {service.is_free && 'Included'}
                           {service.rate && `${formatCurrency(service.rate)} ${service.unit}`}
                         </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Discounts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                  <input
                    type="number"
                    value={discountPercent || ''}
                    onChange={(e) => {
                      // Handle empty input
                      if (e.target.value === '') {
                        setDiscountPercent(0)
                        return
                      }
                      
                      // Remove leading zeros and convert to number
                      const cleanValue = e.target.value.replace(/^0+/, '') || '0'
                      const newValue = Number(cleanValue)
                      setDiscountPercent(newValue)
                    }}
                    min="0"
                    max="100"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Discount (BHD)</label>
                  <input
                    type="number"
                    value={discountFixed || ''}
                    onChange={(e) => {
                      // Handle empty input
                      if (e.target.value === '') {
                        setDiscountFixed(0)
                        return
                      }
                      
                      // Remove leading zeros and convert to number
                      const cleanValue = e.target.value.replace(/^0+/, '') || '0'
                      const newValue = Number(cleanValue)
                      setDiscountFixed(newValue)
                    }}
                    min="0"
                    step="0.001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - REAL-TIME PREVIEW */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Live Quote Preview</h2>
                  <p className="text-sm text-gray-600 mt-1">Updates automatically as you type</p>
                </div>
                {result && (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleDownloadPDF}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </button>
                    <button
                      onClick={handleDownloadPDFFromElement}
                      className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export View
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6">
              {result ? (
                <div id="quote-preview-content" className="space-y-6">
                  {/* Quote Header */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-blue-900">{result.areaBand}</h3>
                    <div className="text-sm text-blue-700 mt-1">
                      {formatArea(result.areaRequested)} requested • {formatArea(result.areaChargeable)} chargeable
                    </div>
                    <div className="text-sm text-blue-700">
                      {result.tenure} term • {result.leaseDurationMonths} {result.tenure === 'Very Short' ? 'days' : 'months'}
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Pricing Breakdown</h4>
                    
                    {/* Warehouse Rent */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Warehouse Rent</span>
                        <span className="font-medium text-lg">{formatCurrency(result.totalWarehouseRent)}</span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>Rate:</span>
                          <span>
                            {formatCurrency(result.tenure === 'Very Short' ? result.dailyRatePerSqm : result.monthlyRatePerSqm)}
                            /m²/{result.tenure === 'Very Short' ? 'day' : 'month'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>{result.tenure === 'Very Short' ? 'Daily' : 'Monthly'} rent:</span>
                          <span>{formatCurrency(result.tenure === 'Very Short' ? result.dailyRatePerSqm * result.areaChargeable : result.monthlyWarehouseRent)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Duration:</span>
                          <span>{result.leaseDurationMonths} {result.tenure === 'Very Short' ? 'days' : 'months'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Office */}
                    {result.officeIncluded && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Office Space</span>
                          <span className="font-medium">{formatCurrency(result.officeTotalCost)}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {(
                            result.tenure === 'Very Short'
                              ? (result.officeMonthlyRate / (getSettingNumber('days_per_month') || 30))
                              : result.officeMonthlyRate
                          ).toFixed(3)} BHD/{result.tenure === 'Very Short' ? 'day' : 'month'} × {result.leaseDurationMonths} {result.tenure === 'Very Short' ? 'days' : 'months'}
                        </div>
                      </div>
                    )}

                    {/* EWA */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">EWA Setup</span>
                        <span className="font-medium">{formatCurrency(result.ewaSetupCosts)}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {result.ewaType === 'house_load' ? 'Included in rent' : 'One-time setup costs'}
                      </div>
                    </div>

                    {/* Monthly Total */}
                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-green-900">{result.tenure === 'Very Short' ? 'Daily' : 'Monthly'} Total</span>
                        <span className="font-bold text-xl text-green-900">{formatCurrency(result.monthlyTotal)}</span>
                      </div>
                    </div>

                    {/* Grand Total */}
                    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-blue-900">Total Contract Value</span>
                        <span className="font-bold text-2xl text-blue-900">{formatCurrency(result.grandTotal)}</span>
                      </div>
                      {result.discountAmount > 0 && (
                        <div className="text-sm text-green-600 mt-1">
                          Discount applied: -{formatCurrency(result.discountAmount)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Smart Suggestions */}
                  {result.suggestions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">💡 Smart Suggestions</h4>
                      {result.suggestions.map((suggestion, index) => (
                        <div key={index} className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                          <p className="text-sm text-yellow-800">{suggestion.message}</p>
                          {suggestion.savings > 0 && (
                            <p className="text-xs text-green-600 mt-1">
                              Save {formatCurrency(suggestion.savings)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Monthly Breakdown */}
                  {result.monthlyBreakdown.length > 1 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">{result.tenure === 'Very Short' ? 'Daily' : 'Monthly'} Payment Schedule</h4>
                      <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                        {result.monthlyBreakdown.map((month) => (
                          <div key={month.month} className="flex justify-between text-sm py-1">
                            <span>{result.tenure === 'Very Short' ? 'Day' : 'Month'} {month.month}:</span>
                            <span>{formatCurrency(month.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">🏢</div>
                  <p>Configure your space to see live pricing</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}