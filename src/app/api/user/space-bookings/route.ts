import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSessionFromRequest } from '@/lib/auth'

// GET /api/user/space-bookings - Get user's space bookings
export async function GET(request: NextRequest) {
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

    // Get user's bookings - use a more robust approach
    let bookings = []
    const bookingsError = null

    try {
      // First try to get from user_bookings table
      console.log('🔍 Checking user_bookings table...')
      const { data: userBookings, error: userBookingsError } = await supabase
        .from('user_bookings')
        .select(`
          *,
          warehouse_occupants (
            id,
            warehouse_id,
            name,
            contact_info,
            space_occupied,
            floor_type,
            entry_date,
            expected_exit_date,
            status,
            notes,
            warehouses (
              id,
              name,
              location,
              total_space,
              has_mezzanine,
              mezzanine_space,
              status
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!userBookingsError && userBookings && userBookings.length > 0) {
        // Format the data to match expected structure
        bookings = userBookings.map(booking => ({
          ...booking.warehouse_occupants,
          booking_id: booking.booking_id,
          booking_status: booking.booking_status,
          booking_notes: booking.booking_notes,
          area_requested: booking.area_requested,
          duration_months: booking.duration_months,
          modification_history: booking.modification_history,
          user_booking_id: booking.id,
          section: booking.warehouse_occupants?.section || '' // Include section field
        }))
        console.log('✅ Retrieved bookings from user_bookings table:', bookings.length)
      } else {
        // Fallback: Check warehouse_occupants for user bookings stored in notes
        console.log('⚠️ No user_bookings found, checking warehouse_occupants notes...')

        try {
          const { data: allOccupants, error: allOccupantsError } = await supabase
            .from('warehouse_occupants')
            .select(`
              *,
              warehouses (
                id,
                name,
                location,
                total_space,
                has_mezzanine,
                mezzanine_space,
                status
              )
            `)
            .order('created_at', { ascending: false })

          if (!allOccupantsError && allOccupants) {
            // Filter occupants that belong to this user (stored in notes field)
            const userOccupants = allOccupants.filter(occupant => {
              if (occupant.notes && typeof occupant.notes === 'string') {
                // Check if notes contain USER:userId pattern
                const userPattern = `USER:${userId}`
                return occupant.notes.includes(userPattern)
              }
              return false
            })

            if (userOccupants.length > 0) {
              // Parse booking info from notes and format properly
              bookings = userOccupants.map(occupant => {
                const notes = occupant.notes || ''
                const bookingMatch = notes.match(/BOOKING:([^|]+)/)
                const bookingId = bookingMatch ? bookingMatch[1] : `booking-${occupant.id}`

                return {
                  ...occupant,
                  booking_id: bookingId,
                  booking_status: 'active',
                  booking_notes: notes.replace(/USER:[^|]+\|BOOKING:[^|]+\|/, ''), // Remove user/booking prefixes
                  area_requested: occupant.space_occupied,
                  duration_months: null, // Not available in notes
                  modification_history: [],
                  user_booking_id: null,
                  section: occupant.section || '' // Include section field
                }
              })
              console.log('✅ Found user bookings in warehouse_occupants notes:', bookings.length)
            } else {
              bookings = []
              console.log('ℹ️ No user bookings found in warehouse_occupants notes')
            }
          } else {
            bookings = []
            console.log('⚠️ Could not fetch warehouse_occupants:', allOccupantsError?.message)
          }
        } catch (occupantError) {
          console.log('⚠️ Error fetching warehouse_occupants:', occupantError instanceof Error ? occupantError.message : String(occupantError))
          bookings = []
        }
      }
    } catch (error) {
      console.error('❌ Error in booking retrieval logic:', error)
      bookings = []
    }

    if (bookingsError) {
      console.error('Error fetching user bookings:', bookingsError)
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      )
    }

    console.log('📊 Final bookings result:', {
      count: bookings.length,
      bookings: bookings.map(b => ({
        id: b.id,
        warehouse: b.warehouses?.name,
        space: b.space_occupied,
        status: b.status
      }))
    })

    return NextResponse.json({
      bookings: bookings || []
    })

  } catch (error) {
    console.error('Space bookings API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/user/space-bookings - Create new space booking
export async function POST(request: NextRequest) {
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
    const body = await request.json()

    const {
      warehouseId,
      spaceType,
      areaRequested,
      durationMonths,
      entryDate,
      expectedExitDate,
      section,
      notes
    } = body

    // Validate required fields
    if (!warehouseId || !spaceType || !areaRequested || !entryDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get warehouse data first (always needed for validation)
    console.log('Fetching warehouse data...');
    const { data: warehouse, error: warehouseError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', warehouseId)
      .single();

    console.log('Warehouse query result:', { warehouse, warehouseError });

    if (warehouseError || !warehouse) {
      console.error('Warehouse not found:', { warehouseId, warehouseError });
      return NextResponse.json(
        { error: `Warehouse not found: ${warehouseId}` },
        { status: 404 }
      );
    }

    // Check warehouse availability
    console.log('Checking availability for:', { warehouseId, spaceType, areaRequested })

    let availability = null;
    let availabilityError = null;

    try {
      const result = await supabase
        .rpc('calculate_warehouse_availability_for_user', {
          warehouse_uuid: warehouseId,
          space_type_param: spaceType
        });

      availability = result.data;
      availabilityError = result.error;

      console.log('Availability result:', { availability, availabilityError })

    } catch (functionError) {
      console.error('Function call exception:', functionError);
      availabilityError = { message: 'Function not found or execution failed' };
    }

    // If function fails, try to calculate manually
    if (availabilityError || !availability || availability.length === 0) {
      console.warn('Function failed, using manual calculation as fallback');
      console.log('Warehouse ID:', warehouseId, 'Space Type:', spaceType);

      try {
        // Use database values directly for reliable calculation
        const totalSpace = spaceType === 'Ground Floor'
          ? (warehouse.total_space || 0)
          : (warehouse.mezzanine_space || 0);

        const occupiedSpace = spaceType === 'Ground Floor'
          ? (warehouse.occupied_space || 0)
          : (warehouse.mezzanine_occupied || 0);

        const availableSpace = Math.max(0, totalSpace - occupiedSpace);
        const utilization = totalSpace > 0 ? (occupiedSpace / totalSpace) * 100 : 0;

        console.log('Database-based calculation:', {
          warehouseId,
          spaceType,
          totalSpace,
          occupiedSpace,
          availableSpace,
          utilization,
          source: 'warehouse_table'
        });

        availability = [{
          total_space: totalSpace,
          occupied_space: occupiedSpace,
          available_space: availableSpace,
          utilization_percentage: utilization
        }];

        console.log('✅ Database calculation successful:', availability[0]);

      } catch (manualError) {
        console.error('❌ Database calculation failed:', manualError);
        if (manualError instanceof Error) {
          console.error('Error stack:', manualError.stack);
          return NextResponse.json(
            { error: `Failed to check warehouse availability: ${manualError.message}` },
            { status: 500 }
          );
        } else {
          return NextResponse.json(
            { error: 'Failed to check warehouse availability: Unknown error' },
            { status: 500 }
          );
        }
      }
    }

    const availableSpace = availability[0].available_space

    // Validation same as admin system
    if (areaRequested > availableSpace) {
      const excess = areaRequested - availableSpace;
      return NextResponse.json(
        {
          error: `${spaceType} space exceeded! Available: ${availableSpace.toLocaleString()} m², Requested: ${areaRequested.toLocaleString()} m²`,
          available: availableSpace,
          requested: areaRequested,
          excess: excess
        },
        { status: 400 }
      )
    }

    // Validate minimum space
    if (areaRequested <= 0) {
      return NextResponse.json(
        { error: 'Space occupied must be greater than 0 m²' },
        { status: 400 }
      )
    }

    // Validate maximum space (can't exceed warehouse total)
    const maxAllowed = spaceType === 'Ground Floor' ? warehouse.total_space : warehouse.mezzanine_space;
    if (areaRequested > maxAllowed) {
      return NextResponse.json(
        {
          error: `Space occupied (${areaRequested.toLocaleString()} m²) cannot exceed warehouse total space (${maxAllowed.toLocaleString()} m²)`
        },
        { status: 400 }
      )
    }

    // Generate booking ID
    const bookingId = `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Get user details for occupant name with comprehensive fallback
    let occupantName = 'New Occupant';
    let occupantEmail = '';

    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')  // Get all fields to ensure we have user data
        .eq('id', userId)
        .single()

      if (user) {
        // Priority order for user name extraction
        if (user.first_name && user.last_name) {
          // Best: First name + Last name
          occupantName = `${user.first_name.trim()} ${user.last_name.trim()}`.trim();
          console.log('✅ Using first_name + last_name:', occupantName);
        } else if (user.name && user.name.trim()) {
          // Good: Full name field
          occupantName = user.name.trim();
          console.log('✅ Using name field:', occupantName);
        } else if (user.first_name && user.first_name.trim()) {
          // Okay: Just first name
          occupantName = user.first_name.trim();
          console.log('⚠️ Using only first_name:', occupantName);
        } else if (user.username && user.username.trim()) {
          // Last resort: Username
          occupantName = user.username.trim();
          console.log('⚠️ Using username as fallback:', occupantName);
        } else if (user.email && user.email.trim()) {
          // Emergency: Email as name (not ideal but better than generic)
          const emailName = user.email.split('@')[0];
          occupantName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
          console.log('⚠️ Using email as name fallback:', occupantName);
        }

        // Ensure we have a valid email
        occupantEmail = user.email || '';

        console.log('📋 Final user details:', {
          userId,
          occupantName,
          occupantEmail,
          nameSource: user.first_name && user.last_name ? 'first+last' :
                     user.name ? 'name' :
                     user.first_name ? 'first_only' :
                     user.username ? 'username' : 'email_fallback'
        });

      } else {
        console.warn('❌ User not found in database for ID:', userId);
      }

    } catch (error) {
      console.error('❌ Failed to fetch user details:', error);
      // Continue with fallback values to avoid breaking the booking
      console.log('⚠️ Using fallback occupant name due to error');
    }

    // Final validation - ensure we have a reasonable name
    if (!occupantName || occupantName === 'New Occupant') {
      occupantName = `User ${userId.slice(0, 8)}`; // Use partial user ID as fallback
      console.log('⚠️ Using user ID as final fallback for occupant name');
    }

    // Create the booking using the same structure as admin system
    // Try to include user_id, but handle gracefully if column doesn't exist
    interface BookingData {
      id: string
      warehouse_id: string
      name: string
      contact_info: string
      space_occupied: number
      floor_type: string
      section: string
      entry_date: string
      expected_exit_date?: string
      status: string
      notes: string
      created_at: string
      updated_at: string
      user_id?: string
      booking_id?: string
      booking_status?: string
      booking_notes?: string
      modification_history?: Record<string, unknown>[]
    }

    const bookingData: BookingData = {
      id: crypto.randomUUID(),
      warehouse_id: warehouseId,
      name: occupantName,
      contact_info: occupantEmail,
      space_occupied: areaRequested,
      floor_type: spaceType === 'Ground Floor' ? 'ground' : 'mezzanine', // Convert to database format
      section: section || '',
      entry_date: entryDate,
      expected_exit_date: expectedExitDate || '',
      status: 'active',
      notes: notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Try to add user_id if the column exists
    try {
      const { error: columnCheckError } = await supabase
        .from('warehouse_occupants')
        .select('user_id')
        .limit(1)

      if (!columnCheckError) {
        bookingData.user_id = userId
        console.log('✅ user_id column exists, including in booking data')
      } else {
        console.log('⚠️ user_id column not found, proceeding without it')
      }
    } catch (columnError) {
      console.log('⚠️ Could not check user_id column, proceeding without it:', columnError instanceof Error ? columnError.message : String(columnError))
    }

    console.log('Creating occupant record with data:', bookingData)

    const { data: newOccupant, error: occupantError } = await supabase
      .from('warehouse_occupants')
      .insert([bookingData])
      .select()
      .single()

    console.log('Occupant creation result:', { newOccupant, occupantError })

    if (occupantError) {
      console.error('❌ Error creating occupant:', occupantError)
      console.error('❌ Occupant error details:', {
        code: occupantError.code,
        message: occupantError.message,
        details: occupantError.details,
        hint: occupantError.hint
      })
      console.error('❌ Failed occupant data:', bookingData)

      // Provide more specific error messages
      let userFriendlyMessage = 'Failed to create booking';
      if (occupantError.code === '23505') {
        userFriendlyMessage = 'This booking already exists';
      } else if (occupantError.code === '23503') {
        userFriendlyMessage = 'Invalid warehouse or user reference';
      } else if (occupantError.message.includes('floor_type')) {
        userFriendlyMessage = 'Invalid floor type specified';
      } else if (occupantError.message.includes('column')) {
        userFriendlyMessage = 'Database schema issue - required columns not found';
      }

      return NextResponse.json(
        { error: `${userFriendlyMessage}: ${occupantError.message}` },
        { status: 500 }
      )
    }

    // Create user booking record to link user to occupant
    // Use notes field to store user identifier if user_id column doesn't exist
    const userBookingData = {
      id: crypto.randomUUID(),
      user_id: userId,
      occupant_id: newOccupant.id,
      booking_id: bookingId,
      booking_status: 'active',
      booking_notes: notes || '',
      area_requested: areaRequested,
      duration_months: durationMonths,
      occupant_name: occupantName, // Store the user's name for reference
      occupant_email: occupantEmail, // Store the user's email for reference
      modification_history: [{
        action: 'created',
        timestamp: new Date().toISOString(),
        details: {
          area_requested: areaRequested,
          duration_months: durationMonths,
          section: section || '',
          user_name: occupantName,
          user_email: occupantEmail
        }
      }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Also update the occupant record with user info in notes if user_id column doesn't exist
    if (!bookingData.user_id) {
      console.log('⚠️ user_id column not available, storing user info in occupant notes')
      const updatedNotes = `USER:${userId}|BOOKING:${bookingId}|${bookingData.notes || ''}`.trim()

      try {
        await supabase
          .from('warehouse_occupants')
          .update({ notes: updatedNotes })
          .eq('id', newOccupant.id)
        console.log('✅ User info stored in occupant notes')
      } catch (updateError) {
        console.warn('⚠️ Could not update occupant notes:', updateError)
      }
    }

    // Try to create user_bookings table if it doesn't exist
    try {
      const { error: createTableError } = await supabase.rpc('create_user_bookings_table')
      if (createTableError && !createTableError.message?.includes('already exists')) {
        console.warn('Could not create user_bookings table:', createTableError)
      }
    } catch (tableError) {
      console.warn('Table creation check failed:', tableError)
    }

    // Insert user booking record
    try {
      const { error: userBookingError } = await supabase
        .from('user_bookings')
        .insert([userBookingData])

      if (userBookingError) {
        console.warn('⚠️ Could not create user booking record:', userBookingError)
        console.log('User booking data that failed:', userBookingData)
      } else {
        console.log('✅ User booking record created successfully')
      }
    } catch (userBookingError) {
      console.warn('⚠️ User booking creation failed:', userBookingError)
    }

    // Update unified_users table to reflect the booking
    try {
      console.log('🔄 Updating unified_users table with booking information...')
      const { error: unifiedUpdateError } = await supabase
        .from('unified_users')
        .update({
          warehouse_id: warehouseId,
          space_occupied: areaRequested,
          floor_type: spaceType === 'Ground Floor' ? 'ground' : 'mezzanine',
          warehouse_status: 'active',
          entry_date: entryDate,
          expected_exit_date: expectedExitDate || '',
          section: section || '',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (unifiedUpdateError) {
        console.warn('⚠️ Could not update unified_users table:', unifiedUpdateError)
      } else {
        console.log('✅ Updated unified_users table with booking information')
      }
    } catch (unifiedError) {
      console.warn('⚠️ Unified users update failed:', unifiedError)
    }

    // Update warehouse occupancy (same as admin system)
    try {
      console.log('Updating warehouse occupancy...')

      if (spaceType === 'Ground Floor') {
        const newOccupiedSpace = (warehouse.occupied_space || 0) + areaRequested;
        const { error: updateError } = await supabase
          .from('warehouses')
          .update({
            occupied_space: newOccupiedSpace,
            updated_at: new Date().toISOString()
          })
          .eq('id', warehouseId);

        if (updateError) {
          console.error('Error updating ground floor occupancy:', updateError);
          console.error('Update details:', { warehouseId, areaRequested, newOccupiedSpace });
        } else {
          console.log(`✅ Updated ground floor occupancy: ${(warehouse.occupied_space || 0)} → ${newOccupiedSpace}m² (+${areaRequested}m²)`);
        }
      } else {
        // Mezzanine
        const newMezzanineOccupied = (warehouse.mezzanine_occupied || 0) + areaRequested;
        const { error: updateError } = await supabase
          .from('warehouses')
          .update({
            mezzanine_occupied: newMezzanineOccupied,
            updated_at: new Date().toISOString()
          })
          .eq('id', warehouseId);

        if (updateError) {
          console.error('Error updating mezzanine occupancy:', updateError);
          console.error('Update details:', { warehouseId, areaRequested, newMezzanineOccupied });
        } else {
          console.log(`✅ Updated mezzanine occupancy: ${(warehouse.mezzanine_occupied || 0)} → ${newMezzanineOccupied}m² (+${areaRequested}m²)`);
        }
      }
    } catch (updateError) {
      console.error('Error updating warehouse occupancy:', updateError);
      console.error('Update error details:', {
        warehouseId,
        spaceType,
        areaRequested,
        warehouseOccupiedSpace: warehouse.occupied_space,
        warehouseMezzanineOccupied: warehouse.mezzanine_occupied
      });
      // Don't fail the booking for occupancy update errors
    }

    // Log activity (don't fail booking if this fails)
    try {
      // Check if user_dashboard_activity table exists
      const { error: tableCheckError } = await supabase
        .from('user_dashboard_activity')
        .select('id')
        .limit(1);

      if (!tableCheckError) {
        // Table exists, log the activity
        const { error: activityInsertError } =         await supabase
          .from('user_dashboard_activity')
          .insert({
            user_id: userId,
            activity_type: 'space_booked',
            description: `Booked ${areaRequested.toLocaleString()} m² in ${warehouse.name} (${spaceType}${section ? ` - Section: ${section}` : ''})`,
            metadata: {
              warehouse_id: warehouseId,
              warehouse_name: warehouse.name,
              space_type: spaceType,
              section: section || '',
              area_booked: areaRequested,
              duration_months: durationMonths,
              booking_id: bookingId,
              occupant_id: newOccupant.id
            },
            created_at: new Date().toISOString()
          });

        if (activityInsertError) {
          console.warn('Failed to insert activity log:', activityInsertError);
        } else {
          console.log('✅ Activity logged successfully');
        }
      } else {
        console.log('⚠️ user_dashboard_activity table not found, skipping activity logging');
      }
    } catch (activityError) {
      console.warn('Failed to log activity, but booking succeeded:', activityError);
      // Don't fail the booking for activity logging errors
    }

    return NextResponse.json({
      success: true,
      booking: newOccupant,
      bookingId,
      occupantId: newOccupant.id
    })

  } catch (error) {
    console.error('Space booking POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
