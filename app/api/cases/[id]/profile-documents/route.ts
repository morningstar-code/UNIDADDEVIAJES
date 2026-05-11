import { NextRequest, NextResponse } from 'next/server'
import {
  DocumentRequirementStatus,
  DocumentSource,
  DocumentType,
  ExternalDocumentStatus,
  NotificationType,
} from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { uploadAttachmentToBlob } from '@/lib/blob/upload'
import { downloadSharePointFile } from '@/lib/graph/sharepoint'

export const runtime = 'nodejs'
export const maxDuration = 120

const BASE_DOC_TYPES: DocumentType[] = [DocumentType.CEDULA, DocumentType.PASAPORTE, DocumentType.VISA]

function parseDocTypes(input: unknown) {
  if (!Array.isArray(input)) return BASE_DOC_TYPES
  return input
    .filter((item): item is DocumentType => Object.values(DocumentType).includes(item as DocumentType))
    .filter((item) => BASE_DOC_TYPES.includes(item))
}

function isExpired(date?: Date | null) {
  return !!date && date < new Date()
}

async function createCaseDocumentFromProfileDocument(params: {
  caseId: string
  profileId: string
  sourceDocument: {
    id: string
    docType: DocumentType
    originalFilename: string
    mimeType: string
    sizeBytes: number
    blobUrl: string
    blobPathname: string
    checksumSha256: string | null
    expirationDate: Date | null
    visaCountry: string | null
    source: DocumentSource
    sharePointDriveId: string | null
    sharePointItemId: string | null
    sharePointWebUrl: string | null
    sharePointLastModified: Date | null
  }
  actorUserId: string
  actorEmail: string
}) {
  return prisma.document.create({
    data: {
      profileId: params.profileId,
      caseId: params.caseId,
      docType: params.sourceDocument.docType,
      originalFilename: params.sourceDocument.originalFilename,
      mimeType: params.sourceDocument.mimeType,
      sizeBytes: params.sourceDocument.sizeBytes,
      blobUrl: params.sourceDocument.blobUrl,
      blobPathname: params.sourceDocument.blobPathname,
      checksumSha256: params.sourceDocument.checksumSha256 || undefined,
      status: DocumentRequirementStatus.UPLOADED,
      source: params.sourceDocument.source,
      sourceDocumentId: params.sourceDocument.id,
      expirationDate: params.sourceDocument.expirationDate || undefined,
      visaCountry: params.sourceDocument.visaCountry || undefined,
      sharePointDriveId: params.sourceDocument.sharePointDriveId || undefined,
      sharePointItemId: params.sourceDocument.sharePointItemId || undefined,
      sharePointWebUrl: params.sourceDocument.sharePointWebUrl || undefined,
      sharePointLastModified: params.sourceDocument.sharePointLastModified || undefined,
      uploadedByUserId: params.actorUserId,
      uploadedByName: params.actorEmail,
    },
  })
}

async function attachRequirement(caseId: string, documentId: string, docType: DocumentType, userId: string, email: string) {
  await prisma.documentRequirement.upsert({
    where: { caseId_docType: { caseId, docType } },
    update: {
      documentId,
      status: DocumentRequirementStatus.UPLOADED,
      uploadedByUserId: userId,
      uploadedByName: email,
      uploadedAt: new Date(),
    },
    create: {
      caseId,
      docType,
      label: docType,
      required: docType !== DocumentType.VISA,
      documentId,
      status: DocumentRequirementStatus.UPLOADED,
      uploadedByUserId: userId,
      uploadedByName: email,
      uploadedAt: new Date(),
    },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'documents:attach')
  if (!user) return response!

  try {
    const payload = await request.json().catch(() => ({}))
    const docTypes = parseDocTypes(payload.docTypes)

    const caseRecord = await prisma.case.findUnique({
      where: { id: params.id },
      include: { profile: true },
    })
    if (!caseRecord) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

    const existingCaseDocs = await prisma.document.findMany({
      where: {
        caseId: params.id,
        isCurrent: true,
        docType: { in: docTypes },
      },
    })

    const attached: Array<{ docType: DocumentType; documentId: string; source: string }> = []
    const missing: DocumentType[] = []
    const expired: DocumentType[] = []

    for (const docType of docTypes) {
      if (existingCaseDocs.some((doc) => doc.docType === docType)) continue

      const profileDocument = await prisma.document.findFirst({
        where: {
          profileId: caseRecord.profileId,
          caseId: null,
          isCurrent: true,
          docType,
        },
        orderBy: { createdAt: 'desc' },
      })

      if (profileDocument) {
        if (isExpired(profileDocument.expirationDate)) expired.push(docType)
        const document = await createCaseDocumentFromProfileDocument({
          caseId: params.id,
          profileId: caseRecord.profileId,
          sourceDocument: profileDocument,
          actorUserId: user.userId,
          actorEmail: user.email,
        })
        await attachRequirement(params.id, document.id, docType, user.userId, user.email)
        attached.push({ docType, documentId: document.id, source: profileDocument.source })
        continue
      }

      const externalDocument = await prisma.profileExternalDocument.findFirst({
        where: {
          profileId: caseRecord.profileId,
          documentType: docType,
          status: { in: [ExternalDocumentStatus.ACTIVE, ExternalDocumentStatus.PENDING_REVIEW] },
        },
        orderBy: { syncedAt: 'desc' },
      })

      if (!externalDocument) {
        missing.push(docType)
        continue
      }

      if (isExpired(externalDocument.expirationDate)) expired.push(docType)

      const buffer = await downloadSharePointFile(externalDocument.sharePointDriveId, externalDocument.sharePointItemId)
      const upload = await uploadAttachmentToBlob({
        profileId: caseRecord.profileId,
        caseId: params.id,
        originalFilename: externalDocument.originalFileName,
        buffer,
        contentType: externalDocument.mimeType,
        docType,
      })

      const document = await prisma.document.create({
        data: {
          profileId: caseRecord.profileId,
          caseId: params.id,
          docType,
          originalFilename: externalDocument.originalFileName,
          mimeType: externalDocument.mimeType,
          sizeBytes: buffer.length,
          blobUrl: upload.blobUrl,
          blobPathname: upload.blobPathname,
          checksumSha256: upload.checksumSha256,
          status: DocumentRequirementStatus.UPLOADED,
          source: DocumentSource.SHAREPOINT,
          sourceDocumentId: externalDocument.id,
          expirationDate: externalDocument.expirationDate || undefined,
          visaCountry: externalDocument.visaCountry || undefined,
          sharePointDriveId: externalDocument.sharePointDriveId,
          sharePointItemId: externalDocument.sharePointItemId,
          sharePointWebUrl: externalDocument.sharePointWebUrl || undefined,
          sharePointLastModified: externalDocument.sharePointLastModified || undefined,
          uploadedByUserId: user.userId,
          uploadedByName: user.email,
        },
      })
      await prisma.profileExternalDocument.update({
        where: { id: externalDocument.id },
        data: { copiedDocumentId: document.id },
      })
      await attachRequirement(params.id, document.id, docType, user.userId, user.email)
      attached.push({ docType, documentId: document.id, source: 'SHAREPOINT' })
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: params.id,
        profileId: caseRecord.profileId,
        action: 'DOCUMENT_ATTACHED_FROM_PROFILE',
        details: { attached, missing, expired },
      },
    })

    if (attached.some((item) => item.source === 'SHAREPOINT')) {
      await prisma.auditLog.create({
        data: {
          actorUserId: user.userId,
          caseId: params.id,
          profileId: caseRecord.profileId,
          action: 'SHAREPOINT_DOCUMENT_COPIED_TO_CASE',
          details: { attached: attached.filter((item) => item.source === 'SHAREPOINT') },
        },
      })
    }

    if (attached.length > 0) {
      await prisma.notification.create({
        data: {
          caseId: params.id,
          type: NotificationType.CASE_DOCUMENTS_FROM_PROFILE_ATTACHED,
          title: 'Documentos del perfil adjuntados',
          message: `Se adjuntaron ${attached.length} documento(s) base del perfil al expediente.`,
        },
      })
    }

    if (missing.length > 0 || expired.length > 0) {
      await prisma.notification.create({
        data: {
          caseId: params.id,
          type: missing.length > 0 ? NotificationType.PROFILE_DOCUMENT_MISSING : NotificationType.PROFILE_DOCUMENT_EXPIRED,
          title: missing.length > 0 ? 'Documentos faltantes en perfil' : 'Documentos vencidos en perfil',
          message: `Faltantes: ${missing.join(', ') || 'ninguno'}. Vencidos: ${expired.join(', ') || 'ninguno'}.`,
        },
      })
    }

    return NextResponse.json({ attached, missing, expired })
  } catch (error) {
    console.error('Attach profile documents error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudieron adjuntar documentos del perfil' },
      { status: 500 }
    )
  }
}
