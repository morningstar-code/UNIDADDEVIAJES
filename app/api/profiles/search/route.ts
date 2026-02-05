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
    include: {
      _count: {
        select: {
          cases: true,
          documents: true,
        },
      },
      cases: {
        select: {
          montoEstimado: true,
          moneda: true,
        },
      },
    },
    take: 20,
    orderBy: { updatedAt: 'desc' },
  })

  // Calculate total amount for each profile
  const profilesWithStats = profiles.map((profile) => {
    const totalAmount = profile.cases.reduce((sum, caseItem) => {
      if (caseItem.montoEstimado) {
        // Convert to USD for consistency (simplified - in production you'd use exchange rates)
        return sum + Number(caseItem.montoEstimado)
      }
      return sum
    }, 0)

    return {
      id: profile.id,
      primaryEmail: profile.primaryEmail,
      fullName: profile.fullName,
      cedula: profile.cedula,
      passportNumber: profile.passportNumber,
      phone: profile.phone,
      departamento: profile.departamento,
      cargo: profile.cargo,
      casesCount: profile._count.cases,
      documentsCount: profile._count.documents,
      totalAmount,
    }
  })

  return NextResponse.json({ profiles: profilesWithStats })
}
