import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    console.log('🔍 Stock API called with params:', resolvedParams)
    const { id: warehouseId } = resolvedParams
    const { searchParams } = new URL(request.url)
    const occupantId = searchParams.get('occupantId')

    console.log('📊 API parameters:', { warehouseId, occupantId })

    if (!warehouseId) {
      console.log('❌ Missing warehouse ID')
      return NextResponse.json({ error: 'Warehouse ID is required' }, { status: 400 })
    }

    // Start with a basic query for original stocks only (exclude dispatched records)
    let query = supabase
      .from('client_stock')
      .select('*')
      .in('status', ['active', 'completed']) // Show both active and completed stocks
      .not('id', 'like', 'dispatched-%') // Exclude dispatched records (they go to GDN page)
      .order('entry_date', { ascending: false })
      .limit(100) // Limit results for performance

    // If occupantId is provided, try to filter by occupant
    if (occupantId) {
      console.log('👤 Looking up occupant:', occupantId)
      // First get the occupant details to match by name/email
      const { data: occupant, error: occupantError } = await supabase
        .from('warehouse_occupants')
        .select('name, contact_info')
        .eq('id', occupantId)
        .single()

      if (occupantError) {
        console.log('❌ Error fetching occupant:', occupantError)
        // Don't return error, just show all stock data
        console.log('⚠️ Showing all stock data instead of filtering by occupant')
      } else if (!occupant) {
        console.log('❌ Occupant not found in database')
        // Don't return error, just show all stock data
        console.log('⚠️ Showing all stock data instead of filtering by occupant')
      } else {
        console.log('✅ Found occupant:', occupant)
        // Filter stock by occupant name or contact info
        query = query.or(`client_name.ilike.%${occupant.name}%,client_email.ilike.%${occupant.contact_info}%`)
        console.log('🔍 Applied occupant filter for:', occupant.name)
      }
    } else {
      console.log('⚠️ No occupantId provided, showing all active stock data')
    }

    console.log('🔍 Executing stock query...')
    let { data: stockData, error } = await query

    if (error) {
      console.error('❌ Error with filtered query, trying basic query:', error)
      // Try with the most basic query possible
      const basicQuery = supabase
        .from('client_stock')
        .select('*')
        .in('status', ['active', 'completed'])
        .not('id', 'like', 'dispatched-%') // Exclude dispatched records
        .limit(50)
      
      const basicResult = await basicQuery
      stockData = basicResult.data
      error = basicResult.error
      
      if (error) {
        console.error('❌ Error with basic query:', error)
        // Return empty data instead of error
        stockData = []
        console.log('⚠️ Returning empty stock data due to query errors')
      } else {
        console.log('✅ Basic query successful, found:', stockData?.length || 0, 'items')
      }
    } else {
      console.log('✅ Stock query successful, found:', stockData?.length || 0, 'items')
    }

    // Calculate additional fields for each stock item using existing schema
    const enrichedStockData = stockData?.map(item => {
      const originalReceivedQuantity = item.quantity || item.total_received_quantity || item.initial_quantity // This should never change
      const deliveredQuantity = item.total_delivered_quantity || 0 // Total delivered so far
      const calculatedRemainingQuantity = originalReceivedQuantity - deliveredQuantity // Proper calculation: received - delivered
      
      return {
        ...item,
        current_quantity: calculatedRemainingQuantity, // Use calculated remaining quantity
        total_received_quantity: originalReceivedQuantity,
        total_delivered_quantity: deliveredQuantity,
        initial_quantity: originalReceivedQuantity,
        original_received_quantity: originalReceivedQuantity,
        remaining_quantity: calculatedRemainingQuantity // For compatibility with frontend
      }
    }) || []

    console.log('📤 Returning response with', enrichedStockData?.length || 0, 'items')
    return NextResponse.json({
      success: true,
      data: enrichedStockData || []
    })

  } catch (error) {
    console.error('Stock API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}