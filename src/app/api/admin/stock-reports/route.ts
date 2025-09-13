import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const clientName = searchParams.get('clientName')
    const productType = searchParams.get('productType')
    const status = searchParams.get('status')

    // Build the query
    let query = supabase
      .from('client_stock')
      .select('*')
      .order('entry_date', { ascending: false })

    // Apply filters
    if (dateFrom) {
      query = query.gte('entry_date', dateFrom)
    }
    if (dateTo) {
      query = query.lte('entry_date', dateTo)
    }
    if (clientName) {
      query = query.ilike('client_name', `%${clientName}%`)
    }
    if (productType) {
      query = query.eq('product_type', productType)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data: stockData, error } = await query

    if (error) {
      console.error('Error fetching stock data:', error)
      return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 })
    }

    // Get today's date for calculations
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    // Calculate summary statistics
    const summary = {
      totalItems: stockData?.length || 0,
      totalQuantity: stockData?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
      totalAreaUsed: stockData?.reduce((sum, item) => sum + (item.area_used || 0), 0) || 0,
      todayReceived: stockData?.filter(item => item.entry_date === today).length || 0,
      todayReceivedQuantity: stockData?.filter(item => item.entry_date === today)
        .reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
      yesterdayReceived: stockData?.filter(item => item.entry_date === yesterday).length || 0,
      yesterdayReceivedQuantity: stockData?.filter(item => item.entry_date === yesterday)
        .reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
      todayDelivered: stockData?.filter(item => item.actual_exit_date === today).length || 0,
      todayDeliveredQuantity: stockData?.filter(item => item.actual_exit_date === today)
        .reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
      activeItems: stockData?.filter(item => item.status === 'active').length || 0,
      completedItems: stockData?.filter(item => item.status === 'completed').length || 0,
      pendingItems: stockData?.filter(item => item.status === 'pending').length || 0
    }

    // Group by date for daily reports
    const dailyReports = stockData?.reduce((acc, item) => {
      const date = item.entry_date
      if (!acc[date]) {
        acc[date] = {
          date,
          received: 0,
          receivedQuantity: 0,
          delivered: 0,
          deliveredQuantity: 0,
          items: []
        }
      }
      
      if (item.entry_date === date) {
        acc[date].received += 1
        acc[date].receivedQuantity += item.quantity || 0
      }
      
      if (item.actual_exit_date === date) {
        acc[date].delivered += 1
        acc[date].deliveredQuantity += item.quantity || 0
      }
      
      acc[date].items.push(item)
      return acc
    }, {} as Record<string, any>) || {}

    // Convert to array and sort by date
    const dailyReportsArray = Object.values(dailyReports)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Group by client
    const clientReports = stockData?.reduce((acc, item) => {
      const clientName = item.client_name
      if (!acc[clientName]) {
        acc[clientName] = {
          client_name: clientName,
          client_email: item.client_email,
          totalItems: 0,
          totalQuantity: 0,
          totalAreaUsed: 0,
          activeItems: 0,
          completedItems: 0,
          items: []
        }
      }
      
      acc[clientName].totalItems += 1
      acc[clientName].totalQuantity += item.quantity || 0
      acc[clientName].totalAreaUsed += item.area_used || 0
      if (item.status === 'active') acc[clientName].activeItems += 1
      if (item.status === 'completed') acc[clientName].completedItems += 1
      acc[clientName].items.push(item)
      
      return acc
    }, {} as Record<string, any>) || {}

    const clientReportsArray = Object.values(clientReports)
      .sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)

    return NextResponse.json({
      success: true,
      data: {
        stockData,
        summary,
        dailyReports: dailyReportsArray,
        clientReports: clientReportsArray
      }
    })

  } catch (error) {
    console.error('Stock reports API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
