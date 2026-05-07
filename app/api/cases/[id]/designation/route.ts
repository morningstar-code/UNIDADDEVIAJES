import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser } from '@/lib/auth/permissions'
import { buildDesignationBody, buildDesignationSubject } from '@/lib/designations/templates'
import { sendMail } from '@/lib/graph/send'
import { generateDocx } from '@/lib/documents/ooxml'
import {
  buildInformativeLiquidationFilename,
  generateInformativeLiquidationWorkbook,
  LIQUIDATION_XLSX_CONTENT_TYPE,
} from '@/lib/documents/liquidation'
import { uploadAttachmentToBlob } from '@/lib/blob/upload'
import {
  CaseStatus,
  DesignationStatus,
  DocumentRequirementStatus,
  DocumentType,
  GeneratedDocumentStatus,
  GeneratedDocumentType,
  WorkflowStep,
} from '@prisma/client'

function getAppBaseUrl(request: NextRequest) {
  return process.env.APP_BASE_URL || request.nextUrl.origin
}

async function getOrCreateDesignation(caseId: string, request: NextRequest) {
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: { profile: true },
  })

  if (!caseRecord) {
    return { error: NextResponse.json({ error: 'Case not found' }, { status: 404 }) }
  }

  if (!caseRecord.profile.primaryEmail) {
    return {
      error: NextResponse.json(
        { error: 'El perfil no tiene email para enviar la designacion' },
        { status: 400 }
      ),
    }
  }

  const existing = await prisma.designation.findFirst({
    where: { caseId },
    orderBy: { createdAt: 'desc' },
  })

  if (existing) {
    return { caseRecord, designation: existing }
  }

  const token = randomUUID()
  const tokenExpiresAt = new Date()
  tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30)
  const acceptanceUrl = `${getAppBaseUrl(request)}/designacion/${token}`

  const designation = await prisma.designation.create({
    data: {
      caseId,
      collaboratorName: caseRecord.profile.fullName || undefined,
      collaboratorEmail: caseRecord.profile.primaryEmail,
      collaboratorPosition: caseRecord.profile.cargo || undefined,
      collaboratorArea: caseRecord.profile.departamento || undefined,
      subject: buildDesignationSubject(caseRecord),
      body: buildDesignationBody(caseRecord, acceptanceUrl),
      token,
      tokenExpiresAt,
      status: DesignationStatus.DRAFT,
    },
  })

  await prisma.case.update({
    where: { id: caseId },
    data: {
      status: CaseStatus.DESIGNACION_GENERADA,
      currentWorkflowStep: WorkflowStep.DESIGNATION,
    },
  })

  await prisma.auditLog.create({
    data: {
      caseId,
      profileId: caseRecord.profileId,
      action: 'CORREO_DESIGNACION_GENERADO',
      details: { designationId: designation.id, status: 'DRAFT' },
    },
  })

  return { caseRecord, designation }
}

async function getOrCreateInformativeLiquidationDocument(caseId: string, actorUserId?: string) {
  const caseRecord = await prisma.case.findUnique({
    where: { id: caseId },
    include: { profile: true },
  })
  if (!caseRecord) throw new Error('Case not found')

  const existing = await prisma.generatedDocument.findUnique({
    where: {
      caseId_type: {
        caseId,
        type: GeneratedDocumentType.FORMULARIO_LIQUIDACION_INFORMATIVO,
      },
    },
    include: { document: true },
  })

  if (existing?.document) {
    const workbook = await generateInformativeLiquidationWorkbook(caseRecord)
    return {
      generatedDocument: existing,
      document: existing.document,
      buffer: workbook.buffer,
      filename: existing.document.originalFilename,
      wasCreated: false,
    }
  }

  const workbook = await generateInformativeLiquidationWorkbook(caseRecord)
  const filename = buildInformativeLiquidationFilename(caseRecord)
  const uploadResult = await uploadAttachmentToBlob({
    profileId: caseRecord.profileId,
    caseId,
    originalFilename: filename,
    buffer: workbook.buffer,
    contentType: LIQUIDATION_XLSX_CONTENT_TYPE,
    docType: DocumentType.FORMULARIO_LIQUIDACION_INFORMATIVO,
  })

  const document = await prisma.document.create({
    data: {
      caseId,
      docType: DocumentType.FORMULARIO_LIQUIDACION_INFORMATIVO,
      originalFilename: filename,
      mimeType: LIQUIDATION_XLSX_CONTENT_TYPE,
      sizeBytes: workbook.buffer.length,
      blobUrl: uploadResult.blobUrl,
      blobPathname: uploadResult.blobPathname,
      checksumSha256: uploadResult.checksumSha256,
      status: DocumentRequirementStatus.GENERATED,
      uploadedByUserId: actorUserId,
      uploadedByName: actorUserId ? undefined : 'Sistema',
    },
  })

  const generatedDocument = await prisma.generatedDocument.upsert({
    where: {
      caseId_type: {
        caseId,
        type: GeneratedDocumentType.FORMULARIO_LIQUIDACION_INFORMATIVO,
      },
    },
    update: {
      title: 'Formulario de Liquidacion de Fondos / Viaticos - Informativo',
      draftContent: 'Anexo informativo enviado con el correo de designacion. Uso real posterior al viaje.',
      status: GeneratedDocumentStatus.ATTACHED,
      documentId: document.id,
      generatedAt: new Date(),
      generatedByUserId: actorUserId,
    },
    create: {
      caseId,
      type: GeneratedDocumentType.FORMULARIO_LIQUIDACION_INFORMATIVO,
      title: 'Formulario de Liquidacion de Fondos / Viaticos - Informativo',
      draftContent: 'Anexo informativo enviado con el correo de designacion. Uso real posterior al viaje.',
      status: GeneratedDocumentStatus.ATTACHED,
      documentId: document.id,
      generatedAt: new Date(),
      generatedByUserId: actorUserId,
    },
    include: { document: true },
  })

  await prisma.auditLog.create({
    data: {
      actorUserId,
      caseId,
      profileId: caseRecord.profileId,
      action: 'FORMULARIO_LIQUIDACION_INFORMATIVO_GENERADO',
      details: {
        filename,
        documentId: document.id,
        usedTemplate: workbook.usedTemplate,
        needsManualCellMapping: workbook.needsManualCellMapping,
      },
    },
  })

  return {
    generatedDocument,
    document,
    buffer: workbook.buffer,
    filename,
    wasCreated: true,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'designations:create')
  if (!user) return response!

  const result = await getOrCreateDesignation(params.id, request)
  if (result.error) return result.error
  try {
    await getOrCreateInformativeLiquidationDocument(params.id, user.userId)
  } catch (error) {
    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: params.id,
        action: 'FORMULARIO_LIQUIDACION_INFORMATIVO_ERROR',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      },
    })
    return NextResponse.json(
      { error: 'No se pudo generar el formulario de liquidacion informativo' },
      { status: 500 }
    )
  }
  return NextResponse.json(result.designation)
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request, 'designations:send')
  if (!user) return response!

  try {
    const result = await getOrCreateDesignation(params.id, request)
    if (result.error) return result.error
    const { designation } = result
    const data = await request.json()
    const action = data.action || 'SEND'
    const subject = data.subject || designation.subject
    const body = data.body || designation.body
    const liquidationDownloadUrl = `${getAppBaseUrl(request)}/api/designacion/${designation.token}/liquidation-form`

    if (action === 'SAVE_DRAFT') {
      const updated = await prisma.designation.update({
        where: { id: designation.id },
        data: { subject, body, status: DesignationStatus.DRAFT },
      })
      await prisma.case.update({
        where: { id: params.id },
        data: { status: CaseStatus.DESIGNACION_BORRADOR, currentWorkflowStep: WorkflowStep.DESIGNATION },
      })
      await prisma.auditLog.create({
        data: {
          actorUserId: user.userId,
          caseId: params.id,
          profileId: result.caseRecord?.profileId,
          action: 'CORREO_DESIGNACION_EDITADO',
          details: { designationId: designation.id },
        },
      })
      return NextResponse.json(updated)
    }

    if (!result.caseRecord?.evento && !result.caseRecord?.destinoPais) {
      return NextResponse.json({ error: 'El caso no tiene datos de viaje suficientes para enviar la designacion' }, { status: 400 })
    }

    let liquidationAttachment: Awaited<ReturnType<typeof getOrCreateInformativeLiquidationDocument>> | null = null
    try {
      liquidationAttachment = await getOrCreateInformativeLiquidationDocument(params.id, user.userId)
    } catch (error) {
      await prisma.auditLog.create({
        data: {
          actorUserId: user.userId,
          caseId: params.id,
          profileId: result.caseRecord?.profileId,
          action: 'FORMULARIO_LIQUIDACION_INFORMATIVO_ERROR',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        },
      })
      if (!data.sendWithoutLiquidationAttachment) {
        return NextResponse.json(
          { error: 'No se pudo generar ni adjuntar el formulario de liquidacion informativo' },
          { status: 500 }
        )
      }
    }

    const bodyWithLiquidationLink =
      liquidationAttachment?.document && !body.includes(liquidationDownloadUrl)
        ? `${body}<p><strong>Formulario de liquidacion informativo:</strong> <a href="${liquidationDownloadUrl}">Descargar formulario</a></p>`
        : body

    const docx = generateDocx(subject, bodyWithLiquidationLink)
    const fileName = `correo_designacion-${params.id.substring(0, 8)}.docx`
    const uploadResult = await uploadAttachmentToBlob({
      profileId: result.caseRecord!.profileId,
      caseId: params.id,
      originalFilename: fileName,
      buffer: docx,
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      docType: DocumentType.CORREO_DESIGNACION,
    })

    const document = await prisma.document.create({
      data: {
        caseId: params.id,
        docType: DocumentType.CORREO_DESIGNACION,
        originalFilename: fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sizeBytes: docx.length,
        blobUrl: uploadResult.blobUrl,
        blobPathname: uploadResult.blobPathname,
        checksumSha256: uploadResult.checksumSha256,
        status: DocumentRequirementStatus.VALIDATED,
        uploadedByUserId: user.userId,
        uploadedByName: user.email,
      },
    })

    await prisma.generatedDocument.upsert({
      where: { caseId_type: { caseId: params.id, type: GeneratedDocumentType.CORREO_DESIGNACION } },
      update: {
        title: 'Correo de Designacion',
        draftContent: bodyWithLiquidationLink,
        status: GeneratedDocumentStatus.ATTACHED,
        documentId: document.id,
        generatedAt: new Date(),
        generatedByUserId: user.userId,
      },
      create: {
        caseId: params.id,
        type: GeneratedDocumentType.CORREO_DESIGNACION,
        title: 'Correo de Designacion',
        draftContent: bodyWithLiquidationLink,
        status: GeneratedDocumentStatus.ATTACHED,
        documentId: document.id,
        generatedAt: new Date(),
        generatedByUserId: user.userId,
      },
    })

    await prisma.documentRequirement.upsert({
      where: { caseId_docType: { caseId: params.id, docType: DocumentType.CORREO_DESIGNACION } },
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
        docType: DocumentType.CORREO_DESIGNACION,
        label: 'Correo de designacion',
        required: true,
        documentId: document.id,
        status: DocumentRequirementStatus.VALIDATED,
        uploadedByUserId: user.userId,
        uploadedByName: user.email,
        uploadedAt: new Date(),
        validatedByUserId: user.userId,
        validatedAt: new Date(),
      },
    })

    if (action === 'GENERATE_FINAL') {
      await prisma.case.update({
        where: { id: params.id },
        data: { status: CaseStatus.DESIGNACION_GENERADA, currentWorkflowStep: WorkflowStep.DESIGNATION },
      })
      await prisma.auditLog.create({
        data: {
          actorUserId: user.userId,
          caseId: params.id,
          profileId: result.caseRecord?.profileId,
          action: 'CORREO_DESIGNACION_GENERADO',
          details: { designationId: designation.id, documentId: document.id },
        },
      })
      return NextResponse.json({ designation, document })
    }

    if (liquidationAttachment?.document) {
      await prisma.auditLog.create({
        data: {
          actorUserId: user.userId,
          caseId: params.id,
          profileId: result.caseRecord?.profileId,
          action: 'FORMULARIO_LIQUIDACION_ADJUNTADO_A_DESIGNACION',
          details: {
            filename: liquidationAttachment.filename,
            documentId: liquidationAttachment.document.id,
            deliveryMode: liquidationAttachment.buffer ? 'attachment_and_download_link' : 'download_link',
          },
        },
      })
    }

    await sendMail({
      to: designation.collaboratorEmail,
      subject,
      htmlBody: bodyWithLiquidationLink,
      attachments: liquidationAttachment?.buffer
        ? [
            {
              filename: liquidationAttachment.filename,
              contentType: LIQUIDATION_XLSX_CONTENT_TYPE,
              content: liquidationAttachment.buffer,
            },
          ]
        : [],
    })

    const updated = await prisma.designation.update({
      where: { id: designation.id },
      data: {
        subject,
        body: bodyWithLiquidationLink,
        status: DesignationStatus.SENT,
        sentAt: new Date(),
        sentByUserId: user.userId,
      },
    })

    await prisma.case.update({
      where: { id: params.id },
      data: {
        status: CaseStatus.DESIGNACION_ENVIADA,
        currentWorkflowStep: WorkflowStep.COLLABORATOR_ACCEPTANCE,
      },
    })

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: params.id,
        action: 'CORREO_DESIGNACION_ENVIADO',
        details: {
          designationId: designation.id,
          documentId: document.id,
          liquidationDocumentId: liquidationAttachment?.document?.id,
          recipient: designation.collaboratorEmail,
        },
      },
    })

    if (liquidationAttachment?.document) {
      await prisma.document.update({
        where: { id: liquidationAttachment.document.id },
        data: { status: DocumentRequirementStatus.ENVIADO_COMO_ANEXO_INFORMATIVO },
      })
      await prisma.auditLog.create({
        data: {
          actorUserId: user.userId,
          caseId: params.id,
          profileId: result.caseRecord?.profileId,
          action: 'FORMULARIO_LIQUIDACION_ENVIADO_COMO_ANEXO',
          details: {
            filename: liquidationAttachment.filename,
            documentId: liquidationAttachment.document.id,
            sentAsRealAttachment: !!liquidationAttachment.buffer,
            downloadLink: liquidationDownloadUrl,
          },
        },
      })
    }

    await prisma.notification.create({
      data: {
        caseId: params.id,
        type: 'DESIGNATION_SENT',
        title: 'Designacion enviada',
        message: `Se envio la designacion a ${designation.collaboratorEmail}`,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Designation send error:', error)
    return NextResponse.json({ error: 'No se pudo enviar la designacion' }, { status: 500 })
  }
}
