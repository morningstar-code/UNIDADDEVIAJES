import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { MatrixRiskLevel } from '@prisma/client'

function parseDate(value: unknown) {
  if (!value || typeof value !== 'string') return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function mapreDeadlineFor(travelDate?: Date) {
  if (!travelDate) return undefined
  const deadline = new Date(travelDate)
  deadline.setDate(deadline.getDate() - 15)
  return deadline
}

function riskLevelFor(travelDate?: Date, unexpected?: boolean) {
  if (!travelDate) return MatrixRiskLevel.NORMAL
  const daysUntilTravel = Math.ceil((travelDate.getTime() - new Date().getTime()) / 86400000)
  if (daysUntilTravel < 15 || unexpected) return MatrixRiskLevel.FUERA_DE_PLAZO
  if (daysUntilTravel <= 15) return MatrixRiskLevel.CRITICO
  if (daysUntilTravel <= 20) return MatrixRiskLevel.ADVERTENCIA
  return MatrixRiskLevel.NORMAL
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
    if ('status' in data) {
      return NextResponse.json(
        { error: 'El estado de la matriz debe cambiarse mediante una accion controlada.' },
        { status: 400 }
      )
    }
    const eventStartDate = parseDate(data.eventStartDate)
    const estimatedDepartureDate = parseDate(data.estimatedDepartureDate)
    const travelDate = estimatedDepartureDate || eventStartDate
    const viajeImprevisto = Boolean(data.viajeImprevisto)
    const entry = await prisma.travelMatrixEntry.update({
      where: { id: params.id },
      data: {
        eventName: data.eventName,
        country: data.country,
        city: data.city,
        eventStartDate,
        eventEndDate: parseDate(data.eventEndDate),
        estimatedDepartureDate,
        estimatedReturnDate: parseDate(data.estimatedReturnDate),
        collaboratorName: data.collaboratorName,
        collaboratorEmail: data.collaboratorEmail,
        collaboratorPosition: data.collaboratorPosition,
        collaboratorArea: data.collaboratorArea,
        organizerInstitution: data.organizerInstitution,
        objective: data.objective,
        perDiemType: data.perDiemType,
        observations: data.observations,
        programadoEnMatriz: data.programadoEnMatriz,
        requiereAutorizacionPresidencia: data.requiereAutorizacionPresidencia,
        autorizacionRecibida: data.autorizacionRecibida,
        personaDesignadaConfirmada: data.personaDesignadaConfirmada,
        viajeRecurrente: data.viajeRecurrente,
        viajeImprevisto: data.viajeImprevisto,
        fechaLimiteMapre: mapreDeadlineFor(travelDate),
        nivelRiesgo: riskLevelFor(travelDate, viajeImprevisto),
        responsibleUserId: data.responsibleUserId,
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
