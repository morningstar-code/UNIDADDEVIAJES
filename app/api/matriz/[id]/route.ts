import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'

function parseDate(value: unknown) {
  if (!value || typeof value !== 'string') return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'matrix:read')
  if (!user) return response!

  const entry = await prisma.travelMatrixEntry.findUnique({
    where: { id: params.id },
    include: {
      responsibleUser: { select: { id: true, name: true, email: true } },
      createdByUser: { select: { id: true, name: true, email: true } },
      pautaGivenByUser: { select: { id: true, name: true, email: true } },
      convertedCase: { select: { id: true, status: true } },
      documents: true,
    },
  })

  if (!entry) {
    return NextResponse.json({ error: 'Viaje no encontrado' }, { status: 404 })
  }

  return NextResponse.json(entry)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'matrix:update')
  if (!user) return response!

  try {
    const data = await request.json()
    const entry = await prisma.travelMatrixEntry.update({
      where: { id: params.id },
      data: {
        eventName: data.eventName,
        country: data.country,
        city: data.city,
        eventStartDate: parseDate(data.eventStartDate),
        eventEndDate: parseDate(data.eventEndDate),
        estimatedDepartureDate: parseDate(data.estimatedDepartureDate),
        estimatedReturnDate: parseDate(data.estimatedReturnDate),
        collaboratorName: data.collaboratorName,
        collaboratorEmail: data.collaboratorEmail,
        collaboratorPosition: data.collaboratorPosition,
        collaboratorArea: data.collaboratorArea,
        organizerInstitution: data.organizerInstitution,
        objective: data.objective,
        perDiemType: data.perDiemType,
        observations: data.observations,
        responsibleUserId: data.responsibleUserId,
        status: data.status,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        action: 'MATRIX_ENTRY_UPDATED',
        details: { matrixEntryId: entry.id },
      },
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Matrix update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
