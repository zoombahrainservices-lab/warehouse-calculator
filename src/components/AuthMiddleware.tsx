'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface AuthMiddlewareProps {
  children: React.ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export default function AuthMiddleware({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: AuthMiddlewareProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken')
      
      if (!sessionToken) {
        if (requireAuth) {
          router.push(redirectTo)
        }
        setIsLoading(false)
        return
      }

      // Validate session with database
      const { data: session, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !session) {
        // Session is invalid or expired
        localStorage.removeItem('sessionToken')
        localStorage.removeItem('user')
        
        if (requireAuth) {
          router.push(redirectTo)
        }
        setIsLoading(false)
        return
      }

      // Update last activity
      await supabase
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('session_token', sessionToken)

      setIsAuthenticated(true)
      setIsLoading(false)
    } catch (error) {
      console.error('Auth check error:', error)
      if (requireAuth) {
        router.push(redirectTo)
      }
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken')
      
      if (sessionToken) {
        // Remove session from database
        await supabase
          .from('user_sessions')
          .delete()
          .eq('session_token', sessionToken)
      }

      // Clear localStorage
      localStorage.removeItem('sessionToken')
      localStorage.removeItem('user')
      
      // Redirect to login
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (requireAuth && !isAuthenticated) {
    return null // Will redirect to login
  }

  return (
    <div>
      {children}
      {/* Add logout button if authenticated */}
      {isAuthenticated && (
        <div className="fixed top-4 right-4">
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}





