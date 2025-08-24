'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Quote } from '@/lib/supabase'

export default function AdminQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadQuotes()
  }, [])

  const loadQuotes = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setQuotes(data || [])
    } catch (err) {
      setError('Failed to load quotes')
      console.error('Error loading quotes:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusUpdate = async (quoteId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: newStatus })
        .eq('id', quoteId)

      if (error) throw error
      await loadQuotes()
    } catch (err) {
      setError('Failed to update quote status')
      console.error('Error updating quote status:', err)
    }
  }

  const handleDelete = async (quoteId: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId)

      if (error) throw error
      await loadQuotes()
    } catch (err) {
      setError('Failed to delete quote')
      console.error('Error deleting quote:', err)
    }
  }

  const filteredQuotes = quotes.filter(quote => {
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter
    const matchesSearch = quote.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (quote.client_email && quote.client_email.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(3)} BHD`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading quotes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Quotes Management</h2>
        <p className="mt-1 text-sm text-gray-500">
          View and manage warehouse quotes
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Quotes
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by client name, quote number, or email..."
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Quotes ({filteredQuotes.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quote Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Space Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Financial
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="font-medium text-gray-900">{quote.quote_number}</div>
                    <div className="text-gray-500">{formatDate(quote.created_at)}</div>
                    {quote.quote_valid_until && (
                      <div className="text-xs text-gray-400">
                        Valid until: {formatDate(quote.quote_valid_until)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="font-medium text-gray-900">{quote.client_name}</div>
                    {quote.client_email && (
                      <div className="text-gray-500">{quote.client_email}</div>
                    )}
                    {quote.client_phone && (
                      <div className="text-gray-500">{quote.client_phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="text-gray-900">
                      {quote.area_requested} m² requested
                    </div>
                    <div className="text-gray-500">
                      {quote.area_chargeable} m² chargeable
                    </div>
                    <div className="text-gray-500">
                      {quote.tenure} • {quote.lease_duration_months} months
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="text-gray-900 font-medium">
                      {formatCurrency(quote.grand_total)}
                    </div>
                    <div className="text-gray-500">
                      Base: {formatCurrency(quote.total_base_rent)}
                    </div>
                    {quote.discount_amount > 0 && (
                      <div className="text-green-600">
                        -{formatCurrency(quote.discount_amount)} discount
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quote.status)}`}>
                      {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedQuote(quote)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    <select
                      value={quote.status}
                      onChange={(e) => handleStatusUpdate(quote.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 mr-2"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="accepted">Accepted</option>
                      <option value="expired">Expired</option>
                    </select>
                    <button
                      onClick={() => handleDelete(quote.id)}
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

      {/* Quote Detail Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Quote Details - {selectedQuote.quote_number}
              </h3>
              <button
                onClick={() => setSelectedQuote(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client Information */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Client Information</h4>
                <div className="bg-gray-50 p-3 rounded">
                  <p><strong>Name:</strong> {selectedQuote.client_name}</p>
                  {selectedQuote.client_email && (
                    <p><strong>Email:</strong> {selectedQuote.client_email}</p>
                  )}
                  {selectedQuote.client_phone && (
                    <p><strong>Phone:</strong> {selectedQuote.client_phone}</p>
                  )}
                  <p><strong>Location:</strong> {selectedQuote.warehouse_location}</p>
                </div>
              </div>

              {/* Space Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Space Details</h4>
                <div className="bg-gray-50 p-3 rounded">
                  <p><strong>Area Requested:</strong> {selectedQuote.area_requested} m²</p>
                  <p><strong>Area Chargeable:</strong> {selectedQuote.area_chargeable} m²</p>
                  <p><strong>Area Band:</strong> {selectedQuote.area_band_name}</p>
                  <p><strong>Tenure:</strong> {selectedQuote.tenure}</p>
                  <p><strong>Duration:</strong> {selectedQuote.lease_duration_months} months</p>
                  <p><strong>Lease Period:</strong> {formatDate(selectedQuote.lease_start)} - {formatDate(selectedQuote.lease_end)}</p>
                </div>
              </div>

              {/* Pricing Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Pricing Details</h4>
                <div className="bg-gray-50 p-3 rounded">
                  <p><strong>Monthly Rate:</strong> {selectedQuote.monthly_rate_per_sqm} BHD/m²</p>
                  <p><strong>Daily Rate:</strong> {selectedQuote.daily_rate_per_sqm} BHD/m²</p>
                  <p><strong>Monthly Base Rent:</strong> {formatCurrency(selectedQuote.monthly_base_rent)}</p>
                  <p><strong>Total Base Rent:</strong> {formatCurrency(selectedQuote.total_base_rent)}</p>
                </div>
              </div>

              {/* EWA Details */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">EWA Details</h4>
                <div className="bg-gray-50 p-3 rounded">
                  <p><strong>Type:</strong> {selectedQuote.ewa_type}</p>
                  <p><strong>Monthly Estimate:</strong> {formatCurrency(selectedQuote.ewa_monthly_estimate)}</p>
                  <p><strong>Total Estimate:</strong> {formatCurrency(selectedQuote.ewa_total_estimate)}</p>
                  <p><strong>One-off Costs:</strong> {formatCurrency(selectedQuote.ewa_one_off_costs)}</p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="md:col-span-2">
                <h4 className="font-medium text-gray-900 mb-2">Financial Summary</h4>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Subtotal</p>
                      <p className="font-medium">{formatCurrency(selectedQuote.subtotal)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Discount</p>
                      <p className="font-medium text-green-600">-{formatCurrency(selectedQuote.discount_amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">VAT</p>
                      <p className="font-medium">{formatCurrency(selectedQuote.vat_amount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Grand Total</p>
                      <p className="font-medium text-lg text-blue-600">{formatCurrency(selectedQuote.grand_total)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional Services */}
              {selectedQuote.optional_services_total > 0 && (
                <div className="md:col-span-2">
                  <h4 className="font-medium text-gray-900 mb-2">Optional Services</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p><strong>Total Services Cost:</strong> {formatCurrency(selectedQuote.optional_services_total)}</p>
                    {selectedQuote.optional_services_details && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">Services included:</p>
                        <ul className="text-sm text-gray-700 list-disc list-inside">
                          {Object.entries(selectedQuote.optional_services_details).map(([service, details]: [string, { pricing?: string }]) => (
                            <li key={service}>{service}: {details.pricing || 'On Request'}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedQuote.notes && (
                <div className="md:col-span-2">
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-700">{selectedQuote.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
