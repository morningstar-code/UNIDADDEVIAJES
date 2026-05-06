import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { upsertProfileByCedulaOrEmail } from '@/lib/public/upsert-profile'
import {
  CaseSource,
  CaseStatus,
  TaskStatus,
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
        status: CaseStatus.PAUTA_RI_DADA,
        currentWorkflowStep: WorkflowStep.DESIGNATION,
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
    if (viajesRole) {
      await prisma.task.create({
        data: {
          caseId: caseRecord.id,
          step: WorkflowStep.DESIGNATION,
          assignedRoleId: viajesRole.id,
          status: TaskStatus.PENDING,
        },
      })
    }

    await ensureDefaultRequirements(prisma, caseRecord.id)

    await prisma.travelMatrixEntry.update({
      where: { id: entry.id },
      data: {
        status: TravelMatrixStatus.CONVERTIDO_A_CASO,
        convertedCaseId: caseRecord.id,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: caseRecord.id,
        profileId,
        action: 'MATRIX_ENTRY_CONVERTED_TO_CASE',
        details: { matrixEntryId: entry.id },
      },
    })

    return NextResponse.json({ case: caseRecord })
  } catch (error) {
    console.error('Matrix convert error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
