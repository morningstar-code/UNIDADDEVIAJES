import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '4rem', margin: '0 0 1rem 0', color: '#333' }}>404</h1>
        <h2 style={{ margin: '0 0 1rem 0', color: '#666' }}>Page Not Found</h2>
        <p style={{ margin: '0 0 2rem 0', color: '#999' }}>
          The page you are looking for does not exist.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '0.75rem 2rem',
            backgroundColor: '#0066cc',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
            fontWeight: '500',
          }}
        >
          Go to Home
        </Link>
      </div>
    </div>
  )
}
