'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

interface ElectricityBill {
  id: string
  warehouse_id: string
  occupant_id: string
  billing_period_start: string
  billing_period_end: string
  meter_reading_start: number
  meter_reading_end: number
  units_consumed: number
  rate_per_unit: number
  total_amount: number
  bill_date: string
  due_date: string
  status: 'pending' | 'paid' | 'overdue'
  notes: string
  created_at: string
  updated_at: string
}

interface ElectricityRate {
  id: string
  rate_type: 'standard' | 'peak' | 'off_peak' | 'weekend'
  rate_per_unit: number
  effective_date: string
  active: boolean
  description: string
  created_at: string
  updated_at: string
}

export default function AdminElectricityBills() {
  const { user, isLoading: authLoading, logout } = useAuth({ requiredRole: 'ADMIN' })
  const [bills, setBills] = useState<ElectricityBill[]>([])
  const [rates, setRates] = useState<ElectricityRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'bills' | 'rates'>('bills')
  const [showAddBillModal, setShowAddBillModal] = useState(false)
  const [showAddRateModal, setShowAddRateModal] = useState(false)
  const [editingBill, setEditingBill] = useState<ElectricityBill | null>(null)
  const [editingRate, setEditingRate] = useState<ElectricityRate | null>(null)
  const [newBill, setNewBill] = useState<Partial<ElectricityBill>>({
    warehouse_id: '',
    occupant_id: '',
    billing_period_start: '',
    billing_period_end: '',
    meter_reading_start: 0,
    meter_reading_end: 0,
    units_consumed: 0,
    rate_per_unit: 0,
    total_amount: 0,
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    status: 'pending',
    notes: ''
  })
  const [newRate, setNewRate] = useState<Partial<ElectricityRate>>({
    rate_type: 'standard',
    rate_per_unit: 0,
    effective_date: new Date().toISOString().split('T')[0],
    active: true,
    description: ''
  })

  useEffect(() => {
    if (!authLoading) {
      loadData()
    }
  }, [authLoading])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [billsResult, ratesResult] = await Promise.all([
        supabase
          .from('electricity_bills')
          .select('*')
          .order('bill_date', { ascending: false }),
        supabase
          .from('electricity_rates')
          .select('*')
          .order('effective_date', { ascending: false })
      ])

      if (billsResult.error) throw billsResult.error
      if (ratesResult.error) throw ratesResult.error

      setBills(billsResult.data || [])
      setRates(ratesResult.data || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const addBill = async () => {
    try {
      if (!newBill.warehouse_id || !newBill.occupant_id || !newBill.billing_period_start || !newBill.billing_period_end) {
        alert('Please fill in all required fields')
        return
      }

      const unitsConsumed = (newBill.meter_reading_end || 0) - (newBill.meter_reading_start || 0)
      const totalAmount = unitsConsumed * (newBill.rate_per_unit || 0)

      const { error } = await supabase
        .from('electricity_bills')
        .insert([{
          ...newBill,
          id: crypto.randomUUID(),
          units_consumed: unitsConsumed,
          total_amount: totalAmount,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) throw error

      setShowAddBillModal(false)
      setNewBill({
        warehouse_id: '',
        occupant_id: '',
        billing_period_start: '',
        billing_period_end: '',
        meter_reading_start: 0,
        meter_reading_end: 0,
        units_consumed: 0,
        rate_per_unit: 0,
        total_amount: 0,
        bill_date: new Date().toISOString().split('T')[0],
        due_date: '',
        status: 'pending',
        notes: ''
      })
      loadData()
      alert('Electricity bill added successfully!')
    } catch (err) {
      console.error('Error adding bill:', err)
      alert('Failed to add electricity bill: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const updateBill = async (bill: ElectricityBill) => {
    try {
      const { error } = await supabase
        .from('electricity_bills')
        .update({
          ...bill,
          updated_at: new Date().toISOString()
        })
        .eq('id', bill.id)

      if (error) throw error

      setEditingBill(null)
      loadData()
      alert('Electricity bill updated successfully!')
    } catch (err) {
      console.error('Error updating bill:', err)
      alert('Failed to update electricity bill: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const deleteBill = async (id: string) => {
    if (!confirm('Are you sure you want to delete this electricity bill? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('electricity_bills')
        .delete()
        .eq('id', id)

      if (error) throw error

      loadData()
      alert('Electricity bill deleted successfully!')
    } catch (err) {
      console.error('Error deleting bill:', err)
      alert('Failed to delete electricity bill: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const addRate = async () => {
    try {
      if (!newRate.rate_type || !newRate.rate_per_unit || !newRate.effective_date) {
        alert('Please fill in all required fields')
        return
      }

      const { error } = await supabase
        .from('electricity_rates')
        .insert([{
          ...newRate,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) throw error

      setShowAddRateModal(false)
      setNewRate({
        rate_type: 'standard',
        rate_per_unit: 0,
        effective_date: new Date().toISOString().split('T')[0],
        active: true,
        description: ''
      })
      loadData()
      alert('Electricity rate added successfully!')
    } catch (err) {
      console.error('Error adding rate:', err)
      alert('Failed to add electricity rate: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const updateRate = async (rate: ElectricityRate) => {
    try {
      const { error } = await supabase
        .from('electricity_rates')
        .update({
          ...rate,
          updated_at: new Date().toISOString()
        })
        .eq('id', rate.id)

      if (error) throw error

      setEditingRate(null)
      loadData()
      alert('Electricity rate updated successfully!')
    } catch (err) {
      console.error('Error updating rate:', err)
      alert('Failed to update electricity rate: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const deleteRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this electricity rate? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('electricity_rates')
        .delete()
        .eq('id', id)

      if (error) throw error

      loadData()
      alert('Electricity rate deleted successfully!')
    } catch (err) {
      console.error('Error deleting rate:', err)
      alert('Failed to delete electricity rate: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading electricity bills...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Electricity Bills Management</h1>
            <p className="text-gray-600 mt-1">Manage electricity bills and rates</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowAddBillModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
            >
              Add New Bill
            </button>
            <Link 
              href="/admin"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Back to Admin
            </Link>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">
              Logged in as: <span className="font-semibold">{user.firstName} {user.lastName}</span> ({user.role})
            </p>
          </div>
        )}

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
              <button
                onClick={() => setActiveTab('bills')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'bills'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Electricity Bills ({bills.length})
              </button>
              <button
                onClick={() => setActiveTab('rates')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'rates'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Electricity Rates ({rates.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {activeTab === 'bills' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Electricity Bills</h2>
                <button
                  onClick={() => setShowAddBillModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Add New Bill
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Occupant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(bill.bill_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bill.warehouse_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bill.occupant_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(bill.billing_period_start).toLocaleDateString()} - {new Date(bill.billing_period_end).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bill.units_consumed}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bill.rate_per_unit} BHD/unit
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bill.total_amount} BHD
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            bill.status === 'paid' ? 'bg-green-100 text-green-800' :
                            bill.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button 
                            onClick={() => setEditingBill(bill)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => deleteBill(bill.id)}
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
          
          {activeTab === 'rates' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Electricity Rates</h2>
                <button
                  onClick={() => setShowAddRateModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Add New Rate
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate per Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {rate.rate_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {editingRate?.id === rate.id ? (
                            <input
                              type="number"
                              step="0.001"
                              value={editingRate.rate_per_unit}
                              onChange={(e) => setEditingRate({
                                ...editingRate,
                                rate_per_unit: parseFloat(e.target.value)
                              })}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          ) : (
                            `${rate.rate_per_unit} BHD/unit`
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(rate.effective_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {rate.description}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingRate?.id === rate.id ? (
                            <select
                              value={editingRate.active ? 'true' : 'false'}
                              onChange={(e) => setEditingRate({
                                ...editingRate,
                                active: e.target.value === 'true'
                              })}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              rate.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {rate.active ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {editingRate?.id === rate.id ? (
                            <>
                              <button
                                onClick={() => updateRate(editingRate)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingRate(null)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => setEditingRate(rate)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => deleteRate(rate.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Add New Bill Modal */}
        {showAddBillModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Add New Electricity Bill</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse ID *</label>
                    <input
                      type="text"
                      value={newBill.warehouse_id}
                      onChange={(e) => setNewBill({...newBill, warehouse_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Occupant ID *</label>
                    <input
                      type="text"
                      value={newBill.occupant_id}
                      onChange={(e) => setNewBill({...newBill, occupant_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Period Start *</label>
                    <input
                      type="date"
                      value={newBill.billing_period_start}
                      onChange={(e) => setNewBill({...newBill, billing_period_start: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Period End *</label>
                    <input
                      type="date"
                      value={newBill.billing_period_end}
                      onChange={(e) => setNewBill({...newBill, billing_period_end: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meter Reading Start</label>
                    <input
                      type="number"
                      value={newBill.meter_reading_start || ''}
                      onChange={(e) => setNewBill({...newBill, meter_reading_start: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Meter Reading End</label>
                    <input
                      type="number"
                      value={newBill.meter_reading_end || ''}
                      onChange={(e) => setNewBill({...newBill, meter_reading_end: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate per Unit (BHD)</label>
                    <input
                      type="number"
                      step="0.001"
                      value={newBill.rate_per_unit || ''}
                      onChange={(e) => setNewBill({...newBill, rate_per_unit: parseFloat(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newBill.due_date}
                      onChange={(e) => setNewBill({...newBill, due_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={newBill.notes}
                    onChange={(e) => setNewBill({...newBill, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddBillModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addBill}
                  disabled={!newBill.warehouse_id || !newBill.occupant_id || !newBill.billing_period_start || !newBill.billing_period_end}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                  Add Bill
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add New Rate Modal */}
        {showAddRateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Add New Electricity Rate</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate Type *</label>
                  <select
                    value={newRate.rate_type}
                    onChange={(e) => setNewRate({...newRate, rate_type: e.target.value as 'standard' | 'peak' | 'off_peak' | 'weekend'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="standard">Standard</option>
                    <option value="peak">Peak</option>
                    <option value="off_peak">Off Peak</option>
                    <option value="weekend">Weekend</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate per Unit (BHD) *</label>
                  <input
                    type="number"
                    step="0.001"
                    value={newRate.rate_per_unit || ''}
                    onChange={(e) => setNewRate({...newRate, rate_per_unit: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date *</label>
                  <input
                    type="date"
                    value={newRate.effective_date}
                    onChange={(e) => setNewRate({...newRate, effective_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newRate.description}
                    onChange={(e) => setNewRate({...newRate, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Rate description..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddRateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addRate}
                  disabled={!newRate.rate_type || !newRate.rate_per_unit || !newRate.effective_date}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                  Add Rate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


