import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware/auth'
import { createSubscription } from '@/lib/graph/subscriptions'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    include: { role: true },
  })

  if (!user || user.role.name !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const subscription = await createSubscription()
    return NextResponse.json(subscription)
  } catch (error) {
    console.error('Subscription creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
