import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware/auth'
import { prisma } from '@/lib/db/prisma'
import { CaseSource, CaseStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')
    const source = searchParams.get('source') as CaseSource | null
    const status = searchParams.get('status') as CaseStatus | null
    const country = searchParams.get('country')
    const collaborator = searchParams.get('collaborator')
    const roleId = searchParams.get('roleId')

    const where: any = {}
    if (source) {
      where.source = source
    }
    if (status) where.status = status
    if (country) where.destinoPais = { contains: country, mode: 'insensitive' }
    if (collaborator) {
      where.profile = {
        OR: [
          { fullName: { contains: collaborator, mode: 'insensitive' } },
          { primaryEmail: { contains: collaborator, mode: 'insensitive' } },
        ],
      }
    }
    if (roleId) {
      where.tasks = {
        some: {
          status: 'PENDING',
          assignedRoleId: roleId,
        },
      }
    }

    const cases = await prisma.case.findMany({
      where,
      include: {
        profile: {
          select: {
            id: true,
            fullName: true,
            primaryEmail: true,
            cedula: true,
          },
        },
        _count: {
          select: {
            documents: true,
            tasks: true,
          },
        },
        readReceipts: {
          where: { userId: authUser.userId },
          select: { readAt: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    })

    const totalCount = await prisma.case.count({ where })
    const unreadCount = cases.filter((caseItem) => caseItem.readReceipts.length === 0).length

    return NextResponse.json({
      cases,
      totalCount,
      page,
      limit,
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching recent cases:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
