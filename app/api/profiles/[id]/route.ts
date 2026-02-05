import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/middleware/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthUser(request)
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.profile.findUnique({
    where: { id: params.id },
    include: {
      documents: {
        where: { isCurrent: true, profileId: { not: null }, caseId: null },
        select: {
          id: true,
          docType: true,
          originalFilename: true,
          blobUrl: true,
          mimeType: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      cases: {
        select: {
          id: true,
          status: true,
          destinoPais: true,
          destinoCiudad: true,
          fechaSalida: true,
          fechaRetorno: true,
          montoEstimado: true,
          moneda: true,
          createdAt: true,
          documents: {
            where: { isCurrent: true },
            orderBy: { createdAt: 'desc' },
          },
          tasks: {
            include: {
              assignedUser: {
                select: { id: true, name: true, email: true },
              },
              assignedRole: {
                select: { id: true, name: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  return NextResponse.json(profile)
}
