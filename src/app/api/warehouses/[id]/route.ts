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

    if (!warehouseId) {
      return NextResponse.json({ error: 'Warehouse ID is required' }, { status: 400 })
    }

    // Get warehouse details
    const { data: warehouse, error } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', warehouseId)
      .single()

    if (error) {
      console.error('Error fetching warehouse:', error)
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: warehouse
    })

  } catch (error) {
    console.error('Warehouse API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
