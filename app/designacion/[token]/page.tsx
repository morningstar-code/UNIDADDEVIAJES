'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

interface Requirement {
  id: string
  docType: string
  label: string
  required: boolean
  status: string
}

interface DesignationData {
  id: string
  status: string
  collaboratorName: string | null
  collaboratorEmail: string
  case: {
    evento: string | null
    destinoPais: string | null
    destinoCiudad: string | null
    fechaSalida: string | null
    fechaRetorno: string | null
    motivo: string | null
    institucionOrganizadora: string | null
    requirements: Requirement[]
  }
}

export default function DesignacionPage() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<DesignationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [confirmedAvailability, setConfirmedAvailability] = useState(false)

  useEffect(() => {
    fetch(`/api/designacion/${token}`)
      .then((res) => res.json())
      .then((payload) => {
        if (payload.error) setMessage(payload.error)
        else setData(payload)
      })
      .finally(() => setLoading(false))
  }, [token])

  const respond = async (action: 'ACCEPT' | 'REJECT') => {
    const response = await fetch(`/api/designacion/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        acceptedTerms,
        confirmedAvailability,
        reason: action === 'REJECT' ? prompt('Indique la razon del rechazo') : undefined,
      }),
    })
    const payload = await response.json()
    if (response.ok) {
      setMessage(action === 'ACCEPT' ? 'Designacion aceptada. Puede subir documentos.' : 'Designacion rechazada.')
      setData((prev) => (prev ? { ...prev, status: payload.status } : prev))
    } else {
      setMessage(payload.error || 'No se pudo procesar la respuesta')
    }
  }

  const uploadDocument = async (requirementId: string, file: File | null) => {
    if (!file) return
    const formData = new FormData()
    formData.append('requirementId', requirementId)
    formData.append('file', file)
    const response = await fetch(`/api/designacion/${token}/documents`, {
      method: 'POST',
      body: formData,
    })
    if (response.ok) {
      setMessage('Documento subido correctamente.')
      const refreshed = await fetch(`/api/designacion/${token}`).then((res) => res.json())
      setData(refreshed)
    } else {
      setMessage((await response.json()).error || 'No se pudo subir el documento')
    }
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
  if (!data) return <div style={{ padding: '2rem', textAlign: 'center' }}>{message || 'Designacion no encontrada'}</div>

  const canUpload = data.status === 'ACCEPTED'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '2rem' }}>
      <main style={{ maxWidth: '900px', margin: '0 auto', backgroundColor: 'white', borderRadius: '10px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Image src="/indotel-logo.jpg" alt="INDOTEL Logo" width={80} height={80} style={{ objectFit: 'contain' }} />
          <h1>Designacion de Viaje Institucional</h1>
        </div>

        {message && (
          <div style={{ padding: '1rem', backgroundColor: '#e7f5ff', borderRadius: '6px', marginBottom: '1rem' }}>
            {message}
          </div>
        )}

        <section style={cardStyle}>
          <h2>{data.case.evento || 'Viaje institucional'}</h2>
          <p><strong>Colaborador:</strong> {data.collaboratorName || data.collaboratorEmail}</p>
          <p><strong>Destino:</strong> {data.case.destinoCiudad ? `${data.case.destinoCiudad}, ` : ''}{data.case.destinoPais || 'Por definir'}</p>
          <p><strong>Fechas:</strong> {data.case.fechaSalida ? new Date(data.case.fechaSalida).toLocaleDateString('es-DO') : 'Por definir'} - {data.case.fechaRetorno ? new Date(data.case.fechaRetorno).toLocaleDateString('es-DO') : 'Por definir'}</p>
          <p><strong>Institucion organizadora:</strong> {data.case.institucionOrganizadora || 'Por definir'}</p>
          <p><strong>Objetivo:</strong> {data.case.motivo || 'Por definir'}</p>
        </section>

        {data.status === 'SENT' && (
          <section style={cardStyle}>
            <label style={{ display: 'block', marginBottom: '0.75rem' }}>
              <input type="checkbox" checked={confirmedAvailability} onChange={(e) => setConfirmedAvailability(e.target.checked)} /> Confirmo mi disponibilidad para participar en este viaje.
            </label>
            <label style={{ display: 'block', marginBottom: '1rem' }}>
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} /> Acepto los terminos y condiciones del viaje institucional.
            </label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button disabled={!acceptedTerms || !confirmedAvailability} onClick={() => respond('ACCEPT')} style={primaryButton}>Aceptar designacion</button>
              <button onClick={() => respond('REJECT')} style={dangerButton}>Rechazar</button>
            </div>
          </section>
        )}

        <section style={cardStyle}>
          <h2>Documentos requeridos</h2>
          {!canUpload && <p style={{ color: '#666' }}>Debe aceptar la designacion antes de cargar documentos.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.case.requirements.map((req) => (
              <div key={req.id} style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '1rem' }}>
                <strong>{req.label}</strong> {req.required ? <span style={{ color: '#dc3545' }}>*</span> : <span style={{ color: '#666' }}>(opcional)</span>}
                <p style={{ margin: '0.25rem 0', color: '#666' }}>Estado: {req.status}</p>
                {canUpload && (
                  <input type="file" onChange={(e) => uploadDocument(req.id, e.target.files?.[0] || null)} />
                )}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #e5e5e5',
  borderRadius: '8px',
  padding: '1.25rem',
  marginBottom: '1.25rem',
}

const primaryButton: React.CSSProperties = {
  padding: '0.75rem 1rem',
  backgroundColor: '#0066cc',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
}

const dangerButton: React.CSSProperties = {
  ...primaryButton,
  backgroundColor: '#dc3545',
}
