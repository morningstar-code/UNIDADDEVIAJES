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

function auditActionForWorkflow(action: string) {
  const actions: Record<string, string> = {
    APPROVE_LIQUIDATION: 'LIQUIDACION_APROBADA',
    RETURN_LIQUIDATION: 'LIQUIDACION_DEVUELTA_CORRECCION',
    NO_APLICA_LIQUIDACION: 'NO_APLICA_LIQUIDACION',
    CLOSE: 'CASO_CERRADO',
    REQUEST_LIQUIDATION: 'LIQUIDACION_ENVIADA_REVISION',
  }
  return actions[action] || action
}

const ALLOWED_TRANSITIONS: Partial<Record<string, CaseStatus[]>> = {
  MARK_EXPEDIENTE_COMPLETE: [
    CaseStatus.DOCUMENTOS_COMPLETOS,
    CaseStatus.CARTA_EN_ELABORACION,
    CaseStatus.FORMULARIO_EN_ELABORACION,
  ],
  SEND_DESPACHO: [CaseStatus.EXPEDIENTE_ARMADO],
  DESPACHO_APPROVE: [CaseStatus.DESPACHO_REVIEW],
  DESPACHO_RETURN: [CaseStatus.DESPACHO_REVIEW],
  CONSEJO_SIGN: [CaseStatus.CONSEJO_DIRECTIVO_FIRMA],
  RECEIVE_SIGNED: [CaseStatus.EXPEDIENTE_FIRMADO_RECIBIDO],
  MARK_TRAVEL_COMPLETED: [CaseStatus.COORDINACION_ADMINISTRATIVA],
  REQUEST_LIQUIDATION: [CaseStatus.VIAJE_REALIZADO],
  APPROVE_LIQUIDATION: [
    CaseStatus.PENDIENTE_INFORME_Y_LIQUIDACION,
    CaseStatus.LIQUIDACION_EN_REVISION,
    CaseStatus.LIQUIDACION_REQUIERE_CORRECCION,
  ],
  RETURN_LIQUIDATION: [CaseStatus.PENDIENTE_INFORME_Y_LIQUIDACION, CaseStatus.LIQUIDACION_EN_REVISION],
  NO_APLICA_LIQUIDACION: [CaseStatus.VIAJE_REALIZADO, CaseStatus.PENDIENTE_INFORME_Y_LIQUIDACION],
  CLOSE: [CaseStatus.LIQUIDACION_APROBADA, CaseStatus.NO_APLICA_LIQUIDACION],
}

const REQUIRED_DISPATCH_DOCUMENTS: Array<{ docType: DocumentType; label: string; profileDocument?: boolean }> = [
  { docType: DocumentType.CEDULA, label: 'Cedula', profileDocument: true },
  { docType: DocumentType.PASAPORTE, label: 'Pasaporte', profileDocument: true },
  { docType: DocumentType.CARTA_INVITACION, label: 'Invitacion de la actividad' },
  { docType: DocumentType.FORMULARIO_SOLICITUD_VIAJE, label: 'Formulario de solicitud de viaje' },
  { docType: DocumentType.CARTA_MINISTRO_ADMINISTRATIVO, label: 'Carta al Ministro Administrativo' },
]

const DOCUMENT_COMPLETE_STATUSES: DocumentRequirementStatus[] = [
  DocumentRequirementStatus.UPLOADED,
  DocumentRequirementStatus.VALIDATED,
  DocumentRequirementStatus.WAIVED,
  DocumentRequirementStatus.GENERATED,
  DocumentRequirementStatus.ENVIADO_COMO_ANEXO_INFORMATIVO,
]

function validateTransition(action: string, status: CaseStatus) {
  const allowed = ALLOWED_TRANSITIONS[action]
  return !allowed || allowed.includes(status)
}

async function missingDispatchDocuments(caseId: string, profileId: string) {
  const [requirements, documents] = await Promise.all([
    prisma.documentRequirement.findMany({ where: { caseId } }),
    prisma.document.findMany({
      where: {
        isCurrent: true,
        OR: [{ caseId }, { profileId, caseId: null }],
      },
    }),
  ])

  return REQUIRED_DISPATCH_DOCUMENTS.filter(({ docType, profileDocument }) => {
    const requirement = requirements.find((item) => item.docType === docType)
    const hasDocument = documents.some((item) => {
      if (item.docType !== docType) return false
      if (profileDocument) return item.profileId === profileId || item.caseId === caseId
      return item.caseId === caseId
    })
    const requirementComplete =
      !!requirement && DOCUMENT_COMPLETE_STATUSES.includes(requirement.status)
    return !hasDocument && !requirementComplete
  }).map((item) => item.label)
}

async function missingCloseDocuments(caseId: string) {
  const required = [
    { docType: DocumentType.FORMULARIO_SOLICITUD_VIAJE, label: 'Formulario de solicitud de viaje' },
    { docType: DocumentType.CARTA_MINISTRO_ADMINISTRATIVO, label: 'Carta al Ministro Administrativo' },
    { docType: DocumentType.EXPEDIENTE_FIRMADO, label: 'Expediente firmado final' },
  ]
  const documents = await prisma.document.findMany({
    where: {
      caseId,
      isCurrent: true,
      status: { in: DOCUMENT_COMPLETE_STATUSES },
    },
    select: { docType: true },
  })
  return required
    .filter((requirement) => !documents.some((document) => document.docType === requirement.docType))
    .map((requirement) => requirement.label)
}

function notificationsForWorkflow(action: string, caseRecord: { evento?: string | null; destinoPais?: string | null }) {
  const subject = caseRecord.evento || caseRecord.destinoPais || 'expediente'
  const notifications: Partial<Record<string, Array<{ type: any; title: string; message: string }>>> = {
    MARK_EXPEDIENTE_COMPLETE: [
      { type: 'EXPEDIENTE_COMPLETE', title: 'Expediente armado', message: `El expediente de ${subject} fue marcado como completo.` },
    ],
    SEND_DESPACHO: [
      { type: 'SENT_TO_DESPACHO', title: 'Expediente enviado a Despacho', message: `El expediente de ${subject} fue enviado a revision de Despacho.` },
    ],
    DESPACHO_RETURN: [
      { type: 'DESPACHO_RETURNED', title: 'Despacho devolvio el expediente', message: `Despacho devolvio el expediente de ${subject} con observaciones.` },
    ],
    DESPACHO_APPROVE: [
      { type: 'DESPACHO_APPROVED', title: 'Despacho aprobo el expediente', message: `Despacho aprobo el expediente de ${subject}.` },
      { type: 'SENT_TO_CONSEJO', title: 'Expediente enviado a Consejo', message: `El expediente de ${subject} fue enviado al Consejo Directivo para firma.` },
    ],
    CONSEJO_SIGN: [
      { type: 'EXPEDIENTE_SIGNED', title: 'Firma del Consejo registrada', message: `Se registro la firma del Consejo para el expediente de ${subject}.` },
    ],
    RECEIVE_SIGNED: [
      { type: 'SIGNED_EXPEDIENTE_RECEIVED', title: 'Expediente firmado recibido', message: `La Unidad de Viajes confirmo la recepcion del expediente firmado de ${subject}.` },
    ],
    MARK_TRAVEL_COMPLETED: [
      { type: 'TRAVEL_COMPLETED', title: 'Viaje realizado', message: `El viaje de ${subject} fue marcado como realizado.` },
    ],
    REQUEST_LIQUIDATION: [
      { type: 'LIQUIDATION_REQUESTED', title: 'Liquidacion solicitada', message: `Se solicito la liquidacion post-viaje del expediente de ${subject}.` },
    ],
    APPROVE_LIQUIDATION: [
      { type: 'LIQUIDATION_APPROVED', title: 'Liquidacion aprobada', message: `La liquidacion del expediente de ${subject} fue aprobada.` },
    ],
    RETURN_LIQUIDATION: [
      { type: 'LIQUIDATION_RETURNED', title: 'Liquidacion devuelta', message: `La liquidacion del expediente de ${subject} fue devuelta con observaciones.` },
    ],
    NO_APLICA_LIQUIDACION: [
      { type: 'LIQUIDATION_WAIVED', title: 'Liquidacion marcada no aplica', message: `Se registro que no aplica liquidacion para el expediente de ${subject}.` },
    ],
    CLOSE: [
      { type: 'CASE_CLOSED', title: 'Expediente cerrado', message: `El expediente de ${subject} fue cerrado.` },
    ],
  }
  return notifications[action] || []
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

  if (!validateTransition(action, caseRecord.status)) {
    return NextResponse.json(
      { error: 'No se puede ejecutar esta accion desde el estado actual del expediente.' },
      { status: 409 }
    )
  }

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
      const missing = await missingDispatchDocuments(params.id, caseRecord.profileId)
      if (missing.length > 0) {
        return NextResponse.json(
          {
            error: `No se puede enviar a despacho. Faltan documentos obligatorios: ${missing.join(', ')}.`,
            missingDocuments: missing,
          },
          { status: 400 }
        )
      }
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
    } else if (action === 'MARK_TRAVEL_COMPLETED') {
      if (!hasPermission(user, 'cases:update')) return forbidden()
      await prisma.case.update({
        where: { id: params.id },
        data: {
          status: CaseStatus.VIAJE_REALIZADO,
          currentWorkflowStep: WorkflowStep.POST_TRAVEL,
        },
      })
    } else if (action === 'REQUEST_LIQUIDATION') {
      if (!hasPermission(user, 'liquidation:review')) return forbidden()
      await prisma.case.update({
        where: { id: params.id },
        data: {
          status: CaseStatus.PENDIENTE_INFORME_Y_LIQUIDACION,
          currentWorkflowStep: WorkflowStep.POST_TRAVEL,
        },
      })
    } else if (action === 'APPROVE_LIQUIDATION') {
      if (!hasPermission(user, 'liquidation:approve')) return forbidden()
      await prisma.case.update({
        where: { id: params.id },
        data: {
          status: CaseStatus.LIQUIDACION_APROBADA,
          currentWorkflowStep: WorkflowStep.CLOSURE,
        },
      })
    } else if (action === 'RETURN_LIQUIDATION') {
      if (!hasPermission(user, 'liquidation:return')) return forbidden()
      const observations = isFormData ? String((payload as FormData).get('observations') || '') : payload.observations
      if (!observations) return NextResponse.json({ error: 'Observaciones requeridas' }, { status: 400 })
      await prisma.case.update({
        where: { id: params.id },
        data: {
          status: CaseStatus.LIQUIDACION_REQUIERE_CORRECCION,
          currentWorkflowStep: WorkflowStep.POST_TRAVEL,
          observaciones: observations,
        },
      })
    } else if (action === 'NO_APLICA_LIQUIDACION') {
      if (!hasPermission(user, 'liquidation:waive')) return forbidden()
      const noAplicaComment = isFormData ? String((payload as FormData).get('comment') || '') : payload.comment
      if (!noAplicaComment) return NextResponse.json({ error: 'Comentario obligatorio' }, { status: 400 })
      await prisma.case.update({
        where: { id: params.id },
        data: {
          status: CaseStatus.NO_APLICA_LIQUIDACION,
          currentWorkflowStep: WorkflowStep.CLOSURE,
          closureComment: noAplicaComment,
        },
      })
    } else if (action === 'CLOSE') {
      if (!hasPermission(user, 'cases:close')) return forbidden()
      const comment = isFormData ? String((payload as FormData).get('comment') || '') : payload.comment
      if (!comment) return NextResponse.json({ error: 'Comentario de cierre requerido' }, { status: 400 })

      const missing = await missingCloseDocuments(params.id)
      if (missing.length > 0) {
        return NextResponse.json(
          {
            error: `El expediente debe tener estos documentos antes de cerrar: ${missing.join(', ')}.`,
            missingDocuments: missing,
          },
          { status: 400 }
        )
      }

      await prisma.case.update({
        where: { id: params.id },
        data: { status: CaseStatus.CLOSED, closedAt: new Date(), closureComment: comment },
      })
      const existingClosure = await prisma.caseClosure.findFirst({ where: { caseId: params.id } })
      if (!existingClosure) {
        await prisma.caseClosure.create({
          data: { caseId: params.id, closedByUserId: user.userId, comment },
        })
      }
    } else {
      return NextResponse.json({ error: 'Accion invalida' }, { status: 400 })
    }

    await prisma.auditLog.create({
      data: {
        actorUserId: user.userId,
        caseId: params.id,
        profileId: caseRecord.profileId,
        action: auditActionForWorkflow(action),
        details: { source: 'workflow' },
      },
    })

    const notifications = notificationsForWorkflow(action, caseRecord)
    for (const notification of notifications) {
      await prisma.notification.create({
        data: {
          caseId: params.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Workflow action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
