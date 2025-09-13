import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, stockId: string }> }
) {
  try {
    const resolvedParams = await params
    const { id: warehouseId, stockId } = resolvedParams
    const body = await request.json()
    const { status, delivery_quantity, delivery_date } = body

    if (!warehouseId || !stockId) {
      return NextResponse.json({ error: 'Warehouse ID and Stock ID are required' }, { status: 400 })
    }

    // First, get the current stock item to check quantities
    const { data: currentStock, error: fetchError } = await supabase
      .from('client_stock')
      .select('*')
      .eq('id', stockId)
      .single()

    if (fetchError || !currentStock) {
      return NextResponse.json({ error: 'Stock item not found' }, { status: 404 })
    }

    // Calculate new quantities using existing schema fields
    const deliveryQty = delivery_quantity || currentStock.current_quantity || currentStock.quantity
    const currentRemainingQty = currentStock.current_quantity || currentStock.quantity
    const originalQuantity = currentStock.quantity // This should never change
    const currentDeliveredQty = currentStock.total_delivered_quantity || 0

    // Validate delivery quantity
    if (deliveryQty <= 0) {
      return NextResponse.json({ error: 'Delivery quantity must be greater than 0' }, { status: 400 })
    }

    if (deliveryQty > currentRemainingQty) {
      return NextResponse.json({ 
        error: `Cannot deliver ${deliveryQty} ${currentStock.unit}. Only ${currentRemainingQty} ${currentStock.unit} remaining.`,
        details: {
          requestedDelivery: deliveryQty,
          remainingQuantity: currentRemainingQty,
          originalQuantity: originalQuantity,
          alreadyDelivered: currentDeliveredQty
        }
      }, { status: 400 })
    }

    // Validate that total delivered won't exceed original quantity
    const newDeliveredQty = currentDeliveredQty + deliveryQty
    if (newDeliveredQty > originalQuantity) {
      return NextResponse.json({ 
        error: `Total delivered quantity (${newDeliveredQty}) cannot exceed original quantity (${originalQuantity})`,
        details: {
          originalQuantity: originalQuantity,
          currentDelivered: currentDeliveredQty,
          requestedDelivery: deliveryQty,
          wouldResultIn: newDeliveredQty
        }
      }, { status: 400 })
    }

    const newRemainingQty = currentRemainingQty - deliveryQty
    const newStatus = newRemainingQty <= 0 ? 'completed' : 'active'

    console.log('📊 Delivery calculation:', {
      stockId,
      originalQuantity: originalQuantity,
      currentRemainingQty,
      currentDeliveredQty,
      deliveryQty,
      newRemainingQty,
      newDeliveredQty,
      newStatus,
      validationPassed: true
    })

    // Update the stock item - keep original quantity unchanged, only update current_quantity
    const { data: updatedStock, error } = await supabase
      .from('client_stock')
      .update({
        current_quantity: newRemainingQty, // Update current_quantity (remaining)
        total_delivered_quantity: newDeliveredQty, // Update total delivered
        status: newStatus,
        updated_at: new Date().toISOString(),
        notes: `${currentStock.notes || ''}[${new Date().toISOString()}] Delivered: ${deliveryQty} ${currentStock.unit}. `.trim()
      })
      .eq('id', stockId)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating stock item:', error)
    } else {
      console.log('✅ Stock item updated successfully:', updatedStock)
    }

    // Create a dispatched record for ANY delivery (partial or complete)
    const deliveryDate = delivery_date || new Date().toISOString()
    const dispatchedId = `dispatched-${stockId}-${Date.now()}`
    
    console.log('🚚 Creating dispatched record:', {
      dispatchedId,
      deliveryQty,
      deliveryDate,
      originalStockId: stockId
    })

    const { data: dispatchedRecord, error: dispatchError } = await supabase
      .from('client_stock')
      .insert({
        id: dispatchedId,
        client_name: currentStock.client_name,
        client_email: currentStock.client_email,
        client_phone: currentStock.client_phone,
        product_name: currentStock.product_name, // Add missing product_name field
        product_type: currentStock.product_type,
        quantity: deliveryQty, // This is the delivered quantity
        unit: currentStock.unit,
        description: currentStock.description,
        storage_location: currentStock.storage_location,
        space_type: currentStock.space_type,
        area_used: currentStock.area_used,
        entry_date: currentStock.entry_date,
        expected_exit_date: deliveryDate, // Use delivery date as exit date
        status: 'completed',
        notes: `Dispatched ${deliveryQty} ${currentStock.unit} from ${stockId} on ${deliveryDate}`,
        created_at: deliveryDate,
        updated_at: deliveryDate
      })
      .select()
      .single()

    if (dispatchError) {
      console.error('❌ Error creating dispatched record:', dispatchError)
    } else {
      console.log('✅ Created dispatched record successfully:', dispatchedRecord)
    }

    if (error) {
      console.error('Error updating stock delivery:', error)
      return NextResponse.json({ error: 'Failed to mark stock as delivered' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: updatedStock,
      message: 'Stock marked as delivered successfully'
    })

  } catch (error) {
    console.error('Deliver Stock API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
