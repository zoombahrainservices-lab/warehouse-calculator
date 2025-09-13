'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generateStockReportPDF } from '@/lib/pdf-generator'
import { useAuth } from '@/hooks/useAuth'

interface StockItem {
  id: string
  client_name: string
  client_email: string
  client_phone: string
  product_name?: string
  product_type: string
  quantity: number
  unit: string
  description: string
  storage_location: string
  space_type: 'Ground Floor' | 'Mezzanine'
  area_used: number
  entry_date: string
  expected_exit_date?: string
  status: 'active' | 'completed' | 'pending'
  notes?: string
  created_at: string
  // Enhanced quantity tracking fields
  current_quantity?: number
  total_received_quantity?: number
  total_delivered_quantity?: number
  initial_quantity?: number
}

interface StockMovement {
  id: string
  stock_id: string
  movement_type: 'initial' | 'receive' | 'deliver' | 'adjustment'
  quantity: number
  previous_quantity: number
  new_quantity: number
  movement_date: string
  notes?: string
  created_by?: string
  created_at: string
}

export default function Stock() {
  const { user, isLoading: authLoading, logout } = useAuth({ requiredRole: 'ADMIN' })
  const searchParams = useSearchParams()
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([])
  interface Warehouse {
    id: string
    name: string
    location: string
    total_space: number
    has_mezzanine: boolean
    status: string
  }

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'pending'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [showDeliverModal, setShowDeliverModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [editingItem, setEditingItem] = useState<StockItem | null>(null)
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<StockItem | null>(null)
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<StockItem | null>(null)
  const [clientFilter, setClientFilter] = useState<string>('')

  // New stock item form
  const [newStock, setNewStock] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    product_name: '',
    product_type: 'general',
    quantity: 0,
    unit: 'pieces',
    description: '',
    warehouse_id: '',
    storage_location: '',
    space_type: 'Ground Floor' as 'Ground Floor' | 'Mezzanine',
    area_used: 0,
    entry_date: new Date().toISOString().split('T')[0],
    expected_exit_date: '',
    status: 'active' as 'active' | 'completed' | 'pending',
    notes: ''
  })

  // Movement forms
  const [receiveForm, setReceiveForm] = useState({
    quantity: 0,
    notes: '',
    date: new Date().toISOString().split('T')[0]
  })

  const [deliverForm, setDeliverForm] = useState({
    quantity: 0,
    notes: '',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    // Get client filter from URL parameter
    const clientParam = searchParams.get('client')
    if (clientParam) {
      setClientFilter(clientParam)
      setSearchTerm(clientParam) // Also set search term to show the filter
    }
    loadStockData()
    loadWarehouses()
  }, [searchParams])

  const loadWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('status', 'active')
        .order('name')

      if (error) {
        console.error('Error loading warehouses:', error)
        return
      }

      setWarehouses(data || [])
    } catch (err) {
      console.error('Error loading warehouses:', err)
    }
  }

  const loadStockData = async () => {
    try {
      setLoading(true)
      console.log('📊 Loading stock data from client_stock table...')
      
      // ALWAYS use client_stock table to match user side
      let query = supabase
        .from('client_stock')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Add client filter if specified
      if (clientFilter) {
        query = query.eq('client_name', clientFilter)
      }
      
      const { data, error } = await query

      if (error) {
        console.error('Error loading stock data from client_stock:', error)
        if (error.code === 'PGRST205') {
          console.error('❌ client_stock table does not exist - this is a critical database issue!')
          setError('Database configuration error: client_stock table missing. Contact system administrator.')
        } else if (error.message) {
          setError(`Failed to load stock data: ${error.message}`)
        } else {
          setError('Database connection failed. Please check your Supabase configuration.')
        }
        return
      }

      console.log('✅ Loaded stock data:', data?.length || 0, 'items')
      setStockItems(data || [])
      setError(null)

      // Load stock movements
      await loadStockMovements()
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load stock data. Please check your database connection.')
    } finally {
      setLoading(false)
    }
  }

  // Function to check database health and sync data if needed
  const checkDatabaseHealth = async () => {
    try {
      console.log('🔍 Checking database health...')
      
      // Check if client_stock table exists
      const { data: clientStockTest, error: clientStockError } = await supabase
        .from('client_stock')
        .select('count')
        .limit(1)
      
      if (clientStockError) {
        console.error('❌ client_stock table health check failed:', clientStockError)
        return false
      }
      
      // Check if stock_data table exists (for potential migration)
      const { data: stockDataTest, error: stockDataError } = await supabase
        .from('stock_data')
        .select('count')
        .limit(1)
      
      if (!stockDataError) {
        console.log('⚠️ stock_data table exists - consider migrating data to client_stock for consistency')
      }
      
      console.log('✅ Database health check passed - client_stock table is accessible')
      return true
      
    } catch (error) {
      console.error('❌ Database health check failed:', error)
      return false
    }
  }

  const loadStockMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.log('Movement tracking not available:', error.message)
        setStockMovements([])
        return
      }

      setStockMovements(data || [])
    } catch (err) {
      console.log('Movement tracking not available')
      setStockMovements([])
    }
  }

  const addStockItem = async () => {
    try {
      const stockId = crypto.randomUUID()
      const initialQuantity = newStock.quantity

      // Try client_stock table first, then stock_data table
      let { error } = await supabase
        .from('client_stock')
        .insert([{
          ...newStock,
          id: stockId,
          current_quantity: initialQuantity,
          total_received_quantity: initialQuantity,
          total_delivered_quantity: 0,
          initial_quantity: initialQuantity,
          created_at: new Date().toISOString()
        }])
        .select()

      // If client_stock doesn't exist, try stock_data table
      if (error && error.code === 'PGRST205') {
        console.log('Using stock_data table for insert...')
        const stockDataInsert = await supabase
          .from('stock_data')
          .insert([{
             id: stockId,
            client_name: newStock.client_name,
            client_email: newStock.client_email,
            client_phone: newStock.client_phone,
             product_name: newStock.product_name || newStock.description || 'General Item',
            product_type: newStock.product_type,
            product_description: newStock.description,
            quantity: newStock.quantity,
            unit: newStock.unit,
            storage_location: newStock.storage_location,
            space_type: newStock.space_type,
            area_occupied_m2: newStock.area_used,
            entry_date: newStock.entry_date,
            expected_exit_date: newStock.expected_exit_date,
            status: newStock.status,
             notes: newStock.notes,
            created_at: new Date().toISOString()
          }])
          .select()
        
        error = stockDataInsert.error
      }

      // If there's an error with the new columns, try inserting without them
      if (error && (error.message?.includes('current_quantity') || error.message?.includes('total_received_quantity') || error.message?.includes('total_delivered_quantity') || error.message?.includes('initial_quantity'))) {
        console.log('New columns not available, inserting basic data only')
        const basicInsert = await supabase
          .from('client_stock')
          .insert([{
            ...newStock,
            id: stockId,
            created_at: new Date().toISOString()
          }])
          .select()
        error = basicInsert.error
      }

      if (error) {
        console.error('Error adding stock item:', error)
        alert(`Failed to add stock item: ${error.message || 'Unknown error'}`)
        return
      }

      // Update warehouse space if area_used is specified
      if (newStock.area_used > 0 && newStock.warehouse_id) {
        const selectedWarehouse = warehouses.find(w => w.id === newStock.warehouse_id)
        if (selectedWarehouse) {
          let updateData = {}
          
          if (newStock.space_type === 'Mezzanine') {
            // Update mezzanine occupied space
            const newMezzanineOccupied = (selectedWarehouse.mezzanine_occupied || 0) + newStock.area_used
            updateData = { mezzanine_occupied: newMezzanineOccupied }
            console.log('Updating mezzanine occupied space:', newMezzanineOccupied)
          } else {
            // Update ground floor occupied space
            const newOccupiedSpace = (selectedWarehouse.occupied_space || 0) + newStock.area_used
            updateData = { occupied_space: newOccupiedSpace }
            console.log('Updating ground floor occupied space:', newOccupiedSpace)
          }
          
          const { error: updateError } = await supabase
            .from('warehouses')
            .update(updateData)
            .eq('id', selectedWarehouse.id)
          
          if (updateError) {
            console.error('Error updating warehouse space:', updateError)
          }
        }
      }

      // Try to create initial movement record (optional - won't fail if table doesn't exist)
      try {
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            id: `mov-${stockId}-initial`,
            stock_id: stockId,
            movement_type: 'initial',
            quantity: initialQuantity,
            previous_quantity: 0,
            new_quantity: initialQuantity,
            movement_date: newStock.entry_date,
            notes: 'Initial stock entry',
            created_at: new Date().toISOString()
          })

        if (movementError) {
          console.log('Movement tracking not available:', movementError.message)
        }
      } catch (movementErr) {
        console.log('Movement tracking not available')
      }

      // Reset form and close modal
      setNewStock({
        client_name: '',
        client_email: '',
        client_phone: '',
        product_name: '',
        product_type: 'general',
        quantity: 0,
        warehouse_id: '',
        unit: 'pieces',
        description: '',
        storage_location: '',
        space_type: 'Ground Floor',
        area_used: 0,
        entry_date: new Date().toISOString().split('T')[0],
        expected_exit_date: '',
        status: 'active',
        notes: ''
      })
      setShowAddModal(false)
      loadStockData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to add stock item')
    }
  }

  const updateStockStatus = async (id: string, status: 'active' | 'completed' | 'pending') => {
    try {
      // Try client_stock first, then stock_data
      let { error } = await supabase
        .from('client_stock')
        .update({ status })
        .eq('id', id)

      // If client_stock doesn't exist, try stock_data
      if (error && error.code === 'PGRST205') {
        const stockDataUpdate = await supabase
          .from('stock_data')
          .update({ status })
          .eq('id', id)
        error = stockDataUpdate.error
      }

      if (error) {
        console.error('Error updating status:', error)
        alert(`Failed to update status: ${error.message}`)
        return
      }

      loadStockData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to update status')
    }
  }

  const deleteStockItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this stock item?')) return

    try {
      console.log('🗑️ Deleting stock item:', id)
      
      // ALWAYS use client_stock table to match user side
      const { error } = await supabase
        .from('client_stock')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting stock item from client_stock:', error)
        
        // If client_stock doesn't exist, log it but don't try stock_data
        if (error.code === 'PGRST205') {
          console.error('❌ client_stock table does not exist - this is a critical database issue!')
          alert('Database configuration error: client_stock table missing. Contact system administrator.')
          return
        }
        
        alert(`Failed to delete stock item: ${error.message}`)
        return
      }

      console.log('✅ Stock item deleted successfully from client_stock')
      
      // Force immediate data refresh
      await loadStockData()
      
      // Show success message
      alert('Stock item deleted successfully!')
      
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to delete stock item')
    }
  }

  const editStockItem = async (updatedItem: StockItem) => {
    try {
      console.log('✏️ Updating stock item:', updatedItem.id)
      
      // ALWAYS use client_stock table to match user side
      const { error } = await supabase
        .from('client_stock')
        .update({
          client_name: updatedItem.client_name,
          client_email: updatedItem.client_email,
          client_phone: updatedItem.client_phone,
          product_type: updatedItem.product_type,
          quantity: updatedItem.quantity,
          unit: updatedItem.unit,
          description: updatedItem.description,
          storage_location: updatedItem.storage_location,
          space_type: updatedItem.space_type,
          area_used: updatedItem.area_used,
          entry_date: updatedItem.entry_date,
          expected_exit_date: updatedItem.expected_exit_date,
          status: updatedItem.status,
          notes: updatedItem.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedItem.id)

      if (error) {
        console.error('Error updating stock item in client_stock:', error)
        
        // If client_stock doesn't exist, log it but don't try stock_data
        if (error.code === 'PGRST205') {
          console.error('❌ client_stock table does not exist - this is a critical database issue!')
          alert('Database configuration error: client_stock table missing. Contact system administrator.')
          return
        }
        
        alert(`Failed to update stock item: ${error.message}`)
        return
      }

      // Force database consistency by adding a small delay and re-querying
      if (!error) {
        console.log('🔄 Ensuring database consistency...')
        await new Promise(resolve => setTimeout(resolve, 200)) // 200ms delay for DB consistency

        // Verify the update was successful
        const verifyQuery = await supabase
          .from('client_stock')
          .select('quantity, updated_at')
          .eq('id', updatedItem.id)
          .single()

        if (verifyQuery.data) {
          console.log('✅ Database update verified:', {
            id: updatedItem.id,
            quantity: verifyQuery.data.quantity,
            updated_at: verifyQuery.data.updated_at
          })
        }
      }

      if (error) {
        console.error('Error updating stock item:', error)
        alert(`Failed to update stock item: ${error.message}`)
        return
      }

      setEditingItem(null)
      loadStockData()

      // Trigger real-time notification for users
      try {
        // Create a notification record for real-time sync
        await supabase
          .from('user_dashboard_activity')
          .insert({
            user_id: 'system', // System-generated notification
            activity_type: 'stock_admin_update',
            activity_details: {
              stock_id: updatedItem.id,
              client_name: updatedItem.client_name,
              quantity_change: {
                from: 0, // We'll track this differently
                to: updatedItem.quantity
              },
              updated_by: 'admin',
              timestamp: new Date().toISOString()
            }
          })
        console.log('✅ Real-time notification sent for admin update')
      } catch (notificationError) {
        console.warn('⚠️ Could not send real-time notification:', notificationError)
      }

      alert('Stock item updated successfully! Changes will be visible to the user shortly.')
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to update stock item')
    }
  }

  const receiveStock = async () => {
    if (!selectedItemForMovement || receiveForm.quantity <= 0) {
      alert('Please select an item and enter a valid quantity')
      return
    }

    try {
      const currentQuantity = selectedItemForMovement.current_quantity || selectedItemForMovement.quantity
      const totalReceived = selectedItemForMovement.total_received_quantity || 0
      const newCurrentQuantity = currentQuantity + receiveForm.quantity
      const newTotalReceived = totalReceived + receiveForm.quantity

      // Try client_stock first, then stock_data
      let { error } = await supabase
        .from('client_stock')
        .update({
          quantity: newCurrentQuantity,
          current_quantity: newCurrentQuantity,
          total_received_quantity: newTotalReceived,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedItemForMovement.id)

      // If client_stock doesn't exist, try stock_data
      if (error && error.code === 'PGRST205') {
        const stockDataUpdate = await supabase
          .from('stock_data')
          .update({
            quantity: newCurrentQuantity
          })
          .eq('id', selectedItemForMovement.id)
        error = stockDataUpdate.error
      }

      // If there's an error with the new columns, try updating just the basic quantity
      if (error && (error.message?.includes('current_quantity') || error.message?.includes('total_received_quantity'))) {
        console.log('New columns not available, updating basic quantity only')
        const basicUpdate = await supabase
          .from('client_stock')
          .update({
            quantity: newCurrentQuantity
          })
          .eq('id', selectedItemForMovement.id)
        error = basicUpdate.error
      }

      if (error) {
        console.error('Error receiving stock:', error)
        alert(`Failed to receive stock: ${error.message || 'Unknown error'}`)
        return
      }

      // Try to create movement record (optional - won't fail if table doesn't exist)
      try {
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            id: `mov-${selectedItemForMovement.id}-${Date.now()}`,
            stock_id: selectedItemForMovement.id,
            movement_type: 'receive',
            quantity: receiveForm.quantity,
            previous_quantity: currentQuantity,
            new_quantity: newCurrentQuantity,
            movement_date: receiveForm.date,
            notes: receiveForm.notes,
            created_at: new Date().toISOString()
          })

        if (movementError) {
          console.log('Movement tracking not available:', movementError.message)
        }
      } catch (movementErr) {
        console.log('Movement tracking not available')
      }

      setShowReceiveModal(false)
      setSelectedItemForMovement(null)
      setReceiveForm({ quantity: 0, notes: '', date: new Date().toISOString().split('T')[0] })
      loadStockData()
      alert(`Successfully received ${receiveForm.quantity} ${selectedItemForMovement.unit}`)
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to receive stock')
    }
  }

  const deliverStock = async () => {
    if (!selectedItemForMovement || deliverForm.quantity <= 0) {
      alert('Please select an item and enter a valid quantity')
      return
    }

    // Get the current available stock
    const currentQuantity = selectedItemForMovement.current_quantity || selectedItemForMovement.quantity
    if (deliverForm.quantity > currentQuantity) {
      alert('Cannot deliver more than available quantity')
      return
    }

    try {
      const totalReceived = selectedItemForMovement.total_received_quantity || selectedItemForMovement.initial_quantity || selectedItemForMovement.quantity
      const totalDelivered = selectedItemForMovement.total_delivered_quantity || 0
      const newTotalDelivered = totalDelivered + deliverForm.quantity
      const newCurrentQuantity = totalReceived - newTotalDelivered

      // Try client_stock first, then stock_data
      let { error } = await supabase
        .from('client_stock')
        .update({
          current_quantity: newCurrentQuantity,
          total_delivered_quantity: newTotalDelivered,
          status: newCurrentQuantity === 0 ? 'completed' : selectedItemForMovement.status
        })
        .eq('id', selectedItemForMovement.id)

      // If client_stock doesn't exist, try stock_data
      if (error && error.code === 'PGRST205') {
        const stockDataUpdate = await supabase
          .from('stock_data')
          .update({
            quantity: newCurrentQuantity,
            status: newCurrentQuantity === 0 ? 'completed' : selectedItemForMovement.status
          })
          .eq('id', selectedItemForMovement.id)
        error = stockDataUpdate.error
      }

      // If there's an error with the new columns, try updating just the basic quantity
      if (error && (error.message?.includes('current_quantity') || error.message?.includes('total_delivered_quantity'))) {
        console.log('New columns not available, updating basic quantity only')
        const basicUpdate = await supabase
          .from('client_stock')
          .update({
            quantity: newCurrentQuantity,
            status: newCurrentQuantity === 0 ? 'completed' : selectedItemForMovement.status
          })
          .eq('id', selectedItemForMovement.id)
        error = basicUpdate.error
      }

      if (error) {
        console.error('Error delivering stock:', error)
        alert(`Failed to deliver stock: ${error.message || 'Unknown error'}`)
        return
      }

      // Try to create movement record (optional - won't fail if table doesn't exist)
      try {
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            id: `mov-${selectedItemForMovement.id}-${Date.now()}`,
            stock_id: selectedItemForMovement.id,
            movement_type: 'deliver',
            quantity: deliverForm.quantity,
            previous_quantity: currentQuantity,
            new_quantity: newCurrentQuantity,
            movement_date: deliverForm.date,
            notes: deliverForm.notes,
            created_at: new Date().toISOString()
          })

        if (movementError) {
          console.log('Movement tracking not available:', movementError.message)
        }
      } catch (movementErr) {
        console.log('Movement tracking not available')
      }

      setShowDeliverModal(false)
      setSelectedItemForMovement(null)
      setDeliverForm({ quantity: 0, notes: '', date: new Date().toISOString().split('T')[0] })
      loadStockData()
      alert(`Successfully delivered ${deliverForm.quantity} ${selectedItemForMovement.unit}`)
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to deliver stock')
    }
  }

  const downloadClientStockPDF = async (clientItems: StockItem[]) => {
    if (clientItems.length === 0) return
    
    const client = clientItems[0]
    const filename = `stock-report-${client.client_name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
    
    try {
      await generateStockReportPDF(clientItems, {
        filename,
        title: `Stock Report - ${client.client_name}`,
        clientName: client.client_name
      })
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Failed to generate PDF')
    }
  }

  // Group stock items by client
  const groupedStockItems = stockItems.reduce((groups, item) => {
    const key = `${item.client_name}-${item.client_email}-${item.client_phone}`
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {} as Record<string, StockItem[]>)

  // Calculate warehouse capacity metrics
  const totalSpaceUsed = stockItems.reduce((sum, item) => sum + (item.area_used || 0), 0)
  const totalQuantity = stockItems.reduce((sum, item) => sum + (item.quantity || 0), 0)
  const activeItems = stockItems.filter(item => item.status === 'active').length
  const completedItems = stockItems.filter(item => item.status === 'completed').length
  const pendingItems = stockItems.filter(item => item.status === 'pending').length

  // Warehouse capacity (you can adjust these values based on your actual warehouse)
  const groundFloorCapacity = 5000 // m²
  const mezzanineCapacity = 3000 // m²
  const totalCapacity = groundFloorCapacity + mezzanineCapacity
  const spaceAvailable = totalCapacity - totalSpaceUsed
  const spaceUtilization = (totalSpaceUsed / totalCapacity) * 100

  const downloadStockReport = async () => {
    try {
      await generateStockReportPDF(filteredItems, {
        filename: `stock-report-${new Date().toISOString().split('T')[0]}.pdf`,
        title: 'Sitra Warehouse Stock Report'
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF report')
    }
  }

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.product_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus
    
    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getItemMovements = (stockId: string) => {
    return stockMovements.filter(movement => movement.stock_id === stockId)
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case 'initial': return 'bg-blue-100 text-blue-800'
      case 'receive': return 'bg-green-100 text-green-800'
      case 'deliver': return 'bg-red-100 text-red-800'
      case 'adjustment': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Checking authentication...</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading stock data...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
         <div className="container mx-auto px-4 py-4 md:py-6">
           <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
            <div>
               <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Stock</h1>
               <p className="text-gray-600 mt-1 text-sm md:text-base">Manage client inventory and storage</p>
               {clientFilter && (
                 <div className="mt-2 flex items-center space-x-2">
                   <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                     <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                     </svg>
                     Filtered by: {clientFilter}
                   </span>
                   <button
                     onClick={() => {
                       setClientFilter('')
                       setSearchTerm('')
                       window.history.pushState({}, '', '/stock')
                       loadStockData()
                     }}
                     className="text-blue-600 hover:text-blue-800 text-xs underline"
                   >
                     Clear Filter
                   </button>
            </div>
               )}
            </div>
             
             {/* Mobile Action Buttons */}
             <div className="flex flex-wrap gap-2 md:hidden">
               <button
                 onClick={() => setShowAddModal(true)}
                 className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm"
               >
                 <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                 </svg>
                 Add
               </button>
               <button
                 onClick={() => setShowReceiveModal(true)}
                 className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
               >
                 <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                 </svg>
                 Receive
               </button>
               <button
                 onClick={() => setShowDeliverModal(true)}
                 className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors text-sm"
               >
                 <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                 </svg>
                 Deliver
               </button>
             </div>
             
             {/* Desktop Action Buttons */}
             <div className="hidden md:flex space-x-3">
               <button
                 onClick={downloadStockReport}
                 className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
               >
                 <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                 </svg>
                 Download Report
               </button>
               <button
                 onClick={() => setShowAddModal(true)}
                 className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
               >
                 <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                 </svg>
                 Add Stock
               </button>
               <button
                 onClick={() => setShowReceiveModal(true)}
                 className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
               >
                 <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                 </svg>
                 Receive
               </button>
               <button
                 onClick={() => setShowDeliverModal(true)}
                 className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
               >
                 <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                 </svg>
                 Deliver
               </button>
               <Link
                 href="/"
                 className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
               >
                 <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                 </svg>
                 Back to Calculator
               </Link>
             </div>
          </div>
        </div>
      </div>

             <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Filters and Search */}
         <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 mb-6 md:mb-8">
           <div className="flex flex-col gap-3 md:flex-row md:gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by client name, product type, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'completed' | 'pending')}
                 className="w-full md:w-auto px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>



        {/* Stock Items */}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <svg className="w-6 h-6 text-red-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-red-800 mb-2">Database Setup Required</h3>
                <p className="text-red-700 mb-4">{error}</p>
                
                <div className="bg-white border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-red-800 mb-2">🔧 Quick Fix:</h4>
                  <p className="text-sm text-red-700 mb-3">
                    The stock management table doesn&apos;t exist yet. You need to create it first.
                  </p>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-red-800">Option 1: Use Supabase Dashboard</p>
                    <ol className="text-sm text-red-700 ml-4 space-y-1">
                      <li>1. Go to your Supabase project dashboard</li>
                      <li>2. Navigate to SQL Editor</li>
                      <li>3. Run this SQL command:</li>
                    </ol>
                    
                    <div className="bg-gray-100 border border-gray-300 rounded p-3 mt-2">
                      <code className="text-xs text-gray-800 block whitespace-pre-wrap">{`CREATE TABLE client_stock (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  product_type TEXT NOT NULL DEFAULT 'general',
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pieces',
  description TEXT,
  storage_location TEXT,
  space_type TEXT NOT NULL DEFAULT 'Ground Floor',
  area_used REAL NOT NULL DEFAULT 0,
  entry_date TEXT NOT NULL,
  expected_exit_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`}</code>
                    </div>
                    
                    <p className="text-sm font-medium text-red-800 mt-3">Option 2: Check Connection</p>
                    <p className="text-sm text-red-700">
                      Verify your .env.local file has correct Supabase credentials and your project is active.
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button 
                    onClick={loadStockData}
                    className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded font-medium transition-colors"
                  >
                    🔄 Retry Connection
                  </button>
                  <Link
                    href="/"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded font-medium transition-colors"
                  >
                    ← Back to Calculator
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
                     <div className="space-y-4 md:space-y-6">
            {Object.keys(groupedStockItems).length === 0 ? (
               <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-12 text-center">
                 <svg className="w-8 h-8 md:w-12 md:h-12 text-gray-400 mx-auto mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                 <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No stock items found</h3>
                 <p className="text-gray-600 mb-4 text-sm md:text-base">Get started by adding your first stock item.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                   className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
                >
                  Add Stock Item
                </button>
              </div>
            ) : (
              Object.entries(groupedStockItems).map(([clientKey, clientItems]) => {
                const client = clientItems[0]
                const filteredClientItems = clientItems.filter(item => {
                  const matchesSearch = item.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       item.product_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       item.description.toLowerCase().includes(searchTerm.toLowerCase())
                  
                  const matchesFilter = filterStatus === 'all' || item.status === filterStatus
                  
                  return matchesSearch && matchesFilter
                })

                if (filteredClientItems.length === 0) return null

                return (
                  <div key={clientKey} className="bg-white rounded-lg shadow-sm border border-gray-200">
                                         {/* Client Header */}
                     <div className="bg-gray-50 px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
                       <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0">
                         <div>
                           <h3 className="text-base md:text-lg font-semibold text-gray-900">{client.client_name}</h3>
                           <p className="text-gray-600 text-sm md:text-base">{client.client_email} • {client.client_phone}</p>
                         </div>
                         <div className="flex items-center space-x-2">
                           <button
                             onClick={() => downloadClientStockPDF(clientItems)}
                             className="inline-flex items-center px-2 md:px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs md:text-sm font-medium transition-colors"
                             title="Download PDF Report"
                           >
                             <svg className="w-3 h-3 md:w-4 md:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                             </svg>
                             PDF
                           </button>
                         </div>
                       </div>
                     </div>

                                           {/* Client Quantity Summary */}
                      {(() => {
                        const clientCurrentQuantity = filteredClientItems
                          .filter(item => item.status === 'active')
                           .reduce((sum, item) => sum + (item.current_quantity || item.quantity || 0), 0)
                         
                         
                        
                        const clientCompletedQuantity = filteredClientItems
                          .filter(item => item.status === 'completed')
                            .reduce((sum, item) => sum + (item.current_quantity || item.quantity || 0), 0)
                          
                          const clientTotalDelivered = filteredClientItems
                            .reduce((sum, item) => sum + (item.total_delivered_quantity || 0), 0)
                          
                          const clientTotalReceived = filteredClientItems
                            .reduce((sum, item) => sum + (item.total_received_quantity || item.initial_quantity || item.quantity || 0), 0)
                         
                       
                       return (
                                                       <div className="bg-green-50 px-4 md:px-6 py-3 border-b border-green-200">
                              <div className="grid grid-cols-3 gap-2 md:gap-4 text-xs md:text-sm">
                             <div className="text-center">
                                  <div className="text-base md:text-lg font-bold text-green-600">{clientCurrentQuantity.toLocaleString()}</div>
                               <div className="text-xs text-gray-600">Current Stock</div>
                             </div>
                             <div className="text-center">
                                  <div className="text-base md:text-lg font-bold text-blue-600">{clientTotalReceived.toLocaleString()}</div>
                               <div className="text-xs text-gray-600">Total Received</div>
                             </div>
                             <div className="text-center">
                                  <div className="text-base md:text-lg font-bold text-red-600">{clientTotalDelivered.toLocaleString()}</div>
                                  <div className="text-xs text-gray-600">Total Delivered</div>
                             </div>
                           </div>
                           <div className="mt-2 text-xs text-gray-500 text-center">
                             {filteredClientItems.filter(item => item.status === 'active').length} active items • 
                             {filteredClientItems.filter(item => item.status === 'completed').length} completed • 
                             {filteredClientItems.filter(item => item.status === 'pending').length} pending
                           </div>
                         </div>
                       )
                     })()}

                    {/* Stock Items List */}
                    <div className="divide-y divide-gray-200">
                      {filteredClientItems.map((item) => (
                         <div key={item.id} className="px-4 md:px-6 py-3 md:py-4">
                           <div className="flex flex-col md:flex-row md:justify-between md:items-start space-y-3 md:space-y-0">
                            <div className="flex-1">
                               <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                </span>
                                 <span className="text-sm font-medium text-gray-900">{item.product_name || item.product_type}</span>
                                 <span className="text-sm text-gray-600">{item.current_quantity || item.quantity} {item.unit}</span>
                              </div>
                               
                                                                                               {/* Enhanced Quantity Tracking Display */}
                                 <div className="grid grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm mb-3">
                                 <div>
                                     <span className="font-medium text-gray-700">Current:</span>
                                     <p className="text-gray-600 font-semibold">{(item.current_quantity || item.quantity).toLocaleString()} {item.unit}</p>
                                 </div>
                                   <div>
                                     <span className="font-medium text-gray-700">Received:</span>
                                                                           <p className="text-blue-600 font-semibold">{(item.total_received_quantity || item.initial_quantity || item.quantity).toLocaleString()} {item.unit}</p>
                                   </div>
                                   <div>
                                     <span className="font-medium text-gray-700">Delivered:</span>
                                     <p className="text-red-600 font-semibold">{(item.total_delivered_quantity || 0).toLocaleString()} {item.unit}</p>
                                   </div>
                                   <div>
                                     <span className="font-medium text-gray-700">Initial:</span>
                                     <p className="text-gray-600">{(item.initial_quantity || item.quantity).toLocaleString()} {item.unit}</p>
                                   </div>
                                 </div>
                               
                               <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
                                 <div>
                                   <span className="font-medium text-gray-700">Location:</span>
                                   <p className="text-gray-600">{item.space_type}</p>
                                 </div>
                                 <div>
                                   <span className="font-medium text-gray-700">Storage:</span>
                                   <p className="text-gray-600">{item.storage_location || 'Not specified'}</p>
                                 </div>
                                 <div>
                                   <span className="font-medium text-gray-700">Space:</span>
                                   <p className="text-gray-600">{item.area_used} m²</p>
                                 </div>
                                 <div>
                                   <button
                                     onClick={() => {
                                       setSelectedItemForHistory(item)
                                       setShowHistoryModal(true)
                                     }}
                                     className="text-blue-600 hover:text-blue-800 text-xs md:text-sm font-medium"
                                   >
                                     View History →
                                   </button>
                                 </div>
                               </div>
                              {item.description && (
                                <div className="mt-2">
                                   <span className="font-medium text-gray-700 text-xs md:text-sm">Description:</span>
                                   <p className="text-gray-600 text-xs md:text-sm">{item.description}</p>
                                </div>
                              )}
                            </div>
                             <div className="flex items-center space-x-1 md:ml-4">
                              <button
                                onClick={() => setEditingItem(item)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteStockItem(item.id)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
           <div className="bg-white rounded-lg w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
             <div className="p-4 md:p-6 border-b border-gray-200">
               <h2 className="text-lg md:text-xl font-semibold text-gray-900">Add New Stock Item</h2>
            </div>
            
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input
                    type="text"
                    value={newStock.client_name}
                    onChange={(e) => setNewStock({...newStock, client_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
                  <input
                    type="email"
                    value={newStock.client_email}
                    onChange={(e) => setNewStock({...newStock, client_email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newStock.client_phone}
                    onChange={(e) => setNewStock({...newStock, client_phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                  <select
                    value={newStock.product_type}
                    onChange={(e) => setNewStock({...newStock, product_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="food">Food Items</option>
                    <option value="metals">Metals</option>
                    <option value="cargo">Cargo/Freight</option>
                    <option value="electronics">Electronics</option>
                    <option value="textiles">Textiles</option>
                    <option value="general">General Goods</option>
                  </select>
                </div>
              </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                   <input
                     type="text"
                     value={newStock.product_name}
                     onChange={(e) => setNewStock({...newStock, product_name: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     required
                     placeholder="Enter product name"
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
                     required
                     placeholder="Enter quantity"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                   <select
                     value={newStock.unit}
                     onChange={(e) => setNewStock({...newStock, unit: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     required
                   >
                     <option value="pieces">Pieces</option>
                     <option value="boxes">Boxes</option>
                     <option value="pallets">Pallets</option>
                     <option value="kg">Kilograms</option>
                     <option value="tons">Tons</option>
                     <option value="m3">Cubic Meters</option>
                   </select>
                 </div>
               </div>

               <div className="grid md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse *</label>
                   <select
                     value={newStock.warehouse_id}
                     onChange={(e) => setNewStock({...newStock, warehouse_id: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     required
                   >
                     <option value="">Select a warehouse</option>
                     {warehouses.map((warehouse) => (
                       <option key={warehouse.id} value={warehouse.id}>
                         {warehouse.name} - {warehouse.location}
                       </option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Area Used (m²)</label>
                   <input
                     type="number"
                     value={newStock.area_used || ''}
                     onChange={(e) => setNewStock({...newStock, area_used: Number(e.target.value)})}
                     className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                       newStock.area_used > 0 && newStock.warehouse_id && (() => {
                         const selectedWarehouse = warehouses.find(w => w.id === newStock.warehouse_id)
                         if (!selectedWarehouse) return 'border-gray-300'
                         
                         const availableSpace = newStock.space_type === 'Mezzanine' 
                           ? selectedWarehouse.mezzanine_free 
                           : selectedWarehouse.free_space
                         
                         return newStock.area_used > availableSpace 
                           ? 'border-red-300 bg-red-50' 
                           : 'border-gray-300'
                       })()
                     }`}
                     min="0"
                     step="0.1"
                     placeholder="Optional"
                   />
                   {newStock.area_used > 0 && newStock.warehouse_id && (() => {
                     const selectedWarehouse = warehouses.find(w => w.id === newStock.warehouse_id)
                     if (!selectedWarehouse) return null
                     
                     const availableSpace = newStock.space_type === 'Mezzanine' 
                       ? selectedWarehouse.mezzanine_free 
                       : selectedWarehouse.free_space
                     
                     if (newStock.area_used > availableSpace) {
                       return (
                         <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded">
                           <div className="flex items-center">
                             <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                             </svg>
                             <div className="text-xs text-red-700">
                               Warning: Requested space ({newStock.area_used} m²) exceeds available {newStock.space_type === 'Mezzanine' ? 'mezzanine' : 'ground floor'} space ({availableSpace} m²)
                 </div>
                           </div>
                         </div>
                       )
                     }
                     return null
                   })()}
                 </div>
               </div>

               {/* Warehouse Space Information */}
               {newStock.warehouse_id && (() => {
                 const selectedWarehouse = warehouses.find(w => w.id === newStock.warehouse_id)
                 if (!selectedWarehouse) return null
                 
                 return (
                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                     <h3 className="text-sm font-medium text-blue-900 mb-3">Warehouse Space Information</h3>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                 <div>
                         <div className="text-lg font-bold text-blue-600">{selectedWarehouse.total_space.toLocaleString()}</div>
                         <div className="text-xs text-blue-700">Total Space (m²)</div>
                       </div>
                       <div>
                         <div className="text-lg font-bold text-orange-600">{selectedWarehouse.occupied_space.toLocaleString()}</div>
                         <div className="text-xs text-orange-700">Occupied Space (m²)</div>
                       </div>
                       <div>
                         <div className="text-lg font-bold text-green-600">{selectedWarehouse.free_space.toLocaleString()}</div>
                         <div className="text-xs text-green-700">Available Space (m²)</div>
                       </div>
                       <div>
                         <div className="text-lg font-bold text-purple-600">{((selectedWarehouse.occupied_space / selectedWarehouse.total_space) * 100).toFixed(1)}%</div>
                         <div className="text-xs text-purple-700">Utilization</div>
                 </div>
               </div>

                     {selectedWarehouse.has_mezzanine && (
                       <div className="mt-4 pt-4 border-t border-blue-200">
                         <h4 className="text-sm font-medium text-blue-800 mb-2">Mezzanine Floor</h4>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                             <div className="text-lg font-bold text-green-600">{selectedWarehouse.mezzanine_space.toLocaleString()}</div>
                             <div className="text-xs text-green-700">Mezzanine Space (m²)</div>
              </div>
                           <div>
                             <div className="text-lg font-bold text-orange-600">{selectedWarehouse.mezzanine_occupied.toLocaleString()}</div>
                             <div className="text-xs text-orange-700">Mezzanine Occupied (m²)</div>
                           </div>
                           <div>
                             <div className="text-lg font-bold text-green-600">{selectedWarehouse.mezzanine_free.toLocaleString()}</div>
                             <div className="text-xs text-green-700">Mezzanine Available (m²)</div>
                           </div>
                           <div>
                             <div className="text-lg font-bold text-purple-600">
                               {selectedWarehouse.mezzanine_space > 0 ? ((selectedWarehouse.mezzanine_occupied / selectedWarehouse.mezzanine_space) * 100).toFixed(1) : '0'}%
                             </div>
                             <div className="text-xs text-purple-700">Mezzanine Utilization</div>
                           </div>
                         </div>
                       </div>
                     )}
                     
                     {newStock.area_used > 0 && (
                       <div className="mt-3 p-2 bg-white rounded border">
                         <div className="text-sm text-gray-700">
                           <span className="font-medium">After adding this stock:</span>
                           <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                             <div>
                               <span className="text-gray-600">New Occupied:</span>
                               <span className="font-medium text-orange-600 ml-1">
                                 {newStock.space_type === 'Mezzanine' 
                                   ? (selectedWarehouse.mezzanine_occupied + newStock.area_used).toLocaleString()
                                   : (selectedWarehouse.occupied_space + newStock.area_used).toLocaleString()
                                 } m²
                               </span>
                             </div>
                             <div>
                               <span className="text-gray-600">Remaining:</span>
                               <span className={`font-medium ml-1 ${
                                 (newStock.space_type === 'Mezzanine' 
                                   ? selectedWarehouse.mezzanine_free 
                                   : selectedWarehouse.free_space) - newStock.area_used >= 0 
                                   ? 'text-green-600' 
                                   : 'text-red-600'
                               }`}>
                                 {(newStock.space_type === 'Mezzanine' 
                                   ? selectedWarehouse.mezzanine_free 
                                   : selectedWarehouse.free_space) - newStock.area_used} m²
                               </span>
                             </div>
                           </div>
                         </div>
                         {(newStock.space_type === 'Mezzanine' 
                           ? selectedWarehouse.mezzanine_free 
                           : selectedWarehouse.free_space) - newStock.area_used < 0 && (
                           <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                             <div className="text-xs text-red-700">
                               ⚠️ Warning: Requested space ({newStock.area_used} m²) exceeds available {newStock.space_type === 'Mezzanine' ? 'mezzanine' : 'ground floor'} space ({(newStock.space_type === 'Mezzanine' ? selectedWarehouse.mezzanine_free : selectedWarehouse.free_space)} m²)
                             </div>
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                 )
               })()}

              

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Space Type</label>
                  <select
                    value={newStock.space_type}
                    onChange={(e) => setNewStock({...newStock, space_type: e.target.value as 'Ground Floor' | 'Mezzanine'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="Mezzanine">Mezzanine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={newStock.storage_location}
                    onChange={(e) => setNewStock({...newStock, storage_location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Section A-1, Rack 5"
                  />
                </div>
              </div>

                             <div className="grid md:grid-cols-2 gap-4">
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
                   <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                   <select
                     value={newStock.status}
                     onChange={(e) => setNewStock({...newStock, status: e.target.value as 'active' | 'completed' | 'pending'})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   >
                     <option value="active">Active</option>
                     <option value="completed">Completed</option>
                     <option value="pending">Pending</option>
                   </select>
                 </div>
               </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newStock.notes}
                  onChange={(e) => setNewStock({...newStock, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Additional notes or special instructions"
                />
              </div>
            </div>

            <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={addStockItem}
                disabled={
                  !newStock.client_name || 
                  !newStock.warehouse_id ||
                  (newStock.area_used > 0 && (() => {
                    const selectedWarehouse = warehouses.find(w => w.id === newStock.warehouse_id)
                    if (!selectedWarehouse) return true
                    
                    const availableSpace = newStock.space_type === 'Mezzanine' 
                      ? selectedWarehouse.mezzanine_free 
                      : selectedWarehouse.free_space
                    
                    return newStock.area_used > availableSpace
                  })())
                }
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
              >
                Add Stock Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Stock Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-lg md:text-xl font-semibold text-gray-900">Edit Stock Item</h2>
            </div>
            
            <div className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input
                    type="text"
                    value={editingItem.client_name}
                    onChange={(e) => setEditingItem({...editingItem, client_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
                  <input
                    type="email"
                    value={editingItem.client_email}
                    onChange={(e) => setEditingItem({...editingItem, client_email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Phone</label>
                  <input
                    type="tel"
                    value={editingItem.client_phone}
                    onChange={(e) => setEditingItem({...editingItem, client_phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                  <input
                    type="text"
                    value={editingItem.product_type}
                    onChange={(e) => setEditingItem({...editingItem, product_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

                             <div className="grid md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                   <input
                     type="number"
                     value={editingItem.quantity}
                     onChange={(e) => setEditingItem({...editingItem, quantity: Number(e.target.value)})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     min="0"
                     required
                     placeholder="Enter quantity"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                   <select
                     value={editingItem.unit}
                     onChange={(e) => setEditingItem({...editingItem, unit: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     required
                   >
                     <option value="pieces">Pieces</option>
                     <option value="boxes">Boxes</option>
                     <option value="pallets">Pallets</option>
                     <option value="kg">Kilograms</option>
                     <option value="tons">Tons</option>
                     <option value="m3">Cubic Meters</option>
                   </select>
                 </div>
               </div>

               <div className="grid md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Area Used (m²)</label>
                   <input
                     type="number"
                     value={editingItem.area_used || ''}
                     onChange={(e) => setEditingItem({...editingItem, area_used: Number(e.target.value)})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     min="0"
                     step="0.1"
                     placeholder="Optional"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                   <select
                     value={editingItem.status}
                     onChange={(e) => setEditingItem({...editingItem, status: e.target.value as 'active' | 'completed' | 'pending'})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     required
                   >
                     <option value="active">Active (In Stock)</option>
                     <option value="completed">Completed (Out)</option>
                     <option value="pending">Pending</option>
                   </select>
                 </div>
               </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Space Type</label>
                  <select
                    value={editingItem.space_type}
                    onChange={(e) => setEditingItem({...editingItem, space_type: e.target.value as 'Ground Floor' | 'Mezzanine'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="Mezzanine">Mezzanine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={editingItem.storage_location}
                    onChange={(e) => setEditingItem({...editingItem, storage_location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Section A-1, Rack 5"
                  />
                </div>
              </div>

                             <div className="grid md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Entry Date</label>
                   <input
                     type="date"
                     value={editingItem.entry_date}
                     onChange={(e) => setEditingItem({...editingItem, entry_date: e.target.value})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                   <select
                     value={editingItem.status}
                     onChange={(e) => setEditingItem({...editingItem, status: e.target.value as 'active' | 'completed' | 'pending'})}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   >
                     <option value="active">Active</option>
                     <option value="completed">Completed</option>
                     <option value="pending">Pending</option>
                   </select>
                 </div>
               </div>

                             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                 <textarea
                   value={editingItem.notes || ''}
                   onChange={(e) => setEditingItem({...editingItem, notes: e.target.value})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   rows={2}
                   placeholder="Additional notes or special instructions"
                 />
               </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => editStockItem(editingItem)}
                disabled={!editingItem.client_name}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                Update Stock Item
              </button>
            </div>
          </div>
                 </div>
       )}

       {/* Receive Stock Modal */}
       {showReceiveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
                             <div className="p-4 md:p-6 border-b border-gray-200">
                 <h2 className="text-lg md:text-xl font-semibold text-gray-900">Receive Stock</h2>
             </div>
             
               <div className="p-4 md:p-6 space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Select Stock Item</label>
                 <select
                   onChange={(e) => {
                     const selected = stockItems.find(item => item.id === e.target.value)
                     setSelectedItemForMovement(selected || null)
                   }}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   required
                 >
                   <option value="">Select an item...</option>
                   {stockItems.map((item) => (
                     <option key={item.id} value={item.id}>
                       {item.client_name} - {item.product_type} ({item.quantity} {item.unit})
                     </option>
                   ))}
                 </select>
               </div>

               {selectedItemForMovement && (
                 <div className="bg-blue-50 p-3 rounded-lg">
                   <p className="text-sm text-blue-800">
                     <strong>Current Stock:</strong> {selectedItemForMovement.quantity} {selectedItemForMovement.unit}
                   </p>
                 </div>
               )}

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Receive *</label>
                 <input
                   type="number"
                   value={receiveForm.quantity || ''}
                   onChange={(e) => setReceiveForm({...receiveForm, quantity: Number(e.target.value)})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   min="1"
                   required
                   placeholder="Enter quantity"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                 <input
                   type="date"
                   value={receiveForm.date}
                   onChange={(e) => setReceiveForm({...receiveForm, date: e.target.value})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                 <textarea
                   value={receiveForm.notes}
                   onChange={(e) => setReceiveForm({...receiveForm, notes: e.target.value})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   rows={2}
                   placeholder="Optional notes about this receipt"
                 />
               </div>
             </div>

                           <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
               <button
                 onClick={() => {
                   setShowReceiveModal(false)
                   setSelectedItemForMovement(null)
                   setReceiveForm({ quantity: 0, notes: '', date: new Date().toISOString().split('T')[0] })
                 }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm md:text-base"
               >
                 Cancel
               </button>
               <button
                 onClick={receiveStock}
                 disabled={!selectedItemForMovement || receiveForm.quantity <= 0}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
               >
                 Receive Stock
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Deliver Stock Modal */}
       {showDeliverModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Deliver Stock</h2>
             </div>
             
              <div className="p-4 md:p-6 space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Select Stock Item</label>
                 <select
                   onChange={(e) => {
                     const selected = stockItems.find(item => item.id === e.target.value)
                     setSelectedItemForMovement(selected || null)
                   }}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   required
                 >
                   <option value="">Select an item...</option>
                   {stockItems.map((item) => (
                     <option key={item.id} value={item.id}>
                       {item.client_name} - {item.product_type} ({item.quantity} {item.unit})
                     </option>
                   ))}
                 </select>
               </div>

               {selectedItemForMovement && (
                 <div className="bg-orange-50 p-3 rounded-lg">
                   <p className="text-sm text-orange-800">
                     <strong>Available Stock:</strong> {selectedItemForMovement.quantity} {selectedItemForMovement.unit}
                   </p>
                 </div>
               )}

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Quantity to Deliver *</label>
                 <input
                   type="number"
                   value={deliverForm.quantity || ''}
                   onChange={(e) => setDeliverForm({...deliverForm, quantity: Number(e.target.value)})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   min="1"
                   max={selectedItemForMovement?.quantity || 0}
                   required
                   placeholder="Enter quantity"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                 <input
                   type="date"
                   value={deliverForm.date}
                   onChange={(e) => setDeliverForm({...deliverForm, date: e.target.value})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                 <textarea
                   value={deliverForm.notes}
                   onChange={(e) => setDeliverForm({...deliverForm, notes: e.target.value})}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   rows={2}
                   placeholder="Optional notes about this delivery"
                 />
               </div>
             </div>

                           <div className="p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
               <button
                 onClick={() => {
                   setShowDeliverModal(false)
                   setSelectedItemForMovement(null)
                   setDeliverForm({ quantity: 0, notes: '', date: new Date().toISOString().split('T')[0] })
                 }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors text-sm md:text-base"
               >
                 Cancel
               </button>
               <button
                 onClick={deliverStock}
                 disabled={!selectedItemForMovement || deliverForm.quantity <= 0 || deliverForm.quantity > (selectedItemForMovement?.quantity || 0)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
               >
                 Deliver Stock
               </button>
             </div>
           </div>
         </div>
       )}

               {/* Stock Movement History Modal */}
        {showHistoryModal && selectedItemForHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">Stock Movement History</h2>
                <p className="text-gray-600 mt-1 text-sm md:text-base">
                  {selectedItemForHistory.client_name} - {selectedItemForHistory.product_type}
                </p>
              </div>
              
              <div className="p-4 md:p-6">
                               {/* Current Status Summary */}
                <div className="bg-gray-50 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
                  <h3 className="font-medium text-gray-900 mb-2 md:mb-3 text-sm md:text-base">Current Status</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
                   <div>
                     <span className="font-medium text-gray-700">Current Quantity:</span>
                     <p className="text-lg font-bold text-gray-900">
                       {(selectedItemForHistory.current_quantity || selectedItemForHistory.quantity).toLocaleString()} {selectedItemForHistory.unit}
                     </p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-700">Total Received:</span>
                     <p className="text-lg font-bold text-blue-600">
                                               {(selectedItemForHistory.total_received_quantity || selectedItemForHistory.initial_quantity || selectedItemForHistory.quantity).toLocaleString()} {selectedItemForHistory.unit}
                     </p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-700">Total Delivered:</span>
                     <p className="text-lg font-bold text-red-600">
                       {(selectedItemForHistory.total_delivered_quantity || 0).toLocaleString()} {selectedItemForHistory.unit}
                     </p>
                   </div>
                   <div>
                     <span className="font-medium text-gray-700">Initial Quantity:</span>
                     <p className="text-lg font-bold text-gray-600">
                       {(selectedItemForHistory.initial_quantity || selectedItemForHistory.quantity).toLocaleString()} {selectedItemForHistory.unit}
                     </p>
                   </div>
                 </div>
               </div>

                               {/* Movement History */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-2 md:mb-3 text-sm md:text-base">Movement History</h3>
                 {(() => {
                   const movements = getItemMovements(selectedItemForHistory.id)
                   if (movements.length === 0) {
                     return (
                       <div className="text-center py-8 text-gray-500">
                         <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                         </svg>
                         <p>No movement history available</p>
                       </div>
                     )
                   }

                   return (
                     <div className="space-y-3">
                       {movements.sort((a, b) => new Date(b.movement_date).getTime() - new Date(a.movement_date).getTime()).map((movement) => (
                         <div key={movement.id} className="border border-gray-200 rounded-lg p-4">
                           <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center space-x-2">
                               <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMovementTypeColor(movement.movement_type)}`}>
                                 {movement.movement_type.charAt(0).toUpperCase() + movement.movement_type.slice(1)}
                               </span>
                               <span className="text-sm font-medium text-gray-900">
                                 {movement.quantity.toLocaleString()} {selectedItemForHistory.unit}
                               </span>
                             </div>
                             <span className="text-sm text-gray-500">
                               {new Date(movement.movement_date).toLocaleDateString()}
                             </span>
                           </div>
                           
                           <div className="grid grid-cols-3 gap-4 text-sm mb-2">
                             <div>
                               <span className="font-medium text-gray-700">Previous:</span>
                               <p className="text-gray-600">{movement.previous_quantity.toLocaleString()} {selectedItemForHistory.unit}</p>
                             </div>
                             <div>
                               <span className="font-medium text-gray-700">Movement:</span>
                               <p className={`font-semibold ${
                                 movement.movement_type === 'receive' ? 'text-green-600' : 
                                 movement.movement_type === 'deliver' ? 'text-red-600' : 'text-blue-600'
                               }`}>
                                 {movement.movement_type === 'deliver' ? '-' : '+'}{movement.quantity.toLocaleString()} {selectedItemForHistory.unit}
                               </p>
                             </div>
                             <div>
                               <span className="font-medium text-gray-700">New Total:</span>
                               <p className="text-gray-900 font-semibold">{movement.new_quantity.toLocaleString()} {selectedItemForHistory.unit}</p>
                             </div>
                           </div>
                           
                           {movement.notes && (
                             <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                               <span className="font-medium">Notes:</span> {movement.notes}
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   )
                 })()}
               </div>
             </div>

                           <div className="p-4 md:p-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => {
                    setShowHistoryModal(false)
                    setSelectedItemForHistory(null)
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
                >
                  Close
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   )
 }
