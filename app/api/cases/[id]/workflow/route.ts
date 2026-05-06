import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { getAuthorizedUser, hasPermission } from '@/lib/auth/permissions'
import { uploadAttachmentToBlob } from '@/lib/blob/upload'
import {
  CaseStatus,
  DocumentRequirementStatus,
  DocumentType,
  SignatureType,
  TaskStatus,
  WorkflowStep,
} from '@prisma/client'

export const runtime = 'nodejs'
export const maxDuration = 60

async function createTask(caseId: string, roleName: string, step: WorkflowStep) {
  const role = await prisma.role.findUnique({ where: { name: roleName } })
  if (!role) return null
  return prisma.task.create({
    data: { caseId, step, assignedRoleId: role.id, status: TaskStatus.PENDING },
  })
}

function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, response } = await getAuthorizedUser(request)
  if (!user) return response!

  const contentType = request.headers.get('content-type') || ''
  const isFormData = contentType.includes('multipart/form-data')
  const payload = isFormData ? await request.formData() : await request.json()
  const action = isFormData ? String((payload as FormData).get('action')) : payload.action

  const caseRecord = await prisma.case.findUnique({
    where: { id: params.id },
    include: { profile: true },
  })
  if (!caseRecord) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

  try {
    if (action === 'MARK_EXPEDIENTE_COMPLETE') {
      if (!hasPermission(user, 'expedientes:update')) return forbidden()
      await prisma.case.update({
        where: { id: params.id },
        data: {
          status: CaseStatus.EXPEDIENTE_ARMADO,
          expedienteCompleto: true,
          expedienteCompletedAt: new Date(),
        },
      })
    } else if (action === 'SEND_DESPACHO') {
      if (!hasPermission(user, 'expedientes:send_despacho')) return forbidden()
      await prisma.case.update({
        where: { id: params.id },
        data: {
          status: CaseStatus.DESPACHO_REVIEW,
          currentWorkflowStep: WorkflowStep.DESPACHO_REVIEW,
          expedienteSentToDespachoAt: new Date(),
        },
      })
      await createTask(params.id, 'DESPACHO', WorkflowStep.DESPACHO_REVIEW)
    } else if (action === 'DESPACHO_APPROVE') {
      if (!hasPermission(user, 'expedientes:send_consejo')) return forbidden()
      await prisma.case.update({
        where: { id: params.id },
        data: {
          status: CaseStatus.CONSEJO_DIRECTIVO_FIRMA,
          currentWorkflowStep: WorkflowStep.CONSEJO_DIRECTIVO_FIRMA,
          expedienteSentToConsejoAt: new Date(),
        },
      })
      await createTask(params.id, 'CONSEJO_DIRECTIVO', WorkflowStep.CONSEJO_DIRECTIVO_FIRMA)
    } else if (action === 'DESPACHO_RETURN') {
      if (!hasPermission(user, 'expedientes:review')) return forbidden()
      await prisma.case.update({
        where: { id: params.id },
        data: {
          status: CaseStatus.NEEDS_INFO,
          currentWorkflowStep: WorkflowStep.DOCUMENT_REVIEW,
        },
      })
      await createTask(params.id, 'VIAJES_ANALISTA', WorkflowStep.DOCUMENT_REVIEW)
    } else if (action === 'CONSEJO_SIGN') {
      if (!hasPermission(user, 'expedientes:sign')) return forbidden()
      const formData = payload as FormData
      const signatureType = String(formData.get('signatureType')) as SignatureType
      const signedBy = String(formData.get('signedBy') || user.email)
      const justification = String(formData.get('digitalSignatureJustification') || '')
      const file = formData.get('file') as File | null
      const justificationFile = formData.get('justificationFile') as File | null

      if (!Object.values(SignatureType).includes(signatureType)) {
        return NextResponse.json({ error: 'Tipo de firma invalido' }, { status: 400 })
      }
      if (signatureType === SignatureType.DIGITAL_JUSTIFICADA && (!justification || !justificationFile)) {
        return NextResponse.json(
          { error: 'La firma digital requiere justificacion y documento soporte' },
          { status: 400 }
        )
      }
      if (!file) return NextResponse.json({ error: 'Debe cargar el expediente firmado' }, { status: 400 })

      const buffer = Buffer.from(await file.arrayBuffer())
      const upload = await uploadAttachmentToBlob({
        profileId: caseRecord.profileId,
        caseId: params.id,
        originalFilename: file.name,
        buffer,
        contentType: file.type || 'application/pdf',
        docType: DocumentType.EXPEDIENTE_FIRMADO,
      })
      await prisma.document.create({
        data: {
          caseId: params.id,
          docType: DocumentType.EXPEDIENTE_FIRMADO,
          originalFilename: file.name,
          mimeType: file.type || 'application/pdf',
          sizeBytes: buffer.length,
          blobUrl: upload.blobUrl,
          blobPathname: upload.blobPathname,
          checksumSha256: upload.checksumSha256,
          status: DocumentRequirementStatus.VALIDATED,
          uploadedByUserId: user.userId,
          uploadedByName: user.email,
        },
      })

      if (justificationFile) {
        const justificationBuffer = Buffer.from(await justificationFile.arrayBuffer())
        const justificationUpload = await uploadAttachmentToBlob({
          profileId: caseRecord.profileId,
          caseId: params.id,
          originalFilename: justificationFile.name,
          buffer: justificationBuffer,
          contentType: justificationFile.type || 'application/pdf',
          docType: DocumentType.JUSTIFICACION_FIRMA_DIGITAL,
        })
        await prisma.document.create({
          data: {
            caseId: params.id,
            docType: DocumentType.JUSTIFICACION_FIRMA_DIGITAL,
            originalFilename: justificationFile.name,
            mimeType: justificationFile.type || 'application/pdf',
            sizeBytes: justificationBuffer.length,
            blobUrl: justificationUpload.blobUrl,
            blobPathname: justificationUpload.blobPathname,
            checksumSha256: justificationUpload.checksumSha256,
            status: DocumentRequirementStatus.VALIDATED,
            uploadedByUserId: user.userId,
            uploadedByName: user.email,
          },
        })
      }

      await prisma.case.update({
        where: { id: params.id },
        data: {
          status: CaseStatus.EXPEDIENTE_FIRMADO_RECIBIDO,
          currentWorkflowStep: WorkflowStep.EXPEDIENTE_FIRMADO_RECEIPT,
          signatureType,
          signedBy,
          signedAt: new Date(),
          digitalSignatureJustification: justification || undefined,
        },
      })
      await createTask(params.id, 'VIAJES_ANALISTA', WorkflowStep.EXPEDIENTE_FIRMADO_RECEIPT)
    } else if (action === 'RECEIVE_SIGNED') {
      if (!hasPermission(user, 'expedientes:update')) return forbidden()
      await prisma.case.update({
        where: { id: params.id },
        data: {
          status: CaseStatus.COORDINACION_ADMINISTRATIVA,
          currentWorkflowStep: WorkflowStep.COORDINACION_ADMINISTRATIVA,
        },
      })
    } else if (action === 'CLOSE') {
      if (!hasPermission(user, 'cases:close')) return forbidden()
      const comment = isFormData ? String((payload as FormData).get('comment') || '') : payload.comment
      if (!comment) return NextResponse.json({ error: 'Comentario de cierre requerido' }, { status: 400 })

      const minimumDocs = await prisma.document.count({
        where: {
          caseId: params.id,
          docType: { in: [DocumentType.FORMULARIO_SOLICITUD_VIAJE, DocumentType.CARTA_MINISTRO_ADMINISTRATIVO, DocumentType.EXPEDIENTE_FIRMADO] },
        },
      })
      if (minimumDocs < 3) {
        return NextResponse.json(
          { error: 'El expediente debe tener formulario, carta y expediente firmado antes de cerrar' },
          { status: 400 }
        )
      }

      await prisma.case.update({
        where: { id: params.id },
        data: { status: CaseStatus.CLOSED, closedAt: new Date(), closureComment: comment },
      })
      await prisma.caseClosure.create({
        data: { caseId: params.id, closedByUserId: user.userId, comment },
      })
    } else {
      return NextResponse.json({ error: 'Accion invalida' }, { status: 400 })
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: params.id,
        profileId: caseRecord.profileId,
        action,
        details: { source: 'workflow' },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Workflow action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
