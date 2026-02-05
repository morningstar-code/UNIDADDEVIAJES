'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'
import Image from 'next/image'

interface Case {
  id: string
  status: string
  source: string
  destinoPais: string | null
  destinoCiudad: string | null
  fechaSalida: string | null
  fechaRetorno: string | null
  montoEstimado: number | null
  moneda: string | null
  createdAt: string
  profile: {
    id: string
    fullName: string | null
    primaryEmail: string
    cedula: string | null
  }
  _count: {
    documents: number
    tasks: number
  }
}

export default function SolicitudesPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [cases, setCases] = useState<Case[]>([])
  const [loadingCases, setLoadingCases] = useState(true)
  const [filter, setFilter] = useState<'all' | 'PUBLIC_FORM'>('all')
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastCaseId, setLastCaseId] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchCases()
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchCases, 30000)
      return () => clearInterval(interval)
    }
  }, [user, loading, filter, router])

  const fetchCases = async () => {
    try {
      const token = localStorage.getItem('token')
      const source = filter === 'all' ? null : filter
      const url = source
        ? `/api/cases/recent?source=${source}`
        : '/api/cases/recent'

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const newCases = data.cases || []
        
        // Check for new cases
        if (lastCaseId && newCases.length > 0) {
          const latestCase = newCases[0]
          if (latestCase.id !== lastCaseId) {
            // New case detected - could show notification here
            setUnreadCount((prev) => prev + 1)
          }
        }
        
        if (newCases.length > 0 && !lastCaseId) {
          setLastCaseId(newCases[0].id)
        }
        
        setCases(newCases)
      }
    } catch (error) {
      console.error('Error fetching cases:', error)
    } finally {
      setLoadingCases(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      RECEIVED: '#0066cc',
      DOCS_VALIDATION: '#ff9800',
      TECH_REVIEW: '#9c27b0',
      MANAGER_APPROVAL: '#2196f3',
      FINANCE_APPROVAL: '#4caf50',
      HR_APPROVAL: '#00bcd4',
      APPROVED: '#28a745',
      REJECTED: '#dc3545',
      NEEDS_INFO: '#ffc107',
      CLOSED: '#6c757d',
    }
    return colors[status] || '#666'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Hace un momento'
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
    return date.toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading || loadingCases) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    )
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
            width={50}
            height={50}
            style={{ objectFit: 'contain' }}
          />
          <div>
            <Link
              href="/dashboard"
              style={{ color: '#0066cc', textDecoration: 'none', marginRight: '1rem' }}
            >
              ← Dashboard
            </Link>
            <h1 style={{ margin: 0, display: 'inline' }}>
              Solicitudes Entrantes
              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    borderRadius: '12px',
                    fontSize: '0.8rem',
                  }}
                >
                  {unreadCount} nueva{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </h1>
          </div>
        </div>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Filters */}
        <div
          style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: '500' }}>Filtrar por:</span>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: filter === 'all' ? '#0066cc' : '#f0f0f0',
              color: filter === 'all' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter('PUBLIC_FORM')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: filter === 'PUBLIC_FORM' ? '#0066cc' : '#f0f0f0',
              color: filter === 'PUBLIC_FORM' ? 'white' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Formulario Público
          </button>
        </div>

        {/* Cases List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cases.length === 0 ? (
            <div
              style={{
                backgroundColor: 'white',
                padding: '3rem',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '1.2rem', color: '#666' }}>No hay solicitudes</p>
            </div>
          ) : (
            cases.map((caseItem) => (
              <Link
                key={caseItem.id}
                href={`/dashboard/cases/${caseItem.id}`}
                style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  borderLeft: '4px solid',
                  borderLeftColor: getStatusColor(caseItem.status),
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0 }}>
                        {caseItem.profile.fullName || caseItem.profile.primaryEmail}
                      </h3>
                      {caseItem.source === 'PUBLIC_FORM' && (
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#e7f3ff',
                            color: '#0066cc',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                          }}
                        >
                          📝 Formulario Público
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
                      {caseItem.profile.primaryEmail}
                      {caseItem.profile.cedula && ` • Cédula: ${caseItem.profile.cedula}`}
                    </p>
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      {caseItem.destinoPais && (
                        <span style={{ color: '#666', fontSize: '0.9rem' }}>
                          🌍 {caseItem.destinoPais}
                          {caseItem.destinoCiudad && `, ${caseItem.destinoCiudad}`}
                        </span>
                      )}
                      {caseItem.fechaSalida && (
                        <span style={{ color: '#666', fontSize: '0.9rem' }}>
                          📅 Salida: {new Date(caseItem.fechaSalida).toLocaleDateString('es-DO')}
                        </span>
                      )}
                      {caseItem.montoEstimado && (
                        <span style={{ color: '#666', fontSize: '0.9rem' }}>
                          💰 {caseItem.montoEstimado.toLocaleString()} {caseItem.moneda || 'USD'}
                        </span>
                      )}
                      <span style={{ color: '#666', fontSize: '0.9rem' }}>
                        📎 {caseItem._count.documents} documento{caseItem._count.documents !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#999', fontSize: '0.85rem' }}>
                      ⏰ Enviado {formatDate(caseItem.createdAt)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: getStatusColor(caseItem.status),
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: '500',
                      }}
                    >
                      {caseItem.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
