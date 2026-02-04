import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const q = searchParams.get('q') || ''

  if (!q || q.length < 2) {
    return NextResponse.json({ profiles: [] })
  }

  const profiles = await prisma.profile.findMany({
    where: {
      OR: [
        { primaryEmail: { contains: q, mode: 'insensitive' } },
        { fullName: { contains: q, mode: 'insensitive' } },
        { cedula: { contains: q, mode: 'insensitive' } },
        { passportNumber: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 20,
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ profiles })
}
