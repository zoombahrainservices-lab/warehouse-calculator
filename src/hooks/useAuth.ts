import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string  // Changed from firstName/lastName to name
  role: 'ADMIN' | 'USER' | 'MANAGER' | 'SUPPORT'
}

interface UseAuthOptions {
  requireAuth?: boolean
  requiredRole?: 'ADMIN' | 'USER' | 'MANAGER' | 'SUPPORT'
  redirectTo?: string
}

// Role hierarchy for access control
const ROLE_HIERARCHY = {
  ADMIN: 4,
  MANAGER: 3,
  SUPPORT: 2,
  USER: 1
}

// Check if user role has access to required role
function checkRoleAccess(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole as keyof typeof ROLE_HIERARCHY] || 0

  // Higher level roles can access lower level pages
  return userLevel >= requiredLevel
}

export function useAuth({ 
  requireAuth = true, 
  requiredRole, 
  redirectTo = '/login' 
}: UseAuthOptions = {}) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = () => {
    try {
      // Check for session token in localStorage
      const sessionToken = localStorage.getItem('sessionToken')
      const userData = localStorage.getItem('user')

      if (!sessionToken || !userData) {
        if (requireAuth) {
          console.log('No session found, redirecting to login')
          router.push(redirectTo)
        }
        setIsLoading(false)
        return
      }

      const user = JSON.parse(userData)
      console.log('🔑 Authentication successful:', {
        email: user.email,
        role: user.role,
        id: user.id,
        hasName: !!user.name,
        fullUserData: user,
        localStorageUser: userData
      })

      // Validate user data structure
      if (!user.role) {
        console.error('❌ CRITICAL: User data missing role field!')
        console.error('❌ User data structure:', user)
        console.error('❌ Raw localStorage data:', userData)
        console.error('❌ Session token exists:', !!sessionToken)
        if (requireAuth) {
          router.push(redirectTo)
        }
        setIsLoading(false)
        return
      }

      // Check if user has required role (with admin role hierarchy)
      if (requiredRole) {
        console.log('🔐 Performing role check:', {
          userRole: user.role,
          requiredRole: requiredRole,
          userRoleType: typeof user.role,
          requiredRoleType: typeof requiredRole
        })

        const hasAccess = checkRoleAccess(user.role, requiredRole)
        const userLevel = ROLE_HIERARCHY[user.role as keyof typeof ROLE_HIERARCHY] || 0
        const requiredLevel = ROLE_HIERARCHY[requiredRole as keyof typeof ROLE_HIERARCHY] || 0

        console.log('🔐 Role hierarchy check:', {
          userRole: user.role,
          requiredRole: requiredRole,
          userLevel: userLevel,
          requiredLevel: requiredLevel,
          hasAccess: hasAccess,
          hierarchy: ROLE_HIERARCHY
        })

        if (!hasAccess) {
          console.log(`❌ Access denied: User role ${user.role} (level ${userLevel}) does not have access to ${requiredRole} (level ${requiredLevel})`)
          console.log('🔄 Redirecting to login due to insufficient permissions')
          router.push('/login')
          setIsLoading(false)
          return
        } else {
          console.log(`✅ Access granted: User role ${user.role} has access to ${requiredRole}`)
        }
      }

      setUser(user)
      setIsAuthenticated(true)
      setIsLoading(false)
    } catch (error) {
      console.error('Error checking authentication:', error)
      if (requireAuth) {
        router.push(redirectTo)
      }
      setIsLoading(false)
    }
  }

  const logout = () => {
    try {
      // Clear localStorage
      localStorage.removeItem('sessionToken')
      localStorage.removeItem('user')
      
      // Clear cookies
      document.cookie = 'sessionToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      
      setUser(null)
      setIsAuthenticated(false)
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/login')
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    logout,
    checkAuth
  }
}
