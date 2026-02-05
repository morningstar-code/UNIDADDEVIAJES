'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

interface CaseDetail {
  id: string
  status: string
  source: string
  destinoPais: string | null
  destinoCiudad: string | null
  fechaSalida: string | null
  fechaRetorno: string | null
  motivo: string | null
  evento: string | null
  institucionOrganizadora: string | null
  montoEstimado: string | null
  moneda: string | null
  profile: {
    id: string
    primaryEmail: string
    fullName: string | null
  }
  documents: Array<{
    id: string
    docType: string
    originalFilename: string
    blobUrl: string
    mimeType?: string
    createdAt: string
  }>
  tasks: Array<{
    id: string
    step: string
    status: string
    assignedRole: { name: string } | null
    assignedUser: { name: string | null } | null
    completedAt: string | null
    createdAt: string
  }>
  auditLogs: Array<{
    id: string
    action: string
    actor: { name: string | null } | null
    createdAt: string
    details: any
  }>
}

export default function CaseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading } = useAuth()
  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null)
  const [loadingCase, setLoadingCase] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [comment, setComment] = useState('')
  const [selectedDocument, setSelectedDocument] = useState<{
    id: string
    filename: string
    url: string
    type: string
  } | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
      return
    }

    if (user && params.id) {
      fetchCase()
    }
  }, [user, loading, params.id, router])

  const fetchCase = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/cases/${params.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setCaseDetail(data)
      }
    } catch (error) {
      console.error('Error fetching case:', error)
    } finally {
      setLoadingCase(false)
    }
  }

  const handleTaskAction = async (taskId: string, action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO') => {
    setActionLoading(taskId)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/tasks/${taskId}/action`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, comment }),
      })

      if (response.ok) {
        setComment('')
        await fetchCase()
      } else {
        const data = await response.json()
        alert(data.error || 'Error processing action')
      }
    } catch (error) {
      console.error('Error processing action:', error)
      alert('Error processing action')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading || loadingCase) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!caseDetail) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>Case not found</p>
      </div>
    )
  }

  const currentTask = caseDetail.tasks.find((t) => t.status === 'PENDING')

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
            href="/dashboard/bandeja"
            style={{ color: '#0066cc', textDecoration: 'none', marginRight: '1rem' }}
          >
            ← Bandeja
          </Link>
          <h1 style={{ margin: '1rem 0 0 0' }}>
            Caso: {caseDetail.destinoPais}
            {caseDetail.destinoCiudad && `, ${caseDetail.destinoCiudad}`}
          </h1>
        </div>
      </header>
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px' }}>
            <h2 style={{ marginBottom: '1rem' }}>Información del Viaje</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <strong>Estado:</strong> {caseDetail.status}
              </div>
              <div>
                <strong>Solicitante:</strong>{' '}
                <Link
                  href={`/dashboard/profiles/${caseDetail.profile.id}`}
                  style={{ color: '#0066cc' }}
                >
                  {caseDetail.profile.fullName || caseDetail.profile.primaryEmail}
                </Link>
              </div>
              {caseDetail.destinoPais && (
                <div>
                  <strong>Destino:</strong> {caseDetail.destinoPais}
                  {caseDetail.destinoCiudad && `, ${caseDetail.destinoCiudad}`}
                </div>
              )}
              {caseDetail.fechaSalida && (
                <div>
                  <strong>Fecha Salida:</strong> {new Date(caseDetail.fechaSalida).toLocaleDateString()}
                </div>
              )}
              {caseDetail.fechaRetorno && (
                <div>
                  <strong>Fecha Retorno:</strong> {new Date(caseDetail.fechaRetorno).toLocaleDateString()}
                </div>
              )}
              {caseDetail.motivo && (
                <div>
                  <strong>Motivo:</strong> {caseDetail.motivo}
                </div>
              )}
              {caseDetail.evento && (
                <div>
                  <strong>Evento:</strong> {caseDetail.evento}
                </div>
              )}
              {caseDetail.institucionOrganizadora && (
                <div>
                  <strong>Institución:</strong> {caseDetail.institucionOrganizadora}
                </div>
              )}
              {caseDetail.montoEstimado && (
                <div>
                  <strong>Monto Estimado:</strong> {caseDetail.montoEstimado} {caseDetail.moneda || 'USD'}
                </div>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px' }}>
            <h2 style={{ marginBottom: '1rem' }}>Tarea Actual</h2>
            {currentTask ? (
              <div>
                <p>
                  <strong>Paso:</strong> {currentTask.step}
                </p>
                <p>
                  <strong>Asignado a:</strong> {currentTask.assignedRole?.name || 'Sin asignar'}
                </p>
                <div style={{ marginTop: '1rem' }}>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Comentario (opcional)"
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      marginBottom: '0.5rem',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleTaskAction(currentTask.id, 'APPROVE')}
                      disabled={actionLoading === currentTask.id}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: actionLoading === currentTask.id ? 'not-allowed' : 'pointer',
                        opacity: actionLoading === currentTask.id ? 0.6 : 1,
                      }}
                    >
                      {actionLoading === currentTask.id ? 'Procesando...' : 'Aprobar'}
                    </button>
                    <button
                      onClick={() => handleTaskAction(currentTask.id, 'REJECT')}
                      disabled={actionLoading === currentTask.id}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: actionLoading === currentTask.id ? 'not-allowed' : 'pointer',
                        opacity: actionLoading === currentTask.id ? 0.6 : 1,
                      }}
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => handleTaskAction(currentTask.id, 'REQUEST_INFO')}
                      disabled={actionLoading === currentTask.id}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        backgroundColor: '#ffc107',
                        color: 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: actionLoading === currentTask.id ? 'not-allowed' : 'pointer',
                        opacity: actionLoading === currentTask.id ? 0.6 : 1,
                      }}
                    >
                      Solicitar Info
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p>No hay tareas pendientes</p>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Documentos</h2>
          {caseDetail.documents.length === 0 ? (
            <p>No hay documentos</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {caseDetail.documents.map((doc) => (
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
                  <button
                    onClick={() =>
                      setSelectedDocument({
                        id: doc.id,
                        filename: doc.originalFilename,
                        url: doc.blobUrl,
                        type: doc.mimeType || '',
                      })
                    }
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#0066cc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Ver
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px' }}>
          <h2 style={{ marginBottom: '1rem' }}>Historial / Auditoría</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {caseDetail.auditLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                }}
              >
                <strong>{log.action}</strong> - {log.actor?.name || 'Sistema'} -{' '}
                {new Date(log.createdAt).toLocaleString()}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Document Preview Modal */}
      {selectedDocument && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem',
          }}
          onClick={() => setSelectedDocument(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedDocument(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>

            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{selectedDocument.filename}</h3>

            {/* Preview */}
            <div
              style={{
                marginBottom: '1.5rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '300px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                padding: '1rem',
              }}
            >
              {selectedDocument.type.startsWith('image/') ? (
                <img
                  src={selectedDocument.url}
                  alt={selectedDocument.filename}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: '4px',
                  }}
                />
              ) : selectedDocument.type === 'application/pdf' ? (
                <iframe
                  src={selectedDocument.url}
                  style={{
                    width: '100%',
                    minHeight: '500px',
                    border: 'none',
                    borderRadius: '4px',
                  }}
                  title={selectedDocument.filename}
                />
              ) : (
                <div style={{ textAlign: 'center', color: '#666' }}>
                  <p style={{ fontSize: '3rem', margin: '1rem 0' }}>📄</p>
                  <p>Vista previa no disponible para este tipo de archivo</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <a
                href={selectedDocument.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#0066cc',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                🔗 Abrir en Nueva Pestaña
              </a>
              <a
                href={selectedDocument.url}
                download={selectedDocument.filename}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                ⬇️ Descargar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
