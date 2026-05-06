'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/hooks/useAuth'

interface MatrixEntry {
  id: string
  eventName: string
  country: string
  city: string | null
  eventStartDate: string
  eventEndDate: string | null
  estimatedDepartureDate: string | null
  estimatedReturnDate: string | null
  collaboratorName: string | null
  collaboratorEmail: string | null
  collaboratorArea: string | null
  organizerInstitution: string | null
  objective: string | null
  perDiemType: string | null
  observations: string | null
  status: string
  daysUntilTravel: number
  isWithin30Days: boolean
  isCritical: boolean
  convertedCase?: { id: string; status: string } | null
}

const emptyForm = {
  eventName: '',
  country: '',
  city: '',
  eventStartDate: '',
  eventEndDate: '',
  estimatedDepartureDate: '',
  estimatedReturnDate: '',
  collaboratorName: '',
  collaboratorEmail: '',
  collaboratorPosition: '',
  collaboratorArea: '',
  organizerInstitution: '',
  objective: '',
  perDiemType: '',
  observations: '',
}

export default function MatrizPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [entries, setEntries] = useState<MatrixEntry[]>([])
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [countryFilter, setCountryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }
    if (user) fetchEntries()
  }, [user, loading, router, statusFilter, countryFilter])

  const fetchEntries = async () => {
    setLoadingEntries(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (countryFilter) params.set('country', countryFilter)
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/matriz?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.ok) {
      const data = await response.json()
      setEntries(data.entries || [])
    }
    setLoadingEntries(false)
  }

  const createEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const token = localStorage.getItem('token')
    const response = await fetch('/api/matriz', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (response.ok) {
      setForm(emptyForm)
      setShowForm(false)
      fetchEntries()
    } else {
      const data = await response.json()
      alert(data.error || 'Error creando viaje')
    }
  }

  const givePauta = async (entryId: string) => {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/matriz/${entryId}/pauta`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ observations: 'Pauta dada desde Matriz de Viajes' }),
    })
    if (response.ok) fetchEntries()
    else alert((await response.json()).error || 'No se pudo dar pauta')
  }

  const convertToCase = async (entryId: string) => {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/matriz/${entryId}/convert`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await response.json()
    if (response.ok) router.push(`/dashboard/cases/${data.case.id}`)
    else alert(data.error || 'No se pudo convertir a caso')
  }

  if (loading || loadingEntries) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  }

  const within30Days = entries.filter((entry) => entry.isWithin30Days).length
  const critical = entries.filter((entry) => entry.isCritical).length

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: 'white', padding: '1rem 2rem', borderBottom: '1px solid #ddd' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Image src="/indotel-logo.jpg" alt="INDOTEL Logo" width={50} height={50} style={{ objectFit: 'contain' }} />
          <div>
            <Link href="/dashboard" style={{ color: '#0066cc', textDecoration: 'none' }}>← Dashboard</Link>
            <h1 style={{ margin: '0.25rem 0 0 0' }}>Matriz de Viajes</h1>
          </div>
        </div>
      </header>

      <main style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <Stat label="Total en matriz" value={entries.length} color="#0066cc" />
          <Stat label="Viajes próximos a 30 días" value={within30Days} color="#fd7e14" />
          <Stat label="Ventana crítica" value={critical} color="#dc3545" />
        </div>

        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} placeholder="Filtrar por país" style={inputStyle} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">Todos los estados</option>
            <option value="PENDIENTE_PAUTA_RI">Pendiente pauta RI</option>
            <option value="PAUTA_RI_DADA">Pauta RI dada</option>
            <option value="CONVERTIDO_A_CASO">Convertido a caso</option>
          </select>
          <button onClick={() => setShowForm(!showForm)} style={primaryButton}>
            {showForm ? 'Cerrar formulario' : 'Crear viaje'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={createEntry} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <Field label="Nombre del viaje/evento" name="eventName" value={form.eventName} onChange={setForm} required />
              <Field label="País" name="country" value={form.country} onChange={setForm} required />
              <Field label="Ciudad" name="city" value={form.city} onChange={setForm} />
              <Field label="Fecha inicio evento" name="eventStartDate" type="date" value={form.eventStartDate} onChange={setForm} required />
              <Field label="Fecha finalización evento" name="eventEndDate" type="date" value={form.eventEndDate} onChange={setForm} />
              <Field label="Fecha estimada salida" name="estimatedDepartureDate" type="date" value={form.estimatedDepartureDate} onChange={setForm} />
              <Field label="Fecha estimada regreso" name="estimatedReturnDate" type="date" value={form.estimatedReturnDate} onChange={setForm} />
              <Field label="Colaborador designado" name="collaboratorName" value={form.collaboratorName} onChange={setForm} />
              <Field label="Email colaborador" name="collaboratorEmail" type="email" value={form.collaboratorEmail} onChange={setForm} />
              <Field label="Cargo" name="collaboratorPosition" value={form.collaboratorPosition} onChange={setForm} />
              <Field label="Área/Dirección" name="collaboratorArea" value={form.collaboratorArea} onChange={setForm} />
              <Field label="Institución organizadora" name="organizerInstitution" value={form.organizerInstitution} onChange={setForm} />
              <Field label="Tipo de viáticos" name="perDiemType" value={form.perDiemType} onChange={setForm} />
            </div>
            <textarea value={form.objective} onChange={(e) => setForm((prev) => ({ ...prev, objective: e.target.value }))} placeholder="Objetivo del viaje" style={{ ...inputStyle, width: '100%', marginTop: '1rem', minHeight: '80px' }} />
            <textarea value={form.observations} onChange={(e) => setForm((prev) => ({ ...prev, observations: e.target.value }))} placeholder="Observaciones" style={{ ...inputStyle, width: '100%', marginTop: '1rem', minHeight: '80px' }} />
            <button disabled={saving} type="submit" style={{ ...primaryButton, marginTop: '1rem' }}>
              {saving ? 'Guardando...' : 'Guardar viaje'}
            </button>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {entries.map((entry) => (
            <div key={entry.id} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.25rem', borderLeft: `5px solid ${entry.isCritical ? '#dc3545' : entry.isWithin30Days ? '#fd7e14' : '#0066cc'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{entry.eventName}</h3>
                  <p style={{ color: '#666', margin: '0.5rem 0' }}>{entry.city ? `${entry.city}, ` : ''}{entry.country}</p>
                  <p style={{ color: '#666', margin: 0 }}>
                    Colaborador: {entry.collaboratorName || 'Pendiente'} {entry.collaboratorEmail ? `(${entry.collaboratorEmail})` : ''}
                  </p>
                  <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>
                    Salida estimada: {entry.estimatedDepartureDate ? new Date(entry.estimatedDepartureDate).toLocaleDateString('es-DO') : 'No definida'} · {entry.daysUntilTravel} días
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ padding: '0.35rem 0.75rem', borderRadius: '999px', backgroundColor: '#e9ecef', fontSize: '0.85rem' }}>{entry.status}</span>
                  {entry.convertedCase ? (
                    <Link href={`/dashboard/cases/${entry.convertedCase.id}`} style={linkButton}>Ver caso</Link>
                  ) : (
                    <>
                      {entry.status === 'PENDIENTE_PAUTA_RI' && <button onClick={() => givePauta(entry.id)} style={secondaryButton}>Dar pauta RI</button>}
                      {entry.status === 'PAUTA_RI_DADA' && <button onClick={() => convertToCase(entry.id)} style={primaryButton}>Convertir en expediente</button>}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', borderTop: `4px solid ${color}` }}>
      <strong style={{ display: 'block', fontSize: '1.8rem', color }}>{value}</strong>
      <span style={{ color: '#666' }}>{label}</span>
    </div>
  )
}

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string
  name: keyof typeof emptyForm
  value: string
  onChange: React.Dispatch<React.SetStateAction<typeof emptyForm>>
  type?: string
  required?: boolean
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontWeight: 500 }}>
      {label}
      <input required={required} type={type} value={value} onChange={(e) => onChange((prev) => ({ ...prev, [name]: e.target.value }))} style={inputStyle} />
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '0.75rem',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '1rem',
}

const primaryButton: React.CSSProperties = {
  padding: '0.75rem 1rem',
  backgroundColor: '#0066cc',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  textDecoration: 'none',
}

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  backgroundColor: '#28a745',
}

const linkButton: React.CSSProperties = {
  ...primaryButton,
  display: 'inline-block',
}
