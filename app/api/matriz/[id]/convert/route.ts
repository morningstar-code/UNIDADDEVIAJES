import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { upsertProfileByCedulaOrEmail } from '@/lib/public/upsert-profile'
import {
  CaseSource,
  CaseStatus,
  NotificationType,
  TaskStatus,
  TravelAuthorizationType,
  TravelAuthorizationValidationStatus,
  TravelMatrixStatus,
  WorkflowStep,
} from '@prisma/client'
import { ensureDefaultRequirements } from '@/lib/cases/requirements'

function splitName(fullName?: string | null) {
  if (!fullName) return { firstName: undefined, lastName: undefined }
  const parts = fullName.trim().split(/\s+/)
  return {
    firstName: parts.slice(0, 1).join(' '),
    lastName: parts.slice(1).join(' ') || undefined,
  }
}

function mapreDeadlineFor(travelDate?: Date | null) {
  if (!travelDate) return undefined
  const deadline = new Date(travelDate)
  deadline.setDate(deadline.getDate() - 15)
  return deadline
}

function isOutOfMapreDeadline(travelDate?: Date | null) {
  const deadline = mapreDeadlineFor(travelDate)
  if (!deadline) return false
  return deadline < new Date()
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'matrix:convert')
  if (!user) return response!

  try {
    const entry = await prisma.travelMatrixEntry.findUnique({
      where: { id: params.id },
    })

    if (!entry) {
      return NextResponse.json({ error: 'Viaje no encontrado' }, { status: 404 })
    }

    if (entry.convertedCaseId) {
      return NextResponse.json({ error: 'Este viaje ya fue convertido a caso' }, { status: 409 })
    }

    if (entry.status !== TravelMatrixStatus.PAUTA_RI_DADA) {
      return NextResponse.json(
        { error: 'Relaciones Internacionales debe dar la pauta antes de convertir a caso' },
        { status: 400 }
      )
    }

    if (!entry.collaboratorEmail && !entry.profileId) {
      return NextResponse.json(
        { error: 'Debe indicar email del colaborador o vincular un perfil antes de convertir' },
        { status: 400 }
      )
    }

    let profileId = entry.profileId
    if (!profileId) {
      const name = splitName(entry.collaboratorName)
      const profileResult = await upsertProfileByCedulaOrEmail({
        email: entry.collaboratorEmail || undefined,
        firstName: name.firstName,
        lastName: name.lastName,
        departamento: entry.collaboratorArea || undefined,
        cargo: entry.collaboratorPosition || undefined,
      })
      profileId = profileResult.profileId
    }

    const caseRecord = await prisma.case.create({
      data: {
        profileId,
        createdByUserId: user.userId,
        source: CaseSource.MATRIZ,
        status: CaseStatus.PENDIENTE_VALIDACION_AMPARO,
        currentWorkflowStep: WorkflowStep.AUTHORIZATION_VALIDATION,
        matrixEntryId: entry.id,
        destinoPais: entry.country,
        destinoCiudad: entry.city,
        fechaSalida: entry.estimatedDepartureDate || entry.eventStartDate,
        fechaRetorno: entry.estimatedReturnDate || entry.eventEndDate,
        motivo: entry.objective,
        evento: entry.eventName,
        institucionOrganizadora: entry.organizerInstitution,
        observaciones: entry.observations,
      },
    })

    const viajesRole = await prisma.role.findUnique({ where: { name: 'VIAJES_ANALISTA' } })
    const riRole = await prisma.role.findUnique({ where: { name: 'RI_DIRECTORA' } })
    if (riRole) {
      await prisma.task.create({
        data: {
          caseId: caseRecord.id,
          step: WorkflowStep.AUTHORIZATION_VALIDATION,
          assignedRoleId: riRole.id,
          status: TaskStatus.PENDING,
        },
      })
    }

    await ensureDefaultRequirements(prisma, caseRecord.id)

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: caseRecord.id,
        profileId,
        action: 'CHECKLIST_DOCUMENTAL_CREADO',
        details: { source: 'MATRIZ', matrixEntryId: entry.id },
      },
    })

    await prisma.travelMatrixEntry.update({
      where: { id: entry.id },
      data: {
        status: TravelMatrixStatus.CONVERTIDO_A_CASO,
        convertedCaseId: caseRecord.id,
        autorizacionRecibida: true,
      },
    })

    const travelDate = entry.estimatedDepartureDate || entry.eventStartDate
    const mapreDeadline = mapreDeadlineFor(travelDate)
    const outOfDeadline = isOutOfMapreDeadline(travelDate)
    await prisma.travelAuthorization.create({
      data: {
        caseId: caseRecord.id,
        type: TravelAuthorizationType.MATRIZ_PROGRAMADA_CONFIRMADA,
        authorizedBy: entry.pautaGivenByUserId ? 'Relaciones Internacionales' : 'Matriz de viajes',
        registeredByUserId: user.userId,
        authorizedAt: entry.pautaGivenAt || new Date(),
        justification:
          entry.observations ||
          'Viaje programado en matriz y convertido a expediente para validacion de Amparo / RI.',
        validationStatus: TravelAuthorizationValidationStatus.PENDIENTE_VALIDACION_AMPARO,
        isRecurringTravel: entry.viajeRecurrente,
        isUnexpectedTravel: entry.viajeImprevisto,
        isOutOfMapreDeadline: outOfDeadline,
        mapreDeadline,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: caseRecord.id,
        profileId,
        action: 'MATRIX_ENTRY_CONVERTED_TO_CASE',
        details: { matrixEntryId: entry.id, requiresAmparoValidation: true },
      },
    })

    await prisma.notification.createMany({
      data: [
        {
          caseId: caseRecord.id,
          type: NotificationType.MATRIX_CONVERTED_TO_CASE,
          title: 'Viaje convertido en expediente',
          message: `La matriz "${entry.eventName}" fue convertida en expediente.`,
        },
        {
          caseId: caseRecord.id,
          type: NotificationType.PENDING_AMPARO_VALIDATION,
          title: 'Pendiente validacion Amparo',
          message: 'El expediente convertido desde matriz requiere validacion antes de designacion.',
        },
      ],
    })

    if (outOfDeadline) {
      await prisma.auditLog.create({
        data: {
          actorUserId: user.userId,
          caseId: caseRecord.id,
          profileId,
          action: 'OUT_OF_MAPRE_DEADLINE',
          details: { matrixEntryId: entry.id, travelDate, mapreDeadline },
        },
      })
      await prisma.notification.create({
        data: {
          caseId: caseRecord.id,
          type: NotificationType.OUT_OF_MAPRE_DEADLINE,
          title: 'Viaje fuera de plazo MAPRE',
          message: 'El viaje esta a menos de 15 dias del plazo requerido para MAPRE.',
        },
      })
    }

    return NextResponse.json({ case: caseRecord })
  } catch (error) {
    console.error('Matrix convert error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
