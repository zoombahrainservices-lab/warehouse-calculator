import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export interface User {
  id: string
  google_sub: string
  email: string
  name: string
  firstName?: string
  lastName?: string
  picture?: string
  role: 'ADMIN' | 'USER' | 'MANAGER' | 'SUPPORT'
  is_active: boolean
}

export interface GoogleOAuthPayload {
  sub: string
  email: string
  name: string
  picture?: string
}

export interface Session {
  id: string
  user_id: string
  session_token: string
  expires_at: string
}

// Role-based access control
export const ROLES = {
  ADMIN: 'ADMIN',
  USER: 'USER',
  MANAGER: 'MANAGER',
  SUPPORT: 'SUPPORT'
} as const

export type Role = keyof typeof ROLES

// Role hierarchy (higher roles have access to lower roles)
export const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 4,
  [ROLES.MANAGER]: 3,
  [ROLES.SUPPORT]: 2,
  [ROLES.USER]: 1
}

// Check if user has required role
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

// Check if user has any of the required roles
export function hasAnyRole(userRole: Role, requiredRoles: Role[]): boolean {
  return requiredRoles.some(role => hasRole(userRole, role))
}

// Get user by Google sub
export async function getUserByGoogleSub(googleSub: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_by_google_sub', { google_sub_param: googleSub })
    
    if (error) {
      console.error('Error getting user by Google sub:', error)
      return null
    }
    
    return data?.[0] || null
  } catch (error) {
    console.error('Error in getUserByGoogleSub:', error)
    return null
  }
}

// Create or update user from Google OAuth
export async function createOrUpdateUser(googlePayload: GoogleOAuthPayload, requestedRole?: string): Promise<User | null> {
  try {
    const { sub, email, name, picture } = googlePayload

    console.log('🔐 Creating/updating user with Google OAuth payload:', {
      email,
      name,
      sub: sub.substring(0, 10) + '...',
      requestedRole,
      hasPicture: !!picture
    })

    // Check if user exists
    console.log('🔍 Checking if user exists with Google sub:', sub.substring(0, 10) + '...')
    let user = await getUserByGoogleSub(sub)
    
    if (!user) {
      // Create new user with role assignment
      let role: Role = 'USER'

      // Check if email is in admin list
      const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
      console.log('👑 Admin emails from env:', adminEmails)
      console.log('📧 User email (lowercase):', email.toLowerCase())
      console.log('🔍 Checking if user is admin...')

      if (adminEmails.includes(email.toLowerCase())) {
        role = 'ADMIN'
        console.log('✅ User is admin, setting role to ADMIN')
      } else {
        console.log('❌ User is not in admin list')
        if (requestedRole) {
          // For non-admin users, validate the requested role
          const validRoles = ['USER', 'MANAGER', 'SUPPORT']
          console.log('🎭 Requested role:', requestedRole)
          console.log('✅ Valid roles:', validRoles)

          if (validRoles.includes(requestedRole.toUpperCase())) {
            role = requestedRole.toUpperCase() as Role
            console.log('✅ Setting requested role:', role)
          } else {
            console.log('❌ Requested role not valid, keeping USER role')
          }
        } else {
          console.log('ℹ️ No requested role, keeping default USER role')
        }
      }

      console.log('🏷️ Final role assignment:', role)
      
      const { data, error } = await supabase
        .from('users')
        .insert([{
          google_sub: sub,
          email,
          name,
          picture,
          role
        }])
        .select()
        .single()
      
      if (error) {
        console.error('Error creating user:', error)
        return null
      }
      
      user = data
      if (user) {
        console.log('User created with role:', user.role)
      }

      // Also create a corresponding record in unified_users table for dashboard access
      if (user) {
        try {
          const { error: unifiedError } = await supabase
            .from('unified_users')
            .insert([{
              id: user.id, // Use the same ID for consistency
              email: user.email,
              name: user.name,
              role: user.role,
              is_active: user.is_active,
              warehouse_status: 'inactive',
              space_occupied: 0,
              floor_type: 'ground',
              warehouse_id: null,
              entry_date: null,
              expected_exit_date: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])

          if (unifiedError) {
            console.warn('Warning: Could not create unified user record:', unifiedError.message)
            console.log('User can still login but may not have full dashboard access')
          } else {
            console.log('✅ Unified user record created for dashboard access')
          }
        } catch (unifiedErr) {
          console.warn('Warning: Error creating unified user record:', unifiedErr)
        }
      }
    } else {
      console.log('📝 Existing user found:', {
        id: user.id,
        email: user.email,
        currentRole: user.role,
        isActive: user.is_active
      })

      // Update existing user (but don't change their role)
      const { data, error } = await supabase
        .from('users')
        .update({
          email,
          name,
          picture,
          updated_at: new Date().toISOString()
        })
        .eq('google_sub', sub)
        .select()
        .single()

      if (error) {
        console.error('❌ Error updating user:', error)
        return null
      }

      user = data
      if (user) {
        console.log('✅ User updated, current role:', user.role)
        console.log('👤 Updated user details:', {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          is_active: user.is_active
        })
      }
    }
    
    return user
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error)
    return null
  }
}

// Create session
export async function createSession(userId: string): Promise<string | null> {
  try {
    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36)
    
    const { error } = await supabase
      .from('user_sessions')
      .insert([{
        user_id: userId,
        session_token: sessionToken,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }])
    
    if (error) {
      console.error('Error creating session:', error)
      return null
    }
    
    return sessionToken
  } catch (error) {
    console.error('Error in createSession:', error)
    return null
  }
}

// Validate session
export async function validateSession(sessionToken: string): Promise<User | null> {
  try {
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select(`
        *,
        users (
          id,
          google_sub,
          email,
          name,
          picture,
          role,
          is_active
        )
      `)
      .eq('session_token', sessionToken)
      .single()
    
    if (sessionError || !session) {
      return null
    }
    
    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      // Delete expired session
      await supabase
        .from('user_sessions')
        .delete()
        .eq('session_token', sessionToken)
      return null
    }
    
    return session.users as User
  } catch (error) {
    console.error('Error in validateSession:', error)
    return null
  }
}

// Delete session
export async function deleteSession(sessionToken: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('session_token', sessionToken)

    return !error
  } catch (error) {
    console.error('Error in deleteSession:', error)
    return false
  }
}

// Validate session from NextRequest (for API endpoints)
export async function validateSessionFromRequest(request: NextRequest): Promise<{ isValid: boolean; userId?: string; user?: User }> {
  try {
    // Get session token from cookies
    const sessionToken = request.cookies.get('sessionToken')?.value

    if (!sessionToken) {
      return { isValid: false }
    }

    const user = await validateSession(sessionToken)

    if (!user || !user.is_active) {
      return { isValid: false }
    }

    return {
      isValid: true,
      userId: user.id,
      user
    }
  } catch (error) {
    console.error('Error validating session from request:', error)
    return { isValid: false }
  }
}
