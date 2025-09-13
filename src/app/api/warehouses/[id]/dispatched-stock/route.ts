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
    const { id: warehouseId } = resolvedParams
    const { searchParams } = new URL(request.url)
    const occupantId = searchParams.get('occupantId')

    console.log('🔍 Dispatched Stock API called with params:', resolvedParams)
    console.log('📊 API parameters:', { warehouseId, occupantId })

    if (!warehouseId) {
      console.log('❌ Missing warehouse ID')
      return NextResponse.json({ error: 'Warehouse ID is required' }, { status: 400 })
    }

    // Start with a basic query for dispatched stocks (only records with dispatched- prefix)
    let query = supabase
      .from('client_stock')
      .select('*')
      .eq('status', 'completed') // Only get items that have been dispatched/delivered
      .like('id', 'dispatched-%') // Only get dispatched records (not original stock records)
      .order('updated_at', { ascending: false })
      .limit(100) // Limit results for performance

    // If occupantId is provided, try to filter by occupant
    if (occupantId) {
      console.log('👤 Looking up occupant for dispatched stock:', occupantId)
      // First get the occupant details to match by name/email
      const { data: occupant, error: occupantError } = await supabase
        .from('warehouse_occupants')
        .select('name, contact_info')
        .eq('id', occupantId)
        .single()

      if (occupantError) {
        console.log('❌ Error fetching occupant for dispatched stock:', occupantError)
        console.log('⚠️ Showing all dispatched stock data instead of filtering by occupant')
      } else if (!occupant) {
        console.log('❌ Occupant not found in database for dispatched stock')
        console.log('⚠️ Showing all dispatched stock data instead of filtering by occupant')
      } else {
        console.log('✅ Found occupant for dispatched stock:', occupant)
        // Filter stock by occupant name or contact info
        query = query.or(`client_name.ilike.%${occupant.name}%,client_email.ilike.%${occupant.contact_info}%`)
        console.log('🔍 Applied occupant filter for dispatched stock:', occupant.name)
      }
    } else {
      console.log('⚠️ No occupantId provided, showing all dispatched stock data')
    }

    console.log('🔍 Executing dispatched stock query...')
    const { data: stockData, error } = await query

    if (error) {
      console.error('❌ Error with dispatched stock query, trying basic query:', error)
      // Try with the most basic query possible
      const basicQuery = supabase
        .from('client_stock')
        .select('*')
        .eq('status', 'completed')
        .like('id', 'dispatched-%') // Only get dispatched records
        .limit(50)
      
      const basicResult = await basicQuery
      const fallbackData = basicResult.data
      const fallbackError = basicResult.error
      
      if (fallbackError) {
        console.error('❌ Error with basic dispatched query:', fallbackError)
        // Return empty data instead of error
        console.log('⚠️ Returning empty dispatched stock data due to query errors')
        return NextResponse.json({
          success: true,
          data: []
        })
      } else {
        console.log('✅ Basic dispatched query successful, found:', fallbackData?.length || 0, 'items')
        const enrichedStockData = fallbackData?.map(item => ({
          ...item,
          current_quantity: 0, // Dispatched items have 0 current quantity
          total_received_quantity: item.quantity,
          total_delivered_quantity: item.quantity, // All quantity was dispatched
          initial_quantity: item.quantity
        })) || []

        console.log('📤 Returning dispatched response with', enrichedStockData?.length || 0, 'items')
        return NextResponse.json({
          success: true,
          data: enrichedStockData
        })
      }
    } else {
      console.log('✅ Dispatched stock query successful, found:', stockData?.length || 0, 'items')
    }

    // Calculate additional fields for each dispatched stock item
    const enrichedStockData = stockData?.map(item => ({
      ...item,
      current_quantity: 0, // Dispatched items have 0 current quantity
      total_received_quantity: item.quantity,
      total_delivered_quantity: item.quantity, // All quantity was dispatched
      initial_quantity: item.quantity
    })) || []

    console.log('📤 Returning dispatched response with', enrichedStockData?.length || 0, 'items')
    return NextResponse.json({
      success: true,
      data: enrichedStockData
    })

  } catch (error) {
    console.error('Dispatched Stock API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
