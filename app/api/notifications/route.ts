import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'

export async function GET(request: NextRequest) {
  const { user, response } = await getAuthorizedUser(request, 'notifications:read')
  if (!user) return response!

  const notifications = await prisma.notification.findMany({
    where: { OR: [{ userId: user.userId }, { userId: null }] },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ notifications })
}

export async function PATCH(request: NextRequest) {
  const { user, response } = await getAuthorizedUser(request, 'notifications:read')
  if (!user) return response!

  const { id } = await request.json()
  await prisma.notification.updateMany({
    where: { id, OR: [{ userId: user.userId }, { userId: null }] },
    data: { readAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
