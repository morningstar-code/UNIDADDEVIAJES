'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

interface Role { id: string; name: string }
interface AppUser { id: string; email: string; name: string | null; isActive: boolean; role: Role; createdAt: string }

export default function UsersPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [form, setForm] = useState({ email: '', name: '', password: '', roleId: '' })

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user) fetchUsers()
  }, [user, loading, router])

  const fetchUsers = async () => {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
    if (response.ok) {
      const data = await response.json()
      setUsers(data.users || [])
      setRoles(data.roles || [])
    }
  }

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (response.ok) {
      setForm({ email: '', name: '', password: '', roleId: '' })
      fetchUsers()
    } else {
      alert((await response.json()).error || 'No se pudo crear usuario')
    }
  }

  const toggleUser = async (target: AppUser) => {
    const token = localStorage.getItem('token')
    const response = await fetch(`/api/users/${target.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: target.name, roleId: target.role.id, isActive: !target.isActive }),
    })
    if (response.ok) fetchUsers()
  }

  if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <form onSubmit={createUser} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <h2>Crear usuario</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <input required placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} style={inputStyle} />
            <input placeholder="Nombre" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} style={inputStyle} />
            <input required placeholder="Contraseña temporal" type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} style={inputStyle} />
            <select required value={form.roleId} onChange={(e) => setForm((prev) => ({ ...prev, roleId: e.target.value }))} style={inputStyle}>
              <option value="">Seleccionar rol</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
          </div>
          <button style={primaryButton}>Crear</button>
        </form>

        <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          {users.map((item) => (
            <div key={item.id} style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <strong>{item.name || item.email}</strong>
                <p style={{ margin: '0.25rem 0', color: '#666' }}>{item.email} · {item.role.name}</p>
              </div>
              <button onClick={() => toggleUser(item)} style={{ ...primaryButton, backgroundColor: item.isActive ? '#dc3545' : '#28a745' }}>
                {item.isActive ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          ))}
        </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '0.75rem',
  border: '1px solid #ddd',
  borderRadius: '4px',
}

const primaryButton: React.CSSProperties = {
  marginTop: '1rem',
  padding: '0.75rem 1rem',
  backgroundColor: '#0066cc',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
}
