'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

interface StockItem {
  id: string
  client_name: string
  client_email: string
  product_name?: string
  product_type: string
  quantity: number
  unit: string
  description: string
  storage_location?: string
  space_type: 'Ground Floor' | 'Mezzanine'
  area_used: number
  entry_date: string
  expected_exit_date?: string
  actual_exit_date?: string
  status: 'active' | 'completed' | 'pending' | 'expired' | 'damaged'
  notes?: string
  created_at: string
  current_quantity?: number
  total_received_quantity?: number
  total_delivered_quantity?: number
  initial_quantity?: number
  remaining_quantity?: number
}

interface Occupant {
  id: string
  name: string
  contact_info: string
  space_occupied: number
  floor_type: string
  section?: string
  status: string
  warehouse_id: string
}

interface Warehouse {
  id: string
  name: string
  location: string
}

type SortField = 'id' | 'description' | 'quantity' | 'entry_date' | 'status' | 'current_quantity' | 'total_delivered_quantity'
type SortDirection = 'asc' | 'desc'

export default function OccupantStockDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading: authLoading, logout } = useAuth({ requiredRole: 'ADMIN' })
  
  const [occupant, setOccupant] = useState<Occupant | null>(null)
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null)
  const [stockData, setStockData] = useState<StockItem[]>([])
  const [filteredStockData, setFilteredStockData] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField>('entry_date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  
  // Filtering state
  const [filters, setFilters] = useState({
    search: '',
    productType: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  })

  // Delivery modal state
  const [deliveryModal, setDeliveryModal] = useState<{
    isOpen: boolean
    stockItem: StockItem | null
    deliveryQuantity: string
  }>({
    isOpen: false,
    stockItem: null,
    deliveryQuantity: ''
  })

  const warehouseId = params.id as string
  const occupantId = params.occupantId as string
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (warehouseId && occupantId) {
      loadOccupantStock()
    }
  }, [warehouseId, occupantId])

  useEffect(() => {
    applyFiltersAndSort()
  }, [stockData, filters, sortField, sortDirection])

  const loadOccupantStock = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load warehouse details
      const warehouseResponse = await fetch(`/api/warehouses/${warehouseId}`)
      const warehouseResult = await warehouseResponse.json()
      if (warehouseResponse.ok) {
        setWarehouse(warehouseResult.data)
      }

      // Load occupant details
      const occupantResponse = await fetch(`/api/warehouses/${warehouseId}/occupants`)
      const occupantResult = await occupantResponse.json()
      if (occupantResponse.ok) {
        const foundOccupant = occupantResult.data.find((occ: any) => occ.id === occupantId)
        if (foundOccupant) {
          setOccupant(foundOccupant)
        }
      }

      // Load stock data for this occupant
      console.log('🔍 Fetching stock data for:', { warehouseId, occupantId })
      const stockResponse = await fetch(`/api/warehouses/${warehouseId}/stock?occupantId=${occupantId}`)
      const stockResult = await stockResponse.json()
      
      console.log('📊 Stock API response:', { status: stockResponse.status, ok: stockResponse.ok, data: stockResult })
      
      if (!stockResponse.ok) {
        console.error('❌ Stock API error:', stockResult)
        throw new Error(stockResult.error || 'Failed to fetch stock data')
      }

      setStockData(stockResult.data || [])
    } catch (err) {
      console.error('Error loading occupant stock:', err)
      setError(err instanceof Error ? err.message : 'Failed to load stock data')
    } finally {
      setLoading(false)
    }
  }

  const applyFiltersAndSort = () => {
    let filtered = [...stockData]

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(item => 
        (item.product_name && item.product_name.toLowerCase().includes(searchLower)) ||
        (item.description && item.description.toLowerCase().includes(searchLower)) ||
        item.id.toLowerCase().includes(searchLower)
      )
    }


    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(item => item.status === filters.status)
    }

    // Apply date filters (for received date)
    if (filters.dateFrom) {
      filtered = filtered.filter(item => item.entry_date >= filters.dateFrom)
    }
    if (filters.dateTo) {
      filtered = filtered.filter(item => item.entry_date <= filters.dateTo)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      // Handle date fields
      if (sortField === 'entry_date') {
        aValue = new Date(aValue || 0).getTime()
        bValue = new Date(bValue || 0).getTime()
      }

      // Handle string fields
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })

    setFilteredStockData(filtered)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const openDeliveryModal = (stockItem: StockItem) => {
    const remainingQuantity = stockItem.remaining_quantity || stockItem.current_quantity || 0
    setDeliveryModal({
      isOpen: true,
      stockItem,
      deliveryQuantity: remainingQuantity.toString()
    })
  }

  const closeDeliveryModal = () => {
    setDeliveryModal({
      isOpen: false,
      stockItem: null,
      deliveryQuantity: ''
    })
  }

  const handleDeliverySubmit = async () => {
    if (!deliveryModal.stockItem) return

    const deliveryQuantity = parseFloat(deliveryModal.deliveryQuantity)
    const remainingQuantity = deliveryModal.stockItem.remaining_quantity || deliveryModal.stockItem.current_quantity || 0
    const totalReceived = deliveryModal.stockItem.total_received_quantity || deliveryModal.stockItem.quantity
    const alreadyDelivered = deliveryModal.stockItem.total_delivered_quantity || 0
    
    if (isNaN(deliveryQuantity) || deliveryQuantity <= 0) {
      alert('Please enter a valid delivery quantity')
      return
    }

    if (deliveryQuantity > remainingQuantity) {
      alert(`Delivery quantity cannot exceed remaining quantity (${remainingQuantity} ${deliveryModal.stockItem.unit})`)
      return
    }

    // Additional validation: ensure total delivered doesn't exceed total received
    const newTotalDelivered = alreadyDelivered + deliveryQuantity
    if (newTotalDelivered > totalReceived) {
      alert(`Total delivered quantity (${newTotalDelivered} ${deliveryModal.stockItem.unit}) cannot exceed total received quantity (${totalReceived} ${deliveryModal.stockItem.unit})`)
      return
    }

    try {
      const response = await fetch(`/api/warehouses/${warehouseId}/stock/${deliveryModal.stockItem.id}/deliver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          delivery_quantity: deliveryQuantity,
          delivery_date: new Date().toISOString(),
          status: deliveryQuantity === deliveryModal.stockItem.quantity ? 'completed' : 'active'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to mark stock as delivered')
      }

      // Reload the stock data to reflect the changes
      await loadOccupantStock()
      
      // Close modal and show success message
      closeDeliveryModal()
      alert(`Successfully delivered ${deliveryQuantity} ${deliveryModal.stockItem.unit}!`)
    } catch (error) {
      console.error('Error marking stock as delivered:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark stock as delivered'
      alert(`Error: ${errorMessage}`)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const downloadPDF = async () => {
    try {
      // Show loading state
      const button = document.getElementById('pdf-download-btn')
      if (button) {
        button.textContent = 'Generating PDF...'
        button.setAttribute('disabled', 'true')
      }

      // Create PDF
      const pdf = new jsPDF('l', 'mm', 'a4') // Landscape orientation
      
      // Add Zoom logo at top left (2x larger - 40x40mm)
      try {
        const logoResponse = await fetch('/zoom-logo.png')
        const logoBlob = await logoResponse.blob()
        const logoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(logoBlob)
        })
        
        // Add logo (40x40mm size, positioned at top left)
        pdf.addImage(logoDataUrl as string, 'PNG', 20, 10, 40, 40)
      } catch (logoError) {
        console.warn('Could not load logo:', logoError)
        // Continue without logo if it fails to load
      }
      
      // Add title centered and right below the logo
      pdf.setFontSize(20)
      pdf.setFont('helvetica', 'bold')
      const pageWidth = pdf.internal.pageSize.width
      const titleText = 'Goods Received Note (GRN)'
      const titleWidth = pdf.getTextWidth(titleText)
      const titleX = (pageWidth - titleWidth) / 2
      pdf.text(titleText, titleX, 60)
      
      // Reset font for other text
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(12)
      pdf.text(`Occupant: ${occupant?.name || 'N/A'}`, 20, 70)
      pdf.text(`Warehouse: ${warehouse?.name || 'N/A'}`, 20, 75)
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 80)
      pdf.text(`Total Items: ${filteredStockData.length}`, 20, 85)

      // Add table headers
      let yPosition = 100
      pdf.setFontSize(10)
      pdf.text('Stock #', 20, yPosition)
      pdf.text('Product Name', 40, yPosition)
      pdf.text('Received Qty', 100, yPosition)
      pdf.text('Remaining Qty', 130, yPosition)
      pdf.text('Received Date', 160, yPosition)
      pdf.text('Status', 200, yPosition)
      
      yPosition += 10

      // Add table data
      filteredStockData.forEach((item, index) => {
        if (yPosition > 280) { // Start new page if needed
          pdf.addPage()
          yPosition = 20
        }
        
        pdf.text((index + 1).toString(), 20, yPosition)
        pdf.text((item.product_name || item.description || 'No product name').substring(0, 20), 40, yPosition)
        pdf.text(`${item.quantity || item.total_received_quantity || item.initial_quantity} ${item.unit}`, 100, yPosition)
        pdf.text(`${item.current_quantity || item.quantity} ${item.unit}`, 130, yPosition)
        pdf.text(formatDate(item.entry_date), 160, yPosition)
        pdf.text((item.current_quantity || item.quantity) > 0 ? 'Active' : 'Completed', 200, yPosition)
        
        yPosition += 8
      })

      // Add address at the bottom of the page
      const pageHeight = pdf.internal.pageSize.height
      const addressY = pageHeight - 20
      
      pdf.setFontSize(8)
      pdf.setTextColor(100, 100, 100) // Gray color for address
      pdf.text('Zoom Bahrain Services', 20, addressY)
      pdf.text('12, Bldg, 656 Rd No 3625', 20, addressY + 5)
      pdf.text('Manama, The Kingdom of Bahrain', 20, addressY + 10)
      
      // Add page numbers if multiple pages
      const totalPages = pdf.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        pdf.text(`Page ${i} of ${totalPages}`, pdf.internal.pageSize.width - 30, pageHeight - 10)
      }

      // Download the PDF
      const fileName = `GRN_Report_${occupant?.name || 'Stock'}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      // Reset button state
      if (button) {
        button.textContent = 'Download PDF'
        button.removeAttribute('disabled')
      }

    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
      
      // Reset button state
      const button = document.getElementById('pdf-download-btn')
      if (button) {
        button.textContent = 'Download PDF'
        button.removeAttribute('disabled')
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'expired': return 'bg-red-100 text-red-800'
      case 'damaged': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    )
  }

  // Calculate summary statistics
  const totalItems = filteredStockData.length
  const totalReceived = filteredStockData.reduce((sum, item) => sum + (item.total_received_quantity || item.quantity || 0), 0)
  const totalDelivered = filteredStockData.reduce((sum, item) => sum + (item.total_delivered_quantity || 0), 0)
  const totalLeft = filteredStockData.reduce((sum, item) => sum + (item.remaining_quantity || item.current_quantity || 0), 0)

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <Link href="/login" className="text-blue-600 hover:text-blue-500">
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              GRN
            </h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Stock History - {occupant?.name || 'Loading...'}
            </h2>
            <p className="text-sm text-gray-500">
              {warehouse?.name} • {occupant?.name} • {totalItems} items (Active & Completed)
            </p>
          </div>
          <div className="flex justify-end items-center pb-4">
            <div className="flex space-x-4">
              <Link
                href={`/warehouses/${warehouseId}/add-stock?occupantId=${occupantId}`}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Stock</span>
              </Link>
              <Link
                href={`/warehouses/${warehouseId}/occupant-stock/${occupantId}/dispatched`}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                View Dispatched (GDN)
              </Link>
              <Link
                href={`/warehouses/${warehouseId}`}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Back to Warehouse
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Occupant Info */}
        {occupant && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Occupant Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="text-lg font-semibold text-gray-900">{occupant.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Contact</p>
                <p className="text-lg font-semibold text-gray-900">{occupant.contact_info}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Space Occupied</p>
                <p className="text-lg font-semibold text-gray-900">{occupant.space_occupied} m²</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(occupant.status)}`}>
                  {occupant.status}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Items</p>
                <p className="text-2xl font-semibold text-gray-900">{totalItems}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Received</p>
                <p className="text-2xl font-semibold text-gray-900">{totalReceived.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Delivered</p>
                <p className="text-2xl font-semibold text-gray-900">{totalDelivered.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Remaining</p>
                <p className="text-2xl font-semibold text-gray-900">{totalLeft.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="expired">Expired</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading stock data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Stock History Details (GRN)</h3>
                  <p className="text-sm text-gray-500">
                    Showing {filteredStockData.length} of {stockData.length} items (Active & Completed)
                  </p>
                </div>
                <button
                  id="pdf-download-btn"
                  onClick={downloadPDF}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto" ref={tableRef}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('id')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Stock #</span>
                        {getSortIcon('id')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('description')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Product Name</span>
                        {getSortIcon('description')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('quantity')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Received Qty</span>
                        {getSortIcon('quantity')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('total_delivered_quantity')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Delivered Qty</span>
                        {getSortIcon('total_delivered_quantity')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('current_quantity')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Remaining Qty</span>
                        {getSortIcon('current_quantity')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('entry_date')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Received Date</span>
                        {getSortIcon('entry_date')}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Status</span>
                        {getSortIcon('status')}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStockData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.product_name || item.description || 'No product name'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.total_received_quantity || item.quantity || item.initial_quantity} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.total_delivered_quantity || 0} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(item.remaining_quantity || item.current_quantity || 0)} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.entry_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor((item.remaining_quantity || item.current_quantity || 0) > 0 ? 'active' : 'completed')}`}>
                          {(item.remaining_quantity || item.current_quantity || 0) > 0 ? 'Active' : 'Completed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {(item.remaining_quantity || item.current_quantity || 0) > 0 ? (
                          <button
                            onClick={() => openDeliveryModal(item)}
                            className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-3 py-1 rounded-md transition-colors"
                          >
                            Mark as Delivered
                          </button>
                        ) : (
                          <span className="text-green-600 text-sm font-medium">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredStockData.length === 0 && (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Stock Items Found</h3>
                <p className="text-gray-600">
                  {stockData.length === 0 
                    ? 'No stock items for this occupant yet.'
                    : 'No stock items match your current filters.'
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delivery Modal */}
      {deliveryModal.isOpen && deliveryModal.stockItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Mark as Delivered
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Product:</strong> {deliveryModal.stockItem.product_name || deliveryModal.stockItem.description || 'No product name'}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Total Received:</strong> {deliveryModal.stockItem.total_received_quantity || deliveryModal.stockItem.quantity} {deliveryModal.stockItem.unit}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Already Delivered:</strong> {deliveryModal.stockItem.total_delivered_quantity || 0} {deliveryModal.stockItem.unit}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Remaining Quantity:</strong> {deliveryModal.stockItem.remaining_quantity || deliveryModal.stockItem.current_quantity || 0} {deliveryModal.stockItem.unit}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Quantity
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={deliveryModal.stockItem.remaining_quantity || deliveryModal.stockItem.current_quantity || 0}
                  value={deliveryModal.deliveryQuantity}
                  onChange={(e) => setDeliveryModal(prev => ({
                    ...prev,
                    deliveryQuantity: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter delivery quantity"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum: {deliveryModal.stockItem.remaining_quantity || deliveryModal.stockItem.current_quantity || 0} {deliveryModal.stockItem.unit}
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeDeliveryModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeliverySubmit}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Confirm Delivery
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
