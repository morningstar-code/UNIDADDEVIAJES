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
  const requirementId = formData.get('requirementId') as string
  const file = formData.get('file') as File

  if (!requirementId || !file) {
    return NextResponse.json({ error: 'Documento requerido' }, { status: 400 })
  }

  const requirement = await prisma.documentRequirement.findFirst({
    where: { id: requirementId, caseId: designation.caseId },
  })

  if (!requirement) {
    return NextResponse.json({ error: 'Requerimiento no encontrado' }, { status: 404 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const isBaseDoc =
    requirement.docType === DocumentType.CEDULA ||
    requirement.docType === DocumentType.PASAPORTE ||
    requirement.docType === DocumentType.VISA ||
    requirement.docType === DocumentType.FOTO

  const uploadResult = await uploadAttachmentToBlob({
    profileId: designation.case.profileId,
    caseId: isBaseDoc ? undefined : designation.caseId,
    originalFilename: file.name,
    buffer,
    contentType: file.type || 'application/octet-stream',
    docType: requirement.docType,
  })

  const document = await prisma.document.create({
    data: {
      profileId: isBaseDoc ? designation.case.profileId : undefined,
      caseId: isBaseDoc ? undefined : designation.caseId,
      docType: requirement.docType,
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

  await prisma.documentRequirement.update({
    where: { id: requirement.id },
    data: {
      documentId: document.id,
      status: DocumentRequirementStatus.UPLOADED,
      uploadedByName: designation.collaboratorName || designation.collaboratorEmail,
      uploadedAt: new Date(),
    },
  })

  await prisma.case.update({
    where: { id: designation.caseId },
    data: {
      status: CaseStatus.DOCUMENTOS_EN_REVISION,
      currentWorkflowStep: WorkflowStep.DOCUMENT_REVIEW,
    },
  })

  await prisma.auditLog.create({
    data: {
      caseId: designation.caseId,
      profileId: designation.case.profileId,
      action: 'COLLABORATOR_DOCUMENT_UPLOADED',
      details: {
        requirementId: requirement.id,
        documentId: document.id,
        docType: requirement.docType,
        filename: file.name,
      },
    },
  })

  await prisma.notification.create({
    data: {
      caseId: designation.caseId,
      type: 'DOCUMENT_UPLOADED',
      title: 'Documento subido',
      message: `${designation.collaboratorEmail} subio ${requirement.label}`,
    },
  })

  return NextResponse.json({ document })
}
