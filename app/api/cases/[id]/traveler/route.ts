import { NextRequest, NextResponse } from 'next/server'
import { DocumentType, NotificationType } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'

export const runtime = 'nodejs'

const BASE_DOC_TYPES: DocumentType[] = [DocumentType.CEDULA, DocumentType.PASAPORTE, DocumentType.VISA]

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'cases:update')
  if (!user) return response!

  try {
    const { profileId, comment } = await request.json()
    if (!profileId) return NextResponse.json({ error: 'profileId is required' }, { status: 400 })

    const [caseRecord, newProfile] = await Promise.all([
      prisma.case.findUnique({ where: { id: params.id }, include: { profile: true } }),
      prisma.profile.findUnique({ where: { id: profileId } }),
    ])

    if (!caseRecord) return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    if (!newProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if (caseRecord.profileId === profileId) {
      return NextResponse.json({ success: true, unchanged: true })
    }

    await prisma.document.updateMany({
      where: {
        caseId: params.id,
        docType: { in: BASE_DOC_TYPES },
        isCurrent: true,
      },
      data: {
        isCurrent: false,
        observations: 'Reemplazado por cambio de colaborador designado',
      },
    })

    await prisma.case.update({
      where: { id: params.id },
      data: {
        profileId,
        observaciones: comment || caseRecord.observaciones,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: params.id,
        profileId,
        action: 'TRAVELER_CHANGED',
        details: {
          previousProfileId: caseRecord.profileId,
          previousTraveler: caseRecord.profile.fullName || caseRecord.profile.primaryEmail,
          newProfileId: profileId,
          newTraveler: newProfile.fullName || newProfile.primaryEmail,
          comment,
        },
      },
    })

    await prisma.notification.create({
      data: {
        caseId: params.id,
        type: NotificationType.TRAVELER_CHANGED,
        title: 'Colaborador designado cambiado',
        message: `El expediente cambio de ${caseRecord.profile.fullName || caseRecord.profile.primaryEmail || 'colaborador anterior'} a ${newProfile.fullName || newProfile.primaryEmail || 'nuevo colaborador'}.`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Traveler change error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
