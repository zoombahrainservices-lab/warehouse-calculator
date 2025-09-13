import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function GET(request: NextRequest) {
  try {
    // For now, we'll use a simplified approach - you can enhance this later
    // In a real implementation, you'd properly validate the session
    
    // Check if we can find any user with SUPPORT role
    const { data: supportUsers, error: userError } = await supabase
      .from('users')
      .select('id, role, is_active')
      .in('role', ['SUPPORT', 'MANAGER', 'ADMIN'])
      .eq('is_active', true)
      .limit(1)

    if (userError || !supportUsers || supportUsers.length === 0) {
      console.log('❌ No valid support users found')
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const supportUser = supportUsers[0]
    if (!supportUser.is_active) {
      console.log('❌ User account is inactive')
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if user has SUPPORT role or higher
    if (!['SUPPORT', 'MANAGER', 'ADMIN'].includes(supportUser.role)) {
      console.log('❌ Insufficient permissions')
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    console.log('✅ SUPPORT user authenticated, fetching user data...')

    // SIMPLIFIED: Fetch all USER role users with their warehouse data from unified table
    const { data: users, error: usersError } = await supabase
      .from('unified_users')
      .select(`
        id,
        email,
        name,
        role,
        is_active,
        warehouse_id,
        space_occupied,
        floor_type,
        entry_date,
        expected_exit_date,
        warehouse_status,
        created_at
      `)
      .eq('role', 'USER')
      .eq('is_active', true)
      .order('name')

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    console.log(`📊 Found ${users?.length || 0} regular users from unified table`)

    // Get warehouse information for better display
    let warehousesData: any[] = []
    try {
      const { data: warehouses, error: warehousesError } = await supabase
        .from('warehouses')
        .select('id, name, location, total_space, has_mezzanine, mezzanine_space')
      
      if (warehousesError) {
        console.log('warehouses table access error, continuing...')
      } else {
        warehousesData = warehouses || []
        console.log(`🏭 Found ${warehousesData.length} warehouses`)
      }
    } catch (error) {
      console.log('warehouses table access error, continuing...')
    }

    // Process data to create user space summary (MUCH SIMPLER NOW!)
    const usersWithSpace = users?.map((user: any) => {
             // Get warehouse details if user has warehouse space
       const warehouseDetails = user.warehouse_status === 'active' && user.space_occupied > 0 ? [{
         warehouseId: user.warehouse_id,
         warehouseName: warehousesData.find((w: any) => w.id.toString() === user.warehouse_id)?.name || `Warehouse ${user.warehouse_id}`,
         warehouseLocation: warehousesData.find((w: any) => w.id.toString() === user.warehouse_id)?.location || 'Unknown',
        floorType: user.floor_type || 'ground',
        spaceOccupied: user.space_occupied || 0,
        entryDate: user.entry_date,
        expectedExitDate: user.expected_exit_date,
        status: user.warehouse_status
      }] : []

      // Calculate totals
      const totalSpaceOccupied = user.space_occupied || 0
      const totalBookings = user.warehouse_status === 'active' ? 1 : 0
      
      // Determine user status
      let userStatus = 'Inactive'
      if (totalSpaceOccupied > 0) {
        userStatus = 'Active'
      } else if (user.warehouse_status === 'pending') {
        userStatus = 'Pending'
      }

      // Calculate last activity
      const lastActivity = user.entry_date || user.created_at

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        totalSpaceOccupied,
        totalBookings,
        lastActivity,
        userStatus,
        warehouseDetails,
        // Additional fields for expandable rows
        areaRequested: user.space_occupied || 0,
        averageDuration: user.expected_exit_date && user.entry_date ? 
          Math.ceil((new Date(user.expected_exit_date).getTime() - new Date(user.entry_date).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0
      }
    }) || []

    console.log(`✅ Processed ${usersWithSpace.length} users with warehouse data`)

    return NextResponse.json({
      users: usersWithSpace,
      summary: {
        totalUsers: usersWithSpace.length,
        totalSpaceOccupied: usersWithSpace.reduce((sum: number, user: any) => sum + user.totalSpaceOccupied, 0),
        totalBookings: usersWithSpace.reduce((sum: number, user: any) => sum + user.totalBookings, 0),
        activeUsers: usersWithSpace.filter((user: any) => user.userStatus === 'Active').length
      }
    })

  } catch (error) {
    console.error('❌ Unexpected error in supporter users-space API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
