import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { MatrixRiskLevel, TravelMatrixStatus } from '@prisma/client'

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

export async function GET(request: NextRequest) {
  const { user, response } = await getAuthorizedUser(request, 'matrix:read')
  if (!user) return response!

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get('status') as TravelMatrixStatus | null
  const country = searchParams.get('country')
  const collaborator = searchParams.get('collaborator')
  const responsibleUserId = searchParams.get('responsibleUserId')
  const from = parseDate(searchParams.get('from'))
  const to = parseDate(searchParams.get('to'))

  const where: any = {}
  if (status) where.status = status
  if (country) where.country = { contains: country, mode: 'insensitive' }
  if (collaborator) {
    where.OR = [
      { collaboratorName: { contains: collaborator, mode: 'insensitive' } },
      { collaboratorEmail: { contains: collaborator, mode: 'insensitive' } },
    ]
  }
  if (responsibleUserId) where.responsibleUserId = responsibleUserId
  if (from || to) {
    where.estimatedDepartureDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    }
  }

  const entries = await prisma.travelMatrixEntry.findMany({
    where,
    include: {
      responsibleUser: { select: { id: true, name: true, email: true } },
      createdByUser: { select: { id: true, name: true, email: true } },
      pautaGivenByUser: { select: { id: true, name: true, email: true } },
      convertedCase: { select: { id: true, status: true } },
      _count: { select: { documents: true } },
    },
    orderBy: [{ estimatedDepartureDate: 'asc' }, { eventStartDate: 'asc' }],
  })

  const now = new Date()
  const thirtyDaysFromNow = new Date(now)
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

  const alerts = entries.map((entry) => {
    const travelDate = entry.estimatedDepartureDate || entry.eventStartDate
    const daysUntilTravel = Math.ceil((travelDate.getTime() - now.getTime()) / 86400000)
    const daysUntilMapreDeadline = daysUntilTravel - 15
    return {
      ...entry,
      daysUntilTravel,
      daysUntilMapreDeadline,
      isWithin30Days: daysUntilTravel <= 30 && daysUntilTravel >= 0,
      isCritical: daysUntilTravel <= 20 && daysUntilTravel >= 0,
      isMapreDeadlineCritical: daysUntilTravel <= 15,
      isOutsideMapreDeadline: daysUntilTravel < 15,
      hasPauta: entry.status === 'PAUTA_RI_DADA' || entry.status === 'CONVERTIDO_A_CASO',
    }
  })

  return NextResponse.json({
    entries: alerts,
    totals: {
      total: entries.length,
      within30Days: alerts.filter((entry) => entry.isWithin30Days).length,
      critical: alerts.filter((entry) => entry.isCritical).length,
      pendingPauta: alerts.filter((entry) => entry.status === 'PENDIENTE_PAUTA_RI').length,
    },
  })
}

export async function POST(request: NextRequest) {
  const { user, response } = await getAuthorizedUser(request, 'matrix:create')
  if (!user) return response!

  try {
    const data = await request.json()
    const eventStartDate = parseDate(data.eventStartDate)
    const estimatedDepartureDate = parseDate(data.estimatedDepartureDate)
    const travelDate = estimatedDepartureDate || eventStartDate
    const viajeImprevisto = Boolean(data.viajeImprevisto)

    if (!data.eventName || !data.country || !eventStartDate) {
      return NextResponse.json(
        { error: 'Nombre del viaje, pais y fecha de inicio son requeridos' },
        { status: 400 }
      )
    }

    const entry = await prisma.travelMatrixEntry.create({
      data: {
        eventName: data.eventName,
        country: data.country,
        city: data.city || undefined,
        eventStartDate,
        eventEndDate: parseDate(data.eventEndDate),
        estimatedDepartureDate,
        estimatedReturnDate: parseDate(data.estimatedReturnDate),
        collaboratorName: data.collaboratorName || undefined,
        collaboratorEmail: data.collaboratorEmail || undefined,
        collaboratorPosition: data.collaboratorPosition || undefined,
        collaboratorArea: data.collaboratorArea || undefined,
        organizerInstitution: data.organizerInstitution || undefined,
        objective: data.objective || undefined,
        perDiemType: data.perDiemType || undefined,
        observations: data.observations || undefined,
        programadoEnMatriz: data.programadoEnMatriz ?? true,
        requiereAutorizacionPresidencia: Boolean(data.requiereAutorizacionPresidencia),
        autorizacionRecibida: Boolean(data.autorizacionRecibida),
        personaDesignadaConfirmada: Boolean(data.personaDesignadaConfirmada),
        viajeRecurrente: Boolean(data.viajeRecurrente),
        viajeImprevisto,
        fechaLimiteMapre: mapreDeadlineFor(travelDate),
        nivelRiesgo: riskLevelFor(travelDate, viajeImprevisto),
        responsibleUserId: data.responsibleUserId || undefined,
        status: TravelMatrixStatus.PENDIENTE_PAUTA_RI,
        createdByUserId: user.userId,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        action: 'MATRIX_ENTRY_CREATED',
        details: { matrixEntryId: entry.id, eventName: entry.eventName },
      },
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Matrix create error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
