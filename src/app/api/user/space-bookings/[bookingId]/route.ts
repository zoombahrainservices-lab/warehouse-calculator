import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSessionFromRequest } from '@/lib/auth'

// PUT /api/user/space-bookings/[bookingId] - Update booking
export async function PUT(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
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
    const bookingId = params.bookingId
    const body = await request.json()

    const {
      areaRequested,
      expectedExitDate,
      notes,
      status
    } = body

    // First, verify the booking belongs to the user
    const { data: existingBooking, error: fetchError } = await supabase
      .from('warehouse_occupants')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found or access denied' },
        { status: 404 }
      )
    }

    // If updating area, check availability
    if (areaRequested && areaRequested !== existingBooking.space_occupied) {
      const { data: availability, error: availabilityError } = await supabase
        .rpc('calculate_warehouse_availability_for_user', {
          warehouse_uuid: existingBooking.warehouse_id,
          space_type_param: existingBooking.floor_type === 'Ground Floor' ? 'Ground Floor' : 'Mezzanine'
        })

      if (availabilityError || !availability || availability.length === 0) {
        return NextResponse.json(
          { error: 'Failed to check warehouse availability' },
          { status: 500 }
        )
      }

      const availableSpace = availability[0].available_space + existingBooking.space_occupied

      if (areaRequested > availableSpace) {
        return NextResponse.json(
          {
            error: 'Insufficient space available',
            available: availableSpace,
            requested: areaRequested
          },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    interface UpdateData {
      updated_at: string
      name?: string
      contact_info?: string
      space_occupied?: number
      floor_type?: string
      section?: string
      entry_date?: string
      expected_exit_date?: string
      status?: string
      notes?: string
      booking_status?: string
      booking_notes?: string
      modification_history?: Record<string, unknown>[]
    }

    const updateData: UpdateData = {
      updated_at: new Date().toISOString()
    }

    if (areaRequested !== undefined) updateData.space_occupied = areaRequested
    if (expectedExitDate !== undefined) updateData.expected_exit_date = expectedExitDate
    if (notes !== undefined) updateData.booking_notes = notes
    if (status !== undefined) updateData.status = status

    // Add to modification history
    const currentHistory = existingBooking.modification_history || []
    const modification = {
      action: 'modified',
      timestamp: new Date().toISOString(),
      details: {
        previous_area: existingBooking.space_occupied,
        new_area: areaRequested || existingBooking.space_occupied,
        previous_exit_date: existingBooking.expected_exit_date,
        new_exit_date: expectedExitDate || existingBooking.expected_exit_date
      }
    }

    updateData.modification_history = [...currentHistory, modification]

    // Update the booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('warehouse_occupants')
      .update(updateData)
      .eq('booking_id', bookingId)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      )
    }

    // Log activity
    await supabase
      .from('user_dashboard_activity')
      .insert({
        user_id: userId,
        activity_type: 'booking_modified',
        activity_details: {
          booking_id: bookingId,
          changes: modification.details
        }
      })

    return NextResponse.json({
      success: true,
      booking: updatedBooking
    })

  } catch (error) {
    console.error('Booking update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/user/space-bookings/[bookingId] - Cancel/Delete booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
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
    const bookingId = params.bookingId

    // First, verify the booking belongs to the user and get booking details
    const { data: existingBooking, error: fetchError } = await supabase
      .from('warehouse_occupants')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found or access denied' },
        { status: 404 }
      )
    }

    // Check if booking can be cancelled (not already completed)
    if (existingBooking.status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed booking' },
        { status: 400 }
      )
    }

    // Update booking status to cancelled
    const updateData = {
      booking_status: 'cancelled',
      status: 'cancelled',
      updated_at: new Date().toISOString(),
      modification_history: [
        ...(existingBooking.modification_history || []),
        {
          action: 'cancelled',
          timestamp: new Date().toISOString(),
          details: { reason: 'User cancelled booking' }
        }
      ]
    }

    const { data: cancelledBooking, error: updateError } = await supabase
      .from('warehouse_occupants')
      .update(updateData)
      .eq('booking_id', bookingId)
      .eq('user_id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('Error cancelling booking:', updateError)
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      )
    }

    // Remove or update associated stock items
    const { error: stockError } = await supabase
      .from('client_stock')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)
      .eq('user_id', userId)

    if (stockError) {
      console.error('Error updating associated stock:', stockError)
      // Don't fail the cancellation if stock update fails
    }

    // Log activity
    await supabase
      .from('user_dashboard_activity')
      .insert({
        user_id: userId,
        activity_type: 'booking_cancelled',
        activity_details: {
          booking_id: bookingId,
          warehouse_id: existingBooking.warehouse_id,
          space_cancelled: existingBooking.space_occupied
        }
      })

    return NextResponse.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: cancelledBooking
    })

  } catch (error) {
    console.error('Booking cancellation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
