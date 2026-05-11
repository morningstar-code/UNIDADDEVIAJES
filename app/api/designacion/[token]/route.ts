import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { CaseStatus, DesignationStatus, DocumentRequirementStatus, DocumentType, WorkflowStep } from '@prisma/client'

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
      generatedDocuments: await prisma.generatedDocument.findMany({
        where: { caseId: designation.case.id },
        include: { document: true },
        orderBy: { createdAt: 'desc' },
      }),
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

  if (designation.status !== DesignationStatus.SENT) {
    return NextResponse.json(
      { error: 'La designacion debe estar enviada antes de registrar una respuesta.' },
      { status: 403 }
    )
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
      data: { status: CaseStatus.COLABORADOR_RECHAZO, currentWorkflowStep: WorkflowStep.COLLABORATOR_ACCEPTANCE },
    })

    await prisma.auditLog.create({
      data: {
        caseId: designation.caseId,
        profileId: designation.case.profileId,
        action: 'COLABORADOR_RECHAZO_DESIGNACION',
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

  if (data.acceptedTerms !== true) {
    return NextResponse.json(
      { error: 'Debe aceptar los terminos y condiciones del viaje institucional.' },
      { status: 400 }
    )
  }

  if (data.confirmedAvailability !== true) {
    return NextResponse.json(
      { error: 'Debe confirmar su disponibilidad para participar en el viaje.' },
      { status: 400 }
    )
  }

  if ('confirmedDataAccuracy' in data && data.confirmedDataAccuracy !== true) {
    return NextResponse.json(
      { error: 'Debe confirmar que los datos de la designacion son correctos.' },
      { status: 400 }
    )
  }

  if ('confirmedAuthenticDocuments' in data && data.confirmedAuthenticDocuments !== true) {
    return NextResponse.json(
      { error: 'Debe confirmar la autenticidad de los documentos que cargara.' },
      { status: 400 }
    )
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

  await prisma.documentRequirement.upsert({
    where: {
      caseId_docType: {
        caseId: designation.caseId,
        docType: DocumentType.ACEPTACION_COLABORADOR,
      },
    },
    update: {
      status: DocumentRequirementStatus.VALIDATED,
      uploadedByName: designation.collaboratorName || designation.collaboratorEmail,
      uploadedAt: new Date(),
      validatedAt: new Date(),
      observations: data.comment || undefined,
    },
    create: {
      caseId: designation.caseId,
      docType: DocumentType.ACEPTACION_COLABORADOR,
      label: 'Aceptacion del colaborador',
      required: true,
      status: DocumentRequirementStatus.VALIDATED,
      uploadedByName: designation.collaboratorName || designation.collaboratorEmail,
      uploadedAt: new Date(),
      validatedAt: new Date(),
      observations: data.comment || undefined,
    },
  })

  await prisma.auditLog.create({
    data: {
      caseId: designation.caseId,
      profileId: designation.case.profileId,
      action: 'COLABORADOR_ACEPTO_DESIGNACION',
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
