'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'
import Image from 'next/image'

interface Profile {
  id: string
  primaryEmail: string
  fullName: string | null
  cedula: string | null
  passportNumber: string | null
  phone: string | null
  departamento: string | null
  cargo: string | null
  casesCount: number
  documentsCount: number
  totalAmount: number
}

export default function ProfilesPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.length < 2) return

    setSearching(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/profiles/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProfiles(data.profiles || [])
      }
    } catch (error) {
      console.error('Error searching profiles:', error)
    } finally {
      setSearching(false)
    }
  }

  if (loading) {
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
            <h1 style={{ margin: 0, display: 'inline' }}>Perfiles</h1>
          </div>
        </div>
      </header>
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <form onSubmit={handleSearch} style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por email, nombre, cédula o pasaporte..."
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
            <button
              type="submit"
              disabled={searching || searchQuery.length < 2}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: searchQuery.length < 2 ? 'not-allowed' : 'pointer',
                opacity: searchQuery.length < 2 ? 0.5 : 1,
              }}
            >
              {searching ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </form>

        {profiles.length === 0 && searchQuery.length >= 2 && !searching ? (
          <div
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <p>No se encontraron perfiles</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {profiles.map((profile) => (
              <Link
                key={profile.id}
                href={`/dashboard/profiles/${profile.id}`}
                style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '0.5rem', fontSize: '1.2rem' }}>
                      {profile.fullName || profile.primaryEmail}
                    </h3>
                    <p style={{ color: '#666', margin: '0.25rem 0', fontSize: '0.9rem' }}>
                      📧 {profile.primaryEmail}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      {profile.cedula && (
                        <span style={{ color: '#666', fontSize: '0.9rem' }}>
                          🆔 Cédula: {profile.cedula}
                        </span>
                      )}
                      {profile.phone && (
                        <span style={{ color: '#666', fontSize: '0.9rem' }}>
                          📞 {profile.phone}
                        </span>
                      )}
                      {profile.departamento && (
                        <span style={{ color: '#666', fontSize: '0.9rem' }}>
                          🏢 {profile.departamento}
                        </span>
                      )}
                      {profile.cargo && (
                        <span style={{ color: '#666', fontSize: '0.9rem' }}>
                          💼 {profile.cargo}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '0.5rem',
                      minWidth: '200px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'flex-end',
                      }}
                    >
                      <span style={{ fontSize: '0.9rem', color: '#666' }}>
                        ✈️ {profile.casesCount} viaje{profile.casesCount !== 1 ? 's' : ''}
                      </span>
                      <span style={{ fontSize: '0.9rem', color: '#666' }}>
                        📎 {profile.documentsCount} doc{profile.documentsCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {profile.totalAmount > 0 && (
                      <span
                        style={{
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#28a745',
                          backgroundColor: '#e7f5e7',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                        }}
                      >
                        💰 Total: ${profile.totalAmount.toLocaleString()} USD
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
