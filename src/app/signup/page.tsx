'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id'

interface SignupForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  company: string
  agreeToTerms: boolean
}

export default function SignupPage() {
  const [formData, setFormData] = useState<SignupForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    company: '',
    agreeToTerms: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  interface GoogleCredentialResponse {
    credential: string
    select_by: string
  }

  const handleGoogleSignUp = async (response: GoogleCredentialResponse) => {
    setIsGoogleLoading(true)
    setError('')

    try {
      // Decode the JWT token
      const payload = JSON.parse(atob(response.credential.split('.')[1]))
      
      console.log('Google Sign-Up successful:', payload)
      
      // Check if user already exists in unified_users table (NEW approach)
      const { data: existingUser, error: userError } = await supabase
        .from('unified_users')
        .select('*')
        .eq('email', payload.email)
        .eq('is_active', true)
        .single()

      // If user doesn't exist, create them
      let user = existingUser
      if (userError || !user) {
        console.log('User not found, creating new user...')
        const { data: newUser, error: createError } = await supabase
          .from('unified_users')
          .insert([
            {
              email: payload.email,
              name: `${payload.given_name || 'Google'} ${payload.family_name || 'User'}`,
              role: 'USER',
              is_active: true,
              warehouse_status: 'inactive',
              space_occupied: 0,
              floor_type: 'ground',
              warehouse_id: null,
              entry_date: null,
              expected_exit_date: null
            }
          ])
          .select()
          .single()

        if (createError) {
          console.error('User creation error:', createError)
          setError('Failed to create account. Please try again.')
          return
        }

        user = newUser

        // Also create a minimal record in users table for authentication compatibility
        try {
          const { error: authUserError } = await supabase
            .from('users')
            .insert([
              {
                id: user.id, // Use the same ID for consistency
                google_sub: `google_${Date.now()}`, // Generate a unique sub for Google users
                email: payload.email,
                name: `${payload.given_name || 'Google'} ${payload.family_name || 'User'}`,
                role: 'USER',
                is_active: true
              }
            ])

          if (authUserError) {
            console.warn('Warning: Could not create auth user record:', authUserError.message)
            console.log('User can still access dashboard but may have auth issues')
          } else {
            console.log('✅ Auth user record created for authentication compatibility')
          }
        } catch (authErr) {
          console.warn('Warning: Error creating auth user record:', authErr)
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
      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name, // Use name field from unified_users table
        role: user.role || 'USER'
      }))

      console.log('Google OAuth signup successful, redirecting to dashboard...')
      
      // Small delay to ensure localStorage is updated
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 100)
    } catch (err) {
      console.error('Google Sign-Up error:', err)
      setError('Google sign-up failed. Please try again.')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  // Initialize Google OAuth
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleSignUp,
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        window.google.accounts.id.renderButton(
          document.getElementById('google-signup-button'),
          {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            text: 'signup_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: '100%',
          }
        )
      }
    }

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  const validateForm = () => {
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.')
      return false
    }

    if (!formData.agreeToTerms) {
      setError('Please agree to the terms and conditions.')
      return false
    }

    // Basic phone validation
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/
    if (!phoneRegex.test(formData.phone)) {
      setError('Please enter a valid phone number.')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (!validateForm()) {
      setIsLoading(false)
      return
    }

    try {
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.email)
        .single()

      if (existingUser) {
        setError('An account with this email already exists.')
        setIsLoading(false)
        return
      }

      // Create user directly in unified_users table (NEW approach)
      const { data: user, error: userError } = await supabase
        .from('unified_users')
        .insert([
          {
            email: formData.email,
            name: `${formData.firstName} ${formData.lastName}`,
            role: 'USER',
            is_active: true,
            warehouse_status: 'inactive',
            space_occupied: 0,
            floor_type: 'ground',
            warehouse_id: null,
            entry_date: null,
            expected_exit_date: null
          }
        ])
        .select()
        .single()

      if (userError) {
        console.error('User creation error:', userError)
        setError('Failed to create account. Please try again.')
        return
      }

      // Also create a minimal record in users table for authentication compatibility
      try {
        const { error: authUserError } = await supabase
          .from('users')
          .insert([
            {
              id: user.id, // Use the same ID for consistency
              google_sub: `email_${Date.now()}`, // Generate a unique sub for email users
              email: formData.email,
              name: `${formData.firstName} ${formData.lastName}`,
              role: 'USER',
              is_active: true
            }
          ])

        if (authUserError) {
          console.warn('Warning: Could not create auth user record:', authUserError.message)
          console.log('User can still access dashboard but may have auth issues')
        } else {
          console.log('✅ Auth user record created for authentication compatibility')
        }
      } catch (authErr) {
        console.warn('Warning: Error creating auth user record:', authErr)
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
      
      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name, // Use name field from unified_users table
        role: user.role || 'USER'
      }))

      console.log('Email signup successful, redirecting to dashboard...')
      
      // Small delay to ensure localStorage is updated
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 100)
    } catch (err) {
      console.error('Signup error:', err)
      setError('Failed to create account. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
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
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join ZOOM Warehouse Solutions
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link 
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in here
            </Link>
          </p>
        </div>
        
        {/* Google Sign-Up Button */}
        <div className="space-y-4">
          <div id="google-signup-button" className="w-full"></div>
          
          {isGoogleLoading && (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">Signing up with Google...</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-500">
              Or continue with email
            </span>
          </div>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="First Name"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Last Name"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
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
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="+973 XXX XXX XXX"
            />
            <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +973 for Bahrain)</p>
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              id="company"
              name="company"
              type="text"
              required
              value={formData.company}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your Company Name"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Create a password (min 6 characters)"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Confirm your password"
            />
          </div>

          <div className="flex items-center">
            <input
              id="agreeToTerms"
              name="agreeToTerms"
              type="checkbox"
              required
              checked={formData.agreeToTerms}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-900">
              I agree to the{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                Terms and Conditions
              </a>{' '}
              and{' '}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                Privacy Policy
              </a>
            </label>
          </div>

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

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </div>

          <div className="text-center">
            <Link 
              href="/"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              ← Back to Home
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
