import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSessionFromRequest } from '@/lib/auth'

// PUT /api/user/stock/[stockId] - Update stock item
export async function PUT(
  request: NextRequest,
  { params }: { params: { stockId: string } }
) {
  try {
    // Validate session
    const sessionValidation = await validateSessionFromRequest(request)
    if (!sessionValidation.isValid || !sessionValidation.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = sessionValidation.userId
    const stockId = params.stockId
    const body = await request.json()

    const {
      productName,
      productType,
      quantity,
      unit,
      description,
      areaUsed,
      status,
      section
    } = body

    // First, verify the stock item belongs to the user
    const { data: existingStock, error: fetchError } = await supabase
      .from('client_stock')
      .select('*')
      .eq('id', stockId)
      .single()

    // Check if the stock belongs to this user by checking the notes field
    if (fetchError || !existingStock) {
      return NextResponse.json(
        { error: 'Stock item not found or access denied' },
        { status: 404 }
      )
    }

    if (!existingStock.notes || !existingStock.notes.includes(`User: ${userId}`)) {
      return NextResponse.json(
        { error: 'Stock item not found or access denied' },
        { status: 404 }
      )
    }

    // If updating area, check against booking space
    if (areaUsed !== undefined && areaUsed !== existingStock.area_used) {
      // Extract booking ID from the notes field
      const bookingMatch = existingStock.notes?.match(/Booking: ([^\s,]+)/)
      const bookingId = bookingMatch ? bookingMatch[1] : null

      if (!bookingId) {
        return NextResponse.json(
          { error: 'Could not determine associated booking' },
          { status: 400 }
        )
      }

      // Find the booking in warehouse_occupants or user_bookings
      let booking = null
      const { data: userBookings, error: userBookingsError } = await supabase
        .from('user_bookings')
        .select('warehouse_occupants (space_occupied)')
        .eq('booking_id', bookingId)
        .eq('user_id', userId)

      if (!userBookingsError && userBookings && userBookings.length > 0) {
        booking = userBookings[0].warehouse_occupants as any
      } else {
        // Try warehouse_occupants notes
        const { data: occupants, error: occupantsError } = await supabase
          .from('warehouse_occupants')
          .select('space_occupied')
          .eq('status', 'active')
          .ilike('notes', `%Booking: ${bookingId}%`)

        if (!occupantsError && occupants && occupants.length > 0) {
          booking = occupants[0]
        }
      }

      if (!booking) {
        return NextResponse.json(
          { error: 'Associated booking not found or inactive' },
          { status: 400 }
        )
      }

      // Get total area used by other stock items in this booking
      const { data: otherStock, error: otherStockError } = await supabase
        .from('client_stock')
        .select('area_used')
        .ilike('notes', `%Booking: ${bookingId}%`)
        .eq('status', 'active')
        .neq('id', stockId)

      if (otherStockError) {
        console.error('❌ Error checking other stock items:', otherStockError)
        console.error('🔍 Other stock check debug info:', {
          existingStockBookingId: existingStock.booking_id,
          userId: userId,
          stockId: stockId,
          errorCode: otherStockError.code,
          errorMessage: otherStockError.message
        })

        // Try alternative approach if the column doesn't exist
        if (otherStockError.message?.includes('column') && otherStockError.message?.includes('does not exist')) {
          console.log('⚠️ booking_id column may not exist in client_stock table, skipping space validation for update')
          // Skip space validation if column doesn't exist and proceed with stock update
        } else {
          return NextResponse.json(
            { error: 'Failed to validate space availability' },
            { status: 500 }
          )
        }
      }

      const safeOtherStock = otherStock || []
      const totalOtherArea = safeOtherStock.reduce((sum, item) => sum + (item.area_used || 0), 0)
      const availableArea = booking.space_occupied - totalOtherArea

      if (areaUsed > availableArea) {
        return NextResponse.json(
          {
            error: 'Stock area exceeds available space in booking',
            available: availableArea,
            requested: areaUsed
          },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    interface StockUpdateData {
      updated_at: string
      product_name?: string
      product_type?: string
      quantity?: number
      unit?: string
      area_used?: number
      status?: string
      expected_exit_date?: string
      notes?: string
      section?: string
      storage_location?: string
    }

    const updateData: StockUpdateData = {
      updated_at: new Date().toISOString()
    }

    if (productName !== undefined) updateData.product_name = productName
    if (productType !== undefined) updateData.product_type = productType
    if (quantity !== undefined) updateData.quantity = quantity
    if (unit !== undefined) updateData.unit = unit
    if (description !== undefined) (updateData as any).description = description
    if (areaUsed !== undefined) updateData.area_used = areaUsed
    if (status !== undefined) updateData.status = status

    // Update section and storage location if section is provided
    if (section !== undefined) {
      updateData.section = section
      // Update storage location to include section
      const bookingMatch = existingStock.notes?.match(/Booking: ([^\s,]+)/)
      const bookingId = bookingMatch ? bookingMatch[1] : existingStock.booking_id || 'unknown'
      updateData.storage_location = section ? `${section} - Booking: ${bookingId}` : `Booking: ${bookingId}`

      // Update notes to include section
      const userMatch = existingStock.notes?.match(/User: ([^\s,]+)/)
      const userId = userMatch ? userMatch[1] : 'unknown'
      updateData.notes = `User: ${userId}, Booking: ${bookingId}${section ? `, Section: ${section}` : ''}`
    }

    // Update the stock item
    const { data: updatedStock, error: updateError } = await supabase
      .from('client_stock')
      .update(updateData)
      .eq('id', stockId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating stock item:', updateError)
      return NextResponse.json(
        { error: 'Failed to update stock item' },
        { status: 500 }
      )
    }

    // Log activity
    const bookingMatch = existingStock.notes?.match(/Booking: ([^\s,]+)/)
    const bookingId = bookingMatch ? bookingMatch[1] : null

    try {
      await supabase
        .from('user_dashboard_activity')
        .insert({
          user_id: userId,
          activity_type: 'stock_modified',
          activity_details: {
            stock_id: stockId,
            booking_id: bookingId,
            changes: {
              product_name: productName !== undefined ? { from: existingStock.description, to: productName } : undefined,
              quantity: quantity !== undefined ? { from: existingStock.quantity, to: quantity } : undefined,
              area_used: areaUsed !== undefined ? { from: existingStock.area_used, to: areaUsed } : undefined
            }
          }
        })
    } catch (activityError) {
      console.warn('⚠️ Could not log activity:', activityError instanceof Error ? activityError.message : String(activityError))
    }

    return NextResponse.json({
      success: true,
      stock: updatedStock
    })

  } catch (error) {
    console.error('Stock update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/user/stock/[stockId] - Delete stock item
export async function DELETE(
  request: NextRequest,
  { params }: { params: { stockId: string } }
) {
  try {
    // Validate session
    const sessionValidation = await validateSessionFromRequest(request)
    if (!sessionValidation.isValid || !sessionValidation.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = sessionValidation.userId
    const stockId = params.stockId

    // First, verify the stock item belongs to the user
    const { data: existingStock, error: fetchError } = await supabase
      .from('client_stock')
      .select('*')
      .eq('id', stockId)
      .single()

    // Check if the stock belongs to this user by checking the notes field
    if (fetchError || !existingStock) {
      return NextResponse.json(
        { error: 'Stock item not found or access denied' },
        { status: 404 }
      )
    }

    if (!existingStock.notes || !existingStock.notes.includes(`User: ${userId}`)) {
      return NextResponse.json(
        { error: 'Stock item not found or access denied' },
        { status: 404 }
      )
    }

    // Delete the stock item
    const { error: deleteError } = await supabase
      .from('client_stock')
      .delete()
      .eq('id', stockId)

    if (deleteError) {
      console.error('Error deleting stock item:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete stock item' },
        { status: 500 }
      )
    }

    // Log activity
    const bookingMatch = existingStock.notes?.match(/Booking: ([^\s,]+)/)
    const bookingId = bookingMatch ? bookingMatch[1] : null

    try {
      await supabase
        .from('user_dashboard_activity')
        .insert({
          user_id: userId,
          activity_type: 'stock_deleted',
          activity_details: {
            stock_id: stockId,
            booking_id: bookingId,
            product_name: existingStock.description || 'Stock Item',
            quantity: existingStock.quantity,
            area_used: existingStock.area_used
          }
        })
    } catch (activityError) {
      console.warn('⚠️ Could not log activity:', activityError instanceof Error ? activityError.message : String(activityError))
    }

    return NextResponse.json({
      success: true,
      message: 'Stock item deleted successfully'
    })

  } catch (error) {
    console.error('Stock deletion API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
