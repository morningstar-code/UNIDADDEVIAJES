import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'cases:read')
  if (!user) return response!

  await prisma.readReceipt.upsert({
    where: {
      userId_caseId: {
        userId: user.userId,
        caseId: params.id,
      },
    },
    update: { readAt: new Date() },
    create: {
      userId: user.userId,
      caseId: params.id,
    },
  })

  return NextResponse.json({ success: true })
}
