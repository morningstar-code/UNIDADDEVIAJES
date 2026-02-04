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
    createdAt: string
  }>
  cases: Array<{
    id: string
    status: string
    destinoPais: string | null
    destinoCiudad: string | null
    fechaSalida: string | null
    fechaRetorno: string | null
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
                    {profile.documents.map((doc) => (
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
                        <a
                          href={doc.blobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#0066cc',
                            color: 'white',
                            borderRadius: '4px',
                            textDecoration: 'none',
                          }}
                        >
                          Ver
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {profile.cases.length === 0 ? (
                  <p>No hay viajes registrados</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {profile.cases.map((caseItem) => (
                      <Link
                        key={caseItem.id}
                        href={`/dashboard/cases/${caseItem.id}`}
                        style={{
                          padding: '1rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          color: 'inherit',
                          display: 'block',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <strong>
                              {caseItem.destinoPais}
                              {caseItem.destinoCiudad && `, ${caseItem.destinoCiudad}`}
                            </strong>
                            <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
                              {caseItem.fechaSalida && `Salida: ${new Date(caseItem.fechaSalida).toLocaleDateString()}`}
                              {caseItem.fechaRetorno && ` | Retorno: ${new Date(caseItem.fechaRetorno).toLocaleDateString()}`}
                            </p>
                          </div>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              backgroundColor: '#0066cc',
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '0.85rem',
                            }}
                          >
                            {caseItem.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
