export default function TestPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>✅ TEST PAGE WORKS</h1>
      <p>If you see this, Next.js is working</p>
      <hr />
      <h2>Environment Check:</h2>
      <ul>
        <li>DATABASE_URL: {process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}</li>
        <li>BLOB_READ_WRITE_TOKEN: {process.env.BLOB_READ_WRITE_TOKEN ? '✅ Set' : '❌ Missing'}</li>
        <li>JWT_SECRET: {process.env.JWT_SECRET ? '✅ Set' : '❌ Missing'}</li>
      </ul>
      <hr />
      <h2>Routes to test:</h2>
      <ul>
        <li><a href="/">/</a> - Root (should redirect)</li>
        <li><a href="/login">/login</a> - Login page</li>
        <li><a href="/dashboard">/dashboard</a> - Dashboard</li>
        <li><a href="/api/auth/login">/api/auth/login</a> - API endpoint</li>
      </ul>
    </div>
  )
}
