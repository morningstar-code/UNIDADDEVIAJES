import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser, hasPermission } from '@/lib/auth/permissions'
import {
  CaseStatus,
  NotificationType,
  TaskStatus,
  TravelAuthorizationValidationStatus,
  WorkflowStep,
} from '@prisma/client'

export const runtime = 'nodejs'

function actionToStatus(action: string) {
  const map: Record<string, TravelAuthorizationValidationStatus> = {
    VALIDATE: TravelAuthorizationValidationStatus.VALIDADO_POR_AMPARO,
    RETURN: TravelAuthorizationValidationStatus.DEVUELTO_POR_AMPARO,
    REJECT: TravelAuthorizationValidationStatus.RECHAZADO_POR_AMPARO,
    REQUEST_INFO: TravelAuthorizationValidationStatus.DEVUELTO_POR_AMPARO,
  }
  return map[action]
}

function caseStatusFor(action: string) {
  const map: Record<string, CaseStatus> = {
    VALIDATE: CaseStatus.PENDIENTE_DESIGNACION,
    RETURN: CaseStatus.DEVUELTO_POR_AMPARO,
    REJECT: CaseStatus.RECHAZADO_POR_AMPARO,
    REQUEST_INFO: CaseStatus.DEVUELTO_POR_AMPARO,
  }
  return map[action]
}

function auditActionFor(action: string) {
  const map: Record<string, string> = {
    VALIDATE: 'AMPARO_VALIDATED',
    RETURN: 'AMPARO_RETURNED',
    REJECT: 'AMPARO_REJECTED',
    REQUEST_INFO: 'AMPARO_RETURNED',
  }
  return map[action] || action
}

function notificationFor(action: string, subject: string) {
  const map: Record<string, { type: NotificationType; title: string; message: string }> = {
    VALIDATE: {
      type: NotificationType.AMPARO_VALIDATED,
      title: 'Amparo valido autorizacion',
      message: `La autorizacion de ${subject} fue validada. La designacion ya puede prepararse.`,
    },
    RETURN: {
      type: NotificationType.AMPARO_RETURNED,
      title: 'Amparo devolvio autorizacion',
      message: `La autorizacion de ${subject} fue devuelta con observaciones.`,
    },
    REQUEST_INFO: {
      type: NotificationType.AMPARO_RETURNED,
      title: 'Amparo solicito informacion',
      message: `Amparo solicito mas informacion para ${subject}.`,
    },
    REJECT: {
      type: NotificationType.AMPARO_REJECTED,
      title: 'Amparo rechazo autorizacion',
      message: `La autorizacion de ${subject} fue rechazada.`,
    },
  }
  return map[action]
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request)
  if (!user) return response!
  if (!hasPermission(user, 'matrix:pauta') && !hasPermission(user, 'cases:update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data = await request.json()
    const action = String(data.action || '')
    const comment = String(data.comment || '').trim()
    const validationStatus = actionToStatus(action)
    const nextCaseStatus = caseStatusFor(action)

    if (!validationStatus || !nextCaseStatus) {
      return NextResponse.json({ error: 'Accion invalida' }, { status: 400 })
    }

    if (action !== 'VALIDATE' && !comment) {
      return NextResponse.json({ error: 'Comentario obligatorio' }, { status: 400 })
    }

    const caseRecord = await prisma.case.findUnique({
      where: { id: params.id },
      include: { profile: true, travelAuthorization: true },
    })
    if (!caseRecord) return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    if (!caseRecord.travelAuthorization) {
      return NextResponse.json({ error: 'El expediente no tiene autorizacion registrada' }, { status: 400 })
    }

    if (
      caseRecord.travelAuthorization.validationStatus !==
      TravelAuthorizationValidationStatus.PENDIENTE_VALIDACION_AMPARO
    ) {
      return NextResponse.json(
        { error: 'La autorizacion ya fue procesada por Amparo / RI' },
        { status: 409 }
      )
    }

    await prisma.travelAuthorization.update({
      where: { caseId: params.id },
      data: {
        validationStatus,
        validationComment: comment || undefined,
        validatedByUserId: user.userId,
        validatedAt: new Date(),
      },
    })

    await prisma.case.update({
      where: { id: params.id },
      data: {
        status: nextCaseStatus,
        currentWorkflowStep:
          action === 'VALIDATE'
            ? WorkflowStep.DESIGNATION
            : WorkflowStep.AUTHORIZATION_CORRECTION,
      },
    })

    if (action === 'VALIDATE') {
      const viajesRole = await prisma.role.findUnique({ where: { name: 'VIAJES_ANALISTA' } })
      if (viajesRole) {
        await prisma.task.create({
          data: {
            caseId: params.id,
            step: WorkflowStep.DESIGNATION,
            assignedRoleId: viajesRole.id,
            status: TaskStatus.PENDING,
          },
        })
      }
      await prisma.auditLog.create({
        data: {
          actorUserId: user.userId,
          caseId: params.id,
          profileId: caseRecord.profileId,
          action: 'DESIGNATION_READY',
          details: { source: 'authorization-validation' },
        },
      })
      await prisma.notification.create({
        data: {
          caseId: params.id,
          type: NotificationType.DESIGNATION_READY,
          title: 'Designacion lista para preparar',
          message: 'La autorizacion fue validada y la Unidad de Viajes puede enviar la designacion.',
        },
      })
    } else if (caseRecord.travelAuthorization.registeredByUserId) {
      await prisma.task.create({
        data: {
          caseId: params.id,
          step: WorkflowStep.AUTHORIZATION_CORRECTION,
          assignedUserId: caseRecord.travelAuthorization.registeredByUserId,
          status: TaskStatus.PENDING,
          comment,
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: params.id,
        profileId: caseRecord.profileId,
        action: auditActionFor(action),
        details: { comment },
      },
    })

    const subject = caseRecord.evento || caseRecord.destinoPais || caseRecord.profile.fullName || 'expediente'
    const notification = notificationFor(action, subject)
    if (notification) {
      await prisma.notification.create({
        data: {
          caseId: params.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Authorization validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
