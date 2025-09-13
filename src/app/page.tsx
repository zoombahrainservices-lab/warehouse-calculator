'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react' 

interface User {
  id: string
  email: string
  name: string
  role: string
}

export default function Home() {
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check authentication status on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/validate-session', {
          method: 'GET',
          credentials: 'include'
        })
        
        if (response.ok) {
          const userData = await response.json()
          setUser(userData.user)
        }
      } catch (error) {
        console.error('Error checking authentication:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      setUser(null)
      window.location.reload()
    } catch (error) {
      console.error('Logout error:', error)
      setUser(null)
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {/* ZOOM Logo - Using actual image */}
              <img 
                src="/zoom-logo.png" 
                alt="ZOOM Logo" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/calculator" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Calculate Price
              </Link>
              {!isLoading && (
                <>
                  {user ? (
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-700 font-medium">
                        Welcome, {user.name}
                      </span>
                      {user.role === 'SUPPORT' ? (
                        <Link 
                          href="/supporter"
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          Support Dashboard
                        </Link>
                      ) : (
                        <Link 
                          href={(user.role === 'ADMIN' || user.role === 'MANAGER') ? '/warehouses' : '/warehouses/view'}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                        >
                          {(user.role === 'ADMIN' || user.role === 'MANAGER') ? 'Warehouse Management' : 'Warehouse View'}
                        </Link>
                      )}
                      <button 
                        onClick={handleLogout}
                        className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  ) : (
                    <Link 
                      href="/login"
                      className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Login
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            ZOOM Warehouse Solutions
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            State-of-the-art warehouse facilities in Sitra, Bahrain. Secure, efficient, and cost-effective storage solutions for all your business needs.
          </p>
          <Link 
            href="/calculator"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors inline-block"
          >
            Get Instant Quote
          </Link>
        </div>
      </section>

      {/* Main Content Sections */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            
            {/* 1. One Stop Solution */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">One Stop Solution</h2>
              <div className="space-y-4 text-gray-600">
                <p>Complete warehouse management under one roof:</p>
                <ul className="space-y-2">
                  <li>• Secure storage facilities</li>
                  <li>• 24/7 security monitoring</li>
                  <li>• Loading dock access</li>
                  <li>• Climate control options</li>
                </ul>
              </div>
            </div>

            {/* 2. Short Term */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Short Term</h2>
              <div className="space-y-4 text-gray-600">
                <p>Flexible short-term storage solutions:</p>
                <ul className="space-y-2">
                  <li>• Daily to monthly rentals</li>
                  <li>• No long-term commitments</li>
                  <li>• Perfect for seasonal storage</li>
                  <li>• Quick setup and access</li>
                </ul>
              </div>
            </div>

            {/* 3. Long Term */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Long Term</h2>
              <div className="space-y-4 text-gray-600">
                <p>Cost-effective long-term storage solutions:</p>
                <ul className="space-y-2">
                  <li>• 12+ months contracts</li>
                  <li>• Significant cost savings</li>
                  <li>• Priority space allocation</li>
                  <li>• Dedicated storage areas</li>
                </ul>
              </div>
            </div>

            {/* 4. Why Zoom */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">Why Zoom</h2>
              <div className="space-y-4 text-gray-600">
                <p>Strategic advantages of our location:</p>
                <ul className="space-y-2">
                  <li>• Prime Sitra industrial area</li>
                  <li>• Easy access to major highways</li>
                  <li>• Close to ports and airports</li>
                  <li>• Central business district proximity</li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Schedule Meeting Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Schedule a meeting with our warehouse experts to discuss your specific needs and get a personalized solution.
          </p>
          <button 
            onClick={() => setShowMeetingModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
          >
            Schedule a Meeting
          </button>
        </div>
      </section>

      {/* Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Schedule a Meeting</h3>
              <button 
                onClick={() => setShowMeetingModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input 
                  type="email" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your.email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input 
                  type="tel" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+973 XXX XXX XXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Tell us about your storage needs..."
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                >
                  Schedule Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">ZOOM Warehouse Solutions</h3>
              <p className="text-gray-300">
                Premium warehouse solutions in Sitra, Bahrain. Secure, efficient, and cost-effective storage for all your business needs.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Short-term Storage</li>
                <li>Long-term Storage</li>
                <li>Climate Control</li>
                <li>Security Services</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-300">
                <li>Sitra Industrial Area</li>
                <li>Bahrain</li>
                <li>Phone: +973 3881 6222</li>
                <li>Email: info@zoombahrain.com</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-gray-300">
                <li><Link href="/calculator" className="hover:text-white">Calculate Price</Link></li>
                <li><Link href="/stock" className="hover:text-white">Stock Management</Link></li>
                {user && (user.role === 'ADMIN' || user.role === 'MANAGER') && (
                  <li><Link href="/warehouses" className="hover:text-white">Warehouse Management</Link></li>
                )}
                {user && user.role === 'SUPPORT' && (
                  <li><Link href="/supporter" className="hover:text-white">Support Dashboard</Link></li>
                )}
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2024 ZOOM Warehouse Solutions. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
