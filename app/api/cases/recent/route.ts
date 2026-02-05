import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware/auth'
import { prisma } from '@/lib/db/prisma'
import { CaseSource } from '@prisma/client'

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const source = searchParams.get('source') as CaseSource | null

    const where: any = {}
    if (source) {
      where.source = source
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
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    })

    // Get unread count (cases not viewed yet - we'll track this later)
    const totalCount = await prisma.case.count({ where })

    return NextResponse.json({
      cases,
      totalCount,
      unreadCount: 0, // TODO: implement view tracking
    })
  } catch (error) {
    console.error('Error fetching recent cases:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
