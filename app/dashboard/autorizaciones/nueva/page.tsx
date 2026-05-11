'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'

type ProfileOption = {
  id: string
  fullName: string | null
  primaryEmail: string | null
  cedula: string | null
}

type AuthorizationForm = {
  fullName: string
  email: string
  cedula: string
  cargo: string
  departamento: string
  evento: string
  destinoPais: string
  destinoCiudad: string
  fechaSalida: string
  fechaRetorno: string
  institucionOrganizadora: string
  motivo: string
  authorizedBy: string
  evidenceChannel: string
  justification: string
  observaciones: string
  isRecurringTravel: boolean
  isUnexpectedTravel: boolean
}

const modeConfig = {
  memo: {
    title: 'Iniciar con memorando / autorización formal',
    authorizationType: 'MEMORANDO_PRESIDENCIA',
    evidenceChannel: 'MEMORANDO_FORMAL',
    help: 'Use esta opción cuando exista un memorando o autorización formal adjunta.',
  },
  instruccion: {
    title: 'Iniciar sin memorando / instrucción directa',
    authorizationType: 'CORREO_INSTRUCCION',
    evidenceChannel: 'CORREO_AMPARO',
    help: 'Use esta opción cuando la instrucción llegó por correo, verbalmente o por otro canal documentable.',
  },
  imprevisto: {
    title: 'Crear viaje imprevisto',
    authorizationType: 'VIAJE_IMPREVISTO',
    evidenceChannel: 'OTRO',
    help: 'Use esta opción para viajes urgentes o fuera de matriz. La justificación es obligatoria.',
  },
} as const

export default function NuevaAutorizacionPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [mode, setMode] = useState<keyof typeof modeConfig>('memo')
  const config = modeConfig[mode] || modeConfig.memo
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [profileQuery, setProfileQuery] = useState('')
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [selectedProfile, setSelectedProfile] = useState<ProfileOption | null>(null)
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [form, setForm] = useState<AuthorizationForm>({
    fullName: '',
    email: '',
    cedula: '',
    cargo: '',
    departamento: '',
    evento: '',
    destinoPais: '',
    destinoCiudad: '',
    fechaSalida: '',
    fechaRetorno: '',
    institucionOrganizadora: '',
    motivo: '',
    authorizedBy: '',
    evidenceChannel: config.evidenceChannel,
    justification: '',
    observaciones: '',
    isRecurringTravel: false,
    isUnexpectedTravel: mode === 'imprevisto',
  })

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const nextMode = searchParams.get('mode') as keyof typeof modeConfig | null
    if (nextMode && nextMode in modeConfig) setMode(nextMode)
  }, [])

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      evidenceChannel: config.evidenceChannel,
      isUnexpectedTravel: mode === 'imprevisto',
    }))
  }, [config.evidenceChannel, mode])

  useEffect(() => {
    if (!profileQuery.trim() || profileQuery.trim().length < 3) {
      setProfiles([])
      return
    }
    const timeout = setTimeout(async () => {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/profiles/search?q=${encodeURIComponent(profileQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setProfiles(data.profiles || [])
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [profileQuery])

  const canSubmit = useMemo(() => {
    return (
      (selectedProfile || form.email || form.cedula) &&
      form.destinoPais &&
      form.destinoCiudad &&
      form.evento &&
      form.authorizedBy &&
      form.justification
    )
  }, [form, selectedProfile])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!canSubmit) {
      setError('Complete colaborador, viaje, autorizador y justificación.')
      return
    }

    setSaving(true)
    const token = localStorage.getItem('token')
    const data = new FormData()
    data.append('authorizationType', config.authorizationType)
    data.append('evidenceChannel', form.evidenceChannel)
    if (selectedProfile) data.append('profileId', selectedProfile.id)
    for (const [key, value] of Object.entries(form)) {
      data.append(key, String(value))
    }
    if (evidenceFile) data.append('evidenceFile', evidenceFile)

    const response = await fetch('/api/cases/authorization', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    })
    const payload = await response.json()
    setSaving(false)
    if (response.ok) {
      router.push(`/dashboard/cases/${payload.case.id}`)
    } else {
      setError(payload.error || 'No se pudo iniciar el expediente')
    }
  }

  if (loading || !user) return <div style={{ padding: '2rem' }}>Cargando...</div>

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/dashboard" style={{ color: '#1a56db', textDecoration: 'none', fontSize: '0.875rem' }}>← Volver al Panel</Link>
        <h1 style={{ margin: '0.4rem 0 0', fontSize: '1.3rem', color: '#1e293b' }}>{config.title}</h1>
      </div>
        <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffe69c', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', color: '#664d03' }}>
          {config.help} La designación solo podrá enviarse después de validación Amparo / RI.
        </div>

        {error && (
          <div style={{ backgroundColor: '#f8d7da', border: '1px solid #f1aeb5', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', color: '#58151c' }}>
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
          <h2 style={{ marginTop: 0 }}>Colaborador</h2>
          <label style={labelStyle}>
            Buscar perfil existente
            <input value={profileQuery} onChange={(e) => setProfileQuery(e.target.value)} placeholder="Nombre, email, cédula o pasaporte" style={inputStyle} />
          </label>
          {profiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {profiles.slice(0, 5).map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => {
                    setSelectedProfile(profile)
                    setProfiles([])
                    setProfileQuery(profile.fullName || profile.primaryEmail || profile.cedula || '')
                  }}
                  style={{ ...secondaryButton, textAlign: 'left' }}
                >
                  {profile.fullName || profile.primaryEmail || 'Perfil'} - {profile.primaryEmail || profile.cedula || 'sin identificador'}
                </button>
              ))}
            </div>
          )}
          {selectedProfile && (
            <p style={{ color: '#198754', fontWeight: 600 }}>Perfil seleccionado: {selectedProfile.fullName || selectedProfile.primaryEmail}</p>
          )}

          <div style={gridStyle}>
            <Field label="Nombre completo si no existe perfil" name="fullName" value={form.fullName} setForm={setForm} />
            <Field label="Email si no existe perfil" name="email" type="email" value={form.email} setForm={setForm} />
            <Field label="Cédula si no existe perfil" name="cedula" value={form.cedula} setForm={setForm} />
            <Field label="Cargo" name="cargo" value={form.cargo} setForm={setForm} />
            <Field label="Departamento" name="departamento" value={form.departamento} setForm={setForm} />
          </div>

          <h2>Datos del viaje</h2>
          <div style={gridStyle}>
            <Field label="Evento / viaje" name="evento" value={form.evento} setForm={setForm} required />
            <Field label="País" name="destinoPais" value={form.destinoPais} setForm={setForm} required />
            <Field label="Ciudad" name="destinoCiudad" value={form.destinoCiudad} setForm={setForm} required />
            <Field label="Fecha salida" name="fechaSalida" type="date" value={form.fechaSalida} setForm={setForm} />
            <Field label="Fecha retorno" name="fechaRetorno" type="date" value={form.fechaRetorno} setForm={setForm} />
            <Field label="Institución organizadora" name="institucionOrganizadora" value={form.institucionOrganizadora} setForm={setForm} />
          </div>
          <TextArea label="Motivo / objetivo" name="motivo" value={form.motivo} setForm={setForm} />

          <h2>Autorización / instrucción</h2>
          <div style={gridStyle}>
            <Field label="Quién autorizó o instruyó" name="authorizedBy" value={form.authorizedBy} setForm={setForm} required />
            <label style={labelStyle}>
              Canal de evidencia
              <select value={form.evidenceChannel} onChange={(e) => setForm((prev) => ({ ...prev, evidenceChannel: e.target.value }))} style={inputStyle}>
                <option value="MEMORANDO_FORMAL">Memorando formal</option>
                <option value="CORREO_AMPARO">Correo de Amparo</option>
                <option value="CORREO_PRESIDENCIA">Correo de Presidencia</option>
                <option value="CORREO_DIRECTOR_SECRETARIA">Correo director/secretaria</option>
                <option value="INSTRUCCION_VERBAL_REGISTRADA">Instrucción verbal registrada</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="OTRO">Otro</option>
              </select>
            </label>
            <label style={labelStyle}>
              Evidencia / memorando
              <input type="file" onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} style={inputStyle} />
            </label>
          </div>
          <TextArea label="Justificación obligatoria" name="justification" value={form.justification} setForm={setForm} required />
          <TextArea label="Observaciones internas" name="observaciones" value={form.observaciones} setForm={setForm} />

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="checkbox" checked={form.isRecurringTravel} onChange={(e) => setForm((prev) => ({ ...prev, isRecurringTravel: e.target.checked }))} />
              Viaje recurrente/fijo
            </label>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input type="checkbox" checked={form.isUnexpectedTravel} onChange={(e) => setForm((prev) => ({ ...prev, isUnexpectedTravel: e.target.checked }))} />
              Viaje imprevisto / urgente
            </label>
          </div>

          <button type="submit" disabled={saving} style={{ ...primaryButton, marginTop: '1.5rem' }}>
            {saving ? 'Creando expediente...' : 'Crear expediente y enviar a validación Amparo'}
          </button>
        </form>
    </div>
  )
}

function Field({
  label,
  name,
  value,
  setForm,
  type = 'text',
  required = false,
}: {
  label: string
  name: string
  value: string
  setForm: React.Dispatch<React.SetStateAction<any>>
  type?: string
  required?: boolean
}) {
  return (
    <label style={labelStyle}>
      {label}
      <input required={required} type={type} value={value} onChange={(e) => setForm((prev: any) => ({ ...prev, [name]: e.target.value }))} style={inputStyle} />
    </label>
  )
}

function TextArea({
  label,
  name,
  value,
  setForm,
  required = false,
}: {
  label: string
  name: string
  value: string
  setForm: React.Dispatch<React.SetStateAction<any>>
  required?: boolean
}) {
  return (
    <label style={{ ...labelStyle, marginTop: '1rem' }}>
      {label}
      <textarea required={required} value={value} onChange={(e) => setForm((prev: any) => ({ ...prev, [name]: e.target.value }))} style={{ ...inputStyle, minHeight: '90px' }} />
    </label>
  )
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '1rem',
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
  fontWeight: 600,
  color: '#333',
}

const inputStyle: React.CSSProperties = {
  padding: '0.75rem',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '1rem',
}

const primaryButton: React.CSSProperties = {
  padding: '0.85rem 1.25rem',
  backgroundColor: '#0066cc',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 700,
}

const secondaryButton: React.CSSProperties = {
  padding: '0.6rem 0.75rem',
  backgroundColor: '#f8f9fa',
  color: '#333',
  border: '1px solid #ddd',
  borderRadius: '4px',
  cursor: 'pointer',
}
