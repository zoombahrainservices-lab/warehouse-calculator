import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('sessionToken')?.value
    
    if (sessionToken) {
      await deleteSession(sessionToken)
    }

    const response = NextResponse.json({ success: true })
    
    // Clear session cookie
    response.cookies.set('sessionToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ success: false, error: 'Logout failed' }, { status: 500 })
  }
}




