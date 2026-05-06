import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { generateSimplePdf } from '@/lib/documents/pdf'
import { buildMinisterLetterContent, buildTravelRequestContent } from '@/lib/documents/templates'
import { uploadAttachmentToBlob } from '@/lib/blob/upload'
import {
  CaseStatus,
  DocumentRequirementStatus,
  DocumentType,
  GeneratedDocumentStatus,
  GeneratedDocumentType,
} from '@prisma/client'

function mapGeneratedToDocumentType(type: GeneratedDocumentType) {
  return type === GeneratedDocumentType.FORMULARIO_SOLICITUD_VIAJE
    ? DocumentType.FORMULARIO_SOLICITUD_VIAJE
    : DocumentType.CARTA_MINISTRO_ADMINISTRATIVO
}

function defaultContent(type: GeneratedDocumentType, caseRecord: any) {
  return type === GeneratedDocumentType.FORMULARIO_SOLICITUD_VIAJE
    ? buildTravelRequestContent(caseRecord)
    : buildMinisterLetterContent(caseRecord)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'documents:generate')
  if (!user) return response!

  try {
    const data = await request.json()
    const type = data.type as GeneratedDocumentType
    const action = data.action as 'SAVE_DRAFT' | 'GENERATE'

    if (!Object.values(GeneratedDocumentType).includes(type) || !['SAVE_DRAFT', 'GENERATE'].includes(action)) {
      return NextResponse.json({ error: 'Solicitud invalida' }, { status: 400 })
    }

    const caseRecord = await prisma.case.findUnique({
      where: { id: params.id },
      include: { profile: true },
    })
    if (!caseRecord) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

    const title =
      type === GeneratedDocumentType.FORMULARIO_SOLICITUD_VIAJE
        ? 'Formulario de Solicitud de Viaje'
        : 'Carta al Ministro Administrativo'
    const draftContent = data.draftContent || defaultContent(type, caseRecord)

    const generated = await prisma.generatedDocument.upsert({
      where: { caseId_type: { caseId: params.id, type } },
      update: {
        title,
        draftContent,
        status: action === 'SAVE_DRAFT' ? GeneratedDocumentStatus.DRAFT : GeneratedDocumentStatus.GENERATED,
      },
      create: {
        caseId: params.id,
        type,
        title,
        draftContent,
        status: action === 'SAVE_DRAFT' ? GeneratedDocumentStatus.DRAFT : GeneratedDocumentStatus.GENERATED,
        generatedByUserId: user.userId,
      },
    })

    if (action === 'SAVE_DRAFT') {
      await prisma.case.update({
        where: { id: params.id },
        data: {
          status:
            type === GeneratedDocumentType.FORMULARIO_SOLICITUD_VIAJE
              ? CaseStatus.FORMULARIO_EN_ELABORACION
              : CaseStatus.CARTA_EN_ELABORACION,
        },
      })
      return NextResponse.json(generated)
    }

    const pdf = generateSimplePdf(title, draftContent)
    const docType = mapGeneratedToDocumentType(type)
    const fileName = `${type.toLowerCase()}-${params.id.substring(0, 8)}.pdf`
    const uploadResult = await uploadAttachmentToBlob({
      profileId: caseRecord.profileId,
      caseId: params.id,
      originalFilename: fileName,
      buffer: pdf,
      contentType: 'application/pdf',
      docType,
    })

    const document = await prisma.document.create({
      data: {
        caseId: params.id,
        docType,
        originalFilename: fileName,
        mimeType: 'application/pdf',
        sizeBytes: pdf.length,
        blobUrl: uploadResult.blobUrl,
        blobPathname: uploadResult.blobPathname,
        checksumSha256: uploadResult.checksumSha256,
        status: DocumentRequirementStatus.VALIDATED,
        uploadedByUserId: user.userId,
        uploadedByName: user.email,
      },
    })

    await prisma.generatedDocument.update({
      where: { id: generated.id },
      data: {
        documentId: document.id,
        status: GeneratedDocumentStatus.ATTACHED,
        generatedAt: new Date(),
      },
    })

    await prisma.documentRequirement.upsert({
      where: { caseId_docType: { caseId: params.id, docType } },
      update: {
        documentId: document.id,
        status: DocumentRequirementStatus.VALIDATED,
        uploadedByUserId: user.userId,
        uploadedByName: user.email,
        uploadedAt: new Date(),
        validatedByUserId: user.userId,
        validatedAt: new Date(),
      },
      create: {
        caseId: params.id,
        docType,
        label: title,
        required: true,
        status: DocumentRequirementStatus.VALIDATED,
        documentId: document.id,
        uploadedByUserId: user.userId,
        uploadedByName: user.email,
        uploadedAt: new Date(),
        validatedByUserId: user.userId,
        validatedAt: new Date(),
      },
    })

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: params.id,
        profileId: caseRecord.profileId,
        action: 'GENERATED_DOCUMENT_CREATED',
        details: { type, documentId: document.id },
      },
    })

    return NextResponse.json({ generatedDocument: generated, document })
  } catch (error) {
    console.error('Generate document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
