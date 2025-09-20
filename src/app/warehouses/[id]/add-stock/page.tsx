'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'

interface Warehouse {
  id: string
  name: string
  location: string
  total_capacity: number
  available_capacity: number
}

interface Occupant {
  id: string
  name: string
  space_occupied: number
  status: string
}

function AddStockPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const warehouseId = params.id as string
  const occupantId = searchParams.get('occupantId')

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null)
  const [occupant, setOccupant] = useState<Occupant | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    productName: '',
    productType: '',
    quantity: '',
    unit: 'pieces',
    description: '',
    areaUsed: '',
    storageLocation: '',
    section: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (warehouseId) {
      loadWarehouseData()
    }
  }, [warehouseId, user, authLoading])

  const loadWarehouseData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load warehouse data
      const warehouseResponse = await fetch(`/api/warehouses/${warehouseId}`)
      if (!warehouseResponse.ok) {
        throw new Error('Failed to load warehouse data')
      }
      const warehouseData = await warehouseResponse.json()
      setWarehouse(warehouseData.data)

      // Load occupant data if occupantId is provided
      if (occupantId) {
        const occupantResponse = await fetch(`/api/warehouses/${warehouseId}/occupants`)
        if (occupantResponse.ok) {
          const occupantsData = await occupantResponse.json()
          const foundOccupant = occupantsData.data?.find((occ: Occupant) => occ.id === occupantId)
          if (foundOccupant) {
            setOccupant(foundOccupant)
          }
        }
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.productName || !formData.productType || !formData.quantity) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const stockData = {
        productName: formData.productName,
        productType: formData.productType,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        description: formData.description,
        areaUsed: parseFloat(formData.areaUsed) || 0,
        storageLocation: formData.storageLocation,
        section: formData.section,
        warehouseId: warehouseId,
        occupantId: occupantId
      }

      // Use the warehouse stock API
      const response = await fetch(`/api/warehouses/${warehouseId}/stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stockData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add stock')
      }

      setSuccess(true)
      
      // Redirect back to the stock view page after 2 seconds
      setTimeout(() => {
        if (occupantId) {
          router.push(`/warehouses/${warehouseId}/occupant-stock/${occupantId}`)
        } else {
          router.push(`/warehouses/${warehouseId}`)
        }
      }, 2000)

    } catch (err) {
      console.error('Error adding stock:', err)
      setError(err instanceof Error ? err.message : 'Failed to add stock')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Add Stock
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {warehouse?.name} {occupant && `• ${occupant.name}`}
              </p>
            </div>
            <div className="flex space-x-4">
              {occupantId && (
                <Link
                  href={`/warehouses/${warehouseId}/occupant-stock/${occupantId}`}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Back to Stock View
                </Link>
              )}
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {success ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Stock Added Successfully!</h3>
              <p className="mt-2 text-sm text-gray-500">
                Your stock item has been added. Redirecting you back to the stock view...
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Stock Information</h3>
              <p className="text-sm text-gray-500">
                Enter the details of the stock item you want to add
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    id="productName"
                    name="productName"
                    value={formData.productName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter product name"
                  />
                </div>

                <div>
                  <label htmlFor="productType" className="block text-sm font-medium text-gray-700 mb-1">
                    Product Type *
                  </label>
                  <input
                    type="text"
                    id="productType"
                    name="productType"
                    value={formData.productType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter product type"
                  />
                </div>

                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <label htmlFor="unit" className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    id="unit"
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pieces">Pieces</option>
                    <option value="boxes">Boxes</option>
                    <option value="pallets">Pallets</option>
                    <option value="tons">Tons</option>
                    <option value="kg">Kilograms</option>
                    <option value="liters">Liters</option>
                    <option value="units">Units</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="areaUsed" className="block text-sm font-medium text-gray-700 mb-1">
                    Area Used (m²)
                  </label>
                  <input
                    type="number"
                    id="areaUsed"
                    name="areaUsed"
                    value={formData.areaUsed}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter area used"
                  />
                </div>

                <div>
                  <label htmlFor="storageLocation" className="block text-sm font-medium text-gray-700 mb-1">
                    Storage Location
                  </label>
                  <input
                    type="text"
                    id="storageLocation"
                    name="storageLocation"
                    value={formData.storageLocation}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter storage location"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter additional description (optional)"
                />
              </div>

              <div className="flex justify-end space-x-4">
                <Link
                  href={occupantId ? `/warehouses/${warehouseId}/occupant-stock/${occupantId}` : `/warehouses/${warehouseId}`}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adding Stock...' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AddStockPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Loading...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Preparing add stock page...
          </p>
        </div>
      </div>
    }>
      <AddStockPageContent />
    </Suspense>
  )
}
