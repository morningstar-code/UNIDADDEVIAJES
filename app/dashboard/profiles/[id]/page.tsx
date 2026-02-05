'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface Profile {
  id: string
  primaryEmail: string
  fullName: string | null
  cedula: string | null
  passportNumber: string | null
  passportCountry: string | null
  phone: string | null
  cargo: string | null
  departamento: string | null
  documents: Array<{
    id: string
    docType: string
    originalFilename: string
    blobUrl: string
    mimeType: string | null
    createdAt: string
  }>
  cases: Array<{
    id: string
    status: string
    destinoPais: string | null
    destinoCiudad: string | null
    fechaSalida: string | null
    fechaRetorno: string | null
    montoEstimado: number | null
    moneda: string | null
    createdAt: string
  }>
}

export default function ProfileDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [activeTab, setActiveTab] = useState<'docs' | 'cases'>('docs')
  const [viewedCases, setViewedCases] = useState<Set<string>>(new Set())
  const [selectedDocument, setSelectedDocument] = useState<{
    id: string
    filename: string
    url: string
    type: string
  } | null>(null)

  // Load viewed cases from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const viewed = localStorage.getItem('viewedCases')
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
      localStorage.setItem('viewedCases', JSON.stringify(Array.from(newViewed)))
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user && params.id) {
      fetchProfile()
    }
  }, [user, loading, params.id, router])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/profiles/${params.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoadingProfile(false)
    }
  }

  if (loading || loadingProfile) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Profile not found</p>
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
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        <Image
          src="/indotel-logo.jpg"
          alt="INDOTEL Logo"
          width={50}
          height={50}
          style={{ objectFit: 'contain' }}
        />
        <div>
          <Link
            href="/dashboard/profiles"
            style={{ color: '#0066cc', textDecoration: 'none', marginRight: '1rem' }}
          >
            ← Perfiles
          </Link>
          <h1 style={{ margin: '1rem 0 0 0' }}>{profile.fullName || profile.primaryEmail}</h1>
        </div>
      </header>
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Información</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <strong>Email:</strong> {profile.primaryEmail}
            </div>
            {profile.cedula && (
              <div>
                <strong>Cédula:</strong> {profile.cedula}
              </div>
            )}
            {profile.passportNumber && (
              <div>
                <strong>Pasaporte:</strong> {profile.passportNumber}
                {profile.passportCountry && ` (${profile.passportCountry})`}
              </div>
            )}
            {profile.phone && (
              <div>
                <strong>Teléfono:</strong> {profile.phone}
              </div>
            )}
            {profile.cargo && (
              <div>
                <strong>Cargo:</strong> {profile.cargo}
              </div>
            )}
            {profile.departamento && (
              <div>
                <strong>Departamento:</strong> {profile.departamento}
              </div>
            )}
          </div>
          {/* Total Amount */}
          {(() => {
            const casesWithAmount = profile.cases.filter((c) => c.montoEstimado)
            if (casesWithAmount.length > 0) {
              const total = casesWithAmount.reduce((sum, c) => {
                return sum + Number(c.montoEstimado || 0)
              }, 0)
              const currency = casesWithAmount[0]?.moneda || 'USD'
              return (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: '#e7f5e7',
                    borderRadius: '4px',
                    border: '2px solid #28a745',
                  }}
                >
                  <strong style={{ fontSize: '1.1rem', color: '#28a745' }}>
                    💰 Monto Total Solicitado: {total.toLocaleString()} {currency}
                  </strong>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
                    Suma de todos los viajes de esta persona ({casesWithAmount.length} viaje{casesWithAmount.length !== 1 ? 's' : ''} con monto)
                  </p>
                </div>
              )
            }
            return null
          })()}
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #ddd' }}>
            <button
              onClick={() => setActiveTab('docs')}
              style={{
                flex: 1,
                padding: '1rem',
                border: 'none',
                backgroundColor: activeTab === 'docs' ? '#f0f0f0' : 'transparent',
                cursor: 'pointer',
                fontWeight: activeTab === 'docs' ? '600' : 'normal',
              }}
            >
              Documentos Base
            </button>
            <button
              onClick={() => setActiveTab('cases')}
              style={{
                flex: 1,
                padding: '1rem',
                border: 'none',
                backgroundColor: activeTab === 'cases' ? '#f0f0f0' : 'transparent',
                cursor: 'pointer',
                fontWeight: activeTab === 'cases' ? '600' : 'normal',
              }}
            >
              Viajes ({profile.cases.length})
            </button>
          </div>

          <div style={{ padding: '1.5rem' }}>
            {activeTab === 'docs' ? (
              <div>
                {profile.documents.length === 0 ? (
                  <p>No hay documentos base</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {profile.documents.map((doc) => {
                      const isImage = doc.mimeType?.startsWith('image/')
                      const isPdf = doc.mimeType === 'application/pdf'
                      return (
                        <div
                          key={doc.id}
                          style={{
                            padding: '1rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <strong>{doc.originalFilename}</strong>
                            <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
                              Tipo: {doc.docType} | {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              setSelectedDocument({
                                id: doc.id,
                                filename: doc.originalFilename,
                                url: doc.blobUrl,
                                type: doc.mimeType || 'application/octet-stream',
                              })
                            }
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#0066cc',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            Ver
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {profile.cases.length === 0 ? (
                  <p>No hay viajes registrados</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {profile.cases.map((caseItem) => {
                      const isViewed = viewedCases.has(caseItem.id)
                      return (
                        <Link
                          key={caseItem.id}
                          href={`/dashboard/cases/${caseItem.id}`}
                          onClick={() => markCaseAsViewed(caseItem.id)}
                          style={{
                            padding: '1rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            textDecoration: 'none',
                            color: 'inherit',
                            display: 'block',
                            backgroundColor: isViewed ? '#f9f9f9' : 'white',
                            opacity: isViewed ? 0.8 : 1,
                            borderLeft: isViewed ? '3px solid #999' : '3px solid #0066cc',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateX(4px)'
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateX(0)'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <strong>
                                  {caseItem.destinoPais}
                                  {caseItem.destinoCiudad && `, ${caseItem.destinoCiudad}`}
                                </strong>
                                {!isViewed && (
                                  <span style={{ fontSize: '0.8rem', color: '#0066cc' }}>🔵</span>
                                )}
                                {isViewed && (
                                  <span style={{ fontSize: '0.8rem', color: '#999' }}>✓</span>
                                )}
                              </div>
                              <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
                                📅 Enviado: {new Date(caseItem.createdAt).toLocaleDateString('es-DO', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
                                {caseItem.fechaSalida && `✈️ Salida: ${new Date(caseItem.fechaSalida).toLocaleDateString('es-DO')}`}
                                {caseItem.fechaRetorno && ` | Retorno: ${new Date(caseItem.fechaRetorno).toLocaleDateString('es-DO')}`}
                              </p>
                            </div>
                            <span
                              style={{
                                padding: '0.25rem 0.75rem',
                                backgroundColor: '#0066cc',
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '0.85rem',
                                fontWeight: '500',
                              }}
                            >
                              {caseItem.status}
                            </span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem',
          }}
          onClick={() => setSelectedDocument(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedDocument(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>

            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{selectedDocument.filename}</h3>

            {/* Preview */}
            <div
              style={{
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '300px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                padding: '1rem',
              }}
            >
              {selectedDocument.type.startsWith('image/') ? (
                <img
                  src={selectedDocument.url}
                  alt={selectedDocument.filename}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: '4px',
                  }}
                />
              ) : selectedDocument.type === 'application/pdf' ? (
                <iframe
                  src={selectedDocument.url}
                  style={{
                    width: '100%',
                    minHeight: '500px',
                    border: 'none',
                    borderRadius: '4px',
                  }}
                  title={selectedDocument.filename}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#666' }}>
                  <p style={{ fontSize: '3rem', margin: '1rem 0' }}>📄</p>
                  <p>Vista previa no disponible para este tipo de archivo</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <a
                href={selectedDocument.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                🔗 Abrir en Nueva Pestaña
              </a>
              <a
                href={selectedDocument.url}
                download={selectedDocument.filename}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                ⬇️ Descargar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
