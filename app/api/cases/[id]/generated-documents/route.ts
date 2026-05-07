import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { generateSimplePdf } from '@/lib/documents/pdf'
import {
  buildDesignationDocumentContent,
  buildLiquidationContent,
  buildMinisterLetterContent,
  buildTravelRequestContent,
} from '@/lib/documents/templates'
import { generateDocx, generateLiquidationXlsx } from '@/lib/documents/ooxml'
import { uploadAttachmentToBlob } from '@/lib/blob/upload'
import {
  CaseStatus,
  DocumentRequirementStatus,
  DocumentType,
  GeneratedDocumentStatus,
  GeneratedDocumentType,
} from '@prisma/client'

function mapGeneratedToDocumentType(type: GeneratedDocumentType) {
  if (type === GeneratedDocumentType.CORREO_DESIGNACION) return DocumentType.CORREO_DESIGNACION
  if (type === GeneratedDocumentType.FORMULARIO_LIQUIDACION_INFORMATIVO) return DocumentType.FORMULARIO_LIQUIDACION_INFORMATIVO
  if (type === GeneratedDocumentType.FORMULARIO_SOLICITUD_VIAJE) return DocumentType.FORMULARIO_SOLICITUD_VIAJE
  if (type === GeneratedDocumentType.FORMULARIO_LIQUIDACION) return DocumentType.FORMULARIO_LIQUIDACION_GENERADO
  return DocumentType.CARTA_MINISTRO_ADMINISTRATIVO
}

function defaultContent(type: GeneratedDocumentType, caseRecord: any) {
  if (type === GeneratedDocumentType.CORREO_DESIGNACION) return buildDesignationDocumentContent(caseRecord)
  if (type === GeneratedDocumentType.FORMULARIO_LIQUIDACION_INFORMATIVO) return buildLiquidationContent(caseRecord)
  if (type === GeneratedDocumentType.FORMULARIO_SOLICITUD_VIAJE) return buildTravelRequestContent(caseRecord)
  if (type === GeneratedDocumentType.FORMULARIO_LIQUIDACION) return buildLiquidationContent(caseRecord)
  return buildMinisterLetterContent(caseRecord)
}

function titleFor(type: GeneratedDocumentType) {
  if (type === GeneratedDocumentType.CORREO_DESIGNACION) return 'Correo de Designacion'
  if (type === GeneratedDocumentType.FORMULARIO_LIQUIDACION_INFORMATIVO) return 'Formulario de Liquidacion de Fondos / Viaticos - Informativo'
  if (type === GeneratedDocumentType.FORMULARIO_SOLICITUD_VIAJE) return 'Formulario de Solicitud de Viaje'
  if (type === GeneratedDocumentType.FORMULARIO_LIQUIDACION) return 'Formulario de Liquidacion de Fondos / Viaticos'
  return 'Carta al Ministro Administrativo'
}

function draftStatusFor(type: GeneratedDocumentType) {
  if (type === GeneratedDocumentType.CORREO_DESIGNACION) return CaseStatus.DESIGNACION_BORRADOR
  if (type === GeneratedDocumentType.FORMULARIO_LIQUIDACION_INFORMATIVO) return CaseStatus.DESIGNACION_GENERADA
  if (type === GeneratedDocumentType.FORMULARIO_SOLICITUD_VIAJE) return CaseStatus.FORMULARIO_EN_ELABORACION
  if (type === GeneratedDocumentType.FORMULARIO_LIQUIDACION) return CaseStatus.PENDIENTE_INFORME_Y_LIQUIDACION
  return CaseStatus.CARTA_EN_ELABORACION
}

function generatedStatusFor(type: GeneratedDocumentType) {
  if (type === GeneratedDocumentType.CORREO_DESIGNACION) return CaseStatus.DESIGNACION_GENERADA
  if (type === GeneratedDocumentType.FORMULARIO_LIQUIDACION_INFORMATIVO) return CaseStatus.DESIGNACION_GENERADA
  if (type === GeneratedDocumentType.FORMULARIO_SOLICITUD_VIAJE) return CaseStatus.FORMULARIO_EN_ELABORACION
  if (type === GeneratedDocumentType.FORMULARIO_LIQUIDACION) return CaseStatus.PENDIENTE_INFORME_Y_LIQUIDACION
  return CaseStatus.CARTA_EN_ELABORACION
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

    const format = (data.format || 'pdf') as 'pdf' | 'docx' | 'xlsx'
    const title = titleFor(type)
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
        data: { status: draftStatusFor(type) },
      })
      await prisma.auditLog.create({
        data: {
          actorUserId: user.userId,
          caseId: params.id,
          profileId: caseRecord.profileId,
          action: type === GeneratedDocumentType.CORREO_DESIGNACION ? 'CORREO_DESIGNACION_EDITADO' : 'GENERATED_DOCUMENT_DRAFT_SAVED',
          details: { type },
        },
      })
      return NextResponse.json(generated)
    }

    const output =
      type === GeneratedDocumentType.FORMULARIO_LIQUIDACION || format === 'xlsx'
        ? {
            buffer: generateLiquidationXlsx(caseRecord),
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            extension: 'xlsx',
          }
        : format === 'docx' || type === GeneratedDocumentType.CORREO_DESIGNACION
          ? {
              buffer: generateDocx(title, draftContent),
              contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              extension: 'docx',
            }
          : {
              buffer: generateSimplePdf(title, draftContent),
              contentType: 'application/pdf',
              extension: 'pdf',
            }
    const docType = mapGeneratedToDocumentType(type)
    const fileName = `${type.toLowerCase()}-${params.id.substring(0, 8)}.${output.extension}`
    const uploadResult = await uploadAttachmentToBlob({
      profileId: caseRecord.profileId,
      caseId: params.id,
      originalFilename: fileName,
      buffer: output.buffer,
      contentType: output.contentType,
      docType,
    })

    const document = await prisma.document.create({
      data: {
        caseId: params.id,
        docType,
        originalFilename: fileName,
        mimeType: output.contentType,
        sizeBytes: output.buffer.length,
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
        action:
          type === GeneratedDocumentType.CORREO_DESIGNACION
            ? 'CORREO_DESIGNACION_GENERADO'
            : type === GeneratedDocumentType.FORMULARIO_LIQUIDACION
              ? 'FORMULARIO_LIQUIDACION_GENERADO'
              : 'GENERATED_DOCUMENT_CREATED',
        details: { type, documentId: document.id, format: output.extension },
      },
    })

    await prisma.case.update({
      where: { id: params.id },
      data: { status: generatedStatusFor(type) },
    })

    return NextResponse.json({ generatedDocument: generated, document })
  } catch (error) {
    console.error('Generate document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
