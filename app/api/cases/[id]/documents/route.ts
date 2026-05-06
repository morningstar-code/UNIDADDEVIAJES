import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { uploadAttachmentToBlob } from '@/lib/blob/upload'
import { CaseStatus, DocumentRequirementStatus, DocumentType } from '@prisma/client'

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
      data: { status: CaseStatus.DOCUMENTOS_EN_REVISION },
    })

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: params.id,
        profileId: caseRecord.profileId,
        action: 'STAFF_DOCUMENT_UPLOADED',
        details: { documentId: document.id, docType, filename: file.name },
      },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Staff upload document error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
