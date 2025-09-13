'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('Processing authentication...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get token and user data from URL parameters
        const token = searchParams.get('token')
        const userData = searchParams.get('user')

        if (token && userData) {
          // Parse user data
          const user = JSON.parse(decodeURIComponent(userData))

          // Store in localStorage
          localStorage.setItem('sessionToken', token)
          localStorage.setItem('user', JSON.stringify(user))

          // Also store session token in cookie for API endpoints
          document.cookie = `sessionToken=${token}; path=/; max-age=${24 * 60 * 60}; SameSite=Lax`

          console.log('🍪 Session token stored in cookie for API access')
          console.log('💾 User data stored in localStorage:', user)

          console.log('Authentication successful:', user)

          // Redirect based on user role
          if (user.role === 'ADMIN') {
            setStatus('Redirecting to admin panel...')
            setTimeout(() => {
              router.push('/admin')
            }, 1000)
          } else if (user.role === 'MANAGER') {
            setStatus('Redirecting to manager dashboard...')
            setTimeout(() => {
              router.push('/dashboard') // Managers go to dashboard, not warehouses
            }, 1000)
          } else if (user.role === 'SUPPORT') {
            setStatus('Redirecting to supporter dashboard...')
            setTimeout(() => {
              router.push('/supporter')
            }, 1000)
          } else {
            setStatus('Redirecting to dashboard...')
            setTimeout(() => {
              router.push('/dashboard')
            }, 1000)
          }
        } else {
          setStatus('Authentication failed - missing data')
          setTimeout(() => {
            router.push('/login?error=auth_callback_failed')
          }, 2000)
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('Authentication failed')
        setTimeout(() => {
          router.push('/login?error=auth_callback_error')
        }, 2000)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">
            Completing Sign In
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {status}
          </p>
        </div>
      </div>
    </div>
  )
}