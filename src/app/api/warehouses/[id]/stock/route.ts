import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSessionFromRequest } from '@/lib/auth'

// GET /api/warehouses/[id]/stock - Get stock items for a warehouse
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: warehouseId } = await params
    
    // Validate session
    const sessionValidation = await validateSessionFromRequest(request)
    if (!sessionValidation.isValid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const occupantId = searchParams.get('occupantId')
    
    console.log('📊 Loading stock data for warehouse:', warehouseId, occupantId ? `and occupant: ${occupantId}` : '')
    
    // Build query based on whether we're filtering by occupant
    let query = supabase
      .from('client_stock')
      .select('*')
      .in('status', ['active', 'completed']) // Show both active and completed stocks
      .not('id', 'like', 'dispatched-%') // Exclude dispatched records (they go to GDN page)
      .order('entry_date', { ascending: false })
      .limit(100)
    
    // If occupantId is provided, filter by that occupant
    if (occupantId) {
      // Get occupant details to filter by client_name
      const { data: occupantData, error: occupantError } = await supabase
        .from('warehouse_occupants')
        .select('name')
        .eq('id', occupantId)
        .single()
      
      if (occupantError) {
        console.error('Error loading occupant:', occupantError)
        return NextResponse.json(
          { error: 'Occupant not found' },
          { status: 404 }
        )
      }
      
      if (occupantData) {
        query = query.eq('client_name', occupantData.name)
        console.log('🔍 Filtering by occupant:', occupantData.name)
      }
    }
    
    const { data, error } = await query

    if (error) {
      console.error('Error loading stock data:', error)
      return NextResponse.json(
        { error: 'Failed to load stock data' },
        { status: 500 }
      )
    }

    console.log('✅ Loaded stock data:', data?.length || 0, 'items')
    if (occupantId && data) {
      console.log('📋 Stock items for occupant:', data.map(item => ({ id: item.id, client_name: item.client_name, product_name: item.product_name })))
    }
    return NextResponse.json({ data: data || [] })

  } catch (error) {
    console.error('Error in GET /api/warehouses/[id]/stock:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/warehouses/[id]/stock - Add new stock item to warehouse
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: warehouseId } = await params
    
    // Validate session
    const sessionValidation = await validateSessionFromRequest(request)
    if (!sessionValidation.isValid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      productName,
      productType,
      quantity,
      unit,
      description,
      areaUsed,
      storageLocation,
      section,
      occupantId
    } = body

    // Validate required fields
    if (!productName || !productType || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: productName, productType, quantity' },
        { status: 400 }
      )
    }

    // Parse numeric values
    const parsedQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity
    const parsedAreaUsed = typeof areaUsed === 'string' ? parseFloat(areaUsed) : (areaUsed || 0)

    console.log('📦 Adding stock to warehouse:', {
      warehouseId,
      productName,
      productType,
      quantity: parsedQuantity,
      areaUsed: parsedAreaUsed,
      occupantId
    })

    // Get warehouse and occupant information
    let warehouse = null
    let occupant = null

    // Load warehouse data
    const { data: warehouseData, error: warehouseError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', warehouseId)
      .single()

    if (warehouseError) {
      console.error('Error loading warehouse:', warehouseError)
      return NextResponse.json(
        { error: 'Warehouse not found' },
        { status: 404 }
      )
    }
    warehouse = warehouseData

    // Load occupant data if occupantId is provided
    if (occupantId) {
      const { data: occupantData, error: occupantError } = await supabase
        .from('warehouse_occupants')
        .select('*')
        .eq('id', occupantId)
        .single()

      if (occupantError) {
        console.error('Error loading occupant:', occupantError)
        return NextResponse.json(
          { error: 'Occupant not found' },
          { status: 404 }
        )
      }
      occupant = occupantData
    }

    // Create stock item
    const stockId = `stock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const stockData = {
      id: stockId,
      client_name: occupant?.name || 'Warehouse Stock',
      client_email: occupant?.contact_info || '',
      client_phone: occupant?.contact_info || '',
      product_name: productName,
      product_type: productType,
      quantity: parsedQuantity,
      unit: unit || 'pieces',
      description: description || productName,
      storage_location: storageLocation || section || 'Warehouse Storage',
      space_type: occupant?.floor_type || 'Ground Floor',
      area_used: parsedAreaUsed,
      entry_date: new Date().toISOString().split('T')[0],
      status: 'active',
      notes: `Warehouse: ${warehouse.name}${occupant ? `, Occupant: ${occupant.name}` : ''}${section ? `, Section: ${section}` : ''}`,
      
      // Quantity tracking fields
      current_quantity: parsedQuantity,
      total_received_quantity: parsedQuantity,
      total_delivered_quantity: 0,
      initial_quantity: parsedQuantity,
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    console.log('📦 Creating stock item:', stockData)

    const { data: newStock, error: stockError } = await supabase
      .from('client_stock')
      .insert([stockData])
      .select()
      .single()

    if (stockError) {
      console.error('Error creating stock item:', stockError)
      return NextResponse.json(
        { error: 'Failed to create stock item' },
        { status: 500 }
      )
    }

    console.log('✅ Stock item created successfully:', newStock.id)

    return NextResponse.json({
      success: true,
      data: newStock
    })

  } catch (error) {
    console.error('Error in POST /api/warehouses/[id]/stock:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}