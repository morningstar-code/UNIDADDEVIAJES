import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { uploadAttachmentToBlob } from '@/lib/blob/upload'
import { DocumentRequirementStatus, DocumentType, CaseStatus, WorkflowStep } from '@prisma/client'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const designation = await prisma.designation.findUnique({
    where: { token: params.token },
    include: { case: { include: { profile: true } } },
  })

  if (!designation || designation.tokenExpiresAt < new Date()) {
    return NextResponse.json({ error: 'Designacion no encontrada o expirada' }, { status: 404 })
  }

  const formData = await request.formData()
  const requirementId = formData.get('requirementId') as string | null
  const requestedDocType = formData.get('docType') as DocumentType | null
  const file = formData.get('file') as File

  if ((!requirementId && !requestedDocType) || !file) {
    return NextResponse.json({ error: 'Documento requerido' }, { status: 400 })
  }

  const requirement = requirementId
    ? await prisma.documentRequirement.findFirst({
        where: { id: requirementId, caseId: designation.caseId },
      })
    : null

  if (requirementId && !requirement) {
    return NextResponse.json({ error: 'Requerimiento no encontrado' }, { status: 404 })
  }

  const docType = requirement?.docType || requestedDocType
  if (!docType || !Object.values(DocumentType).includes(docType)) {
    return NextResponse.json({ error: 'Tipo de documento invalido' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const isBaseDoc =
    docType === DocumentType.CEDULA ||
    docType === DocumentType.PASAPORTE ||
    docType === DocumentType.VISA ||
    docType === DocumentType.FOTO

  const uploadResult = await uploadAttachmentToBlob({
    profileId: designation.case.profileId,
    caseId: isBaseDoc ? undefined : designation.caseId,
    originalFilename: file.name,
    buffer,
    contentType: file.type || 'application/octet-stream',
    docType,
  })

  const document = await prisma.document.create({
    data: {
      profileId: isBaseDoc ? designation.case.profileId : undefined,
      caseId: isBaseDoc ? undefined : designation.caseId,
      docType,
      originalFilename: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: buffer.length,
      blobUrl: uploadResult.blobUrl,
      blobPathname: uploadResult.blobPathname,
      checksumSha256: uploadResult.checksumSha256,
      status: DocumentRequirementStatus.UPLOADED,
      uploadedByName: designation.collaboratorName || designation.collaboratorEmail,
    },
  })

  if (requirement) {
    await prisma.documentRequirement.update({
      where: { id: requirement.id },
      data: {
        documentId: document.id,
        status: DocumentRequirementStatus.UPLOADED,
        uploadedByName: designation.collaboratorName || designation.collaboratorEmail,
        uploadedAt: new Date(),
      },
    })
  } else {
    await prisma.documentRequirement.upsert({
      where: { caseId_docType: { caseId: designation.caseId, docType } },
      update: {
        documentId: document.id,
        status: DocumentRequirementStatus.UPLOADED,
        uploadedByName: designation.collaboratorName || designation.collaboratorEmail,
        uploadedAt: new Date(),
      },
      create: {
        caseId: designation.caseId,
        docType,
        label: labelForDocument(docType),
        required: false,
        documentId: document.id,
        status: DocumentRequirementStatus.UPLOADED,
        uploadedByName: designation.collaboratorName || designation.collaboratorEmail,
        uploadedAt: new Date(),
      },
    })
  }

  await prisma.case.update({
    where: { id: designation.caseId },
    data: {
      status: isPostTravelDocument(docType) ? CaseStatus.LIQUIDACION_EN_REVISION : CaseStatus.DOCUMENTOS_EN_REVISION,
      currentWorkflowStep: isPostTravelDocument(docType) ? WorkflowStep.LIQUIDATION_REVIEW : WorkflowStep.DOCUMENT_REVIEW,
    },
  })

  await prisma.auditLog.create({
    data: {
      caseId: designation.caseId,
      profileId: designation.case.profileId,
      action: 'COLLABORATOR_DOCUMENT_UPLOADED',
      details: {
        requirementId: requirement?.id,
        documentId: document.id,
        docType,
        filename: file.name,
      },
    },
  })

  if (isPostTravelDocument(docType)) {
    await prisma.auditLog.create({
      data: {
        caseId: designation.caseId,
        profileId: designation.case.profileId,
        action: auditActionForDocument(docType),
        details: { documentId: document.id, filename: file.name },
      },
    })
  }

  await prisma.notification.create({
    data: {
      caseId: designation.caseId,
      type: 'DOCUMENT_UPLOADED',
      title: 'Documento subido',
      message: `${designation.collaboratorEmail} subio ${requirement?.label || labelForDocument(docType)}`,
    },
  })

  return NextResponse.json({ document })
}

function isPostTravelDocument(docType: DocumentType) {
  const postTravelTypes: DocumentType[] = [
    DocumentType.FORMULARIO_LIQUIDACION_COMPLETADO,
    DocumentType.FACTURAS_LIQUIDACION,
    DocumentType.VOLANTE_DEPOSITO_REMANENTE,
    DocumentType.INFORME_EVENTO,
    DocumentType.OTROS_ANEXOS_LIQUIDACION,
  ]
  return postTravelTypes.includes(docType)
}

function labelForDocument(docType: DocumentType) {
  const labels: Partial<Record<DocumentType, string>> = {
    FORMULARIO_LIQUIDACION_COMPLETADO: 'Formulario de liquidacion completado',
    FACTURAS_LIQUIDACION: 'Facturas de liquidacion',
    VOLANTE_DEPOSITO_REMANENTE: 'Volante de deposito de remanente',
    INFORME_EVENTO: 'Informe del evento',
    OTROS_ANEXOS_LIQUIDACION: 'Otros anexos de liquidacion',
  }
  return labels[docType] || docType
}

function auditActionForDocument(docType: DocumentType) {
  const actions: Partial<Record<DocumentType, string>> = {
    FORMULARIO_LIQUIDACION_COMPLETADO: 'FORMULARIO_LIQUIDACION_SUBIDO',
    FACTURAS_LIQUIDACION: 'FACTURAS_SUBIDAS',
    VOLANTE_DEPOSITO_REMANENTE: 'VOLANTE_DEPOSITO_SUBIDO',
    INFORME_EVENTO: 'INFORME_EVENTO_SUBIDO',
    OTROS_ANEXOS_LIQUIDACION: 'OTROS_ANEXOS_LIQUIDACION_SUBIDOS',
  }
  return actions[docType] || 'LIQUIDACION_ENVIADA_REVISION'
}
