import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { CaseStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  const { user, response } = await getAuthorizedUser(request, 'dashboard:read')
  if (!user) return response!

  const now = new Date()
  const in30 = new Date(now)
  in30.setDate(in30.getDate() + 30)

  const [
    totalMatrix,
    matrix30,
    casesReceived,
    pendingViajes,
    pendingRI,
    pendingDespacho,
    pendingConsejo,
    incompleteFiles,
    signedFiles,
    closed,
    riskCases,
    amountAgg,
    unreadNotifications,
  ] = await Promise.all([
    prisma.travelMatrixEntry.count(),
    prisma.travelMatrixEntry.count({
      where: {
        OR: [
          { estimatedDepartureDate: { gte: now, lte: in30 } },
          { eventStartDate: { gte: now, lte: in30 } },
        ],
      },
    }),
    prisma.case.count({ where: { status: CaseStatus.RECEIVED } }),
    prisma.case.count({
      where: {
        currentWorkflowStep: {
          in: [
            'DESIGNATION',
            'DOCUMENT_COLLECTION',
            'DOCUMENT_REVIEW',
            'FORMULARIO_SOLICITUD',
            'CARTA_MINISTRO',
            'EXPEDIENTE_REVIEW',
            'EXPEDIENTE_FIRMADO_RECEIPT',
            'COORDINACION_ADMINISTRATIVA',
          ],
        },
      },
    }),
    prisma.case.count({ where: { status: { in: [CaseStatus.PENDIENTE_PAUTA_RI, CaseStatus.PAUTA_RI_DADA] } } }),
    prisma.case.count({ where: { status: CaseStatus.DESPACHO_REVIEW } }),
    prisma.case.count({ where: { status: CaseStatus.CONSEJO_DIRECTIVO_FIRMA } }),
    prisma.case.count({ where: { expedienteCompleto: false, status: { not: CaseStatus.CLOSED } } }),
    prisma.case.count({ where: { status: CaseStatus.EXPEDIENTE_FIRMADO_RECIBIDO } }),
    prisma.case.count({ where: { status: CaseStatus.CLOSED } }),
    prisma.case.count({ where: { fechaSalida: { lte: in30, gte: now }, expedienteCompleto: false } }),
    prisma.case.aggregate({ _sum: { montoEstimado: true } }),
    prisma.notification.count({ where: { OR: [{ userId: user.userId }, { userId: null }], readAt: null } }),
  ])

  return NextResponse.json({
    totalMatrix,
    matrix30,
    casesReceived,
    pendingViajes,
    pendingRI,
    pendingDespacho,
    pendingConsejo,
    incompleteFiles,
    signedFiles,
    closed,
    riskCases,
    totalEstimatedAmount: Number(amountAgg._sum.montoEstimado || 0),
    unreadNotifications,
  })
}
