import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { validateSessionFromRequest } from '@/lib/auth'

// GET /api/user/warehouse-selection - Get available warehouses with availability
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

    // Get all active warehouses
    const { data: warehouses, error: warehousesError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('status', 'active')
      .order('name')

    if (warehousesError) {
      console.error('Error fetching warehouses:', warehousesError)
      return NextResponse.json(
        { error: 'Failed to fetch warehouses' },
        { status: 500 }
      )
    }

    // Get user's current preferences
    const { data: preferences, error: preferencesError } = await supabase
      .from('user_warehouse_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (preferencesError && preferencesError.code !== 'PGRST116') {
      console.error('Error fetching user preferences:', preferencesError)
    }

    // Calculate availability for each warehouse
    const warehousesWithAvailability = await Promise.all(
      (warehouses || []).map(async (warehouse) => {
        let groundAvailability = null
        let mezzanineAvailability = null

        try {
          // Ground floor availability
          let groundData = null;
          let groundError = null;

          try {
            const result = await supabase
              .rpc('calculate_warehouse_availability_for_user', {
                warehouse_uuid: warehouse.id,
                space_type_param: 'Ground Floor'
              });
            groundData = result.data;
            groundError = result.error;
          } catch (rpcError) {
            groundError = { message: 'Function call failed' };
          }

          if (!groundError && groundData && groundData.length > 0) {
            groundAvailability = groundData[0]
          } else {
            // Manual calculation fallback - use database values directly
            console.warn(`Ground floor calculation failed for warehouse ${warehouse.id}, using manual fallback:`, groundError?.message)

            const total = parseFloat(warehouse.total_space) || 0;
            const occupied = parseFloat(warehouse.occupied_space) || 0;
            const available = Math.max(0, total - occupied);
            const utilization = total > 0 ? (occupied / total) * 100 : 0;

            console.log(`Manual calculation for ${warehouse.name}:`, {
              total, occupied, available, utilization,
              source: 'database_values'
            });

            groundAvailability = {
              total_space: total,
              occupied_space: occupied,
              available_space: available,
              utilization_percentage: utilization
            }
          }
        } catch (error) {
          console.error(`Error calculating ground floor for warehouse ${warehouse.id}:`, error)
          // Final fallback
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

        // Mezzanine availability (if exists)
        if (warehouse.has_mezzanine) {
          try {
            let mezzData = null;
            let mezzError = null;

            try {
              const result = await supabase
                .rpc('calculate_warehouse_availability_for_user', {
                  warehouse_uuid: warehouse.id,
                  space_type_param: 'Mezzanine'
                });
              mezzData = result.data;
              mezzError = result.error;
            } catch (rpcError) {
              mezzError = { message: 'Function call failed' };
            }

            if (!mezzError && mezzData && mezzData.length > 0) {
              mezzanineAvailability = mezzData[0]
            } else {
              // Manual calculation fallback - use database values directly
              console.warn(`Mezzanine calculation failed for warehouse ${warehouse.id}, using manual fallback:`, mezzError?.message)

              const total = parseFloat(warehouse.mezzanine_space) || 0;
              const occupied = parseFloat(warehouse.mezzanine_occupied) || 0;
              const available = Math.max(0, total - occupied);
              const utilization = total > 0 ? (occupied / total) * 100 : 0;

              console.log(`Manual mezzanine calculation for ${warehouse.name}:`, {
                total, occupied, available, utilization,
                source: 'database_values'
              });

              mezzanineAvailability = {
                total_space: total,
                occupied_space: occupied,
                available_space: available,
                utilization_percentage: utilization
              }
            }
          } catch (error) {
            console.error(`Error calculating mezzanine for warehouse ${warehouse.id}:`, error)
            // Final fallback - use database values directly
            const total = parseFloat(warehouse.mezzanine_space) || 0
            const occupied = parseFloat(warehouse.mezzanine_occupied) || 0
            const available = Math.max(0, total - occupied)
            const utilization = total > 0 ? (occupied / total) * 100 : 0

            console.log(`Final mezzanine fallback for ${warehouse.name}:`, {
              total, occupied, available, utilization
            });

            mezzanineAvailability = {
              total_space: total,
              occupied_space: occupied,
              available_space: available,
              utilization_percentage: utilization
            }
          }
        }

        return {
          ...warehouse,
          availability: {
            ground: groundAvailability,
            mezzanine: mezzanineAvailability
          }
        }
      })
    )

    return NextResponse.json({
      warehouses: warehousesWithAvailability,
      userPreferences: preferences || null
    })

  } catch (error) {
    console.error('Warehouse selection API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/user/warehouse-selection - Update user's warehouse selection
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

    const { selectedWarehouseId, defaultSpaceType, preferences } = body

    // Validate that the selected warehouse exists and is active
    if (selectedWarehouseId) {
      const { data: warehouse, error: warehouseError } = await supabase
        .from('warehouses')
        .select('id, name, status')
        .eq('id', selectedWarehouseId)
        .eq('status', 'active')
        .single()

      if (warehouseError || !warehouse) {
        return NextResponse.json(
          { error: 'Selected warehouse not found or inactive' },
          { status: 400 }
        )
      }
    }

    // Update or create user preferences
    const { data, error } = await supabase
      .from('user_warehouse_preferences')
      .upsert({
        user_id: userId,
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

    // Log activity
    await supabase
      .from('user_dashboard_activity')
      .insert({
        user_id: userId,
        activity_type: 'warehouse_selection',
        activity_details: {
          selected_warehouse_id: selectedWarehouseId,
          default_space_type: defaultSpaceType
        }
      })

    return NextResponse.json({
      success: true,
      preferences: data
    })

  } catch (error) {
    console.error('Warehouse selection POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
