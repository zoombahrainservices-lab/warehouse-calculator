import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(
  request: NextRequest,
  { params }: { params: { occupantId: string } }
) {
  try {
    const { occupantId } = params

    if (!occupantId) {
      return NextResponse.json({ error: 'Occupant ID is required' }, { status: 400 })
    }

    // First, get the occupant details
    const { data: occupant, error: occupantError } = await supabase
      .from('warehouse_occupants')
      .select(`
        *,
        warehouses (
          id,
          name,
          location
        )
      `)
      .eq('id', occupantId)
      .single()

    if (occupantError || !occupant) {
      console.error('Error fetching occupant:', occupantError)
      return NextResponse.json({ error: 'Occupant not found' }, { status: 404 })
    }

    // Get stock data for this occupant
    // We'll look for stock items that match the occupant's client information
    const { data: stockData, error: stockError } = await supabase
      .from('client_stock')
      .select('*')
      .or(`client_name.ilike.%${occupant.name}%,client_email.ilike.%${occupant.contact_info}%`)
      .order('entry_date', { ascending: false })

    if (stockError) {
      console.error('Error fetching stock data:', stockError)
      return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 })
    }

    // Calculate stock summary
    const totalItems = stockData?.length || 0
    const totalReceived = stockData?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
    const totalDelivered = stockData?.filter(item => item.status === 'completed')
      .reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
    const totalLeft = totalReceived - totalDelivered

    // Group stock by product for better organization
    const stockByProduct = stockData?.reduce((acc, item) => {
      const productKey = `${item.description}_${item.product_type}`
      if (!acc[productKey]) {
        acc[productKey] = {
          product_name: item.description,
          product_type: item.product_type,
          unit: item.unit,
          total_received: 0,
          total_delivered: 0,
          total_left: 0,
          items: []
        }
      }
      
      acc[productKey].total_received += item.quantity || 0
      if (item.status === 'completed') {
        acc[productKey].total_delivered += item.quantity || 0
      }
      acc[productKey].items.push(item)
      
      return acc
    }, {} as Record<string, any>) || {}

    // Calculate total left for each product
    Object.values(stockByProduct).forEach((product: any) => {
      product.total_left = product.total_received - product.total_delivered
    })

    // Get recent stock movements (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentMovements = stockData?.filter(item => 
      new Date(item.entry_date) >= thirtyDaysAgo
    ) || []

    // Calculate daily movements
    const dailyMovements = recentMovements.reduce((acc, item) => {
      const date = item.entry_date
      if (!acc[date]) {
        acc[date] = {
          date,
          received: 0,
          delivered: 0,
          items: []
        }
      }
      
      acc[date].received += item.quantity || 0
      if (item.status === 'completed') {
        acc[date].delivered += item.quantity || 0
      }
      acc[date].items.push(item)
      
      return acc
    }, {} as Record<string, any>)

    const dailyMovementsArray = Object.values(dailyMovements)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      success: true,
      data: {
        occupant,
        stockData,
        stockByProduct: Object.values(stockByProduct),
        summary: {
          totalItems,
          totalReceived,
          totalDelivered,
          totalLeft
        },
        recentMovements: dailyMovementsArray.slice(0, 10), // Last 10 days
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Occupant stock API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
