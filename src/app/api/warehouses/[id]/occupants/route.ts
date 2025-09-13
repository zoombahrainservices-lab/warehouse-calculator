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

    // Get occupants for this warehouse
    const { data: occupants, error } = await supabase
      .from('warehouse_occupants')
      .select('*')
      .eq('warehouse_id', warehouseId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching occupants:', error)
      return NextResponse.json({ error: 'Failed to fetch occupants' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: occupants || []
    })

  } catch (error) {
    console.error('Occupants API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
