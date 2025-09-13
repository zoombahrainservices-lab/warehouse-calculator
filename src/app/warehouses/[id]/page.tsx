'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { generateStockReportPDF } from '@/lib/pdf-generator'

interface Warehouse {
  id: string
  name: string
  location: string
  total_space: number
  occupied_space: number
  free_space: number
  has_mezzanine: boolean
  mezzanine_space: number
  mezzanine_occupied: number
  mezzanine_free: number
  description?: string
  status: 'active' | 'inactive' | 'maintenance'
  created_at: string
  updated_at: string
}

interface WarehouseOccupant {
  id: string
  warehouse_id: string
  name: string
  contact_info?: string
  space_occupied: number
  floor_type: 'ground' | 'mezzanine'
  section?: string
  entry_date: string
  expected_exit_date?: string
  status: 'active' | 'completed' | 'pending'
  notes?: string
  created_at: string
  updated_at: string
}

interface StockItem {
  id: string
  client_name: string
  client_email: string
  client_phone: string
  product_name: string
  product_type: string
  quantity: number
  unit: string
  description: string
  storage_location: string
  area_used: number
  entry_date: string
  expected_exit_date: string
  status: 'active' | 'completed' | 'pending'
  notes: string
  current_quantity: number
  total_received_quantity: number
  total_delivered_quantity: number
  initial_quantity: number
  space_type: string
  created_at: string
  updated_at: string
}

export default function WarehouseDetail() {
  const params = useParams()
  const router = useRouter()
  const warehouseId = params.id as string

  // Check URL parameters for debug mode
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const debugMode = urlParams?.get('debug') === 'true'

  console.log('🏭 Warehouse detail page initialized:', {
    warehouseId: warehouseId,
    debugMode: debugMode,
    url: typeof window !== 'undefined' ? window.location.href : 'server-side'
  })
  
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null)
  const [occupants, setOccupants] = useState<WarehouseOccupant[]>([])
  const [occupantStock, setOccupantStock] = useState<{ [key: string]: StockItem[] }>({})
  const [pricingRates, setPricingRates] = useState<any[]>([])
  const [ewaSettings, setEwaSettings] = useState<any>(null)
  const [occupantCosts, setOccupantCosts] = useState<{ [key: string]: any }>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  interface User {
    id: string
    email: string
    name: string
    role: string
    picture?: string
  }

  const [user, setUser] = useState<User | null>(null)
  const [selectedOccupant, setSelectedOccupant] = useState<WarehouseOccupant | null>(null)
  const [showStockModal, setShowStockModal] = useState(false)
  const [showAddStockModal, setShowAddStockModal] = useState(false)
  const [showEditStockModal, setShowEditStockModal] = useState(false)
  const [showReceiveStockModal, setShowReceiveStockModal] = useState(false)
  const [showDeliverStockModal, setShowDeliverStockModal] = useState(false)
  const [editingStockItem, setEditingStockItem] = useState<StockItem | null>(null)
  const [selectedStockForAction, setSelectedStockForAction] = useState<StockItem | null>(null)
  const [newStock, setNewStock] = useState({
    product_name: '',
    product_type: '',
    quantity: 0,
    unit: 'tons',
    description: '',
    storage_location: '',
    area_used: 0,
    entry_date: new Date().toISOString().split('T')[0],
    expected_exit_date: '',
    status: 'active' as 'active' | 'completed' | 'pending',
    notes: ''
  })
  const [stockAction, setStockAction] = useState({
    quantity: 0,
    notes: ''
  })
  
  // Occupant management state
  const [showAddOccupantModal, setShowAddOccupantModal] = useState(false)
  const [showEditOccupantModal, setShowEditOccupantModal] = useState(false)
  const [editingOccupant, setEditingOccupant] = useState<WarehouseOccupant | null>(null)
  const [newOccupant, setNewOccupant] = useState({
    name: '',
    contact_info: '',
    space_occupied: 0,
    floor_type: 'ground' as 'ground' | 'mezzanine',
    section: '',
    entry_date: new Date().toISOString().split('T')[0],
    expected_exit_date: '',
    status: 'active' as 'active' | 'completed' | 'pending',
    notes: ''
  })

  // Check authentication and admin access
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔐 Warehouse detail page: Checking authentication...')
        console.log('🔐 Debug mode:', debugMode)

        // If debug mode is enabled, bypass authentication
        if (debugMode) {
          console.log('🔧 DEBUG MODE: Bypassing authentication')
          setUser({
            id: 'debug-admin',
            email: 'admin@debug.com',
            name: 'Debug Admin',
            role: 'ADMIN',
            picture: undefined
          })
          console.log('✅ Debug mode: Access granted')
          return
        }

        const response = await fetch('/api/auth/validate-session', {
          method: 'GET',
          credentials: 'include'
        })

        console.log('🔐 Auth response status:', response.status)

        if (response.ok) {
          const userData = await response.json()
          console.log('🔐 Auth response data:', {
            hasUser: !!userData.user,
            userRole: userData.user?.role,
            userEmail: userData.user?.email
          })

          setUser(userData.user)

          // Only admin-level users can access this page (occupant and stock management)
          const allowedRoles = ['ADMIN', 'MANAGER', 'SUPPORT']
          const userRole = userData.user.role

          console.log('🔐 Role check:', {
            userRole: userRole,
            allowedRoles: allowedRoles,
            isAllowed: allowedRoles.includes(userRole)
          })

          if (!allowedRoles.includes(userRole)) {
            console.log('❌ Access denied: User role', userRole, 'cannot access warehouse detail page. Allowed roles:', allowedRoles)
            console.log('🔄 Redirecting to warehouse view page...')
            router.push('/warehouses/view')
            return
          }

          console.log('✅ Access granted: User role', userRole, 'can access warehouse detail page')
          console.log('🏭 Loading warehouse data for ID:', warehouseId)
        } else {
          console.log('❌ Authentication failed, redirecting to login')
          router.push('/login')
        }
      } catch (error) {
        console.error('❌ Error checking authentication:', error)
        console.log('🔄 Redirecting to login due to error')
        router.push('/login')
      }
    }

    checkAuth()
  }, [router, warehouseId, debugMode])

  useEffect(() => {
    if (warehouseId) {
      loadWarehouseData()
    }
  }, [warehouseId])

  const loadWarehouseData = async () => {
    try {
      setLoading(true)
      
      // Load warehouse details
      const { data: warehouseData, error: warehouseError } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', warehouseId)
        .single()

      if (warehouseError) {
        console.error('Error loading warehouse:', warehouseError)
        setError('Failed to load warehouse details')
        return
      }

      setWarehouse(warehouseData)

      // Load occupants for this warehouse
      const { data: occupantsData, error: occupantsError } = await supabase
        .from('warehouse_occupants')
        .select('*')
        .eq('warehouse_id', warehouseId)
        .order('created_at', { ascending: false })

      if (occupantsError) {
        console.error('Error loading occupants:', occupantsError)
        setError('Failed to load occupants')
        return
      }

      setOccupants(occupantsData || [])

      // Load stock for each occupant
      const stockData: { [key: string]: StockItem[] } = {}
      for (const occupant of occupantsData || []) {
        let stockItems: StockItem[] = []
        
        // Extract user ID from occupant notes if available
        let userId: string | null = null
        if (occupant.notes) {
          const userMatch = occupant.notes.match(/USER:([a-f0-9-]+)/)
          if (userMatch) {
            userId = userMatch[1]
            console.log(`🔍 Found user ID in occupant notes: ${userId}`)
          }
        }
        
        // Try to get stock by user ID first (most reliable)
        if (userId) {
          const { data: userStock, error: userStockError } = await supabase
            .from('client_stock')
            .select('*')
            .ilike('notes', `%User: ${userId}%`)
            .order('created_at', { ascending: false })
          
          if (!userStockError && userStock) {
            stockItems = userStock
            console.log(`📦 Loaded ${stockItems.length} stock items for user ID: ${userId}`)
          }
        }
        
        // Fallback: try to get stock by client_name if no user ID found or no stock found
        if (stockItems.length === 0) {
          const { data: nameStock, error: nameStockError } = await supabase
            .from('client_stock')
            .select('*')
            .eq('client_name', occupant.name)
            .order('created_at', { ascending: false })
          
          if (!nameStockError && nameStock) {
            stockItems = nameStock
            console.log(`📦 Loaded ${stockItems.length} stock items by client name: ${occupant.name}`)
          }
        }
        
        stockData[occupant.id] = stockItems
        console.log(`📊 Final stock count for ${occupant.name}: ${stockItems.length} items`)
      }

      setOccupantStock(stockData)

      // Load pricing rates and EWA settings for cost calculations
      const [pricingResult, ewaResult] = await Promise.all([
        supabase.from('pricing_rates').select('*').order('area_band_min'),
        supabase.from('ewa_settings').select('*').limit(1).single()
      ])

      if (!pricingResult.error) {
        setPricingRates(pricingResult.data || [])
        console.log('✅ Pricing rates loaded:', pricingResult.data?.length || 0)
      }

      if (!ewaResult.error) {
        setEwaSettings(ewaResult.data)
        console.log('✅ EWA settings loaded')
      }

      // Calculate costs for all occupants
      if (occupantsData && pricingResult.data && ewaResult.data) {
        calculateOccupantCosts(occupantsData, pricingResult.data, ewaResult.data)
      }

      setError(null)
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load warehouse data')
    } finally {
      setLoading(false)
    }
  }

  const calculateOccupantCosts = (occupants: any[], rates: any[], ewa: any) => {
    const costs: { [key: string]: any } = {}
    
    occupants.forEach(occupant => {
      const cost = calculateOccupantCost(occupant, rates, ewa)
      costs[occupant.id] = cost
    })
    
    setOccupantCosts(costs)
    console.log('✅ Occupant costs calculated:', Object.keys(costs).length)
  }

  const calculateOccupantCost = (occupant: any, rates: any[], ewa: any) => {
    if (!occupant.space_occupied || occupant.space_occupied <= 0) {
      return {
        hasWarehouse: false,
        monthlyCost: 0,
        annualCost: 0,
        ratePerSqm: 0,
        chargeableArea: 0,
        ewaCost: 0,
        totalMonthlyCost: 0,
        totalAnnualCost: 0,
        tenure: 'Unknown',
        leaseDuration: 0
      }
    }

    // Calculate lease duration and determine tenure
    const entryDate = occupant.entry_date ? new Date(occupant.entry_date) : new Date()
    const exitDate = occupant.expected_exit_date ? new Date(occupant.expected_exit_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default to 30 days from now
    
    const leaseDurationDays = Math.ceil((exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24))
    const leaseDurationMonths = Math.ceil(leaseDurationDays / 30)
    
    // Determine tenure based on duration (same logic as calculator)
    let tenure: 'Very Short' | 'Short' | 'Long' = 'Short'
    if (leaseDurationDays < 30) {
      tenure = 'Very Short'
    } else if (leaseDurationMonths >= 12) {
      tenure = 'Long'
    } else {
      tenure = 'Short'
    }

    // Find applicable rate for the determined tenure
    const applicableRate = findApplicableRate(occupant.space_occupied, occupant.floor_type || 'ground', rates, tenure)
    
    if (!applicableRate) {
      return {
        hasWarehouse: true,
        monthlyCost: 0,
        annualCost: 0,
        ratePerSqm: 0,
        chargeableArea: occupant.space_occupied,
        ewaCost: 0,
        totalMonthlyCost: 0,
        totalAnnualCost: 0,
        tenure: tenure,
        leaseDuration: leaseDurationDays,
        error: 'No pricing rate found'
      }
    }

    // Calculate chargeable area
    const chargeableArea = Math.max(occupant.space_occupied, applicableRate.min_chargeable_area)
    
    // Calculate costs based on tenure (same logic as warehouse calculator)
    let monthlyCost = 0
    let totalCost = 0
    let ratePerSqm = 0
    
    if (tenure === 'Very Short') {
      // Use daily rate for Very Short term
      const dailyRate = chargeableArea * applicableRate.daily_rate_per_sqm
      totalCost = dailyRate * leaseDurationDays
      monthlyCost = totalCost / 30 // Convert to monthly equivalent for display
      ratePerSqm = applicableRate.daily_rate_per_sqm
    } else {
      // Use monthly rate for Short/Long term
      monthlyCost = chargeableArea * applicableRate.monthly_rate_per_sqm
      totalCost = monthlyCost * leaseDurationMonths
      ratePerSqm = applicableRate.monthly_rate_per_sqm
    }

    // Apply minimum 100 BHD rule
    const MINIMUM_CHARGE = 100
    if (monthlyCost < MINIMUM_CHARGE) {
      monthlyCost = MINIMUM_CHARGE
      totalCost = MINIMUM_CHARGE * leaseDurationMonths
    }

    // Calculate EWA estimate
    const ewaMonthly = ewa?.estimated_fixed_monthly_charges || 15.0
    const ewaTotal = tenure === 'Very Short' ? 
      (ewaMonthly / 30) * leaseDurationDays : 
      ewaMonthly * leaseDurationMonths

    // Calculate total costs
    const totalMonthlyCost = monthlyCost + ewaMonthly
    const totalAnnualCost = (monthlyCost + ewaMonthly) * 12

    return {
      hasWarehouse: true,
      monthlyCost: monthlyCost,
      annualCost: totalAnnualCost,
      ratePerSqm: ratePerSqm,
      chargeableArea: chargeableArea,
      ewaCost: ewaMonthly,
      totalMonthlyCost: totalMonthlyCost,
      totalAnnualCost: totalAnnualCost,
      totalCost: totalCost + ewaTotal,
      tenure: tenure,
      leaseDuration: leaseDurationDays,
      leaseDurationMonths: leaseDurationMonths,
      pricingDetails: {
        areaBand: applicableRate.area_band_name,
        tenure: applicableRate.tenure,
        monthlyRatePerSqm: applicableRate.monthly_rate_per_sqm,
        dailyRatePerSqm: applicableRate.daily_rate_per_sqm,
        minChargeableArea: applicableRate.min_chargeable_area
      }
    }
  }

  const findApplicableRate = (area: number, floorType: string, rates: any[], tenure: string = 'Short') => {
    let bestRate = null
    let bestMatch = -1

    for (const rate of rates) {
      // Check if floor type matches (handle different naming conventions)
      const rateFloorType = rate.space_type?.toLowerCase().replace(' floor', '') || 'ground'
      const occupantFloorType = floorType?.toLowerCase() || 'ground'
      
      if (rateFloorType !== occupantFloorType) continue

      // Check if tenure matches
      if (rate.tenure !== tenure) continue

      // Check if area falls within the band
      const minArea = rate.area_band_min || 0
      const maxArea = rate.area_band_max || Infinity
      
      if (area >= minArea && area <= maxArea) {
        // Prefer rates with smaller bands (more specific)
        const bandSize = maxArea - minArea
        if (bestMatch === -1 || bandSize < bestMatch) {
          bestRate = rate
          bestMatch = bandSize
        }
      }
    }
    
    return bestRate
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/')
    }
  }

  const downloadOccupantStockPDF = async (occupant: WarehouseOccupant) => {
    const stockItems = occupantStock[occupant.id] || []
    if (stockItems.length === 0) {
      alert('No stock items found for this occupant')
      return
    }

    try {
      await generateStockReportPDF(stockItems, {
        title: `Stock Report - ${occupant.name}`,
        filename: `stock-report-${occupant.name}-${new Date().toISOString().split('T')[0]}.pdf`
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF')
    }
  }

  // Stock Management Functions
  
  // Validate stock space against occupant's allocated space
  const validateStockSpace = (stockArea: number, occupant: WarehouseOccupant): string | null => {
    // Get current stock for this occupant
    const currentStock = occupantStock[occupant.id] || []
    const currentStockArea = currentStock.reduce((sum, item) => sum + (item.area_used || 0), 0)
    
    // Calculate total stock area if this new stock is added
    const totalStockArea = currentStockArea + stockArea
    
    // Check if total stock area exceeds occupant's allocated space
    if (totalStockArea > occupant.space_occupied) {
      return `Stock space exceeded! Occupant "${occupant.name}" has ${occupant.space_occupied.toLocaleString()} m² allocated, but stock would use ${totalStockArea.toLocaleString()} m² (current: ${currentStockArea.toLocaleString()} m² + new: ${stockArea.toLocaleString()} m²). Available for stock: ${(occupant.space_occupied - currentStockArea).toLocaleString()} m²`
    }
    
    // Check minimum area
    if (stockArea <= 0) {
      return 'Stock area must be greater than 0 m²'
    }
    
    return null // No validation errors
  }

  // Function to manually sync stock data for all occupants
  const syncStockData = async () => {
    try {
      console.log('🔄 Manually syncing stock data for all occupants...')
      setLoading(true)
      
      // Reload stock data for all occupants
      const stockData: { [key: string]: StockItem[] } = {}
      for (const occupant of occupants || []) {
        let stockItems: StockItem[] = []
        
        // Extract user ID from occupant notes if available
        let userId: string | null = null
        if (occupant.notes) {
          const userMatch = occupant.notes.match(/USER:([a-f0-9-]+)/)
          if (userMatch) {
            userId = userMatch[1]
            console.log(`🔍 Syncing stock for user ID: ${userId}`)
          }
        }
        
        // Try to get stock by user ID first (most reliable)
        if (userId) {
          const { data: userStock, error: userStockError } = await supabase
            .from('client_stock')
            .select('*')
            .ilike('notes', `%User: ${userId}%`)
            .order('created_at', { ascending: false })
          
          if (!userStockError && userStock) {
            stockItems = userStock
            console.log(`📦 Synced ${stockItems.length} stock items for user ID: ${userId}`)
          }
        }
        
        // Fallback: try to get stock by client_name if no user ID found or no stock found
        if (stockItems.length === 0) {
          const { data: nameStock, error: nameStockError } = await supabase
            .from('client_stock')
            .select('*')
            .eq('client_name', occupant.name)
            .order('created_at', { ascending: false })
          
          if (!nameStockError && nameStock) {
            stockItems = nameStock
            console.log(`📦 Synced ${stockItems.length} stock items by client name: ${occupant.name}`)
          }
        }
        
        stockData[occupant.id] = stockItems
        console.log(`📊 Final synced stock count for ${occupant.name}: ${stockItems.length} items`)
      }
      
      setOccupantStock(stockData)
      console.log('✅ Stock data sync completed successfully!')
      
      // Show success message
      alert('Stock data synchronized successfully!')
      
    } catch (error) {
      console.error('❌ Error syncing stock data:', error)
      alert('Failed to sync stock data. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  // Recalculate warehouse occupied space based on current occupants
  const recalculateWarehouseSpace = async () => {
    if (!warehouse) return

    try {
      // Calculate occupied space by floor type
      const groundFloorOccupied = occupants
        .filter(o => o.floor_type === 'ground' && o.status === 'active')
        .reduce((sum, o) => sum + o.space_occupied, 0)
      
      const mezzanineOccupied = occupants
        .filter(o => o.floor_type === 'mezzanine' && o.status === 'active')
        .reduce((sum, o) => sum + o.space_occupied, 0)

      // Update warehouse with recalculated values
      const { error } = await supabase
        .from('warehouses')
        .update({
          occupied_space: groundFloorOccupied,
          mezzanine_occupied: mezzanineOccupied,
          updated_at: new Date().toISOString()
        })
        .eq('id', warehouse.id)

      if (error) {
        console.error('Error updating warehouse space:', error)
      }
    } catch (err) {
      console.error('Error recalculating warehouse space:', err)
    }
  }

  const addStockForOccupant = async () => {
    if (!selectedOccupant) return

    // Validate stock space before adding
    const validationError = validateStockSpace(newStock.area_used, selectedOccupant)
    if (validationError) {
      alert(validationError)
      return
    }

    try {
      const stockId = crypto.randomUUID()
      
      const stockData = {
        id: stockId,
        client_name: selectedOccupant.name,
        client_email: selectedOccupant.contact_info || '',
        client_phone: selectedOccupant.contact_info || '',
        product_name: newStock.product_name,
        product_type: newStock.product_type,
        quantity: newStock.quantity,
        unit: newStock.unit,
        description: newStock.description,
        storage_location: newStock.storage_location,
        area_used: newStock.area_used,
        entry_date: newStock.entry_date,
        expected_exit_date: newStock.expected_exit_date,
        status: newStock.status,
        notes: newStock.notes,
        current_quantity: newStock.quantity,
        total_received_quantity: newStock.quantity,
        total_delivered_quantity: 0,
        initial_quantity: newStock.quantity,
        space_type: selectedOccupant.floor_type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('client_stock')
        .insert([stockData])

      if (error) {
        console.error('Error adding stock:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        alert(`Failed to add stock: ${error.message || 'Unknown error occurred. Please check the console for details.'}`)
        return
      }

      // Reset form and close modal
      setNewStock({
        product_name: '',
        product_type: '',
        quantity: 0,
        unit: 'tons',
        description: '',
        storage_location: '',
        area_used: 0,
        entry_date: new Date().toISOString().split('T')[0],
        expected_exit_date: '',
        status: 'active',
        notes: ''
      })
      setShowAddStockModal(false)
      loadWarehouseData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to add stock')
    }
  }

  const editStockItem = async () => {
    if (!editingStockItem) return

    // Find the occupant for this stock item
    const stockOccupant = occupants.find(o => o.name === editingStockItem.client_name)
    if (stockOccupant) {
      // Validate stock space before updating
      const validationError = validateStockSpace(editingStockItem.area_used, stockOccupant)
      if (validationError) {
        alert(validationError)
        return
      }
    }

    try {
      const { error } = await supabase
        .from('client_stock')
        .update({
          product_name: editingStockItem.product_name,
          product_type: editingStockItem.product_type,
          description: editingStockItem.description,
          storage_location: editingStockItem.storage_location,
          area_used: editingStockItem.area_used,
          entry_date: editingStockItem.entry_date,
          expected_exit_date: editingStockItem.expected_exit_date,
          status: editingStockItem.status,
          notes: editingStockItem.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingStockItem.id)

      if (error) {
        console.error('Error updating stock:', error)
        alert('Failed to update stock')
        return
      }

      setEditingStockItem(null)
      setShowEditStockModal(false)
      loadWarehouseData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to update stock')
    }
  }

  const deleteStockItem = async (stockId: string) => {
    if (!confirm('Are you sure you want to delete this stock item?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('client_stock')
        .delete()
        .eq('id', stockId)

      if (error) {
        console.error('Error deleting stock:', error)
        alert('Failed to delete stock')
        return
      }

      loadWarehouseData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to delete stock')
    }
  }

  const receiveStock = async () => {
    if (!selectedStockForAction) return

    try {
      const newTotalReceived = selectedStockForAction.total_received_quantity + stockAction.quantity
      const newCurrentQuantity = newTotalReceived - selectedStockForAction.total_delivered_quantity

      const { error } = await supabase
        .from('client_stock')
        .update({
          current_quantity: newCurrentQuantity,
          total_received_quantity: newTotalReceived,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedStockForAction.id)

      if (error) {
        console.error('Error receiving stock:', error)
        alert('Failed to receive stock')
        return
      }

      // Add movement record
      await supabase
        .from('stock_movements')
        .insert([{
          id: crypto.randomUUID(),
          stock_id: selectedStockForAction.id,
          movement_type: 'received',
          quantity: stockAction.quantity,
          notes: stockAction.notes,
          created_at: new Date().toISOString()
        }])

      setShowReceiveStockModal(false)
      setSelectedStockForAction(null)
      setStockAction({ quantity: 0, notes: '' })
      loadWarehouseData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to receive stock')
    }
  }

  const deliverStock = async () => {
    if (!selectedStockForAction) return

    try {
      const newTotalDelivered = selectedStockForAction.total_delivered_quantity + stockAction.quantity
      const newCurrentQuantity = selectedStockForAction.total_received_quantity - newTotalDelivered

      if (newCurrentQuantity < 0) {
        alert('Cannot deliver more than current stock')
        return
      }

      const { error } = await supabase
        .from('client_stock')
        .update({
          current_quantity: newCurrentQuantity,
          total_delivered_quantity: newTotalDelivered,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedStockForAction.id)

      if (error) {
        console.error('Error delivering stock:', error)
        alert('Failed to deliver stock')
        return
      }

      // Add movement record
      await supabase
        .from('stock_movements')
        .insert([{
          id: crypto.randomUUID(),
          stock_id: selectedStockForAction.id,
          movement_type: 'delivered',
          quantity: stockAction.quantity,
          notes: stockAction.notes,
          created_at: new Date().toISOString()
        }])

      setShowDeliverStockModal(false)
      setSelectedStockForAction(null)
      setStockAction({ quantity: 0, notes: '' })
      loadWarehouseData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to deliver stock')
    }
  }

  // Helper function to get space availability
  const getSpaceAvailability = (floorType: 'ground' | 'mezzanine', excludeOccupantId?: string) => {
    if (!warehouse) return { available: 0, occupied: 0, total: 0 }

    const currentOccupants = occupants.filter(o => 
      o.status === 'active' && 
      o.id !== excludeOccupantId
    )
    const occupied = currentOccupants
      .filter(o => o.floor_type === floorType)
      .reduce((sum, o) => sum + o.space_occupied, 0)
    
    const total = floorType === 'ground' ? warehouse.total_space : (warehouse.has_mezzanine ? warehouse.mezzanine_space : 0)
    const available = total - occupied

    return { available, occupied, total }
  }

  // Helper function to validate space
  const validateSpace = (spaceRequested: number, floorType: 'ground' | 'mezzanine', excludeOccupantId?: string) => {
    if (!warehouse) return { isValid: false, error: 'Warehouse not found' }

    if (floorType === 'mezzanine' && !warehouse.has_mezzanine) {
      return { isValid: false, error: 'This warehouse does not have a mezzanine floor' }
    }

    const spaceInfo = getSpaceAvailability(floorType, excludeOccupantId)
    
    if (spaceRequested <= 0) {
      return { isValid: false, error: 'Space occupied must be greater than 0' }
    }

    if (spaceRequested > spaceInfo.available) {
      return { 
        isValid: false, 
        error: `Insufficient space! Available: ${spaceInfo.available.toLocaleString()} m², Requested: ${spaceRequested.toLocaleString()} m²` 
      }
    }

    return { isValid: true, error: null }
  }

  // Occupant Management Functions
  const addOccupant = async () => {
    if (!warehouse) return

    // Validate space
    const validation = validateSpace(newOccupant.space_occupied, newOccupant.floor_type)
    if (!validation.isValid) {
      alert(validation.error)
      return
    }

    try {
      const occupantId = crypto.randomUUID()
      
      const occupantData = {
        id: occupantId,
        warehouse_id: warehouseId,
        name: newOccupant.name,
        contact_info: newOccupant.contact_info,
        space_occupied: newOccupant.space_occupied,
        floor_type: newOccupant.floor_type,
        section: newOccupant.section,
        entry_date: newOccupant.entry_date,
        expected_exit_date: newOccupant.expected_exit_date,
        status: newOccupant.status,
        notes: newOccupant.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('warehouse_occupants')
        .insert([occupantData])

      if (error) {
        console.error('Error adding occupant:', error)
        alert('Failed to add occupant')
        return
      }

      // Reset form and close modal
      setNewOccupant({
        name: '',
        contact_info: '',
        space_occupied: 0,
        floor_type: 'ground',
        section: '',
        entry_date: new Date().toISOString().split('T')[0],
        expected_exit_date: '',
        status: 'active',
        notes: ''
      })
      setShowAddOccupantModal(false)
      loadWarehouseData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to add occupant')
    }
  }

  const editOccupant = async () => {
    if (!editingOccupant || !warehouse) return

    // Validate space (excluding current occupant's space)
    const validation = validateSpace(editingOccupant.space_occupied, editingOccupant.floor_type, editingOccupant.id)
    if (!validation.isValid) {
      alert(validation.error)
      return
    }

    try {
      const { error } = await supabase
        .from('warehouse_occupants')
        .update({
          name: editingOccupant.name,
          contact_info: editingOccupant.contact_info,
          space_occupied: editingOccupant.space_occupied,
          floor_type: editingOccupant.floor_type,
          section: editingOccupant.section,
          entry_date: editingOccupant.entry_date,
          expected_exit_date: editingOccupant.expected_exit_date,
          status: editingOccupant.status,
          notes: editingOccupant.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingOccupant.id)

      if (error) {
        console.error('Error updating occupant:', error)
        alert('Failed to update occupant')
        return
      }

      setEditingOccupant(null)
      setShowEditOccupantModal(false)
      loadWarehouseData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to update occupant')
    }
  }

  const deleteOccupant = async (occupantId: string) => {
    if (!confirm('Are you sure you want to delete this occupant? This will also delete all their stock items.')) {
      return
    }

    try {
      // First delete all stock items for this occupant
      const occupant = occupants.find(o => o.id === occupantId)
      if (occupant) {
        await supabase
          .from('client_stock')
          .delete()
          .eq('client_name', occupant.name)
      }

      // Then delete the occupant
      const { error } = await supabase
        .from('warehouse_occupants')
        .delete()
        .eq('id', occupantId)

      if (error) {
        console.error('Error deleting occupant:', error)
        alert('Failed to delete occupant')
        return
      }

      // Recalculate warehouse occupied space after deletion
      await recalculateWarehouseSpace()

      loadWarehouseData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to delete occupant')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading warehouse details...</p>
        </div>
      </div>
    )
  }

  if (error || !warehouse) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Warehouse</h3>
          <p className="text-gray-600">{error || 'Warehouse not found'}</p>
          <Link href="/warehouses" className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-lg">
            Back to Warehouses
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {debugMode && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-800">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Debug Mode Active:</strong> Authentication bypassed for testing warehouse detail page.
                Remove <code>?debug=true</code> from URL to return to normal authentication.
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {debugMode ? `${warehouse.name} (Debug Mode)` : warehouse.name}
              </h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">{warehouse.location}</p>
              {user && (
                <div className="mt-1">
                  <p className="text-blue-600 text-sm">
                    Welcome, {user.name}
                    {debugMode && <span className="text-yellow-600"> (Debug User)</span>}
                  </p>
                  <p className="text-gray-500 text-xs">
                    Role: {user.role}
                    {debugMode && <span className="text-yellow-600"> (Debug)</span>}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Link
                href="/warehouses"
                className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Warehouses
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
              <button
                onClick={syncStockData}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                🔄 Sync Stock
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-8">
                 {/* Warehouse Summary */}
         <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6">
           <h2 className="text-xl font-semibold text-gray-900 mb-4">Warehouse Summary</h2>
           
           {/* Ground Floor Summary */}
           <div className="mb-6">
             <h3 className="text-lg font-medium text-gray-900 mb-3">Ground Floor</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="text-center">
                 <div className="text-2xl font-bold text-blue-600">{warehouse.total_space.toLocaleString()}</div>
                 <div className="text-sm text-gray-600">Total Space (m²)</div>
               </div>
               <div className="text-center">
                 <div className="text-2xl font-bold text-orange-600">{warehouse.occupied_space.toLocaleString()}</div>
                 <div className="text-sm text-gray-600">Occupied Space (m²)</div>
               </div>
               <div className="text-center">
                 <div className="text-2xl font-bold text-green-600">{warehouse.free_space.toLocaleString()}</div>
                 <div className="text-sm text-gray-600">Available Space (m²)</div>
               </div>
               <div className="text-center">
                 <div className="text-2xl font-bold text-purple-600">
                   {occupants.filter(o => o.floor_type === 'ground').length}
                 </div>
                 <div className="text-sm text-gray-600">Ground Floor Occupants</div>
               </div>
             </div>
             <div className="mt-2 text-center">
               <div className="text-sm text-gray-600">
                 Ground Floor Utilization: {((warehouse.occupied_space / warehouse.total_space) * 100).toFixed(1)}%
               </div>
             </div>
           </div>

           {/* Mezzanine Floor Summary */}
           {warehouse.has_mezzanine && (
             <div className="mb-6">
               <h3 className="text-lg font-medium text-gray-900 mb-3">Mezzanine Floor</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <div className="text-center">
                   <div className="text-2xl font-bold text-blue-600">{warehouse.mezzanine_space.toLocaleString()}</div>
                   <div className="text-sm text-gray-600">Total Mezzanine Space (m²)</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-orange-600">{warehouse.mezzanine_occupied.toLocaleString()}</div>
                   <div className="text-sm text-gray-600">Occupied Mezzanine (m²)</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-green-600">{warehouse.mezzanine_free.toLocaleString()}</div>
                   <div className="text-sm text-gray-600">Available Mezzanine (m²)</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-purple-600">
                     {occupants.filter(o => o.floor_type === 'mezzanine').length}
                   </div>
                   <div className="text-sm text-gray-600">Mezzanine Occupants</div>
                 </div>
               </div>
               <div className="mt-2 text-center">
                 <div className="text-sm text-gray-600">
                   Mezzanine Utilization: {warehouse.mezzanine_space > 0 ? ((warehouse.mezzanine_occupied / warehouse.mezzanine_space) * 100).toFixed(1) : '0'}%
                 </div>
               </div>
             </div>
           )}

           {/* Overall Summary */}
           <div className="border-t pt-4">
             <div className="text-center">
               <div className="text-lg font-semibold text-gray-900 mb-2">Overall Summary</div>
               <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 <div className="text-center">
                   <div className="text-xl font-bold text-indigo-600">{occupants.length}</div>
                   <div className="text-sm text-gray-600">Total Occupants</div>
                 </div>
                 <div className="text-center">
                   <div className="text-xl font-bold text-indigo-600">
                     {warehouse.has_mezzanine ? 'Ground + Mezzanine' : 'Ground Floor Only'}
                   </div>
                   <div className="text-sm text-gray-600">Floor Configuration</div>
                 </div>
                 <div className="text-center">
                   <div className="text-xl font-bold text-indigo-600">
                     {warehouse.has_mezzanine ? 
                       ((warehouse.occupied_space + warehouse.mezzanine_occupied) / (warehouse.total_space + warehouse.mezzanine_space) * 100).toFixed(1) :
                       ((warehouse.occupied_space / warehouse.total_space) * 100).toFixed(1)
                     }%
                   </div>
                   <div className="text-sm text-gray-600">Overall Utilization</div>
                 </div>
               </div>
             </div>
           </div>
         </div>

                 {/* Occupants List */}
         <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
           <div className="px-4 md:px-6 py-4 border-b border-gray-200">
             <div className="flex flex-col md:flex-row md:justify-between md:items-center">
               <div>
                 <h2 className="text-xl font-semibold text-gray-900">Occupants & Stock</h2>
                 <p className="text-gray-600 text-sm mt-1">Click on an occupant to view their stock details</p>
               </div>
               <button
                 onClick={() => setShowAddOccupantModal(true)}
                 className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
               >
                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                 </svg>
                 Add Occupant
               </button>
             </div>
           </div>

          {occupants.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No occupants found</h3>
              <p className="text-gray-600">This warehouse has no occupants yet.</p>
            </div>
          ) : (
            <>
              {/* Revenue Summary */}
              {Object.keys(occupantCosts).length > 0 && (
                <div className="p-4 bg-green-50 border-b border-green-200">
                  <h3 className="text-sm font-medium text-green-900 mb-2">Warehouse Revenue Summary (Based on Actual Lease Terms)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-green-700">Total Lease Revenue:</span>
                      <span className="font-semibold text-green-900 ml-1">
                        BHD {Object.values(occupantCosts).reduce((sum: number, cost: any) => sum + (cost.totalCost || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Total Monthly Revenue:</span>
                      <span className="font-semibold text-green-900 ml-1">
                        BHD {Object.values(occupantCosts).filter((cost: any) => cost.hasWarehouse).reduce((sum: number, cost: any) => sum + (cost.totalMonthlyCost || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Active Occupants:</span>
                      <span className="font-semibold text-green-900 ml-1">
                        {Object.values(occupantCosts).filter((cost: any) => cost.hasWarehouse).length}
                      </span>
                    </div>
                    <div>
                      <span className="text-green-700">Total Area Occupied:</span>
                      <span className="font-semibold text-green-900 ml-1">
                        {occupants.reduce((sum, occupant) => sum + (occupant.space_occupied || 0), 0)} m²
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-green-600">
                    <span>Tenure Distribution: </span>
                    {Object.values(occupantCosts).filter((cost: any) => cost.hasWarehouse).reduce((acc: any, cost: any) => {
                      acc[cost.tenure] = (acc[cost.tenure] || 0) + 1
                      return acc
                    }, {}) && Object.entries(Object.values(occupantCosts).filter((cost: any) => cost.hasWarehouse).reduce((acc: any, cost: any) => {
                      acc[cost.tenure] = (acc[cost.tenure] || 0) + 1
                      return acc
                    }, {})).map(([tenure, count]) => `${tenure}: ${count}`).join(', ')}
                  </div>
                </div>
              )}
              <div className="divide-y divide-gray-200">
              {occupants.map(occupant => {
                const stockItems = occupantStock[occupant.id] || []
                const totalStockArea = stockItems.reduce((sum, item) => sum + (item.area_used || 0), 0)
                const availableSpace = occupant.space_occupied - totalStockArea

                return (
                  <div key={occupant.id} className="p-4 md:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start space-y-4 md:space-y-0">
                      <div className="flex-1">
                                                 <div className="flex items-center space-x-3 mb-2">
                           <h3 className="text-lg font-semibold text-gray-900">{occupant.name}</h3>
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                             occupant.status === 'active' ? 'bg-green-100 text-green-800' :
                             occupant.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                             'bg-yellow-100 text-yellow-800'
                           }`}>
                             {occupant.status.charAt(0).toUpperCase() + occupant.status.slice(1)}
                           </span>
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                             occupant.floor_type === 'ground' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                           }`}>
                             {occupant.floor_type.charAt(0).toUpperCase() + occupant.floor_type.slice(1)} Floor
                           </span>
                           {occupant.section && (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                               Section: {occupant.section}
                             </span>
                           )}
                         </div>
                        
                        {occupant.contact_info && (
                          <p className="text-gray-600 text-sm mb-2">{occupant.contact_info}</p>
                        )}
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Allocated Space:</span>
                            <span className="font-medium text-gray-900 ml-1">{occupant.space_occupied} m²</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Stock Items:</span>
                            <span className="font-medium text-gray-900 ml-1">{stockItems.length}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Stock Area Used:</span>
                            <span className="font-medium text-gray-900 ml-1">{totalStockArea} m²</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Available for Stock:</span>
                            <span className={`font-medium ml-1 ${availableSpace >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {availableSpace} m²
                            </span>
                          </div>
                        </div>

                        {/* Cost Information */}
                        {occupantCosts[occupant.id] && occupantCosts[occupant.id].hasWarehouse && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">Rent Calculation (Using Warehouse Calculator Algorithm)</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-blue-700">Monthly Equivalent:</span>
                                <span className="font-semibold text-blue-900 ml-1">
                                  BHD {occupantCosts[occupant.id].totalMonthlyCost?.toLocaleString() || '0'}
                                </span>
                              </div>
                              <div>
                                <span className="text-blue-700">Total Lease Cost:</span>
                                <span className="font-semibold text-blue-900 ml-1">
                                  BHD {occupantCosts[occupant.id].totalCost?.toLocaleString() || '0'}
                                </span>
                              </div>
                              <div>
                                <span className="text-blue-700">Rate per m²:</span>
                                <span className="font-semibold text-blue-900 ml-1">
                                  BHD {occupantCosts[occupant.id].ratePerSqm?.toFixed(2) || '0.00'}
                                  {occupantCosts[occupant.id].tenure === 'Very Short' ? '/day' : '/month'}
                                </span>
                              </div>
                              <div>
                                <span className="text-blue-700">Chargeable Area:</span>
                                <span className="font-semibold text-blue-900 ml-1">
                                  {occupantCosts[occupant.id].chargeableArea} m²
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-blue-600">
                              <div>
                                <span className="font-medium">Tenure:</span> {occupantCosts[occupant.id].tenure}
                              </div>
                              <div>
                                <span className="font-medium">Lease Duration:</span> {occupantCosts[occupant.id].leaseDuration} days ({occupantCosts[occupant.id].leaseDurationMonths} months)
                              </div>
                              <div>
                                <span className="font-medium">Pricing Band:</span> {occupantCosts[occupant.id].pricingDetails?.areaBand}
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-blue-600">
                              <span>Warehouse: BHD {occupantCosts[occupant.id].monthlyCost?.toLocaleString() || '0'} + EWA: BHD {occupantCosts[occupant.id].ewaCost?.toLocaleString() || '0'}</span>
                              {occupantCosts[occupant.id].pricingDetails && (
                                <span className="ml-2">
                                  ({occupantCosts[occupant.id].pricingDetails.areaBand} - {occupantCosts[occupant.id].pricingDetails.tenure})
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {occupant.notes && (
                          <p className="text-gray-500 text-sm mt-2">{occupant.notes}</p>
                        )}
                      </div>

                                             <div className="flex flex-col space-y-2">
                         <Link
                           href={`/warehouses/${params.id}/occupant-stock/${occupant.id}`}
                           className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                         >
                           <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                           </svg>
                           View Stock ({stockItems.length})
                         </Link>

                         <button
                           onClick={() => {
                             setSelectedOccupant(occupant)
                             setShowAddStockModal(true)
                           }}
                           className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
                         >
                           <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                           </svg>
                           Add Stock
                         </button>
                         
                         {stockItems.length > 0 && (
                           <button
                             onClick={() => downloadOccupantStockPDF(occupant)}
                             className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
                           >
                             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                             </svg>
                             Download PDF
                           </button>
                         )}

                         <div className="flex space-x-2 pt-2 border-t border-gray-200">
                           <button
                             onClick={() => {
                               setEditingOccupant(occupant)
                               setShowEditOccupantModal(true)
                             }}
                             className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                           >
                             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                             </svg>
                             Edit
                           </button>
                           <button
                             onClick={() => deleteOccupant(occupant.id)}
                             className="inline-flex items-center px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors text-sm"
                           >
                             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                             </svg>
                             Delete
                           </button>
                         </div>
                       </div>
                    </div>
                  </div>
                )
              })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stock Modal */}
      {showStockModal && selectedOccupant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Stock Details - {selectedOccupant.name}
                </h3>
                <button
                  onClick={() => setShowStockModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {occupantStock[selectedOccupant.id]?.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No stock items found</h3>
                  <p className="text-gray-600">This occupant has no stock items yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                                                              <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Qty</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivered</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage Location</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Used</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {occupantStock[selectedOccupant.id]?.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.product_name}</div>
                              <div className="text-sm text-gray-500">{item.product_type}</div>
                            </div>
                          </td>
                                                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                             {item.quantity} {item.unit}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                             <span className="text-blue-600 font-semibold">{(item.total_received_quantity || item.quantity).toLocaleString()} {item.unit}</span>
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                             <span className="text-gray-600 font-semibold">{(item.current_quantity || item.quantity).toLocaleString()} {item.unit}</span>
                           </td>
                                                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="text-red-600 font-semibold">{(item.total_delivered_quantity || 0).toLocaleString()} {item.unit}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.storage_location || 'Not specified'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.area_used} m²
                            </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.status === 'active' ? 'bg-green-100 text-green-800' :
                              item.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => {
                                  setSelectedStockForAction(item)
                                  setShowReceiveStockModal(true)
                                  setStockAction({ quantity: 0, notes: '' })
                                }}
                                className="text-green-600 hover:text-green-900"
                                title="Receive Stock"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedStockForAction(item)
                                  setShowDeliverStockModal(true)
                                  setStockAction({ quantity: 0, notes: '' })
                                }}
                                className="text-orange-600 hover:text-orange-900"
                                title="Deliver Stock"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  setEditingStockItem(item)
                                  setShowEditStockModal(true)
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit Stock"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteStockItem(item.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete Stock"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Total items: {occupantStock[selectedOccupant.id]?.length || 0}
                </div>
                <div className="flex space-x-2">
                  {occupantStock[selectedOccupant.id]?.length > 0 && (
                    <button
                      onClick={() => downloadOccupantStockPDF(selectedOccupant)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </button>
                  )}
                  <button
                    onClick={() => setShowStockModal(false)}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Stock Modal */}
      {showAddStockModal && selectedOccupant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Add Stock for {selectedOccupant.name}</h2>
            </div>
            
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={newStock.product_name}
                    onChange={(e) => setNewStock({...newStock, product_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                  <input
                    type="text"
                    value={newStock.product_type}
                    onChange={(e) => setNewStock({...newStock, product_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    value={newStock.quantity || ''}
                    onChange={(e) => setNewStock({...newStock, quantity: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={newStock.unit}
                    onChange={(e) => setNewStock({...newStock, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="tons">Tons</option>
                    <option value="kg">Kilograms</option>
                    <option value="pieces">Pieces</option>
                    <option value="boxes">Boxes</option>
                    <option value="pallets">Pallets</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
                <input
                  type="text"
                  value={newStock.storage_location}
                  onChange={(e) => setNewStock({...newStock, storage_location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Storage location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newStock.description}
                  onChange={(e) => setNewStock({...newStock, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Product description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area Used (m²)</label>
                  <input
                    type="number"
                    value={newStock.area_used || ''}
                    onChange={(e) => setNewStock({...newStock, area_used: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                  />
                  {/* Space validation feedback */}
                  {(() => {
                    if (!selectedOccupant) return null
                    
                    const currentStock = occupantStock[selectedOccupant.id] || []
                    const currentStockArea = currentStock.reduce((sum, item) => sum + (item.area_used || 0), 0)
                    const availableForStock = selectedOccupant.space_occupied - currentStockArea
                    const validationError = newStock.area_used > 0 ? validateStockSpace(newStock.area_used, selectedOccupant) : null
                    
                    return (
                      <div className="mt-1 text-xs">
                        <div className="text-gray-600">
                          Occupant allocated: {selectedOccupant.space_occupied.toLocaleString()} m² | 
                          Current stock: {currentStockArea.toLocaleString()} m² | 
                          Available: {availableForStock.toLocaleString()} m²
                        </div>
                        {validationError && (
                          <div className="text-red-600 font-medium mt-1">
                            ⚠️ {validationError}
                          </div>
                        )}
                        {!validationError && newStock.area_used > 0 && (
                          <div className="text-green-600 font-medium mt-1">
                            ✅ Space allocation valid
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={newStock.status}
                    onChange={(e) => setNewStock({...newStock, status: e.target.value as 'active' | 'completed' | 'pending'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entry Date</label>
                  <input
                    type="date"
                    value={newStock.entry_date}
                    onChange={(e) => setNewStock({...newStock, entry_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Exit Date</label>
                  <input
                    type="date"
                    value={newStock.expected_exit_date}
                    onChange={(e) => setNewStock({...newStock, expected_exit_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newStock.notes}
                  onChange={(e) => setNewStock({...newStock, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Additional notes"
                />
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setShowAddStockModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={addStockForOccupant}
                disabled={
                  !newStock.product_name || 
                  newStock.quantity <= 0 ||
                  (selectedOccupant && validateStockSpace(newStock.area_used, selectedOccupant) !== null)
                }
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                Add Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Stock Modal */}
      {showReceiveStockModal && selectedStockForAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Receive Stock</h2>
              <p className="text-gray-600 text-sm mt-1">
                Product: {selectedStockForAction.product_name || selectedStockForAction.product_type}
              </p>
              <p className="text-gray-600 text-sm">
                Current Stock: {selectedStockForAction.current_quantity || selectedStockForAction.quantity || 0} {selectedStockForAction.unit || 'units'}
              </p>
            </div>
            
            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Receive *</label>
                <input
                  type="number"
                  value={stockAction.quantity || ''}
                  onChange={(e) => setStockAction({...stockAction, quantity: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  step="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={stockAction.notes}
                  onChange={(e) => setStockAction({...stockAction, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Optional notes about this stock receipt"
                />
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => {
                  setShowReceiveStockModal(false)
                  setSelectedStockForAction(null)
                  setStockAction({ quantity: 0, notes: '' })
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={receiveStock}
                disabled={stockAction.quantity <= 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                Receive Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deliver Stock Modal */}
      {showDeliverStockModal && selectedStockForAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Deliver Stock</h2>
              <p className="text-gray-600 text-sm mt-1">
                Product: {selectedStockForAction.product_name || selectedStockForAction.product_type}
              </p>
              <p className="text-gray-600 text-sm">
                Available Stock: {selectedStockForAction.current_quantity || selectedStockForAction.quantity || 0} {selectedStockForAction.unit || 'units'}
              </p>
            </div>
            
            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Deliver *</label>
                <input
                  type="number"
                  value={stockAction.quantity || ''}
                  onChange={(e) => setStockAction({...stockAction, quantity: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max={selectedStockForAction.current_quantity || selectedStockForAction.quantity || 0}
                  step="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={stockAction.notes}
                  onChange={(e) => setStockAction({...stockAction, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Optional notes about this delivery"
                />
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => {
                  setShowDeliverStockModal(false)
                  setSelectedStockForAction(null)
                  setStockAction({ quantity: 0, notes: '' })
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={deliverStock}
                disabled={stockAction.quantity <= 0 || stockAction.quantity > (selectedStockForAction.current_quantity || selectedStockForAction.quantity || 0)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                Deliver Stock
              </button>
            </div>
          </div>
                 </div>
       )}

       {/* Add Occupant Modal */}
       {showAddOccupantModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
           <div className="bg-white rounded-lg w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
             <div className="p-4 md:p-6 border-b border-gray-200">
               <h2 className="text-lg md:text-xl font-semibold text-gray-900">Add New Occupant</h2>
             </div>
             
             <div className="p-4 md:p-6 space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Occupant Name *</label>
                   <input
                     type="text"
                     value={newOccupant.name}
                     onChange={(e) => setNewOccupant({...newOccupant, name: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     required
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Contact Information</label>
                   <input
                     type="text"
                     value={newOccupant.contact_info}
                     onChange={(e) => setNewOccupant({...newOccupant, contact_info: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     placeholder="Phone or email"
                   />
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Space Occupied (m²) *</label>
                   <input
                     type="number"
                     value={newOccupant.space_occupied || ''}
                     onChange={(e) => setNewOccupant({...newOccupant, space_occupied: Number(e.target.value)})}
                     className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                       newOccupant.space_occupied > 0 ? 
                         (validateSpace(newOccupant.space_occupied, newOccupant.floor_type).isValid ? 
                           'border-green-300 bg-green-50' : 
                           'border-red-300 bg-red-50') : 
                         'border-gray-300'
                     }`}
                     min="0"
                     step="0.01"
                     max={getSpaceAvailability(newOccupant.floor_type).available}
                     required
                   />
                   {/* Real-time space validation */}
                   {(() => {
                     const spaceInfo = getSpaceAvailability(newOccupant.floor_type)
                     const validation = newOccupant.space_occupied > 0 ? 
                       validateSpace(newOccupant.space_occupied, newOccupant.floor_type) : 
                       { isValid: true, error: null }
                     
                     return (
                       <div className="mt-1 text-xs">
                         <div className="text-gray-600">
                           <strong>Available:</strong> {spaceInfo.available.toLocaleString()} m² | 
                           <strong> Occupied:</strong> {spaceInfo.occupied.toLocaleString()} m² | 
                           <strong> Total:</strong> {spaceInfo.total.toLocaleString()} m²
                         </div>
                         {newOccupant.space_occupied > 0 && (
                           <>
                             {!validation.isValid ? (
                               <div className="text-red-600 font-medium mt-1 flex items-center">
                                 <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                   <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                 </svg>
                                 {validation.error}
                               </div>
                             ) : (
                               <div className="text-green-600 font-medium mt-1 flex items-center">
                                 <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                   <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                 </svg>
                                 Space allocation valid
                               </div>
                             )}
                           </>
                         )}
                       </div>
                     )
                   })()}
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Floor Type *</label>
                   <select
                     value={newOccupant.floor_type}
                     onChange={(e) => setNewOccupant({...newOccupant, floor_type: e.target.value as 'ground' | 'mezzanine'})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   >
                     <option value="ground">Ground Floor</option>
                     {warehouse?.has_mezzanine && <option value="mezzanine">Mezzanine Floor</option>}
                   </select>
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                 <input
                   type="text"
                   value={newOccupant.section}
                   onChange={(e) => setNewOccupant({...newOccupant, section: e.target.value})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="Section A, B, C, etc."
                 />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Entry Date</label>
                   <input
                     type="date"
                     value={newOccupant.entry_date}
                     onChange={(e) => setNewOccupant({...newOccupant, entry_date: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Expected Exit Date</label>
                   <input
                     type="date"
                     value={newOccupant.expected_exit_date}
                     onChange={(e) => setNewOccupant({...newOccupant, expected_exit_date: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                 <select
                   value={newOccupant.status}
                   onChange={(e) => setNewOccupant({...newOccupant, status: e.target.value as 'active' | 'completed' | 'pending'})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 >
                   <option value="active">Active</option>
                   <option value="pending">Pending</option>
                   <option value="completed">Completed</option>
                 </select>
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                 <textarea
                   value={newOccupant.notes}
                   onChange={(e) => setNewOccupant({...newOccupant, notes: e.target.value})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   rows={3}
                   placeholder="Additional notes about this occupant"
                 />
               </div>
             </div>

             <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
               <button
                 onClick={() => setShowAddOccupantModal(false)}
                 className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm md:text-base"
               >
                 Cancel
               </button>
               <button
                 onClick={addOccupant}
                 disabled={!newOccupant.name || newOccupant.space_occupied <= 0}
                 className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
               >
                 Add Occupant
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Edit Occupant Modal */}
       {showEditOccupantModal && editingOccupant && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
           <div className="bg-white rounded-lg w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
             <div className="p-4 md:p-6 border-b border-gray-200">
               <h2 className="text-lg md:text-xl font-semibold text-gray-900">Edit Occupant</h2>
             </div>
             
             <div className="p-4 md:p-6 space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Occupant Name *</label>
                   <input
                     type="text"
                     value={editingOccupant.name}
                     onChange={(e) => setEditingOccupant({...editingOccupant, name: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     required
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Contact Information</label>
                   <input
                     type="text"
                     value={editingOccupant.contact_info || ''}
                     onChange={(e) => setEditingOccupant({...editingOccupant, contact_info: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     placeholder="Phone or email"
                   />
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Space Occupied (m²) *</label>
                   <input
                     type="number"
                     value={editingOccupant.space_occupied || ''}
                     onChange={(e) => setEditingOccupant({...editingOccupant, space_occupied: Number(e.target.value)})}
                     className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                       editingOccupant.space_occupied > 0 ? 
                         (validateSpace(editingOccupant.space_occupied, editingOccupant.floor_type).isValid ? 
                           'border-green-300 bg-green-50' : 
                           'border-red-300 bg-red-50') : 
                         'border-gray-300'
                     }`}
                     min="0"
                     step="0.01"
                     max={getSpaceAvailability(editingOccupant.floor_type, editingOccupant.id).available}
                     required
                   />
                   {/* Real-time space validation */}
                   {(() => {
                     const spaceInfo = getSpaceAvailability(editingOccupant.floor_type, editingOccupant.id)
                     const validation = editingOccupant.space_occupied > 0 ? 
                       validateSpace(editingOccupant.space_occupied, editingOccupant.floor_type, editingOccupant.id) : 
                       { isValid: true, error: null }
                     
                     return (
                       <div className="mt-1 text-xs">
                         <div className="text-gray-600">
                           <strong>Available:</strong> {spaceInfo.available.toLocaleString()} m² | 
                           <strong> Occupied:</strong> {spaceInfo.occupied.toLocaleString()} m² | 
                           <strong> Total:</strong> {spaceInfo.total.toLocaleString()} m²
                         </div>
                         {editingOccupant.space_occupied > 0 && (
                           <>
                             {!validation.isValid ? (
                               <div className="text-red-600 font-medium mt-1 flex items-center">
                                 <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                   <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                 </svg>
                                 {validation.error}
                               </div>
                             ) : (
                               <div className="text-green-600 font-medium mt-1 flex items-center">
                                 <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                   <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                 </svg>
                                 Space allocation valid
                               </div>
                             )}
                           </>
                         )}
                       </div>
                     )
                   })()}
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Floor Type *</label>
                   <select
                     value={editingOccupant.floor_type}
                     onChange={(e) => setEditingOccupant({...editingOccupant, floor_type: e.target.value as 'ground' | 'mezzanine'})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   >
                     <option value="ground">Ground Floor</option>
                     {warehouse?.has_mezzanine && <option value="mezzanine">Mezzanine Floor</option>}
                   </select>
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                 <input
                   type="text"
                   value={editingOccupant.section || ''}
                   onChange={(e) => setEditingOccupant({...editingOccupant, section: e.target.value})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="Section A, B, C, etc."
                 />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Entry Date</label>
                   <input
                     type="date"
                     value={editingOccupant.entry_date}
                     onChange={(e) => setEditingOccupant({...editingOccupant, entry_date: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Expected Exit Date</label>
                   <input
                     type="date"
                     value={editingOccupant.expected_exit_date || ''}
                     onChange={(e) => setEditingOccupant({...editingOccupant, expected_exit_date: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                 <select
                   value={editingOccupant.status}
                   onChange={(e) => setEditingOccupant({...editingOccupant, status: e.target.value as 'active' | 'completed' | 'pending'})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 >
                   <option value="active">Active</option>
                   <option value="pending">Pending</option>
                   <option value="completed">Completed</option>
                 </select>
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                 <textarea
                   value={editingOccupant.notes || ''}
                   onChange={(e) => setEditingOccupant({...editingOccupant, notes: e.target.value})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   rows={3}
                   placeholder="Additional notes about this occupant"
                 />
               </div>
             </div>

             <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
               <button
                 onClick={() => {
                   setShowEditOccupantModal(false)
                   setEditingOccupant(null)
                 }}
                 className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm md:text-base"
               >
                 Cancel
               </button>
               <button
                 onClick={editOccupant}
                 disabled={!editingOccupant.name || editingOccupant.space_occupied <= 0}
                 className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
               >
                 Update Occupant
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   )
 }
