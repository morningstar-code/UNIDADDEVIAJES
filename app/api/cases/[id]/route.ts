import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'cases:read')
  if (!user) return response!

  const caseRecord = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      profile: {
        include: {
          documents: {
            where: { isCurrent: true, caseId: null },
            orderBy: { createdAt: 'desc' },
          },
          externalDocuments: {
            orderBy: { syncedAt: 'desc' },
          },
        },
      },
      documents: {
        where: { isCurrent: true },
        select: {
          id: true,
          docType: true,
          originalFilename: true,
          blobUrl: true,
          mimeType: true,
          source: true,
          expirationDate: true,
          sharePointWebUrl: true,
          createdAt: true,
        },
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
      designations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      travelAuthorization: true,
      documentRequirements: {
        include: {
          document: true,
          validatedByUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      generatedDocuments: {
        include: { document: true },
        orderBy: { createdAt: 'desc' },
      },
      auditLogs: {
        include: {
          actor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })

  if (!caseRecord) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 })
  }

  return NextResponse.json(caseRecord)
}
