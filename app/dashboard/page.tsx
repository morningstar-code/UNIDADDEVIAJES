'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'
import Image from 'next/image'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [newRequestsCount, setNewRequestsCount] = useState(0)
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date())
  const [showNotification, setShowNotification] = useState(false)
  const lastKnownCaseIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Check for new requests every 15 seconds
  useEffect(() => {
    if (!user) return

    const checkNewRequests = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/cases/recent?limit=5', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.cases && data.cases.length > 0) {
            const latestCase = data.cases[0]
            
            // First time: just store the latest case ID
            if (!lastKnownCaseIdRef.current) {
              lastKnownCaseIdRef.current = latestCase.id
              setLastCheckTime(new Date())
              return
            }
            
            // Check if there's a new case (different ID at the top)
            if (latestCase.id !== lastKnownCaseIdRef.current) {
              // Count how many new cases there are
              let newCount = 0
              for (const caseItem of data.cases) {
                if (caseItem.id === lastKnownCaseIdRef.current) break
                newCount++
              }
              
              if (newCount > 0) {
                setNewRequestsCount((prev) => prev + newCount)
                setShowNotification(true)
                
                // Hide notification after 5 seconds
                setTimeout(() => setShowNotification(false), 5000)
                
                // Show browser notification if permitted
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('Nueva Solicitud Recibida', {
                    body: `${latestCase.profile?.fullName || latestCase.profile?.primaryEmail} ha enviado una solicitud de viaje`,
                    icon: '/indotel-logo.jpg',
                  })
                }
                
                lastKnownCaseIdRef.current = latestCase.id
              }
            }
            
            setLastCheckTime(new Date())
          }
        }
      } catch (error) {
        console.error('Error checking new requests:', error)
      }
    }

    // Initial check after 2 seconds (to avoid immediate false positives)
    const initialTimeout = setTimeout(() => {
      checkNewRequests()
    }, 2000)

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Check every 15 seconds
    const interval = setInterval(checkNewRequests, 15000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [user])

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header
        style={{
          backgroundColor: 'white',
          padding: '1rem 2rem',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Image
            src="/indotel-logo.jpg"
            alt="INDOTEL Logo"
            width={60}
            height={60}
            style={{ objectFit: 'contain' }}
          />
          <h1 style={{ margin: 0 }}>INDOTEL - Unidad de Viajes</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>{user.name || user.email}</span>
          <span style={{ color: '#666' }}>({user.role})</span>
          <button
            onClick={logout}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </header>
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <Link
            href="/dashboard/bandeja"
            style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <h2 style={{ marginBottom: '0.5rem' }}>Mi Bandeja</h2>
            <p style={{ color: '#666', margin: 0 }}>
              Ver y procesar tus tareas pendientes
            </p>
          </Link>
          <Link
            href="/dashboard/profiles"
            style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
            }}
          >
            <h2 style={{ marginBottom: '0.5rem' }}>Perfiles</h2>
            <p style={{ color: '#666', margin: 0 }}>
              Buscar y gestionar perfiles de solicitantes
            </p>
          </Link>
          <Link
            href="/dashboard/solicitudes"
            onClick={() => setNewRequestsCount(0)}
            style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              textDecoration: 'none',
              color: 'inherit',
              display: 'block',
              position: 'relative',
            }}
          >
            <h2 style={{ marginBottom: '0.5rem' }}>
              Solicitudes Entrantes
              {newRequestsCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    animation: showNotification ? 'pulse 1s infinite' : undefined,
                  }}
                >
                  {newRequestsCount > 9 ? '9+' : newRequestsCount}
                </span>
              )}
            </h2>
            <p style={{ color: '#666', margin: 0 }}>
              Ver todas las solicitudes recibidas con fechas y detalles
            </p>
          </Link>
        </div>

        {/* Public Request Link Card */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '2rem',
          }}
        >
          <h2 style={{ marginBottom: '1rem' }}>Nueva Solicitud (Link Público)</h2>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Comparte este link con personas que quieran solicitar un viaje
          </p>
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/solicitar`}
              id="public-link-input"
              style={{
                flex: 1,
                minWidth: '300px',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem',
              }}
            />
            <button
              onClick={() => {
                const input = document.getElementById('public-link-input') as HTMLInputElement
                if (input) {
                  input.select()
                  document.execCommand('copy')
                  alert('Link copiado al portapapeles')
                }
              }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Copiar Link
            </button>
            <a
              href="/solicitar"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#28a745',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            >
              Abrir en Nueva Pestaña
            </a>
          </div>
        </div>
      </main>

      {/* Floating Notification */}
      {showNotification && newRequestsCount > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            backgroundColor: '#dc3545',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            animation: 'slideIn 0.3s ease-out',
            cursor: 'pointer',
          }}
          onClick={() => {
            router.push('/dashboard/solicitudes')
            setNewRequestsCount(0)
            setShowNotification(false)
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>🔔</span>
          <div>
            <strong style={{ display: 'block' }}>
              {newRequestsCount} nueva{newRequestsCount > 1 ? 's' : ''} solicitud{newRequestsCount > 1 ? 'es' : ''}
            </strong>
            <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
              Click para ver
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowNotification(false)
            }}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '0 0.5rem',
            }}
          >
            ×
          </button>
        </div>
      )}

    </div>
  )
}
