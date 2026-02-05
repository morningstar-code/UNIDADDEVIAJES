import Image from 'next/image'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface SuccessPageProps {
  searchParams: { caseId?: string; caseNumber?: string }
}

export default function SuccessPage({ searchParams }: SuccessPageProps) {
  const caseId = searchParams.caseId
  const caseNumber = searchParams.caseNumber

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
          width={60}
          height={60}
          style={{ objectFit: 'contain' }}
        />
        <h1 style={{ margin: 0 }}>INDOTEL - Solicitud de Viaje</h1>
      </header>

      <main
        style={{
          padding: '2rem',
          maxWidth: '600px',
          margin: '2rem auto',
          backgroundColor: 'white',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '4rem',
            marginBottom: '1rem',
          }}
        >
          ✅
        </div>
        <h2 style={{ marginTop: 0, color: '#28a745' }}>
          Solicitud Recibida
        </h2>
        <p style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>
          Tu solicitud de viaje ha sido recibida exitosamente.
        </p>

        {caseNumber && (
          <div
            style={{
              padding: '1.5rem',
              backgroundColor: '#f0f0f0',
              borderRadius: '8px',
              marginBottom: '1.5rem',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
              Número de Solicitud:
            </p>
            <p
              style={{
                margin: '0.5rem 0 0 0',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#0066cc',
              }}
            >
              {caseNumber}
            </p>
            {caseId && (
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#999' }}>
                ID: {caseId}
              </p>
            )}
          </div>
        )}

        <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Próximos pasos:</h3>
          <ul style={{ paddingLeft: '1.5rem', color: '#666' }}>
            <li>Tu solicitud será revisada por el equipo de la Unidad de Viajes</li>
            <li>Te contactaremos si necesitamos información adicional</li>
            <li>Recibirás actualizaciones sobre el estado de tu solicitud</li>
          </ul>
        </div>

        <div
          style={{
            padding: '1rem',
            backgroundColor: '#e7f3ff',
            borderRadius: '4px',
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#0066cc' }}>
            <strong>Nota:</strong> Guarda el número de solicitud para futuras consultas.
          </p>
        </div>

        <Link
          href="/solicitar"
          style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            backgroundColor: '#0066cc',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
          }}
        >
          Nueva Solicitud
        </Link>
      </main>
    </div>
  )
}
