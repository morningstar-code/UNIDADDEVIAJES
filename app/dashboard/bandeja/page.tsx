'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import Link from 'next/link'
import Image from 'next/image'

interface Task {
  id: string
  step: string
  status: string
  case: {
    id: string
    status: string
    destinoPais: string | null
    destinoCiudad: string | null
    profile: {
      id: string
      primaryEmail: string
      fullName: string | null
    }
  }
  assignedRole: {
    name: string
  } | null
}

export default function BandejaPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      fetchTasks()
    }
  }, [user, loading, router])

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/tasks/my', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoadingTasks(false)
    }
  }

  if (loading || loadingTasks) {
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
            <h1 style={{ margin: 0, display: 'inline' }}>Mi Bandeja</h1>
          </div>
        </div>
      </header>
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {tasks.length === 0 ? (
          <div
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <p>No hay tareas pendientes</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/dashboard/cases/${task.case.id}`}
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
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ marginBottom: '0.5rem' }}>
                      {task.case.profile.fullName || task.case.profile.primaryEmail}
                    </h3>
                    <p style={{ color: '#666', margin: '0.25rem 0' }}>
                      {task.case.destinoPais}
                      {task.case.destinoCiudad && `, ${task.case.destinoCiudad}`}
                    </p>
                    <p style={{ color: '#666', margin: '0.25rem 0', fontSize: '0.9rem' }}>
                      Paso: {task.step} | Estado: {task.case.status}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#0066cc',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                      }}
                    >
                      {task.assignedRole?.name || 'Sin asignar'}
                    </span>
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
