import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'profiles:read')
  if (!user) return response!

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
          source: true,
          expirationDate: true,
          visaCountry: true,
          sharePointWebUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      externalDocuments: {
        orderBy: { syncedAt: 'desc' },
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
