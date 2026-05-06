import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { CaseStatus, DesignationStatus, DocumentRequirementStatus, WorkflowStep } from '@prisma/client'

async function getDesignation(token: string) {
  return prisma.designation.findUnique({
    where: { token },
    include: {
      case: {
        include: {
          profile: true,
          documentRequirements: {
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const designation = await getDesignation(params.token)
  if (!designation || designation.tokenExpiresAt < new Date()) {
    return NextResponse.json({ error: 'Designacion no encontrada o expirada' }, { status: 404 })
  }

  return NextResponse.json({
    id: designation.id,
    status: designation.status,
    collaboratorName: designation.collaboratorName,
    collaboratorEmail: designation.collaboratorEmail,
    case: {
      id: designation.case.id,
      evento: designation.case.evento,
      destinoPais: designation.case.destinoPais,
      destinoCiudad: designation.case.destinoCiudad,
      fechaSalida: designation.case.fechaSalida,
      fechaRetorno: designation.case.fechaRetorno,
      motivo: designation.case.motivo,
      institucionOrganizadora: designation.case.institucionOrganizadora,
      requirements: designation.case.documentRequirements,
    },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const designation = await getDesignation(params.token)
  if (!designation || designation.tokenExpiresAt < new Date()) {
    return NextResponse.json({ error: 'Designacion no encontrada o expirada' }, { status: 404 })
  }

  const data = await request.json()
  const action = data.action as 'ACCEPT' | 'REJECT'
  if (!['ACCEPT', 'REJECT'].includes(action)) {
    return NextResponse.json({ error: 'Accion invalida' }, { status: 400 })
  }

  if (action === 'REJECT') {
    const updated = await prisma.designation.update({
      where: { id: designation.id },
      data: {
        status: DesignationStatus.REJECTED,
        respondedAt: new Date(),
        rejectionReason: data.reason || undefined,
        responseComment: data.comment || undefined,
      },
    })

    await prisma.case.update({
      where: { id: designation.caseId },
      data: { status: CaseStatus.COLABORADOR_RECHAZO },
    })

    await prisma.auditLog.create({
      data: {
        caseId: designation.caseId,
        profileId: designation.case.profileId,
        action: 'COLLABORATOR_REJECTED_DESIGNATION',
        details: { designationId: designation.id, reason: data.reason },
      },
    })

    await prisma.notification.create({
      data: {
        caseId: designation.caseId,
        type: 'COLLABORATOR_REJECTED',
        title: 'Colaborador rechazo designacion',
        message: `${designation.collaboratorEmail} rechazo la designacion.`,
      },
    })

    return NextResponse.json(updated)
  }

  const updated = await prisma.designation.update({
    where: { id: designation.id },
    data: {
      status: DesignationStatus.ACCEPTED,
      respondedAt: new Date(),
      acceptedTerms: !!data.acceptedTerms,
      confirmedAvailability: !!data.confirmedAvailability,
      responseComment: data.comment || undefined,
    },
  })

  await prisma.case.update({
    where: { id: designation.caseId },
    data: {
      status: CaseStatus.PENDIENTE_DOCUMENTOS,
      currentWorkflowStep: WorkflowStep.DOCUMENT_COLLECTION,
    },
  })

  await prisma.documentRequirement.updateMany({
    where: {
      caseId: designation.caseId,
      status: DocumentRequirementStatus.PENDING,
    },
    data: { status: DocumentRequirementStatus.PENDING },
  })

  await prisma.auditLog.create({
    data: {
      caseId: designation.caseId,
      profileId: designation.case.profileId,
      action: 'COLLABORATOR_ACCEPTED_DESIGNATION',
      details: {
        designationId: designation.id,
        acceptedTerms: !!data.acceptedTerms,
        confirmedAvailability: !!data.confirmedAvailability,
      },
    },
  })

  await prisma.notification.create({
    data: {
      caseId: designation.caseId,
      type: 'COLLABORATOR_ACCEPTED',
      title: 'Colaborador acepto designacion',
      message: `${designation.collaboratorEmail} acepto la designacion.`,
    },
  })

  return NextResponse.json(updated)
}
