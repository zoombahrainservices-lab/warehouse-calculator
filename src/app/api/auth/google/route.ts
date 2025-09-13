                                                                                  import { NextRequest, NextResponse } from 'next/server'
import { createOrUpdateUser, createSession } from '@/lib/auth'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // portal type: 'admin', 'user', etc.
  
  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/google`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', request.url))
    }

    const tokens = await tokenResponse.json()

    // Verify ID token
    const idTokenResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokens.id_token}`)
    if (!idTokenResponse.ok) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url))
    }

    const payload = await idTokenResponse.json()
    
    // Verify audience
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      return NextResponse.redirect(new URL('/login?error=invalid_audience', request.url))
    }

    // Create or update user with requested role
    const user = await createOrUpdateUser({
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    }, state || undefined) // Pass the requested role from state parameter, handle null case

    if (!user) {
      console.error('❌ Failed to create or update user')
      return NextResponse.redirect(new URL('/login?error=user_creation_failed', request.url))
    }

    console.log('✅ Google OAuth user authenticated:', user.email, 'with role:', user.role)
    console.log('👤 Google OAuth user details:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
      google_sub: user.google_sub
    })

    // Check role-based access for portal
    if (state) {
      const requiredRole = state.toUpperCase()
      if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/login?error=insufficient_permissions', request.url))
      }
      if (requiredRole === 'MANAGER' && !['ADMIN', 'MANAGER'].includes(user.role)) {
        return NextResponse.redirect(new URL('/login?error=insufficient_permissions', request.url))
      }
      if (requiredRole === 'SUPPORT' && !['ADMIN', 'SUPPORT'].includes(user.role)) {
        return NextResponse.redirect(new URL('/login?error=insufficient_permissions', request.url))
      }
    }

    // Create session
    const sessionToken = await createSession(user.id)
    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login?error=session_creation_failed', request.url))
    }

    // For now, redirect to auth callback and let the client handle localStorage
    // The auth callback will handle role-based redirects
    return NextResponse.redirect(new URL(`/auth/callback?token=${sessionToken}&user=${encodeURIComponent(JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }))}`, request.url))

  } catch (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(new URL('/login?error=oauth_error', request.url))
  }
}
