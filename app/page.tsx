'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Redirecting to login...</p>
    </div>
  )
}
