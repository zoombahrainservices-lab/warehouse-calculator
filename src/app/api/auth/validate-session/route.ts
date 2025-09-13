
import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 Validate session API called')
    const sessionToken = request.cookies.get('sessionToken')?.value
    console.log('🔐 Session token from cookies:', sessionToken ? `${sessionToken.substring(0, 10)}...` : 'null')

    if (!sessionToken) {
      console.log('❌ No session token found in cookies')
      return NextResponse.json({ error: 'No session token' }, { status: 401 })
    }

    console.log('🔐 Validating session token...')
    const user = await validateSession(sessionToken)
    console.log('🔐 Session validation result:', {
      hasUser: !!user,
      userRole: user?.role,
      userEmail: user?.email,
      isActive: user?.is_active
    })

    if (!user) {
      console.log('❌ Invalid session - no user returned')
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    if (!user.is_active) {
      console.log('❌ User account is not active')
      return NextResponse.json({ error: 'Account not active' }, { status: 401 })
    }

    console.log('✅ Session validation successful for user:', user.email, 'with role:', user.role)

    // Format user data to match localStorage structure for consistency
    const formattedUser = {
      id: user.id,
      email: user.email,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      firstName: user.firstName || (user.name ? user.name.split(' ')[0] : ''),
      lastName: user.lastName || (user.name ? user.name.split(' ').slice(1).join(' ') : ''),
      role: user.role,
      picture: user.picture
    }

    console.log('📋 Formatted user data:', {
      id: formattedUser.id,
      email: formattedUser.email,
      name: formattedUser.name,
      firstName: formattedUser.firstName,
      lastName: formattedUser.lastName,
      role: formattedUser.role
    })

    return NextResponse.json({
      user: formattedUser
    })

  } catch (error) {
    console.error('❌ Session validation error:', error)
    return NextResponse.json({ error: 'Session validation failed' }, { status: 500 })
  }
}




