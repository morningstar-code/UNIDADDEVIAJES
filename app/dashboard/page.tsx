'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'
import Image from 'next/image'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

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
    </div>
  )
}
