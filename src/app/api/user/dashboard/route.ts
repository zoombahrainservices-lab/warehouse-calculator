import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface StockItem {
  id: string
  product_name: string
  product_type: string
  quantity: number
  unit: string
  area_used: number
  space_type: string
  status: string
  booking_id: string
  current_quantity?: number
  total_received_quantity?: number
  total_delivered_quantity?: number
  initial_quantity?: number
}

// GET /api/user/dashboard - Get user's dashboard data
export async function GET(request: NextRequest) {
  try {
    // Get user email from query parameters or headers (more reliable than ID)
    const url = new URL(request.url)
    const userEmail = url.searchParams.get('userEmail') || request.headers.get('x-user-email')
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email required' },
        { status: 400 }
      )
    }

    // Get user's data from unified_users table using email (more reliable)
    const { data: userData, error: userError } = await supabase
      .from('unified_users')
      .select('*')
      .eq('email', userEmail)
      .single()

    if (userError || !userData) {
      console.error('❌ Error fetching user data:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get user's active bookings from user_bookings and warehouse_occupants tables
    let bookings: any[] = []
    try {
      // First try to get from user_bookings table
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
        .eq('user_id', userData.id)
        .eq('booking_status', 'active')
        .order('created_at', { ascending: false })

      if (!userBookingsError && userBookings && userBookings.length > 0) {
        bookings = userBookings.map(booking => ({
          id: booking.id,
          warehouse_id: booking.warehouse_occupants?.warehouse_id,
          name: booking.warehouse_occupants?.name || userData.name,
          space_occupied: booking.warehouse_occupants?.space_occupied || booking.area_requested,
          floor_type: booking.warehouse_occupants?.floor_type || 'ground',
          status: booking.warehouse_occupants?.status || 'active',
          entry_date: booking.warehouse_occupants?.entry_date,
          expected_exit_date: booking.warehouse_occupants?.expected_exit_date,
          booking_id: booking.booking_id,
          booking_status: booking.booking_status,
          warehouse_name: booking.warehouse_occupants?.warehouses?.name || 'Unknown Warehouse',
          warehouse_location: booking.warehouse_occupants?.warehouses?.location || 'Unknown Location',
          section: booking.warehouse_occupants?.section || '',
          notes: booking.booking_notes || ''
        }))
        console.log('✅ Found bookings in user_bookings table:', bookings.length)
      } else {
        // Fallback: check warehouse_occupants table for user bookings
        console.log('🔍 Checking warehouse_occupants table for user bookings...')
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
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (!allOccupantsError && allOccupants) {
          // Filter occupants that belong to this user (check notes for user ID)
          const userOccupants = allOccupants.filter(occupant => {
            const notes = occupant.notes || ''
            return notes.includes(`USER:${userData.id}`) || 
                   occupant.contact_info === userData.email ||
                   occupant.name === userData.name
          })

          if (userOccupants.length > 0) {
            bookings = userOccupants.map(occupant => {
              const notes = occupant.notes || ''
              const bookingMatch = notes.match(/BOOKING:([^|]+)/)
              const bookingId = bookingMatch ? bookingMatch[1] : `booking-${occupant.id}`

              return {
                id: occupant.id,
                warehouse_id: occupant.warehouse_id,
                name: occupant.name,
                space_occupied: occupant.space_occupied,
                floor_type: occupant.floor_type || 'ground',
                status: occupant.status,
                entry_date: occupant.entry_date,
                expected_exit_date: occupant.expected_exit_date,
                booking_id: bookingId,
                booking_status: 'active',
                warehouse_name: occupant.warehouses?.name || 'Unknown Warehouse',
                warehouse_location: occupant.warehouses?.location || 'Unknown Location',
                section: occupant.section || '',
                notes: notes.replace(/USER:[^|]+\|BOOKING:[^|]+\|/, '').trim()
              }
            })
            console.log('✅ Found bookings in warehouse_occupants table:', bookings.length)
          }
        }
      }
    } catch (error) {
      console.error('❌ Error fetching user bookings:', error)
      bookings = []
    }

    // Get warehouse availability data - ALL users should see available warehouses (same as warehouse-selection API)
    let warehousesWithAvailability: any[] = []
    try {
      const { data: warehouses, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('status', 'active')
        .order('name')

      if (warehouses) {
        warehousesWithAvailability = await Promise.all(
          warehouses.map(async (warehouse) => {
            let groundAvailability = null
            let mezzanineAvailability = null

            try {
              // Ground floor availability - use same logic as warehouse-selection API
              const total = parseFloat(warehouse.total_space) || 0
              const occupied = parseFloat(warehouse.occupied_space) || 0
              const available = Math.max(0, total - occupied)
              const utilization = total > 0 ? (occupied / total) * 100 : 0

              groundAvailability = {
                total_space: total,
                occupied_space: occupied,
                available_space: available,
                utilization_percentage: utilization
              }
            } catch (error) {
              console.error(`Error calculating ground floor for warehouse ${warehouse.id}:`, error)
              // Fallback
              const total = parseFloat(warehouse.total_space) || 0
              const occupied = parseFloat(warehouse.occupied_space) || 0
              const available = Math.max(0, total - occupied)
              const utilization = total > 0 ? (occupied / total) * 100 : 0

              groundAvailability = {
                total_space: total,
                occupied_space: occupied,
                available_space: available,
                utilization_percentage: utilization
              }
            }

            // Mezzanine availability (if exists) - use same logic as warehouse-selection API
            if (warehouse.has_mezzanine) {
              try {
                const total = parseFloat(warehouse.mezzanine_space) || 0
                const occupied = parseFloat(warehouse.mezzanine_occupied_space) || 0
                const available = Math.max(0, total - occupied)
                const utilization = total > 0 ? (occupied / total) * 100 : 0

                mezzanineAvailability = {
                  total_space: total,
                  occupied_space: occupied,
                  available_space: available,
                  utilization_percentage: utilization
                }
              } catch (error) {
                console.error(`Error calculating mezzanine for warehouse ${warehouse.id}:`, error)
                // Fallback
                const total = parseFloat(warehouse.mezzanine_space) || 0
                const occupied = parseFloat(warehouse.mezzanine_occupied_space) || 0
                const available = Math.max(0, total - occupied)
                const utilization = total > 0 ? (occupied / total) * 100 : 0

                mezzanineAvailability = {
                  total_space: total,
                  occupied_space: occupied,
                  available_space: available,
                  utilization_percentage: utilization
                }
              }
            }

            return {
              id: warehouse.id,
              name: warehouse.name,
              location: warehouse.location,
              total_space: parseFloat(warehouse.total_space) || 0,
              has_mezzanine: warehouse.has_mezzanine || false,
              mezzanine_space: parseFloat(warehouse.mezzanine_space) || 0,
              status: warehouse.status,
              availability: {
                ground: groundAvailability,
                mezzanine: mezzanineAvailability
              }
            }
          })
        )
      }
    } catch (err) {
      console.error('❌ Error fetching warehouse availability:', err)
      warehousesWithAvailability = []
    }

    // Get user's stock items
    let stockItems: any[] = []
    try {
      const { data: stockData, error: stockError } = await supabase
        .from('stock')
        .select('*')
        .eq('user_id', userData.id) // Use the ID from the unified user data
        .order('created_at', { ascending: false })

      if (!stockError && stockData) {
        stockItems = stockData.map(item => ({
          id: item.id,
          product_name: item.product_name,
          product_type: item.product_type,
          quantity: item.quantity,
          unit: item.unit,
          area_used: item.area_used,
          space_type: item.space_type,
          status: item.status,
          booking_id: item.booking_id || '',
          current_quantity: item.current_quantity,
          total_received_quantity: item.total_received_quantity,
          total_delivered_quantity: item.total_delivered_quantity,
          initial_quantity: item.initial_quantity
        }))
      }
    } catch (err) {
      console.error('❌ Error fetching stock items:', err)
      stockItems = []
    }

    // Calculate summary
    const summary = {
      totalBookings: bookings.length,
      totalStockItems: stockItems.length,
      totalAreaUsed: userData.space_occupied || 0,
      totalStockValue: stockItems.reduce((sum, item) => sum + (item.quantity * 0), 0) // Placeholder for stock value
    }

    // Create dashboard data
    const dashboardData = {
      userId: userData.id, // Use the ID from the unified user data
      summary,
      bookings,
      stock: stockItems,
      warehouses: warehousesWithAvailability,
      preferences: {
        selected_warehouse_id: userData.warehouse_id,
        default_space_type: userData.floor_type || 'ground',
        preferences: {}
      },
      recentActivity: []
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('❌ Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/user/dashboard - Update user preferences
export async function POST(request: NextRequest) {
  try {
    // Get user email from query parameters or headers (more reliable than ID)
    const url = new URL(request.url)
    const userEmail = url.searchParams.get('userEmail') || request.headers.get('x-user-email')
    
    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    const { selectedWarehouseId, defaultSpaceType, preferences } = body

    // First get the user ID from unified_users table using email
    const { data: userData, error: userError } = await supabase
      .from('unified_users')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update or create user preferences
    const { data, error } = await supabase
      .from('user_warehouse_preferences')
      .upsert({
        user_id: userData.id, // Use the ID from unified_users table
        selected_warehouse_id: selectedWarehouseId || null,
        default_space_type: defaultSpaceType || 'Ground Floor',
        preferences: preferences || {},
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating warehouse preferences:', error)
      return NextResponse.json(
        { error: 'Failed to update warehouse preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      preferences: data
    })

  } catch (error) {
    console.error('Dashboard POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


