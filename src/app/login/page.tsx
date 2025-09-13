'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'email' | 'google'>('email')
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const searchParams = useSearchParams()

  // Check for existing session and redirect if logged in
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const sessionToken = localStorage.getItem('sessionToken')
        const userData = localStorage.getItem('user')
        
        if (sessionToken && userData) {
          // Verify session is still valid
          const { data: session, error } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('session_token', sessionToken)
            .gt('expires_at', new Date().toISOString())
            .single()
          
          if (!error && session) {
            // Session is valid, redirect based on role
            const user = JSON.parse(userData)
            if (user.role === 'ADMIN' || user.role === 'MANAGER') {
              window.location.href = '/warehouses'
            } else if (user.role === 'SUPPORT') {
              window.location.href = '/supporter'
            } else {
              window.location.href = '/dashboard'
            }
            return
          } else {
            // Session is invalid, clear it
            localStorage.removeItem('sessionToken')
            localStorage.removeItem('user')
          }
        }
      } catch (err) {
        console.error('Session check error:', err)
        // Clear invalid session data
        localStorage.removeItem('sessionToken')
        localStorage.removeItem('user')
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkExistingSession()
  }, [])

  // Check for error from OAuth callback
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      switch (errorParam) {
        case 'no_code':
          setError('Authentication code not received. Please try again.')
          break
        case 'token_exchange_failed':
          setError('Failed to authenticate with Google. Please try again.')
          break
        case 'invalid_token':
          setError('Invalid authentication token. Please try again.')
          break
        case 'invalid_audience':
          setError('Authentication configuration error. Please contact support.')
          break
        case 'user_creation_failed':
          setError('Failed to create user account. Please try again.')
          break
        case 'session_creation_failed':
          setError('Failed to create session. Please try again.')
          break
        case 'insufficient_permissions':
          setError('You do not have permission to access this area.')
          break
        case 'oauth_error':
          setError('Authentication error. Please try again.')
          break
        default:
          setError('An error occurred during authentication. Please try again.')
      }
    }
  }, [searchParams])

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', formData.email)
        .single()

      if (userError || !user) {
        setError('Invalid email or password.')
        return
      }

      // For email signup users (without password_hash), allow login with any password
      // This is a temporary solution - in production, implement proper password storage
      if (!user.password_hash) {
        // Allow login for email signup users (temporary solution)
        console.log('Email signup user logging in without password verification')
      } else {
        // Check password for users with password_hash
        if (user.password_hash !== formData.password) {
          setError('Invalid email or password.')
          return
        }
      }

      // Create session token
      const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36)
      
      // Store session in database
      const { error: sessionError } = await supabase
        .from('user_sessions')
        .insert([
          {
            user_id: user.id,
            session_token: sessionToken,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          }
        ])

      if (sessionError) {
        console.error('Session creation error:', sessionError)
        setError('Login failed. Please try again.')
        return
      }

      // Store session token in localStorage
      localStorage.setItem('sessionToken', sessionToken)
      
      // Also set session token in cookie for API endpoints
      document.cookie = `sessionToken=${sessionToken}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`
      
      // Parse name into first and last name for compatibility
      const nameParts = user.name ? user.name.split(' ') : ['', '']
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        role: user.role || 'USER'
      }))

      console.log('Email login successful, redirecting...')
      
      // Redirect based on role
      setTimeout(() => {
        if (user.role === 'ADMIN' || user.role === 'MANAGER') {
          window.location.href = '/warehouses'
        } else if (user.role === 'SUPPORT') {
          // Support users go to supporter dashboard
          window.location.href = '/supporter'
        } else {
          // Regular users go to their personal dashboard
          window.location.href = '/dashboard'
        }
      }, 100)
    } catch (err) {
      console.error('Login error:', err)
      setError('Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = (portal: string = 'user') => {
    setIsGoogleLoading(true)
    setError('')

    console.log('Signing in with portal:', portal)
    console.log('Admin emails from env:', process.env.NEXT_PUBLIC_ADMIN_EMAILS)

    // Generate Google OAuth URL
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${BASE_URL}/api/auth/google`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state: portal // Pass portal type as state
    })

    const authUrl = `https://accounts.google.com/o/oauth2/auth?${params.toString()}`
    
    console.log('Redirecting to Google OAuth with state:', portal)
    
    // Redirect to Google OAuth
    window.location.href = authUrl
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Show loading while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          {/* ZOOM Logo */}
          <div className="flex justify-center">
            <img 
              src="/zoom-logo.png" 
              alt="ZOOM Logo" 
              className="w-20 h-20 object-contain"
            />
          </div>
          
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access your warehouse management dashboard
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex rounded-lg bg-gray-100 p-1">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'email'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Email/Phone
          </button>
          <button
            onClick={() => setActiveTab('google')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'google'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Google OAuth
          </button>
        </div>
        
        {/* Email/Phone Login Tab */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link 
                  href="/signup"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Google OAuth Tab */}
        {activeTab === 'google' && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Choose your access level:</h3>
            </div>
            
            {/* User Access */}
            <button
              onClick={() => handleGoogleSignIn('user')}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in as User
            </button>

            {/* Manager Access */}
            <button
              onClick={() => handleGoogleSignIn('manager')}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in as Manager
            </button>

            {/* Support Access */}
            <button
              onClick={() => handleGoogleSignIn('support')}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in as Support
            </button>

            {/* Admin Access */}
            <button
              onClick={() => handleGoogleSignIn('admin')}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in as Admin
            </button>
            
            {isGoogleLoading && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Signing in with Google...</span>
              </div>
            )}

            {/* Role Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Access Levels:</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p><strong>User:</strong> Basic warehouse access and stock management</p>
                <p><strong>Manager:</strong> User access + warehouse management and reporting</p>
                <p><strong>Support:</strong> User access + customer support tools</p>
                <p><strong>Admin:</strong> Full system access and user management</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center">
          <Link 
            href="/"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
