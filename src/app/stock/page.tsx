'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { generateStockReportPDF } from '@/lib/pdf-generator'

interface StockItem {
  id: string
  client_name: string
  client_email: string
  client_phone: string
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
}

export default function StockManagement() {
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'pending'>('all')
  const [showAddModal, setShowAddModal] = useState(false)

  // New stock item form
  const [newStock, setNewStock] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    product_type: 'general',
    quantity: 0,
    unit: 'pieces',
    description: '',
    storage_location: '',
    space_type: 'Ground Floor' as 'Ground Floor' | 'Mezzanine',
    area_used: 0,
    entry_date: new Date().toISOString().split('T')[0],
    expected_exit_date: '',
    status: 'active' as 'active' | 'completed' | 'pending',
    notes: ''
  })

  useEffect(() => {
    loadStockData()
  }, [])

  const loadStockData = async () => {
    try {
      setLoading(true)
      
      // Try to load from client_stock table first (legacy)
      let { data, error } = await supabase
        .from('client_stock')
        .select('*')
        .order('created_at', { ascending: false })

      // If client_stock table doesn't exist, try stock_data table
      if (error && error.code === 'PGRST205') {
        console.log('client_stock table not found, trying stock_data table...')
        const stockDataResult = await supabase
          .from('stock_data')
          .select(`
            id,
            client_name,
            client_email,
            client_phone,
            product_type,
            quantity,
            unit,
            product_description as description,
            storage_location,
            space_type,
            area_occupied_m2 as area_used,
            entry_date,
            expected_exit_date,
            status,
            notes,
            created_at,
            updated_at
          `)
          .order('created_at', { ascending: false })
        
        data = stockDataResult.data
        error = stockDataResult.error
      }

      if (error) {
        console.error('Error loading stock data:', error)
        if (error.code === 'PGRST205') {
          setError('Stock table not found. Please create the database table first.')
        } else if (error.message) {
          setError(`Failed to load stock data: ${error.message}`)
        } else {
          setError('Database connection failed. Please check your Supabase configuration and create the client_stock table.')
        }
        return
      }

      setStockItems(data || [])
      setError(null)
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load stock data. Please check your database connection.')
    } finally {
      setLoading(false)
    }
  }

  const addStockItem = async () => {
    try {
      // Try client_stock table first, then stock_data table
      let { data, error } = await supabase
        .from('client_stock')
        .insert([{
          ...newStock,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        }])
        .select()

      // If client_stock doesn't exist, try stock_data table
      if (error && error.code === 'PGRST205') {
        console.log('Using stock_data table for insert...')
        const stockDataInsert = await supabase
          .from('stock_data')
          .insert([{
            id: crypto.randomUUID(),
            client_name: newStock.client_name,
            client_email: newStock.client_email,
            client_phone: newStock.client_phone,
            product_name: newStock.description || 'General Item',
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

      if (error) {
        console.error('Error adding stock item:', error)
        alert(`Failed to add stock item: ${error.message}`)
        return
      }

      // Reset form and close modal
      setNewStock({
        client_name: '',
        client_email: '',
        client_phone: '',
        product_type: 'general',
        quantity: 0,
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
      // Try client_stock first, then stock_data
      let { error } = await supabase
        .from('client_stock')
        .delete()
        .eq('id', id)

      // If client_stock doesn't exist, try stock_data
      if (error && error.code === 'PGRST205') {
        const stockDataDelete = await supabase
          .from('stock_data')
          .delete()
          .eq('id', id)
        error = stockDataDelete.error
      }

      if (error) {
        console.error('Error deleting stock item:', error)
        alert(`Failed to delete stock item: ${error.message}`)
        return
      }

      loadStockData()
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to delete stock item')
    }
  }

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
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
              <p className="text-gray-600 mt-1">Manage client inventory and storage</p>
            </div>
            <div className="flex space-x-3">
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

      <div className="container mx-auto px-4 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by client name, product type, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'completed' | 'pending')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <div className="grid gap-6">
            {filteredItems.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No stock items found</h3>
                <p className="text-gray-600 mb-4">Get started by adding your first stock item.</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  Add Stock Item
                </button>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{item.client_name}</h3>
                      <p className="text-gray-600">{item.client_email} • {item.client_phone}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => updateStockStatus(item.id, 'active')}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Mark as Active"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => updateStockStatus(item.id, 'completed')}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Mark as Completed"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteStockItem(item.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9zM4 5a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM8 8a1 1 0 012 0v3a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v3a1 1 0 11-2 0V8z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Product:</span>
                      <p className="text-gray-600">{item.product_type}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Quantity:</span>
                      <p className="text-gray-600">{item.quantity} {item.unit}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Location:</span>
                      <p className="text-gray-600">{item.space_type}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Area:</span>
                      <p className="text-gray-600">{item.area_used} m²</p>
                    </div>
                  </div>

                  {item.description && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-700">Description:</span>
                      <p className="text-gray-600 text-sm">{item.description}</p>
                    </div>
                  )}

                  <div className="mt-4 flex justify-between text-xs text-gray-500">
                    <span>Entry: {new Date(item.entry_date).toLocaleDateString()}</span>
                    {item.expected_exit_date && (
                      <span>Expected Exit: {new Date(item.expected_exit_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New Stock Item</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
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

              <div className="grid md:grid-cols-2 gap-4">
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

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={newStock.quantity || ''}
                    onChange={(e) => setNewStock({...newStock, quantity: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={newStock.unit}
                    onChange={(e) => setNewStock({...newStock, unit: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pieces">Pieces</option>
                    <option value="boxes">Boxes</option>
                    <option value="pallets">Pallets</option>
                    <option value="kg">Kilograms</option>
                    <option value="tons">Tons</option>
                    <option value="m3">Cubic Meters</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Area Used (m²)</label>
                  <input
                    type="number"
                    value={newStock.area_used || ''}
                    onChange={(e) => setNewStock({...newStock, area_used: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newStock.description}
                  onChange={(e) => setNewStock({...newStock, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

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
                  rows={2}
                  placeholder="Additional notes or special instructions"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addStockItem}
                disabled={!newStock.client_name}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                Add Stock Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
