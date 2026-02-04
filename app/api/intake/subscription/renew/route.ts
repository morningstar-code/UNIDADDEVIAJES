import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware/auth'
import { renewSubscription, listSubscriptions } from '@/lib/graph/subscriptions'
import { prisma } from '@/lib/db/prisma'

export async function POST(request: NextRequest) {
  // Allow both authenticated admin and cron (with secret header)
  const authHeader = request.headers.get('x-cron-secret')
  const isCron = authHeader === process.env.CRON_SECRET

  if (!isCron) {
    const authUser = await getAuthUser(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      include: { role: true },
    })

    if (!user || user.role.name !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  try {
    const subscriptions = await listSubscriptions()
    const results = []

    for (const sub of subscriptions) {
      if (sub.id) {
        try {
          const renewed = await renewSubscription(sub.id)
          results.push({ id: sub.id, success: true, renewed })
        } catch (error) {
          results.push({
            id: sub.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    return NextResponse.json({ renewed: results.length, results })
  } catch (error) {
    console.error('Subscription renewal error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to renew subscriptions' },
      { status: 500 }
    )
  }
}
