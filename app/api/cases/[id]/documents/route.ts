import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { uploadAttachmentToBlob } from '@/lib/blob/upload'
import { CaseStatus, DocumentRequirementStatus, DocumentType, WorkflowStep } from '@prisma/client'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'documents:upload')
  if (!user) return response!

  try {
    const caseRecord = await prisma.case.findUnique({
      where: { id: params.id },
      include: { profile: true },
    })
    if (!caseRecord) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

    const formData = await request.formData()
    const file = formData.get('file') as File
    const docType = formData.get('docType') as DocumentType
    const requirementId = formData.get('requirementId') as string | null

    if (!file || !docType) {
      return NextResponse.json({ error: 'Archivo y tipo de documento son requeridos' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const isBaseDoc =
      docType === DocumentType.CEDULA ||
      docType === DocumentType.PASAPORTE ||
      docType === DocumentType.VISA ||
      docType === DocumentType.FOTO

    const uploadResult = await uploadAttachmentToBlob({
      profileId: caseRecord.profileId,
      caseId: isBaseDoc ? undefined : params.id,
      originalFilename: file.name,
      buffer,
      contentType: file.type || 'application/octet-stream',
      docType,
    })

    const document = await prisma.document.create({
      data: {
        profileId: isBaseDoc ? caseRecord.profileId : undefined,
        caseId: isBaseDoc ? undefined : params.id,
        docType,
        originalFilename: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: buffer.length,
        blobUrl: uploadResult.blobUrl,
        blobPathname: uploadResult.blobPathname,
        checksumSha256: uploadResult.checksumSha256,
        status: DocumentRequirementStatus.UPLOADED,
        uploadedByUserId: user.userId,
        uploadedByName: user.email,
      },
    })

    if (requirementId) {
      await prisma.documentRequirement.update({
        where: { id: requirementId },
        data: {
          documentId: document.id,
          status: DocumentRequirementStatus.UPLOADED,
          uploadedByUserId: user.userId,
          uploadedByName: user.email,
          uploadedAt: new Date(),
        },
      })
    }

    await prisma.case.update({
      where: { id: params.id },
      data: {
        status: isPostTravelDocument(docType) ? CaseStatus.LIQUIDACION_EN_REVISION : CaseStatus.DOCUMENTOS_EN_REVISION,
        currentWorkflowStep: isPostTravelDocument(docType) ? WorkflowStep.LIQUIDATION_REVIEW : WorkflowStep.DOCUMENT_REVIEW,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: params.id,
        profileId: caseRecord.profileId,
        action: isPostTravelDocument(docType) ? auditActionForDocument(docType) : 'STAFF_DOCUMENT_UPLOADED',
        details: { documentId: document.id, docType, filename: file.name },
      },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Staff upload document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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
