'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/hooks/useAuth'

// ── Feather-style SVG icon helper ────────────────────────────────────────────
function Icon({ paths, size = 18 }: { paths: string[]; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}

const ICONS = {
  home: ['M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10'],
  inbox: [
    'M22 12h-6l-2 3h-4l-2-3H2',
    'M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  ],
  fileText: [
    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
    'M14 2v6h6',
    'M16 13H8',
    'M16 17H8',
    'M10 9H8',
  ],
  grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
  folder: [
    'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
  ],
  user: [
    'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
    'M12 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  ],
  users: [
    'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
    'M23 21v-2a4 4 0 0 1-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
    'M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  ],
  sync: [
    'M1 4v6h6',
    'M23 20v-6h-6',
    'M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15',
  ],
  logOut: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  bell: [
    'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9',
    'M13.73 21a2 2 0 0 1-3.46 0',
  ],
  menu: ['M3 12h18', 'M3 6h18', 'M3 18h18'],
  x: ['M18 6 6 18', 'M6 6l12 12'],
  chevronRight: ['M9 18l6-6-6-6'],
}

// ── Role label helper ─────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  RI_DIRECTORA: 'Directora RI / Amparo',
  VIAJES_ANALISTA: 'Analista de Viajes',
  DESPACHO: 'Despacho',
  CONSEJO_DIRECTIVO: 'Consejo Directivo',
}

// ── Page title from pathname ───────────────────────────────────────────────────
function getPageTitle(path: string): string {
  if (path === '/dashboard') return 'Panel de Control'
  if (path.startsWith('/dashboard/bandeja')) return 'Bandeja de Tareas'
  if (path.startsWith('/dashboard/solicitudes')) return 'Solicitudes Entrantes'
  if (path.startsWith('/dashboard/matriz')) return 'Matriz de Viajes'
  if (path.startsWith('/dashboard/cases')) return 'Detalle de Expediente'
  if (path.startsWith('/dashboard/profiles')) return 'Perfiles'
  if (path.startsWith('/dashboard/users')) return 'Usuarios'
  if (path.startsWith('/dashboard/autorizaciones')) return 'Nuevo Expediente'
  return 'Panel de Control'
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  adminOnly?: boolean
  sharepointOnly?: boolean
  onClick?: () => void
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  pathname: string
  userRole?: string
  onSyncSharePoint: () => void
  syncingSharePoint: boolean
}

function Sidebar({ isOpen, onClose, pathname, userRole, onSyncSharePoint, syncingSharePoint }: SidebarProps) {
  const { logout } = useAuth()

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Inicio', icon: <Icon paths={ICONS.home} /> },
    { href: '/dashboard/bandeja', label: 'Bandeja de tareas', icon: <Icon paths={ICONS.inbox} /> },
    { href: '/dashboard/solicitudes', label: 'Solicitudes entrantes', icon: <Icon paths={ICONS.fileText} /> },
    { href: '/dashboard/matriz', label: 'Matriz de viajes', icon: <Icon paths={ICONS.grid} /> },
    { href: '/dashboard/profiles', label: 'Perfiles', icon: <Icon paths={ICONS.user} /> },
    {
      href: '#sharepoint',
      label: syncingSharePoint ? 'Sincronizando…' : 'Sincronizar SharePoint',
      icon: <Icon paths={ICONS.sync} />,
      onClick: onSyncSharePoint,
      sharepointOnly: true,
    },
    { href: '/dashboard/users', label: 'Usuarios', icon: <Icon paths={ICONS.users} />, adminOnly: true },
  ]

  const sidebarWidth = 240
  const isMobileHidden = !isOpen

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 39,
            display: 'none',
          }}
          className="sidebar-overlay"
        />
      )}

      <aside
        style={{
          width: `${sidebarWidth}px`,
          minWidth: `${sidebarWidth}px`,
          backgroundColor: '#0f172a',
          color: '#cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          overflowY: 'auto',
          flexShrink: 0,
          zIndex: 40,
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Logo + branding */}
        <div
          style={{
            padding: '1.25rem 1.25rem 1rem',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#1e3a5f',
              borderRadius: '8px',
              padding: '4px',
              flexShrink: 0,
            }}
          >
            <Image
              src="/indotel-logo.svg"
              alt="INDOTEL"
              width={36}
              height={36}
              style={{ objectFit: 'contain', display: 'block' }}
            />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f1f5f9', letterSpacing: '0.03em' }}>
              INDOTEL
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
              Unidad de Viajes
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '0.75rem 0' }}>
          {navItems.map((item) => {
            if (item.adminOnly && userRole !== 'ADMIN') return null
            if (item.sharepointOnly && userRole !== 'ADMIN' && userRole !== 'RI_DIRECTORA' && userRole !== 'VIAJES_ANALISTA') return null

            const isActive =
              item.href !== '#sharepoint' &&
              (item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href))

            if (item.onClick) {
              return (
                <button
                  key={item.href}
                  onClick={item.onClick}
                  disabled={syncingSharePoint}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.6rem 1.25rem',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.875rem',
                    cursor: syncingSharePoint ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    borderRadius: 0,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!syncingSharePoint) (e.currentTarget as HTMLElement).style.backgroundColor = '#1e293b'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                  }}
                >
                  <span style={{ opacity: syncingSharePoint ? 0.5 : 0.7 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 1.25rem',
                  backgroundColor: isActive ? '#1e3a5f' : 'transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  borderRadius: 0,
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                  transition: 'all 0.15s',
                  fontWeight: isActive ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLElement).style.backgroundColor = '#1e293b'
                    ;(e.currentTarget as HTMLElement).style.color = '#e2e8f0'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
                  }
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div
          style={{
            borderTop: '1px solid #1e293b',
            padding: '1rem 1.25rem',
          }}
        >
          <button
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 0',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.color = '#f87171'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
            }}
          >
            <Icon paths={ICONS.logOut} size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────
interface TopbarProps {
  title: string
  user: { name: string | null; email: string; role: string } | null
  unreadCount: number
  onMenuToggle: () => void
  onBellClick: () => void
}

function Topbar({ title, user, unreadCount, onMenuToggle, onBellClick }: TopbarProps) {
  return (
    <header
      style={{
        height: '60px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.5rem',
        gap: '1rem',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#64748b',
          padding: '4px',
          display: 'none',
          borderRadius: '6px',
        }}
        className="mobile-menu-btn"
        aria-label="Abrir menú"
      >
        <Icon paths={ICONS.menu} size={20} />
      </button>

      {/* Page title */}
      <h1
        style={{
          fontSize: '1.05rem',
          fontWeight: 600,
          color: '#1e293b',
          margin: 0,
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </h1>

      {/* Right section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Notification bell */}
        <button
          onClick={onBellClick}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: unreadCount > 0 ? '#d97706' : '#64748b',
            padding: '6px',
            borderRadius: '6px',
            position: 'relative',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = '#f1f5f9'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
          }}
          title="Notificaciones"
        >
          <Icon paths={ICONS.bell} size={18} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                backgroundColor: '#dc2626',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 700,
                borderRadius: '50%',
                minWidth: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
                lineHeight: 1,
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '4px 10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            cursor: 'default',
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: '#1e3a5f',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.72rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#1e293b',
                maxWidth: '140px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.name || user?.email}
            </span>
            <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
              {ROLE_LABELS[user?.role || ''] || user?.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

// ── Dashboard Layout ──────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, logout: _logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [syncingSharePoint, setSyncingSharePoint] = useState(false)
  const lastCaseIdRef = useRef<string | null>(null)
  const [newRequestsCount, setNewRequestsCount] = useState(0)
  const [showNotification, setShowNotification] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Poll for new cases
  useEffect(() => {
    if (!user) return
    const checkNew = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('/api/cases/recent?limit=5', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        const cases = data.cases || []
        if (!cases.length) return
        const latest = cases[0]
        if (!lastCaseIdRef.current) {
          lastCaseIdRef.current = latest.id
          return
        }
        if (latest.id !== lastCaseIdRef.current) {
          let count = 0
          for (const c of cases) {
            if (c.id === lastCaseIdRef.current) break
            count++
          }
          if (count > 0) {
            setNewRequestsCount((prev) => prev + count)
            setShowNotification(true)
            setTimeout(() => setShowNotification(false), 5000)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Nueva Solicitud', {
                body: `${latest.profile?.fullName || latest.profile?.primaryEmail} envió una solicitud`,
                icon: '/indotel-logo.svg',
              })
            }
            lastCaseIdRef.current = latest.id
          }
        }
      } catch {}
    }
    checkNew()
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    const interval = setInterval(checkNew, 10000)
    return () => clearInterval(interval)
  }, [user])

  // Fetch unread notifications count
  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('token')
    const fetchCount = () => {
      fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.notifications) {
            setUnreadCount(data.notifications.filter((n: { readAt: null | string }) => !n.readAt).length)
          }
        })
        .catch(() => {})
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000)
    return () => clearInterval(interval)
  }, [user])

  const syncSharePoint = async () => {
    setSyncingSharePoint(true)
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/sharepoint/sync-profiles', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        alert(
          `Sincronización completada.\nPerfiles creados: ${data.summary?.profilesCreated || 0}\nDocumentos asociados: ${data.summary?.documentsAssociated || 0}\nErrores: ${data.summary?.errors?.length || 0}`
        )
      } else {
        alert(data.error || 'No se pudo sincronizar SharePoint')
      }
    } finally {
      setSyncingSharePoint(false)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f1f5f9',
        }}
      >
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#1a56db',
              borderRadius: '50%',
              margin: '0 auto 1rem',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ fontSize: '0.9rem' }}>Cargando…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) return null

  const pageTitle = getPageTitle(pathname)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pathname={pathname}
        userRole={user.role}
        onSyncSharePoint={syncSharePoint}
        syncingSharePoint={syncingSharePoint}
      />

      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Topbar
          title={pageTitle}
          user={user}
          unreadCount={unreadCount + newRequestsCount}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
          onBellClick={() => {
            router.push('/dashboard/solicitudes')
            setNewRequestsCount(0)
          }}
        />

        {/* Scrollable content */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: '#f1f5f9',
            padding: '1.5rem',
          }}
        >
          {children}
        </main>
      </div>

      {/* Floating new request notification */}
      {showNotification && newRequestsCount > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            backgroundColor: '#1e3a5f',
            color: 'white',
            padding: '0.875rem 1.25rem',
            borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            animation: 'slideIn 0.3s ease-out',
          }}
          onClick={() => {
            router.push('/dashboard/solicitudes')
            setNewRequestsCount(0)
            setShowNotification(false)
          }}
        >
          <Icon paths={ICONS.bell} size={18} />
          <div>
            <strong style={{ display: 'block', fontSize: '0.9rem' }}>
              {newRequestsCount} nueva{newRequestsCount > 1 ? 's' : ''} solicitud{newRequestsCount > 1 ? 'es' : ''}
            </strong>
            <span style={{ fontSize: '0.78rem', opacity: 0.8 }}>Clic para ver</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowNotification(false)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '1.1rem',
              cursor: 'pointer',
              padding: '0 4px',
            }}
          >
            ×
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .sidebar-overlay { display: block !important; }
        }
      `}</style>
    </div>
  )
}
