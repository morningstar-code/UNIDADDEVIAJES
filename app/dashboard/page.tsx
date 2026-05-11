'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Stats {
  totalMatrix: number
  matrix30: number
  casesReceived: number
  pendingViajes: number
  pendingRI: number
  pendingDespacho: number
  pendingConsejo: number
  incompleteFiles: number
  signedFiles: number
  closed: number
  riskCases: number
  pendingAmparo: number
  returnedByAmparo: number
  outOfMapreDeadline: number
  pendingDocuments: number
  unreadNotifications: number
  totalEstimatedAmount: number
}

interface RecentCase {
  id: string
  status: string
  source: string
  destinoPais: string | null
  destinoCiudad: string | null
  createdAt: string
  profile: { fullName: string | null; primaryEmail: string }
}

interface Task {
  id: string
  step: string
  createdAt: string
  case: {
    id: string
    status: string
    destinoPais: string | null
    destinoCiudad: string | null
    profile: { fullName: string | null; primaryEmail: string }
  }
  assignedRole: { name: string } | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
}

const SOURCE_LABELS: Record<string, string> = {
  PUBLIC_FORM: 'Formulario público',
  INTERNAL: 'Registro interno',
  EMAIL: 'Correo electrónico',
  AUTHORIZATION_MEMO: 'Memorando de autorización',
  DIRECT_INSTRUCTION: 'Instrucción directa',
  EMAIL_AUTHORIZATION: 'Correo de autorización',
  MATRIX: 'Matriz de viajes',
}

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Recibido',
  PENDIENTE_VALIDACION_AMPARO: 'Pendiente Amparo',
  VALIDADO_POR_AMPARO: 'Validado – Amparo',
  DEVUELTO_POR_AMPARO: 'Devuelto por Amparo',
  RECHAZADO_POR_AMPARO: 'Rechazado – Amparo',
  PENDIENTE_DESIGNACION: 'Pendiente designación',
  DESIGNACION_ENVIADA: 'Designación enviada',
  PENDIENTE_DOCUMENTOS: 'Pendiente documentos',
  DOCUMENTOS_EN_REVISION: 'Documentos en revisión',
  EXPEDIENTE_ARMADO: 'Expediente armado',
  ENVIADO_MAPRE: 'Enviado a MAPRE',
  DESPACHO_REVIEW: 'En Despacho',
  CONSEJO_DIRECTIVO_FIRMA: 'En Consejo',
  EXPEDIENTE_FIRMADO_RECIBIDO: 'Firmado recibido',
  VIAJE_REALIZADO: 'Viaje realizado',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
  AUTORIZACION_RECIBIDA: 'Autorización recibida',
  INSTRUCCION_RECIBIDA: 'Instrucción recibida',
  FUERA_PLAZO_MAPRE: 'Fuera de plazo MAPRE',
}

const STEP_LABELS: Record<string, string> = {
  AUTHORIZATION_VALIDATION: 'Validar autorización',
  DESIGNATION: 'Enviar designación',
  DOCUMENT_COLLECTION: 'Recolección de documentos',
  DOCUMENT_REVIEW: 'Revisión documental',
  FORMULARIO_SOLICITUD: 'Formulario de solicitud',
  CARTA_MINISTRO: 'Carta al Ministro',
  EXPEDIENTE_REVIEW: 'Revisión del expediente',
  EXPEDIENTE_FIRMADO_RECEIPT: 'Recepción expediente firmado',
  POST_TRAVEL: 'Post viaje',
  LIQUIDATION_REVIEW: 'Revisión de liquidación',
  CLOSURE: 'Cierre',
}

// ── Small SVG icons ───────────────────────────────────────────────────────────
function Ic({ d, size = 16, stroke }: { d: string[]; size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={stroke || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.map((p, i) => <path key={i} d={p} />)}
    </svg>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  description,
  accent,
  icon,
  href,
}: {
  label: string
  value: number
  description: string
  accent: string
  icon: React.ReactNode
  href?: string
}) {
  const inner = (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '10px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
        padding: '1.1rem 1.25rem',
        borderLeft: `3px solid ${accent}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.875rem',
        height: '100%',
        transition: 'box-shadow 0.2s',
        cursor: href ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => {
        if (href) (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'
      }}
      onMouseLeave={(e) => {
        if (href) (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.07)'
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          backgroundColor: `${accent}18`,
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginTop: '0.2rem' }}>
          {label}
        </div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
          {description}
        </div>
      </div>
    </div>
  )

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
        {inner}
      </Link>
    )
  }
  return inner
}

// ── Alert banner ──────────────────────────────────────────────────────────────
function AlertBanner({
  level,
  message,
  detail,
  href,
}: {
  level: 'critical' | 'warning' | 'info'
  message: string
  detail?: string
  href?: string
}) {
  const colors = {
    critical: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: '#dc2626' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', icon: '#d97706' },
    info: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', icon: '#3b82f6' },
  }
  const c = colors[level]

  const inner = (
    <div
      style={{
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
      }}
    >
      <span style={{ color: c.icon, flexShrink: 0, marginTop: '1px' }}>
        {level === 'critical' ? (
          <Ic d={['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01']} size={16} stroke={c.icon} />
        ) : (
          <Ic d={['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 8v4', 'M12 16h.01']} size={16} stroke={c.icon} />
        )}
      </span>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: c.text }}>{message}</span>
        {detail && <span style={{ fontSize: '0.78rem', color: c.text, opacity: 0.8, marginLeft: '0.4rem' }}>{detail}</span>}
      </div>
      {href && (
        <span style={{ fontSize: '0.78rem', color: c.icon, fontWeight: 600, whiteSpace: 'nowrap' }}>
          Ver →
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>
        {inner}
      </Link>
    )
  }
  return inner
}

// ── Quick action card ─────────────────────────────────────────────────────────
function QuickAction({
  label,
  description,
  icon,
  href,
  accent,
  onClick,
  disabled,
}: {
  label: string
  description: string
  icon: React.ReactNode
  href?: string
  accent: string
  onClick?: () => void
  disabled?: boolean
}) {
  const style: React.CSSProperties = {
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    padding: '0.875rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    textDecoration: 'none',
    color: 'inherit',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    border: '1px solid #f1f5f9',
    transition: 'all 0.15s',
  }

  const onHover = (e: React.MouseEvent, enter: boolean) => {
    if (disabled) return
    const el = e.currentTarget as HTMLElement
    el.style.boxShadow = enter ? '0 4px 10px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.06)'
    el.style.transform = enter ? 'translateY(-1px)' : 'translateY(0)'
    el.style.borderColor = enter ? accent : '#f1f5f9'
  }

  const inner = (
    <>
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          backgroundColor: `${accent}15`,
          color: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px', lineHeight: 1.3 }}>{description}</div>
      </div>
      <Ic d={['M9 18l6-6-6-6']} size={14} stroke="#cbd5e1" />
    </>
  )

  if (onClick) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{ ...style, width: '100%', textAlign: 'left', background: '#fff' }}
        onMouseEnter={(e) => onHover(e, true)}
        onMouseLeave={(e) => onHover(e, false)}
      >
        {inner}
      </button>
    )
  }

  return (
    <Link
      href={href!}
      style={style}
      onMouseEnter={(e) => onHover(e, true)}
      onMouseLeave={(e) => onHover(e, false)}
    >
      {inner}
    </Link>
  )
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: '0.875rem' }}>
      <h2
        style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: '#1e293b',
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0.2rem 0 0' }}>{subtitle}</p>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '1.5rem',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '0.85rem',
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px dashed #e2e8f0',
      }}
    >
      {message}
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const criticalStatuses = ['FUERA_PLAZO_MAPRE', 'DEVUELTO_POR_AMPARO', 'RECHAZADO_POR_AMPARO']
  const warningStatuses = ['PENDIENTE_VALIDACION_AMPARO', 'PENDIENTE_DOCUMENTOS', 'PENDIENTE_DESIGNACION']
  const successStatuses = ['CLOSED', 'VALIDADO_POR_AMPARO', 'VIAJE_REALIZADO', 'EXPEDIENTE_FIRMADO_RECIBIDO']

  let bg = '#f1f5f9', color = '#475569'
  if (criticalStatuses.includes(status)) { bg = '#fef2f2'; color = '#991b1b' }
  else if (warningStatuses.includes(status)) { bg = '#fffbeb'; color = '#92400e' }
  else if (successStatuses.includes(status)) { bg = '#f0fdf4'; color = '#166534' }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        backgroundColor: bg,
        color,
        borderRadius: '12px',
        fontSize: '0.72rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  )
}

// ── Main Dashboard Page ───────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentCases, setRecentCases] = useState<RecentCase[]>([])
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [publicLinkCopied, setPublicLinkCopied] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('token')

    const load = async () => {
      try {
        const [statsRes, casesRes, tasksRes] = await Promise.all([
          fetch('/api/dashboard/stats', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/cases/recent?limit=8', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/tasks/my', { headers: { Authorization: `Bearer ${token}` } }),
        ])

        const [statsData, casesData, tasksData] = await Promise.all([
          statsRes.ok ? statsRes.json() : null,
          casesRes.ok ? casesRes.json() : null,
          tasksRes.ok ? tasksRes.json() : null,
        ])

        if (statsData) setStats(statsData)
        if (casesData?.cases) setRecentCases(casesData.cases)
        if (tasksData?.tasks) setMyTasks(tasksData.tasks.slice(0, 6))
      } finally {
        setLoadingData(false)
      }
    }

    load()
  }, [user])

  if (loading || !user) return null

  const publicLink = typeof window !== 'undefined' ? `${window.location.origin}/solicitar` : '/solicitar'

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink).then(() => {
      setPublicLinkCopied(true)
      setTimeout(() => setPublicLinkCopied(false), 2000)
    })
  }

  // ── Role checks ────────────────────────────────────────────────────────────
  const isAdmin = user.role === 'ADMIN'
  const canInitiate = ['ADMIN', 'RI_DIRECTORA', 'VIAJES_ANALISTA'].includes(user.role)
  const isDespacho = user.role === 'DESPACHO'
  const isConsejo = user.role === 'CONSEJO_DIRECTIVO'
  const isRiDirectora = user.role === 'RI_DIRECTORA'
  const isAnalista = user.role === 'VIAJES_ANALISTA'

  // ── Alerts derived from stats ──────────────────────────────────────────────
  const alerts: { level: 'critical' | 'warning' | 'info'; message: string; detail?: string; href: string }[] = []

  if (stats) {
    if (stats.outOfMapreDeadline > 0) {
      alerts.push({ level: 'critical', message: `${stats.outOfMapreDeadline} expediente${stats.outOfMapreDeadline > 1 ? 's' : ''} fuera del plazo MAPRE`, detail: 'Requieren acción inmediata', href: '/dashboard/solicitudes' })
    }
    if (stats.returnedByAmparo > 0) {
      alerts.push({ level: 'critical', message: `${stats.returnedByAmparo} expediente${stats.returnedByAmparo > 1 ? 's' : ''} devuelto${stats.returnedByAmparo > 1 ? 's' : ''} por Amparo`, detail: 'Pendientes de corrección', href: '/dashboard/solicitudes' })
    }
    if (stats.riskCases > 0) {
      alerts.push({ level: 'warning', message: `${stats.riskCases} expediente${stats.riskCases > 1 ? 's' : ''} con fecha próxima e incompletos`, detail: 'Menos de 30 días para salida', href: '/dashboard/solicitudes' })
    }
    if (stats.pendingAmparo > 0) {
      alerts.push({ level: 'warning', message: `${stats.pendingAmparo} expediente${stats.pendingAmparo > 1 ? 's' : ''} pendientes de validación Amparo`, href: '/dashboard/solicitudes' })
    }
    if (stats.incompleteFiles > 0) {
      alerts.push({ level: 'info', message: `${stats.incompleteFiles} expediente${stats.incompleteFiles > 1 ? 's' : ''} con documentación incompleta`, href: '/dashboard/solicitudes' })
    }
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          Panel de Control
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.3rem 0 0' }}>
          Resumen operativo de viajes institucionales · {new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* ── Alerts ────────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <SectionHeader title="Alertas y vencimientos" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alerts.map((a, i) => (
              <AlertBanner key={i} level={a.level} message={a.message} detail={a.detail} href={a.href} />
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <SectionHeader title="Indicadores" subtitle="Estado actual de los expedientes de viaje" />
        {loadingData ? (
          <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '1rem 0' }}>Cargando indicadores…</div>
        ) : stats ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.875rem' }}>
            <KpiCard
              label="Viajes en matriz"
              value={stats.totalMatrix}
              description="Total registrados en la matriz"
              accent="#3b82f6"
              icon={<Ic d={['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z']} size={18} stroke="#3b82f6" />}
              href="/dashboard/matriz"
            />
            <KpiCard
              label="Próximos 30 días"
              value={stats.matrix30}
              description="Salidas programadas este mes"
              accent="#6366f1"
              icon={<Ic d={['M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z']} size={18} stroke="#6366f1" />}
              href="/dashboard/matriz"
            />
            <KpiCard
              label="Fuera de plazo MAPRE"
              value={stats.outOfMapreDeadline}
              description="Requieren gestión urgente"
              accent={stats.outOfMapreDeadline > 0 ? '#dc2626' : '#16a34a'}
              icon={<Ic d={['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01']} size={18} stroke={stats.outOfMapreDeadline > 0 ? '#dc2626' : '#16a34a'} />}
              href="/dashboard/solicitudes"
            />
            <KpiCard
              label="Pendientes Unidad de Viajes"
              value={stats.pendingViajes}
              description="En proceso operativo activo"
              accent="#0891b2"
              icon={<Ic d={['M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2', 'M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z']} size={18} stroke="#0891b2" />}
              href="/dashboard/solicitudes"
            />
            <KpiCard
              label="Pendientes RI / Amparo"
              value={stats.pendingAmparo + stats.pendingRI}
              description="Validación y pauta pendiente"
              accent={stats.pendingAmparo > 0 ? '#d97706' : '#64748b'}
              icon={<Ic d={['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z']} size={18} stroke={stats.pendingAmparo > 0 ? '#d97706' : '#64748b'} />}
              href="/dashboard/solicitudes"
            />
            <KpiCard
              label="Pendientes de documentos"
              value={stats.pendingDocuments + stats.incompleteFiles}
              description="Con documentación incompleta"
              accent={stats.incompleteFiles > 0 ? '#d97706' : '#64748b'}
              icon={<Ic d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8']} size={18} stroke={stats.incompleteFiles > 0 ? '#d97706' : '#64748b'} />}
              href="/dashboard/solicitudes"
            />
            <KpiCard
              label="En Despacho"
              value={stats.pendingDespacho}
              description="Revisión del Despacho"
              accent="#7c3aed"
              icon={<Ic d={['M22 12h-6l-2 3h-4l-2-3H2', 'M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z']} size={18} stroke="#7c3aed" />}
              href="/dashboard/solicitudes"
            />
            <KpiCard
              label="En Consejo Directivo"
              value={stats.pendingConsejo}
              description="Pendientes de firma"
              accent="#9333ea"
              icon={<Ic d={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75']} size={18} stroke="#9333ea" />}
              href="/dashboard/solicitudes"
            />
            <KpiCard
              label="Expedientes incompletos"
              value={stats.incompleteFiles}
              description="Sin documentación completa"
              accent={stats.incompleteFiles > 3 ? '#dc2626' : '#d97706'}
              icon={<Ic d={['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01']} size={18} stroke={stats.incompleteFiles > 3 ? '#dc2626' : '#d97706'} />}
              href="/dashboard/solicitudes"
            />
            <KpiCard
              label="Cerrados"
              value={stats.closed}
              description="Expedientes finalizados"
              accent="#16a34a"
              icon={<Ic d={['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4 12 14.01l-3-3']} size={18} stroke="#16a34a" />}
              href="/dashboard/solicitudes"
            />
          </div>
        ) : (
          <EmptyState message="No se pudieron cargar los indicadores." />
        )}
      </div>

      {/* ── Body: two-column layout ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Quick actions */}
          <div>
            <SectionHeader title="Acciones rápidas" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Group: Iniciar expediente */}
              {canInitiate && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                    Iniciar expediente
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <QuickAction
                      label="Iniciar con memorando de autorización"
                      description="Crear expediente desde autorización formal, enviarlo a validación Amparo"
                      icon={<Ic d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M16 13H8']} size={17} stroke="#1a56db" />}
                      href="/dashboard/autorizaciones/nueva?mode=memo"
                      accent="#1a56db"
                    />
                    <QuickAction
                      label="Iniciar por instrucción directa"
                      description="Registrar instrucción verbal o sin memorando con evidencia y justificación"
                      icon={<Ic d={['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z']} size={17} stroke="#7c3aed" />}
                      href="/dashboard/autorizaciones/nueva?mode=instruccion"
                      accent="#7c3aed"
                    />
                    <QuickAction
                      label="Registrar viaje imprevisto / urgente"
                      description="Viaje fuera de plazo MAPRE con justificación y trazabilidad completa"
                      icon={<Ic d={['M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01']} size={17} stroke="#dc2626" />}
                      href="/dashboard/autorizaciones/nueva?mode=imprevisto"
                      accent="#dc2626"
                    />
                  </div>
                </div>
              )}

              {/* Group: Gestión operativa */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                  Gestión operativa
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.5rem' }}>
                  <QuickAction
                    label="Solicitudes entrantes"
                    description="Ver y gestionar todas las solicitudes recibidas"
                    icon={<Ic d={['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6']} size={17} stroke="#0891b2" />}
                    href="/dashboard/solicitudes"
                    accent="#0891b2"
                  />
                  <QuickAction
                    label="Matriz de viajes"
                    description="Registrar y consultar viajes programados"
                    icon={<Ic d={['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z']} size={17} stroke="#3b82f6" />}
                    href="/dashboard/matriz"
                    accent="#3b82f6"
                  />
                  <QuickAction
                    label="Bandeja de tareas"
                    description="Revisar y procesar tareas asignadas a mi rol"
                    icon={<Ic d={['M22 12h-6l-2 3h-4l-2-3H2', 'M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z']} size={17} stroke="#6366f1" />}
                    href="/dashboard/bandeja"
                    accent="#6366f1"
                  />
                  <QuickAction
                    label="Perfiles de colaboradores"
                    description="Buscar y gestionar documentos de colaboradores"
                    icon={<Ic d={['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8']} size={17} stroke="#0d9488" />}
                    href="/dashboard/profiles"
                    accent="#0d9488"
                  />
                </div>
              </div>

              {/* Group: Administración */}
              {(isAdmin || isRiDirectora || isAnalista) && (
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                    Administración
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.5rem' }}>
                    {isAdmin && (
                      <QuickAction
                        label="Gestión de usuarios"
                        description="Crear, activar y asignar roles de acceso"
                        icon={<Ic d={['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75']} size={17} stroke="#475569" />}
                        href="/dashboard/users"
                        accent="#475569"
                      />
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Recent activity */}
          <div>
            <SectionHeader title="Actividad reciente" subtitle="Últimos expedientes registrados o actualizados" />
            {loadingData ? (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Cargando actividad…</div>
            ) : recentCases.length === 0 ? (
              <EmptyState message="No hay actividad reciente." />
            ) : (
              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '10px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                  border: '1px solid #f1f5f9',
                }}
              >
                {recentCases.map((c, idx) => (
                  <Link
                    key={c.id}
                    href={`/dashboard/cases/${c.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.875rem',
                      padding: '0.875rem 1.25rem',
                      textDecoration: 'none',
                      color: 'inherit',
                      borderBottom: idx < recentCases.length - 1 ? '1px solid #f8fafc' : 'none',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      ;(e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc'
                    }}
                    onMouseLeave={(e) => {
                      ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: '#eff6ff',
                        color: '#1a56db',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {(c.profile.fullName || c.profile.primaryEmail).charAt(0).toUpperCase()}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.profile.fullName || c.profile.primaryEmail}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>
                        {c.destinoPais || 'Destino por definir'}{c.destinoCiudad ? `, ${c.destinoCiudad}` : ''} · {SOURCE_LABELS[c.source] || c.source}
                      </div>
                    </div>
                    {/* Status + date */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <StatusBadge status={c.status} />
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px' }}>
                        {fmtDate(c.createdAt)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Right column ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* My pending tasks */}
          <div>
            <SectionHeader title="Mis pendientes" subtitle="Tareas asignadas a mi rol" />
            {loadingData ? (
              <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Cargando tareas…</div>
            ) : myTasks.length === 0 ? (
              <EmptyState message="No tienes tareas pendientes." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {myTasks.map((t) => (
                  <Link
                    key={t.id}
                    href={`/dashboard/cases/${t.case.id}`}
                    style={{
                      display: 'block',
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      padding: '0.875rem 1rem',
                      textDecoration: 'none',
                      color: 'inherit',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                      border: '1px solid #f1f5f9',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement
                      el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.1)'
                      el.style.borderColor = '#bfdbfe'
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement
                      el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)'
                      el.style.borderColor = '#f1f5f9'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.case.profile.fullName || t.case.profile.primaryEmail}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                          {t.case.destinoPais || 'Destino por definir'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#1a56db', marginTop: '4px', fontWeight: 500 }}>
                          → {STEP_LABELS[t.step] || t.step}
                        </div>
                      </div>
                      <StatusBadge status={t.case.status} />
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                      {t.assignedRole?.name && <span style={{ marginRight: '0.5rem' }}>Rol: {t.assignedRole.name}</span>}
                      {fmtDate(t.createdAt)}
                    </div>
                  </Link>
                ))}
                {myTasks.length >= 6 && (
                  <Link href="/dashboard/bandeja" style={{ display: 'block', textAlign: 'center', fontSize: '0.8rem', color: '#1a56db', padding: '0.5rem', textDecoration: 'none' }}>
                    Ver todas las tareas →
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Public link card */}
          <div>
            <SectionHeader title="Formulario público" />
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '10px',
                padding: '1.1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid #f1f5f9',
              }}
            >
              <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0 0 0.875rem' }}>
                Enlace para que colaboradores presenten solicitudes de viaje de forma independiente.
              </p>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.75rem',
                  color: '#64748b',
                  marginBottom: '0.75rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {publicLink}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={copyLink}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    backgroundColor: publicLinkCopied ? '#f0fdf4' : '#eff6ff',
                    color: publicLinkCopied ? '#16a34a' : '#1a56db',
                    border: `1px solid ${publicLinkCopied ? '#bbf7d0' : '#bfdbfe'}`,
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {publicLinkCopied ? '✓ Copiado' : 'Copiar enlace'}
                </button>
                <a
                  href="/solicitar"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    display: 'block',
                    textAlign: 'center',
                    padding: '0.5rem',
                    backgroundColor: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  Abrir ↗
                </a>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0.75rem 0 0', lineHeight: 1.4 }}>
                Usar solo cuando el colaborador deba iniciar una solicitud libre, sin memorando previo.
              </p>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .dashboard-body { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
