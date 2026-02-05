'use client'

import { useEffect, useState, useCallback } from 'react'
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
  const [viewedCases, setViewedCases] = useState<Set<string>>(new Set())

  // Load viewed cases from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const viewed = localStorage.getItem('viewedRequests')
      if (viewed) {
        setViewedCases(new Set(JSON.parse(viewed)))
      }
    }
  }, [])

  // Mark case as viewed when clicked
  const markCaseAsViewed = (caseId: string) => {
    const newViewed = new Set(viewedCases)
    newViewed.add(caseId)
    setViewedCases(newViewed)
    if (typeof window !== 'undefined') {
      localStorage.setItem('viewedRequests', JSON.stringify(Array.from(newViewed)))
    }
  }

  const fetchCases = useCallback(async () => {
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
  }, [filter, lastCaseId])

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
  }, [user, loading, router, fetchCases])

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      RECEIVED: '#6c757d', // Gray - neutral
      DOCS_VALIDATION: '#17a2b8', // Teal - in progress
      TECH_REVIEW: '#6f42c1', // Purple - technical review
      MANAGER_APPROVAL: '#28a745', // Green - approval stage
      FINANCE_APPROVAL: '#20c997', // Mint green - finance
      HR_APPROVAL: '#17a2b8', // Teal - HR
      APPROVED: '#28a745', // Green - approved
      REJECTED: '#dc3545', // Red - rejected
      NEEDS_INFO: '#fd7e14', // Orange - needs info
      CLOSED: '#6c757d', // Gray - closed
    }
    return colors[status] || '#6c757d'
  }
  
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      RECEIVED: 'Recibido',
      DOCS_VALIDATION: 'Validación de Documentos',
      TECH_REVIEW: 'Revisión Técnica',
      MANAGER_APPROVAL: 'Aprobación Gerencial',
      FINANCE_APPROVAL: 'Aprobación Finanzas',
      HR_APPROVAL: 'Aprobación RRHH',
      APPROVED: 'Aprobado',
      REJECTED: 'Rechazado',
      NEEDS_INFO: 'Requiere Información',
      CLOSED: 'Cerrado',
    }
    return labels[status] || status
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
            cases.map((caseItem) => {
              const isViewed = viewedCases.has(caseItem.id)
              return (
                <Link
                  key={caseItem.id}
                  href={`/dashboard/cases/${caseItem.id}`}
                  onClick={() => markCaseAsViewed(caseItem.id)}
                  style={{
                    backgroundColor: isViewed ? '#f5f5f5' : 'white',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    boxShadow: isViewed ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                    border: isViewed ? '1px solid #e0e0e0' : '1px solid transparent',
                    borderLeft: '4px solid',
                    borderLeftColor: getStatusColor(caseItem.status),
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateX(4px)'
                    e.currentTarget.style.boxShadow = isViewed 
                      ? '0 2px 4px rgba(0,0,0,0.1)' 
                      : '0 4px 8px rgba(0,0,0,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateX(0)'
                    e.currentTarget.style.boxShadow = isViewed 
                      ? '0 1px 2px rgba(0,0,0,0.05)' 
                      : '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ 
                        margin: 0, 
                        fontWeight: isViewed ? '400' : '600',
                        color: isViewed ? '#666' : '#333',
                      }}>
                        {caseItem.profile.fullName || caseItem.profile.primaryEmail}
                      </h3>
                      {caseItem.source === 'PUBLIC_FORM' && (
                        <span
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#e9ecef',
                            color: '#495057',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            border: '1px solid #dee2e6',
                          }}
                        >
                          Formulario Público
                        </span>
                      )}
                      {!isViewed && (
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#0066cc',
                            borderRadius: '50%',
                            display: 'inline-block',
                          }}
                        />
                      )}
                    </div>
                    <p style={{ 
                      margin: '0.25rem 0', 
                      color: isViewed ? '#999' : '#666', 
                      fontSize: '0.9rem' 
                    }}>
                      {caseItem.profile.primaryEmail}
                      {caseItem.profile.cedula && ` • Cédula: ${caseItem.profile.cedula}`}
                    </p>
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      {caseItem.destinoPais && (
                        <span style={{ color: isViewed ? '#999' : '#666', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.85rem' }}>📍</span>
                          {caseItem.destinoPais}
                          {caseItem.destinoCiudad && `, ${caseItem.destinoCiudad}`}
                        </span>
                      )}
                      {caseItem.fechaSalida && (
                        <span style={{ color: isViewed ? '#999' : '#666', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.85rem' }}>📆</span>
                          Salida: {new Date(caseItem.fechaSalida).toLocaleDateString('es-DO')}
                        </span>
                      )}
                      {caseItem.montoEstimado && (
                        <span style={{ color: isViewed ? '#999' : '#666', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.85rem' }}>💵</span>
                          {caseItem.montoEstimado.toLocaleString()} {caseItem.moneda || 'USD'}
                        </span>
                      )}
                      <span style={{ color: isViewed ? '#999' : '#666', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.85rem' }}>📄</span>
                        {caseItem._count.documents} documento{caseItem._count.documents !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p style={{ margin: '0.5rem 0 0 0', color: isViewed ? '#bbb' : '#999', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem' }}>🕐</span>
                      Enviado {formatDate(caseItem.createdAt)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: getStatusColor(caseItem.status),
                        color: 'white',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        textTransform: 'none',
                        letterSpacing: '0.3px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    >
                      {getStatusLabel(caseItem.status)}
                    </span>
                  </div>
                </div>
              </Link>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
