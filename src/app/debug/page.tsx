'use client'

import { useEffect, useState } from 'react'

interface DebugInfo {
  url: string
  userAgent: string
  cookies: {
    sessionToken?: string
  }
  localStorage: Record<string, boolean>
  timestamp: string
}

interface LocalStorageData {
  sessionToken: string | null
  userData: Record<string, unknown> | null
  rawUserData: string | null
}

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({} as DebugInfo)
  const [localStorageData, setLocalStorageData] = useState<LocalStorageData>({} as LocalStorageData)

  useEffect(() => {
    // Check localStorage
    const sessionToken = localStorage.getItem('sessionToken')
    const userData = localStorage.getItem('user')

    setLocalStorageData({
      sessionToken: sessionToken ? `${sessionToken.substring(0, 10)}...` : null,
      userData: userData ? JSON.parse(userData) : null,
      rawUserData: userData
    })

    // Check cookies
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)

    setDebugInfo({
      url: window.location.href,
      userAgent: navigator.userAgent,
      cookies: {
        sessionToken: cookies.sessionToken ? `${cookies.sessionToken.substring(0, 10)}...` : null
      },
      localStorage: {
        sessionToken: !!sessionToken,
        userData: !!userData
      },
      timestamp: new Date().toISOString()
    })
  }, [])

  const clearAuth = () => {
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('user')
    document.cookie = 'sessionToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">🔧 Authentication Debug</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Session Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">📊 Current Session</h2>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>

          {/* LocalStorage Data */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">💾 LocalStorage Data</h2>
            <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(localStorageData, null, 2)}
            </pre>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">⚡ Quick Actions</h2>
          <div className="flex gap-4">
            <button
              onClick={clearAuth}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Clear Authentication
            </button>
            <button
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Go to Login
            </button>
            <button
              onClick={() => window.location.href = '/warehouses'}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Go to Warehouses
            </button>
            <button
              onClick={() => window.location.href = '/warehouses?debug=true'}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
            >
              Test Warehouse Debug
            </button>
            <button
              onClick={() => window.location.href = '/warehouses/ca0ac51f-ac77-482f-850c-57e9bd3adefa?debug=true'}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded"
            >
              Test Detail Debug
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <h2 className="text-xl font-semibold mb-4 text-yellow-800">📋 How to Debug Admin Login:</h2>
          <ol className="list-decimal list-inside space-y-2 text-yellow-700">
            <li>Login as admin (email or Google OAuth)</li>
            <li>Check if user data appears above</li>
            <li>Look for role field in user data (should be ADMIN)</li>
            <li>Open browser console to see detailed authentication logs</li>
            <li>Try accessing /warehouses - check console logs for role validation</li>
            <li>For Google OAuth issues, check the full authentication flow logs</li>
            <li>Use debug buttons above to test specific scenarios</li>
            <li>If still redirected, share the debug info and console logs</li>
          </ol>

          <div className="mt-4 p-3 bg-yellow-100 rounded">
            <h3 className="font-semibold text-yellow-800">🔍 Google OAuth Troubleshooting:</h3>
            <ul className="list-disc list-inside text-sm text-yellow-700 mt-2">
              <li>Check if admin email is in NEXT_PUBLIC_ADMIN_EMAILS environment variable</li>
              <li>Verify Google OAuth callback stores session token in both localStorage and cookies</li>
              <li>Check console for role assignment logs during Google OAuth flow</li>
              <li>Ensure validate-session API returns consistent user data format</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
